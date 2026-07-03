# Forms with PrimeVue + Zod

**Purpose**: Define form implementation standards using PrimeVue and Zod validation.

**Stack**: @primevue/forms + Zod + @vee-validate/zod

---

## 🎯 Form Implementation Pattern

### Step 1: Create Zod Schema

```typescript
// src/validatorSchemas/contractor/contractorSchema.ts
import { z } from 'zod'

export const contractorSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name is too long'),

  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, 'Invalid phone format')
    .optional(),

  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Status is required' }),
  }),

  groupId: z.number({
    required_error: 'Group is required',
    invalid_type_error: 'Group must be a number',
  }),

  website: z
    .string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),

  foundedAt: z.date({
    required_error: 'Founded date is required',
  }),
})

export type ContractorFormData = z.infer<typeof contractorSchema>
```

---

### Step 2: Form Component Setup

```vue
<script setup lang="ts">
import { useForm } from '@primevue/forms'
import { toFormValidator } from '@vee-validate/zod'
import { contractorSchema } from '@/validatorSchemas/contractor/contractorSchema'
import type { ContractorFormData } from '@/validatorSchemas/contractor/contractorSchema'
// Always use AppDatePicker instead of DatePicker from primevue
import AppDatePicker from '~/components/common/AppDatePicker.vue'

// Props & Emits
interface Props {
  contractorId?: number
  initialData?: ContractorFormData
}

interface Emits {
  submit: [data: ContractorFormData]
  cancel: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Form setup
const { defineField, handleSubmit, errors, resetForm, setValues } = useForm({
  validationSchema: toFormValidator(contractorSchema),
})

// Field definitions
const [name, nameAttrs] = defineField('name')
const [email, emailAttrs] = defineField('email')
const [phone, phoneAttrs] = defineField('phone')
const [status, statusAttrs] = defineField('status')
const [groupId, groupIdAttrs] = defineField('groupId')
const [website, websiteAttrs] = defineField('website')
const [foundedAt, foundedAtAttrs] = defineField('foundedAt')

// State
const loading = ref(false)

// Submit handler
const onSubmit = handleSubmit((values) => {
  emit('submit', values)
})

// Cancel handler
const onCancel = () => {
  resetForm()
  emit('cancel')
}

// Initialize form with data (edit mode)
watch(
  () => props.initialData,
  (data) => {
    if (data) {
      setValues(data)
    }
  },
  { immediate: true }
)
</script>

<template>
  <form @submit="onSubmit">
    <!-- Name Field -->
    <div class="field">
      <label for="name">
        {{ t('contractor.fields.name') }}
        <span class="text-red-500">*</span>
      </label>
      <InputText
        id="name"
        v-model="name"
        v-bind="nameAttrs"
        :invalid="!!errors.name"
        class="w-full"
      />
      <small v-if="errors.name" class="p-error">
        {{ errors.name }}
      </small>
    </div>

    <!-- Email Field -->
    <div class="field">
      <label for="email">{{ t('contractor.fields.email') }}</label>
      <InputText
        id="email"
        v-model="email"
        v-bind="emailAttrs"
        :invalid="!!errors.email"
        type="email"
        class="w-full"
      />
      <small v-if="errors.email" class="p-error">
        {{ errors.email }}
      </small>
    </div>

    <!-- Phone Field -->
    <div class="field">
      <label for="phone">{{ t('contractor.fields.phone') }}</label>
      <InputText
        id="phone"
        v-model="phone"
        v-bind="phoneAttrs"
        :invalid="!!errors.phone"
        class="w-full"
      />
      <small v-if="errors.phone" class="p-error">
        {{ errors.phone }}
      </small>
    </div>

    <!-- Status Dropdown -->
    <div class="field">
      <label for="status">
        {{ t('contractor.fields.status') }}
        <span class="text-red-500">*</span>
      </label>
      <Select
        id="status"
        v-model="status"
        v-bind="statusAttrs"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        :invalid="!!errors.status"
        class="w-full"
      />
      <small v-if="errors.status" class="p-error">
        {{ errors.status }}
      </small>
    </div>

    <!-- Group Dropdown -->
    <div class="field">
      <label for="group">
        {{ t('contractor.fields.group') }}
        <span class="text-red-500">*</span>
      </label>
      <Select
        id="group"
        v-model="groupId"
        v-bind="groupIdAttrs"
        :options="groups"
        option-label="name"
        option-value="id"
        :invalid="!!errors.groupId"
        class="w-full"
      />
      <small v-if="errors.groupId" class="p-error">
        {{ errors.groupId }}
      </small>
    </div>

    <!-- Website Field -->
    <div class="field">
      <label for="website">{{ t('contractor.fields.website') }}</label>
      <InputText
        id="website"
        v-model="website"
        v-bind="websiteAttrs"
        :invalid="!!errors.website"
        type="url"
        class="w-full"
      />
      <small v-if="errors.website" class="p-error">
        {{ errors.website }}
      </small>
    </div>

    <!-- Date Field (use AppDatePicker, NOT DatePicker) -->
    <div class="field">
      <label for="foundedAt">
        {{ t('contractor.fields.foundedAt') }}
        <span class="text-red-500">*</span>
      </label>
      <AppDatePicker
        id="foundedAt"
        v-model="foundedAt"
        v-bind="foundedAtAttrs"
        :invalid="!!errors.foundedAt"
        date-format="dd.mm.yy"
        class="w-full"
      />
      <small v-if="errors.foundedAt" class="p-error">
        {{ errors.foundedAt }}
      </small>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 mt-4">
      <Button
        type="button"
        :label="t('buttons.cancel')"
        severity="secondary"
        outlined
        @click="onCancel"
      />
      <Button
        type="submit"
        :label="t('buttons.save')"
        :loading="loading"
      />
    </div>
  </form>
</template>
```

