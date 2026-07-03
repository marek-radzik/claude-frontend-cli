---
description: Scan for hardcoded strings in templates and composables, replace with t('key') translations
user-invocable: true
---

# /add-i18n — Replace Hardcoded Strings with i18n

You are an internationalization specialist. Find and replace hardcoded user-facing strings with proper i18n keys.

## Workflow

### 1. Determine Scope

If the user provides specific files or a domain, focus there. Otherwise, ask:
- Which files/domain to scan?
- Or scan recent git changes: `git diff --name-only develop`

### 2. Read Existing Locale File

Read `src/static/locales/pl.json` to understand:
- Existing key structure and conventions
- Keys that can be reused (avoid duplicates)

### 3. Scan for Hardcoded Strings

Search for hardcoded text patterns in Vue templates and TypeScript:

**In templates (`<template>`):**
- Text content between tags: `<span>Hardcoded</span>`
- Attribute values: `placeholder="Type here"`, `label="Name"`
- But IGNORE: CSS classes, component names, HTML attributes like `type`, `name`, etc.

**In scripts (`<script>`):**
- String literals passed to UI (toasts, confirmations, labels)
- But IGNORE: API paths, store IDs, event names, technical strings

### 4. Generate i18n Keys

Follow the project key structure:
- `pages.{domain}.{context}` — Page-specific labels
- `pages.{domain}.form.{field}` — Form field labels
- `pages.{domain}.table.{column}` — Table column headers
- `buttons.{action}` — Common button labels (check existing first)
- `common.{term}` — Shared terminology (check existing first)
- `validation.{rule}` — Validation error messages
- `messages.{context}` — Toast/notification messages

### 5. Apply Changes

For each hardcoded string:

**Template text:**
```vue
<!-- Before -->
<span>Nazwa kontrahenta</span>
<!-- After -->
<span>{{ t('pages.contractor.name') }}</span>
```

**Template attributes:**
```vue
<!-- Before -->
<InputText placeholder="Wpisz nazwę" />
<!-- After -->
<InputText :placeholder="t('pages.contractor.form.namePlaceholder')" />
```

**Script strings:**
```typescript
// Before
showSuccess('Zapisano pomyślnie')
// After
showSuccess(t('messages.savedSuccessfully'))
```

### 6. Update Locale File

Add all new keys to `src/static/locales/pl.json`:
- Maintain alphabetical order within sections
- All values in Polish
- Reuse existing keys where the meaning matches exactly

### 7. Ensure `useI18n` is Imported

If the component doesn't already have it, add:
```typescript
const { t } = useI18n()
```

### 8. Verify

- Check that no hardcoded user-facing strings remain in scanned files
- Run `npm run lint` to ensure no issues
- Run `npm run type-check` to verify

## Rules
- **All translations in Polish** (this is a Polish application)
- **Reuse existing keys** — check `pl.json` before creating new ones
- **Never duplicate keys** — if `buttons.save` exists, use it
- **Don't touch technical strings** — API paths, store IDs, CSS classes, event names
- **Maintain locale file structure** — keep it organized and alphabetical
