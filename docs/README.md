# MealFlow – Technical Documentation

This folder contains the **technical documentation** for the MealFlow project.

The purpose of this documentation is to:
- explain architectural and design decisions
- show traceability from requirements to implementation
- support UML diagrams and OOAD artifacts
- complement the source code with system-level reasoning

The documentation is structured to be readable both for:
- examiners
- developers reviewing the project

---

## Start Here

- **Project Overview**  
  `overview.md`  
  High-level description of the project goals, scope, and context.

- **System Overview**  
  `system/system-overview.md`  
  Describes the overall system architecture and responsibilities.

---

## Architecture & System Flow

- **System Overview**  
  `system/system-overview.md`

- **User Flow & System Interaction**  
  `system/user-flow-system-interaction.md`  
  End-to-end description of how users interact with the system and how
  requests flow through the backend services.

- **Glossary**  
  `system/glossary.md`  
  Definitions of key terms used across diagrams, documentation, and code.

---

## Requirements

- **Requirements Table**  
  `requirements/requirements-table.md`  
  Functional requirements, non-functional requirements, and constraints
  with clear traceability to design and implementation.

---

## Authentication & Security

- **Identity Service OOAD**  
  `ooad/identity-service-ooad.md`  
  Analysis and design of the authentication and token subsystem.

---

## Domain & API

- **REST API Overview**  
  `api/rest-api-overview.md`

- **App API OOAD**  
  `ooad/app-api-ooad.md`  
  Domain modeling, use cases, and design of the App API.

---

## OOAD & Design

- **System OOAD**  
  `ooad/system-ooad.md`  

These documents describe how requirements were translated into:
- use cases
- domain models
- UML diagrams

---

## UML Diagrams

All UML diagrams used in the project are located under:

docs/diagrams/


Including:
- Use Case Diagrams
- Class Diagrams
- Sequence Diagrams
- Activity Diagrams

Each diagram directly supports one or more documented use cases or requirements.

---

## Relation to Source Code

The documentation and source code are designed to align:

- Each backend service corresponds to a documented subsystem
- Naming in diagrams matches code concepts
- Security and data flow decisions are reflected in implementation

Together, the documentation and code form a complete picture of the MealFlow system.