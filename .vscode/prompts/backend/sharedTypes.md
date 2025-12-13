# Shared Types Template for Frontend-Backend Integration

## Overview

This template generates shared type definitions that bridge your Drizzle schemas with frontend applications. It creates specialized schemas for different operations while maintaining type safety across your full-stack application.

## Prerequisites

Ensure these imports are included:

```typescript
import { z } from "zod";
// Import all relevant table schemas
import { insert{TableName}Schema } from "./db/schema/{tableName}";
```

## Template Instructions

### 1. Replace Placeholders

- `{TABLE_NAME}` - Your table name in PascalCase (e.g., `Bill`, `User`, `Property`)
- `{TABLE_NAME_CAMEL}` - Your table name in camelCase (e.g., `bill`, `user`, `property`)
- `{SCHEMA_IMPORTS}` - Import statements for all related table schemas
- `{SCHEMA_DEFINITIONS}` - Schema definitions based on your use cases
- `{TYPE_EXPORTS}` - TypeScript type exports

### 2. Common Schema Patterns

#### Create Schema (for new records)

```typescript
// Omits auto-generated fields, includes required user input
export const create{TABLE_NAME}Schema = insert{TABLE_NAME}Schema.omit({
  id: true,           // Auto-generated primary key
  createdAt: true,    // Auto-generated timestamp
  updatedAt: true,    // Auto-generated timestamp
});
```

#### Update Schema (for editing records)

```typescript
// Makes most fields optional, keeps business logic constraints
export const update{TABLE_NAME}Schema = insert{TABLE_NAME}Schema
  .omit({
    id: true,         // ID shouldn't be updated
    createdAt: true,  // Creation time is immutable
  })
  .partial();         // Makes remaining fields optional
```

#### Auth/Public Schema (for external use)

```typescript
// Omits sensitive fields for public APIs or frontend display
export const public{TABLE_NAME}Schema = insert{TABLE_NAME}Schema.omit({
  password: true,     // Sensitive authentication data
  apiKey: true,       // Private keys
  internalNotes: true, // Internal-only fields
});
```

#### Extended Schema (with additional frontend fields)

```typescript
// Adds fields needed by frontend but not stored in database
export const extended{TABLE_NAME}Schema = insert{TABLE_NAME}Schema.merge(
  z.object({
    confirmPassword: z.string(),  // Confirmation fields
    agreeToTerms: z.boolean(),    // UI-only checkboxes
    selectedOptions: z.array(z.string()), // Multi-select data
  })
);
```

## Complete Shared Types Template

```typescript
import { z } from "zod";

// Import all table schemas used in this file
{
  SCHEMA_IMPORTS;
}

// =============================================================================
// CREATE SCHEMAS - For new record creation
// =============================================================================

{
  CREATE_SCHEMAS;
}

// =============================================================================
// UPDATE SCHEMAS - For record modifications
// =============================================================================

{
  UPDATE_SCHEMAS;
}

// =============================================================================
// PUBLIC/AUTH SCHEMAS - For external APIs and authentication
// =============================================================================

{
  PUBLIC_SCHEMAS;
}

// =============================================================================
// EXTENDED SCHEMAS - With additional frontend-only fields
// =============================================================================

{
  EXTENDED_SCHEMAS;
}

// =============================================================================
// RELATIONSHIP SCHEMAS - For handling related data
// =============================================================================

{
  RELATIONSHIP_SCHEMAS;
}

// =============================================================================
// TYPESCRIPT TYPE EXPORTS
// =============================================================================

{
  TYPE_EXPORTS;
}
```

## Schema Generation Patterns

### 1. Create Schema Patterns

#### Basic Create (most common)

```typescript
export const create{TABLE_NAME}Schema = insert{TABLE_NAME}Schema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
```

#### Create with Foreign Key Context

```typescript
export const create{TABLE_NAME}Schema = insert{TABLE_NAME}Schema
  .omit({
    id: true,
    userId: true,      // Will be provided by auth context
    createdAt: true,
  })
  .merge(
    z.object({
      // Additional fields needed for creation
      confirmAction: z.boolean().optional(),
      notifyUsers: z.array(z.string()).optional(),
    })
  );
```

#### Create with Validation Extensions

```typescript
export const create{TABLE_NAME}Schema = insert{TABLE_NAME}Schema
  .omit({
    id: true,
    createdAt: true,
  })
  .merge(
    z.object({
      confirmPassword: z.string(),
    })
  )
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
```

### 2. Update Schema Patterns

#### Basic Update (partial fields)

```typescript
export const update{TABLE_NAME}Schema = insert{TABLE_NAME}Schema
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();
```

#### Update with Required Fields

```typescript
export const update{TABLE_NAME}Schema = insert{TABLE_NAME}Schema
  .omit({
    id: true,
    createdAt: true,
  })
  .partial()
  .merge(
    z.object({
      // Fields that must be provided for updates
      version: z.number(),
      reason: z.string().min(1),
    })
  );
```

### 3. Public/Auth Schema Patterns

#### Public Data (remove sensitive fields)

```typescript
export const public{TABLE_NAME}Schema = insert{TABLE_NAME}Schema.omit({
  password: true,
  email: true,           // PII
  internalNotes: true,   // Internal only
  apiKey: true,         // Sensitive keys
});
```

#### Auth Schema (for login/registration)

```typescript
export const auth{TABLE_NAME}Schema = insert{TABLE_NAME}Schema.omit({
  id: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
});
```

