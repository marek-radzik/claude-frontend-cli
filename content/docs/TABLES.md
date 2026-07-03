# Table Implementation Standard

**Version**: 2.0
**Status**: Active

This document defines the **standardized pattern** for all data table implementations in Nuxt 3 applications with PrimeVue. Use this as a checklist when creating new tables or retrofitting existing ones.

> **📘 Project-Specific Reference**: See `/.instructions/REFERENCE-IMPLEMENTATIONS.md` for project-specific example components

---

## 📋 Quick Checklist

When implementing or auditing a table, verify ALL items below:

- [ ] **Search Bar** - Global search input with clear button
- [ ] **Advanced Filters** - Modal with saved filter support
- [ ] **Customize Columns** - Modal for column visibility/order
- [ ] **Column Options** - Per-column search and sort
- [ ] **Clear Filters** - Button to reset all filters at once
- [ ] **Permissions** - CRUD button visibility based on user permissions
- [ ] **Empty State** - Proper UI when no data
- [ ] **Loading State** - Visual feedback during fetch
- [ ] **Pagination** - Server-side pagination with page/per_page
- [ ] **localStorage Persistence** - Column options saved locally
- [ ] **Debounced Search** - 500ms delay on search input
- [ ] **Proper Data Flow** - Component → Composable → Store → Repository → API
- [ ] **Column Resizing** - Drag-to-resize via `useColumnResize` composable (dynamic tables)
- [ ] **No Header ColumnGroup** - Never use `ColumnGroup type="header"` (breaks resize)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Page Component                        │
│  - definePageMeta (permissions)                             │
│  - Pre-load dictionaries                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Table Component                           │
│  - UI rendering                                             │
│  - Event handling                                           │
│  - Permission-based button visibility                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼─────┐ ┌──────▼─────┐
│  useTable    │ │ useColumns │ │  useAdv    │
│              │ │    List    │ │  Filter    │
│ - Fetch data │ │ - Columns  │ │ - Filters  │
│ - Pagination │ │ - Visible  │ │ - Active   │
│ - Sorting    │ │ - Order    │ │ - Saved    │
└───────┬──────┘ └──────┬─────┘ └──────┬─────┘
        │               │               │
┌───────▼───────────────▼───────────────▼─────┐
│            Domain Store (e.g., Contact)      │
│  - Data state                                │
│  - UI state (modals, loading)                │
│  - Form data                                 │
└───────────────────────┬──────────────────────┘
                        │
┌───────────────────────▼──────────────────────┐
│        Domain Composable (e.g., useContact)  │
│  - API calls via repository                  │
│  - Error handling                            │
│  - Toast notifications                       │
└───────────────────────┬──────────────────────┘
                        │
┌───────────────────────▼──────────────────────┐
│       Repository (e.g., ContactRepository)   │
│  - HTTP requests                             │
│  - Endpoint definitions                      │
└──────────────────────────────────────────────┘
```

---

## 🎯 Step-by-Step Implementation

### STEP 1: Component Template Structure

Your table component **must** have these three sections in this order:

#### Section 1: Header Controls

```vue
<template>
  <div class="bg-white px-[15px] py-[15px] pb-[25px] rounded-[12px] mt-4 page-content list">
    <!-- HEADER -->
    <div class="flex items-center justify-between mb-4">
      <!-- Title -->
      <div class="font-semibold text-base">
        {{ t('pages.YOUR_ENTITY.title') }}
      </div>

      <!-- Controls Container -->
      <div class="flex items-center gap-2">
        <!-- 1. SEARCH INPUT (Global) -->
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            :placeholder="t('YOUR_ENTITY.searchPlaceholder')"
            class="w-[300px]"
          />
          <InputIcon v-if="searchQuery" class="pi pi-times cursor-pointer" @click="handleClearSearch" />
        </IconField>

        <!-- 2. ADVANCED FILTERS MODAL -->
        <AdvancedFilterModal
          :listing-key="LISTING_KEY"
          @apply="handleAdvancedFilterApply"
        />

        <!-- 3. CUSTOMIZE COLUMNS MODAL -->
        <CustomizeColumnsModal
          v-model:visible="showColumnsListModal"
          :loading="loadingColumnsList"
          :columns="columns"
          :default-columns="defaultColumns"
          @get-columns-list="handleColumnsList"
          @apply="handleColumnsApply"
          @reset-order="handleColumnsResetOrders"
        />

        <!-- 4. CLEAR FILTERS BUTTON -->
        <Button
          v-tooltip.top="t('pages.contractor.fleetRelations.relations.actions.clearFilters')"
          icon="pi pi-filter-slash"
          severity="secondary"
          text
          @click="clearFiltersAndSearch"
        />

        <!-- 5. ADD BUTTON (conditional on permission) -->
        <YourEntityModal
          v-if="canCreate"
          @submit="handleSubmit"
        />
      </div>
    </div>

    <!-- Rest of template... -->
  </div>
</template>
```

**Key Points:**
- Search bar must be at least 300px wide
- Use `IconField` with clear button (X icon)
- Advanced filter modal receives `listing-key` prop
- Clear filters button shows tooltip
- Add button only visible if `canCreate` permission

#### Section 2: DataTable

```vue
<!-- DATATABLE -->
<DataTable
  class="your-entity-list-table"
  v-bind="basicTableProps"
  :value="items"
  :pt="{
    wrapper: { class: 'rounded-lg shadow overflow-hidden' },
  }"
  @page="onPage"
>
  <!-- Dynamic Columns -->
  <Column
    v-for="col in visibleColumns"
    :key="col.name"
    :field="col.name"
  >
    <!-- HEADER with Column Options -->
    <template #header>
      <div class="flex items-center justify-between gap-2 w-full">
        <span>{{ col.label }}</span>

        <!-- Column Options (filter/sort per column) -->
        <ColumnOptions
          v-if="canHaveOptions(col)"
          :column-key="col.name"
          :column-label="col.label"
          :model-value="columnOptionsState[col.name] || { search: '', sort: null }"
          @apply="handleColumnOptionsApply"
          @clear="handleColumnOptionsClear"
        />
      </div>
    </template>

    <!-- BODY - Dynamic cell rendering -->
    <template #body="{ data }">
      <!-- Custom rendering based on column type -->
      <template v-if="col.type === 'boolean'">
        <div class="flex justify-center w-full">
          <span v-if="getNestedValue(data, col.name)" class="pi pi-check text-[#16A34A]" />
          <span v-else class="pi pi-times text-[#DC2626]" />
        </div>
      </template>

      <template v-else-if="col.type === 'date'">
        {{ formatDisplayDate(parseDateFromApi(getNestedValue(data, col.name)), '.') }}
      </template>

      <template v-else-if="col.type === 'currency'">
        {{ formatCurrency(getNestedValue(data, col.name), getNestedValue(data, 'currency.name')) }}
      </template>

      <template v-else-if="col.name === 'status'">
        <Tag
          :value="getNestedValue(data, 'status.name')"
          :severity="getStatusSeverity(getNestedValue(data, 'status.code'))"
        />
      </template>

      <!-- Default text -->
      <template v-else>
        {{ getNestedValue(data, col.name) }}
      </template>
    </template>
  </Column>

  <!-- Actions Column (conditional on permissions) -->
  <Column v-if="canUpdate || canDelete" field="actions" :header="t('pages.common.actions')">
    <template #body="{ data }">
      <Button
        v-if="canUpdate"
        icon="pi pi-pencil"
        text
        rounded
        size="small"
        @click="editEntity(data.id)"
      />
      <Button
        v-if="canDelete"
        icon="pi pi-trash"
        text
        rounded
        size="small"
        severity="danger"
        @click="confirmDeleteEntity(data.id, data.name)"
      />
    </template>
  </Column>

  <!-- Empty State -->
  <template #empty>
    <TableEmptyState />
  </template>
</DataTable>
```

**Key Points:**
- Use `v-bind="basicTableProps"` from `useTable` composable
- Dynamic columns from `visibleColumns` computed property
- ColumnOptions component in header for filterable/sortable columns
- Handle different column types (boolean, date, currency, tags)
- Actions column only visible if user has update/delete permissions
- Always include empty state template

---

## Select/MultiSelect Search Functionality

### Overview
All Select, Dropdown, and MultiSelect PrimeVue components automatically display a search input when they contain more than 10 items, improving UX for large option lists.

### Implementation
The search functionality is enabled via the `:filter` prop, which conditionally activates based on the options array length:

```vue
<!-- Single Select / Dropdown -->
<Dropdown
  v-model="selectedValue"
  :options="options"
  :filter="options.length > 10"
  option-label="label"
  option-value="value"
/>

<!-- MultiSelect -->
<MultiSelect
  v-model="selectedValues"
  :options="options"
  :filter="options.length > 10"
  option-label="label"
  option-value="value"
  display="chip"
