import os
import subprocess
import tempfile
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models

class PairingResult(BaseModel):
    white_seed: int
    black_seed: Optional[int]


def get_fed_code(country: str) -> str:
    if not country:
        return "   "
    country_upper = country.strip().upper()
    mapping = {
        "INDIA": "IND",
        "UNITED STATES": "USA",
        "USA": "USA",
        "SPAIN": "ESP",
        "RUSSIA": "RUS",
        "GERMANY": "GER",
        "FRANCE": "FRA",
        "ENGLAND": "ENG",
        "UNITED KINGDOM": "ENG",
    }
    if country_upper in mapping:
        return mapping[country_upper]
    return country_upper[:3].ljust(3)


def assign_seeds_if_needed(db: Session, tournament_id: int, approved_registrations: List[models.TournamentRegistration]):
    needs_seeding = any(reg.seed is None or reg.seed <= 0 for reg in approved_registrations)
    if needs_seeding:
        tournament = db.query(models.Tournament).filter(models.Tournament.tournament_id == tournament_id).first()
        event_type = (tournament.event_type or "Standard").strip().lower() if tournament else "standard"

        def get_sort_key(reg):
            user = reg.user
            if not user:
                return (0, 8, "", reg.registration_id)

            # Determine primary rating based on event_type (Standard vs. Rapid vs. Blitz)
            if event_type == "rapid":
                rating = user.rapid_rating or user.fide_rating or user.national_rating or 0
            elif event_type == "blitz":
                rating = user.blitz_rating or user.fide_rating or user.national_rating or 0
            else:  # standard / classical
                rating = user.fide_rating or user.national_rating or 0

            # Title precedence (GM > IM > WGM > FM > WIM > CM > WCM > None)
            title = (user.title or "").strip().upper()
            title_priority = {
                "GM": 1,
                "IM": 2,
                "WGM": 3,
                "FM": 4,
                "WIM": 5,
                "CM": 6,
                "WCM": 7
            }
            title_rank = title_priority.get(title, 8)

            # Alphabetical ordering: Lastname, Firstname
            last = (user.last_name or "").strip()
            first = (user.first_name or user.username or "").strip()
            name_str = f"{last}, {first}" if last else first
            name_key = name_str.lower()

            return (-rating, title_rank, name_key, reg.registration_id)

        sorted_regs = sorted(approved_registrations, key=get_sort_key)
        for idx, reg in enumerate(sorted_regs, start=1):
            reg.seed = idx
        db.commit()


def build_trfx(tournament: models.Tournament, round_number: int, registrations: List[models.TournamentRegistration], db: Session) -> str:
    # 1. Assign stable seeds to players if missing
    assign_seeds_if_needed(db, tournament.tournament_id, registrations)

    # 2. Build headers
    headers = []
    headers.append(f"012 {tournament.tournament_name}")
    start_date_str = tournament.start_date.strftime("%Y/%m/%d") if tournament.start_date else "1900/01/01"
    headers.append(f"042 {start_date_str}")
    headers.append(f"XXR {tournament.rounds or 5}")
    headers.append("")  # Blank line separating headers from players

    # 3. Retrieve matches from all previous rounds to build round history
    # Only fetch if we are beyond round 1
    history_map = {reg.user_id: {} for reg in registrations}
    
    if round_number > 1:
        prev_rounds = db.query(models.Round).filter(
            models.Round.tournament_id == tournament.tournament_id,
            models.Round.round_number < round_number
        ).all()
        prev_round_ids = [r.round_id for r in prev_rounds]
        prev_round_by_id = {r.round_id: r.round_number for r in prev_rounds}

        if prev_round_ids:
            all_prev_matches = db.query(models.Match).filter(
                models.Match.round_id.in_(prev_round_ids)
            ).all()

            # Map user ID to registration to find seeds
            user_to_reg = {reg.user_id: reg for reg in registrations}

            for match in all_prev_matches:
                r_num = prev_round_by_id[match.round_id]
                w_uid = match.white_player_id
                b_uid = match.black_player_id
                res = match.result

                w_reg = user_to_reg.get(w_uid)
                b_reg = user_to_reg.get(b_uid) if b_uid else None

                # For White
                if w_reg:
                    if b_reg:
                        opp_seed = b_reg.seed
                        color = "w"
                        if res == "1-0":
                            result = "1"
                        elif res == "0-1":
                            result = "0"
                        elif res == "1/2-1/2":
                            result = "="
                        else:
                            result = "0"
                    else:
                        # BYE for White (no black player)
                        opp_seed = 0
                        color = "-"
                        if res == "Bye" or res == "1-0":
                            result = "+"
                        elif res == "1/2-1/2":
                            result = "="
                        else:
                            result = "-"

                    history_map[w_uid][r_num] = (opp_seed, color, result)

                # For Black
                if b_reg and w_reg:
                    opp_seed = w_reg.seed
                    color = "b"
                    if res == "1-0":
                        result = "0"
                    elif res == "0-1":
                        result = "1"
                    elif res == "1/2-1/2":
                        result = "="
                    else:
                        result = "0"

                    history_map[b_uid][r_num] = (opp_seed, color, result)

    # 4. Generate Player Lines (001)
    player_lines = []
    # Must sort players strictly by starting seed ascending
    sorted_players = sorted(registrations, key=lambda r: r.seed)
    
    event_type = (tournament.event_type or "Standard").strip().lower()

    for idx, reg in enumerate(sorted_players, start=1):
        user = reg.user
        
        # Gender
        gender = (user.gender or "").strip().lower()
        gender_char = "w" if gender.startswith("f") or gender.startswith("w") else ("m" if gender.startswith("m") else " ")
        
        # Title
        title = (user.title or "").strip().upper()
        title_str = title[:3].ljust(3)
        
        # Name (Format: Lastname, Firstname - max 33 characters)
        last = (user.last_name or "").strip()
        first = (user.first_name or user.username or "").strip()
        name_str = f"{last}, {first}" if last else first
        
        # Rating (FIDE rating or online/national based on event type)
        if event_type == "rapid":
            rating_val = user.rapid_rating or user.fide_rating or user.national_rating or 0
        elif event_type == "blitz":
            rating_val = user.blitz_rating or user.fide_rating or user.national_rating or 0
        else:  # standard / classical
            rating_val = user.fide_rating or user.national_rating or 0
        
        # Federation
        fed_str = get_fed_code(user.country)
        
        # FIDE ID
        fide_id_str = f"{str(user.fide_id or ''):<11s}"
        
        # Birth date
        birth_date_str = user.date_of_birth.strftime("%Y/%m/%d") if user.date_of_birth else "          "
        
        # Calculate points based on history map to be completely fresh
        points_val = 0.0
        p_history = history_map.get(reg.user_id, {})
        for r_num in range(1, round_number):
            h = p_history.get(r_num)
            if h:
                res_char = h[2]
                if res_char in ("1", "+"):
                    points_val += 1.0
                elif res_char == "=":
                    points_val += 0.5

        # Format line up to column 91 (length 91)
        line = (
            f"001 "
            f"{reg.seed:4d} "
            f"{gender_char:1s}"
            f"{title_str:3s} "
            f"{name_str:<33.33s} "
            f"{rating_val:4d} "
            f"{fed_str:3s} "
            f"{fide_id_str:<11.11s} "
            f"{birth_date_str:<10.10s} "
            f"{points_val:4.1f} "
            f"{reg.seed:4d}  "  # Columns 86-89 is rank, then 2 spaces
        )

        # Append round blocks (10 chars each)
        round_blocks = []
        for r_num in range(1, round_number):
            h = p_history.get(r_num)
            if h:
                opp_seed, color, result = h
                opp_str = f"{opp_seed:4d}" if opp_seed > 0 else "0000"
                round_blocks.append(f"{opp_str} {color} {result}  ")
            else:
                # Fallback: player was unpaired/absent in this round
                round_blocks.append("0000 - -  ")

        line += "".join(round_blocks)
        player_lines.append(line.rstrip())

    # Build the final file content
    trf_content = "\n".join(headers + player_lines) + "\n"
    return trf_content


