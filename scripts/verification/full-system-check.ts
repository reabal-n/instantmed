#!/usr/bin/env npx tsx
/* eslint-disable no-console */

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import {
  type Browser,
  type BrowserContext,
  chromium,
  type Page,
} from "playwright"

type Target = "dev" | "preview" | "production"
type AuthMode = "clean" | "e2e" | "cdp"
type ResultStatus = "pass" | "warn" | "fail" | "skip"
type TestUserType = "operator" | "doctor" | "support" | "patient"

interface CliOptions {
  target: Target
  baseUrl: string
  auth: AuthMode
  cdpUrl?: string
  startServer: boolean
  headed: boolean
  deep: boolean
  includePayments: boolean
  soft: boolean
}

interface CheckResult {
  status: ResultStatus
  area: string
  label: string
  details?: string
  artifact?: string
  metrics?: PageMetrics
}

interface PageProbeOptions {
  area: string
  label: string
  path: string
  viewport: "desktop" | "mobile"
  context: BrowserContext
  baseUrl: string
  outputDir: string
  expectMain?: boolean
  allowRedirectToAuth?: boolean
}

interface BrowserHandle {
  browser: Browser
  context: BrowserContext
  isCdp: boolean
}

interface PageMetrics {
  domContentLoadedMs: number | null
  loadMs: number | null
  responseEndMs: number | null
  firstContentfulPaintMs: number | null
  longTaskCount: number
  maxLongTaskMs: number
  totalLongTaskMs: number
  cumulativeLayoutShift: number
  scrollWidth: number
  clientWidth: number
}

const DEFAULT_DEV_URL = "http://localhost:3060"
const DEFAULT_PRODUCTION_URL = "https://instantmed.com.au"
const OUTPUT_ROOT = ".verification/full-system"

const PUBLIC_ROUTES = [
  { label: "Home", path: "/" },
  { label: "Medical certificate", path: "/medical-certificate" },
  { label: "Prescriptions", path: "/prescriptions" },
  { label: "ED landing", path: "/erectile-dysfunction" },
  { label: "Hair loss landing", path: "/hair-loss" },
  { label: "Request hub", path: "/request" },
  { label: "Pricing", path: "/pricing" },
  { label: "Contact", path: "/contact" },
] as const

const REQUEST_ROUTES = [
  { label: "Med cert request", path: "/request?service=med-cert" },
  { label: "Repeat script request", path: "/request?service=repeat-script" },
  { label: "ED request", path: "/request?service=consult&subtype=ed" },
  { label: "Hair loss request", path: "/request?service=consult&subtype=hair_loss" },
  { label: "Women's health request", path: "/request?service=consult&subtype=womens_health" },
] as const

const PATIENT_ROUTES = [
  { label: "Patient dashboard", path: "/patient" },
  { label: "Patient intakes", path: "/patient/intakes" },
  { label: "Patient prescriptions", path: "/patient/prescriptions" },
  { label: "Patient documents", path: "/patient/documents" },
  { label: "Patient messages", path: "/patient/messages" },
  { label: "Patient settings", path: "/patient/settings" },
  { label: "Patient payment history", path: "/patient/payment-history" },
] as const

const ADMIN_ROUTES = [
  { label: "Staff dashboard", path: "/dashboard" },
  { label: "Review queue", path: "/dashboard?status=review#doctor-queue" },
  { label: "Scripts queue", path: "/dashboard?status=scripts#doctor-queue" },
  { label: "Admin intakes", path: "/admin/intakes" },
  { label: "Admin analytics", path: "/admin/analytics" },
  { label: "Admin finance", path: "/admin/finance" },
  { label: "Admin patients", path: "/admin/patients" },
  { label: "Admin refunds", path: "/admin/refunds" },
  { label: "Admin ops", path: "/admin/ops" },
  { label: "Webhook DLQ", path: "/admin/webhook-dlq" },
  { label: "Parchment ops", path: "/admin/ops/parchment" },
  { label: "Prescribing identity ops", path: "/admin/ops/prescribing-identity" },
  { label: "Email hub", path: "/admin/emails/hub" },
  { label: "Doctor patients", path: "/doctor/patients" },
  { label: "Doctor scripts", path: "/doctor/scripts" },
  { label: "Doctor identity", path: "/doctor/settings/identity" },
  { label: "Admin settings", path: "/admin/settings" },
  { label: "Admin features", path: "/admin/features" },
  { label: "Admin doctors", path: "/admin/doctors" },
  { label: "Admin clinic", path: "/admin/clinic" },
  { label: "Admin services", path: "/admin/services" },
] as const

