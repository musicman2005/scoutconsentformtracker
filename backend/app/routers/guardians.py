from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.database import get_db
from app import models, schemas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/api/guardians", tags=["guardians"])


@router.get("", response_model=list[schemas.Guardian])
async def list_guardians(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Guardian).order_by(models.Guardian.last_name, models.Guardian.first_name)
    )
    return result.scalars().all()


@router.post("", response_model=schemas.Guardian, status_code=201)
async def create_guardian(body: schemas.GuardianCreate, db: AsyncSession = Depends(get_db)):
    scout = await db.get(models.Scout, body.scout_id)
    if not scout:
        raise HTTPException(status_code=404, detail="Scout not found")
    guardian = models.Guardian(**body.model_dump())
    db.add(guardian)
    await db.commit()
    await db.refresh(guardian)
    return guardian


@router.get("/{guardian_id}", response_model=schemas.Guardian)
async def get_guardian(guardian_id: int, db: AsyncSession = Depends(get_db)):
    guardian = await db.get(models.Guardian, guardian_id)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    return guardian


@router.put("/{guardian_id}", response_model=schemas.Guardian)
async def update_guardian(guardian_id: int, body: schemas.GuardianUpdate, db: AsyncSession = Depends(get_db)):
    guardian = await db.get(models.Guardian, guardian_id)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(guardian, field, value)
    await db.commit()
    await db.refresh(guardian)
    return guardian


@router.delete("/{guardian_id}", status_code=204)
async def delete_guardian(guardian_id: int, db: AsyncSession = Depends(get_db)):
    guardian = await db.get(models.Guardian, guardian_id)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    await db.delete(guardian)
    await db.commit()


@router.post("/{guardian_id}/set-password", response_model=schemas.Guardian)
async def set_password(guardian_id: int, body: schemas.SetPasswordRequest, db: AsyncSession = Depends(get_db)):
    guardian = await db.get(models.Guardian, guardian_id)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    guardian.password_hash = pwd_context.hash(body.password)
    await db.commit()
    await db.refresh(guardian)
    return guardian


@router.delete("/{guardian_id}/password", response_model=schemas.Guardian)
async def clear_password(guardian_id: int, db: AsyncSession = Depends(get_db)):
    guardian = await db.get(models.Guardian, guardian_id)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    guardian.password_hash = None
    await db.commit()
    await db.refresh(guardian)
    return guardian
