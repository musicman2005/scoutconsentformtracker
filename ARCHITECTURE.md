# Architecture

## Overview

ScoutGroupDocMgr is a three-tier web application:

```
Browser
  │
  ├── /portal/*  →  React SPA (guardian portal)
  └── /*         →  React SPA (admin)
       │
       │  (nginx proxies /api/* to backend)
       ▼
  FastAPI (port 8003)
       │
       ├──  PostgreSQL (internal Docker network)
       └──  /data/pdfs volume  (uploaded PDFs)
```

All three services run as Docker containers managed by Compose. The database and PDF storage persist in named Docker volumes so they survive container rebuilds.

---

## Data model

```
groups
  id, name, section, created_at

scouts
  id, first_name, last_name, date_of_birth
  group_id → groups.id
  active, created_at

guardians
  id, first_name, last_name, email, phone
  relationship_to_scout, is_primary
  scout_id → scouts.id
  password_hash          ← set when portal auth is enabled

form_templates
  id, name, description
  opensign_template_id   ← optional, for OpenSign integration
  pdf_filename           ← filename of uploaded PDF in /data/pdfs
  active, created_at

signing_requests
  id
  scout_id        → scouts.id
  guardian_id     → guardians.id
  form_template_id → form_templates.id
  status           ← pending | sent | viewed | signed | declined | expired
  opensign_document_id   ← populated when sent via OpenSign
  opensign_sign_url      ← direct signing link from OpenSign
  signature_data         ← base64 PNG of drawn signature (in-app signing)
  signed_by_name         ← name confirmed at time of portal signing
  notes
  created_at, sent_at, signed_at
```

**Key relationships:**
- A Scout belongs to one Group
- A Scout has many Guardians (typically 1–2 parents)
- A SigningRequest links one Scout + one Guardian + one FormTemplate
- Multiple SigningRequests can exist for the same scout (one per form)
- Multiple SigningRequests can be sent to different guardians for the same form

---

## API routes

All routes are under `/api/`. FastAPI generates Swagger docs at `/api/docs` (served at port 8003).

### Admin routes

```
GET    /api/groups
POST   /api/groups
PUT    /api/groups/{id}
DELETE /api/groups/{id}

GET    /api/scouts                  ?group_id=&active_only=
POST   /api/scouts
GET    /api/scouts/{id}
PUT    /api/scouts/{id}
DELETE /api/scouts/{id}
GET    /api/scouts/{id}/guardians

GET    /api/guardians
POST   /api/guardians
PUT    /api/guardians/{id}
DELETE /api/guardians/{id}
POST   /api/guardians/{id}/set-password
DELETE /api/guardians/{id}/password

GET    /api/forms
POST   /api/forms
PUT    /api/forms/{id}
DELETE /api/forms/{id}
POST   /api/forms/{id}/upload-pdf   (multipart)
DELETE /api/forms/{id}/upload-pdf
GET    /api/forms/{id}/pdf          (serves the file)

GET    /api/signing-requests
POST   /api/signing-requests
GET    /api/signing-requests/{id}
PUT    /api/signing-requests/{id}
DELETE /api/signing-requests/{id}
POST   /api/signing-requests/{id}/send          ← triggers OpenSign if enabled
POST   /api/signing-requests/{id}/remind        ← sends OpenSign reminder
POST   /api/signing-requests/{id}/mark-signed   ← manual override

POST   /api/signing-requests/webhooks/opensign  ← receives OpenSign callbacks

GET    /api/dashboard/stats
```

### Portal routes (guardian-facing)

```
GET    /api/portal/config           ← returns {auth_enabled: bool}
GET    /api/portal/guardians        ← test mode only: list all guardians
POST   /api/portal/test-login       ← test mode: {guardian_id} → JWT token
POST   /api/portal/login            ← auth mode: {email, password} → JWT token
GET    /api/portal/me?token=...     ← guardian's info + their signing requests
POST   /api/portal/sign/{id}?token= ← submit signature
```

Portal endpoints take the JWT as a `?token=` query param rather than an Authorization header, to keep the frontend simple (no interceptors needed).

---

## Frontend structure

The React app has two distinct UIs sharing the same build:

### Admin UI (`/`, `/dashboard`, `/groups`, `/scouts`, `/forms`, `/signing-requests`)

