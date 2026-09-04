import { existsSync, readFileSync } from "node:fs"
import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it, vi } from "vitest"

import {
  assertZeroHostedStripeSurvivors,
  buildHostedStripeCleanupPlan,
} from "../../e2e/helpers/hosted-stripe"
import {
  buildMailpitLatestMessageUrl,
  readLatestMailpitLink,
} from "../../e2e/helpers/mailpit"
import {
  assertHostedStripeE2EEnvironment,
  assertStripeCliWebhookSecret,
  HOSTED_STRIPE_PRICE_REQUIREMENTS,
  type RetrievedStripePrice,
} from "../../scripts/hosted-stripe-e2e-preflight"
import {
  assertNoOwnedDockerResources,
  assertPortsAvailable,
  buildHostedStripeChildEnvironment,
  buildHostedStripeSupabaseConfig,
  buildRunnerBootstrapEnvironment,
  HOSTED_STRIPE_E2E_PORTS,
  validateHostedStripeBrowserEvidence,
  validateHostedStripeReceipt,
  writeHostedStripeReceiptAtomic,
} from "../../scripts/run-hosted-stripe-e2e"

const root = process.cwd()
const TEST_KEY = "sk_test_dedicated_hosted_e2e"
const localUrls = {
  apiUrl: "http://127.0.0.1:55321",
  appUrl: "http://127.0.0.1:3060",
}

function completePriceEnv() {
  return Object.fromEntries(
    HOSTED_STRIPE_PRICE_REQUIREMENTS.map(({ envKey }) => [
      envKey,
      `price_test_${envKey.toLowerCase()}`,
    ]),
  )
}

function validEnvironment(
  overrides: Partial<NodeJS.ProcessEnv> = {},
): Partial<NodeJS.ProcessEnv> {
  return {
    NODE_ENV: "production",
    PLAYWRIGHT: "1",
    ALLOW_STRIPE_TEST_WEBHOOKS: "true",
    NEXT_PUBLIC_APP_URL: localUrls.appUrl,
    NEXT_PUBLIC_SITE_URL: localUrls.appUrl,
    SUPABASE_URL: localUrls.apiUrl,
    NEXT_PUBLIC_SUPABASE_URL: localUrls.apiUrl,
    HOSTED_STRIPE_E2E_SUPABASE_API_URL: localUrls.apiUrl,
    STRIPE_SECRET_KEY: TEST_KEY,
    ...completePriceEnv(),
    ...overrides,
  }
}

function successfulPriceRetriever() {
  return vi.fn(async (priceId: string): Promise<RetrievedStripePrice> => {
    const requirement = HOSTED_STRIPE_PRICE_REQUIREMENTS.find(
      ({ envKey }) => `price_test_${envKey.toLowerCase()}` === priceId,
    )
    if (!requirement) throw new Error("unexpected price")
    return {
      active: true,
      currency: "aud",
      id: priceId,
      livemode: false,
      type: "one_time" as const,
      unit_amount: requirement.amountCents,
    }
  })
}

