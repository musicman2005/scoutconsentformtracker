from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("", response_model=list[schemas.Group])
async def list_groups(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Group).order_by(models.Group.name))
    return result.scalars().all()


@router.post("", response_model=schemas.Group, status_code=201)
async def create_group(body: schemas.GroupCreate, db: AsyncSession = Depends(get_db)):
    group = models.Group(**body.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


@router.get("/{group_id}", response_model=schemas.Group)
async def get_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(models.Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.put("/{group_id}", response_model=schemas.Group)
async def update_group(group_id: int, body: schemas.GroupUpdate, db: AsyncSession = Depends(get_db)):
    group = await db.get(models.Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    await db.commit()
    await db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=204)
async def delete_group(group_id: int, db: AsyncSession = Depends(get_db)):
    group = await db.get(models.Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    await db.delete(group)
    await db.commit()
