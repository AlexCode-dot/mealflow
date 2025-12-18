# System OOAD – MealFlow

This document presents the **System-level Object-Oriented Analysis and Design (OOAD)**
for the MealFlow project.

While individual subsystems (Identity Service and App API) are documented separately,
this document focuses on **how the system is decomposed**, how responsibilities are
allocated, and how the OOAD process led to the final architecture.

---

## 1. Purpose of System OOAD

The purpose of this document is to:

- describe the overall system decomposition
- explain why the system is split into multiple services
- connect requirements to subsystems and UML diagrams
- provide a high-level design narrative

This document does **not** repeat detailed API or database descriptions.
Those are covered in subsystem-specific OOAD documents.

---

## 2. System Decomposition

MealFlow is decomposed into three main parts:

1. **Client (Expo App)**
2. **Identity Service**
3. **App API**

Each part has a clear responsibility boundary.

---

### 2.1 Client (Expo App)

**Primary role:** User interaction and presentation.

Responsibilities:
- Rendering UI
- Managing navigation
- Holding access token in memory
- Storing refresh token securely
- Sending authenticated requests to the App API

The client contains **no business logic** and **no direct data access**.

---

### 2.2 Identity Service

**Primary role:** Authentication and session security.

Responsibilities:
- User registration and login
- Password hashing (Argon2)
- Issuing JWT access tokens
- Issuing and rotating refresh tokens
- Logout via token revocation
- Publishing JWKS

The Identity Service contains **no domain logic** and **no access to app data**.

---

### 2.3 App API

**Primary role:** Domain logic and data management.

Responsibilities:
- Recipes
- Inspiration integration
- Weekly meal planning
- Shopping list generation
- User profile and preferences

The App API:
- requires a valid JWT for all requests
- validates tokens via JWKS
- scopes all data by `userId`

---

## 3. Mapping Requirements to Subsystems

| Requirement Category | Responsible Subsystem |
|----------------------|-----------------------|
| Authentication | Identity Service |
| Password security | Identity Service |
| Token lifecycle | Identity Service |
| Recipes | App API |
| Weekly planner | App API |
| Shopping lists | App API |
| External API integration | App API |
| UI and navigation | Client |

This mapping ensures:
- clear ownership
- reduced coupling
- easier reasoning about behavior

---

## 4. Use Case Distribution

System-level use cases are distributed as follows:

- **Authentication use cases** → Identity Service
- **Meal planning use cases** → App API
- **Presentation use cases** → Client

Each use case is implemented entirely within its responsible subsystem,
with communication only through well-defined interfaces.

---

## 5. Data Ownership & Isolation

Each backend service owns its own database:

- `identity-db` → users, refresh tokens
- `app-db` → recipes, plans, shopping lists, profiles

Rules:
- No shared collections
- No cross-service database access
- All App API data is scoped by `userId`

This design:
- improves security
- simplifies migrations
- supports independent scaling

---

## 6. Interaction Overview

High-level interaction flow:

1. User interacts with client
2. Client authenticates via Identity Service
3. Client accesses domain features via App API
4. App API validates JWT using JWKS
5. App API performs domain operations

Each step aligns with the system’s responsibility boundaries.

---

## 7. Relation to UML Diagrams

This System OOAD document is supported by the following UML artifacts:

- System Use Case Diagram
- Identity Service Use Case Diagram
- App API Use Case Diagram
- Class Diagrams (Identity Service, App API)
- Sequence Diagrams (Login, Refresh, Domain flows)
- Activity Diagrams (Planner, Shopping List)

The UML diagrams provide visual representations of the design decisions
described in this document.

---

## 8. Summary

The System OOAD for MealFlow demonstrates a **deliberate, layered design**
based on separation of concerns and responsibility-driven decomposition.

Key qualities of the design:
- clear subsystem boundaries
- isolated authentication logic
- secure user data handling
- scalable service structure

Together with the subsystem OOAD documents and UML diagrams, this document
provides a complete and defensible system design narrative.
