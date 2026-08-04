import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintPluginPrettierRecommended,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // `npm run lint` is deliberately unscoped so that root-level config
    // (next.config.ts, middleware.ts, vitest.config.ts) is linted too. The cost
    // of that is eslint walking whatever else sits in the working tree, and a
    // Windows/OneDrive checkout accumulates `.next - Copy`, `.next - Copy (2)`
    // … — hundreds of MB of build output each. Flat config does not read
    // .gitignore, so these have to be named here or a local lint takes ~8
    // minutes instead of seconds. CI never sees them; the developer does.
    '.next*/**',
    'coverage/**',
    // Orphan source copies left by agent worktrees. Linting a second, stale
    // copy of src/ reports errors against files nobody is editing.
    '.clone/**',
    '.claire/**',
    'scratch/**',
  ]),
  {
    rules: {
      '@next/next/no-img-element': 'error',
      // The base rule cannot read TypeScript function-type parameters, so it
      // flags the parameter names in signatures like `(v: string) => void` as
      // unused. Defer entirely to the TypeScript-aware rule.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // src/lib/monitor.ts exists so that failures are reported somewhere a
      // person will look. Thirteen sites bypassed it with a raw console call —
      // including every HMRC route, which is to say the errors that mattered
      // most went to a serverless log nobody reads.
      //
      // An error rather than a warning: a warning here is a note that the rule
      // is being broken, which is what the situation already was.
      'no-console': 'error',
    },
  },
  {
    // The monitor is the one place a console call belongs — it IS the sink.
    // Tests may assert on console output, and config files run outside the app.
    files: ['src/lib/monitor.ts', '**/__tests__/**', '*.config.{js,mjs,ts}', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },
])

export default eslintConfig
