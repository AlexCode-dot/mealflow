# Project Structure – MealFlow

This document gives a **high-level map of the repository** and explains
where the main code and docs live.

---

## Top-level layout

```
mealflow/
├─ apps/                  # Client applications
├─ services/              # Backend services
├─ docs/                  # Architecture, API, OOAD, diagrams, dev docs
├─ infra/                 # Docker and local infra helpers
├─ package.json           # Workspace-level scripts/config
├─ package-lock.json
└─ README.md
```

---

## apps/

```
apps/
└─ expo-app/              # Expo (React Native) client
   ├─ app/                # Expo Router routes
   ├─ src/
   │  ├─ core/            # App bootstrap, http, auth, configuration
   │  ├─ features/        # Feature modules (recipes, overview, planner, etc.)
   │  └─ shared/          # Reusable UI + utilities
   ├─ app.json
   ├─ package.json
   └─ tsconfig.json
```

---

## services/

```
services/
├─ app-api/               # Domain API (recipes, weekly plans, shopping lists)
│  ├─ src/main/java/com/mealflow/appapi/
│  │  ├─ recipes/
│  │  ├─ weeklyPlans/
│  │  ├─ shoppingLists/
│  │  ├─ inspiration/
│  │  ├─ profile/
│  │  ├─ security/
│  │  └─ web/
│  ├─ src/main/resources/
│  ├─ src/test/
│  └─ pom.xml
└─ identity-service/      # Auth, tokens, JWKS
   ├─ src/main/java/com/mealflow/identity/
   │  ├─ auth/
   │  ├─ token/
   │  ├─ user/
   │  ├─ security/
   │  └─ web/
   ├─ src/main/resources/
   ├─ src/test/
   └─ pom.xml
```

---

## docs/

```
docs/
├─ api/                   # REST API reference
├─ auth/                  # Auth and security docs
├─ dev/                   # Dev setup, conventions, deployment
├─ diagrams/              # SVG diagrams (UML, activity, sequence)
├─ ooad/                  # OOAD artifacts
├─ requirements/          # Requirements tables
└─ system/                # System-level descriptions and flows
```

---

## infra/

```
infra/
├─ docker-compose.yml
├─ docker-compose.dev.yml
└─ scripts/               # Local helper scripts
```

---

## Notes

- `node_modules/` and `target/` directories exist locally but are not
  part of the canonical repo structure.
- Each backend service is a standalone Spring Boot app with its own `pom.xml`.
- The Expo client uses Expo Router with app routes under `apps/expo-app/app/`.

---

## Why this structure

MealFlow uses a **monorepo with clear boundaries**:

- **apps/** isolates client code so UI concerns and release flows stay separate
  from backend services.
- **services/** splits backend responsibilities into two Spring Boot apps
  (identity vs domain), keeping auth concerns isolated from domain logic.
- **docs/** is centralized so requirements, OOAD, and diagrams stay traceable
  across the whole system.
- **infra/** keeps local tooling and Docker files out of the core app code.

This layout makes onboarding faster, keeps ownership clear, and mirrors how the
system is deployed in practice.

It also supports **feature-based organization** in the client:

- UI, state, and API logic live together under `apps/expo-app/src/features/`
  so each feature (recipes, planner, shopping lists) can evolve independently.
- Shared UI and utilities stay under `src/shared/`, preventing cross-feature
  coupling and keeping feature modules cohesive.

This approach scales better as the app grows because changes stay localized to
the owning feature and reduce accidental dependency sprawl.

Expo Router routes are intentionally thin:

- Files under `apps/expo-app/app/` mostly re-export feature screens.
- Route wiring stays minimal; data loading and state live in feature hooks.
- UI remains in `features/*/screens` and shared components.

This keeps navigation concerns separate from feature logic and prevents route
files from becoming extra screen implementations.