const DOCTOR_ROUTES = [
  { label: "Doctor dashboard", path: "/dashboard" },
  { label: "Doctor review queue", path: "/dashboard?status=review#doctor-queue" },
  { label: "Doctor scripts queue", path: "/dashboard?status=scripts#doctor-queue" },
  { label: "Doctor patients", path: "/doctor/patients" },
  { label: "Doctor identity", path: "/doctor/settings/identity" },
] as const

const SUPPORT_ROUTES = [
  { label: "Support ops", path: "/admin/ops" },
  { label: "Support intakes", path: "/admin/intakes" },
  { label: "Support webhook DLQ", path: "/admin/webhook-dlq" },
  { label: "Support Parchment ops", path: "/admin/ops/parchment" },
  { label: "Support prescribing identity", path: "/admin/ops/prescribing-identity" },
] as const

const TEST_MEDICARE = {
  number: "2123456701",
  irn: "1",
  expiry: "12/2028",
}

const results: CheckResult[] = []

function record(result: CheckResult) {
  results.push(result)
  const details = result.details ? ` - ${result.details}` : ""
  console.log(`[${result.status.toUpperCase()}] ${result.area}: ${result.label}${details}`)
}

function parseArgs(argv: string[]): CliOptions {
  const flags = new Map<string, string | boolean>()

  for (const rawArg of argv) {
    if (!rawArg.startsWith("--")) continue
    const [key, value] = rawArg.slice(2).split("=", 2)
    flags.set(key, value ?? true)
  }

  const target = String(flags.get("target") || "dev") as Target
  if (!["dev", "preview", "production"].includes(target)) {
    throw new Error("--target must be one of: dev, preview, production")
  }

  const envBaseUrl = process.env.E2E_BASE_URL || process.env.PLAYWRIGHT_BASE_URL
  const baseUrl = String(
    flags.get("base-url") ||
    envBaseUrl ||
    (target === "production" ? DEFAULT_PRODUCTION_URL : DEFAULT_DEV_URL),
  ).replace(/\/$/, "")

  const auth = String(flags.get("auth") || (target === "dev" ? "e2e" : "clean")) as AuthMode
  if (!["clean", "e2e", "cdp"].includes(auth)) {
    throw new Error("--auth must be one of: clean, e2e, cdp")
  }

  return {
    target,
    baseUrl,
    auth,
    cdpUrl: typeof flags.get("cdp-url") === "string" ? String(flags.get("cdp-url")) : undefined,
    startServer: flags.has("start-server"),
    headed: flags.has("headed"),
    deep: flags.has("deep"),
    includePayments: flags.has("include-payments"),
    soft: flags.has("soft"),
  }
}

function isProductionUrl(url: string) {
  try {
    const host = new URL(url).hostname
    return host === "instantmed.com.au" || host === "www.instantmed.com.au"
  } catch {
    return false
  }
}

function assertSafety(options: CliOptions) {
  const productionLike = options.target === "production" || isProductionUrl(options.baseUrl)

  if (productionLike && options.includePayments) {
    throw new Error(
      "--include-payments is forbidden on production. It posts fake Stripe events and can mutate payment state.",
    )
  }

  if (productionLike && options.deep) {
    throw new Error(
      "--deep is forbidden on production because full intake walks can create recoverable drafts/partial intakes.",
    )
  }

  if (options.includePayments) {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey && !stripeKey.startsWith("sk_test_")) {
      throw new Error("Refusing payment checks because STRIPE_SECRET_KEY is not a Stripe test-mode key.")
    }
  }

  if (options.auth === "cdp" && !options.cdpUrl) {
    throw new Error("--auth=cdp requires --cdp-url, for example http://127.0.0.1:9222")
  }
}

function nowSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

function fileSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function summarizeSamples(values: string[], limit = 2) {
  if (values.length === 0) return ""
  const samples = values
    .slice(0, limit)
    .map((value) => value.replace(/\s+/g, " ").slice(0, 180))
    .join(" | ")
  return values.length > limit ? `${samples} | +${values.length - limit} more` : samples
}

function urlFor(baseUrl: string, path: string) {
  return new URL(path, `${baseUrl}/`).toString()
}

async function waitForBaseUrl(baseUrl: string) {
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { cache: "no-store" })
      if (response.status < 500) return
    } catch {
      // Keep polling until the dev server is ready.
    }
    await sleep(1000)
  }
  throw new Error(`Timed out waiting for ${baseUrl}`)
}

function startDevServer(baseUrl: string): ChildProcessWithoutNullStreams {
  const port = new URL(baseUrl).port || "3060"
  const child = spawn("pnpm", ["dev"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      PLAYWRIGHT: "1",
      NEXT_PUBLIC_PLAYWRIGHT: "1",
      NODE_ENV: "test",
    },
  })

  child.stdout.on("data", (chunk: Buffer) => {
    process.stdout.write(`[dev] ${chunk.toString()}`)
  })
  child.stderr.on("data", (chunk: Buffer) => {
    process.stderr.write(`[dev] ${chunk.toString()}`)
  })

  return child
}

