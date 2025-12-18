# Development & Deployment Guide – MealFlow

> **Optional – Portfolio Documentation**  
> This document describes development and deployment considerations for MealFlow.
> It is not required to understand the system design or architecture.

This guide explains how MealFlow can be deployed and operated beyond local
development. It is intended to demonstrate real-world thinking around
environment separation and deployment readiness.

---

## 1. Environments

MealFlow distinguishes between the following environments:

- **Local development**
- **Staging (optional)**
- **Production**

Each environment uses:
- separate configuration
- separate databases
- environment-specific secrets

---

## 2. Configuration Strategy

All services use environment variables for configuration:

- database connection strings
- service base URLs
- security-related settings

No secrets are committed to source control.

---

## 3. Backend Deployment

### Identity Service
- Spring Boot application
- Can be deployed as:
  - Docker container
  - cloud service (e.g. Render, Fly.io)
- Requires:
  - MongoDB
  - persistent storage for refresh tokens

### App API
- Spring Boot application
- Same deployment options as Identity Service
- Requires:
  - MongoDB
  - network access to Identity Service JWKS endpoint

Each service can be deployed and scaled independently.

---

## 4. Database Hosting

MongoDB can be hosted using:
- MongoDB Atlas (recommended)
- self-hosted MongoDB

Logical databases:
- `identity-db`
- `app-db`

Collections are isolated per service.

---

## 5. Frontend Deployment

The Expo app can be deployed as:
- Web application (Expo Web)
- iOS application
- Android application

For web deployment:
- environment variables must point to deployed backend services
- CORS must allow the web origin

---

## 6. Security Considerations

- HTTPS enforced in production
- Refresh tokens stored hashed server-side
- Access tokens kept short-lived
- JWKS used for local JWT verification
- External API keys never exposed to the client

---

## 7. CI / CD (Future Work)

Potential improvements:
- automated test execution on pull requests
- automated builds for backend services
- linting and formatting checks
- container-based deployment pipelines

---

## 8. Summary

This guide demonstrates how MealFlow can be deployed in a realistic
production-like environment while preserving its architectural principles.
