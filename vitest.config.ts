import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./lib/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'lib/clinical/**/*.ts',
        'lib/state-machine/**/*.ts',
        'lib/security/**/*.ts',
      ],
      exclude: [
        'lib/__tests__/**',
        '**/*.d.ts',
        '**/types/**',
        // Server-only modules requiring DB/Redis/request context — tested via E2E
        'lib/security/audit-log.ts',
        'lib/security/rate-limit.ts',
        'lib/security/phi-field-wrappers.ts',
        'lib/security/sanitize-audit.ts',
        'lib/security/csrf-client.ts',
        // Barrel re-export files (no logic to test)
        'lib/clinical/index.ts',
        // Server-only: requires PBS client + Supabase
        'lib/clinical/decision-support.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
