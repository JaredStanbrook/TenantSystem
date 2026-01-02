# CRUD Route Handler Template

## Overview

This template generates complete CRUD route handlers using:

- **Hono** for HTTP routing and middleware
- **Drizzle ORM** for type-safe database operations with Cloudflare D1
- **Zod** for request validation and type safety
- **TypeScript** for full type safety

## Prerequisites

Ensure you have the following imports and dependencies available:

```typescript
// Required imports for any CRUD route
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, asc } from "drizzle-orm";
import { dbMiddleware } from "../middleware/db";
```

## Template Instructions

### 1. Replace Placeholders

Replace these placeholders with your actual values:

- `{TABLE_NAME}` - Your database table name (e.g., `users`, `posts`, `orders`)
- `{TABLE_SCHEMA}` - Your Drizzle table schema import
- `{INSERT_SCHEMA}` - Your Zod insert validation schema
- `{UPDATE_SCHEMA}` - Your Zod update validation schema (optional, can reuse insert)
- `{SELECT_SCHEMA}` - Your Zod select validation schema (for response typing)

### 2. Schema Requirements

Your schemas should follow this pattern:

```typescript
// Example schema structure
export const insertExampleSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  age: z.number().int().min(0).optional(),
  createdAt: z.date().optional(), // Usually handled by DB
});

export const updateExampleSchema = insertExampleSchema.partial(); // Makes all fields optional
export const selectExampleSchema = insertExampleSchema.extend({
  id: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});
```

## Complete CRUD Route Template

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";
import { dbMiddleware } from "../middleware/db";
import {
  {TABLE_NAME} as {TABLE_NAME}Table,
  insert{TABLE_NAME}Schema,
  update{TABLE_NAME}Schema,
  select{TABLE_NAME}Schema,
} from "../db/schema/{TABLE_NAME}";

export const {TABLE_NAME}Route = new Hono()
  .use("*", dbMiddleware)

  // GET /api/{TABLE_NAME} - List all records with optional pagination
  .get("/", async (c) => {
    try {
      const db = c.var.db;
      const { limit = "50", offset = "0", sortBy = "id", order = "desc" } = c.req.query();

      const limitNum = Math.min(parseInt(limit) || 50, 100); // Cap at 100
      const offsetNum = parseInt(offset) || 0;
      const orderDirection = order === "asc" ? asc : desc;

      const records = await db
        .select()
        .from({TABLE_NAME}Table)
        .orderBy(orderDirection({TABLE_NAME}Table[sortBy] || {TABLE_NAME}Table.id))
        .limit(limitNum)
        .offset(offsetNum);

      // Get total count for pagination
      const totalResult = await db
        .select({ count: count() })
        .from({TABLE_NAME}Table);

      const total = totalResult[0]?.count || 0;

      return c.json({
        data: records,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total
        }
      });
    } catch (error) {
      console.error("Error fetching {TABLE_NAME}:", error);
      return c.json({ error: "Failed to fetch records" }, 500);
    }
  })

  // GET /api/{TABLE_NAME}/:id - Get single record by ID
  .get("/:id{[0-9]+}", async (c) => {
    try {
      const db = c.var.db;
      const id = Number.parseInt(c.req.param("id"));

      if (isNaN(id)) {
        return c.json({ error: "Invalid ID format" }, 400);
      }

      const record = await db
        .select()
        .from({TABLE_NAME}Table)
        .where(eq({TABLE_NAME}Table.id, id))
        .limit(1);

      if (!record.length) {
        return c.json({ error: "Record not found" }, 404);
      }

      return c.json({ data: record[0] });
    } catch (error) {
      console.error("Error fetching {TABLE_NAME} by ID:", error);
      return c.json({ error: "Failed to fetch record" }, 500);
    }
  })

  // POST /api/{TABLE_NAME} - Create new record
  .post("/", zValidator("json", insert{TABLE_NAME}Schema), async (c) => {
    try {
      const db = c.var.db;
      const validatedData = c.req.valid("json");

      const result = await db
        .insert({TABLE_NAME}Table)
        .values(validatedData)
        .returning();

      if (!result.length) {
        return c.json({ error: "Failed to create record" }, 500);
      }

      return c.json({ data: result[0] }, 201);
    } catch (error) {
      console.error("Error creating {TABLE_NAME}:", error);

      // Handle common database errors
      if (error.message?.includes("UNIQUE constraint")) {
        return c.json({ error: "Record with this data already exists" }, 409);
      }

      return c.json({ error: "Failed to create record" }, 500);
    }
  })

  // PUT /api/{TABLE_NAME}/:id - Update record (full replacement)
  .put("/:id{[0-9]+}", zValidator("json", insert{TABLE_NAME}Schema), async (c) => {
    try {
      const db = c.var.db;
      const id = Number.parseInt(c.req.param("id"));
      const validatedData = c.req.valid("json");

      if (isNaN(id)) {
        return c.json({ error: "Invalid ID format" }, 400);
      }

      const result = await db
        .update({TABLE_NAME}Table)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq({TABLE_NAME}Table.id, id))
        .returning();

      if (!result.length) {
        return c.json({ error: "Record not found" }, 404);
      }

      return c.json({ data: result[0] });
    } catch (error) {
      console.error("Error updating {TABLE_NAME}:", error);

      if (error.message?.includes("UNIQUE constraint")) {
        return c.json({ error: "Record with this data already exists" }, 409);
      }

      return c.json({ error: "Failed to update record" }, 500);
    }
  })

  // PATCH /api/{TABLE_NAME}/:id - Partial update
  .patch("/:id{[0-9]+}", zValidator("json", update{TABLE_NAME}Schema), async (c) => {
    try {
      const db = c.var.db;
      const id = Number.parseInt(c.req.param("id"));
      const validatedData = c.req.valid("json");

      if (isNaN(id)) {
        return c.json({ error: "Invalid ID format" }, 400);
      }

      // Remove undefined/null values for partial update
      const updateData = Object.fromEntries(
        Object.entries(validatedData).filter(([_, value]) => value !== undefined && value !== null)
      );

      if (Object.keys(updateData).length === 0) {
        return c.json({ error: "No valid fields to update" }, 400);
      }

      const result = await db
        .update({TABLE_NAME}Table)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq({TABLE_NAME}Table.id, id))
        .returning();

      if (!result.length) {
        return c.json({ error: "Record not found" }, 404);
      }

      return c.json({ data: result[0] });
    } catch (error) {
      console.error("Error partially updating {TABLE_NAME}:", error);

      if (error.message?.includes("UNIQUE constraint")) {
        return c.json({ error: "Record with this data already exists" }, 409);
      }

      return c.json({ error: "Failed to update record" }, 500);
    }
  })

  // DELETE /api/{TABLE_NAME}/:id - Delete record
  .delete("/:id{[0-9]+}", async (c) => {
    try {
      const db = c.var.db;
      const id = Number.parseInt(c.req.param("id"));

      if (isNaN(id)) {
        return c.json({ error: "Invalid ID format" }, 400);
      }

      const result = await db
        .delete({TABLE_NAME}Table)
        .where(eq({TABLE_NAME}Table.id, id))
        .returning();

      if (!result.length) {
        return c.json({ error: "Record not found" }, 404);
      }

      return c.json({
        message: "Record deleted successfully",
        data: result[0]
      });
    } catch (error) {
      console.error("Error deleting {TABLE_NAME}:", error);

      // Handle foreign key constraints
      if (error.message?.includes("FOREIGN KEY constraint")) {
        return c.json({
          error: "Cannot delete record due to existing references"
        }, 409);
      }

      return c.json({ error: "Failed to delete record" }, 500);
    }
  });
