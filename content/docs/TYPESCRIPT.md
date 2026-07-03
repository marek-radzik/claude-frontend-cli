# TypeScript Standards

**Purpose**: Define TypeScript best practices and type safety standards.

**Version**: TypeScript 5.8.3

---

## 🎯 Strict Mode Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**All strict mode options are MANDATORY.**

---

## Type Organization

### File Structure

```
src/types/
├── Contractor/
│   ├── Contractor.ts           # Main entity
│   ├── ContractorForm.ts       # Form types
│   ├── ContractorResponse.ts   # API responses
│   └── ContractorFilters.ts    # Filter types
├── Vehicle/
│   └── Vehicle.ts
├── Common/
│   ├── ApiResponse.ts
│   ├── TableResponse.ts
│   └── QueryParams.ts
└── Form/
    └── FormTypes.ts
```

---

## Entity Types

```typescript
// types/Contractor/Contractor.ts
export interface Contractor {
  id: number
  name: string
  email: string | null
  phone: string | null
  status: ContractorStatus
  group: ContractorGroup | null
  createdAt: string
  updatedAt: string
}

export type ContractorStatus = 'active' | 'inactive' | 'pending'

export interface ContractorGroup {
  id: number
  name: string
  code: string
}

export interface ContractorListItem {
  id: number
  name: string
  email: string | null
  status: ContractorStatus
  groupName: string | null
}
```

---

## Form Types

```typescript
// types/Contractor/ContractorForm.ts
export interface ContractorForm {
  name: string
  email?: string
  phone?: string
  status: ContractorStatus
  groupId: number
  website?: string
  foundedAt: Date
}

export interface ContractorCreateRequest {
  name: string
  email?: string
  phone?: string
  status: string
  group_id: number
}

export interface ContractorUpdateRequest extends Partial<ContractorCreateRequest> {
  // All fields optional for updates
}
```

---

## API Response Types

```typescript
// types/Common/ApiResponse.ts
export interface ApiResponse<T> {
  data: T
  message?: string
  status: number
}

export interface TableResponse<T> {
  data: T[]
  pagination?: Pagination
}

export interface Pagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

// types/Contractor/ContractorResponse.ts
export type ContractorResponse = ApiResponse<Contractor>
export type ContractorListResponse = TableResponse<ContractorListItem>
```

---

## Component Props & Emits

```typescript
// Props
interface Props {
  id: number
  readonly?: boolean
  initialData?: ContractorForm
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

// Emits
interface Emits {
  submit: [data: ContractorForm]
  cancel: []
  update: [id: number, data: ContractorForm]
}

const emit = defineEmits<Emits>()
```

---

## Utility Types

### Common Patterns

```typescript
// Make all properties optional
type PartialContractor = Partial<Contractor>

// Make all properties required
type RequiredContractor = Required<Contractor>

// Pick specific properties
type ContractorBasic = Pick<Contractor, 'id' | 'name' | 'email'>

// Omit specific properties
type ContractorWithoutTimestamps = Omit<Contractor, 'createdAt' | 'updatedAt'>

// Extract type from array
type ContractorItem = ContractorListItem[]
type SingleContractor = ContractorItem[number]
```

### Custom Utility Types

```typescript
// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

type ContractorOptionalEmail = PartialBy<Contractor, 'email' | 'phone'>

// Make specific properties required
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

type ContractorRequiredEmail = RequiredBy<Contractor, 'email'>
```

---

## Generic Types

### Repository Generic

```typescript
export class Repository<T = any> {
  async get<R = T>(url: string): Promise<ApiResponse<R>> {
    // Implementation
  }

  async post<R = T, D = any>(url: string, data: D): Promise<ApiResponse<R>> {
    // Implementation
  }
}
```

### Composable Generic

```typescript
export function useEntity<T, R extends TableResponse<T>>(
  fetchFn: (query?: string) => Promise<R>
) {
  const items = ref<T[]>([])
  const loading = ref(false)

  const fetch = async () => {
    loading.value = true
    const { data } = await fetchFn()
    items.value = data
    loading.value = false
  }

  return { items, loading, fetch }
}
```

---

## Type Guards

```typescript
// Check if value is defined
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

// Check object type
export function isContractor(obj: any): obj is Contractor {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'number' &&
    typeof obj.name === 'string'
  )
}

// Usage
if (isDefined(contractor)) {
  console.log(contractor.name) // TypeScript knows contractor is not null
}
```

