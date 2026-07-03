---
description: Scaffold a complete feature following the layered architecture (types, repo, store, composable, schema, component, i18n, page)
user-invocable: true
---

# /new-feature — Scaffold Complete Feature

You are a feature scaffolder for a Nuxt 3 application. You follow strict TDD and layered architecture.

## Before Starting — Gather Information

Ask the user for:
1. **Domain name** (e.g., `contractor`, `vehicle`, `order`)
2. **Entity name** (e.g., `Contractor`, `Vehicle`)
3. **API endpoint** (e.g., `/api/contractors`)
4. **Fields** with types (e.g., `name: string`, `status: 'active' | 'inactive'`)
5. **CRUD operations** needed (list, show, create, update, delete)
6. **Permissions** (e.g., `contractors.list`, `contractors.create`)

## Required Reading

Before generating any code, read these documentation files:
- `.docs/ARCHITECTURE.md` — Layer rules and data flow
- `.docs/TDD.md` — Test patterns and requirements
- `.docs/TYPESCRIPT.md` — Type standards
- `.docs/I18N.md` — Translation patterns
- `.docs/PERMISSIONS.md` — Permission system
- `.docs/ERROR-HANDLING.md` — Error handling with useToaster

Also scan for existing patterns:
- `src/types/` — Existing type conventions
- `src/repository/` — Existing repository patterns
- `src/stores/` — Existing store patterns
- `src/composables/` — Existing composable patterns

## Implementation Order (STRICT)

Follow the layered architecture strictly — never skip layers:

### 1. Types (`src/types/{Domain}/`)
- Define entity types, list item types, form types, API response types
- Export all types
- Never use `any` — use `unknown` with narrowing if needed

### 2. Tests (RED phase) (`src/tests/`)
- Write failing tests FIRST for repository, store, composable
- Use `// @vitest-environment nuxt` header
- Test file naming: `*.nuxt.test.ts`
- Cover: happy path, error cases, edge cases, loading states, permissions

### 3. Repository (`src/repository/{domain}/`)
- Create repository class with typed methods
- Register in `src/plugins/repositories.ts`
- Use `useIFetch` for API calls

### 4. Store (`src/stores/{domain}/`)
- Create Pinia store using `defineStore`
- Use `storeToRefs` for reactive state extraction (never destructure store directly)
- Handle loading, error, and data states

### 5. Composable (`src/composables/{domain}/`)
- Bridge between components and stores
- Handle error display with `useToaster()` (NEVER `useToast()`)
- Manage loading states
- Guard API calls with permission checks to prevent 403 redirects

### 6. Validation Schema (`src/validatorSchemas/`)
- Create Zod schema for form validation
- All error messages use i18n keys

### 7. Components (`src/components/{domain}/`)
- Use Composition API with `<script setup lang="ts">`
- Permission guards: `v-if="hasPermission('...')"` on action buttons
- Use `AppDatePicker` (never `DatePicker` from primevue)
- Handle empty, loading, and error states

### 8. i18n (`src/static/locales/pl.json`)
- Add all translation keys
- Follow structure: `pages.{domain}.*`, `buttons.*`, `common.*`, `validation.*`
- All translations in Polish

### 9. Page (`src/pages/`)
- Add `definePageMeta` with middleware and permissions
- Wire up components

### 10. Verify (GREEN phase)
- Run tests: `npx vitest run --reporter=verbose`
- Run type-check: `npm run type-check`
- Run lint: `npm run lint`
- All must pass

## Critical Rules
- **TDD is mandatory** — tests before implementation
- **Never use `any`** — strict TypeScript
- **useToaster()** not useToast()
- **AppDatePicker** not DatePicker
- **storeToRefs** for store state
- **Guard API calls** with permission checks (prevent 403 redirect)
- **i18n everything** — no hardcoded user-facing text
- **2-level permissions** — page (definePageMeta) + component (v-if)
