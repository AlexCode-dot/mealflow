# Identity Service – OOAD

This document describes the **Object-Oriented Analysis and Design (OOAD)**
for the **Identity Service** in the MealFlow system.

The Identity Service is responsible **only for authentication and token
management**. All domain logic related to meals, recipes, and planning
lives in the App API.

This document connects:
- requirements
- user stories
- use cases
- UML diagrams

and explains how authentication is designed and reasoned about in MealFlow.

---

## 1. Scope & Context

### 1.1 In Scope

The Identity Service handles:

- User registration and login
- Password hashing and verification using **Argon2**
- Issuing **JWT access tokens**
- Issuing and rotating **refresh tokens**
- Logout by revoking refresh tokens
- Publishing **JWKS** for token verification by the App API

---

### 1.2 Out of Scope

The following concerns are handled elsewhere:

- Recipes, planners, shopping lists → **App API**
- User interface → **Expo client**
- Payments, notifications, analytics → out of scope

---

## 2. Requirements

### 2.1 Functional Requirements

**F1 – Register Account**
- Users shall be able to register with email and password.
- Registration shall fail if the email is already in use.

**F2 – Login**
- Users shall be able to log in using email and password.
- Successful login shall issue:
  - a short-lived JWT access token
  - a long-lived refresh token

**F3 – Password Security**
- Plaintext passwords shall never be stored.
- Passwords shall be hashed using **Argon2**.

**F4 – Refresh Tokens**
- Valid refresh tokens shall return:
  - a new access token
  - a new refresh token
- Refresh tokens shall be **rotated** on every refresh.

**F5 – Logout**
- Users shall be able to log out by revoking the active refresh token.

**F6 – JWKS**
- The service shall expose a JWKS endpoint for JWT verification.

**F7 – Account Management (Future)**
- Change password
- Delete account

---

### 2.2 Non-Functional Requirements

**Security**
- All communication shall use HTTPS.
- JWTs shall be signed using a strong asymmetric algorithm (e.g. RS256).
- Refresh tokens shall be stored **hashed**.

**Performance**
- Login and refresh operations should typically complete within 300 ms.

**Maintainability**
- Clear separation of layers:
  - Controllers
  - Services
  - Repositories

---

## 3. Epics & User Stories

### Epic E1 – Registration & Login
- **US1:** Register a new account
- **US2:** Log in with credentials

### Epic E2 – Session Management
- **US3:** Stay logged in across sessions
- **US4:** Refresh access tokens transparently
- **US5:** Log out securely

### Epic E3 – Account Security (Future)
- **US6:** Change password
- **US7:** Delete account

---

## 4. Use Cases

### UC-1 – Register Account

**Actor:** New user  
**Trigger:** User submits Sign up form

Main flow:
1. Client sends `POST /auth/register`.
2. Identity Service validates input.
3. Password is hashed using Argon2.
4. User is stored in `identity-db.users`.
5. Initial refresh token is created.
6. Access and refresh tokens are issued.

---

### UC-2 – Login

**Actor:** Registered user  
**Trigger:** User submits Login form

Main flow:
1. Client sends `POST /auth/login`.
2. Identity Service verifies credentials.
3. New refresh token is created.
4. Access and refresh tokens are issued.

---

### UC-3 – Refresh Tokens

**Actor:** Authenticated user  
**Trigger:** Access token expired

Main flow:
1. Client sends `POST /auth/refresh`.
2. Identity Service:
   - looks up refresh token by hash
   - verifies validity
3. Old token is revoked.
4. New access and refresh tokens are issued.

---

### UC-4 – Logout

**Actor:** Authenticated user  
**Trigger:** User taps Logout

Main flow:
1. Client sends `POST /auth/logout`.
2. Refresh token is revoked.
3. Client clears stored tokens.

---

### UC-5 – Change Password (Future)

**Actor:** Authenticated user  
**Trigger:** User submits Change Password form

Intended flow:
1. Verify current password.
2. Hash new password.
3. Revoke existing refresh tokens.
4. Force re-authentication or issue new tokens.

---

## 5. UML Diagrams

The following UML diagrams describe the Identity Service design:

- Use Case Diagram – Identity Service
- Class Diagram – Identity Service
- Sequence Diagram – Refresh Token Rotation
- Sequence Diagram – Logout
- Activity Diagram – Login
- Activity Diagram – Refresh Tokens

These diagrams are derived directly from the requirements and use cases
described in this document.
