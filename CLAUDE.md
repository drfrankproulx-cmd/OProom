# CLAUDE.md — OProom AI Assistant Guide

## Project Overview

OProom is a full-stack healthcare platform for managing surgical residency programs and operating room scheduling. It combines a FastAPI backend with a React frontend and supports native iOS deployment via Capacitor.

**Domain**: Surgical scheduling, patient management, residency program coordination.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.8+ / FastAPI 0.110.1 |
| Database | MongoDB (pymongo 4.5.0, motor 3.3.1 for async) |
| Frontend | React 19 / JavaScript (JSX) |
| Build Tool | Craco 7.1.0 (wraps Create React App) |
| UI Components | shadcn/ui (Radix primitives + Tailwind CSS 3.4) |
| Mobile | Capacitor 6.1.2 (iOS) + PWA |
| Package Manager | Yarn 1.22.22 |
| Auth | JWT (PyJWT) + bcrypt |
| Email | SMTP (Gmail) + iCalendar |
| Google APIs | Calendar, Gmail, People (OAuth 2.0) |

## Repository Structure

```
/app/
├── backend/
│   ├── server.py                  # FastAPI app — all REST endpoints (~1600 lines)
│   ├── google_integration.py      # Google OAuth, Gmail, Calendar helpers
│   ├── cpt_codes.json             # Medical CPT procedure codes (200+ codes)
│   ├── requirements.txt           # Python dependencies
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── App.js                 # Root component (auth gate → dashboard)
│   │   ├── index.js               # React DOM entry
│   │   ├── index.css              # Global CSS theme
│   │   ├── components/            # Feature components
│   │   │   ├── ui/                # shadcn/ui primitives (30+ components)
│   │   │   ├── patient-status/    # Patient workflow components
│   │   │   └── surgery-timeline/  # Surgery timeline visualization
│   │   ├── hooks/                 # Custom hooks
│   │   ├── utils/                 # Utilities (CPT codes, native features)
│   │   └── lib/                   # Helpers (cn utility)
│   ├── public/                    # Static assets, PWA manifest, service worker
│   ├── package.json
│   ├── capacitor.config.json      # iOS native config
│   └── tailwind.config.js         # Tailwind theme
├── memory/
│   └── PRD.md                     # Product requirements document
└── test_reports/                  # pytest results, iteration metadata
```

## Common Commands

### Backend

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Start backend server (default port 8001)
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Run backend tests
cd backend && pytest tests/ -v
```

### Frontend

```bash
# Install dependencies
cd frontend && yarn install

# Start dev server (port 3000)
cd frontend && yarn start

# Production build
cd frontend && yarn build

# iOS build pipeline
cd frontend && yarn ios          # build + cap sync + open Xcode
cd frontend && yarn cap:sync     # sync web build to native
```

## Architecture & Key Patterns

### Backend (server.py)

- **Single-file API**: All 50+ REST endpoints live in `backend/server.py`
- **Endpoint prefix**: All API routes start with `/api/`
- **Auth pattern**: JWT Bearer tokens via `HTTPBearer`. The `get_current_user` dependency validates tokens
- **MongoDB collections**: `users`, `patients`, `archived_patients`, `schedules`, `tasks`, `conferences`, `residents`, `attendings`, `notifications`
- **Pydantic models**: Request/response validation via Pydantic `BaseModel` classes
- **Google integration**: Separated into `google_integration.py`

### Frontend

- **Entry point**: `App.js` performs token validation on mount, renders `AuthPage` or `AppleDashboard`
- **State management**: React Context API + `localStorage` for auth tokens
- **API calls**: `fetch` with Bearer token from `localStorage`. Backend URL from `REACT_APP_BACKEND_URL`
- **UI components**: shadcn/ui pattern — primitives in `src/components/ui/`, composed in feature components
- **Path alias**: `@/` maps to `src/`
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Icons**: Lucide React throughout

### Patient Status Workflow

Patients flow through 5 states: `pending` → `confirmed` → `deficient` (optional) → `in_or` → `completed` → `archived`. Auto-archival runs after configurable delay (default 48 hours).

### Mobile / PWA

- Capacitor wraps the React build for iOS native (Face ID, push notifications, haptics, camera)
- PWA with service worker and manifest for web install

## Database Schema (Key Collections)

### patients
```
mrn, patient_name, dob, diagnosis, procedures, procedure_code,
status (pending|confirmed|deficient|in_or|completed|archived),
prep_checklist { xrays, lab_tests, insurance_approval, medical_optimization },
comments[], activity_log[],
created_at, updated_at, created_by, updated_by
```

### users
```
email, hashed_password, full_name, role (resident|attending|admin),
settings{}, google_tokens{}
```

## Environment Variables

### Backend (required)
```
MONGO_URL=mongodb://localhost:27017/or_scheduler
JWT_SECRET=<secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Backend (optional — email/Google)
```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<email>
SMTP_PASSWORD=<app-password>
EMAIL_FROM=<email>
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_REDIRECT_URI=https://orchedule.preview.emergentagent.com/api/google/callback
AUTO_ARCHIVE_DELAY_HOURS=48
```

