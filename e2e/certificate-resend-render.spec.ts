import { createHash } from "node:crypto"

import { expect, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"

const OPERATOR_ID = "e2e00000-0000-0000-0000-000000000001"
const PATIENT_ID = "e2e30000-0000-4000-8000-000000000001"
const SERVICE_ID = "e2e30000-0000-4000-8000-000000000002"
const INTAKE_ID = "e2e30000-0000-4000-8000-000000000003"
const CERTIFICATE_ID = "e2e30000-0000-4000-8000-000000000004"
const RETRY_OUTBOX_ID = "e2e30000-0000-4000-8000-000000000005"
const REFERENCE_NUMBER = "E2E-CERT-RENDER"
const RETRY_SUBJECT = "Synthetic no-frozen certificate retry"
const STORAGE_PATH = `certificates/${CERTIFICATE_ID}.pdf`
const STORAGE_VERSION = createHash("sha256").update(STORAGE_PATH).digest("hex").slice(0, 32)
const PROVIDER_BLOCK_MESSAGE = "E2E provider blocked before external delivery"
const FROZEN_PROVIDER_PAYLOAD_KEY = "_provider_payload_enc"

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey || process.env.E2E_ISOLATED_SUPABASE !== "1") {
  throw new Error("Certificate resend production E2E requires explicit isolated Supabase credentials")
}

if (new URL(supabaseUrl).port !== "55321") {
  throw new Error("Certificate resend production E2E refuses non-isolated Supabase coordinates")
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

async function mustDelete(table: string, column: string, value: string) {
  const { error } = await supabase.from(table).delete().eq(column, value)
  if (error) throw new Error(`Could not clean synthetic ${table} rows: ${error.message}`)
}

async function cleanupFixture() {
  await mustDelete("certificate_resend_attempts", "certificate_id", CERTIFICATE_ID)
  await mustDelete("email_outbox", "intake_id", INTAKE_ID)
  await mustDelete("certificate_audit_log", "certificate_id", CERTIFICATE_ID)
  await mustDelete("issued_certificates", "id", CERTIFICATE_ID)
  await mustDelete("intakes", "id", INTAKE_ID)
  await mustDelete("profiles", "id", PATIENT_ID)
  await mustDelete("services", "id", SERVICE_ID)
  await mustDelete("profiles", "id", OPERATOR_ID)
}

async function verifyRequiredCleanup() {
  for (const [table, column, value] of [
    ["certificate_resend_attempts", "certificate_id", CERTIFICATE_ID],
    ["email_outbox", "intake_id", INTAKE_ID],
    ["intakes", "id", INTAKE_ID],
  ] as const) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(column, value)
    if (error) throw new Error(`Could not verify synthetic ${table} cleanup: ${error.message}`)
    expect(count, `${table} synthetic rows should be removed`).toBe(0)
  }
}

async function seedFixture() {
  await cleanupFixture()

  const now = new Date().toISOString()
  const date = now.slice(0, 10)
  const { error: operatorError } = await supabase.from("profiles").insert({
    id: OPERATOR_ID,
    auth_user_id: null,
    email: "certificate-render-operator@example.test",
    full_name: "Synthetic Operator",
    role: "admin",
    onboarding_completed: true,
    email_verified: true,
    email_verified_at: now,
  })
  if (operatorError) throw new Error(`Could not seed synthetic operator: ${operatorError.message}`)

  const { error: patientError } = await supabase.from("profiles").insert({
    id: PATIENT_ID,
    auth_user_id: null,
    email: "certificate-render-patient@example.test",
    full_name: "Synthetic Patient",
    role: "patient",
    onboarding_completed: false,
    email_verified: false,
  })
  if (patientError) throw new Error(`Could not seed synthetic patient: ${patientError.message}`)

  const { error: serviceError } = await supabase.from("services").insert({
    id: SERVICE_ID,
    slug: "certificate-render-e2e",
    name: "Synthetic Medical Certificate",
    short_name: "Synthetic Certificate",
    description: "Isolated production-bundle fixture",
    type: "med_certs",
    price_cents: 2495,
    is_active: true,
  })
  if (serviceError) throw new Error(`Could not seed synthetic service: ${serviceError.message}`)

  const { error: intakeError } = await supabase.from("intakes").insert({
    id: INTAKE_ID,
    patient_id: PATIENT_ID,
    service_id: SERVICE_ID,
    reference_number: REFERENCE_NUMBER,
    category: "medical_certificate",
    subtype: "work",
    status: "pending_payment",
    payment_id: "pi_e2e_certificate_render",
    payment_status: "paid",
    amount_cents: 2495,
    paid_at: now,
    approved_at: now,
    exclude_from_reporting: true,
    created_at: now,
    updated_at: now,
  })
  if (intakeError) throw new Error(`Could not seed synthetic intake: ${intakeError.message}`)

  for (const status of ["paid", "approved"] as const) {
    const { error } = await supabase
      .from("intakes")
      .update({ status, updated_at: now })
      .eq("id", INTAKE_ID)
    if (error) throw new Error(`Could not transition synthetic intake to ${status}: ${error.message}`)
  }

  const { error: certificateError } = await supabase.from("issued_certificates").insert({
    id: CERTIFICATE_ID,
    intake_id: INTAKE_ID,
    certificate_number: "MC-E2E-RENDER-001",
    certificate_ref: "MC-E2E-RENDER-001",
    verification_code: "SYNTH-VERIFY",
    idempotency_key: "certificate-render-e2e-idempotency",
    certificate_type: "work",
    status: "valid",
    issue_date: date,
    start_date: date,
    end_date: date,
    patient_id: PATIENT_ID,
    patient_name: "Synthetic Patient",
    patient_dob: "1990-01-01",
    doctor_id: OPERATOR_ID,
    doctor_name: "Synthetic Operator",
    doctor_nominals: "MBBS",
    doctor_provider_number: "7654321B",
    doctor_ahpra_number: "MED0007654321",
    template_config_snapshot: {},
    clinic_identity_snapshot: {},
    storage_path: STORAGE_PATH,
    email_retry_count: 0,
    resend_count: 0,
    created_at: now,
    updated_at: now,
  })
  if (certificateError) {
    throw new Error(`Could not seed synthetic certificate: ${certificateError.message}`)
  }
}

