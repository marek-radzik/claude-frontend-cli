# {{PROJECT_NAME}} — Reference Implementations

**Purpose**: Point Claude at the *gold-standard* files in this codebase to copy patterns from.
When implementing a new feature, Claude should mirror these rather than invent new structure.

---

## How to use

For each layer, list the exemplar file(s) in **this** project. Keep this list short and curated —
one or two best examples per layer beats a long list.

| Layer | Gold-standard file | Why |
|-------|--------------------|-----|
| Table / listing | `src/components/…/…List.vue` | <!-- filters + sorting + pagination done right --> |
| Form (create/edit) | `src/components/…/…Form.vue` | <!-- Zod + vee-validate + dual mode --> |
| Composable | `src/composables/…/use….ts` | <!-- error handling + loading/empty states --> |
| Store (Pinia) | `src/stores/…/….ts` | |
| Repository | `src/repository/…/….ts` | <!-- API communication pattern --> |
| Types | `src/types/…/….ts` | |
| Zod schema | `src/validatorSchemas/….ts` | |

---

## Conventions worth copying

<!--
  Note project-specific conventions the reference files demonstrate:
  naming, folder-per-domain layout, LISTING_KEY constants, i18n key structure, etc.
-->

→ Generic patterns live in `.docs/` (ARCHITECTURE, TABLES, FORMS, COMPONENTS). This file only
records *which concrete files* in this repo best embody them.
