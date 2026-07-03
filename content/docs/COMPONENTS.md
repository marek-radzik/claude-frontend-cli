# Vue 3 Composition API Patterns

**Purpose**: Define Vue 3 Composition API best practices and component patterns.

**Stack**: Vue 3.5+ with `<script setup>` syntax

---

## 🎨 Standard Component Structure

```vue
<script setup lang="ts">
// ============================================================================
// 1. TYPE IMPORTS (top of file)
// ============================================================================
import type { Contractor } from '@/types/Contractor/Contractor'
import type { ContractorForm } from '@/types/Contractor/ContractorForm'

// ============================================================================
// 2. PROPS & EMITS
// ============================================================================
interface Props {
  id: number
  readonly?: boolean
  initialData?: ContractorForm
}

interface Emits {
  submit: [data: ContractorForm]
  cancel: []
  update: [id: number, data: ContractorForm]
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

const emit = defineEmits<Emits>()

// ============================================================================
// 3. COMPOSABLES (order matters for dependency injection)
// ============================================================================
const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToaster()
const { hasPermission } = usePermission()
const confirm = useConfirm()

// ============================================================================
// 4. DOMAIN COMPOSABLES
// ============================================================================
const contractor = useContractor()

// ============================================================================
// 5. STORES (with storeToRefs)
// ============================================================================
const contractorStore = useContractorStore()
const { contractors, loading, modalOpen } = storeToRefs(contractorStore)
const { openModal, closeModal } = contractorStore

// ============================================================================
// 6. LOCAL STATE
// ============================================================================
const isModalOpen = ref(false)
const selectedId = ref<number | null>(null)
const formData = reactive<ContractorForm>({
  name: '',
  email: '',
  status: 'active',
})

// ============================================================================
// 7. COMPUTED PROPERTIES
// ============================================================================
const displayName = computed(() => {
  if (!contractor.value) return ''
  return `${contractor.value.name} (${contractor.value.email})`
})

const isValid = computed(() => {
  return formData.name && formData.email
})

const canCreate = computed(() => hasPermission('contractor.create'))
const canUpdate = computed(() => hasPermission('contractor.update'))
const canDelete = computed(() => hasPermission('contractor.delete'))

// ============================================================================
// 8. METHODS
// ============================================================================
const handleSubmit = async () => {
  if (!isValid.value) return

  try {
    emit('submit', formData)
    resetForm()
  } catch (error) {
    console.error('Submit error:', error)
  }
}

const handleCancel = () => {
  emit('cancel')
  resetForm()
}

const resetForm = () => {
  Object.assign(formData, {
    name: '',
    email: '',
    status: 'active',
  })
}

// ============================================================================
// 9. WATCHERS
// ============================================================================
watch(
  () => props.id,
  async (newId) => {
    if (newId) {
      await contractor.fetchById(newId)
    }
  },
  { immediate: true }
)

watch(
  () => props.initialData,
  (data) => {
    if (data) {
      Object.assign(formData, data)
    }
  },
  { immediate: true, deep: true }
)

// ============================================================================
// 10. LIFECYCLE HOOKS
// ============================================================================
onMounted(async () => {
  await contractor.fetchContractors()
})

onBeforeUnmount(() => {
  // Cleanup subscriptions, timers, etc.
})
</script>

<template>
  <div class="contractor-form">
    <form @submit.prevent="handleSubmit">
      <!-- Form content -->
    </form>
  </div>
</template>

<style scoped lang="scss">
.contractor-form {
  // Component styles
}
</style>
```

---

## Reactivity Patterns

### ref() - Primitives and Simple Values

```typescript
// ✅ Use ref for primitives
const count = ref(0)
const name = ref('')
const isLoading = ref(false)
const items = ref<Item[]>([])

// Access/modify with .value
count.value++
name.value = 'John'
items.value.push(newItem)
```

### reactive() - Complex Objects

```typescript
// ✅ Use reactive for forms and complex objects
const formData = reactive<ContractorForm>({
  name: '',
  email: '',
  address: {
    street: '',
    city: '',
  },
})

// Access/modify directly (no .value)
formData.name = 'Test'
formData.address.city = 'Warsaw'
```

### computed() - Derived State

```typescript
// ✅ Use computed for derived values
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

const filteredItems = computed(() =>
  items.value.filter(item => item.status === 'active')
)

const hasErrors = computed(() => Object.keys(errors).length > 0)

// ❌ Don't use methods for derived state
const getFullName = () => `${firstName.value} ${lastName.value}` // Bad
```

### storeToRefs() - Store Destructuring

```typescript
// ❌ Loses reactivity
const { contractors, loading } = useContractorStore()

// ✅ Maintains reactivity
const store = useContractorStore()
const { contractors, loading } = storeToRefs(store)
const { fetchContractors, createContractor } = store // actions don't need refs
```

---

## Props & Emits Patterns

### Props with TypeScript

