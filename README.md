# Rahati

A private mental-wellbeing platform for Algerian women. A woman can understand her own emotional patterns through daily check-ins and her own numbers, learn from short educational cards, and, when she wants, reach a verified woman mental-health professional and book a session online or in person.

> **Status: work in progress.** 

---

## Table of contents

- **Overview**
  - [Principles](#principles)
  - [What the product does](#what-the-product-does)
  - [Research Background & Data Collection](#research-background--data-collection)
- **Build and run**
  - [Getting started](#getting-started)
  - [Mobile app](#mobile-app)
  - [Testing](#testing)
  - [Deployment](#deployment)
- **How it works**
  - [Architecture](#architecture)
  - [Backend structure](#backend-structure)
  - [Data model](#data-model)
  - [Key flows](#key-flows)
  - [Roles and permissions](#roles-and-permissions)
  - [API overview](#api-overview)
  - [AI and analytics](#ai-and-analytics)
  - [Security and privacy](#security-and-privacy)
- **Project**
  - [Key decisions](#key-decisions)
  - [Roadmap](#roadmap)
  - [Team](#team)
  - [Contributing](#contributing)
  - [Glossary](#glossary)
  - [References](#references)
  - [License](#license)

---

## Principles

These rules decide every design question. If a feature breaks one, the feature changes.

- **Show, don't diagnose.** The app shows a woman her own numbers. It never labels her, never says she has a condition and never gives medical advice.
- **No model training.** Analytics use plain statistics. Optional AI summaries receive only an allow-listed subset of those statistics, never journal text or other free-text user content.
- **Anonymous by default.** A nickname is enough to sign up. Email and phone are optional.
- **Her data, her consent.** A professional sees a woman's data only with an accepted session and an explicit, revocable consent for each category (mood, journal, cycle).
- **Delete means delete.** One action removes everything she owns.
- **No barriers to help.** Finding a verified woman professional takes a few steps: choose online or in person, a wilaya and a time, then book a free slot.

## What the product does

Rahati has two modes that share one account.

**Preventing: understand yourself.**
The backend accepts daily mood and energy check-ins with an optional fixed set of translated topic tags, cycle start dates, and encrypted journal entries. It serves curated cards and to-dos, and provides check-in analytics with an optional AI-generated summary.

**Healing: reach a professional.**
Find a verified woman professional by mode (online/in person), wilaya and time, book a free slot, and share selected data after granting consent. When the professional accepts, an online session gets a private Jitsi room link and an in-person session reveals the professional's address to the two participants.

Three personas use the platform:

| Persona | Uses | Does |
|---|---|---|
| **Woman (user)** | Mobile app (`mobile-app/`: Android, iOS and web) | Tracks, learns, books, controls her sharing |
| **Professional** | API; web dashboard (requests, patients, calendar, settings) | Manages availability, accepts sessions, sees consented data, assigns cards and to-dos |
| **Admin** | Django admin | Verifies professionals, reviews credentials, manages content |

Audit events are recorded in the database, but there is no admin page for browsing them yet.

## Research Background & Data Collection

### 1. Research Gap and Data Limitations

Women's mental health remains an underexplored research area. During our literature review, we identified a limited number of studies and datasets specifically addressing this topic.

One of the datasets identified was **mcPHASES (Lin et al., 2025)**, which explores the relationship between menstrual cycle phases and related symptoms, including mood swings.

However, its available mental health indicators do not capture every dimension of women's mental well-being. This highlights the need for more comprehensive data to better understand women's mental health challenges and experiences.

### 2. User Needs Assessment and Data Collection

To complement our literature review and better understand women's real-life experiences, we conducted an online survey.

The questionnaire was designed and distributed by the Rahati project team across several online platforms.

> 📄 **Full statistics and methodology:** see the [Rahati Survey and Research Report (PDF)](Rahati_Survey_and_Research_Report.pdf).

**Data collection overview:**

| Parameter | Description |
|---|---|
| Method | Online questionnaire |
| Participants | 40 women |
| Distribution | Multiple online platforms |
| Target population | Women |
| Objective | Identify mental well-being challenges, barriers to support, and user expectations |

### 3. Key Findings

The survey provided initial insights into women's main challenges and expectations. The figures below are a summary; the complete results are in the [survey report](Rahati_Survey_and_Research_Report.pdf).

#### 3.1. Main Challenges

| Challenge | Percentage |
|---|---:|
| Difficulty finding a trusted mental health professional | 40% |
| Difficulty understanding emotions | 37.5% |
| Cost of consultations | 27.5% |
| Lack of time | 27.5% |
| Lack of reliable mental health information | 25% |

#### 3.2. User Expectations

| Expectation | Percentage |
|---|---:|
| Privacy and confidentiality | 72.5% |
| Free or affordable services | 67.5% |
| Option to remain anonymous | 50% |
| Access to a verified woman psychologist or therapist | 47.5% |
| Practical exercises and personal goals | 45% |

### 4. Implications for Rahati

These findings helped identify user needs that informed the design priorities of Rahati:

| Identified User Need | Related Rahati Feature |
|---|---|
| Better understanding of emotions | Daily mood and energy tracking |
| Personalized support | Self-care exercises and educational content |
| Understanding mood changes | Optional menstrual cycle and mood tracking |
| Access to reliable professional support | Access to trusted women's mental health professionals |
| Privacy and confidentiality | Privacy-focused user experience |

### 5. Limitations and Future Perspectives

This survey is exploratory and has several limitations:

- The sample size is limited to 40 respondents.
- The survey is exploratory and does not represent the entire female population.
- The collected responses reflect participants' self-reported experiences and expectations.

Future work could focus on collecting more diverse data, expanding the number of participants, and exploring additional indicators related to women's mental well-being.

**Overall, the literature review and exploratory survey helped identify a research gap and provided initial user-driven insights to guide the development of Rahati.**

## Getting started

Requirements: Python 3.13 or newer and [uv](https://docs.astral.sh/uv/). Node.js 22 and npm are needed for the frontend and E2E tests.

```bash
# from the repository root
uv sync
cd Backend
```

<details>
<summary>Without uv (pip)</summary>

```bash
python -m venv .venv
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r Backend/requirements.txt
cd Backend
```

Then drop the `uv run` prefix from the commands below.
</details>

Copy [`Backend/.env.example`](Backend/.env.example) to `Backend/.env` and fill it in. For local development it needs at least:

```text
DJANGO_DEBUG=true
FIELD_ENCRYPTION_KEY=<generate it, see below>
# Optional: enables Gemini-generated analytics summaries
GEMINI_API_KEY=<your Gemini API key>
```

Generate the encryption key:

```bash
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> **Back up this key.** If it is lost, every journal entry and session note becomes unreadable.

Create the tables and an administrator, then start the server:

```bash
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py shell -c "from rahati.models import User; User.objects.filter(is_superuser=True).update(role='admin')"
uv run python manage.py runserver
```

- Admin: `http://127.0.0.1:8000/admin/`
- API: `http://127.0.0.1:8000/api/`

### Optional: starter content

`uv run python manage.py seed_starter_cards` seeds the six existing
pattern cards plus nine topic demo cards, publishes them for the woman-facing API,
and seeds the fixed topic vocabulary if needed. The fixture contains demo placeholder
content; review and replace it before serving real users.

**Do not commit** `.env`, `db.sqlite3`, `private_media/` or `media/`. If `db.sqlite3` was committed by mistake, run `git rm --cached Backend/db.sqlite3`.

## Mobile app

The woman's app lives in [`mobile-app/`](mobile-app/): Home (check-in, cycle, to-dos, weekly summary), Statistics, Therapy (find a professional, book, choose what to share, my sessions), Library, Journal and Profile, in English, French and Arabic (right-to-left).

**Stack:** Expo SDK 58 (React Native 0.88, React 19), TypeScript, expo-router, react-native-reanimated, react-native-svg, react-native-web for the web build. The full stack, screens and the endpoints each one uses are in [`mobile-app/README.md`](mobile-app/README.md).

```bash
cd mobile-app
npm install
npx expo start      # press w for the web, or scan the QR code with Expo Go
```

It uses the deployed backend on Render by default. To use a local backend, copy `mobile-app/.env.example` to `mobile-app/.env` and set `EXPO_PUBLIC_API_URL=http://localhost:8000`.

**Live web demo:** [fulldready.tech/Rahati](https://fulldready.tech/Rahati/) (the app inside a phone frame).

## Testing

### Backend tests

```bash
cd Backend
uv run python manage.py test rahati
```

Coverage (once `coverage` is installed as a dev dependency):

```bash
coverage run manage.py test rahati
coverage report --include="rahati/*"
```

The backend tests protect consent, encryption at rest, deletion, booking correctness and role and ownership rules. Unit tests also cover the Gemini summary service (language normalization, completeness validation, LanguageTool checks, and fallback behavior) and summary persistence, history retrieval, period filtering, and user isolation. They use local test data and do not call external services.

### End-to-end smoke tests

The Playwright suite starts the Next.js frontend and Django API, then tests the booking API with real HTTP requests. Its Django server migrates and seeds a fresh temporary SQLite database for every run; it does not use `Backend/db.sqlite3` or any staging data.

After the backend setup in [Getting started](#getting-started), run `npm ci` from `frontend/` and install the browser once with `npx playwright install chromium`. Then run `npm run e2e` from `frontend/`. The suite starts both servers and uses a fresh temporary SQLite database. GitHub Actions runs it with Chromium. Browser tests for the login and booking screens are not written yet.

### Demo-video data

Run `seed_demo` only against an isolated demo database. In PowerShell:

```powershell
cd Backend
$env:DEMO_SEED_ALLOWED = "true"
$env:DEMO_SHARED_PASSWORD = "<choose a password with at least 16 characters>"
python manage.py seed_demo
python manage.py seed_demo --refresh
```

`--refresh` moves demo check-ins, slots, and session times forward to the current
date. Without a shared password, the command generates random passwords and does
not print them.

## Deployment

The backend can be hosted on any platform that runs Python, such as Render or Vercel.

1. **Database:** create a managed PostgreSQL database. Do not use SQLite in production.
2. **Environment variables:** set these in the host's settings, never in Git:

   ```text
   DJANGO_DEBUG=false
   DJANGO_SECRET_KEY=<long random secret>
   FIELD_ENCRYPTION_KEY=<Fernet key>
   DATABASE_URL=<PostgreSQL URL>
   GEMINI_API_KEY=<optional>
   ```

   Generate the keys with:

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

3. **Build and start:** on Render, use the repository root with `bash build.sh` as the build command and `cd Backend && uv run --project .. gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` as the start command. `build.sh` installs dependencies, collects static files, runs migrations and seeds demo content. On Vercel, set the root directory to `Backend`.
4. **Check:** open `/api/health/` and `/admin/` over HTTPS.

Allowed hosts and CORS origins are open to everyone for the demo (`config/settings.py`). Restrict them to your domains before a public launch.

> **Before real users:** back up the database and `FIELD_ENCRYPTION_KEY` (losing the key makes journals and notes unreadable), set up private persistent storage for credential uploads, and finish the security checklist in [Security and privacy](#security-and-privacy).

## Architecture

the diagram below shows what runs today.

```mermaid
flowchart LR
  subgraph Clients
    M["Mobile app<br/>Expo / React Native"]
    W["Web app<br/>Next.js"]
    A["Django admin"]
  end
  subgraph Backend["Backend: Django + DRF"]
    API["REST API<br/>JWT, role gates"]
    SVC["Services<br/>consent gate, free slots,<br/>analytics, AI summary"]
  end
  DB[("Database<br/>SQLite in dev,<br/>PostgreSQL in production")]
  subgraph External["External services"]
    G["Gemini API<br/>summaries"]
    J["Jitsi<br/>video rooms"]
    F["FCM<br/>push, later"]
  end
  M --> API
  W --> API
  A --> Backend
  API --> SVC
  SVC --> DB
  SVC -.-> G
  SVC -.-> J
  API -.-> F
```

### How a request is handled

```mermaid
flowchart TD
  R[Client request] --> U["urls.py<br/>which view?"]
  U --> P["permissions.py<br/>role gate"]
  P --> V["views.py<br/>this endpoint's logic"]
  V --> S["serializers.py<br/>validate input, shape output"]
  V --> SV["services.py<br/>shared rules"]
  V --> MD["models.py<br/>tables"]
  MD --> DB[(Database)]
  S --> J[JSON response]
```

Private endpoints use role and ownership checks. Professional reads of a woman's check-ins, journal, or cycle data also require an accepted relationship and active category consent (`services.can_read`).

## Backend structure

```
Rahati/
├── README.md
├── LICENSE
├── Backend/requirements.txt  tracked backend dependencies
└── Backend/
    ├── manage.py
    ├── config/               settings.py, urls.py
    └── rahati/
        ├── models.py         the tables
        ├── serializers.py    validation and response shapes
        ├── permissions.py    role gates
        ├── services.py       consent gate, relationship check, audit
        ├── analytics_services.py  check-in statistics computation
        ├── gemini_summary_service.py  Gemini integration, LanguageTool validation & fallback
        ├── views.py          one class per endpoint
        ├── urls.py           routes only
        ├── admin.py          the admin persona
        └── tests/            automated tests
```

## Data model

### Core (built)

```mermaid
erDiagram
  USER ||--o| PROFESSIONAL_PROFILE : "has, if professional"
  USER ||--o{ CHECK_IN : records
  CHECK_IN ||--o{ CHECK_IN_TOPIC : tags
  TOPIC ||--o{ CHECK_IN_TOPIC : "tagged in"
  TOPIC ||--o{ TOPIC_TRANSLATION : "has translations"
  USER ||--o{ CYCLE_START : logs
  USER ||--o{ JOURNAL_ENTRY : writes
  CHECK_IN o|--o{ JOURNAL_ENTRY : "may link"
  PATTERN_TYPE ||--o{ USER_PATTERN : detects
  USER ||--o{ USER_PATTERN : has
  WEEKLY_SUMMARY o|--o{ USER_PATTERN : summarizes
  USER ||--o{ WEEKLY_SUMMARY : receives
  PATTERN_TYPE o|--o{ CONTENT_CARD : "may group"
  TOPIC o|--o{ CONTENT_CARD : "may group"
  USER o|--o{ CONTENT_CARD : authors
  USER o|--o{ CONTENT_CARD : reviews
  CONTENT_CARD ||--o{ CONTENT_CARD_TRANSLATION : "may have translations"
  USER ||--o{ CARD_READ : marks
  CONTENT_CARD ||--o{ CARD_READ : "marked as read"
  USER ||--o{ TODO : owns
  CONTENT_CARD o|--o{ TODO : "may source"
  USER o|--o{ TODO : assigns
  USER ||--o{ AVAILABILITY_SLOT : offers
  WEEKLY_AVAILABILITY o|--o{ AVAILABILITY_SLOT : generates
  USER ||--o{ WEEKLY_AVAILABILITY : defines
  USER ||--o{ TIME_OFF : blocks
  AVAILABILITY_SLOT ||--o{ SESSION : "booked as"
  USER ||--o{ SESSION : books
  SESSION ||--o| SESSION_NOTE : has
  USER ||--o{ SHARING_CONSENT : grants
  USER ||--o{ SHARING_CONSENT : "is recipient professional"
  USER ||--o{ DEVICE_TOKEN : registers
  USER o|--o{ AUDIT_LOG : acts
  USER ||--o{ ANALYTICS_SUMMARY : persists

  USER {
    string username "the nickname"
    string role "user, professional, admin"
    string language "ar, fr, en"
  }
  PROFESSIONAL_PROFILE {
    string display_name
    string wilaya
    string status "pending, verified, rejected"
  }
  CHECK_IN {
    date checkin_date
    int mood "1 to 5"
    int energy "1 to 5"
  }
  CONTENT_CARD {
    string status "draft, published, archived, removed"
    string starter_key "optional, unique"
  }
  AVAILABILITY_SLOT {
    datetime starts_at
    datetime ends_at
    string mode "online, in_person"
    string source "manual, template"
    datetime closed_at
  }
  WEEKLY_AVAILABILITY {
    int weekday "Monday=0 through Sunday=6"
    time starts_at "local time"
    time ends_at "local time"
    string mode "online, in_person"
    boolean is_active
  }
  TIME_OFF {
    datetime starts_at
    datetime ends_at
  }
  SESSION {
    string status "requested, accepted, declined, cancelled, completed"
  }
  SHARING_CONSENT {
    string category "mood, journal, cycle"
    datetime revoked_at
  }
  AUDIT_LOG {
    string action
    string target_type
    int target_id "not a foreign key"
  }
  ANALYTICS_SUMMARY {
    int range "7, 30, 90 days"
    string language "en, ar"
    text body "generated or fallback summary"
    datetime created_at
  }
```

`USER_PATTERN` stores rule-detected patterns; `WEEKLY_SUMMARY` stores a generated weekly text summary; `ANALYTICS_SUMMARY` persists generated analytics summaries per user and range. Card translations are stored per language, but the database does not enforce that a card has any translations; publishing validation checks required translations.

Design notes:

- **Normalization:** the model keeps topic names and card text in translation tables, and derives a session's professional through its availability slot.
- **Encrypted columns:** journal text and session notes are encrypted before they reach the database.
- **Deletion:** user-owned records generally cascade when their user is deleted. Audit rows remain, with the actor link set to `NULL`; their target type and ID are not foreign keys.
- **Translations** live in their own table, so adding a language adds rows, not columns.

## Key flows

### Session lifecycle

A session in `requested` or `accepted` holds its slot. When it becomes declined, cancelled or completed, the slot is free again (completed sessions stay in history).

```mermaid
stateDiagram-v2
  [*] --> requested : woman books a free slot
  requested --> accepted : professional accepts
  requested --> declined : professional declines
  requested --> cancelled : woman cancels
  accepted --> cancelled : woman or professional cancels
  accepted --> completed : professional completes
  declined --> [*]
  cancelled --> [*]
  completed --> [*]
```

### Booking and reveal

```mermaid
sequenceDiagram
  actor Woman
  participant API
  participant DB
  actor Pro as Professional
  Woman->>API: POST /api/sessions {slot}
  API->>DB: begin, lock the slot row
  API->>DB: slot free? (verified professional, lead time, no active session)
  alt not free
    API-->>Woman: 404 or 409
  else free
    API->>DB: create session (requested)
    API-->>Woman: 201
  end
  Pro->>API: PATCH /api/sessions/{id} {status: accepted}
  API->>API: check the transition table
  API-->>Pro: 200
  Note over Woman,Pro: On acceptance, online sessions reveal a random Jitsi link and in-person sessions reveal the professional's address to both participants.
```

**A free slot** is: at least 60 minutes in the future, belongs to a verified and active professional, is not closed, and has no requested or accepted session. Search, calendar and booking all use this one rule.

### Consent gate

```mermaid
flowchart TD
  R["Professional asks for a patient's data"] --> A{"Verified professional?"}
  A -- no --> X["403 Forbidden"]
  A -- yes --> B{"Accepted or completed<br/>session with her?"}
  B -- no --> X
  B -- yes --> C{"Active consent for<br/>this category?"}
  C -- no --> X
  C -- yes --> L["Write audit row"]
  L --> D["Return the data"]
```

### Professional verification

```mermaid
stateDiagram-v2
  [*] --> pending : applies with a credential
  pending --> verified : admin verifies
  pending --> rejected : admin rejects
  verified --> pending : professional changes display name
  rejected --> [*] : terminal state
```

Only pending profiles can be verified or rejected through the admin actions. An unverified professional cannot publish slots, accept sessions or read patient data, and her slots are not free for women. Rejected profiles have no reapplication or reconsideration flow yet.

### Analytics and AI summary

The API supports analytics and summary requests. Topic aggregation and content-card suggestions based on recent check-in topics are not part of the analytics response.

```mermaid
sequenceDiagram
  actor Woman
  participant API
  participant Stats as Analytics (plain code)
  participant LLM as Gemini (optional)
  Woman->>API: POST /api/check-ins {mood, energy, topics?}
  Woman->>API: GET /api/analytics?range=7
  API->>Stats: compute from her own check-ins
  Stats-->>API: averages, daily series, streak, lowest mood
  API-->>Woman: analytics JSON
  Woman->>API: POST /api/analytics/summary {range: 7, language: 'en'}
  API->>Stats: compute the same statistics
  opt Gemini API key configured and check-ins exist
    API->>LLM: allow-listed numeric statistics only
    LLM-->>API: draft summary
    API->>API: validate completeness & LanguageTool quality
  end
  API->>API: use local template if Gemini is unavailable or validation fails
  API->>DB: persist summary in AnalyticsSummary
  API-->>Woman: summary and analytics JSON
```

### Professional availability

```mermaid
flowchart LR
  T["Weekly template"] -->|"generates 4 weeks ahead"| S["Slots"]
  M["One-off slots"] --> S
  O["Time off"] -->|"removes free slots,<br/>blocks generation"| S
  S --> F{"Free?"}
  F -- yes --> D["Directory and booking"]
  F -- no --> C["Visible in her calendar only"]
```

A slot that has ever had a session is closed, never deleted, so booking history is never lost.

## Roles and permissions

| Action | Woman | Professional (verified) | Professional (pending or rejected) | Admin |
|---|---|---|---|---|
| Register | yes, public | yes, as an application | n/a | created by operators |
| Track, journal, to-dos | own data only | no | no | no |
| Book and cancel sessions | yes | no | no | no |
| Publish slots, accept sessions | no | yes | no | no |
| Read a woman's mood, journal or cycle | no | only with relationship + consent | no | no |
| Assign to-dos and cards | no | to her own patients | no | no |
| Verify professionals, manage cards | no | no | no | yes |
| Browse audit events in the admin UI | no | no | no | not implemented |
| Read journals, check-ins, notes | own only | consented only | no | no |

## API overview

All routes are under `/api/`. Responses are JSON. Authentication is a JWT in the `Authorization: Bearer` header.

### Built

| Area | Endpoints |
|---|---|
| Auth and account | `POST auth/register`, `POST auth/register-professional`, `POST auth/login`, `POST auth/refresh`, `POST auth/verify`, `POST auth/logout`, `POST auth/change-password`, `GET/DELETE me` |
| Professional profile | `GET/PATCH pro/profile`, `GET/PUT pro/profile/credential` |
| Tracking | `GET/POST check-ins`, `GET topics`, `POST cycle-starts`, `GET/POST journal`, `GET patterns` (reads stored pattern and weekly-summary rows) |
| Analytics and summaries | `GET analytics?range=7\|30\|90`, `POST analytics` / `POST analytics/summary`, `GET analytics/history` (with `?range=` filter), `GET analytics/history/{id}` |
| To-dos | `GET/POST todos`, `PATCH/DELETE todos/{id}`, `POST todos/{id}/complete`, `POST todos/{id}/reopen` |
| Content cards | `GET content-cards`, `GET content-cards/{id}`, `POST content-cards/{id}/read`, `GET content-cards/library?topic&limit&offset`, `POST content-cards/{id}/add-todo` |
| Professional content | `GET/POST pro/content`, `GET/PATCH/DELETE pro/content/{id}`, `POST pro/patients/{id}/content` (assign a card) |
| Directory | `GET wilayas`, `GET professionals?mode&wilaya&from&to&time_of_day`, `GET professionals/{id}/slots`, `GET professionals/{id}/calendar?month=YYYY-MM` |
| Sessions | `GET/POST sessions`, `GET/PATCH sessions/{id}` (participant-scoped details and status transitions) |
| Consent | `GET/PUT consents` |
| Professional availability | `GET/POST/PATCH/DELETE pro/slots`, `GET/POST/PATCH/DELETE pro/availability`, `GET/POST/DELETE pro/time-off`, `GET pro/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| Professional care | `GET pro/patients`, `GET pro/patients/{id}/check-ins`, `.../journal`, `.../cycle`, `GET/POST pro/patients/{id}/todos`, `PATCH/DELETE pro/patients/{id}/todos/{todo_id}`, `GET/PUT pro/sessions/{id}/note` |

The Django admin supports professional verification and credential review, and content-card review and publishing. Audit events are stored but are not exposed in the admin UI. `GET patterns` only returns stored rows; analytics are computed on request and are separate from stored pattern and weekly-summary rows. Professional patient analytics are not implemented.

`GET /api/topics` returns `[{ "code": "stress", "name": "ضغط" }]` in the authenticated caller's language, ordered by code. A check-in response has exactly these keys:

```json
{
  "id": 1,
  "checkin_date": "2026-10-24",
  "mood": 3,
  "energy": 4,
  "topics": ["stress"]
}
```

`POST /api/check-ins` may omit `topics` to leave an existing day's tags unchanged, or provide a list of up to three distinct topic codes to replace them (an empty list clears them). Topics on professional check-in reads are included only when the existing mood-consent gate allows that read.

Every woman-facing card item has exactly these keys: `id`, `topic`, `topic_name`,
`title`, `body`, `action`, `support_note`, `pattern`, `source`, `author_name`,
`read`, `has_open_todo`, `reviewed_by_name`, and `language`.
`GET /api/content-cards/library` returns
`{ "count": 0, "next": null, "previous": null, "results": [] }`; library item
bodies are empty and are fetched from the detail endpoint. Suggestions use only the
woman's topic tags from the latest 14 local days. Woman-facing card responses use
`Cache-Control: private, no-store`.

### Specified (not yet built)

| Area | Endpoints |
|---|---|
| Professional patient analytics | `GET pro/patients/{id}/analytics` |

A machine-readable API schema (Swagger, via `drf-spectacular`) is not implemented yet. If added, it must not be public in production.

## AI and analytics

Analytics are calculated on request from the authenticated woman's own check-ins using plain statistics; no model is trained and no prediction is made. `GET /api/analytics?range=7|30|90` returns start and end dates, a daily mood and energy series, check-in count, averages, previous-period mood average and change, current streak, and lowest mood with its dates. The `topics` response field is currently empty; topic aggregation is not implemented.

`POST /api/analytics` (and `POST /api/analytics/summary`) accepts the same ranges and returns the statistics plus an AI-generated summary in English or Arabic (`en`, `ar`; unsupported languages default to English). With check-ins and `GEMINI_API_KEY` configured, the backend prompts Gemini (`gemini-3.5-flash-lite`) using an explicit allow-list of numeric statistics: range, count, averages, mood change, and streak. Journal entries, notes, and other free-text user content are strictly never sent.

Output validation and fallback:
- **Completeness & structure:** Generated summaries are checked to ensure they are complete sentences and not empty, truncated, or prematurely cut off by token limits.
- **Language quality:** Grammar and phrasing are validated via LanguageTool for English and Arabic.
- **Deterministic fallback:** If Gemini fails, the API key is missing, or output validation fails, the service returns a supportive local template summary.

Persistence and history:
- Generated summaries are saved to the database in the `AnalyticsSummary` model with their range (7, 30, or 90 days), language, and timestamp.
- Users can retrieve past summaries via `GET /api/analytics/history` (also at `/api/analytics/summaries`) and `GET /api/analytics/history/{id}`, with optional `?range=` period filtering and strict user ownership isolation.

Summaries are informational and are not a diagnosis or medical advice. The prompt instructs Gemini not to diagnose, give medical advice, or invent facts, but that instruction is not a factual-accuracy safeguard. Both endpoints are private, authenticated user endpoints and return `Cache-Control: private, no-store`.

## Security and privacy

Detailed documents: [security.md](security.md) (philosophy and threat model) and [Backend/SECURITY.md](Backend/SECURITY.md) (controls mapped to OWASP and tests).

The security model follows **OWASP Top 10:2025** and the **OWASP API Security Top 10:2023**. The **OWASP Top 10 for LLM Applications** also applies to the analytics-summary feature.

### What is in place

- Role gates and ownership checks on private endpoints; consent gates on professional reads of a woman's check-ins, journal, and cycle data (A01, API1, API5).
- Journal text and session notes are encrypted at rest (A04).
- Responses are explicit allow-lists, with no emails, phones or file paths leaking (API3).
- Booking uses a row lock so a slot cannot be double-booked.
- Online meeting links use a cryptographically random room name, are generated only when the professional accepts, and are revealed only to the session participants while it is accepted (API1, API3, A02).
- Professional reads of a woman's data are written to the audit-log table (A09); there is no admin browser for these rows yet.
- Administrators cannot open check-ins, journals or session notes.
- Directory search has allow-listed parameters, result caps, throttles, and private no-store responses; requests are not logged (A05, API4, API6, A09).
- Slots with booking history are closed, not deleted (A08).

### AI summary privacy and limitations

- The summary service sends Gemini only an allow-listed subset of numeric statistics, never the woman's journal text, notes, or other free-text user content (OWASP LLM01, LLM02).
- Output completeness and language checks (via LanguageTool for English and Arabic) are enforced before a summary is accepted, with automatic fallback to a deterministic local template (LLM05, API10).
- Summaries are persisted in `AnalyticsSummary` with user ownership isolation and period filtering.
- Daily call caps and throttles remain planned additions to limit cost and abuse (LLM10, API4).
- Meeting links do not expire yet; limiting them to a time window around the session is planned (A01).

### Before any real woman uses the app (demo-minimum)

1. Confirm production secrets, `DEBUG`, `ALLOWED_HOSTS`, encryption key, and CORS origin are set safely.
2. Add a password confirmation step to `DELETE /me`.
3. Add throttling to public patient registration; login and professional registration are throttled already.
4. Add an admin audit-log viewer and review the audit-log retention/tamper policy.
5. Run `pip-audit` and `bandit -r rahati -x rahati/tests` before deployment (install the tools in the project environment first).

### Before a real launch

The full baseline: CI for backend unit and security tests (the Playwright E2E workflow is present), an immutable audit log, encryption key rotation, an admin IP allow-list and stronger admin authentication, a role-by-route test matrix, structured logging with redaction, and extending [Backend/SECURITY.md](Backend/SECURITY.md) so every OWASP item maps to code and tests.

### Accepted risks (for now)

- Mood and cycle data are not encrypted per column (they are needed for aggregation). The database disk and backups must be encrypted at the hosting level.
- Integer ids are sequential; object-level checks are the protection.
- Administrators have no two-factor login yet.
- Wilaya, address and other professional details are only as trustworthy as the manual verification of her credential. A human must check a diploma against the official body.

## Deploy the backend on Render

The repository root contains `build.sh`, `pyproject.toml`, and `uv.lock`; the Django
project is in `Backend/`. In Render, set **Root Directory** to the repository root
(the folder containing those three files), not `Backend` or `Backend/rahati`.

Create a PostgreSQL database in Render first, then create a Python web service for
this repository with:

| Setting | Value |
| --- | --- |
| Root Directory | repository root |
| Build Command | `bash build.sh` |
| Start Command | `cd Backend && uv run --project .. gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` |

Add these environment variables to the web service. Copy the PostgreSQL database's
**Internal Database URL** into `DATABASE_URL`:

```text
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=<unique-long-random-secret>
FIELD_ENCRYPTION_KEY=<unique-Fernet-key>
DATABASE_URL=<Render-PostgreSQL-Internal-Database-URL>
```

Generate keys locally with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Keep the actual values in Render's environment settings, never in Git or this
README. `GEMINI_API_KEY` is optional. `build.sh` syncs dependencies from the root
uv lockfile, collects static files, applies migrations, and seeds the demo topics
and starter cards. The public health check is `https://<service>.onrender.com/api/health/`.

The current configuration permits all host names and CORS origins for the demo.
Before a public production launch, restrict these to the deployed domains. Uploaded
credential files currently use local storage, which is not durable across Render
deployments; configure private persistent/object storage before accepting real uploads.

## Getting started

Requirements: Python 3.12 or newer (Django 6.1 requirement). Node.js 22 and npm are needed for the frontend E2E suite.

```bash
# from the repository root
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r Backend/requirements.txt

cd Backend
```

Create `Backend/.env`:

```
FIELD_ENCRYPTION_KEY=<generate it, see below>
# Optional: enables Gemini-generated analytics summaries
GEMINI_API_KEY=<your Gemini API key>
```

Generate the encryption key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> **Back up this key.** If it is lost, every journal entry and session note becomes unreadable.

Required settings in `Backend/config/settings.py` (the project reads them at the bottom of the file):

```python
AUTH_USER_MODEL = "rahati.User"          # must be set before the first migration
FIELD_ENCRYPTION_KEY = os.environ["FIELD_ENCRYPTION_KEY"]
TIME_ZONE = "Africa/Algiers"
INSTALLED_APPS += ["rest_framework", "corsheaders", "rahati"]
```

Create the tables and an administrator:

```bash
python manage.py makemigrations rahati
python manage.py migrate
python manage.py createsuperuser
python manage.py shell -c "from rahati.models import User; User.objects.filter(is_superuser=True).update(role='admin')"
python manage.py runserver
```

- Admin: `http://127.0.0.1:8000/admin/`
- API: `http://127.0.0.1:8000/api/`

**Do not commit** `.env`, `db.sqlite3`, `private_media/` or `media/`. If `db.sqlite3` was committed by mistake, run `git rm --cached Backend/db.sqlite3`.

## Testing

### Demo-video data

Run `seed_demo` only against an isolated demo database. In PowerShell:

```powershell
cd Backend
$env:DEMO_SEED_ALLOWED = "true"
$env:DEMO_SHARED_PASSWORD = "<choose a password with at least 16 characters>"
python manage.py seed_demo
python manage.py seed_demo --refresh
```

`--refresh` moves demo check-ins, slots, and session times forward to the current
date. Without a shared password, the command generates random passwords and does
not print them.

```bash
cd Backend
python manage.py test rahati
```

Coverage (once `coverage` is installed as a dev dependency):

```bash
coverage run manage.py test rahati
coverage report --include="rahati/*"
```

The backend tests protect consent, encryption at rest, deletion, booking correctness and role and ownership rules. Unit tests also cover the Gemini summary service (language normalization, completeness validation, LanguageTool checks, and fallback behavior) and summary persistence, history retrieval, period filtering, and user isolation (all 354 backend tests pass). They use local test data and do not call external services.

### End-to-end smoke tests

The Playwright suite starts the Next.js frontend and Django API, then tests the booking API with real HTTP requests. Its Django server migrates and seeds a fresh temporary SQLite database for every run; it does not use `Backend/db.sqlite3` or any staging data.

After creating the root `.venv` and installing `Backend/requirements.txt` above, run `npm ci` from `frontend/` and install the browser once with `npx playwright install chromium`. Then run `npm run e2e` from `frontend/`. The suite starts both servers and uses a fresh temporary SQLite database. GitHub Actions runs it with Chromium. Browser coverage of login and booking can be added when those screens exist.

## Key decisions

| Decision | Why |
|---|---|
| Rules and statistics, not machine learning | No real data yet, and a model trained on invented data proves nothing. Rules are explainable. |
| Show analytics instead of detecting "patterns" | Avoids clinical judgment, false alarms and responsibility for being right. |
| Cards by topic the woman tags, plus cards her professional assigns | The app never claims to know her state. She tells it, or her professional decides. |
| No filtering professionals by symptom, specialty, language or rating | A woman seeking help may not know what is wrong; ratings invite unfairness. |
| One user table with a role field | Three personas, one login system, one permission model. |
| Slots are closed, never deleted, after a booking | Deleting would cascade and erase booking history. |
| Random video room names, created only when a session is accepted | Hard to guess, and only the two participants ever see them. |
| SQLite now, a server database later | Zero setup for a team that is starting. Models do not change when switching. |

## Roadmap

Suggested build order (each item depends on the earlier ones):

1. Add summary-specific daily call caps and throttles (AI summary validation and summary persistence with history retrieval are completed).
2. Add professional patient analytics, an API schema for client developers, and a visible "talk to someone now" support card.
3. Before a real launch: the full OWASP baseline, a production database, hosting with TLS and encrypted storage, push notifications.

**People work that code cannot replace:** professionals to review the card texts and the AI wording, native speakers for the Arabic, a human check of every professional's credential, and a pilot with consenting women.

## Team

| Name | Role | Responsibilities | GitHub |
|---|---|---|---|
| _Name_ | Research & data | _e.g. survey, literature review_ | [@username](https://github.com/username) |
| _Amirat Katia_ | AI & Analytics Engineer | Built the backend AI analytics summary service (Gemini API integration, validation, history), and created questionnaires for psychologists and women to guide product needs. | [@Katia-Am](https://github.com/Katia-Am) |
| _Chiraz Benbelkhir_ | Mobile app developer | <ul><li>Built the Rahati mobile app (Expo, React Native, TypeScript) from the team's Figma designs, and published a live demo of it in the browser.</li> <li>Connected it to the Django API (booking with consent, check-ins, statistics, etc.) and added English, French and Arabic.</li></ul> | [@yomidotk](https://github.com/yomidotk) |
| _Katia Ghezali_ | Frontend developer | <ul><li> Developed responsive interfaces and interactive dashboards using Next.js, React, and Tailwind CSS.</li> <li> Connected frontend components to backend APIs to retrieve and display data, and deployed the web application frontend.</li></ul> | [@KatiaGhezali](https://github.com/KatiaGhezali) |
| _Name_ | UI/UX designer | _e.g. user flows, mockups_ | [@username](https://github.com/username) |
| _Name_ | Project lead | _e.g. planning, coordination_ | [@username](https://github.com/username) |

## Contributing

- Work on a branch and open a pull request; every pull request must pass `uv run python manage.py test rahati` from `Backend/`.
- Every new endpoint needs: an explicit role gate, ownership scoping, a strict serializer with an explicit field list (never `__all__`), a text policy for every string field, pagination for lists, a throttle scope, an audit event for sensitive actions and tests for each of these.
- Never log request bodies, tokens, journal text, addresses or video links.
- Never commit secrets. Add new environment variables to [`Backend/.env.example`](Backend/.env.example).
- Do not delete a test to make a change pass. If a test must change, say why in the pull request.

## Glossary

- **Check-in**: a daily mood and energy score (1 to 5).
- **Slot**: a block of time a professional offers. A **free slot** can still be booked.
- **Session**: a booking of a slot by a woman, with a status.
- **Consent**: a woman's permission for one professional to see one category of her data.
- **Card**: a short lesson with one small action and a "when to reach out for support" line.
- **Topic**: a fixed translated theme (such as stress, sleep or family) that can be attached to a check-in.
- **Wilaya**: an Algerian administrative province, used as the location filter.

## References
- Lin, B., Li, J. Y., Kalani, K., Truong, K., & Mariakakis, A. (2025). *mcPHASES: A Dataset of Physiological, Hormonal, and Self-reported Events and Symptoms for Menstrual Health Tracking with Wearables*. PhysioNet, Version 1.0.0. [https://doi.org/10.13026/zx6a-2c81](https://doi.org/10.13026/zx6a-2c81)

## License

See [LICENSE](LICENSE).
