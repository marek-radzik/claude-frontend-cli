# Test-Driven Development (TDD)

**Purpose**: Define mandatory TDD practices and testing standards.

**Status**: Non-negotiable for ALL features

---

## 🎯 MANDATORY: Red-Green-Refactor Cycle

```
1. RED    → Write FAILING test first
2. GREEN  → Minimal code to PASS test
3. REFACTOR → Improve while tests GREEN
4. REPEAT → Next feature
```

**NEVER write implementation before test!**

---

## Non-Negotiable Rules

- ❌ **NEVER** write implementation before test
- ✅ **ALWAYS** achieve ≥80% coverage
- ✅ **ALL** tests must pass before commit
- ✅ Test **behavior**, not implementation
- ✅ Use descriptive test names
- ✅ One assertion per test (when possible)
- ✅ Test edge cases and error states

---

## Test Organization

```
src/tests/
├── unit/              # Pure functions, utilities
├── components/        # Vue component tests
├── composables/       # Business logic tests
├── stores/            # State management tests
├── fixtures/          # Reusable test data
└── setup.ts           # Global config
```

---

## Essential Test Patterns

### Component Test Template

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import ContractorForm from '@/components/contractor/ContractorForm.vue'

describe('ContractorForm', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(ContractorForm, {
      props: {
        contractorId: 123,
      },
      global: {
        plugins: [
          createTestingPinia({
            stubActions: false,
          }),
        ],
        stubs: {
          Button: true,
          InputText: true,
          DataTable: true,
        },
        mocks: {
          $t: (key) => key,
        },
      },
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('should render form fields', () => {
    expect(wrapper.find('[data-testid="name-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(true)
  })

  it('should emit submit with valid data', async () => {
    await wrapper.find('[data-testid="name-input"]').setValue('Test Name')
    await wrapper.find('[data-testid="email-input"]').setValue('test@example.com')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')[0][0]).toMatchObject({
      name: 'Test Name',
      email: 'test@example.com',
    })
  })

  it('should show validation error for invalid email', async () => {
    await wrapper.find('[data-testid="email-input"]').setValue('invalid')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.p-error').text()).toContain('Invalid email')
  })

  it('should disable submit button when loading', async () => {
    await wrapper.setProps({ loading: true })

    const submitButton = wrapper.find('[data-testid="submit-button"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
  })
})
```

---

### Composable Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import useContractor from '@/composables/contractor/useContractor'

describe('useContractor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should fetch and store contractor data', async () => {
    const mockData = { id: 1, name: 'Test Contractor' }
    const mockRepo = {
      getById: vi.fn().mockResolvedValue({ data: mockData }),
    }

    // Mock the repository
    vi.mock('@/repository/contractor/ContractorRepository', () => ({
      ContractorRepository: vi.fn(() => mockRepo),
    }))

    const { fetchContractor, contractor } = useContractor()
    await fetchContractor(1)

    expect(mockRepo.getById).toHaveBeenCalledWith(1)
    expect(contractor.value).toEqual(mockData)
  })

  it('should handle API errors gracefully', async () => {
    const mockRepo = {
      getById: vi.fn().mockRejectedValue(new Error('404 Not Found')),
    }

    const { fetchContractor, error } = useContractor()
    await fetchContractor(1)

    expect(error.value).toBeTruthy()
    expect(error.value.message).toContain('404')
  })

  it('should set loading state correctly', async () => {
    const mockRepo = {
      list: vi.fn().mockResolvedValue({ data: [] }),
    }

    const { fetchContractors, loading } = useContractor()

    expect(loading.value).toBe(false)

    const promise = fetchContractors()
    expect(loading.value).toBe(true)

    await promise
    expect(loading.value).toBe(false)
  })
})
```

---

### Store Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useContractorStore } from '@/stores/contractor/useContractorStore'

describe('useContractorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with empty contractors', () => {
    const store = useContractorStore()
    expect(store.contractors).toEqual([])
  })

  it('should compute active contractors correctly', () => {
    const store = useContractorStore()
    store.contractors = [
      { id: 1, name: 'Active', status: 'active' },
      { id: 2, name: 'Inactive', status: 'inactive' },
      { id: 3, name: 'Active 2', status: 'active' },
    ]

    expect(store.activeContractors).toHaveLength(2)
    expect(store.activeContractors[0].name).toBe('Active')
  })

  it('should reset filters to default values', () => {
    const store = useContractorStore()

    store.filters.search = 'test'
    store.filters.status = 'active'
    store.resetFilters()

    expect(store.filters.search).toBe('')
    expect(store.filters.status).toBeNull()
  })

  it('should open and close modal', () => {
    const store = useContractorStore()

    expect(store.modalOpen).toBe(false)

    store.openModal()
    expect(store.modalOpen).toBe(true)

    store.closeModal()
    expect(store.modalOpen).toBe(false)
    expect(store.editingContractorId).toBeNull()
  })
})
```

---

### Permission Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePermission } from '@/composables/usePermission'
import { useAuthStore } from '@/stores/useAuthStore'

describe('usePermission', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should return true when user has permission', () => {
    const authStore = useAuthStore()
    authStore.userPermissions = ['contractor.list', 'contractor.create']

    const { hasPermission } = usePermission()

    expect(hasPermission('contractor.list')).toBe(true)
    expect(hasPermission('contractor.create')).toBe(true)
  })

  it('should return false when permission missing', () => {
    const authStore = useAuthStore()
    authStore.userPermissions = ['contractor.list']

    const { hasPermission } = usePermission()

    expect(hasPermission('contractor.delete')).toBe(false)
  })

  it('should check multiple permissions with hasAllPermissions', () => {
    const authStore = useAuthStore()
    authStore.userPermissions = ['contractor.list', 'contractor.create', 'contractor.update']

    const { hasAllPermissions } = usePermission()

    expect(hasAllPermissions(['contractor.list', 'contractor.create'])).toBe(true)
    expect(hasAllPermissions(['contractor.list', 'contractor.delete'])).toBe(false)
  })

  it('should check any permission with hasAnyPermission', () => {
    const authStore = useAuthStore()
    authStore.userPermissions = ['contractor.list']

    const { hasAnyPermission } = usePermission()

    expect(hasAnyPermission(['contractor.list', 'contractor.create'])).toBe(true)
    expect(hasAnyPermission(['contractor.create', 'contractor.delete'])).toBe(false)
  })
})
```

