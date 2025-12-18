# Web Demo Deployment – MealFlow

> **Optional – Demo Instructions**  
> This document explains how to run a public web demo of MealFlow.
> It is not required for system design or grading.

---

## 1. Purpose

The web demo allows reviewers or recruiters to:
- explore the UI
- test basic functionality
- understand the user experience

---

## 2. Demo Setup Overview

The demo consists of:
- Expo Web frontend
- Deployed Identity Service
- Deployed App API
- Hosted MongoDB (Atlas)

---

## 3. Backend Preparation

Both backend services must:
- be deployed with HTTPS
- expose public base URLs
- allow the web origin via CORS

---

## 4. Frontend Configuration

Set environment variables for Expo Web:

```env
IDENTITY_BASE_URL=https://identity.example.com
APP_API_BASE_URL=https://api.example.com
```

Build and deploy Expo Web.

---

## 5. Demo Limitations

- Demo accounts may be reset periodically
- No production data
- Rate limiting may be applied

---

## 6. Summary

The web demo provides a safe, limited way to showcase MealFlow without
exposing sensitive infrastructure or production data.
