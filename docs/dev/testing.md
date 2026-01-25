# Testing – MealFlow

This document describes the **current test coverage** in the repo and why
we chose this scope.

---

## Current Coverage

### Backend (Spring Boot)

Both backend services use **JUnit 5** with **Spring Boot test support** and
**Testcontainers** for MongoDB.

**App API tests** (examples):
- Controller integration tests (`*ControllerIT`) for recipes, weekly plans,
  shopping lists, and profile.
- Service-level tests for shopping list generation.
- Rate limit integration tests.
- End-to-end auth flow integration test.

**Identity Service tests** (examples):
- Auth controller integration tests.
- Refresh token and access token service integration tests.
- Rate limit integration tests.

MongoDB runs via Testcontainers by default; environment variables can override
connection details for local setups.

### Frontend (Expo)

There is **no automated frontend test suite configured** at the moment.
Validation is done via manual QA in Expo (web + device) and by relying on
backend contract tests to keep API behavior stable.

---

## Why this approach

- **Integration-first backend testing**: the App API and Identity Service are
  heavily IO- and persistence-focused, so integration tests provide the most
  confidence.
- **Real MongoDB via Testcontainers**: prevents false positives from mocked
  persistence and aligns tests with production behavior.
- **Thin frontend logic**: most logic lives in hooks and API modules; at the
  current stage, manual QA has been sufficient and faster to iterate.

---

## How to run

### App API

```bash
cd services/app-api
./mvnw test
```

### Identity Service

```bash
cd services/identity-service
./mvnw test
```

If you want to run tests against an external MongoDB, set one of:

- `SPRING_DATA_MONGODB_URI`
- `SPRING_MONGODB_URI`
- `APP_API_MONGODB_URI`

---

## Future Improvements

Potential additions as the project grows:
- Frontend unit tests for hooks and UI components.
- Contract tests between Expo client and App API.
- CI test pipeline for both services and linting.