def run_javafo(trfx_input: str, mode: str) -> str:
    # 1. Determine Java executable path (prefer local JRE if present)
    local_java = os.path.join(os.path.dirname(__file__), "jre", "bin", "java.exe")
    java_cmd = local_java if os.path.exists(local_java) else "java"

    # Check if JRE is available
    try:
        subprocess.run([java_cmd, "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception as e:
        raise RuntimeError("Java Runtime Environment (JRE) is not available in the system path. Please make sure Java is installed to run FIDE Swiss pairings.") from e

    # 2. Locate javafo.jar
    jar_path = os.getenv("JAVAFO_JAR_PATH", os.path.join(os.path.dirname(__file__), "javafo.jar"))
    if not os.path.exists(jar_path):
        raise FileNotFoundError(f"JaVaFo engine jar file not found at: {jar_path}. Please place javafo.jar in that location or configure JAVAFO_JAR_PATH.")

    # 3. Create temp input file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".trfx", delete=False, encoding="utf-8") as temp_in:
        temp_in.write(trfx_input)
        temp_in_path = temp_in.name

    temp_out_path = None
    try:
        if mode == "pair":
            # Specify an output path for the pairings file
            with tempfile.NamedTemporaryFile(mode="w", suffix=".trfx", delete=False, encoding="utf-8") as temp_out:
                temp_out_path = temp_out.name

            cmd = [java_cmd, "-jar", jar_path, temp_in_path, "-p", temp_out_path]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise RuntimeError(f"JaVaFo pairing execution failed (exit code {result.returncode}):\n{result.stderr}\nStdout:\n{result.stdout}")

            # Read result
            with open(temp_out_path, "r", encoding="utf-8") as f:
                output_content = f.read()
            return output_content

        elif mode == "check":
            # Captures standard stdout output
            cmd = [java_cmd, "-jar", jar_path, temp_in_path, "-c"]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise RuntimeError(f"JaVaFo checking execution failed (exit code {result.returncode}):\n{result.stderr}\nStdout:\n{result.stdout}")
            return result.stdout
    finally:
        # Cleanup files
        if os.path.exists(temp_in_path):
            os.remove(temp_in_path)
        if temp_out_path and os.path.exists(temp_out_path):
            os.remove(temp_out_path)


def parse_pairings(output_trfx: str) -> List[PairingResult]:
    lines = [line.strip() for line in output_trfx.splitlines() if line.strip()]
    if not lines:
        return []

    try:
        num_pairs = int(lines[0])
    except ValueError as e:
        raise ValueError(f"Invalid JaVaFo output: first line must be number of pairs. Got: '{lines[0]}'") from e

    pairings = []
    for line in lines[1:1 + num_pairs]:
        parts = line.split()
        if len(parts) != 2:
            raise ValueError(f"Invalid pairing line in JaVaFo output: '{line}'")
        try:
            w_seed = int(parts[0])
            b_seed = int(parts[1])
        except ValueError as e:
            raise ValueError(f"Invalid player IDs in pairing line: '{line}'") from e

        pairings.append(PairingResult(
            white_seed=w_seed,
            black_seed=b_seed if b_seed != 0 else None
        ))
    return pairings