test.describe("certificate resend rendering in the production bundle", () => {
  test.beforeAll(async () => {
    await seedFixture()
  })

  test.afterAll(async () => {
    await cleanupFixture()
    await verifyRequiredCleanup()
  })

  test("renders staff resend and no-frozen email-hub reconstruction without external delivery", async ({ page }) => {
    const runtimeErrors: string[] = []
    page.on("pageerror", (error) => runtimeErrors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text())
    })

    const login = await loginAsOperator(page)
    expect(login.success, login.error).toBe(true)

    await page.goto(`/doctor/intakes/${INTAKE_ID}`, { waitUntil: "networkidle" })
    const resendButton = page.getByRole("button", { name: "Resend", exact: true })
    await expect(resendButton).toBeVisible()
    await resendButton.click()
    await expect(page.getByText("Certificate email resent to patient", { exact: true })).toBeVisible()

    const directOutbox = await expect.poll(async () => {
      const { data, error } = await supabase
        .from("email_outbox")
        .select("id, status, metadata")
        .eq("intake_id", INTAKE_ID)
        .eq("email_type", "med_cert_patient")
        .maybeSingle()
      if (error) throw error
      return data
    }).not.toBeNull().then(async () => {
      const { data, error } = await supabase
        .from("email_outbox")
        .select("id, status, metadata")
        .eq("intake_id", INTAKE_ID)
        .eq("email_type", "med_cert_patient")
        .single()
      if (error) throw error
      return data
    })

    expect(directOutbox.status).toBe("skipped_e2e")
    expect(directOutbox.metadata).toMatchObject({
      certificate_storage_version: STORAGE_VERSION,
      e2e_mode: true,
    })
    expect(directOutbox.metadata).not.toHaveProperty(FROZEN_PROVIDER_PAYLOAD_KEY)
    expect(JSON.stringify(directOutbox.metadata)).not.toContain(STORAGE_PATH)
    expect(JSON.stringify(directOutbox.metadata)).not.toContain("supabase")

    const { data: attempts, error: attemptsError } = await supabase
      .from("certificate_resend_attempts")
      .select("id, status, certificate_storage_path, count_toward_staff_limit, email_outbox_id")
      .eq("certificate_id", CERTIFICATE_ID)
    expect(attemptsError).toBeNull()
    expect(attempts).toHaveLength(1)
    expect(attempts?.[0]).toMatchObject({
      status: "sent",
      certificate_storage_path: STORAGE_PATH,
      count_toward_staff_limit: true,
      email_outbox_id: directOutbox.id,
    })

    const { data: certificate, error: certificateReadError } = await supabase
      .from("issued_certificates")
      .select("id, storage_path, resend_count")
      .eq("id", CERTIFICATE_ID)
      .single()
    expect(certificateReadError).toBeNull()
    expect(certificate).toMatchObject({
      id: CERTIFICATE_ID,
      storage_path: STORAGE_PATH,
      resend_count: 1,
    })

    const { error: retrySeedError } = await supabase.from("email_outbox").insert({
      id: RETRY_OUTBOX_ID,
      email_type: "med_cert_patient",
      to_email: "certificate-render-patient@example.test",
      to_name: "Synthetic Patient",
      subject: RETRY_SUBJECT,
      status: "failed",
      provider: "resend",
      error_message: "Synthetic retry fixture",
      retry_count: 0,
      intake_id: INTAKE_ID,
      patient_id: PATIENT_ID,
      certificate_id: CERTIFICATE_ID,
      metadata: { certificate_storage_version: STORAGE_VERSION },
      last_attempt_at: new Date().toISOString(),
    })
    expect(retrySeedError).toBeNull()

    await page.goto(`/admin/emails/hub?intake_id=${INTAKE_ID}`, { waitUntil: "networkidle" })
    await page.getByRole("tab", { name: "Queue", exact: true }).click()
    const retryRow = page.locator("div.grid").filter({ hasText: RETRY_SUBJECT }).first()
    await expect(retryRow).toBeVisible()
    await retryRow.getByRole("button", { name: "Retry", exact: true }).click()
    await expect(
      page.getByLabel("Notifications alt+T").getByText(PROVIDER_BLOCK_MESSAGE, { exact: true }),
    ).toBeVisible()

    const reconstructedOutbox = await expect.poll(async () => {
      const { data, error } = await supabase
        .from("email_outbox")
        .select("status, retry_count, error_message, metadata")
        .eq("id", RETRY_OUTBOX_ID)
        .single()
      if (error) throw error
      return data.retry_count >= 1 ? data : null
    }).not.toBeNull().then(async () => {
      const { data, error } = await supabase
        .from("email_outbox")
        .select("status, retry_count, error_message, metadata")
        .eq("id", RETRY_OUTBOX_ID)
        .single()
      if (error) throw error
      return data
    })

    expect(reconstructedOutbox).toMatchObject({
      status: "failed",
      retry_count: 1,
      error_message: PROVIDER_BLOCK_MESSAGE,
    })
    expect(reconstructedOutbox.metadata?.[FROZEN_PROVIDER_PAYLOAD_KEY]).toEqual(expect.any(String))
    expect(JSON.stringify(reconstructedOutbox.metadata)).not.toContain(STORAGE_PATH)
    expect(JSON.stringify(reconstructedOutbox.metadata)).not.toContain("supabase")

    expect(runtimeErrors.join("\n")).not.toMatch(/React is not defined|Template render failed/i)
    expect(reconstructedOutbox.error_message).not.toMatch(/React is not defined|Template render failed/i)

    // A confirmed terminal provider attempt cannot replay its cached send key.
    const { error: terminalError } = await supabase.from("email_outbox")
      .update({ delivery_status: "failed", retry_count: 10 }).eq("id", RETRY_OUTBOX_ID)
    expect(terminalError).toBeNull()
    await page.reload({ waitUntil: "networkidle" })
    await page.getByRole("tab", { name: "Queue", exact: true }).click()
    const terminalRow = page.locator("div.grid").filter({ hasText: RETRY_SUBJECT }).first()
    await expect(terminalRow.getByText("New attempt required", { exact: true })).toBeVisible()
    await expect(terminalRow.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0)

    await logoutTestUser(page)
  })

  test("staff evidence remains usable across viewport and theme", async ({ page }, testInfo) => {
    test.setTimeout(180_000)
    const login = await loginAsOperator(page)
    expect(login.success, login.error).toBe(true)
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    for (const width of [1440, 375]) {
      for (const theme of ["light", "dark"] as const) {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
        await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
        await page.goto("/admin/analytics", { waitUntil: "networkidle" })
        await expect(page.getByRole("heading", { name: "Business", exact: true })).toBeVisible()
        await expect(page.getByRole("heading", { name: /something went wrong/i })).toHaveCount(0)
        await page.locator("summary").filter({ hasText: "Measurement checkpoints" }).click()
        await expect(page.getByRole("heading", { name: "Refill reminder cohorts", exact: true })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
        await page.screenshot({ path: testInfo.outputPath(`analytics-${width}-${theme}.png`) })

        await page.goto(`/admin/emails/hub?intake_id=${INTAKE_ID}`, { waitUntil: "networkidle" })
        await page.getByRole("tab", { name: "Queue", exact: true }).click()
        await expect(page.getByText(RETRY_SUBJECT, { exact: true })).toBeVisible()
        await expect(page.getByRole("heading", { name: /something went wrong/i })).toHaveCount(0)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
        await page.screenshot({ path: testInfo.outputPath(`email-hub-${width}-${theme}.png`) })
      }
    }
    expect(errors).toEqual([])
    await logoutTestUser(page)
  })
})