---

## Common Validation Patterns

### String Validation

```typescript
// Required string
name: z.string().min(1, 'Name is required')

// Optional string (allow empty)
middleName: z.string().optional().or(z.literal(''))

// String with length constraints
description: z.string().min(10, 'Too short').max(500, 'Too long')

// Regex pattern
postalCode: z.string().regex(/^\d{2}-\d{3}$/, 'Format: XX-XXX')
```

### Number Validation

```typescript
// Required number
age: z.number({ required_error: 'Age is required' })

// Number with constraints
quantity: z.number().min(1, 'Min 1').max(100, 'Max 100')

// Optional number
discount: z.number().optional()

// Positive number
price: z.number().positive('Must be positive')

// Integer only
count: z.number().int('Must be integer')
```

### Email & URL

```typescript
// Email
email: z.string().email('Invalid email')

// Optional email
email: z.string().email('Invalid email').optional().or(z.literal(''))

// URL
website: z.string().url('Invalid URL')

// URL with protocol check
website: z.string().url().startsWith('https://', 'Must use HTTPS')
```

### Date Validation

```typescript
// Required date
birthDate: z.date({ required_error: 'Date is required' })

// Date with constraints
startDate: z.date().min(new Date(), 'Must be in future')

// Date range
endDate: z.date().refine(
  (date) => date > startDate,
  'End date must be after start date'
)
```

### Array Validation

```typescript
// Required array with min items
tags: z.array(z.string()).min(1, 'At least one tag required')

// Array with max items
categories: z.array(z.number()).max(5, 'Max 5 categories')

// Array with item validation
emails: z.array(z.string().email()).min(1, 'At least one email')
```

### Enum Validation

```typescript
// Simple enum
status: z.enum(['active', 'inactive', 'pending'])

// With custom error
status: z.enum(['active', 'inactive'], {
  errorMap: () => ({ message: 'Invalid status' }),
})
```

### Conditional Validation

```typescript
// Refine with custom logic
password: z
  .string()
  .min(8, 'Min 8 characters')
  .refine((val) => /[A-Z]/.test(val), 'Must contain uppercase')
  .refine((val) => /[0-9]/.test(val), 'Must contain number')

// Dependent fields
z.object({
  hasVAT: z.boolean(),
  vatNumber: z.string().optional(),
}).refine(
  (data) => {
    if (data.hasVAT) {
      return !!data.vatNumber
    }
    return true
  },
  {
    message: 'VAT number required when VAT is enabled',
    path: ['vatNumber'],
  }
)
```