/>
```

### Where It's Applied

The search functionality is automatically applied in:

1. **ColumnOptions.vue** - MultiSelect for select-type columns
   - Location: `src/components/table/ColumnOptions.vue:45`
   - Condition: `:filter="selectOptions.length > 10"`

2. **AdvancedFilterModal.vue** - Multiple locations:
   - Saved filters dropdown (line 72): `:filter="filters.length > 10"`
   - Column selection dropdown (line 148): `:filter="(dictionary?.columns?.length ?? 0) > 10"`
   - Single value select (line 291): `:filter="getColumnOptions(condition.column).length > 10"`
   - Multi-value multiselect (line 305): `:filter="getColumnOptions(condition.column).length > 10"`

### Key Features

- **Automatic activation**: Search appears only when needed (>10 items)
- **No configuration required**: Works automatically with PrimeVue's built-in filter
- **Consistent UX**: Applied uniformly across all table-related components
- **Performance**: Client-side filtering for fast results

### Best Practices

✅ **Always use conditional filter**:
```vue
:filter="options.length > 10"  <!-- Correct -->
```

❌ **Don't hardcode filter prop**:
```vue
:filter="true"  <!-- Not ideal - shows search even for 2-3 items -->
```

✅ **Handle nullable arrays safely**:
```vue
:filter="(options?.length ?? 0) > 10"  <!-- Safe for optional arrays -->
```

---

## Table State Persistence (localStorage)

The `useTable` composable automatically persists table state to localStorage. When a `tableKey` is provided, the following are saved **per table**:

### Per-Table Storage (with `tableKey`)

| State | Storage Key | Default |
|-------|-------------|---------|
| Page Number | `table-page-${tableKey}` | 1 |
| Global Search | `table-search-${tableKey}` | "" |
| Rows Per Page | `table-rows-per-page-${tableKey}` | 20 |

### Global Storage (without `tableKey`)

| State | Storage Key | Default |
|-------|-------------|---------|
| Rows Per Page | `table-rows-per-page` | 20 |

### How It Works

1. **Page Number**: Saved when user navigates pages, restored on page load
2. **Global Search**: Auto-saved with 300ms debounce when user types, restored on page load
3. **Rows Per Page**: Saved when user changes pagination size, restored on page load

### Implementation

The persistence is handled by two composables:

```typescript
// Per-table storage (when tableKey is provided)
// src/composables/tables/useTableStateStorage.ts
export default function useTableStateStorage(tableKey: string) {
  return {
    loadPage, savePage, clearPage,
    loadSearch, saveSearch, clearSearch,
    loadRowsPerPage, saveRowsPerPage, clearRowsPerPage,
    clearState,  // Clears all three
  }
}

// Global storage (fallback when no tableKey)
// src/composables/tables/useTablePaginationStorage.ts
export default function useTablePaginationStorage() {
  return { loadRowsPerPage, saveRowsPerPage }
}
```

### Usage

Provide a `tableKey` to enable per-table persistence:

```typescript
const { items, search, pagination, ... } = useTable<YourEntity>({
  fetchTable: (query) => yourRepository.list(query),
  tableKey: 'YOUR_TABLE_KEY',  // ← Enables per-table localStorage
})
```

### Key Points

- **Per-Table Isolation**: Each table with a `tableKey` has its own saved state
- **Global Search Auto-Save**: Search is automatically saved to localStorage when changed (no manual call needed)
- **Valid Values Only**: Invalid values fall back to defaults
- **Graceful Fallback**: If localStorage is unavailable, uses in-memory defaults
- **Backward Compatible**: Tables without `tableKey` use global rows per page storage

---

## Currency Field Implementation

### Overview
Currency type columns receive special handling in filter components to provide optimal UX for range-based filtering without visual clutter from currency symbols.

### ColumnOptions (Per-Column Header Filters)

**UI Behavior:**
- Currency columns **ALWAYS** display **two input fields**: Min and Max
- Both fields are plain number inputs (no "zł" or "PLN" suffix)
- No thousand separators (`use-grouping="false"`)
- Users can enter min only, max only, or both

**API Format:**
Values are sent as **pipe-separated** string format:
```
filter[column_filter_name]=1000|5000    # Both min and max
filter[column_filter_name]=1000|        # Min only
filter[column_filter_name]=|5000        # Max only
```

**Implementation:**
- Component: `src/components/table/ColumnOptions.vue` (lines 58-80, 436-445, 518-536)
- Automatic handling for ALL `type="currency"` columns
- No special configuration needed in table components

**Example:**
```vue
<!-- Automatically rendered for currency type columns -->
<div class="flex items-center gap-1 w-full">
  <InputNumber
    v-model="localMinValue"
    :placeholder="t('pages.advancedFilter.min')"
    :use-grouping="false"
  />
  <span>-</span>
  <InputNumber
    v-model="localMaxValue"
    :placeholder="t('pages.advancedFilter.max')"
    :use-grouping="false"
  />
</div>
```

### AdvancedFilterModal (Saved Filters)

**Operator-Based Behavior:**

**1. "Between" / "Not Between" Operators**
- UI: Shows **two input fields** (Min and Max)
- Format: Sent as **array** `["1000", "5000"]`
- Implementation: `src/components/table/AdvancedFilterModal.vue` (lines 166-196)

```json
{
  "name": "credit_amount",
  "type": "currency",
  "filter_type": "between",
  "value": ["1000", "5000"]
}
```

**2. Other Operators** (equal, not_equal, smaller, bigger, smaller_equal, bigger_equal)
- UI: Shows **single input field**
- Format: Sent as **single value** `"1000"`
- Implementation: `src/components/table/AdvancedFilterModal.vue` (lines 197-206)

```json
{
  "name": "credit_amount",
  "type": "currency",
  "filter_type": "bigger",
  "value": "1000"
}
```

**Critical Rules:**
- ❌ **NEVER** use `mode="currency"` on InputNumber for filters
- ❌ **NEVER** add currency symbols ("zł", "PLN", etc.)
- ❌ **NEVER** use thousand separators in filter inputs
- ✅ **ALWAYS** use plain number inputs with `use-grouping="false"`

**Repository Handling:**
- `src/repository/tables/AdvancedFilterRepository.ts` (lines 169-180)
- Automatically formats values based on operator type
- Between operators → array format
- Other operators → single value format

### Example Column Definition

```json
{
  "name": "credit_amount",
  "label": "Credit Amount",
  "visible": true,
  "filterable": true,
  "sortable": true,
  "type": "currency",
  "filter_type": [
    "equal",
    "not_equal",
    "smaller",
    "bigger",
    "smaller_equal",
    "bigger_equal",
    "between",
    "not_between"
  ],
  "db_name": "contractor_trade_credits.credit_amount",
  "column_filter_name": "amount_range"
}
```

### Advanced Filter Validation

**Purpose**: Real-time field-level validation error handling for AdvancedFilterModal with backend validation errors.

**Implementation**: `src/components/table/AdvancedFilterModal.vue`

#### Features

1. **Field-Level Error Display**: Each field shows its own validation error with red border
2. **Real-Time Error Clearing**: Errors disappear immediately when user fixes the field
3. **Single Toast Message**: Shows one consolidated "Błąd walidacji" toast instead of multiple
4. **Backend Error Parsing**: Parses Laravel validation errors (e.g., `filters.0.name`, `filters.1.value`)
5. **Proper Vue Reactivity**: Uses array-mapped watchers to detect all changes including mutations

#### Error State Structure

```typescript
// Field-level validation error state
const conditionErrors = ref<Record<number, {
  name?: string         // Column selection error
  filter_type?: string  // Operator selection error
  value?: string        // Value input error
}>>({})
const filterNameError = ref<string | null>(null)
```

#### Backend Error Format

Laravel returns validation errors in nested format:
```json
{
  "message": "Validation failed",
  "errors": {
    "filter_name": ["Nazwa filtra jest wymagana"],
    "filters.0.name": ["Kolumna jest wymagana"],
    "filters.0.filter_type": ["Operator jest wymagany"],
    "filters.1.value": ["Wartość jest wymagana"]
  }
}
```

#### Real-Time Error Clearing Implementation

**CRITICAL**: Use array-mapped watchers, NOT deep watch!

```typescript
/**
 * Watch column changes to clear column errors
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

#### Template Implementation

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

  <!-- Condition fields in loop -->
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

#### Error Handler

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

    // Show single validation error toast
    if ((error as any)?.data?.errors) {
      toaster.errorTitle(
        t('pages.advancedFilter.validation.validationErrorTitle'), // "Błąd walidacji"
        t('pages.advancedFilter.validation.checkFormErrors'),      // "Sprawdź błędy w formularzu"
      )
    }
    else {
      handleError(error)
    }
  }
  finally {
    loadingSave.value = false
  }
}
```

#### Common Pitfalls

❌ **DON'T** use deep watch for field changes:
```typescript
// ❌ WRONG: Deep watch sees old and new as same object
watch(() => filterData.value.conditions, (newConditions, oldConditions) => {
  // newCondition.value === oldCondition.value (always true!)
}, { deep: true })
```

✅ **DO** use array-mapped watchers:
```typescript
// ✅ CORRECT: Mapping creates new arrays
watch(
  () => filterData.value.conditions.map(c => c.value),
  (newValues, oldValues) => {
    // newValues[0] !== oldValues[0] (works!)
  }
)
```

❌ **DON'T** show multiple toasts:
```typescript
// ❌ WRONG: Toast spam
Object.entries(errors).forEach(([field, msg]) => {
  toaster.error(msg)
})
```

✅ **DO** show single consolidated toast:
```typescript
// ✅ CORRECT: One toast with custom title
toaster.errorTitle(
  t('validation.validationErrorTitle'),
  t('validation.checkFormErrors')
)
```

#### Required i18n Keys

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

**See Also**: [ERROR-HANDLING.md](./ERROR-HANDLING.md#advanced-field-level-validation-with-real-time-error-clearing) for detailed validation patterns.

---

## Filter State Reset on Close Without Apply

### Overview
Both ColumnOptions and AdvancedFilterModal implement automatic state reset when the user closes the filter UI without applying changes. This ensures a clean user experience by discarding abandoned filter modifications.

### ColumnOptions (Per-Column Filters)

**Component**: `src/components/table/ColumnOptions.vue`

**Behavior**: When the ColumnOptions overlay is closed without clicking "Apply" or "Clear", all unapplied changes are automatically discarded.

**Trigger Events**:
- User clicks outside the overlay (clicks elsewhere on the page)
- User presses ESC key
- User clicks the X button
- User closes the overlay without clicking Apply

**Implementation**: The component uses PrimeVue Popover's `@hide` event:

```vue
<Popover
  ref="panel"
  :dismissable="true"
  @hide="onPanelHide"
>
  <!-- Filter UI -->
</Popover>
```

**Reset Handler**:
```typescript
/**
 * Reset local state when overlay is closed without applying changes
 * This ensures abandoned changes are discarded when the user:
 * - Clicks outside the overlay
 * - Presses ESC
 * - Clicks the X button
 */
