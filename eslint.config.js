import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";

// Two runtimes live in this repo, so the config is split by path instead of
// maintaining a hand-picked global list (which is what broke `no-undef) —
// client code runs in the browser, server code runs on Node.
//
// `ecmaVersion: 2022` already teaches ESLint every ES2022 built-in, so the
// globals objects only need to supply the host APIs for each runtime.
// `globals.node` (v14) covers the Web APIs CI's Node 18/20 provides natively:
// fetch, URLSearchParams, AbortSignal, Blob, structuredClone, and friends.

const sharedRules = {
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  "no-console": "off",
  "no-empty": ["error", { allowEmptyCatch: true }],
  "no-constant-condition": ["error", { checkLoops: false }],
};

export default [
  js.configs.recommended,
  {
    files: ["client/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { react },
    rules: {
      // This app builds with Vite's classic JSX transform (no plugin-react),
      // so `React` is genuinely referenced by every JSX element and every
      // component rendered in JSX counts as a use. These two rules teach
      // no-unused-vars about JSX rather than muting the rule.
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      ...sharedRules,
    },
  },
  {
    files: ["server/**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
      parserOptions: {
        ecmaFeatures: { jsx: false },
      },
    },
    rules: { ...sharedRules },
  },
  {
    ignores: [
      "client/dist/**",
      "server/node_modules/**",
      "client/node_modules/**",
      // Vite's pre-bundle cache and local agent scratch files are gitignored
      // build artifacts, not source — never lint them.
      "client/.vite/**",
      ".freebuff/**",
      "*.config.js",
      "server/services/Untitled-1.py",
    ],
  },
];
