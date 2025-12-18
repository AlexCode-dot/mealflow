# MealFlow – Monorepo

MealFlow is a **mobile-first meal planning system** designed with a strong focus on
**clean architecture, separation of concerns, and security**.

The system allows users to:
- manage recipes (own & inspired)
- plan weekly meals
- generate and manage shopping lists
- authenticate securely using JWT + refresh tokens

This repository contains the **full system implementation**, including backend services,
mobile client, infrastructure, and technical documentation.

---

## Architecture Overview

MealFlow is structured as a **monorepo** with clear service boundaries:

- **Expo App** – Mobile client (React Native + Expo)
- **Identity Service** – Authentication & token management
- **App API** – Domain logic (recipes, plans, shopping lists)
- **MongoDB** – Separate databases per service
- **Docker** – Local development infrastructure

Detailed architecture, OOAD, and UML diagrams can be found in:

-> **[`/docs`](./docs)**

---

## Repository Structure

```
apps/
  expo-app/              # Mobile client (React Native + Expo)

services/
  identity-service/      # Authentication service (Spring Boot)
  app-api/               # Domain API (Spring Boot)

infra/
  docker-compose.dev.yml # Local MongoDB setup

docs/
  system/                # System overview & flows
  ooad/                  # OOAD narratives
  diagrams/              # UML, sequence, activity diagrams
```

---

## Local Development

### Start MongoDB

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

---

### Backend services (dev profile)

Run each service in its own terminal:

```bash
SPRING_PROFILES_ACTIVE=dev SPRING_MONGODB_URI="mongodb://root:rootpass@localhost:27017/identity-db?authSource=admin" (cd services/identity-service && ./mvnw spring-boot:run)
```

```bash
SPRING_PROFILES_ACTIVE=dev SPRING_MONGODB_URI="mongodb://root:rootpass@localhost:27018/app-db?authSource=admin" (cd services/app-api && ./mvnw spring-boot:run)
```

Ports:
- Identity Service: **8081**
- App API: **8082**

---

### Run backend via Docker

Builds and runs both backend services and MongoDB containers:

```bash
npm run dev:backend:docker
```

---

### Expo client

```bash
cd apps/expo-app
npm install
npx expo start
```

---

## Tests / CI (reference)

```bash
SPRING_PROFILES_ACTIVE=test SPRING_MONGODB_URI="mongodb://root:rootpass@localhost:27017/identity-db?authSource=admin" ./mvnw test
```

(App API uses port `27018`.)

---

## Documentation

All design decisions, OOAD artifacts, and UML diagrams are documented under:

-> **[`/docs`](./docs)**

This includes:
- system overview
- requirements traceability
- authentication design
- sequence, activity, class, and use-case diagrams
