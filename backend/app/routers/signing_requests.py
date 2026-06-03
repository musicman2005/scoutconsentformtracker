from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from app.database import get_db
from app import models, schemas
from app.services.opensign import opensign

router = APIRouter(prefix="/api/signing-requests", tags=["signing-requests"])


async def _load_request(db: AsyncSession, req_id: int) -> models.SigningRequest:
    result = await db.execute(
        select(models.SigningRequest)
        .options(
            selectinload(models.SigningRequest.scout),
            selectinload(models.SigningRequest.guardian),
            selectinload(models.SigningRequest.form_template),
        )
        .where(models.SigningRequest.id == req_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Signing request not found")
    return req


@router.get("", response_model=list[schemas.SigningRequestDetail])
async def list_signing_requests(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.SigningRequest)
        .options(
            selectinload(models.SigningRequest.scout),
            selectinload(models.SigningRequest.guardian),
            selectinload(models.SigningRequest.form_template),
        )
        .order_by(models.SigningRequest.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=schemas.SigningRequest, status_code=201)
async def create_signing_request(body: schemas.SigningRequestCreate, db: AsyncSession = Depends(get_db)):
    scout = await db.get(models.Scout, body.scout_id)
    if not scout:
        raise HTTPException(status_code=404, detail="Scout not found")
    guardian = await db.get(models.Guardian, body.guardian_id)
    if not guardian:
        raise HTTPException(status_code=404, detail="Guardian not found")
    form = await db.get(models.FormTemplate, body.form_template_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form template not found")

    req = models.SigningRequest(**body.model_dump(), status="pending")
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


@router.get("/{req_id}", response_model=schemas.SigningRequestDetail)
async def get_signing_request(req_id: int, db: AsyncSession = Depends(get_db)):
    return await _load_request(db, req_id)


@router.put("/{req_id}", response_model=schemas.SigningRequest)
async def update_signing_request(req_id: int, body: schemas.SigningRequestUpdate, db: AsyncSession = Depends(get_db)):
    req = await db.get(models.SigningRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Signing request not found")
    updates = body.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] == "signed" and not req.signed_at:
        req.signed_at = datetime.now(timezone.utc)
    for field, value in updates.items():
        setattr(req, field, value)
    await db.commit()
    await db.refresh(req)
    return req


@router.post("/{req_id}/send", response_model=schemas.SigningRequestDetail)
async def send_signing_request(req_id: int, db: AsyncSession = Depends(get_db)):
    """Send the consent form to the guardian via OpenSign."""
    req = await _load_request(db, req_id)
    if req.status not in ("pending", "sent"):
        raise HTTPException(status_code=400, detail=f"Cannot send a request with status '{req.status}'")

    if opensign.enabled:
        try:
            result = await opensign.create_signing_request(
                document_name=f"{req.form_template.name} — {req.scout.first_name} {req.scout.last_name}",
                signer_name=f"{req.guardian.first_name} {req.guardian.last_name}",
                signer_email=req.guardian.email,
                template_id=req.form_template.opensign_template_id,
            )
            req.opensign_document_id = result["document_id"]
            req.opensign_sign_url = result["sign_url"]
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"OpenSign error: {exc}")

    req.status = "sent"
    req.sent_at = datetime.now(timezone.utc)
    await db.commit()
    return await _load_request(db, req_id)


@router.post("/{req_id}/remind", response_model=schemas.SigningRequestDetail)
async def send_reminder(req_id: int, db: AsyncSession = Depends(get_db)):
    req = await _load_request(db, req_id)
    if req.status != "sent":
        raise HTTPException(status_code=400, detail="Can only remind on sent requests")
    if opensign.enabled and req.opensign_document_id:
        try:
            await opensign.send_reminder(req.opensign_document_id)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"OpenSign error: {exc}")
    return req


@router.post("/{req_id}/mark-signed", response_model=schemas.SigningRequest)
async def mark_signed(req_id: int, db: AsyncSession = Depends(get_db)):
    """Manually mark a consent form as signed (for in-person paper signatures)."""
    req = await db.get(models.SigningRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Signing request not found")
    req.status = "signed"
    req.signed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    return req


@router.delete("/{req_id}", status_code=204)
async def delete_signing_request(req_id: int, db: AsyncSession = Depends(get_db)):
    req = await db.get(models.SigningRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Signing request not found")
    await db.delete(req)
    await db.commit()


@router.post("/webhooks/opensign")
async def opensign_webhook(payload: dict, db: AsyncSession = Depends(get_db)):
    """Receive completion webhooks from OpenSign."""
    doc_id = payload.get("objectId") or payload.get("docId")
    if not doc_id:
        return {"ok": True}

    result = await db.execute(
        select(models.SigningRequest).where(models.SigningRequest.opensign_document_id == doc_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        return {"ok": True}

    event = payload.get("event", "")
    if event == "completed" or payload.get("IsCompleted"):
        req.status = "signed"
        req.signed_at = datetime.now(timezone.utc)
    elif event == "declined" or payload.get("IsDeclined"):
        req.status = "declined"

    await db.commit()
    return {"ok": True}
