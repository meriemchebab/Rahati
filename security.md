# SECURITY.md - Rahati Backend

## 1. Security Philosophy & Threat Model

Rahati is a private mental-wellbeing platform built for Algerian women. Because the platform handles intimate emotional data, cycle tracking, and professional care, security and privacy outrank convenience. The backend is a Django REST API using JWT authentication and role-based access control.

**Primary Threat Model & Abuse Cases:**

* **Curious or Compromised Professional:** A therapist attempting to view patient data without explicit consent. Mitigated by strict per-category sharing consent (mood, journal, cycle).


* **Data Breach / Server Compromise:** Mitigated by field-level encryption for journal entries and pseudonymous accounts.


* **Stolen Tokens:** Mitigated by short-lived JWT access tokens and strict refresh token rotation.
* **AI Jailbreaking / Misdirection:** Mitigated by isolating the AI as an asynchronous background worker (Celery) that only returns structured JSON summaries, with strict system instructions never to chat, advise, or diagnose.



---

## 2. Authentication & Authorization Policies

### Roles & Access

The API enforces three strict personas, managed via a custom user model:

1. **User:** Pseudonymous account requiring only a nickname, with optional email or phone. Users only have access to their own scoped data.


2. **Professional (Verified):** Women psychologists and therapists. Must be explicitly verified by an Admin. Unverified profiles cannot access patient data, accept sessions, or appear in directory searches.


3. **Admin:** Django admin users who verify professionals, manage the content library, and handle moderation.



### Consent-Based Data Sharing

The "Bouncer" architecture dictates that professionals have zero default access to a woman's data.

* Access to the patient dashboard is governed by the `SharingConsent` model.


* Consent is granular: `share_mood`, `share_journal`, and `share_cycle` are separate boolean flags.


* If a user toggles `share_journal = False`, the API must immediately block the connected therapist from fetching the journal.



---

## 3. Data Protection & Cryptography

### Anonymity & Privacy

* **No Forced Identification:** A pseudonymous account is entirely sufficient to use the core "Preventing loop" (check-ins, journaling, AI summaries).


* **Field-Level Encryption:** Journal entries are encrypted at the database field level using `django-cryptography` or symmetric AES-GCM (`cryptography.fernet`). The raw database column must only store ciphertext.



### Data Deletion & Retention

* **Right to be Forgotten:** Compliance with Algeria's personal-data law (18-07) is mandatory.


* **True Cascade Deletion:** Invoking the delete-account endpoint must execute a strict database cascade, wiping all user records, check-ins, encrypted journals, and tokens leaving zero orphaned records. Backups are purged on a strict schedule.



---

## 4. AI & Content Safety Rules

* **No Chatbot Pretense:** The AI must never be exposed as a conversational chat interface.


* **Descriptive Only:** The Gemini API is restricted to analyzing the past 7 to 30 days of check-ins and returning a structured Pydantic/JSON schema. It may only describe patterns (e.g., "Your mood dipped on day 22") and match pattern tags to curated content cards.


* **Clinical Boundary:** System instructions must strictly enforce that the AI does not give medical advice, diagnose, or simulate emotional support.



---

## 5. Secure Endpoint Checklist

Every existing and future API endpoint in the `apps/` directory must pass this checklist before merging into the main branch. Any endpoint that fails to meet these criteria will fail the CI/CD pipeline.

| Requirement | Implementation Rule |
| --- | --- |
| **Authentication** | Must require a valid JWT via DRF's `IsAuthenticated` by default. |
| **Role Gate** | Must explicitly declare which roles (User, Professional, Admin) can access the view. |
| **Ownership Scoping** | Object lookups must strictly filter by the authenticated user's ID (e.g., `get_owned_or_404`) to prevent IDOR / BOLA attacks. |
| **Strict Inputs** | Serializers must define explicit fields (never `__all__`). Unknown keys in payloads must be rejected (400 Bad Request). |
| **Rate Limiting** | Must implement a throttle scope (e.g., `auth_login`, `write_default`, `journal_write`) to prevent enumeration and resource exhaustion. |
| **Pagination** | All list endpoints (sessions, directories, logs) must implement bounded offset/limit pagination. |
| **Audit Logging** | Sensitive actions (consent grant/revoke, session status changes, password changes, deletions) must append to the immutable audit log. |
| **Test Matrix Row** | Must be added to the test registry with expected status codes mapped across all roles (Anonymous, User A, User B, Verified Professional, Suspended Professional). |