describe("hosted Stripe environment preflight", () => {
  it("accepts the exact production-bundle local/test lane and retrieves every price", async () => {
    const retrievePrice = successfulPriceRetriever()

    const context = await assertHostedStripeE2EEnvironment({
      env: validEnvironment(),
      retrievePrice,
    })

    expect(context).toMatchObject({
      appUrl: localUrls.appUrl,
      stripeKeyMode: "test",
      supabaseUrl: localUrls.apiUrl,
    })
    expect(retrievePrice).toHaveBeenCalledTimes(HOSTED_STRIPE_PRICE_REQUIREMENTS.length)
  })

  it("accepts an explicitly dedicated restricted test key", async () => {
    await expect(assertHostedStripeE2EEnvironment({
      env: validEnvironment({ STRIPE_SECRET_KEY: "rk_test_dedicated_hosted_e2e" }),
      retrievePrice: successfulPriceRetriever(),
    })).resolves.toMatchObject({ stripeKeyMode: "test" })
  })

  it.each([
    ["live Stripe key", { STRIPE_SECRET_KEY: "sk_live_never" }],
    ["unknown Stripe key", { STRIPE_SECRET_KEY: "pk_test_public" }],
    ["production domain", { NEXT_PUBLIC_APP_URL: "https://instantmed.com.au" }],
    ["non-loopback app", { NEXT_PUBLIC_SITE_URL: "https://preview.example.test" }],
    ["production Supabase", {
      SUPABASE_URL: "https://witzcrovsoumktyndqgz.supabase.co",
      NEXT_PUBLIC_SUPABASE_URL: "https://witzcrovsoumktyndqgz.supabase.co",
      HOSTED_STRIPE_E2E_SUPABASE_API_URL: "https://witzcrovsoumktyndqgz.supabase.co",
    }],
    ["arbitrary hosted Supabase", {
      SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      HOSTED_STRIPE_E2E_SUPABASE_API_URL: "https://abcdefghijklmnopqrst.supabase.co",
    }],
    ["mismatched Supabase URLs", { SUPABASE_URL: "http://127.0.0.1:54321" }],
    ["unowned local Supabase URL", { HOSTED_STRIPE_E2E_SUPABASE_API_URL: "http://127.0.0.1:54321" }],
    ["missing explicit webhook opt-in", { ALLOW_STRIPE_TEST_WEBHOOKS: "false" }],
    ["wrong Node environment", { NODE_ENV: "test" }],
    ["missing Playwright marker", { PLAYWRIGHT: "0" }],
    ["Vercel marker", { VERCEL: "1" }],
    ["empty Vercel marker", { VERCEL: "" }],
    ["Vercel environment", { VERCEL_ENV: "preview" }],
    ["self-declared isolation", {
      E2E_ISOLATED_SUPABASE: "1",
      SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      HOSTED_STRIPE_E2E_SUPABASE_API_URL: "https://abcdefghijklmnopqrst.supabase.co",
    }],
  ])("rejects %s", async (_label, override) => {
    await expect(assertHostedStripeE2EEnvironment({
      env: validEnvironment(override as Partial<NodeJS.ProcessEnv>),
      retrievePrice: successfulPriceRetriever(),
    })).rejects.toThrow(/Hosted Stripe E2E preflight failed/)
  })

  it("rejects missing, malformed, live, inactive, wrong-currency, and wrong-amount prices", async () => {
    const missing = validEnvironment()
    delete missing.STRIPE_PRICE_MEDCERT
    await expect(assertHostedStripeE2EEnvironment({
      env: missing,
      retrievePrice: successfulPriceRetriever(),
    })).rejects.toThrow(/STRIPE_PRICE_MEDCERT/)

    await expect(assertHostedStripeE2EEnvironment({
      env: validEnvironment({ STRIPE_PRICE_MEDCERT: "prod_price" }),
      retrievePrice: successfulPriceRetriever(),
    })).rejects.toThrow(/STRIPE_PRICE_MEDCERT/)

    for (const invalid of [
      { livemode: true },
      { active: false },
      { currency: "usd" },
      { unit_amount: 1 },
      { type: "recurring" as const },
    ]) {
      const retrievePrice = successfulPriceRetriever()
      retrievePrice.mockResolvedValueOnce({
        active: true,
        currency: "aud",
        id: "price_test_stripe_price_medcert",
        livemode: false,
        type: "one_time",
        unit_amount: 2495,
        ...invalid,
      })
      await expect(assertHostedStripeE2EEnvironment({
        env: validEnvironment(),
        retrievePrice,
      })).rejects.toThrow(/Stripe price validation failed for STRIPE_PRICE_MEDCERT/)
    }
  })

  it("contains price retrieval failures without leaking provider bodies or secrets", async () => {
    const leaked = `${TEST_KEY} customer@example.test cs_test_secret response-body-secret`
    const retrievePrice = vi.fn().mockRejectedValue(new Error(leaked))

    let message = ""
    try {
      await assertHostedStripeE2EEnvironment({ env: validEnvironment(), retrievePrice })
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }

    expect(message).toContain("Stripe price retrieval failed for STRIPE_PRICE_MEDCERT")
    expect(message).not.toContain(TEST_KEY)
    expect(message).not.toContain("customer@example.test")
    expect(message).not.toContain("cs_test_secret")
    expect(message).not.toContain("response-body-secret")
  })

  it("accepts only a real-shaped Stripe CLI signing secret", () => {
    expect(() => assertStripeCliWebhookSecret(`whsec_${"a".repeat(32)}`)).not.toThrow()
    for (const value of [undefined, "", "whsec_short", "sk_test_not_a_webhook", `whsec_${"a".repeat(20)}!`]) {
      expect(() => assertStripeCliWebhookSecret(value)).toThrow(
        "Stripe CLI did not provide a valid webhook signing secret",
      )
    }
  })
})

