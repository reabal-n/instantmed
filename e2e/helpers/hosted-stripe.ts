import { expect, type Frame, type Locator, type Page } from "@playwright/test"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import Stripe from "stripe"

import { readLatestMailpitLink } from "./mailpit"

const APP_ORIGIN = "http://127.0.0.1:3060"
const SUPABASE_ORIGIN = "http://127.0.0.1:55321"
const PAYMENT_TIMEOUT_MS = 60_000
const RUN_ID_RE = /^stripe-run-[a-z0-9-]+$/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type HostedStripeService = "med-cert" | "repeat-script"
type HostedStripeBranch = "link" | "skip"

type IntakeStateRow = {
  amount_cents: number | null
  category: string | null
  exclude_from_reporting: boolean | null
  guest_email: string | null
  id: string
  patient_id: string
  payment_id: string | null
  payment_status: string | null
  status: string | null
  stripe_payment_intent_id: string | null
}

type WebhookEventRow = {
  error_message: string | null
  event_id: string
  event_type: string
  intake_id: string | null
  processed_at: string | null
  session_id: string | null
}

export interface PaidIntakeEvidence {
  amountCents: number
  category: string
  checkoutHostname: "checkout.stripe.com"
  checkoutSessionId: string
  currency: "aud"
  email: string
  eventId: string
  eventType: "checkout.session.completed"
  exclude_from_reporting: true
  intakeId: string
  livemode: false
  patientId: string
  paymentIntentId: string
  paymentIntentStatus: "succeeded"
  priorPaymentStatus: "pending"
  priorStatus: "pending_payment"
  signedWebhook: true
}

export interface HostedStripeCleanupScope {
  column: string
  operator: "eq" | "in"
  values: string[]
}

export interface HostedStripeCleanupOperation {
  scope: HostedStripeCleanupScope[]
  table: string
}

export interface HostedStripeSurvivorCounts {
  authUsers: number
  cleanupOperations: number
  emailOutbox: number
  intakes: number
  partialIntakes: number
  profiles: number
  webhookEvents: number
}

interface HostedStripeCoordinates {
  anonKey: string
  mailpitOrigin: string
  runId: string
  serviceRoleKey: string
  stripeSecretKey: string
  supabaseOrigin: string
}

const INTAKE_CHILD_TABLES = [
  "ai_draft_retry_queue",
  "stripe_webhook_dead_letter",
  "stripe_webhook_events",
  "payment_reconciliation",
  "payments",
  "email_outbox",
  "intake_events",
  "document_drafts",
  "compliance_audit_log",
  "audit_logs",
  "intake_followups",
  "intake_answers",
  "consents",
] as const

function safeFailure(message: string): Error {
  return new Error(`Hosted Stripe browser proof failed: ${message}`)
}

function assertExactLocalOrigin(
  raw: string | undefined,
  expected: string,
  label: string,
): string {
  if (!raw) throw safeFailure(`${label} is missing`)
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw safeFailure(`${label} is not the runner-owned loopback origin`)
  }
  const expectedUrl = new URL(expected)
  const normalize = (value: URL) =>
    value.hostname.toLowerCase() === "localhost"
      ? `http://127.0.0.1:${value.port}`
      : value.origin
  if (
    url.protocol !== "http:" ||
    normalize(url) !== normalize(expectedUrl) ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw safeFailure(`${label} is not the runner-owned loopback origin`)
  }
  return expected
}

function requireEnvironmentValue(
  env: Partial<NodeJS.ProcessEnv>,
  key: string,
): string {
  const value = env[key]
  if (!value) throw safeFailure(`${key} is missing`)
  return value
}

