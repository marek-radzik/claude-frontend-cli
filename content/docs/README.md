# Documentation Structure

**Purpose**: Generic, reusable documentation for Nuxt 3 + Vue 3 + TypeScript + PrimeVue applications

This directory contains modular documentation for the technology stack. For project-specific examples and implementations, see `/.instructions/` folder.

---

## 📁 Directory Structure

```
.docs/
├── README.md                    # This file - navigation index
├── ARCHITECTURE.md              # Layered architecture patterns
├── TDD.md                       # Test-driven development methodology
├── FORMS.md                     # Form implementation with Zod
├── COMPONENTS.md                # Vue 3 Composition API patterns
├── TABLES.md                    # Data table standardization
├── PERMISSIONS.md               # RBAC implementation patterns
├── I18N.md                      # Internationalization patterns
├── ERROR-HANDLING.md            # Error handling & user feedback
├── TYPESCRIPT.md                # TypeScript standards
└── API.md                       # API communication patterns
```

---

## 📚 Core Documentation

| File | Purpose | Status |
|------|---------|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layered architecture, data flow, repository pattern | ✅ Generic |
| [TDD.md](./TDD.md) | Test-driven development, testing patterns, coverage | ✅ Generic |
| [FORMS.md](./FORMS.md) | PrimeVue + Zod form implementation | ✅ Generic |
| [COMPONENTS.md](./COMPONENTS.md) | Vue 3 Composition API patterns | ✅ Generic |
| [TABLES.md](./TABLES.md) | Data table standardization | ✅ Generic |
| [PERMISSIONS.md](./PERMISSIONS.md) | RBAC permission system | ✅ Generic |
| [I18N.md](./I18N.md) | Internationalization guidelines | ✅ Generic |
| [ERROR-HANDLING.md](./ERROR-HANDLING.md) | Error handling & user feedback | ✅ Generic |
| [TYPESCRIPT.md](./TYPESCRIPT.md) | TypeScript standards & type safety | ✅ Generic |
| [API.md](./API.md) | API communication, backend integration | ✅ Generic |

---

## 🎯 How to Use

### For Generic Stack Patterns
1. **Start with**: `../CLAUDE.md` - Main entry point with quick reference
2. **Deep dive**: Choose specific `.docs/*.md` file based on your task
3. **Reference**: Use as templates and checklists

### For Project-Specific Examples
1. **See**: `/.instructions/` folder for:
   - Project-specific API configuration
   - Business domain entities and validation rules
   - Reference implementations (actual component files to follow)
   - Step-by-step implementation guides with project context

---

## 📖 When to Use Which Doc

### Building a New Feature
1. Read: `CLAUDE.md` → Quick overview
2. Read: `ARCHITECTURE.md` → Understand layers
3. Read: `TDD.md` → Write tests first
4. Implement using: `COMPONENTS.md`, `FORMS.md`, `TYPESCRIPT.md`
5. Reference: `PERMISSIONS.md`, `I18N.md`, `ERROR-HANDLING.md`
6. Check: `/.instructions/REFERENCE-IMPLEMENTATIONS.md` for project examples

### Creating a Data Table
1. Read: [TABLES.md](./TABLES.md) - Understand generic patterns and requirements
2. Read: `/.instructions/TABLE-IMPLEMENTATION-GUIDE.md` - Step-by-step with project examples
3. Reference: Project-specific table components listed in `/.instructions/REFERENCE-IMPLEMENTATIONS.md`
4. Use checklist from TABLES.md to verify completion

### Implementing Forms
1. Read: [FORMS.md](./FORMS.md) - Generic form patterns
2. Read: `/.instructions/BUSINESS-DOMAIN.md` - Domain-specific validation rules
3. Create Zod schema following project patterns
4. Follow form component pattern

### API Integration
1. Read: [API.md](./API.md) - Generic API patterns
2. Read: `/.instructions/PROJECT-SETUP.md` - Project-specific API configuration
3. Create repository → composable → component

---

## 🔄 Relationship with .instructions/

```
.docs/              →  Generic stack patterns (REUSABLE)
.instructions/      →  Project-specific examples (REPLACE per project)
```

**This folder (.docs/):**
- Technology stack patterns
- Generic architecture concepts
- Reusable across multiple projects

**The .instructions/ folder:**
- Specific API URLs and backends
- Business domain entities
- Actual component file paths
- Project-specific constants

---

## 🔧 Reusability

This `.docs/` folder is designed to be:
- ✅ **Copied** to new Nuxt 3 projects
- ✅ **Reused** across similar tech stack projects
- ✅ **Generic** with no project-specific references

When starting a new project:
1. Copy `CLAUDE.md` + `.docs/` folder
2. Create new `.instructions/` folder with project-specific content
3. Update `.instructions/` files with new project details

---

## 📝 Contributing

When updating documentation:
1. Keep examples generic and technology-focused
2. Remove any project-specific API URLs or endpoints
3. Point to `.instructions/` for project-specific examples
4. Maintain consistent formatting
5. Cross-reference related documents
6. Update version and date at bottom of file

---

## 🔄 Update History

- **2025-11-07**: Reorganized into generic (.docs) and project-specific (.instructions)
  - Moved project-specific content to .instructions/ folder
  - Made all .docs/ content generic and reusable
  - Updated cross-references

- **2025-11-06**: Created tables/ subfolder structure
  - Added implementation guide
  - Reorganized into topic-specific subfolders

- **2025-10-29**: Initial modular structure created
  - Split large CLAUDE.md into focused documents
  - Added comprehensive examples and patterns

---

**Purpose**: Generic Nuxt 3 Stack Documentation
**Last Updated**: 2025-11-07
**Version**: 2.0 - Generic & Reusable