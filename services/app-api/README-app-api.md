# App API – MealFlow

The **App API** is the domain backend for MealFlow.

It contains all business logic related to:
- recipes
- weekly meal planning
- shopping lists
- user preferences

The App API is **stateless** and secured using **JWT access tokens** issued by the Identity Service.

---

## Authentication model

- All `/api/**` endpoints require a valid **JWT access token**
- Tokens are **not issued here**
- JWTs are:
  - signed by the Identity Service (RS256)
  - verified locally using **JWKS**
- The authenticated user is identified by:
  - `Jwt.getSubject()` → `userId`

The App API never handles refresh tokens.

---

## Run locally (development)

### 1) Start MongoDB (from repo root)

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

### 2) Start the App API (from this directory)

```bash
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```

The App API will be available at:

```
http://localhost:8082
```

---

## Protected test endpoint

A minimal protected endpoint exists to verify authentication:

```
GET /api/me
```

Requires:

```
Authorization: Bearer <accessToken>
```

Response example:

```json
{
  "userId": "6957f5cdc7b6a9bb3def51e9",
  "issuer": "http://localhost:8081",
  "expiresAt": "2026-01-02T16:58:57Z"
}
```

---

## System-level Auth E2E test

### Test scope & intent

This E2E test is a **system-level contract test**, not a unit or integration test.

It intentionally:
- runs against **real running services**
- does **not** mock the Identity Service
- does **not** share code or test utilities across services
- verifies service-to-service trust via **JWKS**, exactly as in production

The goal is to prove correct **service isolation and responsibility boundaries**:
- Identity Service owns authentication and token issuance
- App API only validates tokens and extracts `userId`

A real end-to-end authentication test exists that verifies:

1. Identity Service issues a JWT
2. App API validates the JWT via JWKS
3. `sub` from the JWT is exposed as `userId`

### Prerequisites

- Identity Service running on `http://localhost:8081`
- App API running on `http://localhost:8082`
- MongoDB running

### Run the test (from this directory)

```bash
./mvnw -Pe2e test
```

Optional overrides:

```bash
IDENTITY_BASE_URL=http://localhost:8081 \
APP_API_BASE_URL=http://localhost:8082 \
./mvnw -Pe2e test
```

This test is excluded from normal `mvn test` runs and must be explicitly enabled using the `e2e` Maven profile.

---

## Tests

### Unit / integration tests

```bash
./mvnw test
```

### System-level auth E2E test

```bash
./mvnw -Pe2e test
```

### Monorepo shortcut

From the repository root, the system-level E2E test can also be run using:

```bash
npm run test:e2e
```

---

## Notes

- All domain endpoints must scope data by `userId`
- The App API must remain free of authentication logic
- Identity Service is the single source of truth for auth

For overall system architecture, see:

- `/docs/system`
- `/docs/ooad`
