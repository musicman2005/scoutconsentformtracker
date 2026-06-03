from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://scout:scout@db:5432/scoutdocmgr")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        from app import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
        # Idempotent migrations for columns added after initial deploy
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE guardians ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE signing_requests ADD COLUMN IF NOT EXISTS signature_data TEXT"))
        await conn.execute(text("ALTER TABLE signing_requests ADD COLUMN IF NOT EXISTS signed_by_name VARCHAR(200)"))
        await conn.execute(text("ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS pdf_filename VARCHAR(255)"))