Standard sidebar layout. Uses TanStack Query for data fetching with a 30s stale time. All API calls are in `src/api.js`. Each page manages its own modal state locally.

### Guardian portal (`/portal`)

Standalone page — completely different layout, no admin sidebar. No TanStack Query (simpler axios calls). Session stored in `sessionStorage` under `scout_portal_session` (cleared when tab closes).

**Portal flow:**

```
/portal
  └── PortalApp        ← checks sessionStorage for existing session
        ├── PortalLogin  ← test mode: guardian picker
        │                  auth mode: email + password form
        └── PortalForms  ← lists pending and completed forms
              └── SignForm  ← signature pad + confirmation checkbox
```

---

## Authentication

### Admin

No authentication — the admin UI is assumed to be on a private network (home LAN). If you want to add auth, FastAPI's OAuth2 + JWT pattern is the natural fit.

### Guardian portal

JWT tokens signed with `JWT_SECRET` (HS256), 24-hour expiry. The token payload is just `{sub: guardian_id}`.

In **test mode** (`PORTAL_AUTH_ENABLED=false`), tokens are issued without any password check — the `POST /api/portal/test-login` endpoint just takes a guardian ID.

In **auth mode** (`PORTAL_AUTH_ENABLED=true`), passwords are bcrypt-hashed and stored in `guardians.password_hash`. Guardians without a password set cannot log in even in auth mode.

---

## PDF handling

Uploaded PDFs are stored in `/data/pdfs/` inside the backend container, which maps to the `pdf_data` Docker volume. Files are named with a UUID to avoid collisions.

The `GET /api/forms/{id}/pdf` endpoint streams the file via FastAPI's `FileResponse`. The nginx proxy passes this through to the browser. PDFs are served inline so browsers open them directly rather than downloading.

---

## OpenSign integration

OpenSign is an open-source e-signature platform (self-hostable). The integration is in `backend/app/services/opensign.py` and is completely optional — the app works without it.

When enabled:
1. Admin clicks **Send** on a signing request
2. Backend calls OpenSign to create a document from the form's template ID
3. OpenSign emails the guardian a signing link
4. When the guardian signs in OpenSign, it calls the webhook at `POST /api/signing-requests/webhooks/opensign`
5. The webhook updates the signing request status to `signed`

OpenSign uses Parse Server REST API conventions. Auth headers: `X-Parse-Application-Id` and `X-Parse-REST-API-Key`.

---

## Deployment

### Docker Compose services

| Service | Image | Port |
|---|---|---|
| `db` | postgres:16-alpine | internal only |
| `backend` | built from `./backend` | 8003 |
| `frontend` | built from `./frontend` (nginx) | 3003 |

### Volumes

| Volume | Purpose |
|---|---|
| `db_data` | PostgreSQL data files |
| `pdf_data` | Uploaded consent form PDFs |

### Database migrations

`init_db()` in `database.py` runs on every startup. It calls `create_all` (creates tables that don't exist) then runs a series of `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements for columns added after the initial deploy. This is safe to run repeatedly.

If you need to add a new column, add an `ALTER TABLE` line to `init_db()`. For more complex changes (rename, type change, drop), run SQL directly on the container:

```bash
docker exec -it scout-docmgr-db-1 psql -U scout -d scoutdocmgr
```

### deploy.sh

The deploy script:
1. rsyncs the project directory to TrueNAS (excluding `node_modules`, `__pycache__`, `.git`)
2. SSHs into TrueNAS and runs `docker compose up -d --build`

It uses `~/.ssh/id_truenas` as the identity file. Change the `SSH_KEY` var at the top if needed.

---

## Things to know / gotchas

- **No admin auth** — don't expose port 3003 to the internet without adding authentication
- **JWT_SECRET** — the default dev secret is in the repo; always override it in `.env` for production
- **Signature storage** — drawn signatures are stored as base64 PNG strings directly in the database; for a large deployment you'd want to move these to object storage
- **OpenSign template IDs** — you create templates in the OpenSign admin UI and paste the ID into the form template in this app; the ID format depends on your OpenSign version
- **Port 8003** is exposed externally so nginx can proxy to it; if you want to lock it down further, remove the `ports` from the backend service in `docker-compose.yml` and let nginx handle all traffic