const onPanelHide = () => {
  initializeLocalValues()
}
```

**What Gets Reset**:
- `localSearch` - Text/select filter values
- `localSort` - Sort direction (asc/desc)
- `localNumericValue` - Number/percentage filter values
- `localDateValue` - Date/datetime/time filter values
- `localDateRange` - Date range filter values
- `localMultiSelectValues` - MultiSelect filter values
- `localMinValue` / `localMaxValue` - Currency range filter values

All local state is reset to match the last **applied** values from `props.modelValue`, ensuring the UI always shows the current active filter state when reopened.

### AdvancedFilterModal (Saved Filters)

**Component**: `src/components/table/AdvancedFilterModal.vue`

**Behavior**: When the AdvancedFilterModal is closed without clicking "Apply" or "Save", the form state is reset to either the active filter (if one exists) or empty state.

**Trigger Events**:
- User clicks outside the modal
- User presses ESC key
- User clicks the X button
- User clicks the Cancel button

**Implementation**: The component uses PrimeVue Dialog's `@hide` event:

```vue
<Dialog
  v-model:visible="showAdvancedFilterModal"
  :closable="true"
  @show="onModalOpen"
  @hide="onModalHide"
>
  <!-- Filter form -->
</Dialog>
```

**Reset Handler**:
```typescript
/**
 * Reset form state when modal is closed without applying changes
 * This ensures abandoned changes are discarded when the user:
 * - Clicks outside the modal
 * - Presses ESC
 * - Clicks the X button
 * - Clicks Cancel button
 */
const onModalHide = async () => {
  // Restore page scrolling
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''

  // Clear validation errors
  clearFieldErrors()

  // Reset form state based on active filter
  if (activeFilterId.value) {
    // Reload the active filter data
    selectedFilterId.value = activeFilterId.value
    await getFilter(activeFilterId.value)
  }
  else {
    // No active filter - reset to empty state
    selectedFilterId.value = null
    resetFilterData()
  }
}
```

**What Gets Reset**:
- `filterData.name` - Filter name
- `filterData.conjunction` - AND/OR logic
- `filterData.conditions` - All filter conditions
- `selectedFilterId` - Selected saved filter
- `conditionErrors` - Validation errors
- `filterNameError` - Filter name validation error
- `document.body.style.overflow` - Page scroll restoration

**Smart Reset Logic**:
1. **If active filter exists**: Reloads the active filter data (preserves user's current filter)
2. **If no active filter**: Resets to completely empty state
3. **Always**: Clears all validation errors and restores page scrolling

### Key Benefits

1. **Prevents Accidental Changes**: Users can explore filter options without worry - closing without applying discards changes
2. **Consistent UX**: Same behavior across both filter types (column-level and advanced)
3. **Clean State**: No "ghost" filter values that persist across sessions
4. **Validation Reset**: Error states are cleared when modal closes
5. **Scroll Restoration**: Page scrolling is properly restored (AdvancedFilterModal only)

### Testing Considerations

When testing filter components, verify:
1. **Open → Change → Close → Reopen**: Changes are discarded
2. **Open → Change → Apply → Reopen**: Changes persist
3. **Open → Change → Clear → Reopen**: Filter is cleared
4. **Validation errors cleared**: No red borders remain after close
5. **Active filter preserved**: AdvancedFilterModal reloads active filter data on close
6. **Empty state when no active filter**: AdvancedFilterModal resets to blank form
7. **Scroll restoration**: Page is scrollable after modal closes

### Implementation Pattern

This pattern can be applied to any filter/modal component:

```vue
<template>
  <Popover @hide="resetLocalState">
    <!-- Filter UI -->
  </Popover>
</template>

<script setup>
const resetLocalState = () => {
  // Reset all local state to match props or initial values
  initializeFromProps()
}
</script>
```

**Critical Rule**: The `@hide` event fires **AFTER** the user has explicitly closed the UI. It does NOT fire when the user clicks "Apply" or "Save" and the component closes programmatically, ensuring applied changes are preserved.

---

### STEP 2: Script Setup - Required Composables

```typescript
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDebounceFn } from '@vueuse/core'

// REQUIRED CONSTANT
const LISTING_KEY = 'YOUR_ENTITY_INDEX' // Must match backend listing key

// ============================================================================
// LAYER 1: Table Feature Stores
// ============================================================================
const columnsListStore = useColumnsListStore()
const {
  loadingColumnsList,
  showColumnsListModal,
  listing,
  columns,
  defaultColumns,
  columnsListData,
} = storeToRefs(columnsListStore)
const { setColumnsListing, setColumns } = columnsListStore

const advancedFilterStore = useAdvancedFilterStore()
const { activeFilterId } = storeToRefs(advancedFilterStore)
const { clearSelectedFilter, setListing } = advancedFilterStore

// ============================================================================
// LAYER 2: Domain Store
// ============================================================================
const yourEntityStore = useYourEntityStore()
const { loading, editingEntityId } = storeToRefs(yourEntityStore)
const { openModal } = yourEntityStore

// ============================================================================
// LAYER 3: Composables
// ============================================================================
const { t } = useI18n()
const toaster = useToaster()
const { hasPermission } = usePermission()
const confirm = useConfirm()

// Domain composable
const yourEntity = useYourEntity()

// Table composables
const columnsList = useColumnsList()
const advancedFilter = useAdvancedFilter()
const { loadColumnOptions, saveColumnOptions, clearColumnOptions } = useColumnOptionsStorage(LISTING_KEY)

// ============================================================================
// LAYER 4: useTable - Core Data Management
// ============================================================================
const {
  items,
  basicTableProps,
  onPage,
  fetchData,
  setQueryParams,
  clearFilters,
  searchByColumn,
} = useTable<YourEntity, YourEntityTableResponse>({
  fetchTable: (query?: string) => yourEntity.list(query),
  skipInitialFetch: true, // Wait for columns to load first
})

// ============================================================================
// LOCAL STATE
// ============================================================================
const searchQuery = ref('')

const columnOptionsState = ref<Record<string, ColumnOptionsModelValue>>({})

const currentSort = ref<{
  field: string | null
  order: 'asc' | 'desc' | null
}>({ field: null, order: null })

// ============================================================================
// COMPUTED
// ============================================================================
const visibleColumns = computed(() =>
  columns.value
    .filter(c => c.visible)
    .sort((a, b) => a.order - b.order)
)

const canCreate = computed(() => hasPermission('your-entity.create'))
const canUpdate = computed(() => hasPermission('your-entity.update'))
const canDelete = computed(() => hasPermission('your-entity.delete'))

const canHaveOptions = (col: ColumnItem) => col.filterable || col.sortable
</script>
```

**Critical Requirements:**
1. Define `LISTING_KEY` constant at the top (matches backend)
2. Import stores in order: table stores → domain store
3. Use `storeToRefs()` to maintain reactivity when destructuring
4. Set `skipInitialFetch: true` in `useTable` (columns must load first)
5. Initialize `columnOptionsState` as empty object
6. Always compute `visibleColumns` with filter + sort

---

### STEP 3: Required Functions

Copy these **exact** function implementations into your component:

#### 3.1 Initialization (onMounted)

**⚠️ CRITICAL FIX**: Must set `selectedFilterId.value = activeFilter.id` when active filter exists to prevent filter from being dropped on subsequent operations.

```typescript
onMounted(async () => {
  // 0. Clear URL query parameters before initialization
  const router = useRouter()
  await router.replace({ query: {} })

  // 1. Set listing key for advanced filters
  setListing(LISTING_KEY)

  // 2. Load advanced filters from API
  await advancedFilter.getFilters()
  const activeFilter = advancedFilter.getActiveFilter()

  // 3. Load column definitions
  await handleColumnsList()

  // 4. Initialize column options from localStorage
  initializeColumnOptions()

  // 5. Apply saved filters from localStorage
  const { hasFilters, params: savedParams } = applySavedFiltersToState()

  // 6. Build final query parameters
  const params = initializeFilters()
  if (activeFilter) {
    // ⚠️ CRITICAL: Set selectedFilterId so subsequent filter operations
    // (like column filters) will correctly include the advanced filter
    selectedFilterId.value = activeFilter.id
    params.advanced_filter = activeFilter.id
  }
  if (hasFilters) {
    Object.assign(params, savedParams)
  }

  // 7. Fetch data with all filters applied
  setQueryParams(params, false)  // Use explicit replace mode
  await fetchData()
})
```

**Order is critical - DO NOT change the sequence!**

**Why the selectedFilterId fix is critical:**
Without setting `selectedFilterId.value = activeFilter.id`, the advanced filter will be dropped when column filters are applied after page reload. This happens because `handleColumnOptionsApply` checks `if (activeFilterId.value)` to preserve the advanced filter, but `activeFilterId` won't be set if `selectedFilterId` is null.

#### 3.2 Search Handling

```typescript
// Build filter params from search query
const initializeFilters = () => {
  const params: Record<string, string | number> = {}

  if (searchQuery.value) {
    params['filter[search]'] = searchQuery.value
  }

  // Add column-level searches
  Object.entries(searchByColumn.value).forEach(([key, value]) => {
    if (value) {
      params[`filter[${key}]`] = value
    }
  })

  // Add sort
  if (currentSort.value.order && currentSort.value.field) {
    params.sort = currentSort.value.order === 'desc'
      ? `-${currentSort.value.field}`
      : currentSort.value.field
  }

  return params
}