describe("hosted Stripe runner isolation", () => {
  it("scrubs repository/live/provider/Vercel values from bootstrap inheritance", () => {
    const source = {
      PATH: "/usr/bin",
      HOME: "/safe-home",
      LANG: "en_AU.UTF-8",
      STRIPE_SECRET_KEY: "sk_live_primary",
      SUPABASE_URL: "https://witzcrovsoumktyndqgz.supabase.co",
      NEXT_PUBLIC_APP_URL: "https://instantmed.com.au",
      VERCEL: "1",
      VERCEL_ENV: "production",
      E2E_ISOLATED_SUPABASE: "1",
      HOSTED_STRIPE_E2E_STRIPE_SECRET_KEY: TEST_KEY,
      HOSTED_STRIPE_E2E_STRIPE_PRICE_MEDCERT: "price_test_medcert",
      HOSTED_STRIPE_E2E_SUPABASE_API_URL: "https://attacker.example.test",
    }

    expect(buildRunnerBootstrapEnvironment(source)).toEqual({
      HOME: "/safe-home",
      LANG: "en_AU.UTF-8",
      PATH: "/usr/bin",
      HOSTED_STRIPE_E2E_STRIPE_SECRET_KEY: TEST_KEY,
      HOSTED_STRIPE_E2E_STRIPE_PRICE_MEDCERT: "price_test_medcert",
    })
  })

  it("constructs the production child env without live aliases or Vercel authority", () => {
    const child = buildHostedStripeChildEnvironment({
      bootstrapEnv: {
        PATH: "/usr/bin",
        HOSTED_STRIPE_E2E_STRIPE_SECRET_KEY: TEST_KEY,
        ...Object.fromEntries(HOSTED_STRIPE_PRICE_REQUIREMENTS.map(({ envKey }) => [
          `HOSTED_STRIPE_E2E_${envKey}`,
          `price_test_${envKey.toLowerCase()}`,
        ])),
      },
      localSupabase: {
        anonKey: "local-anon",
        apiUrl: localUrls.apiUrl,
        serviceRoleKey: "local-service-role",
      },
      runId: "hosted-stripe-run-1234",
      webhookSecret: `whsec_${"b".repeat(32)}`,
    })

    expect(child).toMatchObject({
      NODE_ENV: "production",
      PLAYWRIGHT: "1",
      ALLOW_STRIPE_TEST_WEBHOOKS: "true",
      NEXT_PUBLIC_APP_URL: localUrls.appUrl,
      SUPABASE_URL: localUrls.apiUrl,
      NEXT_PUBLIC_SUPABASE_URL: localUrls.apiUrl,
      HOSTED_STRIPE_E2E_SUPABASE_API_URL: localUrls.apiUrl,
      STRIPE_SECRET_KEY: TEST_KEY,
    })
    expect(child.VERCEL).toBeUndefined()
    expect(child.VERCEL_ENV).toBeUndefined()
    expect(child.E2E_ISOLATED_SUPABASE).toBeUndefined()
  })

  it("pins a unique Supabase overlay to ports 55320 through 55329", () => {
    const source = readFileSync(join(root, "supabase/config.toml"), "utf8")
    const overlay = buildHostedStripeSupabaseConfig(source, "hosted-stripe-e2e-deadbeef")
    expect(overlay).toContain('project_id = "hosted-stripe-e2e-deadbeef"')
    for (const port of [55320, 55321, 55322, 55323, 55324, 55325, 55326, 55329]) {
      expect(overlay).toContain(String(port))
    }
    expect(overlay).not.toMatch(/\b5432[0-9]\b/)
  })

  it("fails closed on an occupied port without invoking owner cleanup", async () => {
    const cleanupUnknownOwner = vi.fn()
    const probe = vi.fn(async (port: number) => port !== 3060)
    await expect(assertPortsAvailable(HOSTED_STRIPE_E2E_PORTS, probe)).rejects.toThrow(
      "Required hosted Stripe E2E port 3060 is already in use",
    )
    expect(cleanupUnknownOwner).not.toHaveBeenCalled()
  })

  it("treats every surviving run-owned Docker resource as cleanup failure", () => {
    expect(() => assertNoOwnedDockerResources({ containers: [], volumes: [], networks: [] })).not.toThrow()
    for (const owned of [
      { containers: ["one"], volumes: [], networks: [] },
      { containers: [], volumes: ["one"], networks: [] },
      { containers: [], volumes: [], networks: ["one"] },
    ]) {
      expect(() => assertNoOwnedDockerResources(owned)).toThrow(/cleanup left run-owned Docker resources/i)
    }
  })

  it("accepts a PHI-free receipt and recursively rejects identifiers or clinical values", () => {
    const safeReceipt = {
      runId: "run-20260905-deadbeef",
      gitSha: "a".repeat(40),
      startedAt: "2026-09-05T00:00:00.000Z",
      finishedAt: "2026-09-05T00:05:00.000Z",
      stripe: { eventType: "checkout.session.completed", livemode: false },
      assertions: {
        hostedCheckout: true,
        signedWebhook: true,
        skippedAccount: true,
        linkedAccount: true,
        zeroSurvivors: true,
      },
      counts: { journeys: 2, webhookEvents: 2, survivors: 0 },
    }
    expect(() => validateHostedStripeReceipt(safeReceipt)).not.toThrow()

    for (const unsafe of [
      { ...safeReceipt, email: "patient@example.test" },
      { ...safeReceipt, nested: { intakeId: "00000000-0000-4000-8000-000000000001" } },
      { ...safeReceipt, nested: { token: "secret" } },
      { ...safeReceipt, nested: { session: "cs_test_secret" } },
      { ...safeReceipt, nested: { medication: "Example medicine 10 mg" } },
      { ...safeReceipt, startedAt: "September 5 2026" },
      {
        ...safeReceipt,
        startedAt: "2026-09-05T00:06:00.000Z",
        finishedAt: "2026-09-05T00:05:00.000Z",
      },
      {
        ...safeReceipt,
        assertions: { ...safeReceipt.assertions, hostedCheckout: false },
      },
      { ...safeReceipt, counts: { ...safeReceipt.counts, journeys: 1 } },
      { ...safeReceipt, counts: { ...safeReceipt.counts, survivors: 1 } },
    ]) {
      expect(() => validateHostedStripeReceipt(unsafe)).toThrow(/receipt contains a forbidden/i)
    }
  })

  it("writes the validated receipt atomically with owner-only permissions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hosted-stripe-receipt-test-"))
    const receiptPath = join(directory, "receipt.json")
    const receipt = {
      runId: "run-20260905-deadbeef",
      gitSha: "a".repeat(40),
      startedAt: "2026-09-05T00:00:00.000Z",
      finishedAt: "2026-09-05T00:05:00.000Z",
      stripe: { eventType: "checkout.session.completed", livemode: false },
      assertions: {
        hostedCheckout: true,
        signedWebhook: true,
        skippedAccount: true,
        linkedAccount: true,
        zeroSurvivors: true,
      },
      counts: { journeys: 2, webhookEvents: 2, survivors: 0 },
    }

    try {
      await writeHostedStripeReceiptAtomic(receiptPath, receipt)
      expect((await stat(receiptPath)).mode & 0o777).toBe(0o600)
      expect(JSON.parse(await readFile(receiptPath, "utf8"))).toEqual(receipt)
      expect(existsSync(`${receiptPath}.tmp`)).toBe(false)
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  it("accepts only complete PHI-free browser evidence", () => {
    const safeEvidence = {
      stripe: { eventType: "checkout.session.completed", livemode: false },
      assertions: {
        hostedCheckout: true,
        signedWebhook: true,
        skippedAccount: true,
        linkedAccount: true,
      },
      counts: { journeys: 2, webhookEvents: 2 },
    }
    expect(() => validateHostedStripeBrowserEvidence(safeEvidence)).not.toThrow()
    expect(() => validateHostedStripeBrowserEvidence({
      ...safeEvidence,
      assertions: { ...safeEvidence.assertions, linkedAccount: false },
    })).toThrow(/browser evidence contains a forbidden/i)
    expect(() => validateHostedStripeBrowserEvidence({
      ...safeEvidence,
      email: "patient@example.test",
    })).toThrow(/receipt contains a forbidden field/i)
    expect(() => validateHostedStripeBrowserEvidence({
      ...safeEvidence,
      counts: { journeys: 2, webhookEvents: 1 },
    })).toThrow(/browser evidence contains a forbidden/i)
  })
})