```typescript
// Simple props
interface Props {
  id: number
  title: string
}
const props = defineProps<Props>()

// Props with defaults
interface Props {
  id: number
  readonly?: boolean
  size?: 'small' | 'medium' | 'large'
}
const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  size: 'medium',
})

// Props with validation
interface Props {
  id: number
  status: 'active' | 'inactive'
}
const props = defineProps<Props>()
```

### Emits with TypeScript

```typescript
// Simple emits
interface Emits {
  submit: []
  cancel: []
}
const emit = defineEmits<Emits>()
emit('submit')
emit('cancel')

// Emits with payload
interface Emits {
  submit: [data: ContractorForm]
  update: [id: number, data: ContractorForm]
  delete: [id: number]
}
const emit = defineEmits<Emits>()
emit('submit', formData)
emit('update', 123, formData)
emit('delete', 123)
```

### v-model Pattern

```vue
<script setup lang="ts">
interface Props {
  modelValue: string
}

interface Emits {
  'update:modelValue': [value: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})
</script>

<template>
  <InputText v-model="value" />
</template>
```

---

## Composable Patterns

### Basic Composable

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
    } catch (error) {
      handleError(error)
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    contractors,
    loading,
    // Methods
    fetchContractors,
  }
}
```

### Composable with Parameters

```typescript
export function useContractorById(id: Ref<number> | number) {
  const contractorId = isRef(id) ? id : ref(id)
  const contractor = ref<Contractor | null>(null)
  const loading = ref(false)

  const fetch = async () => {
    loading.value = true
    const { data } = await $contractorRepository.getById(contractorId.value)
    contractor.value = data
    loading.value = false
  }

  watch(contractorId, fetch, { immediate: true })

  return { contractor, loading, fetch }
}
```

### Reusable Logic Composable

```typescript
// src/composables/useToggle.ts
export function useToggle(initialValue = false) {
  const state = ref(initialValue)

  const toggle = () => {
    state.value = !state.value
  }

  const setTrue = () => {
    state.value = true
  }

  const setFalse = () => {
    state.value = false
  }

  return {
    state,
    toggle,
    setTrue,
    setFalse,
  }
}

// Usage
const { state: isOpen, toggle: toggleModal, setTrue: openModal } = useToggle()
```

---

## Watcher Patterns

### Simple Watch

```typescript
watch(searchQuery, (newValue, oldValue) => {
  console.log(`Changed from ${oldValue} to ${newValue}`)
  fetchResults(newValue)
})
```

### Watch with Options

```typescript
// Immediate execution
watch(
  () => props.contractorId,
  (id) => {
    fetchContractor(id)
  },
  { immediate: true }
)

// Deep watch
watch(
  formData,
  (newData) => {
    console.log('Form changed:', newData)
  },
  { deep: true }
)
```

### Watch Multiple Sources

```typescript
watch(
  [searchQuery, statusFilter],
  ([query, status]) => {
    fetchContractors({ search: query, status })
  }
)
```

### watchEffect - Auto-tracking

```typescript
// Automatically tracks dependencies
watchEffect(() => {
  // Runs whenever searchQuery or statusFilter changes
  fetchContractors({
    search: searchQuery.value,
    status: statusFilter.value,
  })
})
```

---

## Lifecycle Hooks

### onMounted

```typescript
onMounted(async () => {
  // Component mounted - DOM available
  await fetchContractors()
  initializeChart()
})
```

### onBeforeUnmount

```typescript
onBeforeUnmount(() => {
  // Cleanup before component unmount
  clearInterval(intervalId)
  eventBus.off('update', handleUpdate)
})
```

### onUpdated

```typescript
onUpdated(() => {
  // After DOM update
  adjustScrollPosition()
})
```

---

## Template Patterns

### Conditional Rendering

```vue
<template>
  <!-- v-if: Conditional rendering -->
  <div v-if="contractors.length > 0">
    <DataTable :value="contractors" />
  </div>

  <!-- v-else-if, v-else -->
  <div v-else-if="loading">
    <ProgressSpinner />
  </div>

  <div v-else>
    <EmptyState />
  </div>

  <!-- v-show: Toggle visibility (keeps in DOM) -->
  <div v-show="isVisible">
    This stays in DOM, just hidden
  </div>
</template>
```

### List Rendering

```vue
<template>
  <!-- Simple list -->
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>

  <!-- List with index -->
  <div v-for="(item, index) in items" :key="item.id">
    {{ index + 1 }}. {{ item.name }}
  </div>

  <!-- Object iteration -->
  <div v-for="(value, key) in contractor" :key="key">
    {{ key }}: {{ value }}
  </div>

  <!-- ❌ Don't use v-if and v-for together -->
  <div v-for="item in items" v-if="item.active" :key="item.id">
    <!-- Bad practice -->
  </div>

  <!-- ✅ Use computed instead -->
  <div v-for="item in activeItems" :key="item.id">
    {{ item.name }}
  </div>
