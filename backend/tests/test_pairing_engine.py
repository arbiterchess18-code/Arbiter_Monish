import os
import unittest
from datetime import date, datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend root to path so we can import app modules directly
import sys
from pathlib import Path
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.database import Base
from app import models
from app.pairing_engine.engine import (
    build_trfx,
    parse_pairings,
    run_javafo,
    get_fed_code,
    PairingResult
)


class TestPairingEngine(unittest.TestCase):
    def setUp(self):
        # Set up in-memory database
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed Tournament
        self.tournament = models.Tournament(
            tournament_name="JaVaFo Test Championship",
            start_date=date(2026, 6, 20),
            pairing_system="Swiss",
            rounds=3,
            status="active"
        )
        self.db.add(self.tournament)
        self.db.flush()

        # Seed Users
        self.users = []
        for i in range(1, 5):
            u = models.User(
                username=f"player{i}",
                email=f"player{i}@example.com",
                hashed_password="password",
                first_name=f"Player",
                last_name=f"Number{i}",
                fide_rating=1500 + i * 50,  # 1550, 1600, 1650, 1700
                country="India" if i % 2 == 0 else "USA"
            )
            self.db.add(u)
            self.users.append(u)
        self.db.flush()

        # Seed Registrations (initially unseeded to test auto-seeding)
        self.registrations = []
        for u in self.users:
            reg = models.TournamentRegistration(
                tournament_id=self.tournament.tournament_id,
                user_id=u.user_id,
                status="approved",
                current_points=0.0
            )
            self.db.add(reg)
            self.registrations.append(reg)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_fed_code_mapping(self):
        self.assertEqual(get_fed_code("India"), "IND")
        self.assertEqual(get_fed_code("United States"), "USA")
        self.assertEqual(get_fed_code("Spain"), "ESP")
        self.assertEqual(get_fed_code("UnknownCountry"), "UNK")

    def test_auto_seeding_and_round1_serialization(self):
        # Round 1 serialization
        trfx = build_trfx(self.tournament, 1, self.registrations, self.db)
        
        # Verify seeds were assigned: highest rating first
        # Ratings: player4 (1700), player3 (1650), player2 (1600), player1 (1550)
        # Seeds should be assigned 1 to 4 in that order.
        self.db.refresh(self.registrations[0])  # player1 (rating 1550)
        self.db.refresh(self.registrations[3])  # player4 (rating 1700)
        
        self.assertEqual(self.registrations[3].seed, 1)  # highest
        self.assertEqual(self.registrations[0].seed, 4)  # lowest
        
        # Verify headers in TRFx
        self.assertIn("012 JaVaFo Test Championship", trfx)
        self.assertIn("XXR 3", trfx)
        self.assertIn("042 2026/06/20", trfx)

        # Verify player rows (001)
        lines = [line for line in trfx.splitlines() if line.startswith("001")]
        self.assertEqual(len(lines), 4)
        
        # Checking columns on the first player (seed 1)
        player_line = lines[0]
        # Should be seed 1
        self.assertIn("   1", player_line[:8])
        # Name should be in there
        self.assertIn("Number4, Player", player_line)
        # Rating 1700
        self.assertIn("1700", player_line)

    def test_round2_serialization_with_history(self):
        # Assign seeds manually first
        for idx, reg in enumerate(self.registrations, start=1):
            reg.seed = idx
        self.db.commit()

        # Simulate Round 1:
        # Match 1: Player 1 (white) vs Player 2 (black), result: 1-0
        # Match 2: Player 3 (white) vs Player 4 (black), result: 1/2-1/2
        round1 = models.Round(
            tournament_id=self.tournament.tournament_id,
            round_number=1,
            is_submitted=True
        )
        self.db.add(round1)
        self.db.flush()

        match1 = models.Match(
            tournament_id=self.tournament.tournament_id,
            round_id=round1.round_id,
            white_player_id=self.users[0].user_id,  # seed 1
            black_player_id=self.users[1].user_id,  # seed 2
            board_number=1,
            result="1-0"
        )
        match2 = models.Match(
            tournament_id=self.tournament.tournament_id,
            round_id=round1.round_id,
            white_player_id=self.users[2].user_id,  # seed 3
            black_player_id=self.users[3].user_id,  # seed 4
            board_number=2,
            result="1/2-1/2"
        )
        self.db.add(match1)
        self.db.add(match2)
        self.db.commit()

        # Serialize for Round 2
        trfx = build_trfx(self.tournament, 2, self.registrations, self.db)

        # Let's inspect the player rows (001) for round history
        lines = [line for line in trfx.splitlines() if line.startswith("001")]
        
        # Player 1 (seed 1): played seed 2, color white, result win (1)
        # Columns 92+ should contain opponent 2, color w, result 1
        # Let's check player 1 line
        p1_line = [l for l in lines if "Number1" in l][0]
        # Opponent: 2 (indices 91-94 -> columns 92-95), color: w, result: 1
        round1_part = p1_line[91:99]
        self.assertEqual(round1_part, "   2 w 1")

        # Player 2 (seed 2): played seed 1, color black, result loss (0)
        p2_line = [l for l in lines if "Number2" in l][0]
        round1_part_p2 = p2_line[91:99]
        self.assertEqual(round1_part_p2, "   1 b 0")

        # Player 3 (seed 3): played seed 4, color white, result draw (=)
        p3_line = [l for l in lines if "Number3" in l][0]
        round1_part_p3 = p3_line[91:99]
        self.assertEqual(round1_part_p3, "   4 w =")

    def test_parse_pairings(self):
        output_txt = "3\n1 4\n3 2\n5 0\n"
        pairings = parse_pairings(output_txt)
        
        self.assertEqual(len(pairings), 3)
        self.assertEqual(pairings[0].white_seed, 1)
        self.assertEqual(pairings[0].black_seed, 4)
        
        self.assertEqual(pairings[1].white_seed, 3)
        self.assertEqual(pairings[1].black_seed, 2)
        
        self.assertEqual(pairings[2].white_seed, 5)
        self.assertEqual(pairings[2].black_seed, None)  # Bye

    def test_parse_pairings_invalid(self):
        with self.assertRaises(ValueError):
            parse_pairings("not_a_number\n1 2")
        with self.assertRaises(ValueError):
            parse_pairings("1\n1 2 3")

    def test_java_not_available_exception(self):
        # Test run_javafo raises RuntimeError if java command is absent or fails
        # We can temporarily mock subprocess.run to simulate FileNotFoundError (java command not found)
        from unittest.mock import patch
        
        with patch("subprocess.run", side_effect=FileNotFoundError("No such file")):
            with self.assertRaises(RuntimeError) as context:
                run_javafo("dummy", mode="pair")
            self.assertIn("Java Runtime Environment (JRE) is not available", str(context.exception))

    def test_seeding_hierarchy_alignment(self):
        # Clean registrations for this test
        for reg in self.registrations:
            self.db.delete(reg)
        for u in self.users:
            self.db.delete(u)
        self.db.commit()

        # Create players with specific ratings/titles to test hierarchy
        # Player A: Standard 2000, Title FM, Name: Alpha, Aaron
        # Player B: Standard 2000, Title GM, Name: Beta, Bob
        # Player C: Standard 2000, Title IM, Name: Gamma, Gary
        # Player D: Standard 2000, Title GM, Name: Delta, David (Tie break by name with Player B)
        # Player E: Rapid 2200 (should not be used since event is Standard), Standard 1900, Title None, Name: Epsilon, Eric
        pA = models.User(username="pA", email="pa@example.com", hashed_password="pw", fide_rating=2000, title="FM", last_name="Alpha", first_name="Aaron")
        pB = models.User(username="pB", email="pb@example.com", hashed_password="pw", fide_rating=2000, title="GM", last_name="Beta", first_name="Bob")
        pC = models.User(username="pC", email="pc@example.com", hashed_password="pw", fide_rating=2000, title="IM", last_name="Gamma", first_name="Gary")
        pD = models.User(username="pD", email="pd@example.com", hashed_password="pw", fide_rating=2000, title="GM", last_name="Delta", first_name="David")
        pE = models.User(username="pE", email="pe@example.com", hashed_password="pw", fide_rating=1900, rapid_rating=2200, title=None, last_name="Epsilon", first_name="Eric")

        self.db.add_all([pA, pB, pC, pD, pE])
        self.db.flush()

        regs = []
        for u in [pA, pB, pC, pD, pE]:
            reg = models.TournamentRegistration(
                tournament_id=self.tournament.tournament_id,
                user_id=u.user_id,
                status="approved"
            )
            self.db.add(reg)
            regs.append(reg)
        self.db.commit()

        # Trigger seeding for Standard event
        self.tournament.event_type = "Standard"
        trfx = build_trfx(self.tournament, 1, regs, self.db)

        # Expected Seeds:
        # 1. rating 2000, title GM: Beta vs Delta -> Alphabetical sorting: Beta, Bob (seed 1) then Delta, David (seed 2)
        # 2. rating 2000, title IM: Gamma, Gary (seed 3)
        # 3. rating 2000, title FM: Alpha, Aaron (seed 4)
        # 4. rating 1900, no title: Epsilon, Eric (seed 5)

        self.db.refresh(regs[0]) # pA
        self.db.refresh(regs[1]) # pB
        self.db.refresh(regs[2]) # pC
        self.db.refresh(regs[3]) # pD
        self.db.refresh(regs[4]) # pE

        self.assertEqual(regs[1].seed, 1) # Beta, Bob
        self.assertEqual(regs[3].seed, 2) # Delta, David
        self.assertEqual(regs[2].seed, 3) # Gamma, Gary
        self.assertEqual(regs[0].seed, 4) # Alpha, Aaron
        self.assertEqual(regs[4].seed, 5) # Epsilon, Eric

    def test_bye_and_points_trf_format(self):
        # Set up a round 2 serialization where a player had a bye in round 1
        # Set seeds manually
        for idx, reg in enumerate(self.registrations, start=1):
            reg.seed = idx
        self.db.commit()

        # Round 1
        round1 = models.Round(
            tournament_id=self.tournament.tournament_id,
            round_number=1,
            is_submitted=True
        )
        self.db.add(round1)
        self.db.flush()

        # Match: player 1 gets a bye
        bye_match = models.Match(
            tournament_id=self.tournament.tournament_id,
            round_id=round1.round_id,
            white_player_id=self.users[0].user_id,
            black_player_id=None, # Bye
            board_number=1,
            result="Bye"
        )
        self.db.add(bye_match)
        self.db.commit()

        # Build TRFx for round 2
        trfx = build_trfx(self.tournament, 2, self.registrations, self.db)

        # Verify TRFx round 1 history line for player 1: should contain "0000 - +"
        lines = [line for line in trfx.splitlines() if line.startswith("001")]
        p1_line = [l for l in lines if f"Number1" in l][0]

        # In standard TRF position, round 1 history starts at column index 92 (0-indexed 91)
        round1_block = p1_line[91:99]
        self.assertEqual(round1_block, "0000 - +")

        # Points sum should be 1.0
        self.assertIn(" 1.0", p1_line)
