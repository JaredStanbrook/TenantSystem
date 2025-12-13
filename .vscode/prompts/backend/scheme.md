# Drizzle Schema Template for Cloudflare D1

## Overview

This template generates complete Drizzle ORM table schemas with Zod validation for Cloudflare D1 SQLite databases. The generated schema will be fully compatible with the CRUD route handlers.

## Prerequisites

Ensure these imports are available:

```typescript
import { sql } from "drizzle-orm";
import { integer, text, real, blob, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
```

## Template Instructions

### 1. Replace Placeholders

- `{TABLE_NAME}` - Your table name in camelCase (e.g., `bill`, `userProfile`, `orderItem`)
- `{TABLE_NAME_SNAKE}` - Your table name in snake_case for database (e.g., `bill`, `user_profile`, `order_item`)
- `{FIELD_DEFINITIONS}` - Your column definitions based on field specifications
- `{ZOD_VALIDATIONS}` - Your Zod validation rules for each field

### 2. Field Type Mapping

Use this mapping for SQLite column types:

| Data Type         | Drizzle Type            | Example                                                        |
| ----------------- | ----------------------- | -------------------------------------------------------------- |
| **Integer/ID**    | `integer("field_name")` | `id: integer("id").primaryKey({ autoIncrement: true })`        |
| **String/Text**   | `text("field_name")`    | `name: text("name").notNull()`                                 |
| **Decimal/Money** | `real("field_name")`    | `price: real("price").notNull()`                               |
| **Boolean**       | `integer("field_name")` | `isActive: integer("is_active").default(0)`                    |
| **Date/DateTime** | `text("field_name")`    | `createdAt: text("created_at").default(sql\`(CURRENT_DATE)\`)` |
| **JSON/Object**   | `text("field_name")`    | `metadata: text("metadata")`                                   |
| **Binary/File**   | `blob("field_name")`    | `avatar: blob("avatar")`                                       |

### 3. Common Field Patterns

#### Primary Key (Auto-increment)

```typescript
id: integer("id").primaryKey({ autoIncrement: true });
```

#### Foreign Key Reference

```typescript
userId: text("user_id")
  .notNull()
  .references(() => user.id);
```

#### Timestamps

```typescript
createdAt: text("created_at")
  .default(sql`(CURRENT_DATE)`)
  .notNull(),
updatedAt: text("updated_at")
  .default(sql`(CURRENT_DATE)`)
```

#### Enum-like Fields

```typescript
status: text("status").notNull().default("active");
// Validate with Zod: z.enum(["active", "inactive", "pending"])
```

## Complete Schema Template

```typescript
import { sql } from "drizzle-orm";
import { integer, text, real, blob, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
// Import related tables for foreign key references
// import { user } from "./user.ts";
// import { category } from "./category.ts";

export const {TABLE_NAME} = sqliteTable("{TABLE_NAME_SNAKE}", {
  // Primary key (always include)
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Foreign key references (if applicable)
  // userId: text("user_id")
  //   .notNull()
  //   .references(() => user.id),

  // Regular fields based on your specifications
  {FIELD_DEFINITIONS}

  // Timestamps (recommended for most tables)
  createdAt: text("created_at")
    .default(sql`(CURRENT_DATE)`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(CURRENT_DATE)`),
});

