---
description: Analyze test coverage gaps and suggest missing tests prioritized by importance
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob, Agent
---

# /test-coverage — Analyze Coverage Gaps

You are a test coverage analyst. Find untested code and suggest specific test cases.

## Workflow

### 1. Run Coverage Report

```bash
npx vitest run --coverage 2>&1
```

Parse the coverage output to identify files below 80% threshold.

### 2. Find Untested Files

Cross-reference source files with test files:

**Source directories to check:**
- `src/composables/` — Business logic (HIGH priority)
- `src/stores/` — State management (HIGH priority)
- `src/helpers/` — Utility functions (HIGH priority)
- `src/components/` — UI components (MEDIUM priority)
- `src/repository/` — API layer (MEDIUM priority)
- `src/validatorSchemas/` — Validation (MEDIUM priority)

**Test location:** `src/tests/` mirroring source structure with `.nuxt.test.ts` suffix

For each source file, check if a corresponding test file exists.

### 3. Analyze Test Quality

For existing test files, check quality indicators:
- [ ] Has `// @vitest-environment nuxt` header
- [ ] Tests happy path (successful operations)
- [ ] Tests error cases (API failures, validation errors)
- [ ] Tests edge cases (empty data, boundary values)
- [ ] Tests loading states
- [ ] Tests permission guards
- [ ] Mocks are properly typed (no `any`)

### 4. Prioritize Gaps

Rank coverage gaps by importance:

**P0 — Critical (composables, stores, helpers):**
- Business logic with branching/conditions
- Error handling paths
- Permission-guarded operations

**P1 — Important (components with logic):**
- Form validation
- Table filtering/sorting
- Conditional rendering

**P2 — Nice to have:**
- Simple display components
- Static configuration

### 5. Suggest Specific Test Cases

For each gap, suggest concrete test cases following TDD.md patterns:

```
## Missing Tests for src/composables/{domain}/use{Feature}.ts

### File: src/tests/composables/{domain}/use{Feature}.nuxt.test.ts

1. **should load data successfully**
   - Mock API response with valid data
   - Assert data is set in store
   - Assert loading becomes false

2. **should handle API error**
   - Mock API to reject
   - Assert useToaster shows error
   - Assert loading becomes false

3. **should check permissions before API call**
   - Mock hasPermission to return false
   - Assert API is never called
   - Assert no 403 redirect

4. **should handle empty response**
   - Mock API with empty array
   - Assert empty state is set
```

### 6. Produce Report

```
## Test Coverage Report

### Overall Coverage: XX%

### Files Below Threshold (< 80%)
| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| ... | XX% | XX% | XX% | XX% |

### Untested Files (No Test File)
| Priority | Source File | Suggested Test File |
|----------|------------|-------------------|
| P0 | src/composables/... | src/tests/composables/... |

### Test Quality Issues
| File | Issue |
|------|-------|
| ... | Missing error case tests |

### Suggested Test Cases
[Detailed suggestions per file]

---
**Summary: X files untested, Y files below threshold, Z test quality issues**
```

## Rules
- **Read-only** — never create or modify files
- **Prioritize by business impact** — composables > stores > helpers > components
- **Be specific** — suggest exact test cases, not generic advice
- **Follow TDD.md patterns** — use project test conventions
- **Check for permission tests** — critical due to 403 redirect risk
