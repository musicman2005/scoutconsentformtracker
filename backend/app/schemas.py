from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


# ── Group ──────────────────────────────────────────────────────────────────────

class GroupBase(BaseModel):
    name: str
    section: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    section: Optional[str] = None

class Group(GroupBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Scout ──────────────────────────────────────────────────────────────────────

class ScoutBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    group_id: Optional[int] = None
    active: bool = True

class ScoutCreate(ScoutBase):
    pass

class ScoutUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    group_id: Optional[int] = None
    active: Optional[bool] = None

class Scout(ScoutBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}

class ScoutWithGroup(Scout):
    group: Optional[Group] = None


# ── Guardian ───────────────────────────────────────────────────────────────────

class GuardianBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    relationship_to_scout: Optional[str] = None
    scout_id: int
    is_primary: bool = True

class GuardianCreate(GuardianBase):
    pass

class GuardianUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    relationship_to_scout: Optional[str] = None
    is_primary: Optional[bool] = None

class Guardian(GuardianBase):
    id: int
    has_password: bool = False
    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kw):
        data = super().model_validate(obj, **kw)
        if hasattr(obj, "password_hash"):
            data.has_password = bool(obj.password_hash)
        return data

class SetPasswordRequest(BaseModel):
    password: str


# ── FormTemplate ───────────────────────────────────────────────────────────────

class FormTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    opensign_template_id: Optional[str] = None
    active: bool = True

class FormTemplateCreate(FormTemplateBase):
    pass

class FormTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    opensign_template_id: Optional[str] = None
    active: Optional[bool] = None

class FormTemplate(FormTemplateBase):
    id: int
    pdf_filename: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── SigningRequest ─────────────────────────────────────────────────────────────

class SigningRequestBase(BaseModel):
    scout_id: int
    guardian_id: int
    form_template_id: int
    notes: Optional[str] = None

class SigningRequestCreate(SigningRequestBase):
    pass

class SigningRequestUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    opensign_document_id: Optional[str] = None
    opensign_sign_url: Optional[str] = None

class SigningRequest(SigningRequestBase):
    id: int
    status: str
    opensign_document_id: Optional[str] = None
    opensign_sign_url: Optional[str] = None
    signed_by_name: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class SigningRequestDetail(SigningRequest):
    scout: Optional[Scout] = None
    guardian: Optional[Guardian] = None
    form_template: Optional[FormTemplate] = None


# ── Portal ─────────────────────────────────────────────────────────────────────

class PortalLoginRequest(BaseModel):
    email: str
    password: str

class PortalTestLoginRequest(BaseModel):
    guardian_id: int

class PortalToken(BaseModel):
    access_token: str
    guardian_id: int
    guardian_name: str

class PortalSignRequest(BaseModel):
    signature_data: str   # base64 PNG
    confirmed: bool


# ── Dashboard ──────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_scouts: int
    active_scouts: int
    total_forms: int
    total_signing_requests: int
    pending: int
    sent: int
    signed: int
    declined: int