---

## Enum vs Union Types

### Union Types (Preferred)

```typescript
// ✅ Use union types
export type ContractorStatus = 'active' | 'inactive' | 'pending'

const status: ContractorStatus = 'active' // Type-safe
```

### Const Assertions

```typescript
// ✅ Use const assertions for objects
export const CONTRACTOR_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const

export type ContractorStatus = typeof CONTRACTOR_STATUS[keyof typeof CONTRACTOR_STATUS]
```

### Avoid Enums

```typescript
// ❌ Avoid TypeScript enums
enum ContractorStatus {
  Active = 'active',
  Inactive = 'inactive',
}
```

---

## Type vs Interface

### When to Use Interface

```typescript
// ✅ Use interface for object shapes
export interface Contractor {
  id: number
  name: string
}

// ✅ Can be extended
export interface DetailedContractor extends Contractor {
  email: string
  phone: string
}
```

### When to Use Type

```typescript
// ✅ Use type for unions
export type Status = 'active' | 'inactive'

// ✅ Use type for complex types
export type ContractorOrGroup = Contractor | ContractorGroup

// ✅ Use type for utility types
export type PartialContractor = Partial<Contractor>
```

---

## ESLint Rules & Common Violations

### Critical Rules (MUST NOT VIOLATE)

#### 1. `@typescript-eslint/no-explicit-any` - NEVER Use `any`

```typescript
// ❌ BAD
const data: any = await api.get()
function process(value: any) {}
const params: any = { foo: 'bar' }

// ✅ GOOD - Use proper types
const data: Contractor = await api.get<Contractor>()
function process(value: Contractor) {}
const params: Record<string, unknown> = { foo: 'bar' }

// ✅ GOOD - Use unknown when type is truly unknown
const error: unknown = e
if (error instanceof Error) {
  console.error(error.message)
}

// ✅ GOOD - Use generics
function process<T>(value: T): T {
  return value
}

// ✅ GOOD - For i18n params
const mockT = (key: string, params?: Record<string, unknown>) => {
  return key
}

// ✅ GOOD - For Promise resolve functions
let resolvePromise: (value: unknown) => void
const promise = new Promise((resolve) => {
  resolvePromise = resolve
})
```

#### 2. `@typescript-eslint/no-unused-vars` - Remove Unused Code

```typescript
// ❌ BAD - Unused imports
import { useDebounceFn } from '@vueuse/core'
import { IconField, InputIcon, InputText } from 'primevue'

// ✅ GOOD - Only import what you use
import { computed, ref } from 'vue'

// ❌ BAD - Unused variables
const { handleError } = useErrorHandler()
const data = fetchData() // never used

// ✅ GOOD - Remove unused destructured variables
const { showToast } = useToaster()

// ❌ BAD - Unused function parameters
mockConfirm.require.mockImplementation((options: any) => {
  // options is never used
})

// ✅ GOOD - Prefix with underscore if intentionally unused
mockConfirm.require.mockImplementation((_options: any) => {
  // Clearly indicates parameter is intentionally unused
})

// ❌ BAD - Unused functions
const handleClearSearch = () => {
  // Function defined but never called
}

// ✅ GOOD - Remove unused functions or use them
// Just delete the unused function
```

#### 3. `no-useless-catch` - Avoid Unnecessary Catch Blocks

```typescript
// ❌ BAD - Catch block that only rethrows
const addContact = async (data: Contact) => {
  try {
    await api.createContact(data)
  }
  catch (error) {
    // DO NOT call handleError(error) here - it creates individual toast messages
    // for each validation error. Let the caller handle the error
    throw error // Useless catch - just remove it!
  }
}

// ✅ GOOD - Remove the catch block entirely
// NOTE: Document why we don't handle errors here
const addContact = async (data: Contact) => {
  // NOTE: This function does not call handleError() to avoid individual toast messages
  // for each validation error. The caller (component) should handle the error
  // with a single collective toast message
  try {
    await api.createContact(data)
  }
  finally {
    loading.value = false
  }
}

// ✅ GOOD - Catch block that does something useful
const addContact = async (data: Contact) => {
  try {
    await api.createContact(data)
  }
  catch (error) {
    // This is useful - transforms or handles the error
    handleError(error)
    logger.error('Failed to create contact', error)
  }
}
```

