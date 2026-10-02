import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["libs/**", "_site/**", "test-results/**", "playwright-report/**", "visual-artifacts/**"],
  },
  js.configs.recommended,
  {
    files: ["js/**/*.js", "e2e/**/*.js", "tests/**/*.js", "scripts/**/*.mjs", "playwright.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-console": ["error", { allow: ["error"] }],
    },
  },
];
