import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", ".wrangler"] },
  {
    // 1. Keep standard JS and TypeScript rules
    extends: [js.configs.recommended, ...tseslint.configs.recommended],

    // 2. Target your files
    files: ["**/*.{ts,tsx}"],

    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      // 3. Setup parser for TypeScript
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],

      "@typescript-eslint/strict-boolean-expressions": "off",
    },
  }
);