async function openBrowser(options: CliOptions): Promise<BrowserHandle> {
  if (options.auth === "cdp") {
    const browser = await chromium.connectOverCDP(options.cdpUrl!, { timeout: 30_000 })
    const context = browser.contexts()[0] || await browser.newContext()
    return { browser, context, isCdp: true }
  }

  const browser = await chromium.launch({ headless: !options.headed })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    reducedMotion: "reduce",
  })
  return { browser, context, isCdp: false }
}

async function addPerfObserver(page: Page) {
  await page.addInitScript(`
    window.__instantMedLongTasks = [];
    window.__instantMedCls = 0;

    try {
      new PerformanceObserver((list) => {
        const longTasks = window.__instantMedLongTasks || [];
        for (const entry of list.getEntries()) {
          longTasks.push(Math.round(entry.duration));
        }
        window.__instantMedLongTasks = longTasks;
      }).observe({ entryTypes: ["longtask"] });
    } catch {}

    try {
      new PerformanceObserver((list) => {
        let cls = window.__instantMedCls || 0;
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput && typeof entry.value === "number") {
            cls += entry.value;
          }
        }
        window.__instantMedCls = cls;
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  `)
}

async function dismissOverlays(page: Page) {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 1500 }).catch(() => false)) {
    await essentialOnly.click().catch(() => undefined)
  }

  await page.addStyleTag({
    content: `
      [data-nextjs-dialog-overlay],
      [data-nextjs-toast],
      [class*="nextjs-portal"],
      [data-nextjs-dev-toolbar],
      button[aria-label="Open chat assistant"] {
        display: none !important;
      }
    `,
  }).catch(() => undefined)
}

async function scrollThroughPage(page: Page) {
  await page.evaluate(`
    (async () => {
      const maxY = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      for (let y = 0; y <= maxY; y += 700) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 70));
      }
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 100));
    })()
  `)
}

async function collectMetrics(page: Page) {
  return page.evaluate(`
    (() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      const longTasks = window.__instantMedLongTasks || [];
      const maxLongTaskMs = longTasks.length ? Math.max(...longTasks) : 0;
      const totalLongTaskMs = longTasks.reduce((total, duration) => total + duration, 0);

      return {
        domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        loadMs: nav && nav.loadEventEnd ? Math.round(nav.loadEventEnd) : null,
        responseEndMs: nav ? Math.round(nav.responseEnd) : null,
        firstContentfulPaintMs: fcp ? Math.round(fcp.startTime) : null,
        longTaskCount: longTasks.filter((duration) => duration >= 250).length,
        maxLongTaskMs,
        totalLongTaskMs,
        cumulativeLayoutShift: Number((window.__instantMedCls || 0).toFixed(3)),
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        clientWidth: document.documentElement.clientWidth,
      };
    })()
  `) as Promise<PageMetrics>
}

