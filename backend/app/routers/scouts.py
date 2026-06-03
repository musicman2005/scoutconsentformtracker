from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app import models, schemas
from typing import Optional

router = APIRouter(prefix="/api/scouts", tags=["scouts"])


@router.get("", response_model=list[schemas.ScoutWithGroup])
async def list_scouts(
    group_id: Optional[int] = Query(None),
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    q = select(models.Scout).options(selectinload(models.Scout.group))
    if group_id is not None:
        q = q.where(models.Scout.group_id == group_id)
    if active_only:
        q = q.where(models.Scout.active == True)
    q = q.order_by(models.Scout.last_name, models.Scout.first_name)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=schemas.Scout, status_code=201)
async def create_scout(body: schemas.ScoutCreate, db: AsyncSession = Depends(get_db)):
    if body.group_id:
        group = await db.get(models.Group, body.group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
    scout = models.Scout(**body.model_dump())
    db.add(scout)
    await db.commit()
    await db.refresh(scout)
    return scout


@router.get("/{scout_id}", response_model=schemas.ScoutWithGroup)
async def get_scout(scout_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Scout)
        .options(selectinload(models.Scout.group), selectinload(models.Scout.guardians))
        .where(models.Scout.id == scout_id)
    )
    scout = result.scalar_one_or_none()
    if not scout:
        raise HTTPException(status_code=404, detail="Scout not found")
    return scout


@router.put("/{scout_id}", response_model=schemas.Scout)
async def update_scout(scout_id: int, body: schemas.ScoutUpdate, db: AsyncSession = Depends(get_db)):
    scout = await db.get(models.Scout, scout_id)
    if not scout:
        raise HTTPException(status_code=404, detail="Scout not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(scout, field, value)
    await db.commit()
    await db.refresh(scout)
    return scout


@router.delete("/{scout_id}", status_code=204)
async def delete_scout(scout_id: int, db: AsyncSession = Depends(get_db)):
    scout = await db.get(models.Scout, scout_id)
    if not scout:
        raise HTTPException(status_code=404, detail="Scout not found")
    await db.delete(scout)
    await db.commit()


@router.get("/{scout_id}/guardians", response_model=list[schemas.Guardian])
async def get_scout_guardians(scout_id: int, db: AsyncSession = Depends(get_db)):
    scout = await db.get(models.Scout, scout_id)
    if not scout:
        raise HTTPException(status_code=404, detail="Scout not found")
    result = await db.execute(
        select(models.Guardian).where(models.Guardian.scout_id == scout_id)
    )
    return result.scalars().all()
