# MealFlow ↔ Personal OS — integration contract v1

Status: implemented on branch `personal-os/mf1` (MF1), corrected after QA MF1 (2026-10-11); see
[Changes since v1 draft](#changes-since-v1-draft). v1.1 (MF3, 2026-11-05) adds
`POST /shopping-lists/active`, additively; see [v1.1](#v11-2026-11-05-mf3). v1.2 (MF4, 2026-11-08) adds
`POST /shopping-lists/active/from-plan`, `PATCH /meal-plans/{planId}/entries/{entryId}` and the entries'
`items`/`extraItems`, additively; see [v1.2](#v12-2026-11-08-mf4). Personal OS's MealFlow
connector (C2) is written against this document. Machine-readable version:
[`personal-os-v1.openapi.yaml`](personal-os-v1.openapi.yaml) (`info.version` 1.2.0).

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
| PATCH | `/meal-plans/{planId}/entries/{entryId}` | mealplan.write | *v1.2.* Body `{"day"?, "section"?}` (at least one). Moves the entry within the same plan; 200 + the plan + `ETag`. `Idempotency-Key`; `If-Match`. See [Moving an entry](#moving-an-entry) |
| DELETE | `/meal-plans/{planId}/entries/{entryId}` | mealplan.write | `Idempotency-Key`; `If-Match` |
| GET | `/shopping-lists?status=` | shoppinglist.read | Summaries (item and checked counts); optional `status=active\|archived` (case-insensitive, other values 400) |
| GET | `/shopping-lists/{id}` | shoppinglist.read | |
| POST | `/shopping-lists/active` | shoppinglist.write | *v1.1.* No body. Returns the user's active list: **200** if one exists (nothing written), else **201** with a new empty one + `Location: /integrations/v1/shopping-lists/{id}`. `ETag` on both. `Idempotency-Key` required. See [The active list](#the-active-list) |
| POST | `/shopping-lists/active/from-plan` | shoppinglist.write **+** mealplan.read | *v1.2.* Body `{"week": "current"\|"next"}`. Adds the week's plan to the active list (created if missing) as the app does; 200 + the list + `ETag` + `added`/`merged`; 422 `plan_empty`. `Idempotency-Key` required. See [A list from the plan](#a-list-from-the-plan) |
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

// POST /shopping-lists/active   (Idempotency-Key: 2b7e…, no body), user has no active list
// → 201, Location: /integrations/v1/shopping-lists/6720…, ETag: "1793873600123"
{ "id": "6720…", "title": null, "status": "active", "items": [],
  "updatedAt": "2026-11-05T10:13:20.123Z", "version": 1793873600123 }
// Same call when an active list exists → 200, ETag as GET /shopping-lists/{id}, body exactly as that GET

// v1.2: GET /meal-plans/current — every entry also carries its own items (read-only, never null)
{ …, "entries": [{ "id": "…", "day": "WED", "section": "Dinner", "recipeId": null,
                   "customTitle": "Tacos", "title": "Tacos", "notes": null, "portions": 4,
                   "items": ["Tortillas", "Köttfärs"], "extraItems": ["Lime"] }], … }

// v1.2: PATCH /meal-plans/{planId}/entries/{entryId}   (Idempotency-Key: 9a1d…, If-Match: "1793873600123")
{ "day": "thursday" }                       // or { "section": "Lunch" } or both
// → 200, ETag: "1793873600456", body = the whole plan (as GET /meal-plans/{week}) with the entry moved

// v1.2: POST /shopping-lists/active/from-plan   (Idempotency-Key: 4c0f…)
{ "week": "current" }
// → 200, ETag: "1793873600789"
{ "id": "6720…", "title": "Week 46 Shopping List", "status": "active",
  "items": [{ "id": "…", "name": "Köttfärs", "quantity": 900, "unit": "g", "checked": false, "category": "meat" }, …],
  "updatedAt": "2026-11-08T10:13:20.789Z", "version": 1793873600789, "added": 3, "merged": 2 }
// Nothing planned that week → 422
{ "type": "about:blank", "title": "Unprocessable Content", "status": 422,
  "detail": "The week's meal plan has nothing to put on a shopping list", "path": "…", "timestamp": "…",
  "code": "plan_empty" }
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
- Entries in responses carry `items` and `extraItems` (v1.2): the entry's own shopping items as the app
  stores them. Read-only: they cannot be set through this API. Never null (`[]` when there are none).

#### Moving an entry

`PATCH /meal-plans/{planId}/entries/{entryId}` (v1.2), body `{"day"?, "section"?}`:

- At least one of `day` / `section`; an omitted or `null` field is unchanged. `{}` is **400**.
- `day` follows the same rules as when adding (`thursday`, `Thu`, `THU`; stored and returned as `THU`);
  anything else is **400**.
- `section` must match one of the plan's `sections`, case-insensitively; the plan's spelling is stored. A
  blank section is **400**; an unknown one is **422** with `code: "unknown_section"` (the `detail` lists
  the plan's sections).
- Only day and section change. The entry keeps its id, recipe, title, portions, notes, items and its
  place in `entries`. Moving it where it already is writes nothing (same `ETag`).
- Within the same plan (week) only; moving to another week is not supported.
- `If-Match` with the plan's ETag, as for the other plan writes: a stale one is **412** and nothing is
  written. Another user's plan or entry, or an unknown one: **404**. Order of checks: plan (404),
  `If-Match` (412), entry (404), body (400/422).
- Response: **200**, the whole plan (as `GET /meal-plans/{week}`) with its new `ETag`.

**Shopping lists**

- `category` on items is always **lower case**: `produce`, `meat`, `dairy`, `bread`, `pantry`,
  `frozen`, `drinks` or `other`. MealFlow assigns it from the item name; it cannot be set through this API.
- `status` is `active` or `archived`. `GET /shopping-lists?status=active|archived` filters
  (case-insensitive); without it all lists are returned; any other value is 400.
- New item: `name` required (not blank, max 80), `quantity` ≥ 0 optional, `unit` max 20 optional.

#### The active list

- A user has **at most one** list with `status: active`. It is the list the MealFlow app shows as
  "current"; the others are archived. The app and this API keep that invariant: making a list active in
  the app archives the previous active one, and archiving the active list creates a new empty one.
- A user who never opened the shopping list in the app may have **no** list at all. Call
  `POST /shopping-lists/active` before adding items when you don't hold a list id:
  - an active list exists → **200**, its body and `ETag` exactly as `GET /shopping-lists/{id}`; nothing is written;
  - no active list → **201**, a new empty active list (`title: null`, no items), `Location` and `ETag`.
- Concurrent calls (any keys) never produce a second active list: one gets 201, the rest 200 with the same id.
- A request body, if sent, is ignored. `If-Match` is not used.
- The active list can change later (the user archives it in the app). On a 404 for a list id you held,
  call `POST /shopping-lists/active` again.

#### A list from the plan

`POST /shopping-lists/active/from-plan` (v1.2), body `{"week": "current"|"next"}` (case-insensitive; other
values **400**). Needs **both** `shoppinglist.write` and `mealplan.read` (either missing: **403**).

- **Nothing to buy:** the week has no plan, or its entries put nothing on a list (e.g. only recipes
  without ingredients) → **422** with `code: "plan_empty"`. Nothing is written; the active list is not
  even created.
- Otherwise the user's single active list is made sure of (as `POST /shopping-lists/active`) and the
  week's plan is added to it **exactly as the MealFlow app's "shopping list from plan" adds it**:
  - recipe ingredients scaled to the entry's portions (recipe portions → entry portions), plus each
    entry's own `items`/`extraItems`; a custom-title entry without items adds its title;
  - names normalized to product names (e.g. "Gul lök, hackad" → "Gul lök") and aisles assigned;
  - a line whose (normalized) name is already on the list is **merged**: amounts are summed when the
    units are of the same family (g/kg, dl/l, st/stycken), an amount-less line takes the amount, and an
    amount-less duplicate ("salt") is absorbed. Different unit families (1 dl vs 100 g) and **checked**
    lines are not merged into: the item goes on a new line beside;
  - a list without a title gets the app's `"Week N Shopping List"`; an existing title is kept.
- **Response:** **200**, the list exactly as `GET /shopping-lists/{id}` plus `added` (new lines) and
  `merged` (existing lines the plan went into), with the list's `ETag`.
- It **adds** the plan each time it succeeds: a second call with a new key sums the amounts again (as
  pressing the button twice in the app does). Retry a failed or unanswered call with the **same**
  `Idempotency-Key`.
- A concurrent change to the list while the plan is being merged is retried on a fresh read (up to 3
  attempts, then **412**). `If-Match` is not used.
- A plan entry whose recipe no longer exists answers **400** (as in the app), nothing written.

### Idempotency

- Every write (POST, PATCH, DELETE) must send `Idempotency-Key` (1–255 visible ASCII chars). A write without it gets
  **400**.
- Keys are scoped per user and client. They are kept for **24 h**.
- Same key and same request (method, path, `If-Match`, body): the stored response is replayed with the same status,
  body, `ETag` and `Location`, plus the header `Idempotency-Replayed: true`. The write is not repeated.
- Same key with a different request: **422**.
- Same key while the original request is still running: **409**. Retry later.
- If the original attempt failed (non-2xx), the key is released and may be retried.
- `POST /shopping-lists/active` follows the same rules: a replayed key returns the **first** response
  (201 or 200, same body, `ETag`, `Location`), even if the list has changed since.
- So do `POST /shopping-lists/active/from-plan` and `PATCH /meal-plans/{planId}/entries/{entryId}` (v1.2):
  a replayed key returns the first response and does not add the plan or move the entry again. A 422
  `plan_empty` releases the key.

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
validation), `param` and `value` (bad query or path parameter), `retryAfterSeconds` (429) and, since
v1.2, `code` (a stable reason on some 422s: `plan_empty`, `unknown_section`). Ignore fields you don't know.

| Status | Meaning |
|---|---|
| 400 | Validation error (see [Field rules](#field-rules)), malformed JSON or missing `Idempotency-Key` |
| 401 | Token not accepted |
| 403 | Scope missing |
| 404 | Not found, or not yours |
| 405 | Method not supported on this path (`Allow` lists the supported ones) |
| 406 | `Accept` excludes JSON (the API only produces `application/json` / `application/problem+json`) |
| 409 | Idempotent request still in flight; or (`POST /shopping-lists/active`, rare) another change to the user's active list did not finish in time |
| 412 | Version mismatch |
| 415 | Request body is not `application/json` |
| 422 | Idempotency key reused with a different request; or (v1.2) `code: plan_empty` — the week has nothing to put on a list; or `code: unknown_section` — moving an entry to a section the plan doesn't have |
| 429 | Rate limited |

All 4xx are final for the request as sent; only 409, 429 and 5xx are worth retrying (same
`Idempotency-Key`).

## Changes

### v1.2 (2026-11-08, MF4)

Additive. Nothing existing changes shape, status code or scope; no new OAuth scope; older Personal OS
builds keep working (they ignore the new entry fields and the problem `code`).

| Area | Change |
|---|---|
| New route | `POST /integrations/v1/shopping-lists/active/from-plan`, body `{"week": "current"\|"next"}`, scopes `shoppinglist.write` + `mealplan.read`, `Idempotency-Key` required: the week's plan added to the active list as the app does; 200 + list + `ETag` + `added`/`merged`; 422 `plan_empty`. See [A list from the plan](#a-list-from-the-plan) |
| New route | `PATCH /integrations/v1/meal-plans/{planId}/entries/{entryId}`, body `{"day"?, "section"?}`, scope `mealplan.write`, `Idempotency-Key`, `If-Match`: moves an entry within its plan; 200 + plan + `ETag`; 412 stale; 404 unknown/foreign; 422 `unknown_section`. See [Moving an entry](#moving-an-entry) |
| `MealPlanEntry` | New read-only fields `items` and `extraItems` (string arrays, never null) |
| Problem | Optional `code` field on the new 422s (`plan_empty`, `unknown_section`) |
| 422 | Also used for the two cases above (before: only idempotency-key reuse) |
| yaml | `info.version` 1.2.0; the two paths; schemas `FromPlan`, `ShoppingListFromPlan`, `MoveMealPlanEntry`; `MealPlanEntry.items/extraItems`; `Problem.code` |

### v1.1 (2026-11-05, MF3)

Additive. Nothing existing changes shape, status code or scope; older Personal OS builds keep working.

| Area | Change |
|---|---|
| New route | `POST /integrations/v1/shopping-lists/active` (scope `shoppinglist.write`, `Idempotency-Key` required, no body): 200 with the existing active list, or 201 + `Location` with a new empty one. See [The active list](#the-active-list) |
| One active list | Documented: at most one `active` list per user. App-side fix: `PATCH /api/shopping-lists/{id}` with `status: active` now archives the previous active list (it could leave two before) |
| 409 | May also come from `POST /shopping-lists/active` when a concurrent change to the user's active list holds it for more than a few seconds. Retry with the same key |
| yaml | `info.version` 1.1.0; path `/shopping-lists/active` |

### Changes since v1 draft

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