function hostedStripeCoordinates(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): HostedStripeCoordinates {
  if (
    env.NODE_ENV !== "production" ||
    env.PLAYWRIGHT !== "1" ||
    env.ALLOW_STRIPE_TEST_WEBHOOKS !== "true" ||
    Object.prototype.hasOwnProperty.call(env, "VERCEL") ||
    Object.prototype.hasOwnProperty.call(env, "VERCEL_ENV") ||
    Object.prototype.hasOwnProperty.call(env, "E2E_ISOLATED_SUPABASE")
  ) {
    throw safeFailure("runtime markers do not identify the dedicated local lane")
  }

  const runId = requireEnvironmentValue(env, "HOSTED_STRIPE_E2E_RUN_ID")
  if (!RUN_ID_RE.test(runId)) throw safeFailure("run ID is not run-scoped")

  const stripeSecretKey = requireEnvironmentValue(env, "STRIPE_SECRET_KEY")
  if (!/^(?:sk|rk)_test_/.test(stripeSecretKey)) {
    throw safeFailure("Stripe credential is not test mode")
  }

  const supabaseOrigin = assertExactLocalOrigin(
    env.HOSTED_STRIPE_E2E_SUPABASE_API_URL,
    SUPABASE_ORIGIN,
    "HOSTED_STRIPE_E2E_SUPABASE_API_URL",
  )
  assertExactLocalOrigin(env.SUPABASE_URL, SUPABASE_ORIGIN, "SUPABASE_URL")
  assertExactLocalOrigin(
    env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ORIGIN,
    "NEXT_PUBLIC_SUPABASE_URL",
  )
  assertExactLocalOrigin(env.PLAYWRIGHT_BASE_URL, APP_ORIGIN, "PLAYWRIGHT_BASE_URL")
  const mailpitOrigin = assertExactLocalOrigin(
    env.HOSTED_STRIPE_E2E_MAILPIT_URL,
    "http://127.0.0.1:55324",
    "HOSTED_STRIPE_E2E_MAILPIT_URL",
  )

  return {
    anonKey: requireEnvironmentValue(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    mailpitOrigin,
    runId,
    serviceRoleKey: requireEnvironmentValue(env, "SUPABASE_SERVICE_ROLE_KEY"),
    stripeSecretKey,
    supabaseOrigin,
  }
}

function serviceClient(
  coordinates = hostedStripeCoordinates(),
): SupabaseClient {
  return createClient(coordinates.supabaseOrigin, coordinates.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function expectedRecipient(runId: string, branch: HostedStripeBranch): string {
  if (!RUN_ID_RE.test(runId)) throw safeFailure("recipient run ID is not run-scoped")
  return `${runId}-${branch}@example.test`
}

export function hostedStripeRecipient(
  branch: HostedStripeBranch,
  env: Partial<NodeJS.ProcessEnv> = process.env,
): string {
  return expectedRecipient(hostedStripeCoordinates(env).runId, branch)
}

function assertIds(values: string[], label: string): void {
  if (values.some((value) => !UUID_RE.test(value))) {
    throw safeFailure(`${label} contains a non-owned identifier`)
  }
}

export function buildHostedStripeCleanupPlan({
  intakeIds,
  profileIds,
  runId,
}: {
  intakeIds: string[]
  profileIds: string[]
  runId: string
}): HostedStripeCleanupOperation[] {
  if (!RUN_ID_RE.test(runId)) throw safeFailure("cleanup run ID is not run-scoped")
  assertIds(intakeIds, "cleanup intake scope")
  assertIds(profileIds, "cleanup profile scope")
  const recipients = [
    expectedRecipient(runId, "skip"),
    expectedRecipient(runId, "link"),
  ]
  const intakeScope: HostedStripeCleanupScope[] = intakeIds.length > 0
    ? [{ column: "intake_id", operator: "in", values: intakeIds }]
    : [{ column: "intake_id", operator: "in", values: [] }]

  return [
    ...INTAKE_CHILD_TABLES.map((table) => ({
      table,
      scope: intakeScope,
    })),
    {
      table: "safety_audit_log",
      scope: [{ column: "request_id", operator: "in", values: intakeIds }],
    },
    {
      table: "notifications",
      scope: [{ column: "user_id", operator: "in", values: profileIds }],
    },
    {
      table: "audit_logs",
      scope: [{ column: "actor_id", operator: "in", values: profileIds }],
    },
    {
      table: "compliance_audit_log",
      scope: [{ column: "actor_id", operator: "in", values: profileIds }],
    },
    {
      table: "email_outbox",
      scope: [{ column: "patient_id", operator: "in", values: profileIds }],
    },
    {
      table: "partial_intakes",
      scope: [{ column: "email", operator: "in", values: recipients }],
    },
    {
      table: "email_outbox",
      scope: [{ column: "to_email", operator: "in", values: recipients }],
    },
    {
      table: "intakes",
      scope: intakeIds.length > 0
        ? [{ column: "id", operator: "in", values: intakeIds }]
        : [{ column: "guest_email", operator: "in", values: recipients }],
    },
    {
      table: "profiles",
      scope: profileIds.length > 0
        ? [{ column: "id", operator: "in", values: profileIds }]
        : [{ column: "email", operator: "in", values: recipients }],
    },
  ]
}

export function assertZeroHostedStripeSurvivors(
  counts: HostedStripeSurvivorCounts,
): void {
  if (Object.values(counts).some((count) => count !== 0)) {
    throw safeFailure("zero-survivor assertion failed")
  }
}

async function applyDelete(
  supabase: SupabaseClient,
  operation: HostedStripeCleanupOperation,
): Promise<void> {
  let query = supabase.from(operation.table).delete()
  let hasEffectiveScope = false
  for (const scope of operation.scope) {
    if (scope.values.length === 0) continue
    hasEffectiveScope = true
    query = scope.operator === "eq"
      ? query.eq(scope.column, scope.values[0])
      : query.in(scope.column, scope.values)
  }
  if (!hasEffectiveScope) return
  const { error } = await query
  if (error) throw safeFailure(`cleanup failed for ${operation.table}`)
}

async function exactCount(
  supabase: SupabaseClient,
  table: string,
  column: string,
  values: string[],
): Promise<number> {
  if (values.length === 0) return 0
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .in(column, values)
  if (error || count === null) throw safeFailure(`survivor check failed for ${table}`)
  return count
}

async function exactOperationCount(
  supabase: SupabaseClient,
  operation: HostedStripeCleanupOperation,
): Promise<number> {
  let query = supabase
    .from(operation.table)
    .select("id", { count: "exact", head: true })
  let hasEffectiveScope = false
  for (const scope of operation.scope) {
    if (scope.values.length === 0) continue
    hasEffectiveScope = true
    query = scope.operator === "eq"
      ? query.eq(scope.column, scope.values[0])
      : query.in(scope.column, scope.values)
  }
  if (!hasEffectiveScope) return 0
  const { count, error } = await query
  if (error || count === null) {
    throw safeFailure(`survivor check failed for ${operation.table}`)
  }
  return count
}

async function listRunAuthUsers(
  supabase: SupabaseClient,
  recipients: string[],
): Promise<Array<{ id: string }>> {
  const recipientSet = new Set(recipients)
  const matches: Array<{ id: string }> = []
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw safeFailure("Auth survivor lookup failed")
    for (const user of data.users) {
      if (user.email && recipientSet.has(user.email.toLowerCase())) {
        matches.push({ id: user.id })
      }
    }
    if (data.users.length < 100) break
  }
  return matches
}

/**
 * Removes only rows tied to the two deterministic recipients allocated to this
 * runner invocation. The runner calls this only after terminating the app and
 * listener, so background completion work cannot recreate a row after the
 * zero-survivor assertion. Error text never includes identifiers.
 */
export async function cleanupHostedStripeRunArtifacts(
  runId: string,
  env: Partial<NodeJS.ProcessEnv> = process.env,
): Promise<number> {
  if (!RUN_ID_RE.test(runId)) throw safeFailure("cleanup run ID is not run-scoped")
  const coordinates = hostedStripeCoordinates(env)
  if (coordinates.runId !== runId) throw safeFailure("cleanup run ID does not match runtime ownership")
  const supabase = serviceClient(coordinates)
  const recipients = [
    expectedRecipient(runId, "skip"),
    expectedRecipient(runId, "link"),
  ]

  const { data: intakeRows, error: intakeError } = await supabase
    .from("intakes")
    .select("id, patient_id, exclude_from_reporting")
    .in("guest_email", recipients)
  if (intakeError) throw safeFailure("cleanup intake discovery failed")
  if ((intakeRows ?? []).some((row) => row.exclude_from_reporting !== true)) {
    throw safeFailure("cleanup discovered a row outside the reporting-excluded lane")
  }
  const intakeIds = (intakeRows ?? []).map((row) => String(row.id))
  const profileIds = [...new Set((intakeRows ?? []).map((row) => String(row.patient_id)))]

  const cleanupPlan = buildHostedStripeCleanupPlan({ intakeIds, profileIds, runId })
  for (const operation of cleanupPlan) {
    await applyDelete(supabase, operation)
  }

  const authUsers = await listRunAuthUsers(supabase, recipients)
  for (const user of authUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) throw safeFailure("Auth cleanup failed")
  }

  const remainingAuthUsers = await listRunAuthUsers(supabase, recipients)
  const counts: HostedStripeSurvivorCounts = {
    authUsers: remainingAuthUsers.length,
    cleanupOperations: (await Promise.all(
      cleanupPlan.map((operation) => exactOperationCount(supabase, operation)),
    )).reduce((total, count) => total + count, 0),
    emailOutbox: await exactCount(supabase, "email_outbox", "to_email", recipients),
    intakes: await exactCount(supabase, "intakes", "guest_email", recipients),
    partialIntakes: await exactCount(supabase, "partial_intakes", "email", recipients),
    profiles: await exactCount(supabase, "profiles", "email", recipients),
    webhookEvents: await exactCount(
      supabase,
      "stripe_webhook_events",
      "intake_id",
      intakeIds,
    ),
  }
  assertZeroHostedStripeSurvivors(counts)
  return Object.values(counts).reduce((total, count) => total + count, 0)
}

async function pause(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForSingleIntake(
  supabase: SupabaseClient,
  recipient: string,
): Promise<IntakeStateRow> {
  const deadline = Date.now() + PAYMENT_TIMEOUT_MS
  while (Date.now() <= deadline) {
    const { data, error } = await supabase
      .from("intakes")
      .select("id, patient_id, guest_email, category, status, payment_status, payment_id, stripe_payment_intent_id, amount_cents, exclude_from_reporting")
      .eq("guest_email", recipient)
      .order("created_at", { ascending: false })
      .limit(2)
    if (error) throw safeFailure("intake lookup failed")
    if (data?.length === 1 && data[0].payment_id) return data[0] as IntakeStateRow
    if ((data?.length ?? 0) > 1) throw safeFailure("recipient produced more than one intake")
    await pause(250)
  }
  throw safeFailure("checkout did not persist one current intake before timeout")
}

async function markIntakeExcluded(
  supabase: SupabaseClient,
  intake: IntakeStateRow,
): Promise<IntakeStateRow> {
  const { data, error } = await supabase
    .from("intakes")
    .update({ exclude_from_reporting: true })
    .eq("id", intake.id)
    .eq("payment_id", intake.payment_id!)
    .eq("status", "pending_payment")
    .eq("payment_status", "pending")
    .select("id, patient_id, guest_email, category, status, payment_status, payment_id, stripe_payment_intent_id, amount_cents, exclude_from_reporting")
    .single()
  if (error || !data) throw safeFailure("could not contain the pending intake before payment")
  return data as IntakeStateRow
}

async function clickPrimaryContinue(page: Page): Promise<void> {
  const action = page.locator('[data-intake-primary-action="true"]').last()
  await expect(action).toBeEnabled({ timeout: 15_000 })
  await action.scrollIntoViewIfNeeded()
  await action.click()
}

async function dismissIntakeOverlay(page: Page): Promise<void> {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await essentialOnly.click()
  }
}

async function fillCoreIdentity(page: Page, recipient: string): Promise<void> {
  await expect(page.getByRole("heading", { name: /Your details/i })).toBeVisible({ timeout: 20_000 })
  const noThanks = page.getByRole("button", { name: /No thanks/i })
  if (await noThanks.isVisible({ timeout: 1_000 }).catch(() => false)) await noThanks.click()
  await page.locator('input[placeholder="Jane"]').fill("Stripe")
  await page.locator('input[placeholder="Smith"]').fill("Runner")
  await page.locator('input[placeholder="jane@example.com"]').fill(recipient)
  await page.locator('input[placeholder="DD/MM/YYYY"]').fill("01/01/1990")
}

async function completeRepeatScriptIntake(page: Page, recipient: string): Promise<void> {
  await page.goto("/request?service=repeat-script")
  await dismissIntakeOverlay(page)
  await expect(page.getByRole("heading", { name: "Your medication", exact: true })).toBeVisible({ timeout: 20_000 })

  await page.locator("#medication-name-0").fill("Atorvastatin")
  await page.locator("#medication-strength-0").fill("20 mg")
  await page.getByRole("radio", { name: /Within 12 months/i }).click()
  await page.locator("#current-dose").fill("1 tablet each evening")
  await page
    .getByRole("radiogroup", { name: "Same dose and directions as last time?" })
    .getByRole("radio", { name: "Same", exact: true })
    .click()
  await page.getByPlaceholder(/e\.g\. asthma/i).fill("high cholesterol")
  await page
    .getByRole("radiogroup", { name: "Any side effects?" })
    .getByRole("radio", { name: "No", exact: true })
    .click()
  await clickPrimaryContinue(page)

  await expect(page.getByRole("heading", { name: /Anything the doctor should know/i })).toBeVisible()
  await page.getByRole("button", { name: /None of these apply/i }).click()
  await clickPrimaryContinue(page)

  await fillCoreIdentity(page, recipient)
  await page.locator('input[placeholder="0412 345 678"]').fill("0412345678")
  await page.locator("#sex-select-trigger").click()
  await page.getByRole("option", { name: /^Male$/i }).click()
  await page.locator('input[placeholder="10 digits"]').fill("2123456701")
  await page.locator('input[placeholder="10 digits"]').blur()
  await page.locator("#medicare-irn").fill("1")

  const manualAddress = page.getByRole("button", { name: "Enter address manually", exact: true })
  await expect(manualAddress).toBeVisible()
  await manualAddress.click()
  await page.locator('[placeholder="Start typing your address..."]').fill("123 Test Street")
  await page.locator("#suburb").fill("Sydney")
  await page.locator("#state-select-trigger").click()
  await page.getByRole("option", { name: "NSW", exact: true }).click()
  await page.locator("#postcode").fill("2000")
  await clickPrimaryContinue(page)

  await expect(page.getByRole("heading", { name: "One last check" })).toBeVisible()
  await expect(page.getByText("Atorvastatin", { exact: true })).toBeVisible()
  await expect(page.getByText("20 mg", { exact: true })).toBeVisible()
  await expect(page.getByText("1 tablet each evening", { exact: true })).toBeVisible()
  await page.locator("#safety-consent").click()
}

async function completeMedCertIntake(page: Page, recipient: string): Promise<void> {
  await page.goto("/request?service=med-cert")
  await dismissIntakeOverlay(page)
  await expect(page.getByRole("heading", {
    name: "What do you need covered?",
    exact: true,
  })).toBeVisible({ timeout: 20_000 })
  await page
    .getByRole("radiogroup", { name: /Certificate type/i })
    .getByRole("radio", { name: /^Work$/i })
    .click()
  await page
    .getByRole("radiogroup", { name: /How many days/i })
    .getByRole("radio", { name: /1 day/i })
    .click()
  await page.getByRole("radio", { name: /^Today$/i }).click()
  await clickPrimaryContinue(page)

  await expect(page.getByRole("heading", { name: /What is stopping you today/i })).toBeVisible()
  await page.getByRole("button", { name: /Cold or flu/i }).click()
  await page.locator("#symptom-details").fill(
    "Mild cold symptoms since yesterday with a runny nose and tiredness.",
  )
  const duration = page.getByRole("radiogroup", {
    name: /How long have symptoms been present/i,
  }).getByRole("radio", { name: /1.?2 days/i })
  if (await duration.isVisible().catch(() => false)) await duration.click()
  await clickPrimaryContinue(page)

  await fillCoreIdentity(page, recipient)
  await clickPrimaryContinue(page)
  await expect(page.getByRole("heading", { name: "One last check" })).toBeVisible()
  await page.locator("#safety-consent").click()
}

async function findStripeField(
  page: Page,
  selector: string,
  required = true,
): Promise<Locator | null> {
  const deadline = Date.now() + (required ? 30_000 : 2_000)
  while (Date.now() <= deadline) {
    const frames: Frame[] = [
      page.mainFrame(),
      ...page.frames().filter((frame) => frame !== page.mainFrame()),
    ]
    for (const frame of frames) {
      const field = frame.locator(selector).first()
      if (await field.isVisible({ timeout: 100 }).catch(() => false)) return field
    }
    await pause(100)
  }
  if (required) throw safeFailure("hosted Checkout did not expose the expected card field")
  return null
}

async function fillHostedStripeCard(page: Page): Promise<void> {
  const cardNumber = await findStripeField(
    page,
    'input[name="cardNumber"], input[autocomplete="cc-number"], input[placeholder*="1234"]',
  )
  const expiry = await findStripeField(
    page,
    'input[name="cardExpiry"], input[autocomplete="cc-exp"], input[placeholder*="MM"]',
  )
  const cvc = await findStripeField(
    page,
    'input[name="cardCvc"], input[autocomplete="cc-csc"], input[placeholder*="CVC"]',
  )
  await cardNumber!.fill("4242424242424242")
  await expiry!.fill("1230")
  await cvc!.fill("123")

  const billingName = await findStripeField(
    page,
    'input[name="billingName"], input[autocomplete="cc-name"]',
    false,
  )
  if (billingName) await billingName.fill("Stripe Runner")
  const postalCode = await findStripeField(
    page,
    'input[name="billingPostalCode"], input[autocomplete="postal-code"]',
    false,
  )
  if (postalCode) await postalCode.fill("2000")

  const submit = page.locator('[data-testid="hosted-payment-submit-button"]').or(
    page.getByRole("button", { name: /^Pay(?:\s|$)/i }),
  ).first()
  await expect(submit).toBeEnabled({ timeout: 30_000 })
  await submit.click()
}

function stripeObjectId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null
}

