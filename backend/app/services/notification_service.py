"""
Notification Service
--------------------
Clean service layer — no route logic here.
All DB operations for the notifications table live in this module.
"""
from sqlalchemy.orm import Session
from .. import models


# ── Notification type constants (use these everywhere to avoid typos)
class NotifType:
    RESULT_UPDATE = "RESULT_UPDATE"
    ROUND_PAIRING = "ROUND_PAIRING"
    REGISTRATION_APPROVED = "REGISTRATION_APPROVED"
    REGISTRATION_REJECTED = "REGISTRATION_REJECTED"


def create_notification(
    db: Session,
    *,
    user_id: int,
    notif_type: str,
    message: str,
    tournament_id: int | None = None,
) -> models.Notification:
    """Insert a single notification row. Call db.commit() after bulk inserts."""
    notif = models.Notification(
        user_id=user_id,
        tournament_id=tournament_id,
        type=notif_type,
        message=message,
        is_read=False,
    )
    db.add(notif)
    return notif


def notify_match_result(
    db: Session,
    *,
    match: models.Match,
    tournament: models.Tournament,
    result: str,
) -> None:
    """
    Creates exactly 2 notifications (one per player) when a result is set.
    Skips BYE matches — the black_player_id is None.
    Safe to call multiple times: it replaces, not accumulates, because the
    arbiter is updating the same match_id.
    """
    tournament_name = tournament.tournament_name
    board = match.board_number

    result_map = {
        "1-0":     ("Won", "Lost"),
        "0-1":     ("Lost", "Won"),
        "1/2-1/2": ("Drew", "Drew"),
    }
    white_outcome, black_outcome = result_map.get(result, ("—", "—"))

    if match.white_player_id:
        create_notification(
            db,
            user_id=match.white_player_id,
            notif_type=NotifType.RESULT_UPDATE,
            message=f"Board {board} result in {tournament_name}: You {white_outcome} ({result}).",
            tournament_id=tournament.tournament_id,
        )

    if match.black_player_id:
        create_notification(
            db,
            user_id=match.black_player_id,
            notif_type=NotifType.RESULT_UPDATE,
            message=f"Board {board} result in {tournament_name}: You {black_outcome} ({result}).",
            tournament_id=tournament.tournament_id,
        )


def notify_round_pairing(
    db: Session,
    *,
    tournament: models.Tournament,
    round_number: int,
    player_ids: list[int],
) -> None:
    """Bulk-notify all players when a new round is generated."""
    for uid in player_ids:
        create_notification(
            db,
            user_id=uid,
            notif_type=NotifType.ROUND_PAIRING,
            message=f"Round {round_number} pairings are ready for {tournament.tournament_name}.",
            tournament_id=tournament.tournament_id,
        )


def notify_registration_status(
    db: Session,
    *,
    user_id: int,
    tournament_name: str,
    tournament_id: int,
    status: str,
) -> None:
    """Notify a player when their registration status changes (Approved/Rejected)."""
    msg = f"Your registration for {tournament_name} has been {status}."
    notif_type = NotifType.REGISTRATION_APPROVED if status == "approved" else NotifType.REGISTRATION_REJECTED

    create_notification(
        db,
        user_id=user_id,
        notif_type=notif_type,
        message=msg,
        tournament_id=tournament_id,
    )


def get_user_notifications(
    db: Session,
    *,
    user_id: int,
    limit: int = 50,
) -> list[models.Notification]:
    """
    Returns the latest `limit` notifications for the requesting user only.
    Uses the idx_notifications_user_id + idx_notifications_created_at indexes.
    """
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user_id)
        .order_by(models.Notification.created_at.desc())
        .limit(limit)
        .all()
    )


def get_unread_count(db: Session, *, user_id: int) -> int:
    return (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user_id,
            models.Notification.is_read == False,
        )
        .count()
    )


def mark_as_read(
    db: Session,
    *,
    notification_id: int,
    user_id: int,
) -> models.Notification | None:
    """
    Marks a single notification as read.
    Enforces user_id ownership — users cannot mark other users' notifications.
    """
    notif = (
        db.query(models.Notification)
        .filter(
            models.Notification.notification_id == notification_id,
            models.Notification.user_id == user_id,  # IDOR protection
        )
        .first()
    )
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif


def mark_all_as_read(db: Session, *, user_id: int) -> int:
    """Marks all unread notifications as read for a user. Returns count updated."""
    updated = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == user_id,
            models.Notification.is_read == False,
        )
        .update({"is_read": True})
    )
    db.commit()
    return updated
