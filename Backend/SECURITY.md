# Rahati Backend Security Map

This document maps implemented controls to the OWASP Top 10 (2021) and the
tests that exercise them. It describes application controls; it is not a claim
of certification or a substitute for deployment review.

## OWASP Top 10 mapping

| OWASP area | Rahati controls | Code and tests |
| --- | --- | --- |
| A01 Broken Access Control | Explicit role permissions, per-user profile and credential scoping, consent-gated patient data, staff-only admin review, and status-gated professional actions. | `rahati/permissions.py`, `rahati/views.py`, `rahati/admin.py`; `test_api.py`, `test_pro_profile.py`, `test_pro_credential_endpoints.py`, `test_pro_security_matrix.py`, `test_admin_professionals.py` |
| A02 Cryptographic Failures | Django password hashing; 15-minute JWT access tokens; 7-day refresh tokens with rotation and blacklist; Fernet-encrypted journal and session-note fields; private credential storage. | `config/settings.py`, `rahati/models.py`, `rahati/storage.py`; `test_auth_hardening.py`, `test_pro_credential_endpoints.py` |
| A03 Injection | Strict public text validation rejects HTML-like tags, links, control characters and bidi controls; private journal/session notes preserve user text but reject control/bidi characters and must be rendered as escaped text by clients. Serializer inputs are explicit and the strict professional serializers reject unknown fields. ORM querysets use Django ORM. | `rahati/text_rules.py`, `rahati/serializers.py`; `test_text_rules_pro.py`, `test_pro_registration.py`, `test_pro_profile.py`, `test_pro_security_matrix.py` |
| A04 Insecure Design | Pending-first professional review, constrained status transitions, refresh-token revocation, credential sniffing and image re-encoding, private file streaming, and audit events for sensitive review/profile operations. | `rahati/professionals.py`, `rahati/credentials.py`, `rahati/admin.py`, `rahati/views.py`; professional registration/profile/admin tests and `test_credentials.py` |
| A05 Security Misconfiguration | `manage.py check --deploy` is part of release verification. Production must set a strong secret, encryption key, HTTPS origins, secure cookie/SSL settings, host allowlist, and private storage outside public media. | `config/settings.py`; deploy check output and deployment configuration review |
| A06 Vulnerable and Outdated Components | Dependencies are declared in `pyproject.toml` and `uv.lock`; run `pip-audit` against the locked environment during release. | `pyproject.toml`, `uv.lock`; `pip-audit` report |
| A07 Identification and Authentication Failures | Django password validators, generic bad-login responses, login and registration throttles, short access lifetime, rotating/blacklisted refresh tokens, authenticated logout and password change. | `config/settings.py`, `rahati/views.py`; `test_auth_hardening.py`, `test_pro_registration.py` |
| A08 Software and Data Integrity Failures | Upload type is inferred from bytes, extensions must match, images are decoded/re-encoded, and PDF active-content tokens are rejected. | `rahati/credentials.py`; `test_credentials.py`, `test_pro_registration.py`, `test_pro_credential_endpoints.py` |
| A09 Security Logging and Monitoring Failures | Audit rows cover professional registration, profile updates (action and target only), credential review, and admin verification/rejection. | `rahati/services.py`, `rahati/views.py`, `rahati/admin.py`; `test_pro_registration.py`, `test_pro_profile.py`, `test_admin_professionals.py` |
| A10 Server-Side Request Forgery | No user-supplied URL fetch is part of the professional registration, profile, or credential flow. Any future URL-fetch feature needs destination allowlisting and network egress controls. | Current professional API surface; regression review in `test_pro_security_matrix.py` |

## Directory search and availability security

The directory endpoints are authenticated user-role reads. `GET /api/wilayas`,
`GET /api/professionals`, `GET /api/professionals/{id}/slots`, and
`GET /api/professionals/{id}/calendar` return `Cache-Control: private,
no-store`. Search and calendar endpoints use per-user `ScopedRateThrottle`
scopes (`directory_search`: 120/hour; `directory_calendar`: 240/hour). Query
parameters are allow-listed, duplicate keys and unsafe NUL/bidi input are
rejected, validation errors are JSON 400s, and unexpected endpoint errors use a
generic JSON 500. Directory reads do not create audit events or other rows;
request logging uses Django's path-only request message and does not include
the query string.

