import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // The React Compiler rule set (eslint-plugin-react-hooks v6) ships as
    // errors in Next 16, but this codebase predates it. These are surfaced as
    // warnings — still visible in CI logs and editors — rather than blocking
    // the build or forcing a risky blind rewrite of core hooks (the central
    // data hook and the dashboard shell). Fix them incrementally, then promote
    // each back to "error".
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
