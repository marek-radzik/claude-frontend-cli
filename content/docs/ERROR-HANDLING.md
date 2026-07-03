# Error Handling & User Feedback

**Purpose**: Define error handling patterns and user feedback standards.

---

## 🚨 CRITICAL: Always Use useToaster

**NEVER** use PrimeVue's `useToast()` directly.

**ALWAYS** use the project's `useToaster()` composable.

**Location**: `src/composables/useToaster.ts`

---

## Toast Composable (useToaster)

### Available Methods

```typescript
const toast = useToaster()

// Success toast (3s, green)
toast.success(t('toast.success.created'))

// Error toast (5s, red)
toast.error(t('toast.error.generic'))

// Warning toast (4s, yellow)
toast.warning(t('toast.warning.unsaved'))

// Info toast (3s, blue)
toast.info(t('toast.info.loading'))

// Custom title
toast.infoTitle('Custom Title', 'Custom message')
toast.errorTitle('Error Title', 'Error message')

// Validation error
toast.invalid(t('validation.formInvalid'))
```

### Benefits

- ✅ Consistent styling across application
- ✅ Automatic i18n integration
- ✅ Pre-configured lifetimes
- ✅ Simplified API

---

## Error Handler Composable

```typescript
// src/composables/useErrorHandler.ts
export const useErrorHandler = () => {
  const toast = useToaster()
  const { t } = useI18n()

  const handleError = (error: unknown) => {
    let message = t('errors.generic')

    if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    }

    toast.error(message)
    console.error('Error:', error)
  }

  return { handleError }
}
```

---

## Error Handling Patterns

### Composable Error Handling

```typescript
export default function useContractor() {
  const { $contractorRepository } = useNuxtApp()
  const toast = useToaster()
  const { t } = useI18n()
  const { handleError } = useErrorHandler()

  const createContractor = async (data: ContractorForm) => {
    try {
      loading.value = true
      const response = await $contractorRepository.create(data)
      contractors.value.push(response.data)
      toast.success(t('contractor.createSuccess'))
      return response.data
    } catch (error) {
      handleError(error)
      throw error // Re-throw for component handling
    } finally {
      loading.value = false
    }
  }

  return { createContractor }
}
```

### Component Error Handling

```vue
<script setup lang="ts">
const contractor = useContractor()
const toast = useToaster()
const { t } = useI18n()

const handleSubmit = async (data: ContractorForm) => {
  try {
    await contractor.createContractor(data)
    closeModal()
  } catch (error) {
    // Error already handled in composable
    // Additional UI logic here if needed
  }
}
</script>
```

---

## API Error Response Handling

### Standard API Error Structure

```typescript
interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status: number
}
```

### Handle Validation Errors

```typescript
const handleApiError = (error: any) => {
  if (error.response?.status === 422) {
    // Validation errors
    const validationErrors = error.response.data.errors
    Object.keys(validationErrors).forEach((field) => {
      toast.error(validationErrors[field][0])
    })
  } else if (error.response?.status === 404) {
    toast.error(t('errors.notFound'))
  } else if (error.response?.status === 403) {
    toast.error(t('errors.forbidden'))
  } else {
    toast.error(t('errors.generic'))
  }
}
```

---

## Loading States

### Component Loading

```vue
<script setup lang="ts">
const loading = ref(false)

const handleSubmit = async () => {
  loading.value = true
  try {
    await saveData()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Button
    type="submit"
    :label="t('buttons.save')"
    :loading="loading"
  />
</template>
```

### Global Loading (from Store)

```vue
<script setup lang="ts">
const store = useContractorStore()
const { loading } = storeToRefs(store)
</script>

<template>
  <DataTable :value="contractors" :loading="loading" />
</template>
```

---

## Empty States

```vue
<template>
  <DataTable :value="contractors">
    <Column field="name" header="Name" />

    <template #empty>
      <div class="text-center py-8">
        <i class="pi pi-inbox text-4xl text-gray-400 mb-3" />
        <p class="text-gray-600">{{ t('common.noData') }}</p>
      </div>
    </template>
  </DataTable>
</template>
```

---

## Confirmation Dialogs

```typescript
const confirm = useConfirm()
const { t } = useI18n()

const confirmDelete = (id: number, name: string) => {
  confirm.require({
    message: t('contractor.confirmDelete.message', { name }),
    header: t('contractor.confirmDelete.header'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: t('buttons.cancel'),
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: t('buttons.delete'),
      severity: 'danger',
    },
    accept: async () => {
      try {
        await contractor.delete(id)
        toast.success(t('contractor.deleteSuccess'))
      } catch (error) {
        toast.error(t('contractor.deleteError'))
      }
    },
  })
}
```

