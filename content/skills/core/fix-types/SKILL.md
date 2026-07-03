---
description: Find and fix TypeScript errors and `any` types across the codebase
user-invocable: true
---

# /fix-types — Fix TypeScript Errors and `any` Types

You are a TypeScript specialist. Find and fix type errors and eliminate `any` usage.

## Workflow

### 1. Determine Scope

If the user provides specific files, focus there. Otherwise:

**Find TypeScript errors:**
```bash
npm run type-check 2>&1 | tail -200
```

**Find `any` usage:**
Search for explicit `any` in source files (excluding tests, node_modules, .nuxt):
- `src/**/*.ts`
- `src/**/*.vue`

### 2. Categorize Issues

Group findings by type:
1. **Explicit `any`** — Variables, parameters, return types typed as `any`
2. **Type errors** — Incompatible types, missing properties, wrong generics
3. **Missing types** — Untyped functions, implicit `any`
4. **Unsafe assertions** — `as any`, unnecessary type assertions

### 3. Fix Strategy

For each issue, apply the appropriate fix:

#### `any` → Proper Type
```typescript
// BAD
const data: any = await fetchData()
// GOOD
const data: ContractorListItem = await fetchData()
```

#### `any` → `unknown` with Narrowing
```typescript
// BAD
function handle(error: any) { console.log(error.message) }
// GOOD
function handle(error: unknown) {
  if (error instanceof Error) { console.log(error.message) }
}
```

#### Typed Event Handlers
```typescript
// BAD
const onChange = (e: any) => { ... }
// GOOD
const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  // ...
}
```

#### Proper Interfaces
```typescript
// BAD
const config: any = { ... }
// GOOD
interface FeatureConfig {
  enabled: boolean
  threshold: number
}
const config: FeatureConfig = { ... }
```

### 4. Check Existing Types

Before creating new types, always check:
- `src/types/` — Project type definitions
- PrimeVue type exports — For component event/prop types
- Nuxt auto-imports — For framework types

### 5. Apply Fixes

- Fix one file at a time
- Preserve existing behavior — type fixes should not change runtime behavior
- Prefix genuinely unused parameters with `_` (e.g., `_event`)
- Use generics where appropriate for reusable code

### 6. Verify

After fixing, run all checks:
```bash
npm run type-check 2>&1
npm run lint 2>&1
npx vitest run 2>&1
```

All three must pass.

## Rules
- **NEVER use `any`** — Use `unknown`, proper types, generics, or type narrowing
- **Check existing types first** — Don't duplicate types that already exist in `src/types/`
- **Don't over-type** — Let TypeScript infer where it can
- **Prefix unused params with `_`** — e.g., `_options`, `_event`
- **No behavior changes** — Type fixes must not alter runtime behavior
- **Export all new types** — Make them reusable from `src/types/`