---

## Form in Modal Pattern

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'

// Store
const contractorStore = useContractorStore()
const { modalOpen, editingContractorId, formData } = storeToRefs(contractorStore)
const { closeModal } = contractorStore

// Composable
const contractor = useContractor()

// Computed for edit mode
const isEditMode = computed(() => !!editingContractorId.value)
const modalTitle = computed(() =>
  isEditMode.value
    ? t('contractor.modal.edit')
    : t('contractor.modal.create')
)

// Submit handler
const handleSubmit = async (data: ContractorFormData) => {
  try {
    if (isEditMode.value) {
      await contractor.update(editingContractorId.value, data)
    } else {
      await contractor.create(data)
    }
    closeModal()
  } catch (error) {
    // Error handled in composable
  }
}
</script>

<template>
  <Dialog
    v-model:visible="modalOpen"
    :header="modalTitle"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="w-[600px]"
    @hide="closeModal"
  >
    <ContractorForm
      :contractor-id="editingContractorId"
      :initial-data="formData"
      @submit="handleSubmit"
      @cancel="closeModal"
    />
  </Dialog>
</template>
```

---

## Dynamic Form Fields

### Conditional Fields

```vue
<script setup lang="ts">
const hasVAT = ref(false)
</script>

<template>
  <div class="field">
    <Checkbox
      id="hasVAT"
      v-model="hasVAT"
      binary
    />
    <label for="hasVAT">{{ t('contractor.fields.hasVAT') }}</label>
  </div>

  <div v-if="hasVAT" class="field">
    <label for="vatNumber">{{ t('contractor.fields.vatNumber') }}</label>
    <InputText
      id="vatNumber"
      v-model="vatNumber"
      v-bind="vatNumberAttrs"
      :invalid="!!errors.vatNumber"
    />
  </div>
</template>
```

### Repeating Fields (Array)

```vue
<script setup lang="ts">
const contacts = ref([{ name: '', email: '', phone: '' }])

const addContact = () => {
  contacts.value.push({ name: '', email: '', phone: '' })
}

const removeContact = (index: number) => {
  contacts.value.splice(index, 1)
}
</script>

<template>
  <div v-for="(contact, index) in contacts" :key="index" class="mb-4">
    <div class="flex items-center gap-2 mb-2">
      <span class="font-semibold">Contact {{ index + 1 }}</span>
      <Button
        v-if="contacts.length > 1"
        icon="pi pi-trash"
        text
        rounded
        size="small"
        severity="danger"
        @click="removeContact(index)"
      />
    </div>

    <div class="field">
      <InputText
        v-model="contact.name"
        placeholder="Name"
        class="w-full"
      />
    </div>

    <div class="field">
      <InputText
        v-model="contact.email"
        placeholder="Email"
        class="w-full"
      />
    </div>
  </div>

  <Button
    :label="t('contractor.addContact')"
    icon="pi pi-plus"
    text
    @click="addContact"
  />
</template>
```

---

## Form Field Types

### InputText

```vue
<InputText
  id="name"
  v-model="name"
  v-bind="nameAttrs"
  :invalid="!!errors.name"
  placeholder="Enter name"
  class="w-full"
/>
```

### Textarea

```vue
<Textarea
  id="description"
  v-model="description"
  v-bind="descriptionAttrs"
  :invalid="!!errors.description"
  rows="5"
  class="w-full"
/>
```

### Select (Dropdown)

```vue
<Select
  id="status"
  v-model="status"
  v-bind="statusAttrs"
  :options="statusOptions"
  option-label="label"
  option-value="value"
  :invalid="!!errors.status"
  placeholder="Select status"
  class="w-full"
/>
```

### MultiSelect

```vue
<MultiSelect
  id="categories"
  v-model="categories"
  v-bind="categoriesAttrs"
  :options="categoryOptions"
  option-label="name"
  option-value="id"
  :invalid="!!errors.categories"
  placeholder="Select categories"
  class="w-full"
