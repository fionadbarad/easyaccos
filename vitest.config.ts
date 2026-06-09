import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Git worktree + scratch dirs hold stale duplicate copies of the suite;
    // exclude them so vitest reports the real project's tests, not N× inflated.
    exclude: [...configDefaults.exclude, '**/.claude/**', '**/.claire/**', '**/.clone/**', '**/scratch/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
