from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .... import models
from ....database import get_db
from ....core.security import get_current_user
from ....schemas.notification import NotificationOut
from ....services.notification_service import (
    get_user_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns the latest 50 notifications for the logged-in user.
    Filtered strictly by current_user.user_id — no user can see another's data.
    """
    return get_user_notifications(db, user_id=current_user.user_id)


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lightweight endpoint for badge polling — just returns an integer."""
    count = get_unread_count(db, user_id=current_user.user_id)
    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Marks a single notification as read.
    Returns 404 if it doesn't belong to the current user (IDOR protection).
    """
    notif = mark_as_read(
        db,
        notification_id=notification_id,
        user_id=current_user.user_id,
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return notif


@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Marks all of the current user's unread notifications as read."""
    count = mark_all_as_read(db, user_id=current_user.user_id)
    return {"marked_read": count}
