# Permission System Documentation

This document explains how to use the permission system in the frontend application.

## Overview

The permission system allows you to control access to routes and UI elements based on user permissions. Permissions are fetched from the API and stored in the user store.

## Architecture

1. **Permission Storage**: User permissions are stored in `userStore.userPermissions` as an array of permission name strings
2. **Permission Fetching**: Permissions are automatically extracted from the login response and stored during authentication
3. **Permission Checking**: Use the `usePermission()` composable to check permissions
4. **Route Protection**: Use the `permission` middleware to protect routes

---

## 1. Using the Permission Composable

The `usePermission()` composable provides helper functions for checking permissions in your components and logic.

### Import

```ts
const { hasPermission, hasAnyPermission, hasAllPermissions, can } = usePermission()
```

### Methods

#### `hasPermission(permission: string): boolean`

Check if the user has a specific permission.

```ts
const { hasPermission } = usePermission()

if (hasPermission('contractor.create')) {
  // User can create contractors
}
```

#### `hasAnyPermission(permissions: string[]): boolean`

Check if the user has at least one of the specified permissions.

```ts
const { hasAnyPermission } = usePermission()

if (hasAnyPermission(['contractor.update', 'contractor.delete'])) {
  // User can either update or delete contractors
}
```

#### `hasAllPermissions(permissions: string[]): boolean`

Check if the user has all of the specified permissions.

```ts
const { hasAllPermissions } = usePermission()

if (hasAllPermissions(['contractor.create', 'contractor.update'])) {
  // User can both create and update contractors
}
```

#### `can(action: string, resource: string): boolean`

Convenience method to check if a user can perform an action on a resource.

```ts
const { can } = usePermission()

if (can('create', 'contractor')) {
  // User can create contractors (checks 'contractor.create')
}

if (can('update', 'vehicle')) {
  // User can update vehicles (checks 'vehicle.update')
}
```

---

## 2. Using Permissions in Components

### Conditional Rendering

Hide/show UI elements based on permissions:

```vue
<script setup lang="ts">
const { hasPermission } = usePermission()
</script>

<template>
  <div>
    <!-- Show button only if user has create permission -->
    <Button
      v-if="hasPermission('contractor.create')"
      label="Create Contractor"
      @click="openCreateModal"
    />

    <!-- Show edit button only if user can update -->
    <Button
      v-if="hasPermission('contractor.update')"
      label="Edit"
      @click="openEditModal"
    />
  </div>
</template>
```

### Disabling Actions

```vue
<script setup lang="ts">
const { can } = usePermission()

const canEdit = computed(() => can('update', 'contractor'))
const canDelete = computed(() => can('delete', 'contractor'))
</script>

<template>
  <DataTable :value="contractors">
    <Column header="Actions">
      <template #body="slotProps">
        <Button
          icon="pi pi-pencil"
          :disabled="!canEdit"
          @click="editContractor(slotProps.data)"
        />
        <Button
          icon="pi pi-trash"
          :disabled="!canDelete"
          @click="deleteContractor(slotProps.data)"
        />
      </template>
    </Column>
  </DataTable>
</template>
```

### Complex Permission Logic

```vue
<script setup lang="ts">
const { hasAllPermissions, hasAnyPermission } = usePermission()

// User must have both permissions
const canManageContractor = computed(() =>
  hasAllPermissions(['contractor.create', 'contractor.update'])
)

// User needs at least one of these permissions
const canViewFinancials = computed(() =>
  hasAnyPermission([
    'contractor-trade-credit.list',
    'contractor-payment-details.list',
  ])
)
</script>

<template>
  <div>
    <TabView v-if="canManageContractor">
      <TabPanel header="Basic Info">
        <!-- ... -->
      </TabPanel>
      <TabPanel
        v-if="canViewFinancials"
        header="Financial Info"
      >
        <!-- ... -->
      </TabPanel>
    </TabView>
  </div>
</template>
```

---

## 3. Protecting Routes with Middleware

Use the `permission` middleware to protect entire routes/pages.

### Basic Usage

In your page component, use `definePageMeta`:

```vue
<!-- pages/contractors/index.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'permission',
  permissions: ['contractor.list'],
})

// Your component logic
</script>

<template>
  <!-- Your template -->
</template>
```

### Requiring Any Permission (OR logic)

By default, the user needs at least ONE of the specified permissions:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: 'permission',
  // User needs contractor.list OR contractor.create
  permissions: ['contractor.list', 'contractor.create'],
})
</script>
```

### Requiring All Permissions (AND logic)

To require ALL permissions, set `requireAllPermissions: true`:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: 'permission',
  permissions: ['contractor.update', 'contractor.delete'],
  requireAllPermissions: true, // User needs BOTH permissions
})
</script>
```

### Combined with Other Middleware

You can combine the permission middleware with other middleware:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'permission'], // Run auth first, then permission check
  permissions: ['administration.user.list'],
})
</script>
```

### Dynamic Routes

```vue
<!-- pages/contractors/[id]/edit.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'permission',
  permissions: ['contractor.update'],
})

const route = useRoute()
const contractorId = route.params.id

