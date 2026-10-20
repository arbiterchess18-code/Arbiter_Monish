import os
import unittest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
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
)
from app.logic.standings import calculate_standings
from app.api.v1.endpoints.pairings import (
    _mark_player_absent_impl,
    _restore_absent_player_impl,
    _generate_pairings_for_round,
)


class TestAbsentPlayerManagement(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Create Admin/Arbiter User
        self.arbiter = models.User(
            username="head_arbiter",
            email="arbiter@example.com",
            hashed_password="hashed_pw",
            first_name="Chief",
            last_name="Arbiter",
            country="India"
        )
        self.db.add(self.arbiter)
        self.db.flush()

        # Seed Tournament
        self.tournament = models.Tournament(
            tournament_name="National Swiss Championship",
            created_by=self.arbiter.user_id,
            start_date=date(2026, 7, 1),
            pairing_system="Swiss",
            rounds=5,
            current_round=0,
            status="active"
        )
        self.db.add(self.tournament)
        self.db.flush()

        # Create 4 players
        # Ratings: Player 1 (2000), Player 2 (1900), Player 3 (1800), Player 4 (1700)
        self.players = []
        for i in range(1, 5):
            u = models.User(
                username=f"gm_player_{i}",
                email=f"gm{i}@example.com",
                hashed_password="pw",
                first_name=f"Player",
                last_name=f"{i}",
                fide_rating=2100 - i * 100,
                country="India"
            )
            self.db.add(u)
            self.players.append(u)
        self.db.flush()

        # Register players
        self.registrations = []
        for u in self.players:
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

    def test_mark_player_absent_and_restore(self):
        # Mark Player 4 absent
        target_player = self.players[3]
        res = _mark_player_absent_impl(
            self.tournament.tournament_id,
            target_player.user_id,
            self.db,
            self.arbiter
        )
        self.assertTrue(res["is_absent"])
        self.assertEqual(res["player_id"], target_player.user_id)

        # Verify DB
        reg = self.db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == self.tournament.tournament_id,
            models.TournamentRegistration.user_id == target_player.user_id
        ).first()
        self.assertTrue(reg.is_absent)
        self.assertEqual(reg.status, "absent")

        # Restore Player 4
        restore_res = _restore_absent_player_impl(
            self.tournament.tournament_id,
            target_player.user_id,
            self.db,
            self.arbiter
        )
        self.assertFalse(restore_res["is_absent"])
        self.db.refresh(reg)
        self.assertFalse(reg.is_absent)
        self.assertEqual(reg.status, "approved")

    def test_absent_player_skipped_in_round1_and_restored_in_round2(self):
        # Scenario: Player 4 is absent in Round 1
        p4 = self.players[3]
        _mark_player_absent_impl(
            self.tournament.tournament_id,
            p4.user_id,
            self.db,
            self.arbiter
        )

        # Get active players for round 1
        active_regs = self.db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == self.tournament.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"]),
            (models.TournamentRegistration.is_absent == False) | (models.TournamentRegistration.is_absent.is_(None))
        ).all()

        # Should only have 3 active players (Player 1, Player 2, Player 3)
        self.assertEqual(len(active_regs), 3)
        active_uids = [r.user_id for r in active_regs]
        self.assertNotIn(p4.user_id, active_uids)

        # Create Round 1
        round1 = models.Round(
            tournament_id=self.tournament.tournament_id,
            round_number=1,
            is_submitted=False
        )
        self.db.add(round1)
        self.db.flush()

        _generate_pairings_for_round(self.db, self.tournament, round1, active_regs)
        self.db.commit()

        # Verify Round 1 matches
        matches_r1 = self.db.query(models.Match).filter(
            models.Match.round_id == round1.round_id
        ).all()
        # 3 players means 1 normal match and 1 Bye match
        self.assertEqual(len(matches_r1), 2)
        match_uids = [m.white_player_id for m in matches_r1] + [m.black_player_id for m in matches_r1 if m.black_player_id]
        self.assertNotIn(p4.user_id, match_uids)

        # Finalize Round 1 with results
        # Set normal match result
        normal_match = [m for m in matches_r1 if m.black_player_id is not None][0]
        normal_match.result = "1-0"
        round1.is_submitted = True
        self.tournament.current_round = 1
        self.db.commit()

        # Calculate standings after Round 1
        # Player 4 (absent) should still be in standings with 0.0 points!
        _, standings_r1 = calculate_standings(self.db, self.tournament.tournament_id)
        self.assertEqual(len(standings_r1), 4)
        p4_standing = [s for s in standings_r1 if s["user_id"] == p4.user_id][0]
        self.assertEqual(p4_standing["points"], 0.0)
        self.assertTrue(p4_standing["is_absent"])

        # Now Player 4 arrives for Round 2! Restore Player 4
        _restore_absent_player_impl(
            self.tournament.tournament_id,
            p4.user_id,
            self.db,
            self.arbiter
        )

        # Query active players for Round 2: all 4 are now active!
        active_regs_r2 = self.db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == self.tournament.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"]),
            (models.TournamentRegistration.is_absent == False) | (models.TournamentRegistration.is_absent.is_(None))
        ).all()
        self.assertEqual(len(active_regs_r2), 4)

        # Check TRF output for Round 2: Player 4 should have 0000 - - in Round 1
        trfx2 = build_trfx(self.tournament, 2, active_regs_r2, self.db)
        p4_line = [l for l in trfx2.splitlines() if p4.username in l or "4, Player" in l][0]
        # Opponent block for round 1 should be 0000 - -
        self.assertIn("0000 - -", p4_line)
        self.assertIn("0.0", p4_line)

        # Generate Round 2 pairings
        round2 = models.Round(
            tournament_id=self.tournament.tournament_id,
            round_number=2,
            is_submitted=False
        )
        self.db.add(round2)
        self.db.flush()

        _generate_pairings_for_round(self.db, self.tournament, round2, active_regs_r2)
        self.db.commit()

        # Verify Round 2 pairings include Player 4!
        matches_r2 = self.db.query(models.Match).filter(
            models.Match.round_id == round2.round_id
        ).all()
        self.assertEqual(len(matches_r2), 2)  # 4 players = 2 games
        all_r2_players = [m.white_player_id for m in matches_r2] + [m.black_player_id for m in matches_r2]
        self.assertIn(p4.user_id, all_r2_players)

    def test_single_round_absence_automatic_restoration(self):
        # Scenario: Player 4 is absent for Round 1 ONLY (round_number=1)
        p4 = self.players[3]
        abs_res = _mark_player_absent_impl(
            self.tournament.tournament_id,
            p4.user_id,
            self.db,
            self.arbiter,
            round_number=1
        )
        self.assertEqual(abs_res["absent_round"], 1)
        self.assertTrue(abs_res["is_absent"])

        # Fetch registrations for tournament
        all_regs = self.db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == self.tournament.tournament_id
        ).all()

        # Generate Round 1 pairings
        round1 = models.Round(
            tournament_id=self.tournament.tournament_id,
            round_number=1,
            is_submitted=False
        )
        self.db.add(round1)
        self.db.flush()

        _generate_pairings_for_round(self.db, self.tournament, round1, all_regs)
        self.db.commit()

        # Check Round 1 matches: Player 4 must NOT be in Round 1
        matches_r1 = self.db.query(models.Match).filter(
            models.Match.round_id == round1.round_id
        ).all()
        r1_players = [m.white_player_id for m in matches_r1] + [m.black_player_id for m in matches_r1 if m.black_player_id]
        self.assertNotIn(p4.user_id, r1_players)

        # Enter match results for Round 1
        for m in matches_r1:
            if m.black_player_id:
                m.result = "1-0"
        self.db.commit()

        # Finalize Round 1 via endpoint logic (resets single round absences)
        round1.is_submitted = True
        self.db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == self.tournament.tournament_id,
            models.TournamentRegistration.is_absent == True,
            models.TournamentRegistration.absent_round == 1
        ).update({
            "is_absent": False,
            "status": "approved",
            "absent_round": None
        }, synchronize_session=False)
        self.tournament.current_round = 1
        self.db.commit()

        # Check Player 4 status: should now be approved and active without manual action!
        reg4 = self.db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == self.tournament.tournament_id,
            models.TournamentRegistration.user_id == p4.user_id
        ).first()
        self.assertFalse(reg4.is_absent)
        self.assertIsNone(reg4.absent_round)

        # Generate Round 2 pairings
        all_regs_r2 = self.db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == self.tournament.tournament_id
        ).all()

        round2 = models.Round(
            tournament_id=self.tournament.tournament_id,
            round_number=2,
            is_submitted=False
        )
        self.db.add(round2)
        self.db.flush()

        _generate_pairings_for_round(self.db, self.tournament, round2, all_regs_r2)
        self.db.commit()

        # Player 4 MUST be paired in Round 2!
        matches_r2 = self.db.query(models.Match).filter(
            models.Match.round_id == round2.round_id
        ).all()
        r2_players = [m.white_player_id for m in matches_r2] + [m.black_player_id for m in matches_r2 if m.black_player_id]
        self.assertIn(p4.user_id, r2_players)


if __name__ == "__main__":
    unittest.main()
