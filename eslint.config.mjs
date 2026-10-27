import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "dist/**",
      "release/**",
      "node_modules/**",
      "src/renderer/vendor/**",
      "src/renderer/styles/app.bundle.css",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/main/**/*.ts", "src/preload/**/*.ts"],
    languageOptions: { globals: globals.node },
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Electron/ODBC errors are mapped to safe application messages without retaining driver details.
      "preserve-caught-error": "off",
    },
  },
  {
    files: ["src/renderer/**/*.js"],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["tests/**/*.js", "scripts/**/*.js"],
    languageOptions: { globals: globals.node },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // Encoding repair intentionally contains unusual Unicode sequences as replacement targets.
    files: ["scripts/fix-source-encoding.js"],
    rules: { "no-irregular-whitespace": "off" },
  }
);