// Fetch and edit contractor
</script>
```

---

## 4. Permission Naming Convention

Permissions follow the pattern: `{resource}.{action}` or `{module}.{resource}.{action}`

### Common Examples

**Basic CRUD Operations:**
- `contractor.list` - View list of contractors
- `contractor.create` - Create new contractor
- `contractor.update` - Update existing contractor
- `contractor.delete` - Delete contractor

**Nested Resources:**
- `contractor-contact.list` - View contractor contacts
- `contractor-contact.create` - Create contractor contact
- `contractor-note.update` - Update contractor notes

**Module-Scoped:**
- `dictionary.contractor-group.list` - View contractor groups in dictionary module
- `system.roles.create` - Create roles in system module
- `administration.user.list` - View users in administration module

**Record/Kartoteka Permissions:**
- `record.contractor-base-info.list` - View contractor base info in record
- `record.contractor-contact.update` - Update contacts in contractor record

---

## 5. Example Use Cases

### Example 1: Contractor List Page

```vue
<!-- pages/contractors/index.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'permission',
  permissions: ['contractor.list'],
})

const { can } = usePermission()

const canCreate = computed(() => can('create', 'contractor'))
const canUpdate = computed(() => can('update', 'contractor'))
const canDelete = computed(() => can('delete', 'contractor'))
</script>

<template>
  <div>
    <Button
      v-if="canCreate"
      label="New Contractor"
      @click="createNew"
    />

    <DataTable :value="contractors">
      <Column field="name" header="Name" />
      <Column header="Actions">
        <template #body="slotProps">
          <Button
            v-if="canUpdate"
            icon="pi pi-pencil"
            @click="edit(slotProps.data)"
          />
          <Button
            v-if="canDelete"
            icon="pi pi-trash"
            @click="remove(slotProps.data)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
```

### Example 2: System Settings (Admin Only)

```vue
<!-- pages/system/settings.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'permission',
  permissions: [
    'system.roles.list',
    'system.permissions.list',
  ],
  requireAllPermissions: true, // Must have both
})

const { hasPermission } = usePermission()

const canManageRoles = computed(() =>
  hasPermission('system.roles.update')
)
</script>

<template>
  <div>
    <h1>System Settings</h1>

    <TabView>
      <TabPanel header="Roles">
        <RolesList />
        <Button
          v-if="canManageRoles"
          label="Edit Roles"
        />
      </TabPanel>

      <TabPanel header="Permissions">
        <PermissionsList />
      </TabPanel>
    </TabView>
  </div>
</template>
```

### Example 3: Conditional Navigation Menu

```vue
<!-- components/MainNavbar.vue -->
<script setup lang="ts">
const { hasPermission, hasAnyPermission } = usePermission()

const canViewContractors = computed(() =>
  hasPermission('contractor.list')
)

const canViewAdministration = computed(() =>
  hasAnyPermission([
    'administration.user.list',
    'administration.columns-list.list',
  ])
)

const canViewSystem = computed(() =>
  hasAnyPermission([
    'system.roles.list',
    'system.permissions.list',
    'system.log-activity.list',
  ])
)
</script>

<template>
  <nav>
    <MenuItem
      v-if="canViewContractors"
      label="Contractors"
      to="/contractors"
    />

    <MenuItem
      v-if="canViewAdministration"
      label="Administration"
      to="/administration"
    />

    <MenuItem
      v-if="canViewSystem"
      label="System"
      to="/system"
    />
  </nav>
</template>
```

---

## 6. Testing Permissions

### In Development

You can check the current user's permissions in the browser console:

```js
// In browser console
const userStore = useUserStore()
console.log(userStore.userPermissions)
```

### Debugging Permission Checks

```vue
<script setup lang="ts">
const { hasPermission } = usePermission()
const userStore = useUserStore()

// Log for debugging
onMounted(() => {
  console.log('User permissions:', userStore.userPermissions)
  console.log('Has contractor.create?', hasPermission('contractor.create'))
})
</script>
```

---

## 7. Important Notes

1. **Permission Check Timing**: Permissions are extracted from the login response and stored immediately upon authentication. They are available as soon as the user logs in.

2. **Empty Permissions**: If `userPermissions` is empty or not loaded, all permission checks will return `false`.

3. **Case Sensitivity**: Permission names are case-sensitive. Use exactly the same casing as returned by the API.

4. **Middleware Order**: The `permission` middleware assumes the user is already logged in. If you need both auth and permission checks, use: `middleware: ['auth', 'permission']`

5. **No Permissions Meta**: If you don't specify `permissions` in `definePageMeta`, the middleware allows access (no restrictions).

6. **Redirect on Denied Access**: When permission is denied, users are redirected to `/403` (Permission Denied page) where they can go back or return to the home page.

---

## 8. API Response Structure

User permissions are included in the login response from `/api/v1/auth/login`. The permissions are nested within the `user` object:

```json
{
  "user": {
    "id": 19,
    "name": "John Doe",
    "email": "john@example.com",
    "permissions": [
      {
        "id": 9,
        "name": "contractor.list"
      },
      {
        "id": 10,
        "name": "contractor.create"
      },
      {
        "id": 11,
        "name": "contractor.update"
      }
    ]
  },
  "access_token": { "token": "...", "expires_at": "..." },
  "refresh_token": { "token": "...", "expires_at": "..." }
}
```

The permission names are extracted from the `permissions` array and stored in `userStore.userPermissions` as a `string[]`:

```javascript
["contractor.list", "contractor.create", "contractor.update", ...]
```