# User Flow & System Interaction – MealFlow

This document explains **how a user moves through MealFlow** and how each
interaction maps to the underlying system components.

It acts as the **narrative glue** between:
- system architecture
- OOAD documents
- UML diagrams
- real API behavior

The flow described here is consistent across mobile (iOS / Android) and web.

---

## 1. First Launch & Authentication

### 1.1 First App Launch

1. User opens MealFlow.
2. Client checks secure storage for an existing **refresh token**.

- If **no token exists**:
  - Login / Sign up screen is shown.
  - Client communicates only with the **Identity Service**.

- If a token exists:
  - Client attempts silent refresh (see section 7).

---

### 1.2 Sign Up (New User)

1. User enters email and password.
2. Client sends `POST /auth/register` to the Identity Service.

Payload:
- email
- password
- optional display name

3. Identity Service:
- validates input
- hashes password using **Argon2**
- creates user in `identity-db.users`
- creates a hashed refresh token in `identity-db.refresh_tokens`
- issues:
  - short-lived JWT access token
  - long-lived refresh token

4. Identity Service responds:
```json
{ "access_token": "...", "refresh_token": "..." }
```

5. Client:
- stores refresh token in secure storage
- stores access token in memory
- navigates to the main app

---

### 1.3 Login (Returning User)

1. User submits credentials.
2. Client sends `POST /auth/login`.
3. Identity Service:
- verifies password
- rotates refresh token
- issues new access and refresh tokens
4. Client stores tokens and enters the app.

---

## 2. Authenticated App Usage

After authentication, all domain screens interact with the **App API**:

- Recipes
- Inspiration
- Weekly Planner
- Shopping List
- Profile / Settings

All requests include:
```
Authorization: Bearer <access_token>
```

The Identity Service is only contacted for:
- token refresh
- logout
- account-level actions

---

## 3. Standard App API Request Pattern

Example: loading recipes.

1. Client → App API: `GET /api/recipes`
2. App API:
- validates JWT via JWKS
- extracts `sub` as `userId`
- queries `app-db.recipes` scoped by `userId`
3. App API → Client: recipe list

This pattern applies to all domain endpoints.

---

## 4. Inspiration & External Recipes

### 4.1 Browsing Inspiration

1. Client calls `GET /api/inspiration`.
2. App API:
- calls External Recipes API
- normalizes external data
3. Client receives inspiration cards.

---

### 4.2 Saving Inspiration as Recipe

1. User taps **Save to my recipes**.
2. Client sends `POST /api/recipes` with full recipe data.
3. App API:
- validates JWT
- assigns `userId` from token
- stores recipe in `app-db.recipes`

Saved inspiration recipes behave exactly like user-created recipes.

---

## 5. Weekly Planner & Shopping List

### 5.1 Weekly Planner Updates

User actions:
- add recipe to day / meal
- add custom entries
- change servings
- remove entries

Flow:
1. Client sends update to App API.
2. App API validates JWT and updates `app-db.plans`.

---

### 5.2 Generate Shopping List

1. Client sends `POST /api/shopping-lists` with week reference.
2. App API:
- loads weekly plan
- loads referenced recipes
- aggregates ingredients
- creates or updates shopping list in `app-db.shopping_lists`
3. Client displays the list and allows further edits.

---

## 6. Access Token Expiry & Refresh

### 6.1 Expired Access Token

1. Client sends request with expired JWT.
2. App API responds `401 Unauthorized`.
3. Client initiates refresh.

---

### 6.2 Refresh Token Rotation

1. Client sends refresh token to Identity Service.
2. Identity Service:
- validates token
- rotates refresh token
- issues new access and refresh tokens
3. Client updates tokens and retries original request.

This process is invisible to the user.

---

## 7. Logout & Returning Users

### 7.1 Logout

1. User taps Logout.
2. Client calls `/auth/logout`.
3. Identity Service revokes refresh token.
4. Client clears tokens and returns to Login.

---

### 7.2 Returning User (Cold Start)

1. App starts.
2. Refresh token exists:
- attempt silent refresh
- success → enter app
- failure → show Login

---

## 8. Responsibilities by Component

### Client
- token storage
- request retry on refresh
- routing and UI

### Identity Service
- authentication
- token lifecycle
- JWT signing
- JWKS publishing

### App API
- all domain logic
- user data isolation
- external API integration

---

## 9. Related UML Diagrams

- Use Case Diagram – MealFlow Overview
- Sequence Diagram – Login + Fetch Recipes
- Flowchart – Real JWKS Trust Flow
- Activity Diagram – Plan Weekly Meals
- Activity Diagram – Generate Shopping List
- Activity Diagram – Save Inspiration as Own Recipe