### Frontend
```
REACT_APP_BACKEND_URL=https://orchedule.preview.emergentagent.com
```

## API Endpoint Reference (Key Routes)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Validate token, get user |
| GET/POST | `/api/patients` | List / create patients |
| GET/PUT/DELETE | `/api/patients/{mrn}` | Get / update / delete patient |
| PATCH | `/api/patients/{mrn}/checklist` | Update prep checklist |
| POST | `/api/patients/{mrn}/send-to-or` | Move patient to OR |
| POST | `/api/patients/{mrn}/mark-complete` | Mark surgery complete |
| POST | `/api/patients/{mrn}/archive` | Archive patient |
| GET/POST | `/api/schedules` | List / create schedules |
| GET/POST | `/api/tasks` | List / create tasks |
| GET/POST | `/api/residents` | List / create residents |
| GET/POST | `/api/attendings` | List / create attendings |
| GET | `/api/cpt-codes/search` | Search CPT codes |
| GET | `/api/cpt-codes/favorites` | Get favorite CPT codes |
| GET | `/api/google/auth-url` | Start Google OAuth |
| GET | `/api/google/callback` | OAuth callback |
| GET | `/api/google/status` | Check Google connection |
| GET | `/api/health` | Health check |

## Key Files to Understand

| File | Why It Matters |
| --- | --- |
| `backend/server.py` | The entire backend API — read this first |
| `backend/google_integration.py` | All Google service integrations |
| `backend/cpt_codes.json` | CPT code database (maxillofacial procedures) |
| `frontend/src/App.js` | Auth flow and app entry point |
| `frontend/src/components/AppleDashboard.jsx` | Main dashboard (primary UI after login) |
| `frontend/src/components/AuthPage.jsx` | Login/registration UI |
| `frontend/src/components/Settings.jsx` | User settings, Google integration |
| `frontend/src/components/Patients.jsx` | Patient CRUD operations |
| `frontend/src/components/patient-status/` | Patient workflow components |
| `frontend/src/index.css` | Full design system (CSS custom properties) |

## Design System

- **Primary palette**: Healthcare teal/green tones with blue accents
- **Color system**: HSL via CSS custom properties (`--primary`, `--background`, etc.)
- **Fonts**: Inter (body), Manrope (headings)
- **Dark mode**: Class-based (`darkMode: ["class"]`)
- **Radius**: CSS variable `--radius` (default 0.5rem)

## Warnings & Pitfalls

- `server.py` is a monolith — all endpoints in one file. Take care with large edits.
- CORS is fully open (`allow_origins=["*"]`) — acceptable for development, not production.
- JWT secret has a fallback default — must be overridden in production.
- Tests are integration tests requiring a live backend + MongoDB instance.
- The frontend uses JavaScript (not TypeScript) — do not introduce `.ts`/`.tsx` files.
