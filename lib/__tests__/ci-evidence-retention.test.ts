import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"

import { describe, expect, it } from "vitest"

import { getCiPlaywrightGlobalTimeout } from "@/e2e/helpers/ci-time-budget"

const require = createRequire(import.meta.url)
const workflow = readFileSync(join(process.cwd(), ".github/workflows/ci.yml"), "utf8")
const config = readFileSync(join(process.cwd(), "playwright.config.ts"), "utf8")

function suitePaths(suite: string) {
  const report = `playwright-report/${suite}`
  const output = `test-results/${suite}`
  expect(workflow).toContain(report)
  expect(workflow).toContain(output)
  return { report, output }
}

async function interruptStartedSuite(args: string[], cwd: string) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { NODE_ENV: "test", PATH: process.env.PATH, HOME: process.env.HOME, CI: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  })
  let output = ""
  let spawnError: Error | undefined
  let result: { code: number | null; signal: NodeJS.Signals | null } | undefined
  child.stdout.on("data", (data) => { output += data.toString() })
  child.stderr.on("data", (data) => { output += data.toString() })
  child.on("error", (error) => { spawnError = error })
  const closed = new Promise<void>((resolve) => {
    child.once("close", (code, signal) => {
      result = { code, signal }
      resolve()
    })
  })
  const waitFor = async (condition: () => boolean, timeout: number, message: string) => {
    const deadline = performance.now() + timeout
    while (!condition()) {
      if (spawnError) throw spawnError
      if (performance.now() >= deadline) throw new Error(`${message}\n${output}`)
      await delay(25)
    }
  }
  try {
    await waitFor(() => {
      if (result) throw new Error(`Synthetic suite exited before entering its test: ${result.code}\n${output}`)
      return existsSync(join(cwd, "test-started"))
    }, 20000, "Synthetic suite did not enter its test before the startup watchdog")
    // Interrupt only after test.step has started; CLI/worker startup is not the signal.
    expect(child.kill("SIGINT")).toBe(true)
    await waitFor(() => result !== undefined, 10000, "Interrupted suite did not finish its reporters")
    expect(spawnError).toBeUndefined()
    return { ...result!, output }
  } finally {
    if (!result) {
      child.kill("SIGKILL")
      await Promise.race([closed, delay(5000)])
    }
  }
}

