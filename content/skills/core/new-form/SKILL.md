---
description: Create a form with Zod validation following FORMS.md patterns (create/edit/dual mode, standalone or modal)
user-invocable: true
---

# /new-form — Create Form with Zod Validation

You are a form implementation specialist for a Nuxt 3 + PrimeVue application with Zod validation.

## Before Starting — Gather Information

Ask the user for:
1. **Domain** (e.g., `contractor`, `vehicle`)
2. **Fields** — for each: name, type (text, number, date, select, multiselect, checkbox, radio, textarea, currency), required?, validation rules
3. **Mode**: create only, edit only, or dual (create + edit)
4. **Layout**: standalone page or modal dialog
5. **Permissions** for create/edit
6. **API endpoints** for submit (POST/PUT)

## Required Reading

Before generating any code, read:
- `.docs/FORMS.md` — Form patterns and rules
- `.docs/ERROR-HANDLING.md` — Error handling with useToaster
- `.docs/TDD.md` — Test requirements
- `.docs/TYPESCRIPT.md` — Type standards

Also scan existing form patterns:
- `src/validatorSchemas/` — Existing Zod schemas
- `src/components/*/form/` or `src/components/*/Form*.vue` — Existing forms

## Implementation Order

### 1. Types
- Form data type in `src/types/{Domain}/`
- API request/response types

### 2. Zod Schema (`src/validatorSchemas/`)
- Define validation schema with Zod
- All error messages use i18n keys: `t('validation.*')`
- Common validations: required, min/max length, email, phone, numeric ranges

### 3. Tests (RED)
- Write failing tests first
- Test: validation (valid/invalid inputs), submission, error handling, loading states, mode switching (create vs edit)

### 4. Repository
- Create/update endpoints
- Register in `src/plugins/repositories.ts`

### 5. Store
- Form state management
- Use `storeToRefs`

### 6. Composable
- Form logic: submit, validate, reset, load (for edit mode)
- Use `useToaster()` for success/error feedback (NEVER `useToast()`)
- Guard API calls with permission checks

### 7. Form Component
Key requirements:

#### Field Binding
- Every label must have `for` attribute matching input `id`
- Use `:invalid` prop on PrimeVue inputs for validation error display
- Invalid fields show red borders/styling
- Checkbox and RadioButton use `input-id` prop (not `id`)

#### Date Fields
- **ALWAYS** use `AppDatePicker` from `~/components/common/AppDatePicker.vue`
- **NEVER** use `DatePicker` from `primevue/datepicker`

#### Validation Display
- Show field-level error messages below each input
- Highlight sections/cards containing errors
- Use validation paths to map errors to form sections

#### States
- Loading state during submission
- Disabled state for fields without permission
- Pre-fill fields in edit mode

#### Modal Variant (if applicable)
- Create modal wrapper component
- Emit `close` and `saved` events
- Reset form on close

### 8. i18n (`src/static/locales/pl.json`)
- Field labels, placeholders, validation messages, button labels
- Follow: `pages.{domain}.form.*`, `validation.*`
- All in Polish

### 9. Page Integration
- `definePageMeta` with permissions
- Wire form component to page

### 10. Verify (GREEN)
- All tests pass
- Type-check passes
- Lint passes

## Critical Form Rules
- **AppDatePicker** — never use DatePicker from primevue directly
- **useToaster()** — never useToast() directly
- **:invalid prop** — all inputs must show red on validation error
- **label for** — every label linked to its input
- **Checkbox/RadioButton** — use `input-id`, not `id`
- **No `any`** — strict TypeScript
- **i18n everything** — no hardcoded text
- **TDD** — tests written before implementation
- **storeToRefs** — for reactive store state
