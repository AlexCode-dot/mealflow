# Why MongoDB – MealFlow

This document explains **why MealFlow uses MongoDB** (a document database)
for both services instead of a relational SQL database.

---

## Summary

MealFlow uses MongoDB because the data model is **document-centric**, the
schema is **flexible**, and most queries are **user-scoped** and simple.
This choice keeps development fast and aligns well with how data is shaped
in the app.

---

## Data model fit

Many core entities map naturally to documents with embedded arrays:

- **Recipes** contain ingredient lists and steps.
- **Weekly plans** contain arrays of plan entries.
- **Shopping lists** contain item arrays and per-item state.

MongoDB lets us store and retrieve these structures without complex joins.

---

## Service boundaries

MealFlow is split into two services with separate databases:

- **Identity Service** → users + refresh tokens
- **App API** → recipes, plans, shopping lists, profile

MongoDB provides clean, isolated databases per service while keeping the
storage model consistent across both.

---

## Flexibility during iteration

The product is still evolving. A document database allows:

- Adding optional fields without migrations
- Evolving data structures as features grow
- Faster prototyping with fewer schema constraints

---

## Tradeoffs (acknowledged)

Choosing MongoDB means:

- No relational joins (handled in service code instead)
- Strong consistency must be handled carefully at the application layer
- Some analytical queries are less natural than SQL

These tradeoffs are acceptable for the current scope and scale.

---

## Why not SQL right now?

A relational model would require:

- Multiple join tables for lists and nested items
- More complex migrations for evolving fields
- Slower iteration on nested structures

Given the current requirements, MongoDB is a better fit for speed and
simplicity.