export async function waitForActualStripePayment(
  intakeId: string,
): Promise<PaidIntakeEvidence> {
  if (!UUID_RE.test(intakeId)) throw safeFailure("intake lookup is not run-owned")
  const coordinates = hostedStripeCoordinates()
  const supabase = serviceClient(coordinates)
  const stripe = new Stripe(coordinates.stripeSecretKey, {
    maxNetworkRetries: 0,
    timeout: 15_000,
  })
  const deadline = Date.now() + PAYMENT_TIMEOUT_MS

  while (Date.now() <= deadline) {
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("id, patient_id, guest_email, category, status, payment_status, payment_id, stripe_payment_intent_id, amount_cents, exclude_from_reporting")
      .eq("id", intakeId)
      .maybeSingle()
    if (intakeError) throw safeFailure("paid intake lookup failed")
    const row = intake as IntakeStateRow | null

    if (
      row?.payment_id &&
      row.payment_status === "paid" &&
      row.status === "paid" &&
      row.exclude_from_reporting === true
    ) {
      let session: Stripe.Checkout.Session
      try {
        session = await stripe.checkout.sessions.retrieve(row.payment_id, {
          expand: ["payment_intent"],
        })
      } catch {
        throw safeFailure("Stripe Checkout Session retrieval failed; provider response suppressed")
      }

      const paymentIntentId = stripeObjectId(session.payment_intent)
      const paymentIntent = typeof session.payment_intent === "object"
        ? session.payment_intent
        : null
      const { data: webhookRows, error: webhookError } = await supabase
        .from("stripe_webhook_events")
        .select("event_id, event_type, intake_id, session_id, error_message, processed_at")
        .eq("session_id", session.id)
        .eq("intake_id", intakeId)
        .limit(2)
      if (webhookError) throw safeFailure("signed webhook evidence lookup failed")
      const webhook = webhookRows?.length === 1
        ? webhookRows[0] as WebhookEventRow
        : null

      if (
        session.livemode === false &&
        session.status === "complete" &&
        session.payment_status === "paid" &&
        session.currency?.toLowerCase() === "aud" &&
        typeof session.amount_total === "number" &&
        session.amount_total === row.amount_cents &&
        paymentIntentId &&
        paymentIntentId === row.stripe_payment_intent_id &&
        paymentIntent?.status === "succeeded" &&
        paymentIntent.currency.toLowerCase() === "aud" &&
        paymentIntent.amount === session.amount_total &&
        paymentIntent.amount_received === session.amount_total &&
        webhook?.event_type === "checkout.session.completed" &&
        webhook.session_id === session.id &&
        webhook.intake_id === intakeId &&
        webhook.processed_at &&
        webhook.error_message === null &&
        /^evt_[A-Za-z0-9]+$/.test(webhook.event_id)
      ) {
        return {
          amountCents: session.amount_total,
          category: row.category ?? "",
          checkoutHostname: "checkout.stripe.com",
          checkoutSessionId: session.id,
          currency: "aud",
          email: row.guest_email ?? "",
          eventId: webhook.event_id,
          eventType: "checkout.session.completed",
          exclude_from_reporting: true,
          intakeId,
          livemode: false,
          patientId: row.patient_id,
          paymentIntentId,
          paymentIntentStatus: "succeeded",
          priorPaymentStatus: "pending",
          priorStatus: "pending_payment",
          signedWebhook: true,
        }
      }
    }
    await pause(250)
  }

  throw safeFailure("exact provider, database, and signed-webhook evidence did not converge")
}

