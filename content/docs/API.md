# API Communication

**Purpose**: Define API communication patterns and backend integration.

> **📘 Project-Specific API**: See `/.instructions/PROJECT-SETUP.md` for project-specific API URL and documentation

---

## 🌐 API Base Configuration

### Base URL

```typescript
// nuxt.config.ts or .env
API_URL = 'https://your-backend-api.com/api'
```

**Configure in project-specific files**:
- `.env` file for environment variables
- `nuxt.config.ts` for runtime config

---

## Repository Base Class

```typescript
// src/repository/Repository.ts
export class Repository {
  protected baseURL: string

  constructor(protected endpoint: string) {
    this.baseURL = useRuntimeConfig().public.apiUrl
  }

  /**
   * Generate URL with query parameters
   */
  protected urlParamsGenerator(params?: QueryParams): string {
    if (!params) return ''

    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined) {
          acc[key] = String(value)
        }
        return acc
      }, {} as Record<string, string>)
    ).toString()

    return queryString ? `?${queryString}` : ''
  }

  /**
   * GET request
   */
  protected async get<T>(path: string = ''): Promise<ApiResponse<T>> {
    return await $fetch(`${this.baseURL}/${this.endpoint}/${path}`)
  }

  /**
   * POST request
   */
  protected async post<T>(path: string, data: any): Promise<ApiResponse<T>> {
    return await $fetch(`${this.baseURL}/${this.endpoint}/${path}`, {
      method: 'POST',
      body: data,
    })
  }

  /**
   * PATCH request
   */
  protected async patch<T>(path: string, data: any): Promise<ApiResponse<T>> {
    return await $fetch(`${this.baseURL}/${this.endpoint}/${path}`, {
      method: 'PATCH',
      body: data,
    })
  }

  /**
   * DELETE request
   */
  protected async delete<T>(path: string): Promise<ApiResponse<T>> {
    return await $fetch(`${this.baseURL}/${this.endpoint}/${path}`, {
      method: 'DELETE',
    })
  }
}
```

---

## Domain Repository Implementation

```typescript
// src/repository/contractor/ContractorRepository.ts
import { Repository } from '@/repository/Repository'
import type { ContractorListResponse, ContractorResponse } from '@/types/Contractor/ContractorResponse'
import type { ContractorCreateRequest, ContractorUpdateRequest } from '@/types/Contractor/ContractorForm'

export class ContractorRepository extends Repository {
  constructor() {
    super('contractors')
  }

  /**
   * Get list of contractors
   * @param params - Query parameters (page, per_page, filters, sort)
   */
  async list(params?: QueryParams): Promise<ContractorListResponse> {
    return this.get<ContractorListResponse>(this.urlParamsGenerator(params))
  }

  /**
   * Get single contractor by ID
   */
  async getById(id: number): Promise<ContractorResponse> {
    return this.get<ContractorResponse>(`${id}`)
  }

  /**
   * Create new contractor
   */
  async create(data: ContractorCreateRequest): Promise<ContractorResponse> {
    return this.post<ContractorResponse>('', data)
  }

  /**
   * Update existing contractor
   */
  async update(id: number, data: ContractorUpdateRequest): Promise<ContractorResponse> {
    return this.patch<ContractorResponse>(`${id}`, data)
  }

  /**
   * Delete contractor
   */
  async delete(id: number): Promise<void> {
    return this.delete(`${id}`)
  }
}
```

---

## Query Parameters

### Common Query Params

```typescript
interface QueryParams {
  page?: number
  per_page?: number
  sort?: string
  'filter[search]'?: string
  'filter[status]'?: string
  advanced_filter?: number
  [key: string]: any
}
```

### Examples

```typescript
// Pagination
const params = {
  page: 1,
  per_page: 20,
}

// Search
const params = {
  'filter[search]': 'John',
}

// Column filter
const params = {
  'filter[name]': 'Acme',
  'filter[status]': 'active',
}

// Sorting (prefix - for descending)
const params = {
  sort: 'name',        // Ascending
  sort: '-created_at', // Descending
}

// Advanced filter
const params = {
  advanced_filter: 5,
}

// Combined
const params = {
  page: 1,
  per_page: 20,
  'filter[search]': 'John',
  'filter[status]': 'active',
  sort: '-created_at',
}
```

---

## API Endpoints

### Standard CRUD Endpoints

```
GET    /api/contractors              # List all
GET    /api/contractors/{id}         # Get single
POST   /api/contractors              # Create
PATCH  /api/contractors/{id}         # Update
DELETE /api/contractors/{id}         # Delete
```

### Nested Resources

