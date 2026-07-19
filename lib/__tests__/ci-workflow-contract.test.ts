import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ciWorkflowSource = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
)
const testingDocsSource = readFileSync(join(process.cwd(), "docs/TESTING.md"), "utf8")
const claudeSource = readFileSync(join(process.cwd(), "CLAUDE.md"), "utf8")

function classifyE2EScope(eventName: string, changedFiles: string[]): string {
  const result = spawnSync(
    "bash",
    [join(process.cwd(), "scripts/ci-e2e-required.sh"), eventName],
    {
      encoding: "utf8",
      input: `${changedFiles.join("\n")}\n`,
    },
  )

  expect(result.stderr).toBe("")
  expect(result.status).toBe(0)
  return result.stdout.trim()
}

describe("CI workflow contract", () => {
  it.each(["pull_request", "push"])(
    "skips the shared-fixture E2E gate for a Markdown-only %s",
    (eventName) => {
      expect(classifyE2EScope(eventName, [
        "docs/ROADMAP.md",
        "wiki/architecture.md",
      ])).toBe("false")
    },
  )

  it("fails closed for an unsupported event", () => {
    expect(classifyE2EScope("workflow_dispatch", ["docs/ROADMAP.md"])).toBe("true")
  })

  it.each([
    ["runtime TypeScript", "pull_request", ["lib/email/send-email.ts"]],
    ["runtime MDX", "pull_request", ["content/blog/medical-certificates.mdx"]],
    ["workflow configuration", "pull_request", [".github/workflows/ci.yml"]],
    ["an empty file list", "pull_request", []],
  ])("keeps E2E required for %s", (_label, eventName, changedFiles) => {
    expect(classifyE2EScope(eventName, changedFiles)).toBe("true")
  })

  it("wires the fail-safe scope decision into the shared-fixture E2E job", () => {
    expect(ciWorkflowSource).toContain("e2e-required: ${{ steps.e2e_scope.outputs.required }}")
    expect(ciWorkflowSource).toContain("Classify blocking E2E scope")
    expect(ciWorkflowSource).toContain("bash scripts/ci-e2e-required.sh")
    expect(ciWorkflowSource).toContain(
      "--jq '.[] | .filename, (.previous_filename // empty)'",
    )
    expect(ciWorkflowSource).toContain("git diff --no-renames --name-only")
    expect(ciWorkflowSource).toContain(
      "if: ${{ needs.build.result == 'success' && needs.build.outputs.e2e-required == 'true' }}",
    )
  })

  it("cancels stale same-branch runs before E2E fixtures can race", () => {
    expect(ciWorkflowSource).toContain("concurrency:")
    expect(ciWorkflowSource).toContain("group: ci-${{ github.ref }}")
    expect(ciWorkflowSource).toContain("cancel-in-progress: true")
  })

  it("checks the active Node runtime before install and build", () => {
    expect(ciWorkflowSource).toContain("Check active Node runtime")
    expect(ciWorkflowSource).toContain("run: bash scripts/check-node-runtime.sh")
  })

  it("runs an explicit TypeScript gate before build", () => {
    expect(ciWorkflowSource).toContain("Type-check")
    expect(ciWorkflowSource).toContain("run: pnpm typecheck")
  })

  it("uses the shared release build wrapper so CI and local release checks match", () => {
    expect(ciWorkflowSource).toContain("Restore Next.js build cache")
    expect(ciWorkflowSource).toContain("uses: actions/cache@v5")
    expect(ciWorkflowSource).toContain("path: .next/cache")
    expect(ciWorkflowSource).toContain("Type-check and build (target: 180s, warning: 210s)")
    expect(ciWorkflowSource).toContain("run: pnpm build:release")
  })

  it("passes the field-encryption key into ops E2E runs", () => {
    expect(ciWorkflowSource).toContain("Run ops E2E smoke (Chromium)")
    expect(ciWorkflowSource).toContain("ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}")
  })

  it("enables PHI encryption for every request-flow E2E gate", () => {
    const medCertStepStart = ciWorkflowSource.indexOf("Run med cert readiness E2E gate (Chromium)")
    const paidStepStart = ciWorkflowSource.indexOf("Run non-medcert paid critical E2E flows (Chromium)")
    const resumeStepStart = ciWorkflowSource.indexOf("Run signed guest resume safety E2E (Chromium)")
    const uploadStepStart = ciWorkflowSource.indexOf("Upload test results")
    const requestFlowSteps = [
      ciWorkflowSource.slice(medCertStepStart, paidStepStart),
      ciWorkflowSource.slice(paidStepStart, resumeStepStart),
      ciWorkflowSource.slice(resumeStepStart, uploadStepStart),
    ]

    expect(medCertStepStart).toBeGreaterThan(-1)
    expect(paidStepStart).toBeGreaterThan(medCertStepStart)
    expect(resumeStepStart).toBeGreaterThan(paidStepStart)
    expect(uploadStepStart).toBeGreaterThan(resumeStepStart)

    for (const step of requestFlowSteps) {
      expect(step).toContain("PHI_ENCRYPTION_ENABLED: 'true'")
      expect(step).toContain("PHI_ENCRYPTION_READ_ENABLED: 'true'")
      expect(step).toContain("PHI_ENCRYPTION_WRITE_ENABLED: 'true'")
      expect(step).toContain("PHI_MASTER_KEY: ${{ secrets.ENCRYPTION_KEY }}")
    }
  })

  it("uses focused E2E gates instead of the stale broad Playwright suite", () => {
    expect(ciWorkflowSource).toContain("e2e/admin.ops-index.spec.ts")
    expect(ciWorkflowSource).toContain("e2e/marketing-dashboard-nav.spec.ts")
    expect(ciWorkflowSource).toContain("e2e/dashboard.keyboard-safety.spec.ts")
    expect(ciWorkflowSource).toContain("Run med cert readiness E2E gate (Chromium)")
    expect(ciWorkflowSource).toContain("run: pnpm medcert:readiness:e2e")
    expect(ciWorkflowSource).toContain("Run non-medcert paid critical E2E flows (Chromium)")
    expect(ciWorkflowSource).toContain("e2e/parchment-webhook.spec.ts")
    expect(ciWorkflowSource).not.toMatch(/^\s*run: pnpm exec playwright test --project=chromium\s*$/m)
  })

  it("keeps the documented blocking browser smoke list aligned with CI", () => {
    const blockingBrowserSpecs = [
      "e2e/admin.ops-index.spec.ts",
      "e2e/marketing-dashboard-nav.spec.ts",
      "e2e/dashboard.keyboard-safety.spec.ts",
    ]

    for (const spec of blockingBrowserSpecs) {
      expect(testingDocsSource).toContain(spec)
      expect(claudeSource).toContain(spec)
    }
  })

  it("fails the paid-flow E2E gate when webhook secrets are missing", () => {
    expect(ciWorkflowSource).toContain("Verify required E2E secrets")
    expect(ciWorkflowSource).toContain("STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}")
    expect(ciWorkflowSource).toContain("PARCHMENT_WEBHOOK_SECRET: ${{ secrets.PARCHMENT_WEBHOOK_SECRET }}")
    expect(ciWorkflowSource).toContain("is required for the paid-flow E2E gate")
  })

  it("does not allow protected-branch E2E to be skipped by a repository variable", () => {
    expect(ciWorkflowSource).not.toContain("vars.E2E_ENABLED")
    expect(ciWorkflowSource).not.toMatch(/^\s*if:\s*\$\{\{\s*vars\.E2E_ENABLED/m)
    expect(ciWorkflowSource).toContain("Verify required E2E secrets")
    expect(ciWorkflowSource).toContain("E2E_SECRET: ${{ secrets.E2E_SECRET }}")
    expect(ciWorkflowSource).toContain("SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}")
  })

  it("keeps paid critical E2E blocking instead of warning-only", () => {
    const medCertStepStart = ciWorkflowSource.indexOf("Run med cert readiness E2E gate (Chromium)")
    const paidStepStart = ciWorkflowSource.indexOf("Run non-medcert paid critical E2E flows (Chromium)")
    const uploadStepStart = ciWorkflowSource.indexOf("Upload test results")
    const medCertStep = ciWorkflowSource.slice(medCertStepStart, paidStepStart)
    const paidStep = ciWorkflowSource.slice(paidStepStart, uploadStepStart)

    expect(medCertStepStart).toBeGreaterThan(-1)
    expect(paidStepStart).toBeGreaterThan(-1)
    expect(uploadStepStart).toBeGreaterThan(paidStepStart)
    expect(medCertStep).toContain("pnpm medcert:readiness:e2e")
    expect(medCertStep).not.toContain("continue-on-error")
    expect(paidStep).toContain("e2e/parchment-webhook.spec.ts")
    expect(paidStep).not.toContain("continue-on-error")
  })
})