---

## Test Coverage Requirements

### Must Test (100%)

- ✅ Happy path (normal user flow)
- ✅ Error states (API failures, validation)
- ✅ Edge cases (null, undefined, empty arrays)
- ✅ Loading states
- ✅ Permission-based rendering
- ✅ User interactions (clicks, inputs, form submissions)
- ✅ Computed properties
- ✅ Lifecycle hooks (onMounted, onUnmounted)

### Component Coverage Checklist

```typescript
describe('ContractorList', () => {
  // 1. Rendering Tests
  it('should render table with columns')
  it('should render search bar')
  it('should render action buttons if permitted')
  it('should not render action buttons without permissions')

  // 2. Loading State Tests
  it('should show loading spinner when loading')
  it('should hide loading spinner when done')

  // 3. Empty State Tests
  it('should show empty state when no data')
  it('should hide empty state when data exists')

  // 4. User Interaction Tests
  it('should call fetchContractors on mount')
  it('should filter data when search input changes')
  it('should open modal when add button clicked')
  it('should open edit modal when edit button clicked')
  it('should show confirmation dialog when delete clicked')

  // 5. Permission Tests
  it('should show create button with contractor.create permission')
  it('should hide create button without contractor.create permission')
  it('should show edit buttons with contractor.update permission')
  it('should show delete buttons with contractor.delete permission')

  // 6. Data Display Tests
  it('should display contractor names correctly')
  it('should format dates correctly')
  it('should display status tags with correct severity')

  // 7. Error Handling Tests
  it('should show error toast when fetch fails')
  it('should show error toast when delete fails')
})
```

---

## Mocking Strategies

### Mock Repositories

```typescript
const mockContractorRepository = {
  list: vi.fn().mockResolvedValue({
    data: [
      { id: 1, name: 'Contractor 1' },
      { id: 2, name: 'Contractor 2' },
    ],
  }),
  getById: vi.fn().mockResolvedValue({
    data: { id: 1, name: 'Contractor 1' },
  }),
  create: vi.fn().mockResolvedValue({
    data: { id: 3, name: 'New Contractor' },
  }),
  update: vi.fn().mockResolvedValue({
    data: { id: 1, name: 'Updated Contractor' },
  }),
  delete: vi.fn().mockResolvedValue({}),
}
```