---

## Form Validation Feedback

### Basic Field Validation

```vue
<template>
  <div class="field">
    <label for="email">{{ t('fields.email') }}</label>
    <InputText
      id="email"
      v-model="email"
      v-bind="emailAttrs"
      :invalid="!!errors.email"
    />
    <small v-if="errors.email" class="p-error">
      {{ errors.email }}
    </small>
  </div>
</template>
```

### Advanced Field-Level Validation with Real-Time Error Clearing

**Use Case**: Complex forms with backend validation that need real-time error clearing when users fix fields.

**Example**: `src/components/table/AdvancedFilterModal.vue`

#### 1. Setup Error State

```typescript
// Field-level validation error state
const conditionErrors = ref<Record<number, {
  name?: string
  filter_type?: string
  value?: string
}>>({})
const filterNameError = ref<string | null>(null)
```

#### 2. Parse Backend Validation Errors

```typescript
/**
 * Parse backend error key to extract field information
 * Backend format: "filters.0.name", "filters.1.value", "filter_name"
 */
function parseFieldError(errorKey: string): {
  conditionIndex: number | null
  field: 'name' | 'filter_type' | 'value' | 'filter_name'
} | null {
  // Handle top-level field
  if (errorKey === 'filter_name') {
    return { conditionIndex: null, field: 'filter_name' }
  }

  // Handle array fields: filters.N.field
  const match = errorKey.match(/^filters\.(\d+)\.(name|filter_type|value)$/)
  if (match) {
    return {
      conditionIndex: Number.parseInt(match[1], 10),
      field: match[2] as 'name' | 'filter_type' | 'value',
    }
  }

  return null
}
```

#### 3. Populate Field Errors from Backend Response

```typescript
function setFieldErrors(error: unknown) {
  clearFieldErrors()

  const errorsObj = (error as any)?.data?.errors
  if (!errorsObj || typeof errorsObj !== 'object') return

  Object.entries(errorsObj).forEach(([key, messages]) => {
    const parsed = parseFieldError(key)
    if (!parsed) return

    const message = Array.isArray(messages) ? messages[0] : messages

    if (parsed.field === 'filter_name') {
      filterNameError.value = translateFieldError('filter_name', message as string)
    }
    else if (parsed.conditionIndex !== null) {
      if (!conditionErrors.value[parsed.conditionIndex]) {
        conditionErrors.value[parsed.conditionIndex] = {}
      }
      conditionErrors.value[parsed.conditionIndex][parsed.field] =
        translateFieldError(parsed.field, message as string)
    }
  })
}
```

#### 4. Real-Time Error Clearing with Watchers

**IMPORTANT**: Use array-mapped watchers instead of deep watch to detect mutations properly.

```typescript
/**
 * Watch filter name changes to clear filter name error
 */
watch(() => filterData.value.name, () => {
  if (filterNameError.value) {
    filterNameError.value = null
  }
})

/**
 * Watch field changes to clear specific field errors
 * Maps array to detect changes (deep watch doesn't work for mutations)
 */
watch(
  () => filterData.value.conditions.map(c => c.column),
  (newColumns, oldColumns) => {
    if (!oldColumns || !newColumns) return

    newColumns.forEach((newColumn, index) => {
      const oldColumn = oldColumns[index]

      if (newColumn !== oldColumn && conditionErrors.value[index]?.name) {
        const currentError = { ...conditionErrors.value[index] }
        const { name, ...restError } = currentError

        if (Object.keys(restError).length > 0) {
          conditionErrors.value[index] = restError
        }
        else {
          // Remove empty error object
          conditionErrors.value = Object.fromEntries(
            Object.entries(conditionErrors.value).filter(([key]) => Number(key) !== index),
          )
        }
      }
    })

    // Clean up errors for removed conditions
    const maxIndex = newColumns.length - 1
    conditionErrors.value = Object.fromEntries(
      Object.entries(conditionErrors.value).filter(([key]) => Number(key) <= maxIndex),
    )
  },
)
```

#### 5. Apply Invalid State to Fields

```vue
<template>
  <!-- Filter name field -->
  <InputText
    v-model="filterData.name"
    :invalid="!!filterNameError"
  />
  <small v-if="filterNameError" class="p-error">
    {{ filterNameError }}
  </small>

  <!-- Condition fields -->
  <Dropdown
    v-model="condition.column"
    :invalid="!!conditionErrors[index]?.name"
  />
  <Dropdown
    v-model="condition.operator"
    :invalid="!!conditionErrors[index]?.filter_type"
  />
  <InputText
    v-model="condition.value"
    :invalid="!!conditionErrors[index]?.value"
  />
</template>
```

