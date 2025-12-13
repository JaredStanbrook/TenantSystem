// worker/routes/web/auth.ts
import { Hono } from "hono";

import { Home } from "@server/views/pages/Home";
import { Login } from "@server/views/pages/Login";
import { Register } from "@server/views/pages/Register";
import type { AppEnv } from "../../types";

export const webAuth = new Hono<AppEnv>();

webAuth.get("/", (c) => {
  const { auth } = c.var;

  return c.render(<Home user={auth.user} />, {
    title: "Home",
  });
});

webAuth.get("/register", (c) => {
  const { auth, authConfig } = c.var;
  if (auth.user) return c.redirect("/dashboard");

  const props = {
    methods: Array.from(authConfig.methods),
    roles: authConfig.roles?.available || ["user"],
    defaultRole: authConfig.roles?.default || "user",
  };
  return c.render(<Register {...props} />, {
    title: "Create Account",
  });
});

webAuth.get("/login", (c) => {
  const { auth, authConfig } = c.var;
  if (auth.user) return c.redirect("/dashboard");

  const props = {
    methods: Array.from(authConfig.methods),
  };
  return c.render(<Login {...props} />, {
    title: "Sign In",
  });
});
