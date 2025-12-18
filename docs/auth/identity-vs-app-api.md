# Identity Service vs App API

This document explains the **architectural separation** between the
**Identity Service** and the **App API** in the MealFlow system.

The separation is intentional and central to MealFlow’s security,
maintainability, and scalability.

---

## 1. Purpose of the Separation

MealFlow is designed as a **multi-service system** rather than a monolith.

The primary goals of separating the Identity Service from the App API are to:

- reduce the attack surface of domain services
- isolate authentication and credential handling
- simplify reasoning about security-critical code
- allow independent development and scaling

---

## 2. Identity Service – Responsibilities

The **Identity Service** is responsible for **authentication only**.

### Core responsibilities
- User registration and login
- Password hashing and verification (Argon2)
- Issuing JWT access tokens
- Issuing and rotating refresh tokens
- Logout via refresh token revocation
- Publishing JWKS for token verification

### Explicit non-responsibilities
- No access to recipes, plans, or shopping lists
- No domain logic
- No dependency on the App API database

### Stored data
- Users
- Hashed refresh tokens

Database:
```
identity-db (MongoDB)
```

---

## 3. App API – Responsibilities

The **App API** contains **all domain logic** in MealFlow.

### Core responsibilities
- Recipes
- Inspiration integration
- Weekly meal planning
- Shopping lists
- User profile and preferences

### Authentication model
- Requires a valid JWT access token for all requests
- Validates JWTs using the Identity Service JWKS
- Extracts `userId` from the `sub` claim
- Scopes all database queries by `userId`

### Explicit non-responsibilities
- No password handling
- No refresh token handling
- No JWT signing

Database:
```
app-db (MongoDB)
```

---

## 4. Token Flow Overview

### Login
1. Client sends credentials to Identity Service.
2. Identity Service authenticates user.
3. Identity Service issues:
   - access token (JWT)
   - refresh token
4. Client stores tokens.

### Authenticated requests
1. Client sends request to App API with access token.
2. App API validates token using JWKS.
3. App API processes domain request.

### Refresh
1. Client sends refresh token to Identity Service.
2. Identity Service validates and rotates refresh token.
3. New tokens are issued.

The App API never receives refresh tokens.

---

## 5. Security Benefits

This separation provides several concrete security benefits:

- Passwords and refresh tokens are isolated from domain services
- Compromising the App API does not expose credentials
- JWT validation can be done locally without network calls
- Reduced blast radius for vulnerabilities

---

## 6. Operational Benefits

- Services can be scaled independently
- Authentication logic can evolve without touching domain code
- App API remains simpler and easier to test
- Clear ownership of responsibilities

---

## 7. Summary

| Identity Service | App API |
|------------------|---------|
| Authentication | Domain logic |
| Passwords | Recipes |
| Refresh tokens | Weekly planner |
| JWT signing | Shopping lists |
| JWKS publishing | User profile |

The strict separation between Identity Service and App API is a deliberate
architectural decision that aligns MealFlow with modern backend design
principles and real-world production systems.
