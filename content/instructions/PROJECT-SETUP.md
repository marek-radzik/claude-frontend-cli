# {{PROJECT_NAME}} — Project Setup

**Purpose**: Project-specific configuration and environment setup.

**Project**: {{PROJECT_NAME}}
**Type**: <!-- e.g. Transport & Logistics Management System -->

---

## 🔐 Backend API

### API Base URL

```
{{API_BASE_URL}}
```

### API Documentation

**Live API Docs**: {{API_BASE_URL}}/docs/api.json

This JSON typically contains: all endpoints, request/response schemas, query parameters,
validation rules, and authentication requirements. Point Claude at it when analyzing the API.

---

## 📦 Project-Specific Packages

List packages that are specific to this project (beyond the generic stack in the root `CLAUDE.md`).

```json
{
  // "@nuxtjs/i18n": "…",
  // "@primevue/forms": "…",
  // "@vee-validate/zod": "…"
}
```

---

## 🌍 Environment Variables

Document the env vars developers need (never commit secrets — reference names only):

```
# API_BASE_URL={{API_BASE_URL}}
# …
```

---

## 🚀 Local Development

```bash
npm install
npm run dev
```

<!--
  Fill in project-specific notes: ports, worktrees, docker/backend setup,
  auth for local E2E, seed data, etc.
-->
