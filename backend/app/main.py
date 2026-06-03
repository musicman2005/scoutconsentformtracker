from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.database import init_db
from app.routers import groups, scouts, guardians, forms, signing_requests, dashboard, portal

app = FastAPI(title="ScoutGroupDocMgr API", version="1.0.0")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3003,http://192.168.10.181:3003").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(groups.router)
app.include_router(scouts.router)
app.include_router(guardians.router)
app.include_router(forms.router)
app.include_router(signing_requests.router)
app.include_router(dashboard.router)
app.include_router(portal.router)


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "ScoutGroupDocMgr"}
