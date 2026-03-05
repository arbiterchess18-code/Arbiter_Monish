from sqlalchemy.orm import Session, joinedload
from .. import models
import json

def get_standings_sort_key(player, tie_break_config):
    """
    Returns a sort key (tuple) based on points and configured tie-breakers.
    Lower priority tie-breakers are used only if higher ones are equal.
    """
    # Base points is always the primary sorter
    key = [player["points"]]
    
    for tb in tie_break_config:
        if tb == "Direct Encounter":
            # For Direct Encounter, we need to defer or use a placeholder
            # Real implementation of DE in a multi-way tie is complex.
            # Typical Swiss rule: If all tied players played each other, use points in that sub-tournament.
            # Simplified: If two players are tied and they played, winner is higher.
            # For now, we'll use 0.0 and handle 2-way tie adjustment if needed,
            # or just rely on other tie-breaks first.
            key.append(0.0)
        else:
            key.append(player["tb_map"].get(tb, 0.0))
            
    return tuple(key)

def calculate_standings(db: Session, tournament_id: int):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        return None, []

    # Get all approved registrations
    registrations = db.query(models.TournamentRegistration).options(
        joinedload(models.TournamentRegistration.user)
    ).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status.in_(["approved", "active"])
    ).all()

    if not registrations:
        return tournament, []

    player_ids = [reg.user_id for reg in registrations]
    
    # Core player data tracking
    player_stats = {uid: {
        "points": 0.0,
        "opponents": [],
        "wins": 0,
        "black_games": 0,
        "progressive": 0.0,
        "round_points": {}, # round -> cumulative points
        "direct_encounter_opponents": {}, # opp_id -> result weight (1, 0.5, 0)
        "rating": 0
    } for uid in player_ids}

    # Map ratings and seeds
    player_meta = {}
    for reg in registrations:
        uid = reg.user_id
        player_meta[uid] = {
            "seed": reg.seed or 0,
            "user": reg.user,
            "reg": reg
        }
        player_stats[uid]["rating"] = reg.user.fide_rating or reg.user.national_rating or 0

    # Fetch all completed matches
    matches = db.query(models.Match).options(
        joinedload(models.Match.round)
    ).filter(
        models.Match.tournament_id == tournament_id,
        models.Match.result.isnot(None)
    ).order_by(models.Match.round_id).all()

    # Pass 1: Points, Wins, Black Games, Direct Encounter
    for match in matches:
        w_id = match.white_player_id
        b_id = match.black_player_id
        res = match.result
        round_num = match.round.round_number

        if w_id in player_stats:
            if res == "1-0":
                player_stats[w_id]["points"] += 1.0
                player_stats[w_id]["wins"] += 1
                if b_id in player_stats: player_stats[w_id]["direct_encounter_opponents"][b_id] = 1.0
            elif res == "0-1":
                if b_id in player_stats:
                    player_stats[b_id]["points"] += 1.0
                    player_stats[b_id]["wins"] += 1
                    player_stats[b_id]["direct_encounter_opponents"][w_id] = 1.0
                    player_stats[w_id]["direct_encounter_opponents"][b_id] = 0.0
            elif res == "1/2-1/2":
                player_stats[w_id]["points"] += 0.5
                if b_id in player_stats:
                    player_stats[b_id]["points"] += 0.5
                    player_stats[w_id]["direct_encounter_opponents"][b_id] = 0.5
                    player_stats[b_id]["direct_encounter_opponents"][w_id] = 0.5
            elif res == "Bye":
                player_stats[w_id]["points"] += 1.0
                player_stats[w_id]["wins"] += 1
            
            player_stats[w_id]["round_points"][round_num] = player_stats[w_id]["points"]
            
            if b_id in player_stats:
                player_stats[w_id]["opponents"].append(b_id)
                player_stats[b_id]["opponents"].append(w_id)
                player_stats[b_id]["black_games"] += 1
                player_stats[b_id]["round_points"][round_num] = player_stats[b_id]["points"]

    # Pass 2: Progressive Score
    total_rounds = db.query(models.Round).filter(models.Round.tournament_id == tournament_id).count()
    for uid in player_ids:
        prog = 0.0
        curr = 0.0
        for r in range(1, total_rounds + 1):
            curr = player_stats[uid]["round_points"].get(r, curr)
            prog += curr
        player_stats[uid]["progressive"] = prog

    # Pass 3: Buchholz and SB and ARO
    final_points = {uid: stats["points"] for uid, stats in player_stats.items()}
    
    standings_data = []
    for uid in player_ids:
        stats = player_stats[uid]
        opp_points = [final_points[oid] for oid in stats["opponents"]]
        opp_ratings = [player_stats[oid]["rating"] for oid in stats["opponents"]]
        
        bh_total = sum(opp_points)
        bh_cut1 = bh_total - min(opp_points) if opp_points else 0.0
        bh_cut2 = bh_total - sum(sorted(opp_points)[:2]) if len(opp_points) >= 2 else 0.0
        
        sb = 0.0
        for oid in stats["opponents"]:
            res_weight = stats["direct_encounter_opponents"].get(oid, 0)
            sb += (final_points[oid] * res_weight)
            
        aro = sum(opp_ratings) / len(opp_ratings) if opp_ratings else 0.0
        
        tb_map = {
            "Buchholz": bh_total,
            "Buchholz Cut-1": bh_cut1,
            "Buchholz Cut-2": bh_cut2,
            "Sonneborn-Berger": sb,
            "Number of Wins": float(stats["wins"]),
            "Progressive Score": stats["progressive"],
            "Number of Games with Black": float(stats["black_games"]),
            "Average Rating of Opponents (ARO)": aro,
            "Direct Encounter": 0.0 
        }

        meta = player_meta[uid]
        player = meta["user"]
        
        base_name = f"{player.first_name or ''} {player.last_name or ''}".strip() or player.username
        
        standings_data.append({
            "user_id": uid,
            "starting_no": meta["seed"],
            "email": player.email,
            "player_name": base_name,
            "rating": stats["rating"],
            "points": stats["points"],
            "tb_map": tb_map,
            "direct_encounter_data": stats["direct_encounter_opponents"]
        })

    # Sort
    tb_config = tournament.tie_break_config or ["Buchholz Cut-1", "Buchholz", "Sonneborn-Berger", "Number of Wins", "Direct Encounter"]
    
    # Sort by key descending
    standings_data.sort(key=lambda x: get_standings_sort_key(x, tb_config), reverse=True)

    # 2nd pass for Direct Encounter (2-way tie adjustment)
    if "Direct Encounter" in tb_config:
        for i in range(len(standings_data) - 1):
            p1 = standings_data[i]
            p2 = standings_data[i+1]
            if p1["points"] == p2["points"]:
                res = p1["direct_encounter_data"].get(p2["user_id"])
                if res == 0.0: # p2 won against p1
                    standings_data[i], standings_data[i+1] = standings_data[i+1], standings_data[i]

    # Add ranks
    for i, p in enumerate(standings_data):
        p["rank"] = i + 1

    return tournament, standings_data
