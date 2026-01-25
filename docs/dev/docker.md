# Docker & Compose – MealFlow

This document explains what the Docker and Docker Compose files do in this repo
and how they fit into local development.

---

## What lives where

- `infra/docker-compose.dev.yml`
  - Runs **MongoDB only** (two containers) for local dev.
  - Binds to localhost ports:
    - `127.0.0.1:27017` → identity-db
    - `127.0.0.1:27018` → app-db

- `infra/docker-compose.yml`
  - Runs **MongoDB + both backend services** in Docker.
  - Builds images from the service Dockerfiles.
  - Exposes:
    - Identity Service → `8081`
    - App API → `8082`
  - Intended for demos, onboarding, and parity with a containerized backend.

- `services/*/Dockerfile`
  - Multi-stage Spring Boot builds:
    - Stage 1 builds a fat JAR (`./mvnw -DskipTests package`).
    - Stage 2 runs the JAR on a JRE base image.
  - `SPRING_PROFILES_ACTIVE=dev` inside the container.

- `infra/scripts/`
  - `dev-all.macos.sh` starts Mongo via Compose and opens terminals for
    `dev:identity`, `dev:app-api`, and `dev:expo`.
  - `dev-all.down.macos.sh` stops Mongo and kills local dev ports.

---

## How to use (common workflows)

### Which setup should I use?

| Scenario | Recommended |
|---------|-------------|
| Daily backend dev on host | `dev:mongo` + `dev:identity` + `dev:app-api` |
| Quick full-backend demo | `dev:backend:docker` |
| Reset local Mongo data | `dev:mongo:reset` |
| Expo-only work (no backend changes) | Use existing backend + `dev:expo` |

### 1) Local dev with Mongo in Docker (services run on host)

```bash
npm run dev:mongo
npm run dev:identity
npm run dev:app-api
npm run dev:expo
```

This uses `infra/docker-compose.dev.yml` for Mongo only.

### 2) Full backend in Docker

```bash
npm run dev:backend:docker
```

This uses `infra/docker-compose.yml` to build and run:
- Mongo identity + app
- Identity Service
- App API

Stop with:

```bash
npm run dev:backend:docker:down
```

---

## Environment variables

When running backend services **on the host**, the scripts read
`.env.local` (repo root) for:

- `IDENTITY_MONGO_URI`
- `APP_API_MONGO_URI`

When running services **in Docker**, Compose sets `SPRING_MONGODB_URI`
inside each container to point at the appropriate Mongo container.

---

## Using Expo with Dockerized backend

If the backend is running via `docker-compose.yml`, point the Expo app at
`http://localhost:8081` and `http://localhost:8082` in `apps/expo-app/.env.local`:

```env
EXPO_PUBLIC_IDENTITY_BASE_URL=http://localhost:8081
EXPO_PUBLIC_APP_API_BASE_URL=http://localhost:8082
```

Then start Expo with:

```bash
npm run dev:expo
```

On a physical device, use your LAN IP instead of `localhost`.

---

## Why this setup

- Separates the two databases (identity vs app) to mirror production
  responsibilities.
- Makes it easy to run Mongo locally without Dockerizing the JVM services.
- Dockerfiles remain minimal and consistent across both services.
- Compose keeps the full backend reproducible for demos.

## Why there are two compose files

- **`docker-compose.dev.yml`** keeps the developer loop fast by only
  containerizing MongoDB. The Spring services run on the host so you can
  use your IDE debugger and avoid rebuilds on every code change.
- **`docker-compose.yml`** containerizes the full backend so the stack can
  be run with one command, which is useful for demos and onboarding.