/>
```

### DatePicker

> ⚠️ **IMPORTANT**: Always use `AppDatePicker` instead of PrimeVue's `DatePicker`.
>
> PrimeVue's DatePicker has a bug where clicking on an already-selected date converts the Date object to a string, displaying raw `Date.toString()` format (e.g., "Sat Jan 31 2026 00:00:00 GMT+0100") instead of the formatted date.
>
> `AppDatePicker` (`~/components/common/AppDatePicker.vue`) is a wrapper component that fixes this bug.

```vue
<script setup lang="ts">
// ✅ CORRECT: Import AppDatePicker
import AppDatePicker from '~/components/common/AppDatePicker.vue'

// ❌ WRONG: Don't import DatePicker directly
// import DatePicker from 'primevue/datepicker'
</script>

<template>
  <!-- ✅ CORRECT: Use AppDatePicker -->
  <AppDatePicker
    id="birthDate"
    v-model="birthDate"
    v-bind="birthDateAttrs"
    :invalid="!!errors.birthDate"
    date-format="dd.mm.yy"
    show-icon
    class="w-full"
  />

  <!-- ❌ WRONG: Don't use DatePicker directly -->
  <!-- <DatePicker ... /> -->
</template>
```

`AppDatePicker` accepts all the same props as PrimeVue's `DatePicker` and passes them through automatically.

### Checkbox

```vue
<div class="flex items-center gap-2">
  <Checkbox
    id="active"
    v-model="active"
    v-bind="activeAttrs"
    binary
  />
  <label for="active">{{ t('contractor.fields.active') }}</label>
</div>
```

### RadioButton

```vue
<div class="flex gap-4">
  <div class="flex items-center gap-2">
    <RadioButton
      id="type-company"
      v-model="type"
      value="company"
    />
    <label for="type-company">Company</label>
  </div>

  <div class="flex items-center gap-2">
    <RadioButton
      id="type-individual"
      v-model="type"
      value="individual"
    />
    <label for="type-individual">Individual</label>
  </div>
</div>
```

### InputNumber

```vue
<InputNumber
  id="quantity"
  v-model="quantity"
  v-bind="quantityAttrs"
  :invalid="!!errors.quantity"
  :min="1"
  :max="100"
  show-buttons
  class="w-full"
/>
```

---

## Form Testing

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ContractorForm from '@/components/contractor/ContractorForm.vue'

describe('ContractorForm', () => {
  it('should validate required fields', async () => {
    const wrapper = mount(ContractorForm)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.p-error').text()).toContain('Name is required')
  })

  it('should validate email format', async () => {
    const wrapper = mount(ContractorForm)

    await wrapper.find('#email').setValue('invalid-email')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('.p-error').text()).toContain('Invalid email')
  })

  it('should emit submit with valid data', async () => {
    const wrapper = mount(ContractorForm)

    await wrapper.find('#name').setValue('Test Contractor')
    await wrapper.find('#email').setValue('test@example.com')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')[0][0]).toMatchObject({
      name: 'Test Contractor',
      email: 'test@example.com',
    })
  })

  it('should pre-fill form in edit mode', async () => {
    const initialData = {
      name: 'Existing Contractor',
      email: 'existing@example.com',
    }

    const wrapper = mount(ContractorForm, {
      props: { initialData },
    })

    expect(wrapper.find('#name').element.value).toBe('Existing Contractor')
    expect(wrapper.find('#email').element.value).toBe('existing@example.com')
  })
})
```

---

## Label-For Accessibility

**CRITICAL**: All form labels MUST be properly associated with their corresponding form inputs for accessibility compliance.

### Standard Label Pattern

Every `<label for="xyz">` must point to an input with `id="xyz"`:

```vue
<template>
  <!-- ✅ CORRECT: Label for matches input id -->
  <div class="field">
    <label for="email" class="text-sm font-semibold">{{ t('forms.fields.email') }}</label>
    <InputText
      id="email"
      v-model="formData.email"
      type="email"
      class="w-full"
    />
  </div>

  <!-- ❌ INCORRECT: Label for does not match input id -->
  <div class="field">
    <label for="username">{{ t('forms.fields.email') }}</label>
    <InputText
      id="email"
      v-model="formData.email"
      type="email"
      class="w-full"
    />
  </div>

  <!-- ❌ INCORRECT: Label missing for attribute -->
  <div class="field">
    <label class="text-sm font-semibold">{{ t('forms.fields.email') }}</label>
    <InputText
      id="email"
      v-model="formData.email"
      type="email"
      class="w-full"
    />
  </div>
</template>
```