#### 6. Handle Validation Errors in Submit Handler

```typescript
const handleSaveFilter = async () => {
  clearFieldErrors() // Clear previous errors
  loadingSave.value = true

  try {
    if (selectedFilterId.value) {
      await updateFilter(selectedFilterId.value, filterData.value)
    }
    else {
      await createFilter(filterData.value)
    }
  }
  catch (error) {
    setFieldErrors(error) // Parse and show red borders

    // Check if it's a validation error
    if ((error as any)?.data?.errors) {
      // Show single validation error toast with custom title
      toaster.errorTitle(
        t('pages.advancedFilter.validation.validationErrorTitle'),
        t('pages.advancedFilter.validation.checkFormErrors'),
      )
    }
    else {
      // For non-validation errors, use handleError
      handleError(error)
    }
  }
  finally {
    loadingSave.value = false
  }
}
```

#### 7. Translation Keys

```json
{
  "pages": {
    "advancedFilter": {
      "validation": {
        "validationErrorTitle": "Błąd walidacji",
        "checkFormErrors": "Sprawdź błędy w formularzu",
        "columnField": "Kolumna",
        "operatorField": "Operator",
        "valueField": "Wartość",
        "filterNameField": "Nazwa filtra",
        "fieldRequired": "{field} jest wymagane"
      }
    }
  }
}
```

#### Key Benefits

1. **Real-time feedback**: Errors disappear as users fix fields
2. **Field-specific errors**: Each field shows its own error message
3. **Single toast message**: Avoids toast spam with one consolidated message
4. **Proper reactivity**: Array-mapped watchers detect all changes including mutations
5. **Clean UX**: Red borders and error messages guide users to problems

#### Common Pitfalls

❌ **DON'T** use deep watch for detecting field changes:
```typescript
// ❌ WRONG: Deep watch sees old and new as same object during mutations
watch(() => filterData.value.conditions, (newConditions, oldConditions) => {
  // newCondition.value === oldCondition.value (always true!)
}, { deep: true })
```

✅ **DO** use array-mapped watchers:
```typescript
// ✅ CORRECT: Mapping creates new arrays, Vue can detect changes
watch(
  () => filterData.value.conditions.map(c => c.value),
  (newValues, oldValues) => {
    // newValues[0] !== oldValues[0] (works correctly!)
  }
)
```

❌ **DON'T** show multiple toast messages for validation errors:
```typescript
// ❌ WRONG: Shows toast for each field error
Object.entries(errors).forEach(([field, msg]) => {
  toaster.error(msg)
})
```

✅ **DO** show single consolidated toast:
```typescript
// ✅ CORRECT: Single toast with custom title
toaster.errorTitle(
  t('validation.validationErrorTitle'),
  t('validation.checkFormErrors')
)
```

---

## Network Error Handling

```typescript
const handleNetworkError = (error: any) => {
  if (!error.response) {
    // Network error (no response from server)
    toast.error(t('errors.network'))
  } else if (error.response.status >= 500) {
    // Server error
    toast.error(t('errors.server'))
  } else if (error.response.status === 401) {
    // Unauthorized
    toast.error(t('errors.unauthorized'))
    router.push('/auth/login')
  } else {
    // Other errors
    toast.error(error.response.data?.message || t('errors.generic'))
  }
}
```

---

## Best Practices

### DO

1. ✅ Always use `useToaster()` for feedback
2. ✅ Handle errors in composables
3. ✅ Show loading states
4. ✅ Show empty states
5. ✅ Use confirmation dialogs for destructive actions
6. ✅ Display specific error messages
7. ✅ Log errors to console
8. ✅ Use try-catch-finally pattern
9. ✅ Translate all user-facing messages
10. ✅ Re-throw errors when needed

### DON'T

1. ❌ Use `useToast()` directly
2. ❌ Ignore errors silently
3. ❌ Show technical error details to users
4. ❌ Forget loading indicators
5. ❌ Skip empty state handling
6. ❌ Use alert() or confirm()
7. ❌ Hardcode error messages
8. ❌ Leave loading state true on error
9. ❌ Forget to handle network errors
10. ❌ Show multiple toasts at once

---

## Error Logging

### Development

```typescript
if (import.meta.dev) {
  console.error('Detailed error:', error)
  console.log('Error stack:', error.stack)
}
```

### Production

```typescript
// Send to error tracking service (e.g., Sentry)
if (import.meta.prod) {
  // Sentry.captureException(error)
}
```

---