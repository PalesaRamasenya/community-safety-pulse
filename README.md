# Community Safety Pulse

An AI-powered community safety incident reporting and awareness platform. Residents can
anonymously report incidents (theft, assault, vandalism, road hazards, etc.) which are
automatically classified for severity and checked for spam by a machine learning service,
then displayed in real time on a public heatmap. Admins get a dashboard to triage reports
and monitor per-area risk scores.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Axios, Leaflet.js (+ leaflet.heat) |
| Backend API | Node.js, Express |
| ML Service | Python, Flask, scikit-learn |
| Real-time sync | Firebase Firestore |
| Structured data | PostgreSQL via Supabase |
| Auth | Firebase Authentication (Email/Password) |
| Email alerts | Nodemailer + Gmail SMTP |

## Project Structure

```
community-safety-pulse/
├── frontend/    React app (heatmap, report form, auth, admin dashboard)
├── backend/     Express REST API (validation, ML orchestration, Supabase/Firestore sync)
├── ml-service/  Flask API (severity classifier + spam classifier)
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+ and pip
- A Supabase project with the `users`, `incidents`, `areas`, `notifications` tables
- A Firebase project with Email/Password auth enabled and a Firestore database
- A Firebase Admin SDK service account (for the backend)
- A Gmail account with an **App Password** (for sending alert emails)

### Required Supabase schema note

The `incidents` table as specified only stores `latitude`/`longitude`, with no foreign key
to `areas`. To support per-area risk scoring and area-based email alerts, add a text column:

```sql
alter table incidents add column area_name text;
```

This should match `areas.area_name` (and `users.registered_area`) for a given incident's
location. Without it, area risk recalculation and area-targeted alert emails have nothing
to group incidents by.

## Environment Variables

### backend/.env

```
SUPABASE_URL=              # Supabase project base URL (NOT the /rest/v1/ path)
SUPABASE_KEY=              # Supabase anon/service key
FIREBASE_PROJECT_ID=community-safety-pulse
FIREBASE_PRIVATE_KEY=      # from the Firebase service account JSON (keep \n escaped)
FIREBASE_CLIENT_EMAIL=     # from the Firebase service account JSON
FIREBASE_WEB_API_KEY=      # Firebase web API key, used by /api/auth/login (defaults to the
                            # project's public key if omitted - see authController.js)
GMAIL_USER=                # Gmail address used to send alerts
GMAIL_PASS=                # Gmail App Password (not your account password)
ML_API_URL=http://localhost:5000
JWT_SECRET=community_safety_secret_2026
PORT=3001
```

### frontend/.env

```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_API_BASE_URL=http://localhost:3001
```

`.env.example` files are provided in both `frontend/` and `backend/` as templates.

## Installation & Running Locally

Run all three services in separate terminals.

### 1. ML Service (Flask)

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate        # on Windows
# source venv/bin/activate   # on macOS/Linux
pip install -r requirements.txt
python train.py               # trains and saves model/severity_model.pkl + model/spam_model.pkl
python app.py                 # runs on http://localhost:5000
```

### 2. Backend (Express)

```bash
cd backend
npm install
npm run dev        # requires nodemon (installed as a dev dependency); or: npm start
# runs on http://localhost:3001
```

### 3. Frontend (React)

```bash
cd frontend
npm install
npm start
# runs on http://localhost:3000
```

Start order matters only for full functionality (severity classification/spam checks
fall back gracefully to "Unclassified"/not-flagged if the ML service isn't running yet,
per the backend's 3-second timeout).

## API Documentation

Base URL: `http://localhost:3001`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/incidents` | none (anonymous allowed) | Submit a new incident. Validates fields, classifies severity + spam via the ML service, saves to Supabase, syncs to Firestore, and emails area residents if High severity + not spam. |
| GET | `/api/incidents` | none | List incidents. Query params: `severity`, `category`, `status`, `from`, `to` (ISO date filters on `created_at`). |
| GET | `/api/incidents/:id` | none | Get a single incident. |
| PATCH | `/api/incidents/:id/status` | admin | Update `status` to `Open` / `Under Review` / `Resolved`. |
| DELETE | `/api/incidents/:id` | admin | Remove a (typically spam-flagged) report. |
| GET | `/api/areas` | none | List all areas with their current risk scores. |
| GET | `/api/areas/:id/risk-score` | none | Get a single area's risk score. |
| POST | `/api/areas/:id/recalculate` | admin | Recalculate an area's risk score from its non-spam incidents. |
| POST | `/api/auth/register` | none | Create a Firebase Auth user + Supabase profile. Body: `{ email, password, role, registered_area }`. |
| POST | `/api/auth/login` | none | Sign in via the Firebase Identity Toolkit REST API. Returns `{ idToken, refreshToken, expiresIn, user }`. |

Admin routes expect `Authorization: Bearer <Firebase ID token>`; the token's `role` custom
claim must be `admin` (the frontend's `axiosClient` attaches this automatically once
logged in).

### ML Service endpoints (internal, called by the backend)

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ml/classify` | `{ description, category }` → `{ severity: "Low"\|"Medium"\|"High", confidence }` |
| POST | `/ml/spam-check` | `{ description }` → `{ spamScore, flagged }` |

## Notes & Design Decisions

- **Anonymous reporting**: `POST /api/incidents` never requires auth; `user_id` is optional.
- **Photo upload**: for simplicity, photos are base64-encoded client-side and sent as
  `photo_url` (a data URL) in the JSON payload. For production use, swap this for an
  upload to Firebase Storage/S3 and store the resulting URL instead.
- **Credentials split**: Firebase Auth is the single source of truth for passwords - the
  Supabase `users.password_hash` column is intentionally left null to avoid a second,
  driftable copy of the same secret.
- **ML fallback**: if the Flask service is unreachable or takes longer than 3 seconds,
  the backend assigns `"Unclassified"` severity and `flagged: false` rather than failing
  the whole submission.
- **Login page vs. `/api/auth/login`**: the React Login page signs in directly via the
  Firebase client SDK (`signInWithEmailAndPassword`), which is the standard/secure way to
  verify a password with Firebase. The backend `/api/auth/login` endpoint (which proxies to
  the Identity Toolkit REST API) is still implemented per the spec for any non-browser or
  server-side client that needs a password-based login route.
