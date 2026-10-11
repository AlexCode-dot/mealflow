# MealFlow ↔ Personal OS — integration contract v1

Status: implemented on branch `personal-os/mf1` (MF1). Personal OS's MealFlow connector (C2) is written
against this document. Machine-readable version: [`personal-os-v1.openapi.yaml`](personal-os-v1.openapi.yaml).

Two services take part:

| Service | Role | Local base URL |
|---|---|---|
| identity-service | OAuth 2.0 authorization server (Spring Authorization Server) | `http://localhost:8081` |
| app-api | Resource server, integration API under `/integrations/v1` | `http://localhost:8082` |

## OAuth 2.0 (authorization server)

**Grant:** authorization code + PKCE only. `code_challenge_method=S256` is required; `plain` and
missing PKCE are refused. No implicit, password or client-credentials grant.

**Client:** one confidential client, `personal-os`. Its id, secret and exact redirect URI(s) come from
configuration (`PERSONAL_OS_OAUTH_CLIENT_ID`, `PERSONAL_OS_OAUTH_CLIENT_SECRET`,
`PERSONAL_OS_OAUTH_REDIRECT_URIS`, comma-separated). Nothing is registered unless all three are set.
Client authentication is `client_secret_basic` (preferred) or `client_secret_post`. The redirect URI
must match a registered URI exactly; otherwise the server answers 400 and does not redirect.

**Endpoints (identity-service):**

| Endpoint | Purpose |
|---|---|
| `GET /oauth2/authorize` | Starts the flow in the browser: MealFlow login (or sign-up + email code), then consent |
| `POST /oauth2/token` | `authorization_code` and `refresh_token` grants |
| `POST /oauth2/revoke` | RFC 7009 revocation (client-authenticated) |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 metadata |
| `GET /oauth2/jwks` (also `/.well-known/jwks.json`) | Signing keys (RS256, kid `mealflow-identity-rs256`) |

**Scopes:**

| Scope | Allows | Consent text (EN / SV) |
|---|---|---|
| `recipes.read` | List, search and read recipes | See your recipes / Se dina recept |
| `recipes.write` | Create and update recipes | Add new recipes and edit your recipes / Lägga till nya recept och ändra dina recept |
| `mealplan.read` | Read this and next week's meal plan | See your meal plan for this week and next week / Se din matplanering för den här och nästa vecka |
| `mealplan.write` | Add/remove meal-plan entries | Add and remove meals in your meal plan / Lägga till och ta bort måltider i din matplanering |
| `shoppinglist.read` | Read shopping lists | See your shopping lists / Se dina inköpslistor |
| `shoppinglist.write` | Add/remove/check items | Add, remove and check off items on your shopping lists / Lägga till, ta bort och bocka av varor på dina inköpslistor |

The user can untick scopes on the consent screen. The token response's `scope` lists what was actually
granted. "Deny" redirects with `error=access_denied`.

**Login:** the user signs in with their own MealFlow account on MealFlow's pages (`/oauth/login`).
The checks are the same as the app login: argon2 password, verified email, disabled or deleted accounts
blocked. Rate limits are shared with `/auth/login`. New users can create an account (`/oauth/signup`)
and confirm the emailed code (`/oauth/verify`), then continue to consent. Personal OS never sees
credentials. The pages are in English and Swedish, chosen from `Accept-Language`.

**Tokens:**

- Access token: JWT RS256, **5 minutes**. Claims:
  - `iss`: identity issuer
  - `sub`: MealFlow user id
  - `aud`: `mealflow-integrations` (serialized as a string)
  - `client_id`: `personal-os`
  - `scope`: JSON array
  - `gid`: grant id
  - `iat`, `nbf`, `exp`, `jti`

  These tokens are accepted **only** on app-api `/integrations/v1/**`. Both services' first-party APIs
  reject any token that carries an `aud` or `client_id`.
- Refresh token: opaque, **30 days**, **rotates on every use**. The response always contains a new
  `refresh_token`; store it and discard the old one.
- **Reuse detection:** presenting a rotated-out refresh token again is treated as a leak. The whole grant
  (token family) is deleted: the newest refresh token stops working too, and so do access tokens (within
  the app-api grant cache, ≤ 30 s). The user must connect again.
- Replaying an authorization code fails with `invalid_grant` and invalidates the tokens issued from it.
- Token values are never stored by MealFlow (SHA-256 hashes only) and never logged or audited.

**Disconnect:**

- From Personal OS: `POST /oauth2/revoke` with the refresh token. This invalidates the refresh and access
  tokens; app-api rejects the access token within ≤ 30 s.
- From MealFlow: in the app under *Settings → Connected apps*, or with
  `DELETE /account/connections/{clientId}` using a first-party token. This deletes all grants and consent.
  `GET /account/connections` lists connected apps with their scopes.
- Deleting the MealFlow account removes every grant.

**Errors:** standard OAuth error JSON (`invalid_request`, `invalid_client`, `invalid_grant`,
`unsupported_grant_type`, `invalid_scope`) with HTTP 400/401. A rate limit returns 429 with `Retry-After`.

**Rate limits (per IP, per minute, configurable):**

| Endpoint | Limit |
|---|---|
| token | 30 |
| revoke | 30 |
| authorize | 60 |
| login | shares the API login limit (10) |
| sign-up | shares the API register limit (5) |
| email code | shares the API verify-email limit (20) |

**Audit (identity `audit_events`, no token values):**

- `auth.login` / `auth.register` / `auth.email_verified` with `channel=oauth`
- `oauth.consent_granted`
- `oauth.token_issued` (grant type, scopes)
- `oauth.token_revoked`
- `oauth.access_revoked_by_user`
- `security.token_reuse_detected`

