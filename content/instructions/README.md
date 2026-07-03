# .instructions — Project-Specific Documentation

**Purpose**: `{{PROJECT_NAME}}` business logic, configuration, and implementation examples.

This folder is the **project-specific** counterpart to the generic `.docs/` stack guides.
`claude-frontend-cli` (`cfc`) installs it as a set of **stubs with placeholders** — fill them in for your project.

---

## When to use this folder

**Use `.instructions/` for:**
- Project-specific API URLs and backends
- Business domain entities (e.g. `{{PRIMARY_ENTITY}}`) and domain logic
- Domain-specific validation rules (NIP, REGON, KRS, …)
- Specific component file paths to reference as "gold standard"
- Project-specific constants (listing keys, permission names)

**Use `.docs/` for:**
- Generic stack patterns (Vue 3, Nuxt 3, TypeScript)
- Architecture, TDD, generic table/form/component/API patterns

---

## Files

| File | Purpose |
|------|---------|
| [PROJECT-SETUP.md](./PROJECT-SETUP.md) | API base URL, environment, project-specific packages |
| [BUSINESS-DOMAIN.md](./BUSINESS-DOMAIN.md) | Business entities, domain logic, validation rules |
| [REFERENCE-IMPLEMENTATIONS.md](./REFERENCE-IMPLEMENTATIONS.md) | Example components to copy/follow |

---

## Reusability

- **Keep `.docs/` generic** — no project-specific examples there.
- **Put everything project-specific here** — and update this table when you add files.
- Re-run `cfc sync` to pull newer generic guides without losing your `.instructions/` edits.