### 4. Extended Schema Patterns

#### Frontend Form Schema

```typescript
export const {TABLE_NAME_CAMEL}FormSchema = insert{TABLE_NAME}Schema
  .omit({
    id: true,
    createdAt: true,
  })
  .merge(
    z.object({
      // Form-specific fields
      agreeToTerms: z.boolean().refine(val => val === true, {
        message: "You must agree to the terms",
      }),
      captchaToken: z.string().optional(),
      referralCode: z.string().optional(),
    })
  );
```

#### Search/Filter Schema

```typescript
export const {TABLE_NAME_CAMEL}FilterSchema = z.object({
  // Search parameters
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),

  // Date ranges
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  // Pagination
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),

  // Sorting
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

### 5. Relationship Schema Patterns

#### Many-to-Many Relationships

```typescript
export const assign{TABLE_NAME}Schema = z.object({
  {TABLE_NAME_CAMEL}Id: z.string(),
  relatedIds: z.array(z.string()).min(1),
  assignmentType: z.enum(["permanent", "temporary"]).default("permanent"),
  effectiveDate: z.string().optional(),
});
```

#### Nested Creation

```typescript
export const create{TABLE_NAME}WithDetailsSchema = create{TABLE_NAME}Schema.merge(
  z.object({
    details: z.array(createDetailSchema),
    metadata: z.record(z.string(), z.any()).optional(),
  })
);
```

## Usage Instructions for AI

### 1. Input Format

Provide specifications in this format:

```
Table: {tableName}
Use Cases:
- create: [fields to omit] [additional fields to add]
- update: [fields to omit] [required fields] [make partial: yes/no]
- public: [sensitive fields to remove]
- auth: [fields for authentication]
- form: [additional form fields needed]
- filter: [searchable/filterable fields]

Relationships:
- hasMany: {relatedTable} via {field}
- belongsTo: {relatedTable} via {field}
- manyToMany: {relatedTable} via {throughTable}
```

### 2. Generation Rules

#### Field Omission Priority

1. **Always omit from create**: `id`, `createdAt`, `updatedAt`
2. **Context-dependent omissions**: Foreign keys provided by auth/session
3. **Security omissions**: Passwords, API keys, internal fields
4. **Business logic omissions**: Calculated fields, system-generated data

#### Schema Merging Guidelines

1. **Form fields**: Add UI-only validation fields
2. **Confirmation fields**: Password confirmation, terms agreement
3. **Metadata fields**: Additional context not in database
4. **Relationship data**: Arrays of IDs for assignments

#### Validation Enhancement

1. **Cross-field validation**: Use `.refine()` for complex rules
2. **Conditional validation**: Based on other field values
3. **Business rules**: Implement domain-specific constraints
4. **Frontend helpers**: Add user experience validations

### 3. Type Export Patterns

#### Basic Types

```typescript
export type Create{TABLE_NAME} = z.infer<typeof create{TABLE_NAME}Schema>;
export type Update{TABLE_NAME} = z.infer<typeof update{TABLE_NAME}Schema>;
export type Public{TABLE_NAME} = z.infer<typeof public{TABLE_NAME}Schema>;
```

#### Extended Types

```typescript
export type {TABLE_NAME}Form = z.infer<typeof {TABLE_NAME_CAMEL}FormSchema>;
export type {TABLE_NAME}Filter = z.infer<typeof {TABLE_NAME_CAMEL}FilterSchema>;
export type {TABLE_NAME}Assignment = z.infer<typeof assign{TABLE_NAME}Schema>;
```

## Example Generation

**Input:**

```
Table: user
Use Cases:
- create: omit [id, createdAt, emailVerified] add [confirmPassword, address]
- update: omit [id, createdAt] make partial: yes
- public: remove [password, email, phone]
- auth: omit [id, emailVerified, phone]
- form: add [agreeToTerms, newsletter]

Relationships:
- hasMany: property via landlordId
```

**Generated Output:**

```typescript
// CREATE SCHEMAS
export const createUserSchema = insertUserSchema
  .omit({
    id: true,
    createdAt: true,
    emailVerified: true,
  })
  .merge(
    z.object({
      confirmPassword: z.string(),
      address: z.string().optional(),
    })
  )
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// UPDATE SCHEMAS
export const updateUserSchema = insertUserSchema
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();

// PUBLIC SCHEMAS
export const publicUserSchema = insertUserSchema.omit({
  password: true,
  email: true,
  phone: true,
});

// AUTH SCHEMAS
export const authUserSchema = insertUserSchema.omit({
  id: true,
  emailVerified: true,
  phone: true,
});

// FORM SCHEMAS
export const userFormSchema = createUserSchema.merge(
  z.object({
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms",
    }),
    newsletter: z.boolean().default(false),
  })
);

// TYPE EXPORTS
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type UserForm = z.infer<typeof userFormSchema>;
```

## Best Practices Included

✅ **Type Safety**: Full TypeScript integration across frontend-backend  
✅ **Security**: Automatic removal of sensitive fields from public schemas  
✅ **Validation**: Enhanced validation rules for different contexts  
✅ **Flexibility**: Multiple schema variants for different use cases  
✅ **Relationships**: Proper handling of related data and assignments  
✅ **Performance**: Optimized schemas for specific operations  
✅ **User Experience**: Form-specific validations and error handling  
✅ **Maintainability**: Clear separation of concerns and consistent patterns
