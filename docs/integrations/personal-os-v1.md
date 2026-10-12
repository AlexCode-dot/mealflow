# MealFlow ↔ Personal OS — integration contract v1

Status: implemented on branch `personal-os/mf1` (MF1), corrected after QA MF1 (2026-10-11); see
[Changes since v1 draft](#changes-since-v1-draft). Personal OS's MealFlow connector (C2) is written
against this document. Machine-readable version: [`personal-os-v1.openapi.yaml`](personal-os-v1.openapi.yaml)
(`info.version` 1.0.1).

Two services take part:

| Service | Role | Local base URL |
|---|---|---|
| identity-service | OAuth 2.0 authorization server (Spring Authorization Server) | `http://localhost:8081` |
| app-api | Resource server, integration API under `/integrations/v1` | `http://localhost:8082` |

## OAuth 2.0 (authorization server)

**Grant:** authorization code + PKCE only. `code_challenge_method=S256` is required; `plain` and
missing PKCE are refused. No implicit, password or client-credentials grant.

**Client:** one confidential client (called `personal-os` below; the actual `client_id` is whatever
`PERSONAL_OS_OAUTH_CLIENT_ID` is set to). Its id, secret and exact redirect URI(s) come from
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
  - `client_id`: the configured client id (`PERSONAL_OS_OAUTH_CLIENT_ID`)
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
| POST | `/recipes` | recipes.write | `Idempotency-Key` required; 201 + `Location: /integrations/v1/recipes/{id}` |
| PATCH | `/recipes/{id}` | recipes.write | Partial update; `Idempotency-Key`; `If-Match` honoured |
| GET | `/meal-plans/current` · `/meal-plans/next` | mealplan.read | Week starts Monday, Europe/Stockholm; an empty week returns a plan with no entries, `version` 0 and ETag `"0"` |
| POST | `/meal-plans/{current\|next}/entries` | mealplan.write | `Idempotency-Key`; `If-Match` on the plan; 201 + `Location: /integrations/v1/meal-plans/{planId}/entries/{entryId}` |
| DELETE | `/meal-plans/{planId}/entries/{entryId}` | mealplan.write | `Idempotency-Key`; `If-Match` |
| GET | `/shopping-lists?status=` | shoppinglist.read | Summaries (item and checked counts); optional `status=active\|archived` (case-insensitive, other values 400) |
| GET | `/shopping-lists/{id}` | shoppinglist.read | |
| POST | `/shopping-lists/{id}/items` | shoppinglist.write | `Idempotency-Key`; `If-Match`; 201 + `Location: /integrations/v1/shopping-lists/{id}/items/{itemId}` |
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

// GET /meal-plans/current → 200, ETag: "1760195000123"
{ "id": "…", "weekStart": "2026-10-05", "sections": ["Breakfast", "Lunch", "Dinner"],
  "entries": [{ "id": "…", "day": "MON", "section": "Dinner", "recipeId": "…",
                "customTitle": null, "title": "Linsgryta", "notes": null, "portions": 4 }],
  "updatedAt": "…", "version": 1760195000123 }

// GET /meal-plans/next with nothing planned yet → 200, ETag: "0"
{ "id": null, "weekStart": "2026-10-12", "sections": ["Breakfast", "Lunch", "Dinner"],
  "entries": [], "updatedAt": null, "version": 0 }

// POST /meal-plans/next/entries   (day may also be "TUE"; the response says "TUE")
{ "day": "tuesday", "section": "Dinner", "recipeId": "…", "portions": 2 }

// GET /shopping-lists/{id}
{ "id": "…", "title": "Vecka 41", "status": "active",
  "items": [{ "id": "…", "name": "Mjölk", "quantity": 1, "unit": "l", "checked": false, "category": "dairy" }],
  "updatedAt": "…", "version": 1760195000123 }

// POST /shopping-lists/{id}/items
{ "name": "Bananer", "quantity": 6, "unit": "st" }
```

### Field rules

All violations answer **400** (problem+json; bean-validation errors list the fields in `errors[]`).
Limits not repeated here are in the yaml.

**Recipes (`CreateRecipe`, `UpdateRecipe`)**

- `title`: required on create, 1–120 chars, not blank. On PATCH every field is optional (omitted or
  `null` = unchanged; a list that is sent replaces the stored list); a `title` that is sent must not be blank.
- `category`: free text (e.g. `"Middag"`), up to 80 chars; not an enum and not case-normalised to a fixed set.
- `steps[]` and `tags[]` items must not be blank.
- **Ingredient:** `name` required, not blank, **max 80 chars**. `quantity` is optional; when set it
  must be **> 0**, and then **`unit` is required** (not blank, max 20). `unit` alone, without
  `quantity`, is allowed (`{ "name": "salt", "unit": "nypa" }`).

**Meal-plan entries (`AddMealPlanEntry`)**

- `day`: `MON`…`SUN` **or** `monday`…`sunday`, case-insensitive (`tuesday`, `Tue`, `TUE` are all
  fine). Responses always use **`MON`…`SUN`**. Anything else is 400.
- **Exactly one** of `recipeId` / `customTitle` must be set (non-blank). Both or neither is 400.
- `recipeId` must be one of the caller's own recipes. An unknown id and another user's id both give
  **400** with the same message (not 404), so existence is not leaked.
- `section`:
  - Week without a plan yet (`id: null`): any non-blank section (max 40) is accepted. The plan is
    created with sections `Breakfast`, `Lunch`, `Dinner` plus the given section if it is not one of
    them (case-insensitive).
  - Existing plan: `section` must match one of the plan's `sections`, case-insensitively; the plan's
    spelling is stored. Anything else is 400. Read the plan first and pick from its `sections`.
- `portions`: 1–1000; `notes` up to 500 chars.

**Shopping lists**

- `category` on items is always **lower case**: `produce`, `meat`, `dairy`, `bread`, `pantry`,
  `frozen`, `drinks` or `other`. MealFlow assigns it from the item name; it cannot be set through this API.
- `status` is `active` or `archived`. `GET /shopping-lists?status=active|archived` filters
  (case-insensitive); without it all lists are returned; any other value is 400.
- New item: `name` required (not blank, max 80), `quantity` ≥ 0 optional, `unit` max 20 optional.

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
- An **empty week** (no plan stored yet) has `version` **0** and ETag **`"0"`**, stable until the first
  entry is added. `POST …/entries` with `If-Match: "0"` (or `*`) succeeds while the week is still empty;
  any other value gives 412. After the first entry the plan has a real version and `"0"` is stale.
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

Problem JSON: `{ "type", "title", "status", "detail", "path", "timestamp" }`, always with
`Content-Type: application/problem+json`. Some errors add fields: `errors[]` (`{field, message}`, bean
validation), `param` and `value` (bad query or path parameter) and `retryAfterSeconds` (429). Ignore
fields you don't know.

| Status | Meaning |
|---|---|
| 400 | Validation error (see [Field rules](#field-rules)), malformed JSON or missing `Idempotency-Key` |
| 401 | Token not accepted |
| 403 | Scope missing |
| 404 | Not found, or not yours |
| 405 | Method not supported on this path (`Allow` lists the supported ones) |
| 406 | `Accept` excludes JSON (the API only produces `application/json` / `application/problem+json`) |
| 409 | Idempotent request still in flight |
| 412 | Version mismatch |
| 415 | Request body is not `application/json` |
| 422 | Idempotency key reused with a different request |
| 429 | Rate limited |

All 4xx are final for the request as sent; only 409, 429 and 5xx are worth retrying (same
`Idempotency-Key`).

## Changes since v1 draft

Corrections after QA MF1 (2026-10-11, `QA-MF1-2026-10-11.md`, drifts D1–D10). MealFlow's validation
rules were kept; the contract now states them exactly. Where the contract's form was friendlier and
safe, the API accepts it too. `QaMf1ContractConformanceIT` pins every item below. **Personal OS C2:**
adjust the connector from this list.

| # | Area | v1 draft said | Now (contract = code) | Code change? |
|---|---|---|---|---|
| D1 | Meal-plan entry `day` | `"monday"` / `"tuesday"` (examples only) | Accepts `MON`…`SUN` **and** `monday`…`sunday`, case-insensitive. Always **returned as `MON`…`SUN`**. Other values 400. | Yes: full day names accepted |
| D2 | `Ingredient.name` | maxLength 120 (yaml) | **maxLength 80**, not blank | No (doc) |
| D3 | `Ingredient.quantity` / `unit` | quantity number or null, unit optional | `quantity` **> 0** when set, and then **`unit` required**; unit alone allowed | No (doc) |
| D4 | ETag on an empty week | "every resource response carries an ETag", but the empty week had none and `version: null` | Empty week: **ETag `"0"`, `version: 0`** (`id`, `updatedAt` still null). `If-Match: "0"` or `*` works on the empty week | Yes: ETag/version 0; `If-Match: "0"` accepted (was 412 for any `If-Match`) |
| D5 | Unsupported method | (500) | **405** problem+json with `Allow` | Yes |
| D6 | Unsupported media type / Accept | (500) | **415** (body not JSON) and **406** (`Accept` excludes JSON), problem+json | Yes |
| D7 | `UpdateRecipe` schema | `allOf: [CreateRecipe]`, which kept `required: [title]` | Standalone schema, **no required fields**, nullable fields; `title` not blank if sent | No (yaml) |
| D8 | Meal-plan `section` | example `"Middag"`, rule undocumented | New plan: Breakfast/Lunch/Dinner + the given section. Existing plan: must be one of its `sections` (case-insensitive), else 400 | No (doc) |
| D9 | `recipeId` / `customTitle` | undocumented | Exactly one of them; unknown or foreign `recipeId` is **400** (not 404) | No (doc) |
| D10 | Minor | shopping `category` shown as `"DAIRY"`; `?status=` undocumented; `Location` not in yaml; extra problem fields undocumented; `client_id` shown as literal `personal-os` | `category` is **lower case** (fixed enum); `GET /shopping-lists?status=active\|archived`; `Location` on all three POSTs; problem extras (`errors`, `param`, `value`, `retryAfterSeconds`) documented; `client_id` = configured id | No (doc) |

Also tightened in the yaml to match existing validation: `title`, `steps[]`, `tags[]`, item and ingredient
`name` are not blank (`minLength: 1`); `MealPlanEntry.day` has the response enum; `info.version` is 1.0.1.
Unchanged: paths, methods, scopes, OAuth flow, tokens, idempotency, rate limits, isolation.