export async function completeRealHostedGuestPayment(
  page: Page,
  input: { recipient: string; service: HostedStripeService },
): Promise<PaidIntakeEvidence> {
  const coordinates = hostedStripeCoordinates()
  const expectedBranch: HostedStripeBranch = input.service === "repeat-script" ? "skip" : "link"
  if (input.recipient !== expectedRecipient(coordinates.runId, expectedBranch)) {
    throw safeFailure("recipient does not belong to this journey")
  }

  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  if (input.service === "repeat-script") {
    await completeRepeatScriptIntake(page, input.recipient)
  } else {
    await completeMedCertIntake(page, input.recipient)
  }

  const payButton = page.getByRole("button", { name: /^Pay \$/ }).filter({ visible: true })
  await expect(payButton).toHaveCount(1)
  await expect(payButton).toBeEnabled({ timeout: 15_000 })
  await Promise.all([
    page.waitForURL((url) => url.protocol === "https:" && url.hostname === "checkout.stripe.com", {
      timeout: PAYMENT_TIMEOUT_MS,
    }),
    payButton.click(),
  ])

  const supabase = serviceClient(coordinates)
  const pending = await markIntakeExcluded(
    supabase,
    await waitForSingleIntake(supabase, input.recipient),
  )
  const expectedAmount = input.service === "repeat-script" ? 2995 : 2495
  if (
    pending.status !== "pending_payment" ||
    pending.payment_status !== "pending" ||
    pending.amount_cents !== expectedAmount ||
    pending.exclude_from_reporting !== true ||
    !pending.payment_id
  ) {
    throw safeFailure("pre-payment database state did not match the current Checkout Session")
  }

  let openSession: Stripe.Checkout.Session
  try {
    const stripe = new Stripe(coordinates.stripeSecretKey, {
      maxNetworkRetries: 0,
      timeout: 15_000,
    })
    openSession = await stripe.checkout.sessions.retrieve(pending.payment_id)
  } catch {
    throw safeFailure("open Checkout Session retrieval failed; provider response suppressed")
  }
  if (
    openSession.id !== pending.payment_id ||
    openSession.livemode !== false ||
    openSession.status !== "open" ||
    openSession.payment_status === "paid" ||
    openSession.amount_total !== expectedAmount ||
    openSession.currency?.toLowerCase() !== "aud"
  ) {
    throw safeFailure("hosted Checkout pre-payment evidence was not exact test mode")
  }

  await fillHostedStripeCard(page)
  await page.waitForURL((url) => (
    url.origin === APP_ORIGIN && url.pathname === "/auth/complete-account"
  ), { timeout: PAYMENT_TIMEOUT_MS })
  const evidence = await waitForActualStripePayment(pending.id)
  if (
    evidence.checkoutSessionId !== pending.payment_id ||
    evidence.email !== input.recipient ||
    evidence.amountCents !== expectedAmount
  ) {
    throw safeFailure("paid evidence no longer matches the current checkout")
  }
  await expect(page.getByRole("heading", { name: "Your request is confirmed" })).toBeVisible({
    timeout: PAYMENT_TIMEOUT_MS,
  })
  return evidence
}

