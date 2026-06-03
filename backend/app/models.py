from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    section = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    scouts = relationship("Scout", back_populates="group", cascade="all, delete-orphan")


class Scout(Base):
    __tablename__ = "scouts"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="SET NULL"), nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    group = relationship("Group", back_populates="scouts")
    guardians = relationship("Guardian", back_populates="scout", cascade="all, delete-orphan")
    signing_requests = relationship("SigningRequest", back_populates="scout", cascade="all, delete-orphan")


class Guardian(Base):
    __tablename__ = "guardians"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    relationship_to_scout = Column(String(100), nullable=True)
    scout_id = Column(Integer, ForeignKey("scouts.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, default=True)
    password_hash = Column(String(255), nullable=True)  # set when portal auth is enabled
    scout = relationship("Scout", back_populates="guardians")
    signing_requests = relationship("SigningRequest", back_populates="guardian")


class FormTemplate(Base):
    __tablename__ = "form_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    opensign_template_id = Column(String(255), nullable=True)
    pdf_filename = Column(String(255), nullable=True)  # uploaded PDF file
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    signing_requests = relationship("SigningRequest", back_populates="form_template")


class SigningRequest(Base):
    __tablename__ = "signing_requests"
    id = Column(Integer, primary_key=True, index=True)
    scout_id = Column(Integer, ForeignKey("scouts.id", ondelete="CASCADE"), nullable=False)
    guardian_id = Column(Integer, ForeignKey("guardians.id", ondelete="CASCADE"), nullable=False)
    form_template_id = Column(Integer, ForeignKey("form_templates.id", ondelete="CASCADE"), nullable=False)
    opensign_document_id = Column(String(255), nullable=True)
    opensign_sign_url = Column(Text, nullable=True)
    status = Column(String(50), default="pending", nullable=False)
    notes = Column(Text, nullable=True)
    signature_data = Column(Text, nullable=True)       # base64 PNG of drawn signature
    signed_by_name = Column(String(200), nullable=True)  # name confirmed at time of signing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    scout = relationship("Scout", back_populates="signing_requests")
    guardian = relationship("Guardian", back_populates="signing_requests")
    form_template = relationship("FormTemplate", back_populates="signing_requests")
