# Dev Setup – MealFlow

> **Note**  
> This document is intended for developers running MealFlow locally.
> It is not required to understand the system architecture or OOAD.

This guide explains how to run MealFlow during local development:

- Expo app (Web + iOS / Android)
- Identity Service (authentication)
- App API (recipes, planner, shopping lists)
- MongoDB (local or Atlas)

For architectural context, see:
- `docs/system/system-overview.md`
- `docs/ooad/system-ooad.md`

---

## 1. Local Topology

```
[ Expo App: Web / iOS / Android ]
            ⇅ HTTPS / JSON
[ Identity Service ]  – auth, tokens
[ App API ]           – domain logic
            ⇅ MongoDB (identity-db, app-db)
```

Both backend services are independent Spring Boot applications.

---

## 2. Ports & URLs (Development)

| Component | URL |
|---------|-----|
| Identity Service | `http://localhost:8081` |
| App API | `http://localhost:8082` |
| Expo Web | `http://localhost:19006` |

### Mobile devices
Physical devices **cannot use `localhost`**.

Use your LAN IP instead:
- `http://192.168.x.x:8081`
- `http://192.168.x.x:8082`

---

## 3. Environment Variables (Expo)

Create the file:

```
apps/expo-app/.env.local
```

```env
IDENTITY_BASE_URL=http://localhost:8081
APP_API_BASE_URL=http://localhost:8082
```

Access variables in the frontend:

```ts
export const IDENTITY_BASE_URL =
  process.env.EXPO_PUBLIC_IDENTITY_BASE_URL ?? process.env.IDENTITY_BASE_URL;

export const APP_API_BASE_URL =
  process.env.EXPO_PUBLIC_APP_API_BASE_URL ?? process.env.APP_API_BASE_URL;
```

### Physical device example

```env
IDENTITY_BASE_URL=http://192.168.x.x:8081
APP_API_BASE_URL=http://192.168.x.x:8082
```

---

## 4. Start Backend Services

### Identity Service

```bash
cd services/identity-service
./mvnw spring-boot:run
```

Runs on `http://localhost:8081`.

---

### App API

```bash
cd services/app-api
./mvnw spring-boot:run
```

Runs on `http://localhost:8082`.

---

### MongoDB

Use one of the following:
- Local Docker Compose
- MongoDB Atlas

Each service connects to its own logical database:
- `identity-db`
- `app-db`

---

## 5. CORS (Development)

Both services must allow Expo Web and LAN origins.

### Identity Service

```java
registry.addMapping("/auth/**")
  .allowedOrigins(
    "http://localhost:19006",
    "http://192.168.x.x:19006"
  )
  .allowedMethods("GET","POST","OPTIONS")
  .allowedHeaders("Content-Type","Authorization");
```

### App API

```java
registry.addMapping("/api/**")
  .allowedOrigins(
    "http://localhost:19006",
    "http://192.168.x.x:19006"
  )
  .allowedMethods("GET","POST","PUT","PATCH","DELETE","OPTIONS")
  .allowedHeaders("Content-Type","Authorization");
```

---

## 6. Start Expo

```bash
cd apps/expo-app
npm install
npx expo start
```

Shortcuts:
- `w` → Web
- `i` → iOS simulator
- `a` → Android emulator

---

## 7. Connectivity Check

### App API ping endpoint

```java
@GetMapping("/api/ping")
public Map<String, String> ping() {
  return Map.of("ok", "true");
}
```

### Expo test screen

```ts
const res = await fetch(`${APP_API_BASE_URL}/api/ping`);
```

A successful response confirms backend connectivity.

---

## 8. Authentication Flow (Dev)

- Identity Service:
  - `/auth/register`
  - `/auth/login`
  - `/auth/refresh`
  - `/auth/logout`

- App API:
  - Requires `Authorization: Bearer <accessToken>`

### Token storage rules
- Access token → memory
- Refresh token → secure storage (native) or memory (web)

---

## 9. Daily Development Workflow

1. Start MongoDB
2. Start Identity Service
3. Start App API
4. Start Expo
5. Verify:
   - login
   - recipes
   - planner
   - shopping list

---

## 10. Common Issues

### Mobile device uses localhost
Use LAN IP.

### CORS errors
Ensure both services allow:
- `http://localhost:19006`
- Authorization header

### Token refresh issues
Ensure refresh endpoint returns **both**:
- new access token
- new refresh token
