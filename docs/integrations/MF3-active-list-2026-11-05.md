# MF3 — Personal OS can make sure there is an active shopping list (owner pass, app-api)

Alexander, 2026-11-05: when MealFlow is connected, Personal OS uses MealFlow's shopping list. MealFlow keeps exactly one
**active** list per user: `ShoppingListService.ensureActiveList` (`services/app-api/.../shoppingLists/ShoppingListService.java:241-251`)
picks the most recently updated active list, or creates an empty one. The app calls it when the list screen opens. The
integration API (`/integrations/v1/shopping-lists`, contract `docs/integrations/personal-os-v1.md`) has no way to do
that. So a user who never opened the list in the app has no list, and Personal OS cannot add anything.

## What to do
1. **`POST /integrations/v1/shopping-lists/active`.** Scope `shoppinglist.write`; `Idempotency-Key` required, as on the
   other writes; no body.
   - **An active list already exists:** return it, 200, with its `ETag`, exactly as `GET /shopping-lists/{id}` does.
     Nothing is written.
   - **No active list:** create one empty active list, as `ensureActiveList` does (the same title and fields). Return
     201 with a `Location` header and an `ETag`.
   - **Never more than one active list.** That holds for concurrent calls and for a replayed key, which returns the
     first response, as the other writes do.
   - Same isolation, rate limits, audit and problem responses as the existing integration writes.
2. **At most one active list, in the app's own API too.** `PATCH /api/shopping-lists/{id}` with `status: active` on an
   archived list does not check for another active list today (`ShoppingListService.java:131-134`). When a list is made
   active, archive the other active list (the app's "current" list becomes this one). Say in the report if the app's UI
   expects anything else.
3. **The contract.** Add the route to `docs/integrations/personal-os-v1.md` (the endpoint table, an example, idempotency,
   errors) and to `personal-os-v1.openapi.yaml`, as an additive change (v1.1). Note it under "Changes". Nothing existing
   changes shape.

## Must hold
- No existing endpoint, payload, scope or status code changes. Old Personal OS builds keep working.
- No new OAuth scope. The OAuth server (identity-service) is not touched.
- Follow `CLAUDE.md` and the repo's conventions. User-facing strings go through i18n (none are expected here).

## Tests and deliver
Integration tests in app-api's existing style:
- no list → 201 and exactly one active list;
- an active list → 200, the same id, nothing written;
- two concurrent calls → one list;
- the same key replayed → the same response, no second list;
- missing key → 400; wrong scope → 403; another user's lists are never returned;
- the PATCH fix: activating an archived list leaves exactly one active list.

Run app-api's test suite. Report `docs/integrations/MF3-report-<date>.md` with commands and results. Push branch
`mf3-active-list`; no PR, no merge. Alexander deploys app-api after review
(`railway up services/app-api --path-as-root --service app-api`, as in `MF1-golive-2026-10-26.md`).