| OWASP area | Directory control | Regression tests |
| --- | --- | --- |
| A01 Broken Access Control | User-role gate on all four reads; unavailable, inactive, and unverified profiles share a non-enumerating 404; slots and calendar are scoped by professional id. | `test_security_directory.py` role matrix and IDOR probes |
| API3 Broken Object Property Level Authorization | Explicit response serializers / dictionaries omit email, phone, address, credentials, and private profile state. | `test_directory_search.py`, `test_security_directory.py` privacy allow-list checks |
| A05 Security Misconfiguration | Private no-store headers on success and error responses; strict query parsing and generic unexpected-error bodies. | `test_directory_consistency_and_privacy.py` cache, invalid-input, and generic-error checks |
| API4 Unrestricted Resource Consumption | Per-user scoped request limits and bounded pagination; calendar aggregates by local date/mode in constant query count. | `test_directory_consistency_and_privacy.py` throttle checks; `test_professional_slots_and_calendar.py` query-count test |
| API6 Unrestricted Access to Sensitive Business Flows | Search results expose only bookable free slots; active bookings disappear across search/slots/calendar and declined bookings become available again. | `test_directory_consistency_and_privacy.py` booking lifecycle test |
| A09 Security Logging and Monitoring Failures | Directory GETs write no audit rows and query parameter values are not included in request log messages. | `test_directory_consistency_and_privacy.py` write and log assertions |
| A10 Server-Side Request Forgery | Directory query values are parsed as bounded enums/dates and are never fetched as URLs. | `test_directory_search.py` strict query tests; `test_security_directory.py` IDOR and input-boundary checks |

The frontend should treat directory data as transient: it is private and should
not be cached. Slot and calendar availability can change after each response;
booking remains authoritative and may reject a slot that was just listed.

## Credential file limits and handling

- Maximum upload size: **5 MiB** (`MAX_CREDENTIAL_BYTES`).
- Accepted content: **PDF, JPEG, PNG**, confirmed by magic bytes and matched filename extension when supplied.
- Images: Pillow decode and re-encode; maximum **24,000,000 pixels**; metadata is removed by re-encoding.
- PDFs: heuristic scan rejects JavaScript, launch actions, embedded files, XFA, additional/open actions, command references, and embedded `MZ` signatures. This is not a complete PDF parser or malware scanner.
- Storage: credentials are stored under `PRIVATE_MEDIA_ROOT`, outside `MEDIA_ROOT`; downloads stream only through authenticated owner or active staff-admin views. Responses use attachment disposition, `private, no-store`, and `X-Content-Type-Options: nosniff`.
- Replacement deletes the previous blob after the database transaction commits. Transaction rollback preserves the existing file.

For production deployment, the secure defaults enable HSTS for subdomains and
preload eligibility. Deploy only when every subdomain is HTTPS-capable; set
`SECURE_HSTS_INCLUDE_SUBDOMAINS=false` or `SECURE_HSTS_PRELOAD=false` where
that condition is not met.

Implementation: `rahati/credentials.py`, `rahati/storage.py`, `rahati/signals.py`, `rahati/views.py`, `rahati/admin.py`.

Tests: `rahati/tests/unit/test_credentials.py`, `test_pro_registration.py`,
`test_pro_credential_endpoints.py`, and `test_admin_professionals.py`.

## Threat model

| Threat actor / failure | Assets at risk | Mitigations | Residual risk |
| --- | --- | --- | --- |
| Patient attempts to access another account's data | Private journal, cycle, profile, session data | User-scoped querysets, role gates, consent checks, IDOR tests | Requires every new endpoint to preserve ownership and consent gates |
| Pending/rejected or compromised professional | Patient data and platform content | Verified-role gates for care/content actions; profile self-service remains role-scoped; explicit status state machine | Stolen verified credentials remain usable until password/token revocation takes effect |
| Malicious credential upload | Server, admin workstation, private documents | Size/signature/extension checks, Pillow re-encoding, PDF token heuristic, private storage, streaming headers | PDF heuristic is not full structural parsing; server-side antivirus is not configured |
| Stolen access or refresh token | Account and health data | 15-minute access expiry, refresh rotation/blacklisting, logout blacklist, password change | Access token remains usable until expiry; deployments should use HTTPS and protect client storage |
| Injection or markup payload | API clients and rendered text | Validation on public text fields; API returns JSON; private journal text is intentionally preserved as text and clients must render it escaped | Browser clients must never insert API text as trusted HTML |
| Production configuration error | All application data | Deploy checks and explicit production configuration requirements | Local defaults are development-friendly; release must set secure deployment values |

## Verification commands

From `Backend/`:

```powershell
..\.venv\Scripts\python.exe manage.py check --deploy
..\.venv\Scripts\python.exe -m coverage run --source=rahati manage.py test rahati
..\.venv\Scripts\python.exe -m coverage report -m
..\.venv\Scripts\python.exe -m pip_audit
```

The deploy check is expected to warn until production supplies HTTPS, secure
cookies, a non-development secret, and an appropriate host configuration.
