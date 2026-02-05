# CLAUDE.md — OProom AI Assistant Guide

## Project Overview

OProom is a full-stack healthcare platform for managing surgical residency programs and operating room scheduling. It combines a FastAPI backend with a React frontend and supports native iOS deployment via Capacitor.

**Domain**: Surgical scheduling, patient management, residency program coordination.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.8+ / FastAPI 0.110.1 |
| Database | MongoDB (pymongo 4.5.0, motor 3.3.1 for async) |
| Frontend | React 19 / JavaScript (JSX) |
| Build Tool | Craco 7.1.0 (wraps Create React App) |
| UI Components | shadcn/ui (Radix primitives + Tailwind CSS 3.4) |
| Mobile | Capacitor 6.1.2 (iOS) |
| Package Manager | Yarn 1.22.22 |
| Auth | JWT (PyJWT) + bcrypt |
| Email | SMTP (Gmail) + iCalendar |
| Google APIs | Calendar, Gmail, People (OAuth 2.0) |

## Repository Structure

```
OProom/
├── backend/
│   ├── server.py                  # FastAPI app — all REST endpoints (~1600 lines)
│   ├── google_integration.py      # Google OAuth, Gmail, Calendar helpers
│   ├── cpt_codes.json             # Medical CPT procedure codes (383 codes)
│   ├── requirements.txt           # Python dependencies (89 packages)
│   └── tests/
│       └── test_auth_and_settings.py  # pytest suite
├── frontend/
│   ├── src/
│   │   ├── App.js                 # Root component (auth gate → dashboard)
│   │   ├── index.js               # React DOM entry
│   │   ├── index.css              # Global CSS theme (healthcare design tokens)
│   │   ├── components/            # Feature components (24 top-level)
│   │   │   ├── ui/                # shadcn/ui primitives (30+ components)
│   │   │   ├── patient-status/    # Patient workflow components (8 files)
│   │   │   └── surgery-timeline/  # Surgery timeline visualization (5 files)
│   │   ├── hooks/                 # Custom hooks (use-toast.js)
│   │   ├── utils/                 # Utilities (CPT codes, native features)
│   │   └── lib/                   # Helpers (cn utility)
│   ├── public/                    # Static assets, PWA manifest, service worker
│   ├── package.json
│   ├── craco.config.js            # Webpack/ESLint/Babel config
│   ├── tailwind.config.js         # Tailwind theme
│   ├── capacitor.config.json      # iOS native config
│   ├── components.json            # shadcn/ui config
│   └── plugins/                   # Craco plugins (visual-edits, health-check)
├── Documentation/                 # Feature docs (patient workflow, Google, iOS, email)
├── test_reports/                  # pytest XML results, iteration metadata
├── README.md
├── test_result.md                 # Testing protocol / agent coordination
└── .gitignore
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

# Python formatting and linting
black backend/
isort backend/
flake8 backend/
mypy backend/
```

### Frontend

```bash
# Install dependencies
cd frontend && yarn install

# Start dev server (port 3000)
cd frontend && yarn start

# Production build
cd frontend && yarn build

# Run tests
cd frontend && yarn test

# iOS build pipeline
cd frontend && yarn ios          # build + cap sync + open Xcode
cd frontend && yarn cap:sync     # sync web build to native
```

### Testing

```bash
# Run backend tests with report output
cd backend && pytest tests/ -v --junitxml=../test_reports/pytest/pytest_results.xml

# Frontend tests
cd frontend && yarn test --watchAll=false
```

## Architecture & Key Patterns

### Backend (server.py)

- **Single-file API**: All 50+ REST endpoints live in `backend/server.py`. It is large (~1600 lines) but self-contained.
- **Endpoint prefix**: All API routes start with `/api/` (e.g., `/api/patients`, `/api/auth/login`).
- **Auth pattern**: JWT Bearer tokens via `HTTPBearer`. The `get_current_user` dependency validates tokens on protected routes.
- **MongoDB collections**: `users`, `patients`, `archived_patients`, `schedules`, `tasks`, `conferences`, `residents`, `attendings`, `notifications`.
- **Pydantic models**: Request/response validation via Pydantic `BaseModel` classes defined at the top of `server.py`.
- **Google integration**: Separated into `google_integration.py`, imported into `server.py`.

### Frontend

- **Entry point**: `App.js` performs token validation on mount, renders either `AuthPage` or `AppleDashboard`.
- **State management**: React Context API + `localStorage` for auth tokens and user data.
- **API calls**: `fetch` with Bearer token from `localStorage`. Backend URL from `REACT_APP_BACKEND_URL` env var (default `http://localhost:8001`).
- **Routing**: React Router 7.5.1 (via `react-router-dom`), managed within dashboard components.
- **UI components**: shadcn/ui pattern — primitives in `src/components/ui/`, composed in feature components.
- **Path alias**: `@/` maps to `src/` (configured in `craco.config.js` and `jsconfig.json`).
- **Styling**: Tailwind CSS with CSS custom properties for theming (HSL color system in `index.css`). Class-based dark mode.
- **Icons**: Lucide React throughout.
- **Forms**: React Hook Form + Zod validation.

### Patient Status Workflow

