from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from .... import models
from ....database import get_db
from ....core.security import get_current_user

router = APIRouter()

def require_admin(current_user: models.User = Depends(get_current_user)):
    roles = [ur.role.role_name.upper() for ur in current_user.user_roles]
    if "SUPER_ADMIN" not in roles and "ADMIN" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

class WhitelistItem(BaseModel):
    fide_id: str

@router.get("/arbiters/whitelist")
def get_whitelist(
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin)
):
    items = db.query(models.VerifiedArbiter).order_by(models.VerifiedArbiter.added_at.desc()).all()
    return [
        {
            "id": item.id, 
            "fide_id": item.fide_id, 
            "added_at": item.added_at.isoformat() if item.added_at else None,
            "added_by": item.added_by
        } 
        for item in items
    ]

@router.post("/arbiters/whitelist")
def add_to_whitelist(
    item: WhitelistItem,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin)
):
    fide_id = item.fide_id.strip()
    if not fide_id:
        raise HTTPException(status_code=400, detail="FIDE ID is required")
        
    existing = db.query(models.VerifiedArbiter).filter(models.VerifiedArbiter.fide_id == fide_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="FIDE ID already in whitelist")
        
    new_entry = models.VerifiedArbiter(fide_id=fide_id, added_by=admin_user.user_id)
    db.add(new_entry)
    db.commit()
    return {"message": "FIDE ID added to whitelist successfully"}

@router.delete("/arbiters/whitelist/{fide_id}")
def remove_from_whitelist(
    fide_id: str,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin)
):
    fide_id = fide_id.strip()
    existing = db.query(models.VerifiedArbiter).filter(models.VerifiedArbiter.fide_id == fide_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="FIDE ID not found in whitelist")
        
    db.delete(existing)
    db.commit()
    return {"message": "FIDE ID removed from whitelist"}