// Insert schema - for validating incoming data
export const insert{TABLE_NAME}Schema = createInsertSchema({TABLE_NAME}, {
  // ID is optional for inserts (auto-generated)
  id: z.number().optional(),

  // Custom Zod validations for each field
  {ZOD_VALIDATIONS}

  // Timestamps are optional for inserts (auto-generated)
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Update schema - for partial updates (all fields optional except constraints)
export const update{TABLE_NAME}Schema = insert{TABLE_NAME}Schema.partial().extend({
  // Keep required fields that should never be undefined in updates
  // id: z.number(), // Uncomment if ID should be required for updates
});

// Select schema - for validating API responses
export const select{TABLE_NAME}Schema = createSelectSchema({TABLE_NAME});

// Export type definitions for TypeScript
export type Insert{TABLE_NAME} = z.infer<typeof insert{TABLE_NAME}Schema>;
export type Update{TABLE_NAME} = z.infer<typeof update{TABLE_NAME}Schema>;
export type Select{TABLE_NAME} = z.infer<typeof select{TABLE_NAME}Schema>;
```

## Field Definition Examples

### Basic Text Fields

```typescript
// Required text field
name: text("name").notNull(),

// Optional text field with default
description: text("description").default(""),

// Text field with length constraint (enforced by Zod)
title: text("title").notNull(),
```

### Numeric Fields

```typescript
// Integer field
quantity: integer("quantity").notNull().default(0),

// Decimal/money field
price: real("price").notNull(),

// Boolean (stored as integer)
isActive: integer("is_active").notNull().default(1),
```

### Date Fields

```typescript
// Date field (stored as text)
dueDate: text("due_date").notNull(),

// Timestamp with default
createdAt: text("created_at")
  .default(sql`(CURRENT_TIMESTAMP)`)
  .notNull(),
```

### JSON Fields

```typescript
// JSON data (stored as text)
metadata: text("metadata"),
settings: text("settings").default("{}"),
```

## Zod Validation Examples

### String Validations

```typescript
// Basic string with length constraints
name: z.string().min(1).max(255),

// Email validation
email: z.string().email(),

// URL validation
website: z.string().url().optional(),

// Enum validation
status: z.enum(["active", "inactive", "pending"]),

// Custom regex pattern
phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone format"),
```

### Number Validations

```typescript
// Basic number constraints
age: z.number().int().min(0).max(120),

// Decimal/money validation
amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid monetary amount"),

// Boolean (stored as 0/1)
isActive: z.number().int().min(0).max(1),
```

### Date Validations

```typescript
// Date string validation
dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
  message: "Must be a valid date",
}),

// ISO date string
createdAt: z.string().datetime().optional(),

// Custom date format
birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
```

### JSON Validations

```typescript
// JSON object validation
metadata: z.string().refine((str) => {
  try { JSON.parse(str); return true; }
  catch { return false; }
}, "Must be valid JSON").optional(),

// Parsed JSON with schema
settings: z.string().transform((str) => JSON.parse(str)).pipe(
  z.object({
    theme: z.string().optional(),
    notifications: z.boolean().optional(),
  })
).optional(),
```

## Usage Instructions for AI

### 1. Input Format

Provide table specifications in this format:

```
Table Name: {name}
Fields:
- fieldName: {type} [{constraints}] [{description}]
- fieldName2: {type} [{constraints}] [{description}]

Relationships:
- belongsTo: {tableName} via {fieldName}
- hasMany: {tableName} via {fieldName}
```

### 2. Generation Steps

1. Replace `{TABLE_NAME}` with camelCase table name
2. Replace `{TABLE_NAME_SNAKE}` with snake_case table name
3. Generate field definitions based on type mapping
4. Create appropriate Zod validations for each field
5. Add foreign key references if specified
6. Include standard timestamps unless specified otherwise

### 3. Validation Rules Priority

1. **Required fields**: Add `.notNull()` to Drizzle and remove `.optional()` from Zod
2. **Unique fields**: Add Zod validation (database constraints handled separately)
3. **Length limits**: Use Zod `.min()` and `.max()` methods
4. **Format validation**: Use Zod `.regex()`, `.email()`, `.url()`, etc.
5. **Custom validation**: Use Zod `.refine()` method

## Example Generation

**Input:**

```
Table Name: product
Fields:
- name: string [required, 3-100 chars]
- price: decimal [required, positive]
- category: enum [active, inactive] [default: active]
- description: text [optional]
- inStock: boolean [default: true]

Relationships:
- belongsTo: user via userId
```

**Generated Schema:**

```typescript
export const product = sqliteTable("product", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  name: text("name").notNull(),
  price: real("price").notNull(),
  category: text("category").notNull().default("active"),
  description: text("description"),
  inStock: integer("in_stock").notNull().default(1),
  createdAt: text("created_at")
    .default(sql`(CURRENT_DATE)`)
    .notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_DATE)`),
});

export const insertProductSchema = createInsertSchema(product, {
  id: z.number().optional(),
  userId: z.string(),
  name: z.string().min(3).max(100),
  price: z.number().positive(),
  category: z.enum(["active", "inactive"]),
  description: z.string().optional(),
  inStock: z.number().int().min(0).max(1),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
```

## Best Practices Included

✅ **Type Safety**: Full TypeScript integration with exported types  
✅ **Validation**: Comprehensive Zod schemas for all operations  
✅ **Relationships**: Proper foreign key references  
✅ **Timestamps**: Automatic created/updated tracking  
✅ **Flexibility**: Separate insert/update/select schemas  
✅ **Standards**: Consistent naming conventions  
✅ **Performance**: Optimized SQLite column types  
✅ **Compatibility**: Works seamlessly with CRUD route handlers
