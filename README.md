# ScoutGroupDocMgr

A self-hosted web app for managing scout group consent forms and tracking digital signatures. Built for a local scout group running on a home TrueNAS server.

## What it does

- Manage scout groups, individual scouts, and their parents/guardians
- Create consent form templates (with optional PDF attachments)
- Issue signing requests to guardians and track their status
- Guardian-facing signing portal with a drawn signature pad
- Optional integration with [OpenSign](https://opensignlabs.com) for email-delivered e-signatures
- Dashboard with live completion stats

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2 (async) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Serving | nginx (frontend) + uvicorn (API) |
| Deployment | Docker Compose |

---

## Project structure

```
scout-docmgr/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI app + CORS + router wiring
│       ├── database.py      # DB engine, session, schema migrations
│       ├── models.py        # SQLAlchemy ORM models
│       ├── schemas.py       # Pydantic request/response schemas
│       ├── routers/
│       │   ├── groups.py
│       │   ├── scouts.py
│       │   ├── guardians.py
│       │   ├── forms.py         # includes PDF upload/serve
│       │   ├── signing_requests.py
│       │   ├── dashboard.py
│       │   └── portal.py        # guardian-facing signing portal API
│       └── services/
│           └── opensign.py      # OpenSign API client (optional)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── api.js               # all API calls in one place
│       ├── components/
│       │   ├── Layout.jsx       # admin sidebar layout
│       │   ├── Modal.jsx
│       │   └── StatusBadge.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Groups.jsx
│           ├── Scouts.jsx       # includes guardian management
│           ├── Forms.jsx        # includes PDF upload
│           ├── SigningRequests.jsx
│           └── portal/
│               ├── PortalApp.jsx    # portal entry point (auth state)
│               ├── PortalLayout.jsx
│               ├── PortalLogin.jsx  # test mode picker OR email/password
│               ├── PortalForms.jsx  # list of forms to sign
│               └── SignForm.jsx     # signature pad + confirmation
├── docker-compose.yml
├── .env.example
├── deploy.sh                    # rsync + SSH deploy to TrueNAS
└── seed.py                      # loads test data via the API
```

---

## Running locally (development)

### Prerequisites
- Docker Desktop
- Node.js 20+
- Python 3.12+

### 1. Start the database

```bash
docker run -d \
  --name scout-pg \
  -e POSTGRES_DB=scoutdocmgr \
  -e POSTGRES_USER=scout \
  -e POSTGRES_PASSWORD=devpass \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt

DATABASE_URL=postgresql+asyncpg://scout:devpass@localhost:5432/scoutdocmgr \
CORS_ORIGINS=http://localhost:3003 \
uvicorn app.main:app --reload --port 8003
```

API docs available at http://localhost:8003/docs

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App available at http://localhost:3003

---

## Deploying to TrueNAS

The project deploys via Docker Compose over SSH using `deploy.sh`.

### First-time setup

```bash
cp .env.example .env
# Edit .env — at minimum set POSTGRES_PASSWORD
```

```bash
bash deploy.sh
```

This rsyncs the project to `/mnt/tank/apps/scout-docmgr` on the TrueNAS host and runs `docker compose up --build`.

The deploy script uses `~/.ssh/id_truenas` as the SSH key. Change the `SSH_KEY` variable at the top of `deploy.sh` if yours is different.

### Subsequent deploys

Just run `bash deploy.sh` again. The database container is not recreated so existing data is preserved.

### TrueNAS URLs

| Service | URL |
|---|---|
| Admin app | http://192.168.10.181:3003 |
| Guardian portal | http://192.168.10.181:3003/portal |
| API (+ Swagger docs) | http://192.168.10.181:8003/docs |

---

## Environment variables

All set in `.env` (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `scoutdocmgr` | Database name |
| `POSTGRES_USER` | `scout` | Database user |
| `POSTGRES_PASSWORD` | — | **Required.** Database password |
| `TRUENAS_IP` | `192.168.10.181` | Used by deploy.sh and CORS config |
| `PORTAL_AUTH_ENABLED` | `false` | Set to `true` to require guardian login |
| `JWT_SECRET` | dev default | **Change in production.** Signs portal tokens |
| `OPENSIGN_ENABLED` | `false` | Set to `true` to enable OpenSign integration |
| `OPENSIGN_URL` | — | OpenSign instance URL |
| `OPENSIGN_APP_ID` | — | OpenSign Parse App ID |
| `OPENSIGN_API_KEY` | — | OpenSign Parse REST API key |
| `OPENSIGN_FOLDER_ID` | — | Optional folder ID for documents |

---

## Guardian signing portal

Guardians access the portal at `/portal`. There are two modes:

### Test mode (`PORTAL_AUTH_ENABLED=false`)

A searchable list of all guardians is shown. Click any name to sign in as them instantly — useful for testing and demos. No passwords needed.

### Auth mode (`PORTAL_AUTH_ENABLED=true`)

Guardians log in with their email address and a password set by the admin.

To set a guardian's password: go to **Scouts → click a scout's name → guardian panel → Set Password**.

### Signing flow

1. Guardian logs in and sees their list of pending consent forms
2. They can view the attached PDF if one has been uploaded
3. They tick a confirmation checkbox and draw their signature
4. The signature (base64 PNG) is stored against the signing request and status changes to **Signed**

---

## OpenSign integration

OpenSign is an open-source e-signature platform. When enabled, hitting **Send** on a signing request will:

1. Create a document in OpenSign using the form's template ID
2. Email the guardian a signing link directly
3. Track completion back via a webhook

**Webhook endpoint:** `POST /api/signing-requests/webhooks/opensign`
Configure this URL in your OpenSign instance settings.

Without OpenSign, forms can still be marked as signed manually (useful for paper forms collected in person).

---

## Seeding test data

`seed.py` loads 4 groups × 30 scouts with guardians and sample signing requests via the API. Requires the `httpx` Python package.

```bash
# Run inside the backend container (easiest)
docker cp seed.py scout-docmgr-backend-1:/app/seed.py
docker exec scout-docmgr-backend-1 python /app/seed.py
```

---

## Database migrations

Schema changes are applied automatically on startup via idempotent `ALTER TABLE IF NOT EXISTS` statements in `database.py → init_db()`. No separate migration runner needed for new nullable columns.

For breaking changes (dropping columns, changing types), you'd need to run SQL manually or introduce Alembic properly.

---

## GitHub

https://github.com/musicman2005/scoutconsentformtracker
