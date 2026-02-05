# Monitoring & Logging

This document describes the current free monitoring setup for MealFlow and
how to debug incidents quickly.

## Current Setup

- **Uptime checks**: UptimeRobot
  - App API: `https://app-api-service-qkq2.onrender.com/actuator/health`
  - Identity: `https://identity-service-jq7p.onrender.com/healthz`
- **Frontend errors**: Sentry (`react-native` project)
- **Backend runtime logs**: Render logs for each service

> Note: Backend Sentry SDK is currently **not enabled** due Spring Boot 4
> compatibility constraints. Backend monitoring currently relies on uptime checks,
> request-id correlation, and Render logs.

## Health Endpoints

- App API exposes Spring Actuator health on:
  - `/actuator/health`
- Identity exposes lightweight public health on:
  - `/healthz`

## Request Correlation (X-Request-Id)

Both backend services now attach and log request ids:

- If client sends `X-Request-Id`, backend reuses it.
- If missing, backend generates one.
- Backend returns `X-Request-Id` in response headers.
- Backend logs include `rid:<request-id>`.

This makes it easy to find all logs for one failing request.

## Incident Flow

1. Check UptimeRobot monitor status.
2. If frontend error, check Sentry issue details.
3. Capture `X-Request-Id` from the failed API response.
4. Open Render logs for the relevant service.
5. Search logs for `rid:<request-id>`.
6. Fix, deploy, and verify monitor recovery.

## Local Verification

Example local checks:

```bash
curl -i -H "X-Request-Id: test-rid-123" http://localhost:8082/actuator/health
curl -i -H "X-Request-Id: test-rid-123" http://localhost:8081/healthz
```

You should see:

- Response header: `X-Request-Id: test-rid-123`
- Log lines including: `rid:test-rid-123`