// Clear global search
const handleClearSearch = () => {
  searchQuery.value = ''
  const params = initializeFilters()

  // Preserve advanced_filter if active
  if (activeFilterId.value) {
    params.advanced_filter = activeFilterId.value
  }

  setQueryParams(params, false)
  fetchData()
}

// Debounced search on input change
const debouncedSearch = useDebounceFn(() => {
  const params = initializeFilters()

  // Preserve advanced_filter if active
  if (activeFilterId.value) {
    params.advanced_filter = activeFilterId.value
  }

  setQueryParams(params, true) // Merge with existing params
  fetchData()
}, 500)

watch([searchQuery], () => {
  debouncedSearch()
})
```

**Key Points:**
- Always use 500ms debounce for search
- Use `merge: true` to preserve advanced filter
- Clear button resets search but keeps other filters

#### 3.3 Advanced Filter Handling

**⚠️ CRITICAL**: Functions must be `async` to properly await router operations. Must clear URL parameters, local state, and localStorage.

```typescript
const handleAdvancedFilterApply = async (filterId: number | null) => {
  // 1. Clear all basic filters
  clearFilters()
  searchQuery.value = ''

  // 2. Clear localStorage column options
  clearColumnOptions()
  initializeColumnOptions()

  // 3. Clear local state (CRITICAL for tables WITH column options)
  searchByColumn.value = {}
  currentSort.value = { field: null, order: null }

  // 4. Clear URL query parameters before applying new filters
  const router = useRouter()
  await router.replace({ query: {} })

  // 5. Build params
  const params = initializeFilters()
  if (filterId) {
    params.advanced_filter = filterId
    toaster.success(t('pages.advancedFilter.success.activate'))
  } else {
    if (activeFilterId.value) {
      toaster.success(t('pages.advancedFilter.success.deactivate'))
    }
  }

  // 6. Apply and fetch
  setQueryParams(params, false)  // Use explicit replace mode
  fetchData()
}

const clearFiltersAndSearch = async () => {
  clearSelectedFilter()
  clearColumnOptions()
  initializeColumnOptions()
  searchQuery.value = ''
  searchByColumn.value = {}
  currentSort.value = { field: null, order: null }

  await advancedFilter.deactivateFilters(true)

  // Clear URL query parameters
  const router = useRouter()
  await router.replace({ query: {} })

  await handleAdvancedFilterApply(null) // This does the actual clearing
}
```

**Critical Rules:**
- Advanced filter **CLEARS** all other filters (search, column options)
- Always clear localStorage when activating advanced filter
- Always clear local state: `searchByColumn`, `currentSort`, `searchQuery`
- Always clear URL parameters with `await router.replace({ query: {} })`
- Functions must be `async` to properly await router operations
- Use `setQueryParams(params, false)` for replace mode
- Show toast feedback for activate/deactivate

#### 3.4 Column Filter Parameter Mapping

**CRITICAL: Backend may return incorrect `column_filter_name` values that must be corrected**

When implementing column filters, you MUST:
1. Check what query parameters the API actually accepts (see API docs)
2. Map incorrect `column_filter_name` values from backend to correct API filter names
3. Use the correction function pattern shown below

```typescript
/**
 * AVAILABLE QUERY PARAMETERS FOR COLUMN OPTIONS
 * Document all accepted filter parameters from your API endpoint
 * Example for GET /api/v1/your-entity:
 * - filter[search] - global search
 * - filter[name] - filter by name
 * - filter[status] - filter by status
 * - filter[date_range] - date range filter
 * - filter[trashed] - soft-delete filter
 * - sort - sort by field
 * - page, per_page - pagination
 */

/**
 * Map incorrect column_filter_name values from backend to correct API filter names
 * This corrects cases where the backend returns incorrect filter parameter names
 */
const correctFilterParamName = (paramName: string | null): string | null => {
  if (!paramName) return null

  const corrections: Record<string, string> = {
    // Examples of common corrections:
    'id': 'by_id',                           // Backend sends 'id' but API expects 'by_id'
    'position.name': 'contact_position',     // Nested field correction
    'credit_type': 'by_credit_category',     // Different naming
    // Add your table-specific corrections here
  }

  return corrections[paramName] || paramName
}
```

**Success Story: Contractors Table (NGLT-257)**

The contractors table (`src/pages/contractors/index.vue`) serves as an excellent example of a **fully compliant implementation** with 33 filterable columns that require NO corrections:

```typescript
/**
 * CONTRACTORS TABLE - PERFECT IMPLEMENTATION
 * All 33 filter parameters match backend API expectations exactly.
 * No manual corrections needed!
 */
const correctFilterParamName = (paramName: string | null): string | null => {
  if (!paramName) return null

  const corrections: Record<string, string> = {
    // Empty - all column_filter_name values are correct! ✅
  }

  return corrections[paramName] || paramName
}
```

**Why this works:**
- Backend provides correct `column_filter_name` for all columns
- Repository layer uses these names consistently
- Composable extracts parameters using the same names
- Type definitions match API expectations

**The 33 filter parameters (all correct):**
```typescript
filter[search]           // Global search
filter[full_name]        // Full name
filter[short_name]       // Short name
filter[nip]              // Tax ID
filter[krs]              // KRS number
filter[regon]            // REGON number
filter[contractor_option] // Contractor type
filter[type]             // Entity type
filter[statuses]         // Status IDs (pipe-separated)
filter[groups]           // Group IDs (pipe-separated)
filter[classifications]  // Classification IDs (pipe-separated)
filter[industry]         // Industry
filter[registered_address]  // Address
filter[registered_postal]   // Postal code
filter[registered_city]     // City
filter[registered_country]  // Country
filter[email]            // Email
filter[phone]            // Phone
filter[timocom]          // Timocom ID
filter[trans]            // Trans.eu ID
filter[sales_payment_method]  // Sales payment
filter[sales_block]      // Sales block
filter[invoice_delivery_methods]  // Invoice delivery
filter[document_preparation_methods]  // Document prep
filter[purchase_payment_method]  // Purchase payment
filter[purchase_block]   // Purchase block
filter[billing_country]  // Billing country
filter[billing_postal_code]  // Billing postal
filter[billing_city]     // Billing city
filter[billing_street]   // Billing street
filter[related_internal_contractors]  // Related contractors
filter[client_ref_abbr]  // Client ref abbreviation
filter[client_ref_nip]   // Client ref NIP
filter[trashed]          // Soft delete filter
advanced_filter=123      // Saved filter ID (NOT in filter[] array)
```

**Key Takeaway:** When backend provides correct `column_filter_name` values, your corrections object should be empty. If you need corrections, coordinate with the backend team to fix the API response instead of maintaining manual mappings.

---

**Back to the general implementation pattern:**

```typescript
/**
 * Get the query parameter name for a column (for Column Options filtering)
 * Returns null if the column cannot be filtered via Column Options
 */
const getQueryParamName = (columnName: string): string | null => {
  const column = columns.value.find(col => col.name === columnName)
  const paramName = column?.column_filter_name || null
  return correctFilterParamName(paramName)  // ALWAYS apply corrections
}

/**
 * Check if a column can be filtered via Column Options
 */
const canFilter = (col: ColumnItem) => {
  // Special exclusions for columns that cannot be filtered
  if (col.name === 'some_special_column') {
    return false
  }

  // Column must be filterable AND have a valid query parameter
  return col.filterable && getQueryParamName(col.name) !== null
}

/**
 * Check if a column should show the ColumnOptions icon
 */