export async function expectNoAuthAccountForPaidGuest(
  evidence: PaidIntakeEvidence,
): Promise<void> {
  const supabase = serviceClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id")
    .eq("id", evidence.patientId)
    .single()
  if (error || !profile || profile.auth_user_id !== null) {
    throw safeFailure("account-skip profile was unexpectedly linked")
  }
  const users = await listRunAuthUsers(supabase, [evidence.email])
  if (users.length !== 0) throw safeFailure("account-skip journey created an Auth user")
}

export async function followMagicLinkAndExpectOwnedIntake(
  page: Page,
  evidence: PaidIntakeEvidence,
): Promise<void> {
  const coordinates = hostedStripeCoordinates()
  const magicLink = await readLatestMailpitLink(evidence.email, {
    mailpitOrigin: coordinates.mailpitOrigin,
  })
  await page.goto(magicLink)
  await page.waitForURL((url) => (
    url.origin === APP_ORIGIN && url.pathname.startsWith("/patient")
  ), { timeout: PAYMENT_TIMEOUT_MS })

  const supabase = serviceClient(coordinates)
  await expect.poll(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("auth_user_id, email_verified_at")
      .eq("id", evidence.patientId)
      .maybeSingle()
    return Boolean(data?.auth_user_id && data.email_verified_at)
  }, { timeout: PAYMENT_TIMEOUT_MS }).toBe(true)

  const users = await listRunAuthUsers(supabase, [evidence.email])
  if (users.length !== 1) throw safeFailure("magic-link journey did not create one Auth user")

  await page.goto("/patient")
  await expect(page).toHaveURL(`${APP_ORIGIN}/patient`)
  await expect(page.locator(`a[href="/patient/intakes/${evidence.intakeId}"]`).first()).toBeVisible({
    timeout: PAYMENT_TIMEOUT_MS,
  })
}