## Integration API (app-api)

Base: `{APP_API}/integrations/v1`. Auth: `Authorization: Bearer <access token>`. JSON in and out, and
errors are `application/problem+json`.

### Endpoints and scopes

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | `/recipes?q=&limit=&cursor=` | recipes.read | Search over title/tags; `limit` 1–100 (default 20); opaque `nextCursor` |
| GET | `/recipes/{id}` | recipes.read | |
| POST | `/recipes` | recipes.write | `Idempotency-Key` required; 201 + `Location` |
| PATCH | `/recipes/{id}` | recipes.write | Partial update; `Idempotency-Key`; `If-Match` honoured |
| GET | `/meal-plans/current` · `/meal-plans/next` | mealplan.read | Week starts Monday, Europe/Stockholm; an empty week returns a plan with no entries |
| POST | `/meal-plans/{current\|next}/entries` | mealplan.write | `Idempotency-Key`; `If-Match` on the plan |
| DELETE | `/meal-plans/{planId}/entries/{entryId}` | mealplan.write | `Idempotency-Key`; `If-Match` |
| GET | `/shopping-lists` | shoppinglist.read | Summaries (item and checked counts) |
| GET | `/shopping-lists/{id}` | shoppinglist.read | |
| POST | `/shopping-lists/{id}/items` | shoppinglist.write | `Idempotency-Key`; `If-Match` |
| PATCH | `/shopping-lists/{id}/items/{itemId}` | shoppinglist.write | Body `{"checked": true\|false}`; `Idempotency-Key`; `If-Match` |
| DELETE | `/shopping-lists/{id}/items/{itemId}` | shoppinglist.write | `Idempotency-Key`; `If-Match` |

A token without the required scope gets **403**; a read-only token can never write. A token that is
invalid, expired, has the wrong audience, is first-party, or belongs to a revoked or disconnected grant
gets **401**.

### Payloads (examples)

```json
// GET /recipes/{id}  → 200, ETag: "1760195000123"
{ "id": "6650…", "title": "Pasta pomodoro", "description": "…",
  "ingredients": [{ "name": "Tomater", "quantity": 400, "unit": "g" }],
  "steps": ["Koka pastan", "…"], "cookingTimeMinutes": 25, "portions": 4,
  "category": "Middag", "tags": ["vegetariskt"], "imageUrl": null,
  "createdAt": "2026-10-11T08:00:00Z", "updatedAt": "2026-10-11T08:03:20.123Z", "version": 1760195000123 }

// POST /recipes   (Idempotency-Key: 6f1c…)
{ "title": "Linsgryta", "ingredients": [{ "name": "Röda linser", "quantity": 2, "unit": "dl" }],
  "steps": ["…"], "portions": 4, "tags": ["vegetariskt"] }

// GET /meal-plans/current → 200, ETag
{ "id": "…", "weekStart": "2026-10-05", "sections": ["Middag"],
  "entries": [{ "id": "…", "day": "monday", "section": "Middag", "recipeId": "…",
                "customTitle": null, "title": "Linsgryta", "notes": null, "portions": 4 }],
  "updatedAt": "…", "version": 1760195000123 }

// POST /meal-plans/next/entries
{ "day": "tuesday", "section": "Middag", "recipeId": "…", "portions": 2 }

// GET /shopping-lists/{id}
{ "id": "…", "title": "Vecka 41", "status": "active",
  "items": [{ "id": "…", "name": "Mjölk", "quantity": 1, "unit": "l", "checked": false, "category": "DAIRY" }],
  "updatedAt": "…", "version": 1760195000123 }

// POST /shopping-lists/{id}/items
{ "name": "Bananer", "quantity": 6, "unit": "st" }
```

### Idempotency

- Every write (POST, PATCH, DELETE) must send `Idempotency-Key` (1–255 visible ASCII chars). A write without it gets
  **400**.
- Keys are scoped per user and client. They are kept for **24 h**.
- Same key and same request (method, path, `If-Match`, body): the stored response is replayed with the same status,
  body, `ETag` and `Location`, plus the header `Idempotency-Replayed: true`. The write is not repeated.
- Same key with a different request: **422**.
- Same key while the original request is still running: **409**. Retry later.
- If the original attempt failed (non-2xx), the key is released and may be retried.

### Versions, ETag and If-Match

- Every resource response carries an `ETag` header (`"<version>"`) and a `version` field (epoch millis of
  `updatedAt`). For meal-plan entries and shopping-list items the version is the parent plan's or list's.
- Send `If-Match: "<version>"` on a write to make it conditional. If the resource has changed you get
  **412** and nothing is written. Writes are compare-and-set in Mongo, so a concurrent change between
  read and write also gives 412.
- `If-Match` is optional; without it the write applies to the current version.

### Isolation

- All queries filter on the token's `sub`.
- Another user's ids answer **404**, exactly like ids that don't exist, so existence is never leaked.
- Lists only ever contain the token owner's data.

### Rate limits and audit

- `/integrations/**` is limited to **60 requests per minute** per user and client
  (`RATE_LIMIT_INTEGRATIONS_PER_MINUTE`). Over the limit the API returns 429 with `Retry-After`.
- Each request logs one `integration_audit` line with userId, clientId, gid, method, path and status. No
  token values or bodies are logged.

### Errors

Problem JSON: `{ "type", "title", "status", "detail", "path", "timestamp" }`.

| Status | Meaning |
|---|---|
| 400 | Validation error or missing `Idempotency-Key` |
| 401 | Token not accepted |
| 403 | Scope missing |
| 404 | Not found, or not yours |
| 409 | Idempotent request still in flight |
| 412 | Version mismatch |
| 422 | Idempotency key reused with a different request |
| 429 | Rate limited |
