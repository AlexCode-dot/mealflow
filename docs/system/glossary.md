# Glossary – MealFlow

This glossary defines key terms and concepts used throughout the MealFlow
documentation, UML diagrams, and source code.

The goal is to ensure **consistent terminology** and make the system easier
to understand for readers unfamiliar with the project.

---

## Access Token
A short-lived **JWT** issued by the Identity Service after successful
authentication.  
Used by the client to authenticate requests to the App API.

---

## App API
The backend service responsible for **all domain logic** in MealFlow,
including recipes, weekly planning, shopping lists, inspiration, and
user profiles.

---

## Client (Expo App)
The mobile-first client application built using **React Native with Expo**.
Responsible for user interaction and communication with backend services.

---

## Domain Logic
Business rules and behavior related to MealFlow features, such as:
recipes, planning, and shopping lists.  
Implemented exclusively in the App API.

---

## External Recipes API
A third-party API used to fetch inspiration recipes.  
Only accessed by the App API; never directly by the client.

---

## Identity Service
A standalone backend service responsible for:
authentication, password hashing, token issuance, and token lifecycle
management.

---

## JWT (JSON Web Token)
A signed token format used for stateless authentication.
MealFlow uses JWTs as **access tokens**.

---

## JWKS (JSON Web Key Set)
A publicly exposed set of cryptographic keys used by the App API to verify
JWT signatures issued by the Identity Service.

---

## OOAD (Object-Oriented Analysis and Design)
A design approach used to model the system using:
objects, responsibilities, use cases, and UML diagrams.

---

## Refresh Token
A long-lived, opaque token used to obtain new access tokens.
Stored hashed in the Identity Service database and rotated on use.

---

## Secure Storage
Platform-provided encrypted storage on the client device, used to store
refresh tokens safely.

---

## Subsystem
A logically separated part of the system with a clearly defined
responsibility (e.g., Identity Service, App API).

---

## User ID (`userId`)
A unique identifier for a user.
Derived from the `sub` claim in the JWT and used to scope all user-owned data.

---

## Weekly Plan
A user-created plan defining meals per day and meal type for a given week.
Stored and managed by the App API.

---

## Shopping List
A list of aggregated ingredients and items generated from a weekly plan.
Stored persistently and editable by the user.

---

## UML (Unified Modeling Language)
A standardized visual language used to describe system design.
Includes use case, class, sequence, and activity diagrams.