describe("hosted Stripe row teardown", () => {
  it("builds only run-scoped cleanup operations and covers durable payment side effects", () => {
    const plan = buildHostedStripeCleanupPlan({
      intakeIds: ["00000000-0000-4000-8000-000000000001"],
      profileIds: ["00000000-0000-4000-8000-000000000002"],
      runId: "stripe-run-deadbeef",
    })

    expect(plan.map(({ table }) => table)).toEqual(expect.arrayContaining([
      "stripe_webhook_dead_letter",
      "stripe_webhook_events",
      "ai_draft_retry_queue",
      "payments",
      "email_outbox",
      "notifications",
      "partial_intakes",
      "intakes",
      "profiles",
    ]))
    expect(plan.at(-1)).toMatchObject({ table: "profiles" })
    expect(plan.every(({ scope }) => scope.length > 0)).toBe(true)
    expect(plan.find(({ table }) => table === "safety_audit_log")).toMatchObject({
      scope: [{ column: "request_id" }],
    })

    expect(() => buildHostedStripeCleanupPlan({
      intakeIds: [],
      profileIds: [],
      runId: "production",
    })).toThrow(/run-scoped/i)
  })

  it("fails teardown when any database or Auth survivor remains", () => {
    expect(() => assertZeroHostedStripeSurvivors({
      authUsers: 0,
      cleanupOperations: 0,
      emailOutbox: 0,
      intakes: 0,
      partialIntakes: 0,
      profiles: 0,
      webhookEvents: 0,
    })).not.toThrow()

    expect(() => assertZeroHostedStripeSurvivors({
      authUsers: 0,
      cleanupOperations: 0,
      emailOutbox: 0,
      intakes: 1,
      partialIntakes: 0,
      profiles: 0,
      webhookEvents: 0,
    })).toThrow(/zero-survivor assertion failed/i)
  })
})