const canHaveOptions = (col: ColumnItem) => {
  return canFilter(col) || col.sortable
}
```

**Then use getQueryParamName() when building filter parameters:**

```typescript
const initializeFilters = () => {
  const params: Record<string, string | number> = {}

  if (searchQuery.value) {
    params['filter[search]'] = searchQuery.value
  }

  // Add column-level searches using corrected parameter names
  const addedParams = new Set<string>()

  Object.entries(searchByColumn.value).forEach(([columnKey, value]) => {
    if (value) {
      const paramName = getQueryParamName(columnKey)  // Get corrected name
      if (paramName && !addedParams.has(paramName)) {
        params[`filter[${paramName}]`] = value
        addedParams.add(paramName)  // Prevent duplicates
      }
    }
  })

  // Add sort using corrected parameter name
  if (currentSort.value.order && currentSort.value.field) {
    const sortParamName = getQueryParamName(currentSort.value.field)
    if (sortParamName) {
      params.sort = currentSort.value.order === 'desc'
        ? `-${sortParamName}`
        : sortParamName
    }
  }

  return params
}
```

#### 3.5 Column Options (Per-Column Filter/Sort)

##### Currency Type Columns - Min-Max Range

**IMPORTANT:** Currency type columns use a special min-max range filter format.

**UI Behavior:**
- Column Options shows **two input fields** for currency columns: Min and Max
- Both fields are plain number inputs (no "zł" or "PLN" suffix)
- No thousand separators (e.g., 10000 instead of 10,000)

**API Format:**
Currency values are sent as pipe-separated min|max format:
```
filter[amount_range]=1000|5000    # Both min and max
filter[amount_range]=1000|        # Min only
filter[amount_range]=|5000        # Max only
```

**Implementation:**
The `ColumnOptions.vue` component automatically handles this for ALL `type="currency"` columns. No special configuration needed.

**Advanced Filter Modal:**
- Single value inputs also remove currency formatting (no "zł" suffix)
- "Between" operator uses plain number inputs without currency symbol

##### Apply Handler

**CRITICAL:** Proper filter clearing is essential. When users clear a filter (e.g., uncheck all items in MultiSelect), the filter MUST be removed from the searchByColumn state to prevent stale values from being sent to the API.

```typescript
const handleColumnOptionsApply = (payload: {
  columnKey: string
  search: string
  sort: 'asc' | 'desc' | null
}) => {
  const { columnKey, search, sort } = payload

  // Find the column to check if filtering is allowed
  const column = columns.value.find(col => col.name === columnKey)
  const isFilterAllowed = column?.filterable || false

  // 1. Update search state (only if filter is allowed)
  if (search && isFilterAllowed) {
    searchByColumn.value[columnKey] = search
  }
  else if (search && !isFilterAllowed) {
    // Show warning that this column cannot be filtered
    toaster.error(t('pages.table.errors.columnNotFilterable', { column: column?.label || columnKey }))
    // Don't add to searchByColumn - remove if exists
    const { [columnKey]: _, ...rest } = searchByColumn.value
    searchByColumn.value = rest
  }
  else {
    // Empty search - remove the filter
    const { [columnKey]: _, ...rest } = searchByColumn.value
    searchByColumn.value = rest
  }

  // 2. Update sort state (only one column can be sorted)
  currentSort.value = { field: columnKey, order: sort }

  // 3. Update column options UI state
  Object.keys(columnOptionsState.value).forEach((key) => {
    if (key === columnKey) {
      // Only save search if it's allowed, always save sort
      columnOptionsState.value[key] = {
        search: (search && isFilterAllowed) ? search : '',
        sort,
      }
    }
    else {
      columnOptionsState.value[key].sort = null // Only one sort
    }
  })

  // 4. Persist to localStorage
  saveColumnOptions(columnOptionsState.value)

  // Reset page to 1 when filter is applied
  pagination.value.current_page = 1

  // 5. Build query params (preserve advanced filter and trashed)
  const params = initializeFilters()
  if (activeFilterId.value) {
    params.advanced_filter = activeFilterId.value
  }
  // Always preserve the trashed filter if needed
  params['filter[trashed]'] = 'none'

  setQueryParams(params, false) // Replace all params to avoid duplicates
  fetchData()
}

const handleColumnOptionsClear = (payload: { columnKey: string }) => {
  const { columnKey } = payload

  // 1. Clear search filter
  const { [columnKey]: _, ...rest } = searchByColumn.value
  searchByColumn.value = rest

  // 2. Clear sort
  currentSort.value = { field: null, order: null }

  // 3. Reset UI state
  if (columnOptionsState.value[columnKey]) {
    columnOptionsState.value[columnKey] = { search: '', sort: null }
  }

  // 4. Persist
  saveColumnOptions(columnOptionsState.value)

  // 5. Build params
  const params = initializeFilters()
  if (activeFilterId.value) {
    params.advanced_filter = activeFilterId.value
  }

  setQueryParams(params)
  fetchData()
}
```

**Critical Rules:**
- Multiple columns can have search filters (stack)
- Only ONE column can be sorted at a time (clear others)
- Always use `setQueryParams(params, false)` with replace mode to avoid duplicate parameters
- Always save to localStorage
- **CRITICAL:** When search is empty, filter MUST be removed from `searchByColumn.value`

##### Common Bug: Filter Not Cleared When MultiSelect is Empty

**Bug Description (Fixed in NGLT-740):**
When users unchecked all items in a MultiSelect filter and clicked Apply, the filter parameter retained old values instead of being cleared from the API request.

**Root Cause:**
The handler was creating a temporary copy of `searchByColumn.value`, modifying it, but then overwriting the correct cleaned state with the unmodified copy that still contained old filter values.

**Example of Buggy Code (DO NOT USE):**
```typescript
// ❌ WRONG - Creates copy WITH old values, then overwrites cleaned state
const handleColumnOptionsApply = (payload) => {
  const { columnKey, search, sort } = payload

  const updatedSearchByColumn = { ...searchByColumn.value }  // Copy with old values
  if (search) {
    updatedSearchByColumn[columnKey] = search
  } else {
    const { [columnKey]: _, ...rest } = updatedSearchByColumn
    searchByColumn.value = rest  // Correctly removes the key
  }
  searchByColumn.value = updatedSearchByColumn  // BUG: Overwrites with copy that has old value!

  // ...rest of function
}
```

**The Problem:**
1. User selects 3 items → filter value becomes `"1|2|3"`
2. User unchecks all items → `search` parameter is empty string `""`
3. Code enters `else` block and correctly removes key from `searchByColumn.value`
4. BUT then immediately overwrites with `updatedSearchByColumn` which still has old value
5. API request sent with stale filter: `filter[by_credit_risk_type]=1|2|3`

**Fixed Implementation (CORRECT):**
```typescript
// ✅ CORRECT - Directly modifies searchByColumn.value
const handleColumnOptionsApply = (payload) => {
  const { columnKey, search, sort } = payload

  const column = columns.value.find(col => col.name === columnKey)
  const isFilterAllowed = column?.filterable || false

  // Directly modify searchByColumn.value based on conditions
  if (search && isFilterAllowed) {
    searchByColumn.value[columnKey] = search
  }
  else if (search && !isFilterAllowed) {
    toaster.error(t('pages.table.errors.columnNotFilterable', { column: column?.label || columnKey }))
    const { [columnKey]: _, ...rest } = searchByColumn.value
    searchByColumn.value = rest
  }
  else {
    // Empty search - remove the filter
    const { [columnKey]: _, ...rest } = searchByColumn.value
    searchByColumn.value = rest
  }

  // ...rest of function (NO overwrite with temp copy)
}
```

**Key Lessons:**
1. **Never create temporary copies when conditionally removing keys** - Work directly with the ref
2. **Empty string from MultiSelect means remove, not update** - Filters must be deleted from state
3. **Test filter clearing thoroughly** - Especially MultiSelect with all items unchecked
4. **Use replace mode for params** - `setQueryParams(params, false)` prevents duplicate parameters

**Test Coverage:**
The bug fix includes comprehensive tests in:
`src/tests/components/contractor/record/TradeCredit/tables/TradeCreditHistory.multiselect-clear.nuxt.test.ts`

Tests verify:
- Filter is properly removed when MultiSelect is cleared
- Filter can be cleared and re-applied multiple times
- Clearing one filter doesn't affect other filters
- Filter values update correctly when changing selections

**Reference Implementation:**
See `src/components/contractor/record/TradeCredit/tables/TradeCreditHistory.vue:693-708` for the corrected implementation.

---

#### 3.5 Column Customization

```typescript
const handleColumnsList = async () => {
  await setColumnsListing(LISTING_KEY)
  await columnsList.getColumnsList(listing.value)
  await columnsList.getDefaultColumnsList(listing.value)
}

const handleColumnsApply = async (updatedColumns: ColumnItem[]) => {
  await setColumns(updatedColumns)
  await columnsList.saveColumnsList(columnsListData.value)
}

const handleColumnsResetOrders = async () => {
  await columnsList.getDefaultColumnsList(listing.value)
}

// Reset column options when columns change
watch(
  () => columns.value,
  () => {
    initializeColumnOptions()
  },
  { deep: true }
)
```

#### 3.6 localStorage Helpers

```typescript
const initializeColumnOptions = () => {
  const state: Record<string, ColumnOptionsModelValue> = {}

  visibleColumns.value.forEach((col) => {
    if (canHaveOptions(col)) {
      state[col.name] = { search: '', sort: null }
    }
  })

  columnOptionsState.value = state
}

const applySavedFiltersToState = () => {
  const savedOptions = loadColumnOptions()
  const hasSavedOptions = Object.keys(savedOptions).length > 0

  if (!hasSavedOptions) return { hasFilters: false, params: {} }

  const searchFilters: Record<string, string> = {}
  let sortField: string | null = null
  let sortOrder: 'asc' | 'desc' | null = null

  Object.entries(savedOptions).forEach(([columnKey, options]) => {
    if (options.search) {
      searchFilters[columnKey] = options.search
    }
    if (options.sort) {
      sortField = columnKey
      sortOrder = options.sort
    }
  })

  searchByColumn.value = searchFilters
  currentSort.value = { field: sortField, order: sortOrder }

  const params = initializeFilters()

  return { hasFilters: true, params }
}
```

#### 3.7 CRUD Operations

```typescript
const handleSubmit = async () => {
  // Called after form submission in modal
  await fetchData()
}

