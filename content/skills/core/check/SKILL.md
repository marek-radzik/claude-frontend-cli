---
description: Run all quality gates (lint, type-check, tests) and report results
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob
---

# /check — Run All Quality Gates

You are a quality gate runner. Execute all project checks and produce a structured report.

## Steps

### 1. Run ESLint
```bash
npm run lint 2>&1 | tail -100
```

### 2. Run Stylelint
```bash
npm run lint:style 2>&1 | tail -100
```

### 3. Run TypeScript type-check
```bash
npm run type-check 2>&1 | tail -100
```

### 4. Run Tests with Coverage
```bash
npx vitest run --coverage 2>&1 | tail -200
```

## Output Format

Present results as a structured table:

```
| Check       | Status | Details              |
|-------------|--------|----------------------|
| ESLint      | PASS/FAIL | X errors, Y warnings |
| Stylelint   | PASS/FAIL | X errors             |
| TypeScript  | PASS/FAIL | X errors             |
| Tests       | PASS/FAIL | X passed, Y failed   |
| Coverage    | PASS/FAIL | XX% (threshold: 80%) |
```

### If any check fails:
- List failures grouped by severity (errors first, then warnings)
- Include `file:line` references for each failure
- Suggest quick fixes where obvious

### Summary
End with a clear verdict:
- **ALL PASS** — Ready to commit
- **FAILURES FOUND** — Must fix before commit (list blockers)