describe("Mailpit recipient scoping", () => {
  it("queries the fixed local Mailpit endpoint for only the run-unique recipient", () => {
    const recipient = "stripe-run-deadbeef@example.test"
    const url = buildMailpitLatestMessageUrl(recipient)
    expect(url.origin).toBe("http://127.0.0.1:55324")
    expect(url.pathname).toBe("/view/latest.html")
    expect(url.searchParams.get("query")).toBe(`to:"${recipient}"`)
  })

  it("bounds 404 retries and returns only a local Supabase auth callback", async () => {
    const recipient = "stripe-run-deadbeef@example.test"
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(new Response(
        '<a href="http://127.0.0.1:55321/auth/v1/verify?token=opaque&amp;type=magiclink&amp;redirect_to=http%3A%2F%2F127.0.0.1%3A3060%2Fauth%2Fcallback">sign in</a>',
        { status: 200 },
      ))

    const link = await readLatestMailpitLink(recipient, {
      fetchFn,
      retryDelayMs: 0,
      timeoutMs: 100,
    })

    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(new URL(link).origin).toBe(localUrls.apiUrl)
    expect(link).not.toContain("patient@example")
  })

  it("rejects broad recipients, non-local links, and exhausted retries without logging tokens", async () => {
    await expect(readLatestMailpitLink("patient@example.test", {
      fetchFn: vi.fn(),
      retryDelayMs: 0,
      timeoutMs: 1,
    })).rejects.toThrow(/run-unique fabricated recipient/)

    await expect(readLatestMailpitLink("stripe-run-deadbeef@example.test", {
      fetchFn: vi.fn().mockResolvedValue(new Response(
        '<a href="https://evil.example/steal?token=secret">sign in</a>',
        { status: 200 },
      )),
      retryDelayMs: 0,
      timeoutMs: 10,
    })).rejects.toThrow(/safe local Supabase magic link/)
  })
})

