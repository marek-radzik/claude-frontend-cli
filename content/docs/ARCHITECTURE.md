# Architecture & Data Flow

**Purpose**: Define the layered architecture and data flow patterns for this Nuxt 3 application.

**Status**: Mandatory for ALL features

---

## 🏗️ Layered Architecture (STRICT)

### Unidirectional Flow

```
Component → Composable → Store ⇄ Repository → API
```

**NEVER skip layers. Each has ONE responsibility.**

---

## Layer 1: Components (`/src/components/`)

**Responsibility**: UI rendering, user events

**Can**:
- Use composables
- Access stores (via `storeToRefs`)
- Emit events
- Handle user interactions

**Cannot**:
- API calls
- Business logic
- Direct store mutation

### Example

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'

// Composables
const { fetchContractors, contractors, loading } = useContractor()

// Store (read-only via storeToRefs)
const store = useContractorStore()
const { filters } = storeToRefs(store)

// Lifecycle
onMounted(() => fetchContractors())
</script>

<template>
  <div>
    <DataTable :value="contractors" :loading="loading" />
  </div>
</template>
```

---

## Layer 2: Composables (`/src/composables/`)

**Responsibility**: Business logic, orchestration

**Can**:
- Call repositories
- Update stores
- Handle errors
- Coordinate multiple operations
- Return reactive state

**Cannot**:
- UI logic
- Direct HTTP calls
- DOM manipulation

### Example

```typescript
// src/composables/contractor/useContractor.ts
export default function useContractor() {
  const { $contractorRepository } = useNuxtApp()
  const store = useContractorStore()
  const { contractors, loading } = storeToRefs(store)
  const toast = useToaster()

  const fetchContractors = async () => {
    try {
      loading.value = true
      const { data } = await $contractorRepository.list()
      contractors.value = data
      toast.success('Contractors loaded')
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  const createContractor = async (formData: ContractorForm) => {
    try {
      loading.value = true
      const { data } = await $contractorRepository.create(formData)
      contractors.value.push(data)
      toast.success('Contractor created')
      return data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    fetchContractors,
    createContractor,
    contractors,
    loading,
  }
}
```

---

## Layer 3: Stores (`/src/stores/`)

**Responsibility**: State management

**Can**:
- Hold state
- Computed properties
- Synchronous mutations

**Cannot**:
- API calls
- Business logic
- Async operations (except in actions that call composables)

### Example

```typescript
// src/stores/contractor/useContractorStore.ts
export const useContractorStore = defineStore('contractor', () => {
  // State
  const contractors = ref<Contractor[]>([])
  const loading = ref(false)
  const filters = reactive({
    search: '',
    status: null,
    groupId: null,
  })
  const editingContractorId = ref<number | null>(null)
  const modalOpen = ref(false)

  // Getters (Computed)
  const activeContractors = computed(() =>
    contractors.value.filter(c => c.status === 'active')
  )

  const getById = computed(() => {
    return (id: number) => contractors.value.find(c => c.id === id)
  })

  // Actions
  const resetFilters = () => {
    Object.assign(filters, {
      search: '',
      status: null,
      groupId: null,
    })
  }

  const openModal = () => {
    modalOpen.value = true
  }

  const closeModal = () => {
    modalOpen.value = false
    editingContractorId.value = null
  }

  return {
    // State
    contractors,
    loading,
    filters,
    editingContractorId,
    modalOpen,
    // Getters
    activeContractors,
    getById,
    // Actions
    resetFilters,
    openModal,
    closeModal,
  }
})
```

---

## Layer 4: Repositories (`/src/repository/`)

**Responsibility**: API communication

**Can**:
- HTTP calls
- Data transformation
- Endpoint definitions

**Cannot**:
- Business logic
- Store updates
- UI logic

### Example

```typescript
// src/repository/contractor/ContractorRepository.ts
import { Repository } from '@/repository/Repository'

export class ContractorRepository extends Repository {
  constructor() {
    super('contractors')
  }

  async list(params?: QueryParams) {
    return this.get<ContractorListResponse>(this.urlParamsGenerator(params))
  }

  async getById(id: number) {
    return this.get<ContractorResponse>(`${id}`)
  }

  async create(data: ContractorCreateRequest) {
    return this.post<ContractorResponse>('', data)
  }

  async update(id: number, data: ContractorUpdateRequest) {
    return this.patch<ContractorResponse>(`${id}`, data)
  }

  async delete(id: number) {
    return this.delete(`${id}`)
  }
}
```

**Register in `/src/plugins/repositories.ts`:**

```typescript
import { ContractorRepository } from '@/repository/contractor/ContractorRepository'
import { VehicleRepository } from '@/repository/vehicle/VehicleRepository'

export default defineNuxtPlugin(() => ({
  provide: {
    contractorRepository: new ContractorRepository(),
    vehicleRepository: new VehicleRepository(),
  },
}))
```

---

## Data Flow Examples

### CREATE Flow

```
1. User clicks "Save" button
   ↓
2. Component: handleSubmit() → composable.create(formData)
   ↓
3. Composable: validate → repository.create(formData)
   ↓
4. Repository: POST /api/contractors
   ↓
5. API returns: { data: newContractor }
   ↓
6. Composable: store.contractors.push(newContractor)
   ↓
7. Composable: toast.success() → return to component
   ↓
8. Component: closeModal() → UI updates automatically
```

### READ Flow

```
1. Component mounted
   ↓
2. Component: composable.fetchContractors()
   ↓
3. Composable: repository.list()
   ↓
4. Repository: GET /api/contractors
   ↓
5. API returns: { data: [...], pagination: {...} }
   ↓
6. Composable: store.contractors = response.data
   ↓
7. Component: UI updates automatically (reactive)
```

### UPDATE Flow

```
1. User clicks "Edit" button
   ↓
2. Component: composable.get(id) → store.openModal()
   ↓
3. Modal opens with pre-filled data
   ↓
4. User edits and clicks "Save"
   ↓
5. Component: composable.update(id, formData)
   ↓
6. Composable: repository.update(id, formData)
   ↓
7. Repository: PATCH /api/contractors/{id}
   ↓
8. API returns: { data: updatedContractor }
   ↓
9. Composable: update store.contractors array
   ↓
10. Component: UI updates automatically
```

### DELETE Flow

```
1. User clicks "Delete" button
   ↓
2. Component: confirmDelete() → shows confirmation dialog
   ↓
3. User confirms
   ↓
4. Component: composable.delete(id)
   ↓
5. Composable: repository.delete(id)
   ↓
6. Repository: DELETE /api/contractors/{id}
   ↓
7. API returns: 204 No Content
   ↓
8. Composable: remove from store.contractors
   ↓
9. Component: toast.success() → UI updates
```

---

## File Organization

```
src/
├── components/
│   └── contractor/
│       ├── ContractorForm.vue          # Form component
│       ├── ContractorModal.vue         # Modal wrapper
│       └── table/
│           └── ContractorList.vue      # Table component
│
├── composables/
│   └── contractor/
│       └── useContractor.ts            # Business logic
│
├── stores/
│   └── contractor/
│       └── useContractorStore.ts       # State management
│
├── repository/
│   └── contractor/
│       └── ContractorRepository.ts     # API calls
│
├── types/
│   └── Contractor/
│       ├── Contractor.ts               # Main types
│       ├── ContractorForm.ts           # Form types
│       └── ContractorResponse.ts       # API response types
│
└── validatorSchemas/
    └── contractor/
        └── contractorSchema.ts         # Zod validation
```

---

## Common Patterns

### Pattern 1: Nested Resources

```typescript
// Repository
export class ContactRepository extends Repository {
  constructor() {
    super('contractors') // Base path
  }

  async listContacts(contractorId: number) {
    return this.get(`${contractorId}/contacts`)
  }

  async createContact(contractorId: number, data: ContactForm) {
    return this.post(`${contractorId}/contacts`, data)
  }
}

// Composable
export function useContact() {
  const { $contactRepository } = useNuxtApp()
  const route = useRoute()
  const contractorId = computed(() => Number(route.params.id))

  const fetchContacts = async () => {
    const { data } = await $contactRepository.listContacts(contractorId.value)
    return data
  }

  return { fetchContacts }
}
```

### Pattern 2: Multiple Repositories in One Composable

```typescript
export function useContractorDetails() {
  const { $contractorRepository, $contactRepository, $noteRepository } = useNuxtApp()

  const loadContractorDetails = async (id: number) => {
    const [contractor, contacts, notes] = await Promise.all([
      $contractorRepository.getById(id),
      $contactRepository.listContacts(id),
      $noteRepository.listNotes(id),
    ])

    return {
      contractor: contractor.data,
      contacts: contacts.data,
      notes: notes.data,
    }
  }

  return { loadContractorDetails }
}
```

### Pattern 3: Shared State Across Components

```typescript
// Store holds the state
const store = useContractorStore()

// Component A (List)
const { contractors } = storeToRefs(store)

// Component B (Details)
const { contractors } = storeToRefs(store)
const contractor = computed(() =>
  store.getById(route.params.id)
)
```

---

## Best Practices

### DO

1. ✅ Always use `storeToRefs()` when destructuring stores
2. ✅ Keep composables focused (single responsibility)
3. ✅ Return reactive state from composables
4. ✅ Use computed properties for derived state
5. ✅ Handle errors in composables
6. ✅ Show toast feedback in composables
7. ✅ Keep repositories thin (only HTTP logic)
8. ✅ Use TypeScript for all layers
9. ✅ Export types from `/types/` directory
10. ✅ Validate data with Zod schemas

### DON'T

1. ❌ Skip layers (Component → Repository directly)
2. ❌ Put business logic in components
3. ❌ Put API calls in stores
4. ❌ Destructure stores without `storeToRefs()`
5. ❌ Mix responsibilities across layers
6. ❌ Create god composables (too many responsibilities)
7. ❌ Forget error handling
8. ❌ Ignore loading states
9. ❌ Use `any` type
10. ❌ Hardcode API endpoints

---

## Testing Strategy

### Component Tests
- Mock composables
- Test UI rendering
- Test user interactions
- Test conditional rendering (permissions)

### Composable Tests
- Mock repositories
- Test business logic
- Test error handling
- Test state updates

### Store Tests
- Test computed properties
- Test actions
- Test state mutations

### Repository Tests
- Mock HTTP client
- Test endpoint construction
- Test data transformation

---