### Mock Composables

```typescript
vi.mock('@/composables/contractor/useContractor', () => ({
  default: () => ({
    contractors: ref([]),
    loading: ref(false),
    fetchContractors: vi.fn(),
    createContractor: vi.fn(),
  }),
}))
```

### Mock Stores

```typescript
import { createTestingPinia } from '@pinia/testing'

const wrapper = mount(Component, {
  global: {
    plugins: [
      createTestingPinia({
        stubActions: false,
        initialState: {
          contractor: {
            contractors: [],
            loading: false,
          },
        },
      }),
    ],
  },
})
```

---

## Running Tests

### Commands

```bash
# Watch mode (TDD workflow)
npm test

# Single run
npm run test:unit

# With coverage
npm test -- --coverage

# Specific file
npm test -- src/tests/components/ContractorForm.test.ts

# UI mode
npm test -- --ui

# Debug mode
npm test -- --inspect-brk
```

### Coverage Requirements

- **Overall**: ≥80%
- **Statements**: ≥80%
- **Branches**: ≥75%
- **Functions**: ≥80%
- **Lines**: ≥80%

---

## TDD Workflow Example

### Scenario: Add "Delete Contractor" Feature

#### Step 1: Write Failing Test (RED)

```typescript
it('should delete contractor when confirmed', async () => {
  const { deleteContractor } = useContractor()
  await deleteContractor(1)

  expect(contractors.value).not.toContainEqual(expect.objectContaining({ id: 1 }))
})
```

**Run test**: ❌ FAILS (function doesn't exist)

#### Step 2: Write Minimal Implementation (GREEN)

```typescript
const deleteContractor = async (id: number) => {
  await $contractorRepository.delete(id)
  contractors.value = contractors.value.filter(c => c.id !== id)
}
```

**Run test**: ✅ PASSES

#### Step 3: Refactor (REFACTOR)

```typescript
const deleteContractor = async (id: number) => {
  try {
    loading.value = true
    await $contractorRepository.delete(id)
    contractors.value = contractors.value.filter(c => c.id !== id)
    toast.success(t('contractor.deleteSuccess'))
  } catch (error) {
    handleError(error)
    throw error
  } finally {
    loading.value = false
  }
}
```

**Run test**: ✅ STILL PASSES

#### Step 4: Add Error Test (RED)

```typescript
it('should handle delete errors gracefully', async () => {
  mockRepo.delete.mockRejectedValue(new Error('Server error'))

  const { deleteContractor } = useContractor()
  await expect(deleteContractor(1)).rejects.toThrow()

  expect(toast.error).toHaveBeenCalled()
  expect(contractors.value).toHaveLength(2) // Not deleted
})
```

**Run test**: ✅ PASSES (error handling already added)

---

## Best Practices

### DO

1. ✅ Write tests before implementation
2. ✅ Use descriptive test names (`should do X when Y`)
3. ✅ Test one thing per test
4. ✅ Use `data-testid` for stable selectors
5. ✅ Mock external dependencies
6. ✅ Test edge cases (empty, null, undefined)
7. ✅ Test error states
8. ✅ Use `beforeEach` for setup
9. ✅ Clean up after tests (`afterEach`)
10. ✅ Run tests before committing

### DON'T

1. ❌ Write implementation first
2. ❌ Test implementation details
3. ❌ Skip error cases
4. ❌ Ignore coverage thresholds
5. ❌ Use brittle selectors (CSS classes)
6. ❌ Test multiple things in one test
7. ❌ Skip cleanup
8. ❌ Commit failing tests
9. ❌ Mock everything (test real behavior)
10. ❌ Ignore flaky tests

---

## Debugging Tests

### View Test Output

```bash
npm test -- --reporter=verbose
```

### Debug in VS Code

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "--inspect-brk"],
  "console": "integratedTerminal"
}
```

### Debug Specific Test

```typescript
it.only('should debug this test', async () => {
  // This test will run in isolation
  debugger
})
```

---