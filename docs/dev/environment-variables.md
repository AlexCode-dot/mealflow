# Environment Variables – MealFlow

This document lists **all environment variables used by the app**, what
component they affect, and when they are required (dev vs deployment).

---

## 1) Frontend (Expo)

These are required for the Expo client to know where the backend lives.
They are read from `apps/expo-app/.env.local`.

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `EXPO_PUBLIC_IDENTITY_BASE_URL` | Yes | Base URL for Identity Service (e.g. `https://identity.example.com`) | none |
| `EXPO_PUBLIC_APP_API_BASE_URL` | Yes | Base URL for App API (e.g. `https://api.example.com`) | none |
| `EXPO_PUBLIC_SENTRY_DSN` | No | Sentry DSN for client error tracking | none |
| `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | No | Sentry environment name | `development` |
| `EXPO_PUBLIC_SENTRY_RELEASE` | No | Release identifier for client | none |

---

## 2) Identity Service (Spring Boot)

Defined in `services/identity-service/src/main/resources/application.properties`.

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `PORT` | No | HTTP port for the service | `8081` |
| `FORWARD_HEADERS_STRATEGY` | No | Proxy header strategy | `framework` |
| `SPRING_MONGODB_URI` | Yes (prod/staging) | Mongo connection string | none |
| `IDENTITY_MONGODB_URI` | Dev only | Mongo URI for dev profile | `mongodb://root:rootpass@localhost:27017/identity-db?authSource=admin` |
| `JWT_ISSUER` | Yes (prod) | Public issuer URL for JWTs | `http://localhost:8081` |
| `JWT_ACCESS_TTL_MIN` | No | Access token TTL in minutes | `15` |
| `JWT_REFRESH_TTL_DAYS` | No | Refresh token TTL in days | `30` |
| `JWT_PRIVATE_KEY_PATH` | Yes (prod) | Path to RSA private key (PEM) | `file:./.secrets/private.pem` |
| `JWT_PUBLIC_KEY_PATH` | Yes (prod) | Path to RSA public key (PEM) | `file:./.secrets/public.pem` |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated allowed origins | `http://localhost:8083,http://localhost:19006` |
| `RATE_LIMIT_ENABLED` | No | Enable rate limiting | `true` |
| `RATE_LIMIT_LOGIN_PER_MINUTE` | No | Login requests/minute | `10` |
| `RATE_LIMIT_REGISTER_PER_MINUTE` | No | Register requests/minute | `5` |
| `RATE_LIMIT_REFRESH_PER_MINUTE` | No | Refresh requests/minute | `30` |
| `RATE_LIMIT_LOGOUT_PER_MINUTE` | No | Logout requests/minute | `60` |
| `RATE_LIMIT_JWKS_PER_MINUTE` | No | JWKS requests/minute | `120` |
| `SENTRY_DSN` | Optional (currently unused) | Reserved for backend Sentry integration | none |
| `SENTRY_ENVIRONMENT` | Optional (currently unused) | Reserved for backend Sentry integration | `development` |
| `SENTRY_RELEASE` | Optional (currently unused) | Reserved for backend Sentry integration | none |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional (currently unused) | Reserved for backend Sentry integration | `0.0` |

---

## 3) App API (Spring Boot)

