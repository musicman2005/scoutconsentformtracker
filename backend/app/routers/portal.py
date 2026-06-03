import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/portal", tags=["portal"])

PORTAL_AUTH_ENABLED = os.getenv("PORTAL_AUTH_ENABLED", "false").lower() == "true"
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _make_token(guardian_id: int) -> str:
    payload = {
        "sub": str(guardian_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def _guardian_from_token(token: str, db: AsyncSession) -> models.Guardian:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        guardian_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    guardian = await db.get(models.Guardian, guardian_id)
    if not guardian:
        raise HTTPException(status_code=401, detail="Guardian not found")
    return guardian


# ── Auth endpoints ─────────────────────────────────────────────────────────────

@router.get("/config")
async def portal_config():
    return {"auth_enabled": PORTAL_AUTH_ENABLED}


@router.get("/guardians")
async def list_guardians_for_test(db: AsyncSession = Depends(get_db)):
    """Only available in test mode — lets you pick any guardian to sign in as."""
    if PORTAL_AUTH_ENABLED:
        raise HTTPException(status_code=403, detail="Test mode is disabled")
    result = await db.execute(
        select(models.Guardian)
        .options(selectinload(models.Guardian.scout))
        .order_by(models.Guardian.last_name, models.Guardian.first_name)
    )
    guardians = result.scalars().all()
    return [
        {
            "id": g.id,
            "name": f"{g.first_name} {g.last_name}",
            "email": g.email,
            "scout": f"{g.scout.first_name} {g.scout.last_name}" if g.scout else None,
        }
        for g in guardians
    ]


@router.post("/test-login", response_model=schemas.PortalToken)
async def test_login(body: schemas.PortalTestLoginRequest, db: AsyncSession = Depends(get_db)):
    if PORTAL_AUTH_ENABLED:
        raise HTTPException(status_code=403, detail="Test mode is disabled — use /login")
    guardian = await db.get(models.Guardian, body.guardian_id)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    return schemas.PortalToken(
        access_token=_make_token(guardian.id),
        guardian_id=guardian.id,
        guardian_name=f"{guardian.first_name} {guardian.last_name}",
    )


@router.post("/login", response_model=schemas.PortalToken)
async def login(body: schemas.PortalLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Guardian).where(models.Guardian.email == body.email)
    )
    guardian = result.scalar_one_or_none()
    if not guardian or not guardian.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not pwd_context.verify(body.password, guardian.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return schemas.PortalToken(
        access_token=_make_token(guardian.id),
        guardian_id=guardian.id,
        guardian_name=f"{guardian.first_name} {guardian.last_name}",
    )


# ── Portal data endpoints ──────────────────────────────────────────────────────

@router.get("/me")
async def get_me(token: str, db: AsyncSession = Depends(get_db)):
    guardian = await _guardian_from_token(token, db)
    result = await db.execute(
        select(models.SigningRequest)
        .options(
            selectinload(models.SigningRequest.scout),
            selectinload(models.SigningRequest.form_template),
        )
        .where(models.SigningRequest.guardian_id == guardian.id)
        .order_by(models.SigningRequest.created_at.desc())
    )
    requests = result.scalars().all()
    return {
        "guardian": {
            "id": guardian.id,
            "name": f"{guardian.first_name} {guardian.last_name}",
            "email": guardian.email,
        },
        "signing_requests": [
            {
                "id": r.id,
                "status": r.status,
                "scout_name": f"{r.scout.first_name} {r.scout.last_name}" if r.scout else None,
                "form_template_id": r.form_template_id,
                "form_name": r.form_template.name if r.form_template else None,
                "form_description": r.form_template.description if r.form_template else None,
                "form_pdf": r.form_template.pdf_filename if r.form_template else None,
                "created_at": r.created_at.isoformat(),
                "signed_at": r.signed_at.isoformat() if r.signed_at else None,
                "signed_by_name": r.signed_by_name,
            }
            for r in requests
        ],
    }


@router.post("/sign/{req_id}")
async def sign_form(req_id: int, body: schemas.PortalSignRequest, token: str, db: AsyncSession = Depends(get_db)):
    guardian = await _guardian_from_token(token, db)

    req = await db.get(models.SigningRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Signing request not found")
    if req.guardian_id != guardian.id:
        raise HTTPException(status_code=403, detail="This form is not assigned to you")
    if req.status == "signed":
        raise HTTPException(status_code=400, detail="Already signed")
    if not body.confirmed:
        raise HTTPException(status_code=400, detail="You must confirm you have read the form")
    if not body.signature_data:
        raise HTTPException(status_code=400, detail="Signature is required")

    req.status = "signed"
    req.signed_at = datetime.now(timezone.utc)
    req.signature_data = body.signature_data
    req.signed_by_name = f"{guardian.first_name} {guardian.last_name}"
    await db.commit()
    return {"ok": True, "signed_at": req.signed_at.isoformat()}
