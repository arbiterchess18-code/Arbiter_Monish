import unittest
import sys
from pathlib import Path
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend root to path so we can import app modules directly
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.database import Base
from app import models
from app.schemas.registration import BulkParticipantImport
from app.api.v1.endpoints.registrations import bulk_import_participants


class TestTRFImport(unittest.TestCase):
    def setUp(self):
        # Set up in-memory database
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed Arbiter Role
        self.arbiter_role = models.Role(role_name="ARBITER", description="Arbiter role")
        self.db.add(self.arbiter_role)
        self.db.flush()

        # Seed Current User (Arbiter)
        self.arbiter = models.User(
            username="arbiter1",
            email="arbiter@example.com",
            hashed_password="pw",
            is_active=True,
            is_verified=True
        )
        self.db.add(self.arbiter)
        self.db.flush()

        self.user_role = models.UserRole(
            user_id=self.arbiter.user_id,
            role_id=self.arbiter_role.role_id
        )
        self.db.add(self.user_role)

        # Seed Tournament
        self.tournament = models.Tournament(
            created_by=self.arbiter.user_id,
            tournament_name="Chaduranga Open 2026",
            start_date=date(2026, 6, 20),
            pairing_system="Swiss",
            rounds=5,
            status="upcoming"
        )
        self.db.add(self.tournament)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_bulk_import_with_fide_id_and_seed(self):
        # Construct participant import payload
        participant_a = BulkParticipantImport.ParticipantData(
            player_name="Magnus Carlsen",
            player_email="magnus@carlsen.com",
            player_rating=2850,
            player_fide_id="1503014",
            seed=1
        )
        participant_b = BulkParticipantImport.ParticipantData(
            player_name="Hikaru Nakamura",
            player_email="hikaru@nakamura.com",
            player_rating=2780,
            player_fide_id="2016186",
            seed=2
        )
        import_payload = BulkParticipantImport(
            participants=[participant_a, participant_b]
        )

        # Invoke bulk import endpoint handler
        response = bulk_import_participants(
            tournament_id=self.tournament.tournament_id,
            import_data=import_payload,
            db=self.db,
            current_user=self.arbiter
        )

        self.assertEqual(len(response.imported), 2)
        self.assertEqual(response.successful, 2)

        # Verify Magnus was created correctly with FIDE ID and seed
        magnus_user = self.db.query(models.User).filter(
            models.User.email == "magnus@carlsen.com"
        ).first()
        self.assertIsNotNone(magnus_user)
        self.assertEqual(magnus_user.fide_id, "1503014")
        self.assertEqual(magnus_user.fide_rating, 2850)

        magnus_reg = self.db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == self.tournament.tournament_id,
            models.TournamentRegistration.user_id == magnus_user.user_id
        ).first()
        self.assertIsNotNone(magnus_reg)
        self.assertEqual(magnus_reg.seed, 1)
        self.assertEqual(magnus_reg.status, "approved")

        # Verify Hikaru Nakamura's seed and FIDE ID
        hikaru_user = self.db.query(models.User).filter(
            models.User.email == "hikaru@nakamura.com"
        ).first()
        hikaru_reg = self.db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == self.tournament.tournament_id,
            models.TournamentRegistration.user_id == hikaru_user.user_id
        ).first()
        self.assertEqual(hikaru_user.fide_id, "2016186")
        self.assertEqual(hikaru_reg.seed, 2)


if __name__ == "__main__":
    unittest.main()