```
GET    /api/contractors/{id}/contacts           # List contacts
POST   /api/contractors/{id}/contacts           # Create contact
GET    /api/contractors/{id}/contacts/{cid}     # Get contact
PATCH  /api/contractors/{id}/contacts/{cid}     # Update contact
DELETE /api/contractors/{id}/contacts/{cid}     # Delete contact
```

---

## Request/Response Format

### List Response

```json
{
  "data": [
    {
      "id": 1,
      "name": "Contractor 1",
      "status": "active"
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 20,
    "total": 95,
    "from": 1,
    "to": 20
  }
}
```

### Single Resource Response

```json
{
  "data": {
    "id": 1,
    "name": "Contractor 1",
    "email": "contractor@example.com",
    "status": "active",
    "created_at": "2025-01-01T10:00:00Z"
  }
}
```

### Error Response

```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required"],
    "name": ["The name must be at least 3 characters"]
  }
}
```

---

## Authentication

### Access Token

```typescript
// Stored in cookie/localStorage
const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// Automatically attached to requests via interceptor
$fetch.defaults.headers.Authorization = `Bearer ${accessToken}`
```

---

## Error Handling

### HTTP Status Codes

```typescript
200 - OK
201 - Created
204 - No Content
400 - Bad Request
401 - Unauthorized
403 - Forbidden
404 - Not Found
422 - Validation Error
500 - Server Error
```

### Handling API Errors

```typescript
try {
  const response = await contractorRepository.create(data)
} catch (error: any) {
  if (error.status === 422) {
    // Validation errors
    const errors = error.data.errors
    Object.keys(errors).forEach((field) => {
      toast.error(errors[field][0])
    })
  } else if (error.status === 404) {
    toast.error(t('errors.notFound'))
  } else {
    toast.error(t('errors.generic'))
  }
}
```

---

## Data Transformation

### API to Frontend

```typescript
// Backend returns snake_case
interface ApiContractor {
  id: number
  first_name: string
  last_name: string
  created_at: string
}

// Transform to camelCase
function transformContractor(api: ApiContractor): Contractor {
  return {
    id: api.id,
    firstName: api.first_name,
    lastName: api.last_name,
    createdAt: new Date(api.created_at),
  }
}
```

### Frontend to API

```typescript
// Frontend uses camelCase
interface ContractorForm {
  firstName: string
  lastName: string
}

// Transform to snake_case for API
function toApiFormat(form: ContractorForm): ContractorCreateRequest {
  return {
    first_name: form.firstName,
    last_name: form.lastName,
  }
}
```

---

## Repository Registration

```typescript
// src/plugins/repositories.ts
import { ContractorRepository } from '@/repository/contractor/ContractorRepository'
import { VehicleRepository } from '@/repository/vehicle/VehicleRepository'
import { ContactRepository } from '@/repository/contractor/ContactRepository'

export default defineNuxtPlugin(() => ({
  provide: {
    contractorRepository: new ContractorRepository(),
    vehicleRepository: new VehicleRepository(),
    contactRepository: new ContactRepository(),
  },
}))
```

### Usage in Composables

```typescript
export default function useContractor() {
  const { $contractorRepository } = useNuxtApp()

  const fetchContractors = async () => {
    const { data } = await $contractorRepository.list()
    return data
  }

  return { fetchContractors }
}
```

---

## Backend API Documentation

**Live Documentation**: Refer to your project-specific API documentation URL

> **📘 Project-Specific API Docs**: See `/.instructions/PROJECT-SETUP.md` for API documentation location

API documentation typically contains:
- All available endpoints
- Request/response schemas
- Required/optional fields
- Validation rules
- Authentication requirements

### Accessing API Docs

```bash
# Fetch and view API documentation (replace with your project's API URL)
curl https://your-backend-api.com/docs/api.json | jq
```

---

## Best Practices

### DO

1. ✅ Use Repository pattern for all API calls
2. ✅ Define types for all requests/responses
3. ✅ Handle errors at composable level
4. ✅ Use query parameters for filters
5. ✅ Transform data when needed
6. ✅ Use proper HTTP methods
7. ✅ Check API documentation before implementation
8. ✅ Use TypeScript for type safety
9. ✅ Register repositories in plugin
10. ✅ Use async/await for API calls

### DON'T

1. ❌ Make API calls directly in components
2. ❌ Skip error handling
3. ❌ Use `any` for API responses
4. ❌ Hardcode API URLs
5. ❌ Skip request/response validation
6. ❌ Ignore HTTP status codes
7. ❌ Skip loading states
8. ❌ Make unnecessary API calls
9. ❌ Forget authentication headers
10. ❌ Skip API documentation review

---