Defined in `services/app-api/src/main/resources/application.properties`.

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `PORT` | No | HTTP port for the service | `8082` |
| `FORWARD_HEADERS_STRATEGY` | No | Proxy header strategy | `framework` |
| `SPRING_MONGODB_URI` | Yes (prod/staging) | Mongo connection string | none |
| `APP_API_MONGODB_URI` | Dev only | Mongo URI for dev profile | `mongodb://root:rootpass@localhost:27018/app-db?authSource=admin` |
| `IDENTITY_JWKS_URI` | Yes (prod) | JWKS endpoint for JWT verification | `http://localhost:8081/.well-known/jwks.json` |
| `IDENTITY_JWT_ISSUER` | Yes (prod) | JWT issuer check (must match Identity Service `JWT_ISSUER`) | `http://localhost:8081` |
| `MEALDB_BASE_URL` | No | External inspiration provider base URL (without API key) | `https://www.themealdb.com/api/json/v2` |
| `MEALDB_API_KEY` | No | TheMealDB API key used by App API | `1` |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated allowed origins | `http://localhost:8083,http://localhost:19006` |
| `RATE_LIMIT_ENABLED` | No | Enable rate limiting | `true` |
| `RATE_LIMIT_API_PER_MINUTE` | No | API requests/minute | `120` |
| `APP_IMAGES_MAX_UPLOAD_BYTES` | No | Max image upload size in bytes | `10485760` |
| `APP_IMAGES_MAX_PER_USER` | No | Max recipe images per user | `200` |
| `APP_IMAGES_MAX_PER_DAY` | No | Max image uploads per user per day | `20` |
| `APP_IMAGES_ALLOWED_TYPES` | No | Comma-separated allowed MIME types | `image/jpeg,image/png,image/webp,image/heic` |
| `APP_IMAGES_MAX_UPLOAD_SIZE` | No | Multipart limit (e.g. `10MB`) | `10MB` |
| `IMAGEKIT_PRIVATE_KEY` | Yes (for uploads) | ImageKit private API key | none |
| `IMAGEKIT_PUBLIC_KEY` | Yes (for uploads) | ImageKit public API key | none |
| `IMAGEKIT_URL_ENDPOINT` | Yes (for uploads) | ImageKit URL endpoint (cdn) | none |
| `IMAGEKIT_UPLOAD_FOLDER` | No | Base folder for uploads | `/mealflow/recipes` |
| `ANTHROPIC_API_KEY` | Yes (for recipe extraction) | Anthropic API key used by recipe extraction | none |
| `ANTHROPIC_BASE_URL` | No | Anthropic API base URL | `https://api.anthropic.com` |
| `ANTHROPIC_MODEL` | No | Anthropic model name | `claude-sonnet-4-6` |
| `ANTHROPIC_API_VERSION` | No | Anthropic API version header | `2023-06-01` |
| `ANTHROPIC_MAX_TOKENS` | No | Max output tokens per extraction | `2048` |
| `ANTHROPIC_REQUEST_TIMEOUT_SECONDS` | No | Read timeout for Anthropic calls | `60` |
| `APP_EXTRACTION_MAX_IMAGE_BYTES` | No | Max image size for extraction (bytes) | `10485760` |
| `APP_EXTRACTION_MAX_VIDEO_BYTES` | No | Max video size for extraction (bytes) | `104857600` |
| `APP_EXTRACTION_MAX_PER_DAY` | No | Max extractions per user per day | `10` |
| `APP_EXTRACTION_MAX_FRAMES` | No | Max video keyframes sent to the LLM | `8` |
| `APP_EXTRACTION_FRAME_INTERVAL_SECONDS` | No | Seconds between sampled keyframes | `3` |
| `APP_EXTRACTION_FFMPEG_TIMEOUT_SECONDS` | No | ffmpeg max wall-clock seconds | `60` |
| `APP_EXTRACTION_VIDEO_MAX_DURATION_SECONDS` | No | Cap on processed video duration | `300` |
| `APP_EXTRACTION_FFMPEG_PATH` | No | Path to `ffmpeg` binary | `ffmpeg` |
| `APP_EXTRACTION_FFPROBE_PATH` | No | Path to `ffprobe` binary | `ffprobe` |
| `APP_EXTRACTION_CLEANUP_INTERVAL_SECONDS` | No | How often the abandoned-extraction sweeper runs | `600` |
| `APP_EXTRACTION_MULTIPART_MAX_SIZE` | No | Multipart limit for upload endpoints | `110MB` |
| `SENTRY_DSN` | Optional (currently unused) | Reserved for backend Sentry integration | none |
| `SENTRY_ENVIRONMENT` | Optional (currently unused) | Reserved for backend Sentry integration | `development` |
| `SENTRY_RELEASE` | Optional (currently unused) | Reserved for backend Sentry integration | none |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional (currently unused) | Reserved for backend Sentry integration | `0.0` |

---

## 4) Docker / Compose

Used by Compose files under `infra/`.

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `MONGO_ROOT_USERNAME` | No | Mongo root user for containers | `root` |
| `MONGO_ROOT_PASSWORD` | No | Mongo root password for containers | `rootpass` |

---

## 5) Local dev scripts (repo root)

Used by `npm run dev:identity` / `dev:app-api` (see `package.json`).

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `IDENTITY_MONGO_URI` | Dev only | Mongo URI for Identity Service when running on host | none |
| `APP_API_MONGO_URI` | Dev only | Mongo URI for App API when running on host | none |

These are populated via `.env.local` in the repo root.

---

## 6) Test helpers (optional)

Used in backend tests when you want to override Testcontainers.

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `SPRING_DATA_MONGODB_URI` | Optional | Overrides Mongo URI in tests | none |
| `SPRING_MONGODB_URI` | Optional | Overrides Mongo URI in tests | none |
| `APP_API_MONGODB_URI` | Optional | Overrides App API test Mongo URI | none |

---

## Deployment checklist (minimum)

For a production deployment you typically need:

- **Identity Service**: `SPRING_MONGODB_URI`, `JWT_ISSUER`, `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`
- **App API**: `SPRING_MONGODB_URI`, `IDENTITY_JWKS_URI`, `IDENTITY_JWT_ISSUER`
- **Expo client**: `EXPO_PUBLIC_IDENTITY_BASE_URL`, `EXPO_PUBLIC_APP_API_BASE_URL`

Optional but common:
- `CORS_ALLOWED_ORIGINS`
- `PORT` (if not using defaults)
- rate limit settings
