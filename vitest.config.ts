import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      // EasyAcco is a UK-only service, and its date rules are UK rules: the
      // tax year turns at 6 April, and "today" means the user's UK calendar
      // date. Tests that assert those rules have to run in that timezone or
      // they assert something else.
      //
      // Without this, dates.test.ts passed on a London laptop and failed on
      // CI's UTC runner — the very BST off-by-one it was written to catch,
      // reappearing in the test rather than the code. Pinning it makes the
      // suite deterministic everywhere instead of agreeing with whichever
      // machine happened to run it.
      TZ: 'Europe/London',
    },
    // Git worktree + scratch dirs hold stale duplicate copies of the suite;
    // exclude them so vitest reports the real project's tests, not N× inflated.
    exclude: [
      ...configDefaults.exclude,
      '**/.claude/**',
      '**/.claire/**',
      '**/.clone/**',
      '**/scratch/**',
    ],
    // Coverage is a ratchet on the logic core, not a target for the whole
    // tree: thresholds apply to src/lib/** only, where CLAUDE.md asks new work
    // to match the strongest part of the codebase. A global threshold would
    // push toward testing presentational .tsx for the number's sake — the
    // habit this repo has deliberately chosen against (TST-10). Values sit
    // just under the measured baseline (79.7/76.8/73.7/83.0 at introduction);
    // raise them as the real numbers rise, never lower them to merge.
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      reporter: ['text-summary', 'text'],
      thresholds: {
        statements: 75,
        branches: 72,
        functions: 70,
        lines: 78,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