const editEntity = async (id: number) => {
  await yourEntity.get(id)
  editingEntityId.value = id
  openModal()
}

const confirmDeleteEntity = (id: number, name: string) => {
  confirm.require({
    message: `${t('yourEntity.confirmDelete.message')} "${name}"?`,
    header: t('yourEntity.confirmDelete.header'),
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
        await yourEntity.delete(id)
        toaster.success(t('yourEntity.deleteSuccess.message'))
        await fetchData()
      } catch (error) {
        toaster.error(t('yourEntity.deleteError.message'))
      }
    },
  })
}
```

#### 3.8 Helper Functions

```typescript
// Get nested property value (for displaying related data)
function getNestedValue<T>(obj: T, path: string): any {
  if (obj === null || obj === undefined) {
    return null
  }
  return path.split('.').reduce((acc, part) => acc && acc[part], obj)
}
```

---

### STEP 4: Filter Retrieval & Two-Level Filter System

The table filtering system is entirely **API-driven** with **two distinct filter types**:

#### 4.1 Understanding the Two Filter Systems

**IMPORTANT:** There are TWO separate filtering systems with different data sources:

1. **Advanced Filters** → Use Columns List endpoint (`/api/v1/columns-list/columns`)
2. **Column Options (Column Filters)** → Use Query Parameters from Table endpoint

---

#### 4.2 Advanced Filters (Filter Modal)

**Data Source:**
```
GET /api/v1/columns-list/columns
```

**Purpose:** Create/edit/save complex filters with multiple conditions

**Logic:**
- Check `filterable: true` in columns list to show filter options
- Use `name` field from columns list (e.g., `contact_type.name`)
- Use `filter_type` array to determine available operators
- Use `type` field to determine input type

---

#### 4.3 Column Options (Per-Column Filters in Table Header)

**Data Source:** Query Parameters from the **table endpoint** (see API docs)

**Purpose:** Quick filter/sort individual columns directly in the table header

**Query Parameters in API docs** (example from Contact List):
```
filter[contact_type]      → Filter by contact type ID
filter[first_name]        → Filter by first name
filter[last_name]         → Filter by last name
sort                      → Sort by field name
```

**Logic for Column Options:**
1. Parse Query Parameters from API documentation for the table endpoint
2. Extract filter parameter names (e.g., `contact_type` from `filter[contact_type]`)
3. Map parameter names to column names from columns list
4. Only show Column Options if query parameter exists
5. Use query parameter name (not `db_name`) for API requests

**Column Metadata from Columns List** (still needed for display info):

Each table endpoint returns column metadata in its response structure. This metadata defines:
- Column display name and label (`name`, `label`)
- What filter operators are available (`filter_type: FilterOperator[]`)
- Whether the column can be sorted (`sortable: boolean`)
- The data type of the column (`type: string`)

**Example column metadata structure:**
```typescript
interface ColumnItem {
  name: string              // Display name (e.g., "contact_type.name")
  label: string             // UI label (e.g., "Contact Type")
  db_name: string | null    // API parameter name (e.g., "contact_type")
  filterable: boolean       // Can this column be filtered?
  filter_type: FilterOperator[] | null  // Available filter operators
  sortable: boolean         // Can this column be sorted?
  type: string              // Data type: 'string', 'number', 'date', 'select', etc.
  select_type: string | null // Dictionary key for select options
  visible: boolean          // Is column visible by default?
  always_visible: boolean   // Cannot be hidden
  order: number             // Display order
  width: number             // Column width
}
```

**Table-specific endpoints:**

| Table | Endpoint |
|-------|----------|
| Contact List | `GET /api/v1/contractor/{contractor}/contact` |
| Trade Credit History | `GET /api/v1/contractor/{contractor}/record/trade-credit-history` |

**CRITICAL RULE:** Only show filter/sort options for columns where:
- `filterable === true` (for filtering)
- `sortable === true` (for sorting)

If a column is not marked as filterable or sortable in the API response, **DO NOT** show the filter/sort UI for that column.

#### 4.2 Using `column_filter_name` for API Parameters

**NEW (Backend Added in 2025):** When building API query parameters for filters and sorts, use the `column_filter_name` field from the column metadata.

**Priority Order for Column Filtering:**
1. **`column_filter_name`** - NEW field from backend (use if available) ⭐
2. **`db_name`** - Fallback for backward compatibility
3. **`name`** - Last resort (column display name)

**Why this change?**
- The backend now provides `column_filter_name` which explicitly tells us the correct query parameter name
- This eliminates the need for manual mapping (COLUMN_TO_QUERY_PARAM_MAP)
- Backward compatibility is maintained with `db_name` fallback

**Example Implementation:**

```typescript
/**
 * Get the query parameter name for a column (for Column Options filtering)
 * Returns null if the column cannot be filtered via Column Options
 *
 * NEW LOGIC (from backend):
 * - First checks column_filter_name from columns list (if available)
 * - Falls back to COLUMN_TO_QUERY_PARAM_MAP for backward compatibility
 */
const getQueryParamName = (columnName: string): string | null => {
  // NEW: Check if column has column_filter_name from the columns list
  const column = columns.value.find(col => col.name === columnName)
  if (column?.column_filter_name) {
    return column.column_filter_name
  }

  // FALLBACK: Use the old mapping for backward compatibility
  const paramName = COLUMN_TO_QUERY_PARAM_MAP[columnName]

  // Verify the parameter is available in the API
  if (paramName && AVAILABLE_QUERY_PARAMS.has(paramName)) {
    return paramName
  }

  // No mapping or not available
  return null
}

// Building filter parameters
const initializeFilters = () => {
  const params: Record<string, string | number> = {}

  // Add column-level searches
  Object.entries(searchByColumn.value).forEach(([columnKey, value]) => {
    if (value) {
      // Get the query parameter name for this column
      const paramName = getQueryParamName(columnKey)

      // Only add if the column has a valid query parameter
      if (paramName) {
        params[`filter[${paramName}]`] = value
      }
    }
  })

  // Add sort parameter
  if (currentSort.value.order && currentSort.value.field) {
    const sortParamName = getQueryParamName(currentSort.value.field)
    if (sortParamName) {
      params.sort = currentSort.value.order === 'desc'
        ? `-${sortParamName}`
        : sortParamName
    }
  }

  return params
}
```

**Query Result Examples:**
```
// Using column_filter_name correctly:
filter[contact_type]=1&filter[first_name]=John&sort=-created_at

// ❌ WRONG - using display name instead of column_filter_name:
filter[contact_type.name]=1&filter[first_name]=John
```

#### 4.3 Checking Filter Availability

Before showing filter UI for a column, verify it's filterable:

```typescript
// Check if column can have filter options
const canHaveOptions = (col: ColumnItem) => {
  return col.filterable || col.sortable
}

// Check if column can be filtered specifically
const canFilter = (col: ColumnItem) => {
  return col.filterable
}

// Usage in template
<ColumnOptions
  v-if="canHaveOptions(col)"
  :column-key="col.name"
  :column-label="col.label"
  :column-type="col.type"
  :can-filter="canFilter(col)"
  :can-sort="col.sortable"
  @apply="handleColumnOptionsApply"
  @clear="handleColumnOptionsClear"
/>
```

**DO NOT use hardcoded filter lists.** Always rely on the `filterable` flag from the API.

❌ **WRONG Approach:**
```typescript
// Hardcoded list - will get out of sync with API
const ALLOWED_FILTERS = new Set([
  'contact_type',
  'first_name',
  'last_name'
])
```

✅ **CORRECT Approach:**
```typescript
// Dynamic - based on API metadata
const canFilter = (col: ColumnItem) => {
  return col.filterable  // Trust the API
}
```

#### 4.4 Filter Priority & Interaction Rules

```typescript
/**
 * FILTER HIERARCHY (highest to lowest priority):
 * 1. Advanced Filter (most specific)
 * 2. Column Options (per-column search/sort)
 * 3. Global Search (lowest priority)
 *
 * INTERACTION RULES:
 * - Advanced filter EXCLUDES others (clears column options + global search)
 * - Multiple column filters STACK (filter[col1]=x&filter[col2]=y)
 * - Only ONE sort at a time (sorting col2 clears col1 sort)
 * - Global search + column filters CAN coexist
 *
 * PARAM MERGING:
 * - Use merge: false to REPLACE all params (e.g., advanced filter)
 * - Use merge: true to ADD params (e.g., column options, search)
 *
 * API PARAMETER NAMING:
 * - ALWAYS use db_name from column metadata for filter/sort parameters
 * - NEVER use the display name (col.name) directly in API calls
 * - If db_name is null, fall back to column name as last resort
 */
```

---

## Advanced Filter Value Serialization

### Overview
Advanced filters use operator-based UI components and value serialization. The component type and value format depend on both the column type and the selected operator.

### Select Type Columns - Operator-Based UI

**Background:**
Select type columns (dropdowns with predefined options) adapt their UI based on the selected operator to provide the best UX.

#### Single Value Operators (`equal`, `not_equal`)

**UI Component:** Single Select (Dropdown)

**Value Type:** Single value (string | number | boolean)

**Implementation:** `src/components/table/AdvancedFilterModal.vue` (lines 279-289)

**Example:**
```vue
<Select
  v-if="columnType === 'select' && (operator === 'equal' || operator === 'not_equal')"
  v-model="condition.value"
  :options="columnOptions"