async function probePage(options: PageProbeOptions) {
  const page = await options.context.newPage()
  await addPerfObserver(page)

  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []
  const serverErrors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300))
  })
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 300)))
  page.on("requestfailed", (request) => {
    const failure = request.failure()
    failedRequests.push(`${request.method()} ${request.url()} ${failure?.errorText || ""}`.slice(0, 300))
  })
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`.slice(0, 300))
    }
  })

  try {
    await page.setViewportSize(
      options.viewport === "mobile"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 950 },
    )

    const response = await page.goto(urlFor(options.baseUrl, options.path), {
      waitUntil: "domcontentloaded",
      timeout: 35_000,
    })
    await dismissOverlays(page)
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined)

    if (options.expectMain !== false) {
      await page.waitForSelector("main, [role='main'], h1, h2", { timeout: 15_000 })
    }

    await scrollThroughPage(page)
    const metrics = await collectMetrics(page)
    const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "")
    const screenshotPath = join(
      options.outputDir,
      "screenshots",
      `${fileSlug(`${options.area}-${options.label}-${options.viewport}`)}.png`,
    )
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined)

    const redirectedToAuth = /sign[- ]?in|log in|login/i.test(bodyText) &&
      !/dashboard|patient|intakes|prescriptions|documents/i.test(bodyText)

    const failures: string[] = []
    const warnings: string[] = []

    if (!response) failures.push("navigation produced no response")
    if (response && response.status() >= 500) failures.push(`document returned ${response.status()}`)
    if (response && response.status() >= 400 && response.status() < 500) warnings.push(`document returned ${response.status()}`)
    if (pageErrors.length) failures.push(`${pageErrors.length} page error(s): ${summarizeSamples(pageErrors)}`)
    if (serverErrors.length) failures.push(`${serverErrors.length} 5xx response(s): ${summarizeSamples(serverErrors)}`)
    if (/Something went wrong|We encountered an issue loading this step|Application error/i.test(bodyText)) {
      failures.push("generic app crash text visible")
    }
    if (options.viewport === "mobile" && metrics.scrollWidth > metrics.clientWidth + 2) {
      failures.push(`mobile horizontal overflow ${metrics.scrollWidth}px > ${metrics.clientWidth}px`)
    }
    if (redirectedToAuth && options.allowRedirectToAuth) {
      record({
        status: "skip",
        area: options.area,
        label: `${options.label} (${options.viewport})`,
        details: "redirected to auth; run with --auth=e2e locally or --auth=cdp against a logged-in Chrome profile",
        artifact: screenshotPath,
        metrics,
      })
      return
    }
    if (redirectedToAuth) failures.push("redirected to auth")
    if (consoleErrors.length) warnings.push(`${consoleErrors.length} console error(s): ${summarizeSamples(consoleErrors)}`)
    if (failedRequests.length) warnings.push(`${failedRequests.length} failed request(s): ${summarizeSamples(failedRequests)}`)
    if (metrics.longTaskCount > 0) warnings.push(`${metrics.longTaskCount} long task(s) >=250ms`)
    if ((metrics.loadMs || 0) > 8000) warnings.push(`slow load ${metrics.loadMs}ms`)
    if (metrics.cumulativeLayoutShift > 0.15) warnings.push(`CLS ${metrics.cumulativeLayoutShift}`)

    record({
      status: failures.length ? "fail" : warnings.length ? "warn" : "pass",
      area: options.area,
      label: `${options.label} (${options.viewport})`,
      details: [...failures, ...warnings].join("; ") || undefined,
      artifact: screenshotPath,
      metrics,
    })
  } catch (error) {
    record({
      status: "fail",
      area: options.area,
      label: `${options.label} (${options.viewport})`,
      details: error instanceof Error ? error.message : "Unknown probe failure",
    })
  } finally {
    await page.close().catch(() => undefined)
  }
}

async function loginE2E(context: BrowserContext, baseUrl: string, userType: TestUserType) {
  const page = await context.newPage()
  try {
    const response = await page.request.post(`${baseUrl}/api/test/login`, {
      headers: {
        "Content-Type": "application/json",
        "X-E2E-SECRET": process.env.E2E_SECRET || "e2e-test-secret-local",
      },
      data: { userType },
    })

    if (!response.ok()) {
      const text = await response.text().catch(() => "")
      return {
        success: false,
        error: `/api/test/login returned ${response.status()} ${text.slice(0, 160)}`,
      }
    }

    const state = await page.request.storageState()
    await context.clearCookies()
    await context.addCookies(state.cookies)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown E2E login failure",
    }
  } finally {
    await page.close().catch(() => undefined)
  }
}

async function makeE2EContext(browser: Browser, baseUrl: string, userType: TestUserType) {
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 950 },
    reducedMotion: "reduce",
  })
  const login = await loginE2E(context, baseUrl, userType)
  if (!login.success) {
    await context.close().catch(() => undefined)
    return { context: null, error: login.error }
  }
  return { context, error: undefined }
}

async function crawlRoutes(
  area: string,
  context: BrowserContext,
  baseUrl: string,
  outputDir: string,
  routes: readonly { label: string; path: string }[],
  allowRedirectToAuth = false,
) {
  for (const route of routes) {
    await probePage({
      area,
      label: route.label,
      path: route.path,
      viewport: "desktop",
      context,
      baseUrl,
      outputDir,
      allowRedirectToAuth,
    })
  }
}

async function crawlPublicAndRequest(context: BrowserContext, baseUrl: string, outputDir: string) {
  for (const route of PUBLIC_ROUTES) {
    await probePage({
      area: "public",
      label: route.label,
      path: route.path,
      viewport: "desktop",
      context,
      baseUrl,
      outputDir,
    })
    await probePage({
      area: "public",
      label: route.label,
      path: route.path,
      viewport: "mobile",
      context,
      baseUrl,
      outputDir,
    })
  }

  for (const route of REQUEST_ROUTES) {
    await probePage({
      area: "intake",
      label: route.label,
      path: route.path,
      viewport: "desktop",
      context,
      baseUrl,
      outputDir,
    })
    await probePage({
      area: "intake",
      label: route.label,
      path: route.path,
      viewport: "mobile",
      context,
      baseUrl,
      outputDir,
    })
  }
}

async function clearDrafts(page: Page) {
  await page.addInitScript(`
    for (const key of [
      "instantmed-draft-med-cert",
      "instantmed-draft-prescription",
      "instantmed-draft-consult",
      "instantmed-request-draft",
      "instantmed-preferences",
      "instantmed-server-draft-med-cert",
      "instantmed-server-draft-prescription",
      "instantmed-server-draft-consult",
    ]) {
      localStorage.removeItem(key);
    }
  `)
}

async function waitForText(page: Page, text: string | RegExp, timeout = 15_000) {
  await page.getByText(text).first().waitFor({ state: "visible", timeout })
}

async function clickPrimaryReady(page: Page) {
  const button = page.locator('button[data-intake-primary-action="true"]').last()
  await button.waitFor({ state: "visible", timeout: 10_000 })
  await button.scrollIntoViewIfNeeded()
  const ready = await button.getAttribute("data-intake-primary-ready").catch(() => null)
  if (ready === "false") {
    throw new Error("Primary intake action was visible but not ready")
  }
  await button.click()
}

async function chooseRadio(page: Page, groupName: string | RegExp, radioName: string | RegExp) {
  const radio = page.getByRole("radiogroup", { name: groupName }).getByRole("radio", { name: radioName })
  await radio.scrollIntoViewIfNeeded()
  await radio.click()
}

async function chooseSwitch(page: Page, name: string | RegExp) {
  const control = page.getByRole("switch", { name }).first()
  await control.scrollIntoViewIfNeeded()
  await control.click()
}

async function fillDetails(page: Page, options: { phone: boolean; prescribingIdentity: boolean }) {
  await waitForText(page, /Your details/i)

  const noThanks = page.getByRole("button", { name: /No thanks/i })
  if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
    await noThanks.click()
  }

  await page.locator('input[placeholder="Jane"]').fill("Test")
  await page.locator('input[placeholder="Smith"]').fill("Patient")
  await page.locator('input[placeholder="jane@example.com"]').fill("test@instantmed.com.au")
  await page.locator('input[placeholder="DD/MM/YYYY"]').fill("01/01/1990")

  if (options.phone) {
    await page.locator('input[placeholder="0412 345 678"]').fill("0412345678")
  }

  if (options.prescribingIdentity) {
    await page.locator("#sex-select-trigger").click()
    await page.getByRole("option", { name: /^Female$/i }).click()
    await page.locator('input[placeholder="10 digits"]').fill(TEST_MEDICARE.number)
    await page.locator('input[placeholder="10 digits"]').blur()
    await page.getByRole("button", { name: new RegExp(`^${TEST_MEDICARE.irn}$`) }).last().click()
    await page.locator('[placeholder="Start typing your address..."]').fill("123 Test Street")
    await page.locator("#suburb").fill("Sydney")
    await page.locator("#state-select-trigger").click()
    await page.getByRole("option", { name: /^NSW$/i }).click()
    await page.locator("#postcode").fill("2000")
  }

  await clickPrimaryReady(page)
}

async function assertPaymentCta(page: Page, expectedPrice: RegExp) {
  await waitForText(page, /One last check|Total today|Request Summary|Ready to submit/i, 20_000)
  const safetyCheckbox = page.locator("#safety-consent")
  if (await safetyCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    const checked = await safetyCheckbox.isChecked().catch(() => false)
    if (!checked) await safetyCheckbox.click()
  }
  const consentCheckbox = page.locator("#consent-checkbox")
  if (await consentCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    const checked = await consentCheckbox.isChecked().catch(() => false)
    if (!checked) await consentCheckbox.click()
  }
  const payButton = page.getByRole("button", { name: expectedPrice }).last()
  await payButton.waitFor({ state: "visible", timeout: 10_000 })
  const ariaDisabled = await payButton.getAttribute("aria-disabled")
  if (ariaDisabled === "true") throw new Error("Payment CTA remained aria-disabled")
}

async function runMedCertDeepFlow(page: Page, baseUrl: string) {
  await page.goto(urlFor(baseUrl, "/request?service=med-cert"))
  await dismissOverlays(page)
  await waitForText(page, /Certificate details/i)
  await chooseRadio(page, /Certificate type/i, /^Work$/i)

  const changeDates = page.getByRole("button", { name: /Change length or start date/i })
  if (await changeDates.isVisible({ timeout: 1000 }).catch(() => false)) {
    await changeDates.click()
  }

  await chooseRadio(page, /How many days|Certificate duration/i, /1 day/i)
  await page.getByRole("radio", { name: /^Today$/i }).click()
  await clickPrimaryReady(page)

  await waitForText(page, /What is stopping you today|What symptoms do you have/i)
  await page.getByRole("button", { name: /Cold\/Flu/i }).click()
  await page.getByRole("button", { name: /Headache/i }).click()
  await page.getByRole("button", { name: /1-2 days/i }).click()
  await page.getByRole("textbox").first().fill(
    "I have had a cold and headache since yesterday, with body aches and a runny nose.",
  )
  await clickPrimaryReady(page)
  await fillDetails(page, { phone: false, prescribingIdentity: false })
  await assertPaymentCta(page, /^Pay \$/)
}

async function runRepeatScriptDeepFlow(page: Page, baseUrl: string) {
  await page.goto(urlFor(baseUrl, "/request?service=repeat-script"))
  await dismissOverlays(page)
  await waitForText(page, /Which medication do you need/i)
  await page.locator("#medication-name-0").fill("E2E test medication")
  await page.locator("#medication-strength-0").fill("500 mg")
  await page.locator("#medication-form-0").fill("capsule")
  await clickPrimaryReady(page)

  await waitForText(page, /When were you last prescribed/i)
  await page.getByRole("button", { name: /Under 3 months/i }).click()
  await page.getByPlaceholder(/2 puffs twice daily/i).fill("1 tablet daily")
  await page.getByPlaceholder(/e\.g\., asthma/i).fill("asthma")
  await page.getByRole("button", { name: /No side effects/i }).click()
  await clickPrimaryReady(page)

  await waitForText(page, /Anything the doctor should know/i)
  await chooseRadio(page, /allerg/i, /^None$/i)
  await chooseRadio(page, /medical conditions/i, /No conditions/i)
  await chooseRadio(page, /other medications/i, /No medications/i)
  await clickPrimaryReady(page)

  await fillDetails(page, { phone: true, prescribingIdentity: true })
  await assertPaymentCta(page, /^Pay \$/)
}

async function runEdDeepFlow(page: Page, baseUrl: string) {
  await page.goto(urlFor(baseUrl, "/request?service=consult&subtype=ed"))
  await dismissOverlays(page)
  await waitForText(page, /What matters most right now/i)
  await chooseSwitch(page, /18 years or older/i)
  await chooseRadio(page, /Treatment goal/i, /Improve erections/i)
  await chooseRadio(page, /How long this has been a concern/i, /3.*12 months/i)
  await clickPrimaryReady(page)

  await waitForText(page, /A few questions about your experience/i)
  for (let index = 0; index < 5; index += 1) {
    await page
      .locator('[data-intake-scale-choice-group="true"]')
      .getByRole("radio", { name: /4 out of 5/i })
      .click()
    await page.waitForTimeout(160)
  }
  await clickPrimaryReady(page)

  await waitForText(page, /A quick safety check/i)
  await chooseRadio(page, /Do you take nitrates/i, /^No$/i)
  await chooseRadio(page, /Do you take alpha-blockers/i, /^No$/i)
  await chooseRadio(page, /Heart attack, stroke, or unstable angina/i, /^No$/i)
  await chooseRadio(page, /Severe heart disease, very low blood pressure, or HOCM/i, /^No$/i)
  await chooseRadio(page, /Taking any medications/i, /No medications/i)
  await chooseRadio(page, /Any allergies/i, /No allergies/i)
  await chooseRadio(page, /Any other medical conditions/i, /No conditions/i)
  await chooseRadio(page, /Have you tried ED treatment before/i, /^No$/i)
  await clickPrimaryReady(page)

  await waitForText(page, /How should treatment fit your life/i)
  await chooseRadio(page, /Treatment preference/i, /Let the doctor decide/i)
  await clickPrimaryReady(page)

  await fillDetails(page, { phone: true, prescribingIdentity: true })
  await assertPaymentCta(page, /^Pay \$49\.95$/)
}

async function runHairLossDeepFlow(page: Page, baseUrl: string) {
  await page.goto(urlFor(baseUrl, "/request?service=consult&subtype=hair_loss"))
  await dismissOverlays(page)
  await waitForText(page, /What matters most right now/i)
  await chooseRadio(page, /Hair loss goal/i, /Both/i)
  await chooseRadio(page, /When did you first notice changes/i, /6-12 months/i)
  await clickPrimaryReady(page)

  await waitForText(page, /Which pattern looks closest/i)
  await chooseRadio(page, /Hair loss pattern/i, /Thinning|recession/i)
  await chooseRadio(page, /Do you have a family history of hair loss/i, /No or not sure/i)
  await clickPrimaryReady(page)

  await waitForText(page, /A quick safety check/i)
  await chooseRadio(page, /Partner pregnancy or conception status/i, /^No$/i)
  await chooseSwitch(page, /No scalp conditions/i)
  await chooseRadio(page, /Low blood pressure or dizziness/i, /^No$/i)
  await chooseRadio(page, /Any heart conditions or heart medication/i, /^No$/i)
  await chooseRadio(page, /Taking any medications/i, /No medications/i)
  await chooseRadio(page, /Any allergies/i, /No allergies/i)
  await chooseRadio(page, /Any other medical conditions/i, /No conditions/i)
  await clickPrimaryReady(page)

  await waitForText(page, /How should treatment fit your routine/i)
  await chooseRadio(page, /Treatment preference/i, /Let the doctor decide/i)
  await clickPrimaryReady(page)

  await fillDetails(page, { phone: true, prescribingIdentity: true })
  await assertPaymentCta(page, /^Pay \$49\.95$/)
}

async function runWomensHealthDeepFlow(page: Page, baseUrl: string) {
  await page.goto(urlFor(baseUrl, "/request?service=consult&subtype=womens_health"))
  await dismissOverlays(page)
  await waitForText(page, /What do you need today/i)
  await chooseRadio(page, /Women's health option/i, /UTI symptoms/i)
  await clickPrimaryReady(page)

  await waitForText(page, /Which symptoms do you have/i)
  await page.getByRole("group", { name: /UTI symptoms/i }).getByRole("button", { name: /Burning or stinging/i }).click()
  await chooseRadio(page, /fever, flank or back pain/i, /^No$/i)
  await chooseRadio(page, /pregnant/i, /^No$/i)
  await clickPrimaryReady(page)

  await waitForText(page, /Any allergies/i)
  await chooseRadio(page, /Any allergies/i, /^None$/i)
  await chooseRadio(page, /Any medical conditions/i, /No conditions/i)
  await chooseRadio(page, /Taking any other medications/i, /No medications/i)
  await clickPrimaryReady(page)

  await fillDetails(page, { phone: true, prescribingIdentity: true })
  await assertPaymentCta(page, /^Pay \$49\.95$/)
}

async function runDeepIntakeFlows(context: BrowserContext, baseUrl: string, outputDir: string) {
  const flows: Array<{
    label: string
    run: (page: Page, baseUrl: string) => Promise<void>
  }> = [
    { label: "Med cert to payment CTA", run: runMedCertDeepFlow },
    { label: "Repeat script to payment CTA", run: runRepeatScriptDeepFlow },
    { label: "ED to payment CTA", run: runEdDeepFlow },
    { label: "Hair loss to payment CTA", run: runHairLossDeepFlow },
    { label: "Women's health to payment CTA", run: runWomensHealthDeepFlow },
  ]

  for (const flow of flows) {
    const page = await context.newPage()
    await clearDrafts(page)
    await addPerfObserver(page)
    try {
      await page.setViewportSize({ width: 1280, height: 900 })
      await flow.run(page, baseUrl)
      const screenshotPath = join(outputDir, "screenshots", `${fileSlug(`deep-${flow.label}`)}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined)
      record({
        status: "pass",
        area: "deep-intake",
        label: flow.label,
        artifact: screenshotPath,
      })
    } catch (error) {
      const screenshotPath = join(outputDir, "screenshots", `${fileSlug(`deep-${flow.label}-failure`)}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined)
      record({
        status: "fail",
        area: "deep-intake",
        label: flow.label,
        details: error instanceof Error ? error.message : "Unknown deep intake failure",
        artifact: screenshotPath,
      })
    } finally {
      await page.close().catch(() => undefined)
    }
  }
}

async function runPlaywrightSpecs(label: string, specs: string[], baseUrl: string, outputDir: string) {
  const logPath = join(outputDir, `${fileSlug(label)}.log`)
  const args = [
    "exec",
    "playwright",
    "test",
    "--config=playwright.preview.config.ts",
    "--project=chromium",
    ...specs,
  ]

  const child = spawn("pnpm", args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      E2E_BASE_URL: baseUrl,
      PLAYWRIGHT_BASE_URL: baseUrl,
      PLAYWRIGHT: "1",
      NEXT_PUBLIC_PLAYWRIGHT: "1",
    },
  })

  let output = ""
  child.stdout.on("data", (chunk: Buffer) => {
    output += chunk.toString()
    process.stdout.write(chunk)
  })
  child.stderr.on("data", (chunk: Buffer) => {
    output += chunk.toString()
    process.stderr.write(chunk)
  })

  const code = await new Promise<number | null>((resolveExit) => {
    child.on("exit", (exitCode) => resolveExit(exitCode))
  })
  await writeFile(logPath, output)

  record({
    status: code === 0 ? "pass" : "fail",
    area: "playwright",
    label,
    details: code === 0 ? undefined : `exited ${code}; see ${logPath}`,
    artifact: logPath,
  })
}

async function writeReports(outputDir: string, options: CliOptions) {
  const summary = {
    options,
    generatedAt: new Date().toISOString(),
    counts: {
      pass: results.filter((result) => result.status === "pass").length,
      warn: results.filter((result) => result.status === "warn").length,
      fail: results.filter((result) => result.status === "fail").length,
      skip: results.filter((result) => result.status === "skip").length,
    },
    results,
  }

  await writeFile(join(outputDir, "summary.json"), JSON.stringify(summary, null, 2))
  await writeFile(join(outputDir, "report.md"), renderMarkdownReport(summary))
}

function renderMarkdownReport(summary: {
  options: CliOptions
  generatedAt: string
  counts: Record<"pass" | "warn" | "fail" | "skip", number>
  results: CheckResult[]
}) {
  const lines = [
    "# InstantMed Full-System Verification",
    "",
    `Generated: ${summary.generatedAt}`,
    `Target: ${summary.options.target}`,
    `Base URL: ${summary.options.baseUrl}`,
    `Auth: ${summary.options.auth}`,
    "",
    `Pass: ${summary.counts.pass} | Warn: ${summary.counts.warn} | Fail: ${summary.counts.fail} | Skip: ${summary.counts.skip}`,
    "",
    "| Status | Area | Check | Details | Artifact |",
    "| --- | --- | --- | --- | --- |",
  ]

  for (const result of summary.results) {
    lines.push(
      `| ${result.status} | ${result.area} | ${result.label} | ${result.details || ""} | ${result.artifact || ""} |`,
    )
  }

  return `${lines.join("\n")}\n`
}

async function sleep(ms: number) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  assertSafety(options)

  const outputDir = resolve(process.cwd(), OUTPUT_ROOT, nowSlug())
  await mkdir(join(outputDir, "screenshots"), { recursive: true })

  let devServer: ChildProcessWithoutNullStreams | null = null
  if (options.startServer) {
    devServer = startDevServer(options.baseUrl)
  }

  await waitForBaseUrl(options.baseUrl)

  const handle = await openBrowser(options)
  const tracePath = join(outputDir, "trace.zip")
  await handle.context.tracing.start({ screenshots: true, snapshots: true }).catch(() => undefined)

  try {
    await crawlPublicAndRequest(handle.context, options.baseUrl, outputDir)

    if (options.auth === "e2e") {
      const patient = await makeE2EContext(handle.browser, options.baseUrl, "patient")
      if (patient.context) {
        await crawlRoutes("patient", patient.context, options.baseUrl, outputDir, PATIENT_ROUTES)
        await patient.context.close()
      } else {
        record({ status: "skip", area: "patient", label: "E2E patient routes", details: patient.error })
      }

      const operator = await makeE2EContext(handle.browser, options.baseUrl, "operator")
      if (operator.context) {
        await crawlRoutes("admin", operator.context, options.baseUrl, outputDir, ADMIN_ROUTES)
        await operator.context.close()
      } else {
        record({ status: "skip", area: "admin", label: "E2E admin routes", details: operator.error })
      }

      const doctor = await makeE2EContext(handle.browser, options.baseUrl, "doctor")
      if (doctor.context) {
        await crawlRoutes("doctor", doctor.context, options.baseUrl, outputDir, DOCTOR_ROUTES)
        await doctor.context.close()
      } else {
        record({ status: "skip", area: "doctor", label: "E2E doctor routes", details: doctor.error })
      }

      const support = await makeE2EContext(handle.browser, options.baseUrl, "support")
      if (support.context) {
        await crawlRoutes("support", support.context, options.baseUrl, outputDir, SUPPORT_ROUTES)
        await support.context.close()
      } else {
        record({ status: "skip", area: "support", label: "E2E support routes", details: support.error })
      }
    } else if (options.auth === "cdp") {
      await crawlRoutes("patient", handle.context, options.baseUrl, outputDir, PATIENT_ROUTES, true)
      await crawlRoutes("admin", handle.context, options.baseUrl, outputDir, ADMIN_ROUTES, true)
    } else {
      record({
        status: "skip",
        area: "auth",
        label: "Patient/admin/doctor/support routes",
        details: "run with --auth=e2e for dev/preview test users or --auth=cdp for a logged-in Chrome profile",
      })
    }

    if (options.deep) {
      await runDeepIntakeFlows(handle.context, options.baseUrl, outputDir)
    }

    if (options.includePayments) {
      await runPlaywrightSpecs(
        "Payment webhook and price smoke",
        ["e2e/payment-smoke.spec.ts", "e2e/stripe-webhook.spec.ts"],
        options.baseUrl,
        outputDir,
      )
    }
  } finally {
    await handle.context.tracing.stop({ path: tracePath }).catch(() => undefined)
    if (!handle.isCdp) {
      await handle.browser.close().catch(() => undefined)
    }
    if (devServer) {
      devServer.kill("SIGTERM")
    }
  }

  await writeReports(outputDir, options)
  console.log(`\nReport: ${join(outputDir, "report.md")}`)
  console.log(`Summary: ${join(outputDir, "summary.json")}`)
  console.log(`Trace: ${tracePath}`)

  if (!options.soft && results.some((result) => result.status === "fail")) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