Patients flow through 5 states: `pending` → `confirmed` → `deficient` (optional) → `in_or` → `completed` → `archived`. Auto-archival runs after a configurable delay (default 48 hours).

### Mobile / PWA

- Capacitor wraps the React build for iOS native (Face ID, push notifications, haptics, camera).
- PWA with service worker and manifest for web install.

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
CALENDAR_SYNC_ENABLED=true
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/google-callback
AUTO_ARCHIVE_DELAY_HOURS=48
```

### Frontend
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Code Style & Conventions

### Python (Backend)
- **Formatter**: `black` (line length default 88)
- **Import sorting**: `isort`
- **Linter**: `flake8`
- **Type checker**: `mypy`
- All endpoint functions are `async def` where appropriate
- Use Pydantic models for request validation
- Keep MongoDB queries in endpoint handlers (no separate repository layer)

### JavaScript/JSX (Frontend)
- **ESLint**: React Hooks plugin enforced (`rules-of-hooks` = error, `exhaustive-deps` = warn)
- **Component style**: Functional components with hooks; `React.forwardRef` for UI primitives
- **File naming**: PascalCase for components (e.g., `AuthPage.jsx`, `PatientManagement.jsx`), kebab-case for UI primitives (e.g., `button.jsx`, `scroll-area.jsx`)
- **Exports**: Named exports for feature components; named exports for UI components
- **CSS utility**: `cn()` helper from `@/lib/utils` (merges Tailwind classes via `clsx` + `tailwind-merge`)
- **Variant patterns**: `class-variance-authority` (cva) for component variants (see `button.jsx`)

### General
- No TypeScript — the frontend uses plain JavaScript with JSX
- shadcn/ui components live in `src/components/ui/` and should not be modified without good reason
- Feature components compose shadcn/ui primitives
- Never commit `.env` files, `credentials.json`, or `token.json` (gitignored)
- Use `@/` path alias for all imports from `src/`

## API Endpoint Reference (Key Routes)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Validate token, get user |
| GET/POST | `/api/patients` | List / create patients |
| GET/PUT/DELETE | `/api/patients/{mrn}` | Get / update / delete patient |
| PATCH | `/api/patients/{mrn}/checklist` | Update prep checklist |
| POST | `/api/patients/{mrn}/send-to-or` | Move patient to OR |
| POST | `/api/patients/{mrn}/mark-complete` | Mark surgery complete |
| POST | `/api/patients/{mrn}/archive` | Archive patient |
| POST | `/api/patients/auto-archive` | Auto-archive old completed |
| GET/POST | `/api/schedules` | List / create schedules |
| GET/POST | `/api/tasks` | List / create tasks |
| GET/POST | `/api/conferences` | List / create conferences |
| GET/POST | `/api/residents` | List / create residents |
| GET/POST | `/api/attendings` | List / create attendings |
| GET | `/api/notifications` | List notifications |
| GET | `/api/google/auth-url` | Start Google OAuth |
| GET | `/api/health` | Health check |

## Testing

- **Framework**: pytest 9.0.2
- **Test file**: `backend/tests/test_auth_and_settings.py`
- **Coverage**: Health check, auth flow (register/login), user management, settings CRUD
- **Test pattern**: Class-based test organization (`TestHealthCheck`, `TestAuthentication`), uses `requests` library against a running server
- **Important**: Tests require a running backend instance (integration tests, not unit tests). Set `REACT_APP_BACKEND_URL` env var to the backend URL.

## Key Files to Understand

| File | Why It Matters |
|------|---------------|
| `backend/server.py` | The entire backend API — read this first |
| `backend/google_integration.py` | All Google service integrations |
| `frontend/src/App.js` | Auth flow and app entry point |
| `frontend/src/components/AppleDashboard.jsx` | Main dashboard (primary UI after login) |
| `frontend/src/components/AuthPage.jsx` | Login/registration UI |
| `frontend/src/components/Patients.jsx` | Patient CRUD operations |
| `frontend/src/components/patient-status/` | Patient workflow components |
| `frontend/src/index.css` | Full design system (CSS custom properties) |
| `frontend/craco.config.js` | Build configuration, ESLint, plugins |
| `frontend/tailwind.config.js` | Theme tokens and animations |

## Design System

- **Primary palette**: Healthcare teal/green tones with blue accents
- **Color system**: HSL via CSS custom properties (`--primary`, `--background`, `--destructive`, etc.)
- **Fonts**: Inter (body), Manrope (headings)
- **Dark mode**: Class-based (`darkMode: ["class"]`)
- **Radius**: CSS variable `--radius` (default 0.5rem)
- **Animations**: Tailwind animate plugin + custom accordion keyframes
- **iOS safe areas**: Supported via `safe-area-inset-bottom`

## Warnings & Pitfalls

- `server.py` is a monolith — all endpoints in one file. Take care with large edits.
- The `.gitignore` has duplicate env-file entries (cosmetic issue, not harmful).
- CORS is fully open (`allow_origins=["*"]`) — acceptable for development, not production.
- JWT secret has a fallback default (`your-secret-key-change-in-production`) — must be overridden in production.
- Tests are integration tests requiring a live backend + MongoDB instance.
- The frontend uses JavaScript (not TypeScript) — do not introduce `.ts`/`.tsx` files.
