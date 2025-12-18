# App API – OOAD

This document describes the **Object-Oriented Analysis and Design (OOAD)**
for the **App API** subsystem of MealFlow.

The App API contains **all domain logic** in the system, including recipes,
weekly planning, shopping lists, inspiration integration, and user profiles.

Authentication and token handling are performed by the **Identity Service**
and are documented separately.

---

## 1. Scope & Context

### 1.1 In Scope

The App API is responsible for:

- Exposing REST endpoints under `/api/*`
- Managing user-owned domain data:
  - Recipes
  - Inspiration (external integration)
  - Weekly meal plans
  - Shopping lists
  - User profile and preferences
- Ensuring **strict user data isolation** using `userId` from the JWT (`sub`)
- Persisting all domain data in **`app-db` (MongoDB)**

---

### 1.2 Out of Scope

The following concerns are handled by other subsystems:

- Authentication, login, logout, refresh tokens → **Identity Service**
- Password hashing, JWT signing, JWKS → **Identity Service**
- User interface → **Expo client**
- Payments, notifications → future scope

---

## 2. Requirements

### 2.1 Functional Requirements

#### Recipes
- Users shall be able to create, read, update, and delete recipes.
- Each recipe shall belong to exactly one user.
- Recipes shall contain title, description, ingredients, and steps.

#### Inspiration
- Users shall be able to browse inspiration recipes from an external API.
- Inspiration recipes shall be savable as user-owned recipes.
- Saved inspiration recipes shall be editable like normal recipes.

#### Weekly Planner
- Users shall be able to create and update weekly meal plans.
- Weekly plans shall contain entries per day and meal type.
- Plan entries may reference a recipe or be free-text custom entries.
- Plan entries may contain extra items and notes.

#### Shopping List
- Users shall be able to generate shopping lists from weekly plans.
- Ingredients and extra items shall be aggregated across the plan.
- Users shall be able to update, add, and remove shopping list items.
- Shopping lists shall be stored per user.

#### Profile & Settings
- Users shall be able to view and update profile data and preferences.
- Profile data shall be stored per user in `app-db`.

---

### 2.2 Non-Functional Requirements

**Security**
- All requests must include a valid JWT access token.
- JWTs shall be validated using the Identity Service JWKS.
- All database queries shall be scoped by `userId`.

**Consistency**
- Weekly plans must only reference recipes owned by the same user.
- Shopping lists must only be generated from the user’s own data.

**Maintainability**
- Clear separation of controllers, services, and repositories.
- Domain objects shall be consistently modeled in code and UML.

---

## 3. Epics & User Stories

### Epic A – Recipes & Inspiration
- Create and manage personal recipes
- Browse and save inspiration recipes
- Edit and delete recipes

### Epic B – Weekly Planning
- Create and update weekly meal plans
- Assign recipes to days and meal types
- Add custom and free-text entries

### Epic C – Shopping Lists
- Generate shopping lists from weekly plans
- Track, update, and extend shopping lists

### Epic D – Profile
- View and update user profile and preferences

---

## 4. Use Cases

### UC-1 – Manage Recipes
Users can create, view, update, and delete their own recipes.
All operations are scoped by `userId`.

---

### UC-2 – Browse Inspiration & Save Recipe
Users browse inspiration recipes retrieved from an external API and may
save selected recipes as their own.

---

### UC-3 – Plan Weekly Meals
Users create and update weekly plans by assigning recipes or custom
entries to days and meal types, including extra items and notes.

---

### UC-4 – Generate Shopping List
Users generate shopping lists from a weekly plan. The system aggregates
ingredients and extra items into a persistent shopping list.

---

### UC-5 – Manage Shopping List
Users check off items, adjust quantities, add new items, or remove items
from the shopping list.

---

### UC-6 – View & Update Profile
Users view and update profile information and preferences.

---

## 5. UML Diagrams

The App API design is visualized by the following UML diagrams:

- App API Use Case Diagram
- App API Class Diagram – Core Domain Model
- Sequence Diagram – Generate Shopping List
- Activity Diagram – Plan Weekly Meals
- Activity Diagram – Generate Shopping List
- Activity Diagram – Save Inspiration as Own Recipe

These diagrams are derived directly from the requirements and use cases
described in this document.
