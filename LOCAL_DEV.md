# Local Development (Quick Start)

This is the **shortest path** to run MealFlow locally and test everything.
For the best, true-to-production experience, we recommend testing on a
physical iOS or Android device since MealFlow is primarily a mobile app.
For deeper details and troubleshooting, see `docs/dev/dev-setup.md`.

---

## Prereqs

- **Docker Desktop** (for MongoDB)
- **Node.js + npm** (for Expo app)
- **JDK** (for Spring Boot services)

---

## 1) Start MongoDB (Docker)

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

---

## 2) Start backend services (two terminals)

Identity Service:

```bash
SPRING_PROFILES_ACTIVE=dev \
SPRING_MONGODB_URI="mongodb://root:rootpass@localhost:27017/identity-db?authSource=admin" \
(cd services/identity-service && ./mvnw spring-boot:run)
```

App API:

```bash
SPRING_PROFILES_ACTIVE=dev \
SPRING_MONGODB_URI="mongodb://root:rootpass@localhost:27018/app-db?authSource=admin" \
(cd services/app-api && ./mvnw spring-boot:run)
```

Ports:
- Identity Service → `http://localhost:8081`
- App API → `http://localhost:8082`

---

## 3) Configure Expo env

Create `apps/expo-app/.env.local`:

```env
EXPO_PUBLIC_IDENTITY_BASE_URL=http://localhost:8081
EXPO_PUBLIC_APP_API_BASE_URL=http://localhost:8082
```

### Using a phone or simulator

If the app is running on a **different device** than your backend, `localhost`
will not work. Use your machine's LAN IP instead:

```env
EXPO_PUBLIC_IDENTITY_BASE_URL=http://192.168.x.x:8081
EXPO_PUBLIC_APP_API_BASE_URL=http://192.168.x.x:8082
```

Typical cases:
- Physical phone
- Emulator/simulator on a different machine

---

## 4) Start Expo app

```bash
cd apps/expo-app
npm install
npx expo start
```

Expo Web runs at `http://localhost:8083`.

### iOS / Android options

- **iOS Simulator** requires macOS + Xcode.
- **No Mac?** Use a physical iPhone with **Expo Go** (scan the QR code).
- **Android**: Android Studio emulator works on macOS/Windows/Linux.

---

## 5) Quick sanity check

- Open Expo Web
- Register + login
- Verify:
  - recipes
  - planner
  - shopping list

---

## Other envs (optional)

If you run alternative flows (root `npm run dev:*` scripts), or hit CORS issues
on phone testing, see the full list of environment variables here:
`docs/dev/environment-variables.md`.

---

## Optional: Run backend via Docker

If you prefer fully containerized backend services:

```bash
npm run dev:backend:docker
```
