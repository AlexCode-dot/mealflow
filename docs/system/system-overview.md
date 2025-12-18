# System Overview – MealFlow

This document describes the high-level system architecture of **MealFlow**,
including its services, data stores, and authentication model.

MealFlow is designed as a mobile-first system with a strong emphasis on:
- separation of concerns
- security
- scalability
- maintainability

---

## 1. High-Level Architecture

MealFlow consists of the following main components:

- Expo Client (iOS, Android, Web)
- Identity Service + identity-db (MongoDB)
- App API + app-db (MongoDB)
- Optional External Recipes API

Each component has a clearly defined responsibility and communicates
over HTTPS using JSON.

---

## 2. Client (Expo App)

The client is built using **React Native with Expo** and runs on:
- iOS
- Android
- Web

### Responsibilities
- Render the user interface
- Handle user interaction
- Store:
  - access token in memory (short-lived)
  - refresh token in secure storage (long-lived)
- Communicate with:
  - Identity Service for authentication
  - App API for all domain data

The client never communicates directly with databases or external APIs.

---

## 3. Identity Service

The **Identity Service** is a standalone Spring Boot service responsible
exclusively for authentication and session security.

### Responsibilities
- User registration and login
- Password hashing using **Argon2**
- Issuing short-lived JWT access tokens
- Issuing and rotating refresh tokens
- Logout and token revocation
- Publishing **JWKS** for token verification

### Database
- `identity-db` (MongoDB)
  - users
  - refresh_tokens

Refresh tokens are stored hashed and rotated on every refresh.

---

## 4. App API

The **App API** contains all MealFlow domain logic.

### Responsibilities
- Recipes (CRUD)
- Inspiration (external recipes)
- Weekly meal planning
- Shopping list generation and management
- User profile and preferences

### Authentication Model
- All requests require a valid JWT access token
- The App API:
  - validates JWTs locally using the Identity Service JWKS
  - extracts `userId` from the `sub` claim
  - scopes all database queries by `userId`

### Database
- `app-db` (MongoDB)
  - profiles
  - recipes
  - weekly plans
  - shopping lists

The App API never receives refresh tokens.

---

## 5. Data Modeling: Embed vs Reference

Design rules for data modeling in MealFlow:

- **Embed** small, bounded sub-objects:
  - ingredients inside a recipe
  - entries inside a weekly plan
  - items inside a shopping list

- **Reference** reusable or large entities:
  - `PlanEntry.recipeId` → `recipes._id`

This approach keeps queries simple and aligns with the domain model
described in the App API class diagram.

---

## 6. MongoDB Configuration (Example)

Each service uses its own MongoDB connection.

### Identity Service
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/identity-db
server:
  port: 8081
```

### App API
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27018/app-db
server:
  port: 8082
```

In production, both databases would typically reside in the same
MongoDB Atlas cluster with separate logical databases.

---

## 7. API & Authentication Summary

### Identity Service
- `/auth/register`
- `/auth/login`
- `/auth/refresh`
- `/auth/logout`
- `/.well-known/jwks.json`

### App API
- `/api/recipes`
- `/api/plans`
- `/api/shopping-lists`
- `/api/profile`
- `/api/inspiration`

All App API requests include:

```
Authorization: Bearer <access_token>
```

The App API verifies tokens using JWKS and scopes all data by `userId`.

---

## 8. Summary

This system overview ties together the **architecture, data model, and
authentication strategy** of MealFlow.

The design reflects modern backend and mobile application practices and
is intentionally aligned with the accompanying OOAD documents and UML
diagrams.