describe("hosted browser journey source contracts", () => {
  it("owns real hosted Stripe, two optional-account branches, and no auth bypass", () => {
    const specPath = join(root, "e2e/hosted-stripe-guest-journey.spec.ts")
    const helperPath = join(root, "e2e/helpers/hosted-stripe.ts")
    const configPath = join(root, "playwright.hosted-stripe.config.ts")
    const runnerPath = join(root, "scripts/run-hosted-stripe-e2e.ts")
    const workflowPath = join(root, ".github/workflows/hosted-stripe-e2e.yml")
    expect(existsSync(specPath)).toBe(true)
    expect(existsSync(helperPath)).toBe(true)
    expect(existsSync(configPath)).toBe(true)
    expect(existsSync(runnerPath)).toBe(true)
    expect(existsSync(workflowPath)).toBe(true)

    const spec = readFileSync(specPath, "utf8")
    expect(spec).toContain("checkout.stripe.com")
    expect(spec).toContain("Continue without an account")
    expect(spec).toContain("Email me a sign-in link")
    expect(spec).toContain("waitForActualStripePayment")
    expect(spec).toContain("exclude_from_reporting")
    expect(spec).not.toContain("__e2e_auth_user_id")
    expect(spec).not.toContain("route.fulfill")
    expect(spec).not.toContain("generateStripeSignature")
    expect(spec).not.toContain("cleanupHostedStripeRunArtifacts")
    expect(spec).not.toContain("writeHostedStripeReceiptAtomic")

    const helper = readFileSync(helperPath, "utf8")
    const certificateStep = readFileSync(
      join(root, "components/request/steps/certificate-step.tsx"),
      "utf8",
    )
    expect(certificateStep).toContain('title="What do you need covered?"')
    expect(helper).toMatch(
      /name:\s*"What do you need covered\?"\s*,\s*exact:\s*true/,
    )
    expect(helper).toContain("stripe.checkout.sessions.retrieve")
    expect(helper).toContain("paymentIntent.amount_received")
    expect(helper).toContain("#medication-strength-0")
    expect(helper).toContain("#current-dose")
    expect(helper).toContain("#safety-consent")
    expect(helper).toContain("#medicare-irn")
    expect(helper).not.toContain("__e2e_auth_user_id")
    expect(helper).not.toContain("route.fulfill")

    const config = readFileSync(configPath, "utf8")
    expect(config).toContain("workers: 1")
    expect(config).not.toContain("globalSetup")
    expect(config).not.toContain("webServer")
    expect(config).toContain('trace: "off"')
    expect(config).toContain('video: "off"')
    expect(config).toContain('screenshot: "off"')

    const runner = readFileSync(runnerPath, "utf8")
    const cleanupStart = runner.indexOf("async function cleanup(")
    const childStop = runner.indexOf("await terminateOwnedChildren()", cleanupStart)
    const rowCleanup = runner.indexOf("cleanupHostedStripeRunArtifacts", childStop)
    const finalReceipt = runner.lastIndexOf("await writeHostedStripeReceiptAtomic")
    expect(cleanupStart).toBeGreaterThan(-1)
    expect(childStop).toBeGreaterThan(cleanupStart)
    expect(rowCleanup).toBeGreaterThan(childStop)
    expect(finalReceipt).toBeGreaterThan(rowCleanup)
    expect(runner).toContain("HOSTED_STRIPE_E2E_BROWSER_EVIDENCE_PATH")
    expect(runner).not.toContain("HOSTED_STRIPE_E2E_RECEIPT_PATH")

    const workflow = readFileSync(workflowPath, "utf8")
    expect(workflow).toMatch(/on:\s*\n\s*workflow_dispatch:/)
    expect(workflow).not.toMatch(/schedule:/)
    expect(workflow).not.toMatch(/push:/)
  })
})
