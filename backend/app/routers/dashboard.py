import asyncio
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    scouts_total = await db.scalar(select(func.count()).select_from(models.Scout))
    scouts_active = await db.scalar(
        select(func.count()).select_from(models.Scout).where(models.Scout.active == True)
    )
    forms_total = await db.scalar(select(func.count()).select_from(models.FormTemplate))
    reqs_total = await db.scalar(select(func.count()).select_from(models.SigningRequest))

    def status_count(status: str):
        return db.scalar(
            select(func.count())
            .select_from(models.SigningRequest)
            .where(models.SigningRequest.status == status)
        )

    pending, sent, signed, declined = await asyncio.gather(
        status_count("pending"),
        status_count("sent"),
        status_count("signed"),
        status_count("declined"),
    )

    return schemas.DashboardStats(
        total_scouts=scouts_total or 0,
        active_scouts=scouts_active or 0,
        total_forms=forms_total or 0,
        total_signing_requests=reqs_total or 0,
        pending=pending or 0,
        sent=sent or 0,
        signed=signed or 0,
        declined=declined or 0,
    )