</template>

<script setup lang="ts">
const activeItems = computed(() => items.value.filter(i => i.active))
</script>
```

### Event Handling

```vue
<template>
  <!-- Click event -->
  <Button @click="handleClick" />

  <!-- With arguments -->
  <Button @click="handleEdit(item.id)" />

  <!-- With event object -->
  <Button @click="(event) => handleClick(event, item.id)" />

  <!-- Prevent default -->
  <form @submit.prevent="handleSubmit">
    <Button type="submit" />
  </form>

  <!-- Multiple modifiers -->
  <input @keyup.enter.prevent="handleSearch" />
</template>
```

### Dynamic Attributes

```vue
<template>
  <!-- Dynamic class -->
  <div :class="{ active: isActive, disabled: isDisabled }">
    Content
  </div>

  <!-- Array syntax -->
  <div :class="[baseClass, { active: isActive }]">
    Content
  </div>

  <!-- Dynamic style -->
  <div :style="{ color: textColor, fontSize: fontSize + 'px' }">
    Content
  </div>

  <!-- Dynamic attributes -->
  <Button
    :label="buttonLabel"
    :disabled="isDisabled"
    :severity="buttonSeverity"
  />
</template>
```

---

## Slot Patterns

### Basic Slot

```vue
<!-- Parent -->
<Card>
  <p>This is slot content</p>
</Card>

<!-- Card Component -->
<template>
  <div class="card">
    <slot />
  </div>
</template>
```

### Named Slots

```vue
<!-- Parent -->
<Card>
  <template #header>
    <h1>Title</h1>
  </template>

  <template #default>
    <p>Main content</p>
  </template>

  <template #footer>
    <Button label="Save" />
  </template>
</Card>

<!-- Card Component -->
<template>
  <div class="card">
    <div class="card-header">
      <slot name="header" />
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>
```

### Scoped Slots

```vue
<!-- Parent -->
<DataList :items="contractors">
  <template #item="{ item, index }">
    <div>{{ index }}. {{ item.name }}</div>
  </template>
</DataList>

<!-- DataList Component -->
<template>
  <div v-for="(item, index) in items" :key="item.id">
    <slot name="item" :item="item" :index="index" />
  </div>
</template>
```

---

## Best Practices

### DO

1. ✅ Use `<script setup>` syntax
2. ✅ Use TypeScript for all props and emits
3. ✅ Use `storeToRefs()` when destructuring stores
4. ✅ Use computed for derived state
5. ✅ Use descriptive variable names
6. ✅ Keep components focused (single responsibility)
7. ✅ Extract reusable logic to composables
8. ✅ Use proper lifecycle hooks
9. ✅ Clean up in `onBeforeUnmount`
10. ✅ Use `v-bind` shorthand (`:prop`)
11. ✅ **Use `AppDatePicker` instead of PrimeVue's `DatePicker`** (see note below)

### DON'T

1. ❌ Mix `ref` and `reactive` unnecessarily
2. ❌ Destructure stores without `storeToRefs()`
3. ❌ Use methods for derived state (use computed)
4. ❌ Use `v-if` and `v-for` together
5. ❌ Mutate props directly
6. ❌ Create god components (too many responsibilities)
7. ❌ Forget to use `:key` in `v-for`
8. ❌ Use `any` type
9. ❌ Forget cleanup in lifecycle hooks
10. ❌ Access DOM directly (use refs when needed)
11. ❌ **Use PrimeVue's `DatePicker` directly** (use `AppDatePicker` wrapper instead)

---

## PrimeVue DatePicker Bug Fix

> ⚠️ **CRITICAL**: Never use `DatePicker` from `primevue/datepicker` directly. Always use `AppDatePicker`.

PrimeVue's DatePicker has a bug where clicking on an already-selected date converts the Date object to a string, displaying raw `Date.toString()` format (e.g., "Sat Jan 31 2026 00:00:00 GMT+0100") instead of the formatted date.

### Solution

Use `AppDatePicker` wrapper component which fixes this bug:

```vue
<script setup lang="ts">
// ✅ CORRECT: Import AppDatePicker
import AppDatePicker from '~/components/common/AppDatePicker.vue'

// ❌ WRONG: Don't import DatePicker directly
// import DatePicker from 'primevue/datepicker'
</script>

<template>
  <!-- ✅ CORRECT -->
  <AppDatePicker
    v-model="selectedDate"
    date-format="dd.mm.yy"
    show-button-bar
  />

  <!-- ❌ WRONG - has date format bug -->
  <!-- <DatePicker v-model="selectedDate" /> -->
</template>
```

### Features

- `AppDatePicker` accepts all the same props as PrimeVue's `DatePicker`
- Props are passed through via `v-bind="$attrs"`
- Exposes `overlayVisible` for programmatic control
- Works with date-only, time-only, and datetime modes

---