/>
```

**API Format:**
```json
{
  "name": "status",
  "type": "select",
  "filter_type": "equal",
  "value": "ACTIVE"
}
```

#### Multi-Value Operators (`in`, `not_in`)

**UI Component:** MultiSelect (Dropdown with chips)

**Value Type:** Array of values (string[] | number[] | boolean[])

**Implementation:** `src/components/table/AdvancedFilterModal.vue` (lines 291-317)

**Example:**
```vue
<MultiSelect
  v-if="columnType === 'select' && (operator === 'in' || operator === 'not_in')"
  v-model="condition.value"
  :options="columnOptions"
  display="chip"
  :max-selected-labels="2"
/>
```

**API Format:**
```json
{
  "name": "status",
  "type": "select",
  "filter_type": "in",
  "value": ["ACTIVE", "SUBMITTED", "PENDING"]
}
```

**CRITICAL:** MultiSelect values are sent as **plain JSON arrays**, NOT stringified:
- ✅ **CORRECT:** `["ACTIVE", "SUBMITTED"]` (plain array)
- ❌ **WRONG:** `"[ACTIVE,SUBMITTED]"` (stringified with brackets)

**Repository Implementation:** `src/repository/tables/AdvancedFilterRepository.ts` (lines 149-162)

```typescript
// For 'in' or 'not_in' operators - return array directly
if (columnType === 'select' && (operator === 'in' || operator === 'not_in')) {
  if (Array.isArray(value)) {
    return value.map(v => String(v))  // Plain array
  }
}

// For other operators - return single value
if (columnType === 'select') {
  return String(value)  // Single string
}
```

### Value Serialization Reference Table

| Column Type | Operator | UI Component | Value Type | API Example |
|-------------|----------|--------------|------------|-------------|
| **select** | equal, not_equal | Single Select | `string` | `"ACTIVE"` |
| **select** | in, not_in | MultiSelect | `string[]` | `["ACTIVE", "PENDING"]` |
| **currency** | between, not_between | 2 InputNumber | `[string, string]` | `["1000", "5000"]` |
| **currency** | Other operators | 1 InputNumber | `string` | `"1000"` |
| **number** | between, not_between | 2 InputNumber | `[string, string]` | `["10", "100"]` |
| **number** | Other operators | 1 InputNumber | `string` | `"50"` |
| **percentage** | between, not_between | 2 InputNumber | `[string, string]` | `["10", "90"]` |
| **percentage** | Other operators | 1 InputNumber | `string` | `"50"` |
| **date** | date_between, date_not_between | DateRangePicker | `[string, string]` | `["2025-01-01", "2025-12-31"]` |
| **date** | Other operators | Calendar | `string` | `"2025-01-15"` |
| **boolean** | is_true, is_false | No input (fixed) | `string` | `"1"` |
| **string** | equal, not_equal, contain, not_contain | InputText | `string` | `"search term"` |

### Loading Saved Filters

When loading saved filters from the API, values must be transformed back to their client-side format:

**Composable:** `src/composables/tables/useAdvancedFilter.ts` (lines 51-94)

```typescript
function transformApiValueToClientValue(operator, value, columnType) {
  // Select type with 'in'/'not_in' - expect array
  if (columnType === 'select' && (operator === 'in' || operator === 'not_in')) {
    if (Array.isArray(value)) {
      return value  // Already an array
    }
    return [String(value)]  // Wrap single value
  }

  // Select type with other operators - expect single value
  if (columnType === 'select') {
    if (Array.isArray(value)) {
      return value[0] || ''  // Take first value
    }
    return String(value)
  }

  // Between operators for number/currency/percentage - expect array
  if ((operator === 'between' || operator === 'not_between') &&
      (columnType === 'number' || columnType === 'currency' || columnType === 'percentage')) {
    if (Array.isArray(value)) {
      return value.map(v => Number(v))  // Convert to numbers
    }
  }

  return value
}
```

### Critical Rules

1. **MultiSelect Arrays**
   - ✅ ALWAYS send as plain JSON arrays: `["val1", "val2"]`
   - ❌ NEVER stringify with brackets: `"[val1,val2]"`
   - ❌ NEVER stringify with `JSON.stringify()`

2. **Operator-Based UI**
   - Select type: `equal`/`not_equal` → Single Select
   - Select type: `in`/`not_in` → MultiSelect
   - Currency/Number: `between`/`not_between` → 2 inputs (array)
   - Currency/Number: Other operators → 1 input (single value)

3. **Value Type Consistency**
   - Single value operators → always return string
   - Array operators → always return array of strings
   - Transform values when loading saved filters
   - Validate value types match operator expectations

---

### STEP 5: Types & Interfaces

```typescript
import type { TableResponse } from '@/types/Common/TableResponse'
import type { ColumnItem } from '@/types/Tables/ColumnsListType'
import type { ColumnOptionsModelValue } from '~/components/table/ColumnOptions.vue'

interface YourEntity {
  id: number
  name: string
  // ... other fields
}

type YourEntityTableResponse = TableResponse<YourEntity>

// TableResponse structure (for reference):
interface TableResponse<T> {
  data: T[]
  pagination?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

// ColumnItem structure (for reference):
interface ColumnItem {
  always_visible: boolean
  name: string
  label: string
  visible: boolean
  width: number
  filterable: boolean
  filter_type: FilterOperator[] | null
  sortable: boolean
  type: 'string' | 'number' | 'boolean' | 'date' | 'currency'
  select_type: string | null
  db_name: string | null
  column_filter_name: string | null  // NEW: Backend-provided query parameter name for Column Options filtering
  order: number
}

// ColumnOptionsModelValue (for reference):
interface ColumnOptionsModelValue {
  search: string
  sort: 'asc' | 'desc' | null
}
```

---

### STEP 6: Permissions

#### Page-Level (Route Guard)

```typescript
// pages/your-entity/index.vue
definePageMeta({
  middleware: 'permission',
  permissions: ['your-entity.list'],
})
```

#### Component-Level (UI Visibility)

```vue
<script setup lang="ts">
const { hasPermission } = usePermission()
const canCreate = computed(() => hasPermission('your-entity.create'))
const canUpdate = computed(() => hasPermission('your-entity.update'))
const canDelete = computed(() => hasPermission('your-entity.delete'))
</script>

<template>
  <!-- Add button -->
  <YourEntityModal v-if="canCreate" @submit="handleSubmit" />

