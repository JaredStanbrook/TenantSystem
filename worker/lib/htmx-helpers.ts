import { Context } from "hono";
import type { HtmlEscapedString } from "hono/utils/html";
import { setCookie } from "hono/cookie";
import { set } from "zod";

type Renderable = string | HtmlEscapedString | Promise<HtmlEscapedString>;
/**
 * Check if the request is an HTMX request
 */
export const isHtmxRequest = (c: Context): boolean => {
  return c.req.header("HX-Request") === "true";
};

/**
 * Return HTML fragment for HTMX or full page for regular requests
 */
export const htmxResponse = async (
  c: Context,
  title: string,
  fragment: Renderable,
  fullPage?: Renderable
) => {
  if (c.req.header("HX-Request")) {
    return c.html(fragment);
  }

  if (fullPage) {
    return c.html(fullPage);
  }
  return c.render(fragment, { title });
};

/**
 * Trigger HTMX client-side events
 */
export const htmxTrigger = (c: Context, events: string | Record<string, any>) => {
  const triggerValue = typeof events === "string" ? events : JSON.stringify(events);
  c.header("HX-Trigger", triggerValue);
};

/**
 * Push a new URL to browser history
 */
export const htmxPushUrl = (c: Context, url: string) => {
  c.header("HX-Push-Url", url);
};

/**
 * Redirect with HTMX
 */
export const htmxRedirect = (c: Context, url: string) => {
  c.header("HX-Redirect", url);
  return c.body(null, 200);
};

/**
 * Send toast notification via HTMX event that triggers the Lit toast component
 */
export const htmxToast = (
  c: Context,
  message: string,
  options?: {
    description?: string;
    type?: "success" | "error" | "info" | "warning";
    duration?: number;
  }
) => {
  const { description, type = "success", duration = 4000 } = options || {};

  htmxTrigger(c, {
    toast: {
      message,
      description,
      type,
      duration,
    },
  });
};

export const flashToast = (
  c: Context,
  message: string,
  options?: {
    description?: string;
    type?: "success" | "error" | "info" | "warning";
    duration?: number;
  }
) => {
  const { description, type = "success", duration = 4000 } = options || {};
  setCookie(
    c,
    "flash-toast",
    JSON.stringify({
      toast: {
        message,
        description,
        type,
        duration,
      },
    }),
    {
      httpOnly: false,
      path: "/",
      maxAge: 5,
    }
  );
};
// Example usage in your routes:
/*
import { PropertyTable, PropertyForm } from "@/views/properties/PropertyComponents";
import { htmxResponse, htmxToast, htmxPushUrl, isHtmxRequest } from "@/lib/htmx-helpers";

// List properties
app.get("/admin/properties", async (c) => {
  const properties = await db.query.properties.findMany();
  
  const fragment = PropertyTable({ properties });
  
  // Returns just the table for HTMX, or full page for direct visits
  return htmxResponse(c, fragment);
});

// Show create form
app.get("/admin/properties/create", async (c) => {
  const fragment = PropertyForm({
    action: "/admin/properties",
  });
  
  return htmxResponse(c, fragment);
});

// Create property
app.post("/admin/properties", async (c) => {
  try {
    const body = await c.req.parseBody();
    
    // Validate and create property
    const newProperty = await db.insert(properties).values(body).returning();
    
    // Get updated list
    const allProperties = await db.query.properties.findMany();
    const fragment = PropertyTable({ properties: allProperties });
    
    // Add success toast
    htmxToast(c, "Property created successfully!", {
      description: `${body.nickname || body.addressLine1} has been added to your portfolio.`,
      type: "success"
    });
    
    // Update URL to properties list
    htmxPushUrl(c, "/admin/properties");
    
    return htmxResponse(c, fragment);
  } catch (error) {
    // Return form with errors
    const fragment = PropertyForm({
      prop: body,
      action: "/admin/properties",
      errors: { addressLine1: ["This field is required"] }
    });
    
    htmxToast(c, "Failed to create property", {
      description: "Please check the form for errors.",
      type: "error"
    });
    
    return htmxResponse(c, fragment);
  }
});

// Edit property form
app.get("/admin/properties/:id/edit", async (c) => {
  const id = c.req.param("id");
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, id)
  });
  
  if (!property) {
    htmxToast(c, "Property not found", { type: "error" });
    htmxRedirect(c, "/admin/properties");
    return;
  }
  
  const fragment = PropertyForm({
    prop: property,
    action: `/admin/properties/${id}`,
  });
  
  return htmxResponse(c, fragment);
});

// Update property
app.post("/admin/properties/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  
  try {
    await db.update(properties)
      .set(body)
      .where(eq(properties.id, id));
    
    const allProperties = await db.query.properties.findMany();
    const fragment = PropertyTable({ properties: allProperties });
    
    htmxToast(c, "Property updated successfully!", {
      description: "Your changes have been saved.",
      type: "success"
    });
    htmxPushUrl(c, "/admin/properties");
    
    return htmxResponse(c, fragment);
  } catch (error) {
    // Return form with errors
    const property = await db.query.properties.findFirst({
      where: eq(properties.id, id)
    });
    
    const fragment = PropertyForm({
      prop: { ...property, ...body },
      action: `/admin/properties/${id}`,
      errors: {}
    });
    
    htmxToast(c, "Failed to update property", {
      description: "Please try again.",
      type: "error"
    });
    
    return htmxResponse(c, fragment);
  }
});

// Delete property
app.delete("/admin/properties/:id", async (c) => {
  const id = c.req.param("id");
  
  try {
    await db.delete(properties).where(eq(properties.id, id));
    
    // Return empty response - HTMX will remove the row via outerHTML swap
    htmxToast(c, "Property deleted", {
      description: "The property has been removed from your portfolio.",
      type: "success"
    });
    
    return c.body(null, 200);
  } catch (error) {
    htmxToast(c, "Failed to delete property", {
      description: "Please try again.",
      type: "error"
    });
    
    return c.body(null, 500);
  }
});
*/
