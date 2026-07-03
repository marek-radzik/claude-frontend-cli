---
description: Create a standardized data table following TABLES.md patterns with filters, sorting, pagination, and column customization
user-invocable: true
---

# /new-table — Create Standardized Data Table

You are a table implementation specialist for a Nuxt 3 + PrimeVue application.

## Before Starting — Gather Information

Ask the user for:
1. **Domain** (e.g., `contractor`, `vehicle`)
2. **API endpoint** for list data
3. **Columns** — for each column provide: name, label (i18n key), type (text, number, date, select, multiselect, boolean, currency), filterable, sortable
4. **Permissions** (list, create, edit, delete)
5. **Row actions** (view, edit, delete, custom)

## Required Reading

Before generating any code, read these files:
- `.docs/TABLES.md` — Table standardization rules
- `.instructions/TABLE-IMPLEMENTATION-GUIDE.md` — Detailed implementation guide
- `.instructions/REFERENCE-IMPLEMENTATIONS.md` — Reference examples

Also study the gold standard reference implementation:
- `src/components/contractor/table/ContactList.vue`

And understand column configurations:
- `src/types/Tables/ColumnsListType.ts` — Column types

## Implementation Order

### 1. Types
- List item type in `src/types/{Domain}/`
- Filter types if needed

### 2. Tests (RED)
- Write failing tests first
- Test: data loading, filtering, sorting, pagination, permissions, empty states

### 3. Repository
- List endpoint with pagination, sorting, filtering params
- Register in `src/plugins/repositories.ts`

### 4. Store
- Pinia store with list state, pagination, filters
- Use `storeToRefs` pattern

### 5. Composable
- Table logic composable
- Use `useToaster()` for errors
- Guard API calls with permission checks

### 6. Table Component
Must include ALL of these features:

#### Global Search
- 500ms debounce
- Searches across all searchable columns

#### Advanced Filters (ColumnOptions)
- Filter types based on column type:
  - **Text**: contains/not_contains/equals/starts_with/ends_with
  - **Number/Currency**: min-max range inputs (NO currency mode on InputNumber!)
  - **Date**: date range with AppDatePicker (never DatePicker)
  - **Select** (`equal`/`not_equal`): Single Select component
  - **Select** (`in`/`not_in`): MultiSelect component
- MultiSelect values sent as plain JSON arrays (NEVER stringified)
- Clear filters button

#### Column Customization
- Show/hide columns via checkbox panel
- Column order persistence

#### Pagination
- Server-side pagination
- Page size options

#### States
- Loading state (skeleton/spinner)
- Empty state with message
- Error state

#### Permissions
- Action buttons guarded with `v-if="hasPermission('...')"`
- Page-level: `definePageMeta({ middleware: 'permission', permissions: [...] })`

#### localStorage Persistence
- Save filter state, column visibility, page size

### 7. i18n
- All column labels, filter labels, action labels, empty/error messages
- Polish translations in `src/static/locales/pl.json`

### 8. Verify (GREEN)
- All tests pass
- Type-check passes
- Lint passes

## Critical Table Rules
- **NEVER** use `mode="currency"` on InputNumber in filters
- **NEVER** use currency symbols ("zl", "PLN") in filter inputs
- Currency fields ALWAYS use min-max range in ColumnOptions
- MultiSelect values are plain arrays, not stringified
- Select type `equal`/`not_equal` → Single Select
- Select type `in`/`not_in` → MultiSelect
- Use `AppDatePicker` (never `DatePicker` from primevue)
- Use `storeToRefs` for store state (never destructure directly)
- Guard API calls with permission checks (prevent 403 redirect)
