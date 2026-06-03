import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/forms", tags=["forms"])

PDF_DIR = os.getenv("PDF_DIR", "/data/pdfs")
os.makedirs(PDF_DIR, exist_ok=True)


@router.get("", response_model=list[schemas.FormTemplate])
async def list_forms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.FormTemplate).order_by(models.FormTemplate.name))
    return result.scalars().all()


@router.post("", response_model=schemas.FormTemplate, status_code=201)
async def create_form(body: schemas.FormTemplateCreate, db: AsyncSession = Depends(get_db)):
    form = models.FormTemplate(**body.model_dump())
    db.add(form)
    await db.commit()
    await db.refresh(form)
    return form


@router.get("/{form_id}", response_model=schemas.FormTemplate)
async def get_form(form_id: int, db: AsyncSession = Depends(get_db)):
    form = await db.get(models.FormTemplate, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.put("/{form_id}", response_model=schemas.FormTemplate)
async def update_form(form_id: int, body: schemas.FormTemplateUpdate, db: AsyncSession = Depends(get_db)):
    form = await db.get(models.FormTemplate, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(form, field, value)
    await db.commit()
    await db.refresh(form)
    return form


@router.delete("/{form_id}", status_code=204)
async def delete_form(form_id: int, db: AsyncSession = Depends(get_db)):
    form = await db.get(models.FormTemplate, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if form.pdf_filename:
        path = os.path.join(PDF_DIR, form.pdf_filename)
        if os.path.exists(path):
            os.remove(path)
    await db.delete(form)
    await db.commit()


@router.post("/{form_id}/upload-pdf", response_model=schemas.FormTemplate)
async def upload_pdf(form_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    form = await db.get(models.FormTemplate, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Remove old PDF if present
    if form.pdf_filename:
        old_path = os.path.join(PDF_DIR, form.pdf_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"{uuid.uuid4()}.pdf"
    dest = os.path.join(PDF_DIR, filename)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    form.pdf_filename = filename
    await db.commit()
    await db.refresh(form)
    return form


@router.delete("/{form_id}/upload-pdf", response_model=schemas.FormTemplate)
async def remove_pdf(form_id: int, db: AsyncSession = Depends(get_db)):
    form = await db.get(models.FormTemplate, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if form.pdf_filename:
        path = os.path.join(PDF_DIR, form.pdf_filename)
        if os.path.exists(path):
            os.remove(path)
        form.pdf_filename = None
        await db.commit()
        await db.refresh(form)
    return form


@router.get("/{form_id}/pdf")
async def serve_pdf(form_id: int, db: AsyncSession = Depends(get_db)):
    form = await db.get(models.FormTemplate, form_id)
    if not form or not form.pdf_filename:
        raise HTTPException(status_code=404, detail="No PDF attached to this form")
    path = os.path.join(PDF_DIR, form.pdf_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    return FileResponse(path, media_type="application/pdf", filename=f"{form.name}.pdf")
