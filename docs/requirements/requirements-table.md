# Requirements Table – MealFlow

This document collects **all functional and non-functional requirements**
for the MealFlow system in one place.

The requirements are structured to provide **clear traceability** between:
- requirements
- use cases
- UML diagrams
- implemented system behavior

---

## 1. Functional Requirements – App API (APR)

### APR-1 — Recipes

| ID | Requirement |
|----|-------------|
| APR-1.1 | The system shall allow users to create their own recipes. |
| APR-1.2 | The system shall allow users to view all their own recipes. |
| APR-1.3 | The system shall allow users to update existing recipes. |
| APR-1.4 | The system shall allow partial recipe updates. |
| APR-1.5 | The system shall allow users to delete recipes. |
| APR-1.6 | A recipe shall contain title, description, ingredients, and steps. |
| APR-1.7 | Each recipe shall belong to exactly one user. |
| APR-1.8 | Saved inspiration recipes shall behave as normal user recipes. |

---

### APR-2 — Inspiration

| ID | Requirement |
|----|-------------|
| APR-2.1 | The system shall allow browsing inspiration recipes from an external API. |
| APR-2.2 | External recipe data shall be normalized before being returned to the client. |
| APR-2.3 | Users shall be able to save inspiration recipes as personal recipes. |
| APR-2.4 | Saved inspiration recipes shall be editable like normal recipes. |

---

### APR-3 — Weekly Planner

| ID | Requirement |
|----|-------------|
| APR-3.1 | The system shall allow users to create weekly meal plans. |
| APR-3.2 | Weekly plans shall contain entries with day, meal type, recipe or custom item, and servings. |
| APR-3.3 | The system shall allow updating weekly plans. |
| APR-3.4 | The system shall allow partial updates to weekly plans. |
| APR-3.5 | The system shall allow users to delete weekly plans. |
| APR-3.6 | The planner shall support extra custom items (e.g. snacks). |
| APR-3.7 | The planner shall support both recipe-based and free-text entries. |

---

### APR-4 — Shopping Lists

| ID | Requirement |
|----|-------------|
| APR-4.1 | The system shall allow generating shopping lists from weekly plans. |
| APR-4.2 | Ingredients shall be aggregated and merged across the plan. |
| APR-4.3 | Generated shopping lists shall be stored persistently. |
| APR-4.4 | Users shall be able to update shopping lists. |
| APR-4.5 | Partial updates to shopping lists shall be supported. |
| APR-4.6 | Users shall be able to add custom items to shopping lists. |
| APR-4.7 | Users shall be able to delete shopping lists. |

---

### APR-5 — Profile

| ID | Requirement |
|----|-------------|
| APR-5.1 | The system shall store basic user profile information. |
| APR-5.2 | Users shall be able to update their profile. |
| APR-5.3 | Partial profile updates shall be supported. |
| APR-5.4 | Profile data shall be stored in the App API database. |

---

## 2. Functional Requirements – Identity Service (IDR)

| ID | Requirement |
|----|-------------|
| IDR-1.1 | The system shall allow user registration. |
| IDR-1.2 | User passwords shall be hashed using Argon2. |
| IDR-1.3 | The system shall allow user login. |
| IDR-1.4 | Login shall return an access token and a refresh token. |
| IDR-1.5 | Refresh tokens shall be rotated on every refresh. |
| IDR-1.6 | Invalid or expired refresh tokens shall be rejected. |
| IDR-1.7 | The system shall allow users to log out by revoking refresh tokens. |
| IDR-1.8 | The system shall expose a JWKS endpoint for token verification. |
| IDR-1.9 | User accounts shall be stored in the identity database. |
| IDR-1.10 | Refresh tokens shall be stored hashed in the identity database. |

---

## 3. Non-Functional Requirements (NFR)

| ID | Requirement | Category |
|----|-------------|----------|
| NFR-1.1 | All external communication shall use HTTPS. | Security |
| NFR-1.2 | JWT access tokens shall be validated using JWKS. | Security |
| NFR-1.3 | Refresh tokens shall be stored hashed server-side. | Security |
| NFR-1.4 | Access tokens shall have short expiration times. | Security |
| NFR-1.5 | Authentication and domain logic shall be separated into different services. | Architecture |
| NFR-1.6 | The system shall follow clean separation of concerns. | Maintainability |
| NFR-1.7 | Typical requests shall complete within acceptable latency. | Performance |
| NFR-1.8 | Each service shall have isolated database access. | Security |
| NFR-1.9 | JWT validation shall avoid remote calls on each request. | Performance |
| NFR-1.10 | Token expiry shall be handled transparently for the user. | Usability |

---

## 4. Constraints (CON)

| ID | Constraint |
|----|------------|
| CON-1 | Refresh tokens must be stored securely on the client. |
| CON-2 | Access tokens must not be stored persistently on the client. |
| CON-3 | The App API must not call the Identity Service except for JWKS retrieval. |
| CON-4 | Refresh tokens must never be stored in plaintext. |
| CON-5 | Weekly plans must only reference recipes owned by the same user. |
| CON-6 | All domain data must be scoped by userId. |
| CON-7 | External API keys must never be exposed to the client. |

---

## 5. Traceability

Each requirement in this document is reflected in:
- documented use cases
- UML diagrams
- implemented system behavior

This ensures consistency between requirements, design, and code.