  <!-- Actions column -->
  <Column v-if="canUpdate || canDelete" header="Actions">
    <template #body="{ data }">
      <Button v-if="canUpdate" icon="pi pi-pencil" @click="editEntity(data.id)" />
      <Button v-if="canDelete" icon="pi pi-trash" @click="confirmDeleteEntity(data.id, data.name)" />
    </template>
  </Column>
</template>
```

**Standard Permissions Pattern:**
- `your-entity.list` - View list (page-level)
- `your-entity.create` - Create new (add button)
- `your-entity.update` - Edit existing (edit button)
- `your-entity.delete` - Delete (delete button)

---

### STEP 7: API Query String Format

Your table will generate API queries like this:

```
GET /api/your-entity?page=1&per_page=20&filter[search]=john&filter[first_name]=smith&sort=-last_name&advanced_filter=5
```

**Query Parameters:**
- `page` - Current page number
- `per_page` - Items per page
- `filter[search]` - Global search query
- `filter[{column}]` - Column-specific search
- `sort` - Sort field (prefix `-` for descending)
- `advanced_filter` - Active advanced filter ID

---

## 🔍 Retrofitting Existing Tables

When updating an existing table to this standard, follow this order:

### Phase 1: Add Missing UI Elements
1. ✅ Add search bar with clear button
2. ✅ Add AdvancedFilterModal component
3. ✅ Add CustomizeColumnsModal component
4. ✅ Add Clear Filters button
5. ✅ Add ColumnOptions to column headers

### Phase 2: Integrate Stores
1. ✅ Import and setup `useColumnsListStore`
2. ✅ Import and setup `useAdvancedFilterStore`
3. ✅ Replace manual column definition with store columns
4. ✅ Add `storeToRefs()` for all store values

### Phase 3: Add Composables
1. ✅ Import `useColumnsList`
2. ✅ Import `useAdvancedFilter`
3. ✅ Import `useColumnOptionsStorage` with LISTING_KEY
4. ✅ Replace direct API calls with composable methods

### Phase 4: Implement Functions
1. ✅ Add `initializeFilters()` function
2. ✅ Add `handleClearSearch()` function
3. ✅ Add `debouncedSearch` with watch
4. ✅ Add `handleAdvancedFilterApply()` function
5. ✅ Add `clearFiltersAndSearch()` function
6. ✅ Add `handleColumnOptionsApply()` function
7. ✅ Add `handleColumnOptionsClear()` function
8. ✅ Add `initializeColumnOptions()` function
9. ✅ Add `applySavedFiltersToState()` function

### Phase 5: Update onMounted
1. ✅ Replace existing initialization with standard flow
2. ✅ Ensure order: filters → columns → localStorage → fetch

### Phase 6: Verify
1. ✅ Test global search
2. ✅ Test column-level search
3. ✅ Test column-level sort
4. ✅ Test advanced filters
5. ✅ Test clear filters button
6. ✅ Test column customization
7. ✅ Verify localStorage persistence

---

## ❌ Common Mistakes

### ⚠️ CRITICAL BUG: Sorting Lost When Filtering

**DO NOT** unconditionally overwrite `currentSort.value` in `handleColumnOptionsApply`:

```typescript
// ❌ BUG: This loses sort when user applies filter on different column
currentSort.value = { field: columnKey, order: sort }
```

**✅ FIXED:** See detailed fix in [`.instructions/tables/COLUMN-SORTING.md`](./.instructions/tables/COLUMN-SORTING.md#mistake-5-losing-sort-when-applying-filters-critical-bug)

**Impact:** Users lose their sorting when applying filters on other columns.
**Fixed in:** ContactList.vue, contractors/index.vue, TradeCreditHistory.vue

---

### DON'T
1. ❌ Skip `skipInitialFetch: true` in useTable (will fetch before columns load)
2. ❌ Use `merge: false` when applying column options (will clear advanced filter)
3. ❌ Forget to clear localStorage when activating advanced filter
4. ❌ Allow multiple columns to be sorted (only one at a time)
5. ❌ **Unconditionally overwrite currentSort when filtering** ⚠️ CRITICAL - See above
6. ❌ Forget debounce on search input (will spam API)
7. ❌ Destructure stores without `storeToRefs()` (loses reactivity)
8. ❌ Hardcode column definitions (must come from API)
9. ❌ Show CRUD buttons without permission checks
10. ❌ Forget to preserve advanced filter when adding other filters
11. ❌ Use `merge: true` when activating advanced filter (should clear all)

### DO
1. ✅ Always use `LISTING_KEY` constant
2. ✅ Always use `storeToRefs()` for store values
3. ✅ Always debounce search (500ms)
4. ✅ Always clear one sort when applying another
5. ✅ Always save column options to localStorage
6. ✅ Always show toast feedback for filter changes
7. ✅ Always preserve advanced filter with `merge: true`
8. ✅ Always clear all filters when activating advanced filter
9. ✅ Always use `v-if` for permission-based buttons
10. ✅ Always show loading and empty states

---

## 📚 Reference Files

Use these as copy/paste references when implementing:

### Primary Reference
- **ContactList**: `src/components/contractor/table/ContactList.vue`
  - Complete implementation with all features
  - 637 lines, fully functional

### Supporting Files
- **useTable**: `src/composables/useTable.ts`
- **useColumnsList**: `src/composables/tables/useColumnsList.ts`
- **useAdvancedFilter**: `src/composables/tables/useAdvancedFilter.ts`
- **useColumnOptionsStorage**: `src/composables/tables/useColumnOptionsStorage.ts`
- **useTablePaginationStorage**: `src/composables/tables/useTablePaginationStorage.ts`
- **AdvancedFilterModal**: `src/components/table/AdvancedFilterModal.vue`
- **CustomizeColumnsModal**: `src/components/table/CustomizeColumnsModal.vue`
- **ColumnOptions**: `src/components/table/ColumnOptions.vue`

### Page Examples
- **List**: `src/pages/contractors/edit/[id]/contacts.vue`
- **Record**: `src/pages/contractors/record/[id]/contacts.vue`

---

## 🎯 Quick Start for New Tables

Copy this minimal starter template:

```vue
<template>
  <div class="bg-white px-[15px] py-[15px] pb-[25px] rounded-[12px] mt-4 page-content list">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="font-semibold text-base">{{ t('pages.YOUR_ENTITY.title') }}</div>
      <div class="flex items-center gap-2">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" :placeholder="t('YOUR_ENTITY.searchPlaceholder')" class="w-[300px]" />
          <InputIcon v-if="searchQuery" class="pi pi-times cursor-pointer" @click="handleClearSearch" />
        </IconField>
        <AdvancedFilterModal :listing-key="LISTING_KEY" @apply="handleAdvancedFilterApply" />
        <CustomizeColumnsModal v-model:visible="showColumnsListModal" :loading="loadingColumnsList" :columns="columns" :default-columns="defaultColumns" @get-columns-list="handleColumnsList" @apply="handleColumnsApply" @reset-order="handleColumnsResetOrders" />
        <Button v-tooltip.top="t('pages.contractor.fleetRelations.relations.actions.clearFilters')" icon="pi pi-filter-slash" severity="secondary" text @click="clearFiltersAndSearch" />
        <YourEntityModal v-if="canCreate" @submit="handleSubmit" />
      </div>
    </div>

    <!-- DataTable -->
    <DataTable class="your-entity-list-table" v-bind="basicTableProps" :value="items" @page="onPage">
      <Column v-for="col in visibleColumns" :key="col.name" :field="col.name">
        <template #header>
          <div class="flex items-center justify-between gap-2 w-full">
            <span>{{ col.label }}</span>
            <ColumnOptions v-if="canHaveOptions(col)" :column-key="col.name" :model-value="columnOptionsState[col.name]" @apply="handleColumnOptionsApply" @clear="handleColumnOptionsClear" />
          </div>
        </template>
        <template #body="{ data }">{{ getNestedValue(data, col.name) }}</template>
      </Column>
      <Column v-if="canUpdate || canDelete" field="actions">
        <template #body="{ data }">
          <Button v-if="canUpdate" icon="pi pi-pencil" text rounded size="small" @click="editEntity(data.id)" />
          <Button v-if="canDelete" icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDeleteEntity(data.id, data.name)" />
        </template>
      </Column>
      <template #empty><TableEmptyState /></template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDebounceFn } from '@vueuse/core'

const LISTING_KEY = 'YOUR_ENTITY_INDEX'

// Stores
const columnsListStore = useColumnsListStore()
const { loadingColumnsList, showColumnsListModal, listing, columns, defaultColumns, columnsListData } = storeToRefs(columnsListStore)
const { setColumnsListing, setColumns } = columnsListStore

const advancedFilterStore = useAdvancedFilterStore()
const { activeFilterId } = storeToRefs(advancedFilterStore)
const { clearSelectedFilter, setListing } = advancedFilterStore

// Composables
const { t } = useI18n()
const toaster = useToaster()
const { hasPermission } = usePermission()
const confirm = useConfirm()
const yourEntity = useYourEntity()
const columnsList = useColumnsList()
const advancedFilter = useAdvancedFilter()
const { loadColumnOptions, saveColumnOptions, clearColumnOptions } = useColumnOptionsStorage(LISTING_KEY)

// useTable
const { items, basicTableProps, onPage, fetchData, setQueryParams, clearFilters, searchByColumn } = useTable<YourEntity, YourEntityTableResponse>({
  fetchTable: (query?: string) => yourEntity.list(query),
  skipInitialFetch: true,
})

// State
const searchQuery = ref('')
const columnOptionsState = ref<Record<string, ColumnOptionsModelValue>>({})
const currentSort = ref<{ field: string | null; order: 'asc' | 'desc' | null }>({ field: null, order: null })

// Computed
const visibleColumns = computed(() => columns.value.filter(c => c.visible).sort((a, b) => a.order - b.order))
const canCreate = computed(() => hasPermission('your-entity.create'))
const canUpdate = computed(() => hasPermission('your-entity.update'))
const canDelete = computed(() => hasPermission('your-entity.delete'))
const canHaveOptions = (col: ColumnItem) => col.filterable || col.sortable

// TODO: Copy functions from TABLES.md STEP 3

onMounted(async () => {
  // TODO: Copy initialization from TABLES.md STEP 3.1
})
</script>
```

Then fill in the `TODO` sections with functions from **STEP 3**.

---

## 📖 Integration with CLAUDE.md

Add this section to your main `CLAUDE.md` file:

```markdown
## 📊 Table Implementation

ALL data tables in this project MUST follow the standardization defined in **TABLES.md**.

**Quick Reference:**
- 📋 Use **ContactList** as the reference implementation
- 🔍 All tables require: Search, Advanced Filters, Column Options, Clear Filters
- 💾 Column preferences MUST persist in localStorage
- 🔐 CRUD buttons MUST respect permissions
- 🎯 Use `LISTING_KEY` constant for each table

**Before creating/modifying a table, read: `/TABLES.md`**
```

---

## 🔄 Column Resizing

All tables using `v-bind="basicTableProps"` automatically get Excel-like drag-to-resize columns via PrimeVue's `resizableColumns` prop.

### How it works

- `basicTableProps` includes `resizableColumns: true` and `columnResizeMode: 'expand'`
- Users can drag column borders to resize
- In `expand` mode, the table grows wider (horizontal scroll appears)
- Column widths are persisted to the backend via the columns API

### Wiring up persistence (dynamic tables only)

For tables that use `useColumnsListStore` (dynamic columns from API), add the `useColumnResize` composable to persist width changes:

```typescript
import { useColumnResize } from '~/composables/tables/useColumnResize'

// After visibleColumns computed:
const { onColumnResizeEnd } = useColumnResize({
  columns: visibleColumns,
  onSave: async (updatedColumns) => {
    await setColumns(updatedColumns)
    await columnsList.saveColumnsList(columnsListData.value, { silent: true })
  },
})
```

Then bind the event on DataTable:

```vue
<DataTable @column-resize-end="onColumnResizeEnd" v-bind="basicTableProps" ...>
```

### Column width styles

Use `width` only (no `minWidth` — it prevents users from making columns narrower):

```vue
<Column :style="col.width ? { width: `${col.width}px` } : undefined">
```

### ColumnGroup incompatibility

> **NEVER use `ColumnGroup type="header"`** — PrimeVue does not pass `resizableColumns` to header cells inside ColumnGroup, so resize handles will not appear. Use the standard Column pattern with both `#header` and `#body` slots instead.

Footer ColumnGroups are fine and unaffected.

---

**End of TABLES.md**