### FloatLabel Pattern (PrimeVue)

When using PrimeVue's FloatLabel component, ensure labels have proper `for` attributes:

```vue
<template>
  <!-- ✅ CORRECT: FloatLabel with matching for/id -->
  <span class="p-float-label">
    <label for="short_name">{{ t('forms.contractor.short_name') }} *</label>
    <InputText
      id="short_name"
      v-model="formData.short_name"
      name="short_name"
      class="w-full"
    />
  </span>
</template>
```

### Checkbox Pattern

Checkboxes use the `input-id` prop to set the actual input's id:

```vue
<template>
  <!-- ✅ CORRECT: Checkbox with input-id and matching label for -->
  <div class="flex items-center gap-2">
    <Checkbox
      v-model="formData.active"
      input-id="active"
      :binary="true"
    />
    <label for="active">{{ t('forms.fields.active') }}</label>
  </div>
</template>
```

### RadioButton Pattern

RadioButtons also use `input-id` prop:

```vue
<template>
  <!-- ✅ CORRECT: RadioButton with input-id and matching label for -->
  <div class="flex items-center gap-4">
    <div class="flex items-center">
      <RadioButton
        v-model="formData.type"
        :input-id="`type_company`"
        name="type"
        value="company"
      />
      <label :for="`type_company`" class="ml-2">{{ t('forms.fields.company') }}</label>
    </div>

    <div class="flex items-center">
      <RadioButton
        v-model="formData.type"
        :input-id="`type_person`"
        name="type"
        value="person"
      />
      <label :for="`type_person`" class="ml-2">{{ t('forms.fields.person') }}</label>
    </div>
  </div>
</template>
```

### Dynamic Fields with v-for

When creating dynamic fields, use computed or template string for IDs:

```vue
<template>
  <!-- ✅ CORRECT: Dynamic labels with matching IDs -->
  <div v-for="(email, index) in additionalEmails" :key="index">
    <label :for="`additionalEmail${index}`">
      {{ t('forms.user.additionalEmail') }} {{ index + 1 }}
    </label>
    <InputText
      :id="`additionalEmail${index}`"
      v-model="additionalEmails[index]"
      :name="`additionalEmail${index}`"
      type="email"
      class="w-full"
    />
  </div>
</template>
```

### Why This Matters

Proper label-for associations provide:

1. **Accessibility**: Screen readers can correctly announce form fields
2. **Usability**: Clicking labels focuses the input (larger click target)
3. **Validation**: Form validation can properly highlight labeled fields
4. **SEO**: Search engines understand form structure better

### Testing Label-For Associations

Use the provided test utility to verify label-for associations:

```typescript
import { assertValidLabelForAssociations } from '@/tests/utils/labelForValidation'

it('should have proper label-for associations', () => {
  const wrapper = mount(YourFormComponent)
  assertValidLabelForAssociations(wrapper)
})
```

---

## Best Practices

### DO

1. ✅ Always use Zod for validation
2. ✅ Define schema in `/src/validatorSchemas/`
3. ✅ Export TypeScript types from schema
4. ✅ Use `v-bind` for field attributes
5. ✅ Show error messages below fields
6. ✅ Mark required fields with `*`
7. ✅ Use `handleSubmit` for form submission
8. ✅ Reset form after successful submit
9. ✅ Disable submit button while loading
10. ✅ Use i18n for all labels and errors
11. ✅ **Ensure all labels have proper `for` attributes matching input `id`**
12. ✅ **Use `input-id` prop for Checkbox and RadioButton components**

### DON'T

1. ❌ Skip validation
2. ❌ Use native HTML validation (use Zod)
3. ❌ Hardcode error messages
4. ❌ Forget to bind field attributes
5. ❌ Submit without validation
6. ❌ Mutate props directly
7. ❌ Skip loading states
8. ❌ Ignore error handling
9. ❌ Use `v-model` without `defineField`
10. ❌ Forget to test form validation
11. ❌ **Create labels without `for` attributes**
12. ❌ **Use mismatched `for` and `id` values**

---