---

## Type Safety Examples

### API Error Handling

```typescript
// ❌ BAD - Using any for error types
function setFieldErrors(error: unknown) {
  const errorsObj = (error as any)?.data?.errors
}

// ✅ GOOD - Define proper error interface
interface ApiValidationError {
  data?: {
    errors?: Record<string, string | string[]>
  }
}

function setFieldErrors(error: unknown) {
  const errorsObj = (error as ApiValidationError)?.data?.errors
  if (errorsObj && typeof errorsObj === 'object') {
    // Process errors safely
  }
}
```

### Test Mocks

```typescript
// ❌ BAD - Using any in test mocks
const mockT = vi.fn((key: string, params?: any) => key)

// ✅ GOOD - Proper typing even in tests
const mockT = vi.fn((key: string, params?: Record<string, unknown>) => key)

// ❌ BAD - Using any for Promise resolvers
let resolvePromise: (value: any) => void

// ✅ GOOD - Use unknown for uncertain types
let resolvePromise: (value: unknown) => void
```

---

## Null & Undefined Handling

```typescript
// ❌ BAD - Unsafe
function getName(contractor: Contractor) {
  return contractor.email.toLowerCase() // Might crash if email is null
}

// ✅ GOOD - Safe with optional chaining
function getName(contractor: Contractor) {
  return contractor.email?.toLowerCase() ?? 'No email'
}

// ✅ GOOD - Safe with nullish coalescing
function getEmail(contractor: Contractor) {
  return contractor.email ?? 'no-email@example.com'
}

// ✅ GOOD - Type guard
function hasEmail(contractor: Contractor): contractor is Contractor & { email: string } {
  return contractor.email !== null
}

if (hasEmail(contractor)) {
  console.log(contractor.email.toLowerCase()) // Safe
}
```

---

## Array Typing

```typescript
// ✅ Preferred syntax
const contractors: Contractor[] = []

// ✅ Readonly arrays
const statuses: readonly string[] = ['active', 'inactive']

// ✅ Tuple types
const coordinates: [number, number] = [50.0647, 19.9450]

// ✅ Array methods with types
const names = contractors.map((c) => c.name)
const active = contractors.filter((c) => c.status === 'active')
```

---

## Function Types

```typescript
// Simple function type
type FetchFunction = (id: number) => Promise<Contractor>

// Function with optional parameters
type FilterFunction = (query?: string, status?: string) => Contractor[]

// Function type in interface
interface ContractorService {
  fetch: (id: number) => Promise<Contractor>
  create: (data: ContractorForm) => Promise<Contractor>
}

// Generic function type
type TransformFunction<T, R> = (input: T) => R
```

---

## Best Practices

### DO

1. ✅ Enable strict mode
2. ✅ Define explicit return types
3. ✅ Use type imports (`import type`)
4. ✅ Use union types over enums
5. ✅ Use interfaces for objects
6. ✅ Use proper null handling
7. ✅ Create type guards when needed
8. ✅ Use generics for reusable code
9. ✅ Export all types
10. ✅ Document complex types with JSDoc

### DON'T

1. ❌ Use `any` type
2. ❌ Disable strict mode
3. ❌ Use `@ts-ignore` or `@ts-expect-error`
4. ❌ Use implicit `any`
5. ❌ Use `Function` type
6. ❌ Use `Object` or `{}` type
7. ❌ Skip null checks
8. ❌ Use type assertions unnecessarily
9. ❌ Create overly complex types
10. ❌ Ignore TypeScript errors

---

## Type Assertion (Use Sparingly)

```typescript
// ❌ Avoid type assertions
const contractor = data as Contractor

// ✅ Better - Use type guards
if (isContractor(data)) {
  const contractor = data
}

// ✅ OK - When you have more information than TypeScript
const element = document.getElementById('myId') as HTMLInputElement
```

---

## JSDoc for Complex Types

```typescript
/**
 * Represents a contractor in the system
 * @property {number} id - Unique identifier
 * @property {string} name - Contractor name
 * @property {ContractorStatus} status - Current status
 */
export interface Contractor {
  id: number
  name: string
  status: ContractorStatus
}
```

---