"""
Swiss Pairing Engine (Simplified Deterministic)
================================================
A clean, maintainable Swiss pairing algorithm for chess tournaments.

Design goals:
  - Deterministic: same input always produces same output
  - Simple: no graph matching, no edge weights, no heavy optimization
  - Transparent: each step is a named function that is easy to test
  - Compatible: drop-in replacement for _generate_pairings_for_round() in pairings.py

Pairing flow:
  1. Build PlayerState from DB (scores, color history, opponent history)
  2. Assign BYE if player count is odd
  3. Group players by score
  4. For each score group (high → low): pair greedily, float unpaired player down
  5. Assign colors (white/black) per FIDE preference rules
  6. Write Match rows + update color_history on TournamentRegistration

Complexity: O(n²) worst case (repeat-opponent scan), O(n log n) typical
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from .. import models

log = logging.getLogger("swiss_pairing")


# ─────────────────────────────────────────────────────────────────────────────
# PlayerState — all data needed for pairing decisions
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class PlayerState:
    user_id: int
    seed: int                   # Starting number assigned at tournament start
    current_points: float       # Accumulated score (win=1, draw=0.5, loss=0)
    rating: int                 # FIDE or national rating
    color_history: str          # e.g. "WBW" — rebuilt from matches table
    color_balance: int          # +n = more whites played; -n = more blacks
    last_color: Optional[str]   # "W" or "B" from most recent game
    opponents_played: set       # set of user_ids already faced
    bye_received: bool          # True if this player already received a bye


# ─────────────────────────────────────────────────────────────────────────────
# PairingResult — one board's pairing for the caller
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class PairingResult:
    white_id: int
    black_id: Optional[int]     # None for a BYE
    board_number: int
    is_bye: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# Step 1 — Build player states from the database
# ─────────────────────────────────────────────────────────────────────────────

def build_player_states(
    db: Session,
    tournament_id: int,
    approved_registrations: list,           # list[models.TournamentRegistration]
) -> dict:                                  # dict[int, PlayerState]
    """
    Read every approved registration and replay the match history to compute
    each player's color history, color balance, and opponent list.

    This always derives state from the matches table (single source of truth)
    so it is always correct even after result corrections or regenerations.
    """
    states: dict[int, PlayerState] = {}

    for reg in approved_registrations:
        user = reg.user
        rating = user.fide_rating or user.national_rating or 0
        states[reg.user_id] = PlayerState(
            user_id=reg.user_id,
            seed=reg.seed or reg.registration_id,
            current_points=float(reg.current_points or 0),
            rating=rating,
            color_history="",
            color_balance=0,
            last_color=None,
            opponents_played=set(),
            bye_received=bool(reg.bye_received),
        )

    # Replay past completed matches in round order
    past_matches = (
        db.query(models.Match)
        .join(models.Round, models.Match.round_id == models.Round.round_id)
        .filter(
            models.Match.tournament_id == tournament_id,
            models.Match.result.isnot(None),
        )
        .order_by(models.Round.round_number.asc())
        .all()
    )

    for match in past_matches:
        w_id = match.white_player_id
        b_id = match.black_player_id

        if w_id in states:
            states[w_id].color_history += "W"
            states[w_id].color_balance += 1
            if b_id is not None:
                states[w_id].opponents_played.add(b_id)

        if b_id and b_id in states:
            states[b_id].color_history += "B"
            states[b_id].color_balance -= 1
            states[b_id].opponents_played.add(w_id)

    # Derive last_color from history
    for state in states.values():
        if state.color_history:
            state.last_color = state.color_history[-1]

    _log_player_states(states)
    return states


def _log_player_states(states: dict) -> None:
    log.debug("[Swiss] Player states:")
    for s in sorted(states.values(), key=lambda p: (-p.current_points, p.seed)):
        log.debug(
            "  SNo %2d | pts=%.1f | rtg=%4d | colors=%-6s | bal=%+d | bye=%s | opps=%s",
            s.seed, s.current_points, s.rating,
            s.color_history or "-", s.color_balance,
            s.bye_received, sorted(s.opponents_played),
        )


# ─────────────────────────────────────────────────────────────────────────────
# Step 2 — Sort players (primary sort order for the whole algorithm)
# ─────────────────────────────────────────────────────────────────────────────

def sort_players(players: list) -> list:
    """
    Sort players for pairing priority.
    Order: score DESC → rating DESC → seed ASC (deterministic tiebreak)
    """
    return sorted(
        players,
        key=lambda p: (-p.current_points, -p.rating, p.seed),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Step 3 — BYE assignment
# ─────────────────────────────────────────────────────────────────────────────

def assign_bye(players: list) -> Optional[object]:
    """
    Select the BYE recipient when player count is odd.

    Rules (FIDE-compatible):
      1. Player must not have already received a bye.
      2. Among eligible: lowest score first, then lowest rating, then highest seed.

    Removes the selected player from ``players`` in-place and returns them.
    Returns None if the list is already even (no BYE needed).
    """
    if len(players) % 2 == 0:
        return None

    eligible = [p for p in players if not p.bye_received]
    if not eligible:
        # Everyone already had a bye — give to lowest ranked overall
        eligible = players[:]

    # Sort: lowest score first, then lowest rating, then highest seed (weakest)
    eligible.sort(key=lambda p: (p.current_points, p.rating, -p.seed))
    bye_player = eligible[0]
    players.remove(bye_player)

    log.info(
        "[Swiss] BYE → SNo %d (pts=%.1f, rtg=%d)",
        bye_player.seed, bye_player.current_points, bye_player.rating,
    )
    return bye_player


# ─────────────────────────────────────────────────────────────────────────────
# Step 4 — Group players by score
# ─────────────────────────────────────────────────────────────────────────────

def group_by_score(players: list) -> list:
    """
    Split a sorted player list into score brackets.
    Returns a list of groups (each group is a list of PlayerState), ordered
    from highest score to lowest. Players within a group are already sorted
    by the priority order from sort_players().

    Example:
        Input:  [A(3), B(3), C(2), D(2), E(1)]
        Output: [[A, B], [C, D], [E]]
    """
    if not players:
        return []

    groups = []
    current_score = players[0].current_points
    current_group = []

    for player in players:
        if player.current_points == current_score:
            current_group.append(player)
        else:
            groups.append(current_group)
            current_group = [player]
            current_score = player.current_points

    if current_group:
        groups.append(current_group)

    log.debug("[Swiss] Score groups:")
    for g in groups:
        log.debug("  %.1f pts → SNo [%s]", g[0].current_points, ", ".join(str(p.seed) for p in g))

    return groups


# ─────────────────────────────────────────────────────────────────────────────
# Step 5 — Pair a single score group
# ─────────────────────────────────────────────────────────────────────────────

def pair_group(group: list, floaters: list) -> tuple:
    """
    Pair players within one score group (with any floaters prepended).

    Algorithm:
      - Combine floaters + group players into one working list.
      - Iterate: take the first unpaired player, find the highest-ranked
        valid opponent (no repeat, greedy scan downward).
      - Any player left unpaired at the end becomes a floater for the
        next (lower) score group.

    Returns:
      (pairs, new_floaters)
        pairs       — list of (PlayerState, PlayerState) tuples
        new_floaters — list of players who could not be paired here
    """
    pool = list(floaters) + list(group)     # floaters have priority (they came from higher group)
    unpaired = list(pool)                   # working copy
    pairs = []

    while len(unpaired) >= 2:
        p1 = unpaired.pop(0)                # highest-ranked unpaired player
        opponent = _find_opponent(p1, unpaired)

        if opponent is not None:
            unpaired.remove(opponent)
            pairs.append((p1, opponent))
            log.debug("[Swiss]   ✓ SNo %d  vs  SNo %d", p1.seed, opponent.seed)
        else:
            # No valid opponent in this group — p1 will float to next group
            log.debug("[Swiss]   ↓ SNo %d → no valid opponent, floating down", p1.seed)
            unpaired.insert(0, p1)          # put back to maintain order
            # Float the lowest-ranked player (last in list) rather than p1
            # so we maximise pairing within the group (FIDE §13.5 spirit)
            floater = unpaired.pop(-1)
            log.debug("[Swiss]   ↓ Floater chosen: SNo %d", floater.seed)
            # Retry this iteration without the floater
            unpaired_retry = [p for p in unpaired if p.user_id != floater.user_id]

            retry_pairs, retry_floaters = pair_group(unpaired_retry, [])
            pairs.extend(retry_pairs)
            return pairs, [floater] + retry_floaters

    # Any odd player left in pool becomes a floater
    new_floaters = unpaired   # 0 or 1 player
    return pairs, new_floaters


def _find_opponent(p1: object, candidates: list) -> Optional[object]:
    """
    Greedy search: return the highest-ranked candidate that p1 has not yet played.
    Returns None if no valid opponent exists.
    """
    for candidate in candidates:          # already sorted high → low
        if candidate.user_id not in p1.opponents_played:
            return candidate
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Step 6 — Color assignment
# ─────────────────────────────────────────────────────────────────────────────

def assign_colors(p1: object, p2: object) -> tuple:
    """
    Determine which player gets White and which gets Black.

    Priority order (FIDE-compatible):
      1. Absolute constraint: if a player has played the same color 2+ times
         in a row, they MUST get the opposite color.
      2. Color balance: player with more blacks is due White (and vice versa).
      3. Color preference: alternate from the player's last color.
      4. Tiebreak: lower seed (stronger player by initial ranking) gets White.

    Returns (white_player, black_player).
    """
    # Rule 1 — Absolute constraint (2 same colors in a row → force opposite)
    abs1 = _absolute_color(p1)
    abs2 = _absolute_color(p2)

    if abs1 and abs2:
        # Both have absolute constraints
        if abs1 == "W" and abs2 == "B":
            return p1, p2
        if abs1 == "B" and abs2 == "W":
            return p2, p1
        # Same absolute constraint — resolve by seed (lower = stronger = White)
        return (p1, p2) if p1.seed < p2.seed else (p2, p1)

    if abs1:
        return (p1, p2) if abs1 == "W" else (p2, p1)
    if abs2:
        return (p2, p1) if abs2 == "W" else (p1, p2)

    # Rule 2 — Color balance
    # More negative balance = more blacks = due White
    if p1.color_balance < p2.color_balance:
        return p1, p2    # p1 is due White
    if p2.color_balance < p1.color_balance:
        return p2, p1    # p2 is due White

    # Rule 3 — Alternate from last color
    due1 = _due_color(p1)
    due2 = _due_color(p2)

    if due1 == "W" and due2 == "B":
        return p1, p2
    if due1 == "B" and due2 == "W":
        return p2, p1

    # Rule 4 — Tiebreak: lower seed gets White
    return (p1, p2) if p1.seed < p2.seed else (p2, p1)


def _absolute_color(p: object) -> Optional[str]:
    """
    Return the color that MUST be assigned to this player:
      - If last 2 games were White → must get Black ("B")
      - If last 2 games were Black → must get White ("W")
      - Otherwise → None (no absolute constraint)
    """
    hist = p.color_history
    if len(hist) >= 2 and hist[-1] == hist[-2]:
        return "B" if hist[-1] == "W" else "W"
    return None


def _due_color(p: object) -> str:
    """
    Return the preferred color based on alternation from last game.
    Falls back to White if no games played yet.
    """
    if p.last_color == "W":
        return "B"
    if p.last_color == "B":
        return "W"
    return "W"     # No games yet: default to White


# ─────────────────────────────────────────────────────────────────────────────
# Step 7 — Write results to the database
# ─────────────────────────────────────────────────────────────────────────────

def write_pairings_to_db(
    db: Session,
    tournament_id: int,
    round_id: int,
    pairs: list,                            # list of (PlayerState, PlayerState)
    bye_player: Optional[object],
    reg_map: dict,                          # dict[user_id, TournamentRegistration]
) -> list:                                  # list[PairingResult]
    """
    Write one Match row per pairing and update color_history on each
    TournamentRegistration. BYE player gets match with black_player_id=NULL,
    result="1-0", and bye_received=True.

    Returns a list of PairingResult for the API response / logging.
    """
    results: list[PairingResult] = []
    board_number = 1

    for p1, p2 in pairs:
        white, black = assign_colors(p1, p2)

        log.info(
            "[Swiss] Board %d: SNo %d (W) vs SNo %d (B)  "
            "[hist: %s→%sW | %s→%sB]",
            board_number, white.seed, black.seed,
            white.color_history, white.color_history,
            black.color_history, black.color_history,
        )

        db.add(models.Match(
            tournament_id=tournament_id,
            round_id=round_id,
            white_player_id=white.user_id,
            black_player_id=black.user_id,
            board_number=board_number,
            result=None,
        ))

        _append_color(reg_map, white.user_id, "W")
        _append_color(reg_map, black.user_id, "B")

        results.append(PairingResult(
            white_id=white.user_id,
            black_id=black.user_id,
            board_number=board_number,
        ))
        board_number += 1

    # BYE board
    if bye_player:
        log.info(
            "[Swiss] Board %d (BYE): SNo %d — awarded 1 point",
            board_number, bye_player.seed,
        )
        db.add(models.Match(
            tournament_id=tournament_id,
            round_id=round_id,
            white_player_id=bye_player.user_id,
            black_player_id=None,
            board_number=board_number,
            result="1-0",
        ))

        bye_reg = reg_map.get(bye_player.user_id)
        if bye_reg:
            bye_reg.bye_received = True
            bye_reg.current_points = float(bye_reg.current_points or 0) + 1.0

        results.append(PairingResult(
            white_id=bye_player.user_id,
            black_id=None,
            board_number=board_number,
            is_bye=True,
        ))

    return results


def _append_color(reg_map: dict, user_id: int, color: str) -> None:
    """
    Append 'W' or 'B' to tournament_registrations.color_history.
    Detects and resets legacy JSON values stored in the field from old code.
    """
    reg = reg_map.get(user_id)
    if not reg:
        return
    current = reg.color_history or ""
    if current.startswith(("{", "[", '"')):   # Legacy JSON — reset
        current = ""
    reg.color_history = current + color


# ─────────────────────────────────────────────────────────────────────────────
# Main entry point — called from pairings.py
# ─────────────────────────────────────────────────────────────────────────────

def generate_swiss_pairings(
    db: Session,
    tournament: object,                     # models.Tournament
    round_record: object,                   # models.Round
    approved_registrations: list,           # list[models.TournamentRegistration]
) -> list:                                  # list[PairingResult]
    """
    Generate Swiss pairings for the given round.

    Steps:
      1. Build PlayerState for every approved player (from DB history).
      2. Sort players: score DESC, rating DESC, seed ASC.
      3. Assign BYE to lowest eligible player if count is odd.
      4. Group remaining players by score.
      5. For each score group (high → low): pair greedily, float unpaired down.
      6. Assign White/Black based on color preference and balance.
      7. Write Match rows and update TournamentRegistration.color_history.

    Called by _generate_pairings_for_round() in pairings.py for Swiss tournaments.
    The caller is responsible for db.commit().
    """
    tournament_id = tournament.tournament_id
    round_id = round_record.round_id
    round_number = round_record.round_number

    log.info("=" * 60)
    log.info("[Swiss] Round %d — Tournament %d", round_number, tournament_id)
    log.info("=" * 60)

    # ── Step 1: Build state ───────────────────────────────────────────────────
    states = build_player_states(db, tournament_id, approved_registrations)
    players = sort_players(list(states.values()))

    reg_map = {reg.user_id: reg for reg in approved_registrations}

    # ── Step 2: BYE ──────────────────────────────────────────────────────────
    bye_player = assign_bye(players)        # modifies `players` in-place if odd

    # ── Step 3: Score groups ─────────────────────────────────────────────────
    score_groups = group_by_score(players)

    # ── Step 4: Pair each score group, passing floaters down ─────────────────
    all_pairs = []
    floaters = []

    for group in score_groups:
        log.debug(
            "[Swiss] Pairing group %.1f pts: %s  (+ floaters %s)",
            group[0].current_points,
            [p.seed for p in group],
            [p.seed for p in floaters],
        )
        pairs, floaters = pair_group(group, floaters)
        all_pairs.extend(pairs)

    # Any remaining floaters after the last group (very rare edge case)
    if len(floaters) >= 2:
        log.debug("[Swiss] Pairing leftover floaters: %s", [p.seed for p in floaters])
        extra_pairs, _ = pair_group(floaters, [])
        all_pairs.extend(extra_pairs)
    elif len(floaters) == 1 and bye_player is None:
        # Convert sole floater to BYE rather than leave unmatched
        bye_player = floaters[0]
        log.debug("[Swiss] Converting unpaired floater SNo %d to BYE", bye_player.seed)

    # ── Step 5: Write to DB ───────────────────────────────────────────────────
    results = write_pairings_to_db(
        db, tournament_id, round_id, all_pairs, bye_player, reg_map
    )

    log.info(
        "[Swiss] Done — %d boards + %s",
        len(all_pairs),
        f"BYE (SNo {bye_player.seed})" if bye_player else "no BYE",
    )
    return results


# Keep the old export name as an alias so pairings.py needs no changes.
generate_dutch_swiss_pairings = generate_swiss_pairings
