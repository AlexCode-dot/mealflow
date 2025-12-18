# REST API Overview – MealFlow

This document describes the **REST APIs** exposed by the MealFlow backend.

MealFlow consists of two backend services:

- **Identity Service** – authentication and token management
- **App API** – all domain logic (recipes, planning, shopping lists, profile)

Unless otherwise stated:
- Requests and responses use **JSON**
- All App API endpoints require a valid **JWT access token**

---

## 1. Identity Service API (`/auth/*`)

The Identity Service handles:
- user registration
- login
- refresh token rotation
- logout
- JWKS publishing for JWT verification

### Authentication Model
- Access tokens (JWT) are **short-lived**
- Refresh tokens are **long-lived**, opaque, and rotated on use
- Refresh tokens are **never** sent to the App API

---

### 1.1 Register

**POST** `/auth/register`  
Create a new user account.

**Auth:** Public  
**Body:**
- `email`
- `password`
- `displayName` (optional)

**Success (201):**
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

Notes:
- Passwords are hashed using Argon2
- A user record and refresh token record are created in `identity-db`

---

### 1.2 Login

**POST** `/auth/login`  
Authenticate an existing user.

**Auth:** Public  
**Body:** `email`, `password`

**Success (200):**
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

Notes:
- Password verification uses Argon2
- Refresh token is rotated on every login

---

### 1.3 Refresh Tokens

**POST** `/auth/refresh`  
Rotate refresh token and issue new tokens.

**Auth:** Refresh token  
**Body:**
```json
{
  "refreshToken": "..."
}
```

**Success (200):**
- new access token
- new refresh token

**Failure:**
- `401 Unauthorized` if token is invalid, expired, or revoked

---

### 1.4 Logout

**POST** `/auth/logout`  
Invalidate the current refresh token.

**Auth:** Refresh token  
**Success:** `204 No Content`

Logout is idempotent; repeated calls are safe.

---

### 1.5 JWKS

**GET** `/.well-known/jwks.json`  

Public endpoint exposing the JSON Web Key Set (JWKS) used by the App API
to verify JWT signatures locally.

---

## 2. App API (`/api/*`)

The App API contains **all MealFlow domain logic**.

All endpoints:
- require `Authorization: Bearer <accessToken>`
- scope all data by `userId = sub` from the JWT

---

## 2.1 Recipes

**GET** `/api/recipes`  
List all recipes belonging to the authenticated user.

**POST** `/api/recipes`  
Create a new recipe (manual or saved from inspiration).

Fields:
- `title`
- `description`
- `ingredients[]`
- `steps[]`
- `fromExternal` (optional)

---

**GET** `/api/recipes/{id}`  
Retrieve a single recipe.

**PATCH** `/api/recipes/{id}`  
Partial update (recommended).

**PUT** `/api/recipes/{id}`  
Full replacement (rarely used).

**DELETE** `/api/recipes/{id}`  
Delete recipe.

---

## 2.2 Inspiration (External Recipes)

**GET** `/api/inspiration`  
Retrieve a list of inspiration recipes from an external provider.

**GET** `/api/inspiration/{externalId}`  
Retrieve detailed inspiration recipe.

Saving an inspiration recipe uses:

**POST** `/api/recipes`  
with `fromExternal: true`

---

## 2.3 Weekly Planner

**GET** `/api/weekly-plans`  
List weekly plans (optionally filtered by week).

**POST** `/api/weekly-plans`  
Create a new weekly plan.

**GET** `/api/weekly-plans/{id}`  
Retrieve a specific weekly plan.

**PATCH** `/api/weekly-plans/{id}`  
Partial update (recommended):
- add or remove entries
- change servings
- add `extraItems`

**PUT** `/api/weekly-plans/{id}`  
Full replacement (rare use).

**DELETE** `/api/weekly-plans/{id}`  
Delete weekly plan.

---

## 2.4 Shopping Lists

**GET** `/api/shopping-lists`  
List all shopping lists.

**POST** `/api/shopping-lists`  
Generate a shopping list from a weekly plan.

Server-side behavior:
- loads weekly plan
- loads referenced recipes
- aggregates ingredients
- merges duplicates
- stores shopping list

---

**GET** `/api/shopping-lists/{id}`  
Retrieve shopping list.

**PATCH** `/api/shopping-lists/{id}`  
Partial update (recommended):
- check/uncheck items
- adjust quantities
- add or remove custom items

**PUT** `/api/shopping-lists/{id}`  
Full replacement (rare).

**DELETE** `/api/shopping-lists/{id}`  
Delete shopping list.

---

## 2.5 Profile

**GET** `/api/profile`  
Retrieve user profile.

**PATCH** `/api/profile`  
Partial update (recommended):
- display name
- theme
- avatar URL

**PUT** `/api/profile`  
Full replacement (rare).

---

## 3. REST Principles Used

MealFlow follows standard REST conventions:

- **GET** – retrieve data
- **POST** – create resources or trigger generation
- **PATCH** – partial updates (primary UI method)
- **PUT** – full replacement (used sparingly)
- **DELETE** – remove resources

---

## 4. Summary

### Identity Service
- `/auth/register`
- `/auth/login`
- `/auth/refresh`
- `/auth/logout`
- `/.well-known/jwks.json`

### App API
- Recipes → `/api/recipes`
- Inspiration → `/api/inspiration`
- Weekly Planner → `/api/weekly-plans`
- Shopping Lists → `/api/shopping-lists`
- Profile → `/api/profile`

This API design aligns with the documented requirements, use cases,
and OOAD artifacts in the MealFlow documentation.