describe("CI diagnostic evidence retention", () => {
  it("runs the isolated prescribing workspace before application secrets and retains its artifacts", () => {
    const harness = workflow.indexOf("- name: Prescribing workspace browser regression")
    expect(harness).toBeGreaterThan(workflow.indexOf("- name: Restored checkout review and recovery browser regression"))
    expect(harness).toBeLessThan(workflow.indexOf("- name: Verify required E2E secrets"))
    const step = workflow.slice(harness, workflow.indexOf("- name: Verify required E2E secrets"))
    expect(step).toContain("timeout-minutes: 5")
    expect(step).toContain("node scripts/test-parchment-workspace-browser.mjs --output-dir=test-results/parchment-workspace")
    expect(step).not.toContain("secrets.")
    const traceUpload = workflow.slice(workflow.indexOf("- name: Upload test traces"))
    expect(traceUpload).toContain("if: always()")
    expect(traceUpload).toContain("path: test-results/")
  })

  it("isolates all five invocations and uploads traces after passing retries", () => {
    for (const suite of ["ops", "medcert", "paid-clinical", "paid-clinical-mobile", "checkout-resume"]) {
      suitePaths(suite)
    }
    expect(config).toContain('outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || "test-results"')
    const traceUpload = workflow.slice(workflow.indexOf("- name: Upload test traces"))
    expect(traceUpload).toContain("if: always()")
    expect(traceUpload).toContain("path: test-results/")
    expect(traceUpload).not.toContain("if: failure()")
  })

  it("reserves three minutes for reports within the measured suite runtime allowance", () => {
    const e2e = workflow.slice(workflow.indexOf("  e2e:"))
    expect(e2e).toContain("timeout-minutes: 65")
    expect(e2e).toContain("PLAYWRIGHT_CI_DEADLINE_MS")
    expect(e2e).toContain("62 * 60")
    expect(config).toContain("globalTimeout: getCiPlaywrightGlobalTimeout()")
  })

  it("leaves runs without a shared CI deadline unchanged", () => {
    expect(getCiPlaywrightGlobalTimeout(undefined, 1000)).toBeUndefined()
    expect(getCiPlaywrightGlobalTimeout("5000", 1000)).toBe(4000)
  })

  it.each(["", "invalid", "0", "1"])("fails closed for an invalid or exhausted browser budget (%s)", (deadline) => {
    expect(() => getCiPlaywrightGlobalTimeout(deadline, 1000)).toThrow(/browser evidence deadline|browser test budget exhausted/i)
  })

  it("finishes an interrupted suite with reports and traces before the runner is killed", async () => {
    const temporary = mkdtempSync(join(tmpdir(), "instantmed-ci-deadline-"))
    try {
      const playwright = JSON.stringify(require.resolve("@playwright/test"))
      const budget = JSON.stringify(join(process.cwd(), "e2e/helpers/ci-time-budget.ts"))
      writeFileSync(join(temporary, "playwright.config.cjs"), `
        const { defineConfig } = require(${playwright});
        const { getCiPlaywrightGlobalTimeout } = require(${budget});
        module.exports = defineConfig({
          testDir: '.', workers: 1, retries: 0, timeout: 60000,
          globalTimeout: getCiPlaywrightGlobalTimeout(),
          outputDir: 'test-results/paid-clinical',
          reporter: [['html', { open: 'never', outputFolder: 'playwright-report/paid-clinical' }],
            ['json', { outputFile: 'attempts.json' }]],
          use: { trace: 'retain-on-failure' }
        });
      `)
      writeFileSync(join(temporary, "hung.spec.cjs"), `
        const { test } = require(${playwright});
        const { writeFileSync } = require('node:fs');
        test('synthetic interrupted attempt', async () => {
          await test.step('wait for the runner interruption', async () => {
            writeFileSync('test-started', 'ready');
            await new Promise(() => {});
          });
        });
      `)
      const args = [require.resolve("@playwright/test/cli"), "test", "--config=playwright.config.cjs", "hung.spec.cjs"]
      const run = await interruptStartedSuite(args, temporary)
      expect(run.code, run.output).toBe(130)
      expect(run.signal).toBeNull()
      const reportPath = join(temporary, "playwright-report/paid-clinical/index.html")
      const report = readFileSync(reportPath)
      const attempts = JSON.parse(readFileSync(join(temporary, "attempts.json"), "utf8"))
      const attempt = attempts.suites[0].specs[0].tests[0].results[0]
      expect(attempt.status).toBe("interrupted")
      const trace = attempt.attachments.find((attachment: { name: string }) => attachment.name === "trace")
      expect(trace).toBeDefined()
      expect(readFileSync(trace.path).length).toBeGreaterThan(0)

      const later = spawnSync(process.execPath, args, {
        cwd: temporary,
        encoding: "utf8",
        env: { NODE_ENV: "test", PATH: process.env.PATH, PLAYWRIGHT_CI_DEADLINE_MS: "1" },
      })
      expect(later.status).toBe(1)
      expect(later.stderr).toMatch(/browser test budget exhausted/i)
      expect(readFileSync(reportPath)).toEqual(report)
    } finally {
      rmSync(temporary, { recursive: true, force: true })
    }
  }, 40000)

  it.each([[0, 0], [6000, 0], [0, 6000]])("preserves timeout reports (worker startup: %ims, cleanup: %ims)", (workerStartupMs, cleanupMs) => {
    const temporary = mkdtempSync(join(tmpdir(), "instantmed-ci-deadline-"))
    try {
      const playwright = JSON.stringify(require.resolve("@playwright/test"))
      const budget = JSON.stringify(join(process.cwd(), "e2e/helpers/ci-time-budget.ts"))
      writeFileSync(join(temporary, "playwright.config.cjs"), `
        const { defineConfig } = require(${playwright});
        const { getCiPlaywrightGlobalTimeout } = require(${budget});
        module.exports = defineConfig({
          testDir: '.', workers: 1, retries: 0, timeout: 60000,
          globalTimeout: getCiPlaywrightGlobalTimeout(
            process.env.PLAYWRIGHT_CI_DEADLINE_MS ?? String(Date.now() + 5000)
          ),
          outputDir: 'test-results/paid-clinical',
          reporter: [['html', { open: 'never', outputFolder: 'playwright-report/paid-clinical' }],
            ['json', { outputFile: 'attempts.json' }]],
          use: { trace: 'retain-on-failure' }
        });
      `)
      writeFileSync(join(temporary, "hung.spec.cjs"), `
        const { test } = require(${playwright});
        const { writeFileSync } = require('node:fs');
        if (process.env.TEST_WORKER_INDEX !== undefined && ${workerStartupMs} > 0) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${workerStartupMs});
        }
        if (${cleanupMs} > 0) {
          test.afterEach(async () => { await new Promise(resolve => setTimeout(resolve, ${cleanupMs})); });
        }
        test('synthetic interrupted attempt', async () => {
          writeFileSync('test-started', 'started');
          await test.step('wait beyond the browser budget', async () => {
            await new Promise(() => {});
          });
        });
      `)
      const args = [require.resolve("@playwright/test/cli"), "test", "--config=playwright.config.cjs", "hung.spec.cjs"]
      const run = spawnSync(process.execPath, args, {
        cwd: temporary,
        encoding: "utf8",
        timeout: 12000,
        env: { NODE_ENV: "test", PATH: process.env.PATH, HOME: process.env.HOME, CI: "1" },
      })
      expect(run.error).toBeUndefined()
      expect(run.status, run.stdout + run.stderr).toBe(1)
      const reportPath = join(temporary, "playwright-report/paid-clinical/index.html")
      const report = readFileSync(reportPath)
      const attempts = JSON.parse(readFileSync(join(temporary, "attempts.json"), "utf8"))
      expect(report.length).toBeGreaterThan(0)
      expect(attempts.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.stringMatching(/Timed out waiting .+ to run/) }),
      ]))
      const results = attempts.suites[0].specs[0].tests[0].results
      const started = existsSync(join(temporary, "test-started"))
      // Reporters can finish before a worker reports its final status and trace.
      // A body-start marker does not turn the runner's default skipped result into interruption proof.
      if (results.some((attempt: { status: string }) => attempt.status === "interrupted")) {
        expect(results).toHaveLength(1)
        const attempt = results[0]
        expect(attempt.status).toBe("interrupted")
        const trace = attempt.attachments.find((attachment: { name: string }) => attachment.name === "trace")
        expect(trace).toBeDefined()
        expect(readFileSync(trace.path).length).toBeGreaterThan(0)
      } else {
        expect(results.every((attempt: { status: string }) => attempt.status === "skipped")).toBe(true)
      }
      if (workerStartupMs > 0) expect(started).toBe(false)

      const later = spawnSync(process.execPath, args, {
        cwd: temporary,
        encoding: "utf8",
        env: { NODE_ENV: "test", PATH: process.env.PATH, PLAYWRIGHT_CI_DEADLINE_MS: "1" },
      })
      expect(later.status).toBe(1)
      expect(later.stderr).toMatch(/browser test budget exhausted/i)
      expect(readFileSync(reportPath)).toEqual(report)
    } finally {
      rmSync(temporary, { recursive: true, force: true })
    }
  }, 15000)

  it.each([[0, 0], [1, 0], [0, 1], [1, 1]])(
    "runs both paid viewports and preserves failure (desktop=%i, mobile=%i)",
    (desktopStatus, mobileStatus) => {
      const step = workflow.split("- name: Run non-medcert paid critical E2E flows (Chromium)")[1]
        .split("- name: Run signed guest resume safety E2E (Chromium)")[0]
      const shell = step.split("        run: |\n")[1].replace(/^ {10}/gm, "")
      const result = spawnSync("bash", ["-e", "-c", `
        calls=0
        pnpm() {
          printf '%s|%s\\n' "$PLAYWRIGHT_HTML_OUTPUT_DIR" "$PLAYWRIGHT_OUTPUT_DIR"
          calls=$((calls + 1))
          if [ "$calls" = 1 ]; then return "$DESKTOP_STATUS"; fi
          return "$MOBILE_STATUS"
        }
        ${shell}
      `], {
        encoding: "utf8",
        env: {
          NODE_ENV: "test",
          PATH: process.env.PATH,
          PLAYWRIGHT_HTML_OUTPUT_DIR: step.match(/PLAYWRIGHT_HTML_OUTPUT_DIR: (.+)/)![1],
          PLAYWRIGHT_OUTPUT_DIR: step.match(/PLAYWRIGHT_OUTPUT_DIR: (.+)/)![1],
          DESKTOP_STATUS: String(desktopStatus),
          MOBILE_STATUS: String(mobileStatus),
        },
      })
      expect(result.status).toBe(desktopStatus || mobileStatus)
      expect(result.stdout.trim().split("\n")).toEqual([
        "playwright-report/paid-clinical|test-results/paid-clinical",
        "playwright-report/paid-clinical-mobile|test-results/paid-clinical-mobile",
      ])
    },
  )

  it("retains completed reports and a failed attempt trace after successful and timed-out suites", () => {
    const first = suitePaths("ops")
    const second = suitePaths("medcert")
    const temporary = mkdtempSync(join(tmpdir(), "instantmed-ci-evidence-"))
    try {
      // Only synthetic assertions: no browser, app config, environment loader or providers.
      const playwright = JSON.stringify(require.resolve("@playwright/test"))
      writeFileSync(join(temporary, "playwright.config.cjs"), `
        const { defineConfig } = require(${playwright});
        module.exports = defineConfig({
          testDir: '.', workers: 1, retries: 1,
          globalTimeout: process.env.INSTANTMED_EVIDENCE_TIMEOUT === '1' ? 1000 : 0,
          outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || 'test-results',
          reporter: [['html', { open: 'never' }], ['json', { outputFile: 'attempts.json' }]],
          use: { trace: 'retain-on-failure' }
        });
      `)
      writeFileSync(join(temporary, "first.spec.cjs"), `
        const { test, expect } = require(${playwright});
        test('synthetic retry evidence', async ({}, info) => {
          await test.step('synthetic first attempt failure', async () => {
            expect(info.retry).toBe(1);
          });
        });
      `)
      writeFileSync(join(temporary, "second.spec.cjs"), `
        const { test, expect } = require(${playwright});
        test('synthetic later suite', async () => { expect(true).toBe(true); });
      `)
      writeFileSync(join(temporary, "timeout.spec.cjs"), `
        const { test } = require(${playwright});
        test('synthetic later timeout', async () => { await new Promise(() => {}); });
      `)
      const runSuite = (spec: string, paths: ReturnType<typeof suitePaths>) => {
        const run = spawnSync(process.execPath, [join(dirname(require.resolve("playwright/package.json")), "cli.js"), "test", "--config=playwright.config.cjs", spec], {
          cwd: temporary,
          env: {
            NODE_ENV: "test",
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            CI: "1",
            PLAYWRIGHT_HTML_OUTPUT_DIR: paths.report,
            PLAYWRIGHT_OUTPUT_DIR: paths.output,
          },
          encoding: "utf8",
        })
        expect(run.error).toBeUndefined()
        expect(run.status, run.stdout + run.stderr).toBe(0)
        return JSON.parse(readFileSync(join(temporary, "attempts.json"), "utf8"))
      }
      const firstRun = runSuite("first.spec.cjs", first)
      const attempts = firstRun.suites[0].specs[0].tests[0].results
      expect(attempts.map((attempt: { status: string }) => attempt.status)).toEqual(["failed", "passed"])
      const trace = attempts[0].attachments.find((attachment: { name: string }) => attachment.name === "trace")
      expect(trace).toBeDefined()
      const traceBefore = readFileSync(trace.path)
      const reportBefore = readFileSync(join(temporary, first.report, "index.html"))
      expect(traceBefore.length).toBeGreaterThan(0)

      const secondRun = runSuite("second.spec.cjs", second)
      expect(secondRun.stats.expected).toBe(1)
      expect(readFileSync(trace.path)).toEqual(traceBefore)
      expect(readFileSync(join(temporary, first.report, "index.html"))).toEqual(reportBefore)
      expect(readFileSync(join(temporary, second.report, "index.html")).length).toBeGreaterThan(0)
      expect(readdirSync(join(temporary, first.report, "data")).some((name) => name.endsWith(".zip"))).toBe(true)

      const secondReport = readFileSync(join(temporary, second.report, "index.html"))
      const timedOut = spawnSync(process.execPath, [require.resolve("@playwright/test/cli"), "test", "--config=playwright.config.cjs", "timeout.spec.cjs"], {
        cwd: temporary,
        encoding: "utf8",
        timeout: 12000,
        env: {
          NODE_ENV: "test", PATH: process.env.PATH, HOME: process.env.HOME, CI: "1",
          INSTANTMED_EVIDENCE_TIMEOUT: "1",
          PLAYWRIGHT_HTML_OUTPUT_DIR: "playwright-report/later-timeout",
          PLAYWRIGHT_OUTPUT_DIR: "test-results/later-timeout",
        },
      })
      expect(timedOut.error).toBeUndefined()
      expect(timedOut.status, timedOut.stdout + timedOut.stderr).toBe(1)
      const timedOutReport = JSON.parse(readFileSync(join(temporary, "attempts.json"), "utf8"))
      expect(timedOutReport.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.stringMatching(/Timed out waiting .+ to run/) }),
      ]))
      expect(readFileSync(join(temporary, "playwright-report/later-timeout/index.html")).length).toBeGreaterThan(0)
      expect(readFileSync(trace.path)).toEqual(traceBefore)
      expect(readFileSync(join(temporary, first.report, "index.html"))).toEqual(reportBefore)
      expect(readFileSync(join(temporary, second.report, "index.html"))).toEqual(secondReport)
    } finally {
      rmSync(temporary, { recursive: true, force: true })
    }
  }, 20000)
})
