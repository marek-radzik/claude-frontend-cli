---
description: Audit permissions, unguarded API calls, and 403 redirect risks across the application
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# /permissions-audit — Permissions & 403 Redirect Audit

You are a security auditor for a Nuxt 3 application with RBAC permissions. Focus on permission gaps and the critical 403 redirect risk.

## Critical Context

**The application has a global 403 interceptor** in `src/plugins/useIFetch.ts` that redirects the entire page to `/403` when ANY API call returns HTTP 403. This means:
- An unguarded API call (e.g., fetching dictionary data) can block the whole page
- ALL API calls must be guarded by permission checks BEFORE they execute
- This is the #1 security risk pattern in this application

## Workflow

### 1. Scan Page Permissions

Check every page file for `definePageMeta` with permissions:

```
src/pages/**/*.vue
```

For each page:
- [ ] Has `definePageMeta({ middleware: 'permission', permissions: [...] })`
- [ ] Permissions match the page's purpose
- Flag pages WITHOUT permission middleware

### 2. Scan Component Permissions

Check components for permission-guarded actions:

```
src/components/**/*.vue
```

Look for action elements (buttons, links) that should be guarded:
- Create/Add buttons → needs `.create` permission
- Edit buttons → needs `.update` permission
- Delete buttons → needs `.delete` permission
- [ ] All action buttons have `v-if="hasPermission('...')"`

### 3. CRITICAL: Find Unguarded API Calls

This is the most important check. Search for API calls that execute without permission checks:

**Pattern to find:** API calls in composables/stores that are NOT wrapped in permission checks.

Check:
- `src/composables/**/*.ts` — Look for repository calls without `if (hasPermission(...))` guards
- `src/stores/**/*.ts` — Look for direct API calls
- Especially dangerous: `onMounted`, `watch`, `immediate: true` watchers that auto-fetch

**Known risk pattern:**
```typescript
// DANGEROUS — will 403-redirect if user lacks permission
onMounted(() => {
  fetchTaskReasons() // No permission check!
})

// SAFE
onMounted(() => {
  if (canViewReasons.value) {
    fetchTaskReasons()
  }
})
```

### 4. Check useToast vs useToaster

Search for direct `useToast()` usage (should use `useToaster()` instead):
- `useToast()` from PrimeVue bypasses the project's error handling layer
- All toast usage should go through `useToaster()`

### 5. Check CRM Offer Public Links

Verify CRM offer public link operations are guarded:
- Copy link button → `crm-offer-public-links.list`
- Edit public link → `crm-offer-public-links.list`
- Show public link → `crm-offer-public-links.list`

### 6. Check for Sensitive Data Exposure

- No API keys or secrets in source code
- No credentials in configuration files
- No sensitive data logged to console in production

### 7. Produce Report

```
## Security & Permissions Audit Report

### CRITICAL — Unguarded API Calls (403 Redirect Risk)
These API calls will cause full page redirect to /403 for users without permissions:
- [file:line] `fetchX()` called without permission check in `onMounted`
  → Wrap with: `if (hasPermission('x.list')) { fetchX() }`

### HIGH — Missing Page Permissions
Pages without definePageMeta permission middleware:
- [file] `/pages/admin/settings.vue` — No permissions defined

### HIGH — Missing Component Permission Guards
Action buttons without v-if="hasPermission(...)":
- [file:line] Delete button has no permission guard

### MEDIUM — useToast() Direct Usage
- [file:line] Uses useToast() instead of useToaster()

### LOW — Other Findings
- [file:line] Description

---
**Risk Summary:**
- Critical: X unguarded API calls
- High: X missing permissions
- Medium: X direct useToast
- Low: X other issues

**Overall Risk Level: HIGH/MEDIUM/LOW**
```

## Rules
- **Read-only** — never modify files
- **Prioritize 403 risks** — unguarded API calls are the #1 issue
- **Check every page** — no page should lack permissions
- **Be specific** — include file:line and exact fix suggestions
- **Check CRM offer links** — known permission requirement
- **Reference useIFetch.ts** — explain the 403 redirect mechanism when reporting