```

## Usage Instructions

### 1. Generate Route Handler

To generate a route handler for your table:

1. **Replace all placeholders** with your actual table name and schema imports
2. **Ensure your Zod schemas** are properly defined with appropriate validation rules
3. **Update field references** in sorting and filtering logic if needed
4. **Test each endpoint** to ensure proper functionality

### 2. Integration Example

```typescript
// In your main app file
import { {TABLE_NAME}Route } from "./routes/{TABLE_NAME}";

const app = new Hono()
  .route("/api/{TABLE_NAME}", {TABLE_NAME}Route);
```

### 3. Response Format

All endpoints return consistent JSON responses:

- **Success**: `{ data: T }` or `{ data: T[], pagination: {...} }`
- **Error**: `{ error: string }`
- **Delete**: `{ message: string, data: T }`

## Best Practices Included

✅ **Type Safety**: Full TypeScript and Zod validation  
✅ **Error Handling**: Comprehensive error catching with appropriate HTTP status codes  
✅ **Input Validation**: ID format validation and required field checking  
✅ **Database Constraints**: Proper handling of unique and foreign key constraints  
✅ **Pagination**: Built-in pagination with configurable limits  
✅ **Sorting**: Flexible sorting with ASC/DESC options  
✅ **Partial Updates**: PATCH endpoint for partial record updates  
✅ **Security**: Input sanitization and parameter validation  
✅ **Logging**: Error logging for debugging  
✅ **RESTful Design**: Proper HTTP methods and status codes

## Common Customizations

### Add Search/Filtering

```typescript
// Add to GET / endpoint
const { search, status } = c.req.query();
let query = db.select().from({TABLE_NAME}Table);

if (search) {
  query = query.where(sql`name LIKE ${`%${search}%`}`);
}
if (status) {
  query = query.where(eq({TABLE_NAME}Table.status, status));
}
```

### Add Soft Delete

```typescript
// In DELETE endpoint, instead of actual delete:
const result = await db
  .update({TABLE_NAME}Table)
  .set({ deletedAt: new Date() })
  .where(eq({TABLE_NAME}Table.id, id))
  .returning();
```
