import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./lib/__tests__/setup.ts'],
    // Zod 4's `export { z }` re-export pattern breaks under vitest's
    // module transformation - force vitest to use the CJS entry instead.
    server: {
      deps: {
        inline: ['zod'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'lib/clinical/**/*.ts',
        'lib/security/**/*.ts',
      ],
      exclude: [
        'lib/__tests__/**',
        '**/*.d.ts',
        '**/types/**',
        // Barrel re-export files (no logic to test)
        'lib/clinical/index.ts',
        // Server-only modules requiring DB/Redis/external APIs - tested via E2E
        'lib/security/audit-log.ts',
        'lib/security/rate-limit.ts',
        'lib/security/phi-field-wrappers.ts',
        'lib/security/sanitize-audit.ts',
        'lib/security/csrf-client.ts',
        'lib/security/fraud-detector.ts',
        'lib/security/immutable-dates.ts',
        'lib/clinical/decision-support.ts',
        'lib/clinical/approval-invariants.ts',
        'lib/clinical/consent-versioning.ts',
        'lib/clinical/execute-cert-approval.ts',
        'lib/clinical/pbs-client.ts',
        'lib/clinical/triage-types.ts',
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
