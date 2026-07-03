# {{PROJECT_NAME}} — Business Domain

**Purpose**: Describe the business entities, domain logic, and validation rules specific to this project.
Claude reads this to understand *what* it is building, not just *how*.

---

## Primary Entities

### {{PRIMARY_ENTITY}}

<!--
  Describe the main entity: what it represents, its key fields, its lifecycle/statuses,
  and how it relates to other entities.
-->

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| … | | |

**Statuses / lifecycle**: <!-- e.g. draft → active → archived -->

**Relations**: <!-- e.g. {{PRIMARY_ENTITY}} has many … -->

---

## Domain Validation Rules

Document non-obvious validation rules (formats, cross-field constraints, business invariants).

- <!-- e.g. NIP: 10 digits with checksum -->
- <!-- e.g. REGON: 9 or 14 digits -->

→ Implement these with Zod schemas per `.docs/FORMS.md`.

---

## Permissions

List the domain permissions used for RBAC (page + component level, per `.docs/PERMISSIONS.md`):

```
{{PRIMARY_ENTITY_LOWER}}.list
{{PRIMARY_ENTITY_LOWER}}.create
{{PRIMARY_ENTITY_LOWER}}.edit
{{PRIMARY_ENTITY_LOWER}}.delete
```

---

## Glossary

<!-- Industry / project-specific terms so Claude uses correct naming in UI copy. -->
