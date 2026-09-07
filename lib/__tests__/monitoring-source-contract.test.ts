import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")
describe("production probe coverage and monitor contract", () => {
  it("requests two-hour off-hour browser cadence", () => {
    expect(read(".github/workflows/prod-request-flow-synthetic.yml")).toContain('cron: "17 */2 * * *"')
  })
  it("matches the observer's exact workflow, effective job name and executing browser step", () => {
    // The provider-boundary tests use these exact identities too, so a change
    // to either the workflow or its consumer must preserve this contract.
    const contract = { file: "prod-request-flow-synthetic.yml", job: "request-flow-synthetic", step: "Run production request-flow synthetic" }
    const workflow = read(`.github/workflows/${contract.file}`)
    const jobs = workflow.split(/^jobs:\s*$/m)[1]
    expect(jobs.match(/^ {2}[\w-]+:$/gm)).toEqual([`  ${contract.job}:`])
    // A job-level display name overrides the key returned by the Jobs API.
    const displayName = jobs.match(/^ {4}name: (.+)$/m)?.[1]
    expect(displayName ?? contract.job).toBe(contract.job)
    const steps = jobs.split(/^ {6}- /m).slice(1)
    const browserSteps = steps.filter(step => step.startsWith(`name: ${contract.step}\n`))
    expect(browserSteps).toHaveLength(1)
    expect(browserSteps[0]).toContain("E2E_BASE_URL: https://instantmed.com.au")
    const command = browserSteps[0].match(/^ {8}run: >\n((?: {10}.+\n?)+)/m)?.[1].trim().replace(/\s+/g, " ")
    expect(command).toBe("pnpm exec playwright test --fail-on-flaky-tests --config=playwright.preview.config.ts --project=chromium e2e/prod-request-flow-synthetic.spec.ts")
  })
  it("retains the independent five-minute observer and six-hour freshness threshold", () => {
    const config = JSON.parse(read("vercel.json"))
    expect(config.crons).toContainEqual({
      path: "/api/cron/health-check",
      schedule: "*/5 * * * *",
    })
    expect(read("lib/monitoring/browser-evidence.ts")).toContain("const FRESHNESS_MS = 360 * 60000")
    expect(read(".github/workflows/prod-request-flow-synthetic.yml")).toContain("timeout-minutes: 8")
  })
  it("retains seven entry-flow cases and local draft/analytics isolation", () => {
    const spec = read("e2e/prod-request-flow-synthetic.spec.ts")
    expect(spec.match(/\btest\("/g)).toHaveLength(7)
    expect(spec).toContain("installProductionSyntheticIsolation(page)")
    const helper = read("e2e/helpers/production-synthetic-isolation.ts")
    expect(helper).toContain("/api/draft")
    expect(helper).toContain("/ingest")
  })
  it("keeps section failures unknown in the response and Telegram independent", () => {
    const route = read("app/api/cron/business-alerts/route.ts")
    expect(route).toContain("failed_payments: failedPayments,")
    expect(route).not.toContain("failed_payments: failedPayments ?? 0")
    expect(route).toContain("const criticalAlerts = alerts.filter")
    expect(route).toContain("shouldSendCriticalAlert(alert.detail")
    expect(route).toContain("recordCriticalAlertSent(alert.detail")
    expect(route).toContain("trackBusinessMetric({")
  })
})
