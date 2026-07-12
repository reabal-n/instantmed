import { expect, test } from "@playwright/test"

import {
  loginAsDoctor,
  loginAsOperator,
  loginAsPatient,
  loginAsSupport,
  logoutTestUser,
} from "./helpers/auth"
import {
  cleanupTestIntake,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const OPERATOR_ID = "e2e00000-0000-0000-0000-000000000001"
const DOCTOR_ID = "e2e00000-0000-0000-0000-000000000003"
const SERVICE_ID = "e2e00000-0000-0000-0000-000000000020"
const BATCH_REVIEW_PATIENT_ID = "e2e00000-0000-0000-0000-0000000000a3"

interface BatchReviewFixture {
  intakeId: string
  patientId: string
}

async function seedPendingBatchReview(hoursOld = 1): Promise<BatchReviewFixture> {
  const seeded = await seedTestIntake({
    status: "approved",
    payment_status: "paid",
    category: "medical_certificate",
    service_id: SERVICE_ID,
  })
  if (!seeded.success || !seeded.intakeId) {
    throw new Error(seeded.error || "Could not seed batch-review intake")
  }

  const supabase = getSupabaseClient()
  const approvedAt = new Date(Date.now() - hoursOld * 3_600_000).toISOString()
  const today = new Date().toISOString().slice(0, 10)
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const patientId = BATCH_REVIEW_PATIENT_ID

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: patientId,
    auth_user_id: null,
    email: `e2e-batch-${unique}@instantmed-e2e.test`,
    full_name: "E2E Batch Review Patient",
    date_of_birth: "1990-05-15",
    sex: "M",
    role: "patient",
    phone: "0400000000",
    address_line1: "1 E2E Street",
    suburb: "Sydney",
    state: "NSW",
    postcode: "2000",
    onboarding_completed: true,
    email_verified: true,
    email_verified_at: approvedAt,
  }, { onConflict: "id" })
  if (profileError) throw new Error(`Could not seed isolated E2E patient: ${profileError.message}`)

  const { error: intakeError } = await supabase
    .from("intakes")
    .update({
      patient_id: patientId,
      ai_approved: true,
      ai_approved_at: approvedAt,
      ai_approval_reason: "E2E deterministic eligible certificate",
      batch_reviewed_at: null,
      batch_reviewed_by: null,
      approved_at: approvedAt,
      reviewed_at: approvedAt,
      reviewed_by: OPERATOR_ID,
      exclude_from_reporting: true,
      updated_at: approvedAt,
    })
    .eq("id", seeded.intakeId)
  if (intakeError) throw new Error(`Could not mark E2E intake auto-approved: ${intakeError.message}`)

  const { error: answersError } = await supabase.from("intake_answers").insert({
    intake_id: seeded.intakeId,
    answers: {
      certificateType: "work",
      absenceStartDate: today,
      absenceEndDate: today,
      symptomDetails: "E2E mild viral symptoms suitable for certificate review.",
    },
    absence_start_date: today,
    absence_end_date: today,
    symptom_severity: "mild",
  })
  if (answersError) throw new Error(`Could not seed E2E intake answers: ${answersError.message}`)

  const { error: certificateError } = await supabase.from("issued_certificates").insert({
    intake_id: seeded.intakeId,
    certificate_number: `E2E-BATCH-${unique}`,
    verification_code: `E2EBATCH${unique}`,
    idempotency_key: `e2e-batch-${seeded.intakeId}`,
    certificate_type: "work",
    status: "valid",
    issue_date: today,
    start_date: today,
    end_date: today,
    patient_id: patientId,
    patient_name: "E2E Test Patient",
    patient_dob: "1990-05-15",
    doctor_id: OPERATOR_ID,
    doctor_name: "Dr. E2E Operator",
    doctor_nominals: "MBBS",
    doctor_provider_number: "1234567A",
    doctor_ahpra_number: "MED0001234567",
    template_config_snapshot: {},
    clinic_identity_snapshot: {},
    storage_path: `med-certs/${patientId}/e2e-batch-${unique}.pdf`,
    email_sent_at: approvedAt,
  })
  if (certificateError) throw new Error(`Could not seed E2E certificate: ${certificateError.message}`)

  return { intakeId: seeded.intakeId, patientId }
}

async function openOldestBatchReview(
  page: import("@playwright/test").Page,
) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/dashboard")
  await waitForPageLoad(page)
  await page.waitForLoadState("networkidle")
  // Compile the review-data route before selection. In local Next dev, the
  // first route compile triggers Fast Refresh and would otherwise clear the
  // selected split-pane case while its request is in flight.
  await page.evaluate(async () => {
    await Promise.all([
      fetch("/api/doctor/intakes/00000000-0000-0000-0000-000000000000/review-data"),
      fetch("/api/csrf"),
    ])
  })
  await page.goto("/dashboard")
  await waitForPageLoad(page)
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1_500)
  const queue = page.getByRole("region", { name: "Doctor request queue" })
  const banner = queue.getByTestId("batch-review-banner")
  await expect(banner).toBeVisible({ timeout: 15_000 })
  const openOldestButton = banner.getByRole("button", { name: "Review oldest certificate" })
  await openOldestButton.click()
  await expect(page.getByTestId("intake-review-loading")).toBeVisible()
  // Next dev can replay the dashboard tree once after its first clinical-panel
  // dependency is evaluated. The loading assertion above proves the first
  // click selected the case; retry only when that development-only replay
  // removed the pane. Production bundles do not cold-compile on interaction.
  await page.waitForTimeout(500)
  if (
    await page.getByTestId("intake-review-loading").count() === 0 &&
    await page.getByTestId("intake-review-panel").count() === 0
  ) {
    await openOldestButton.click()
  }
  await expect(page.getByTestId("intake-review-panel")).toBeVisible({ timeout: 15_000 })
  const attestation = page.getByTestId("batch-review-attestation")
  await expect(attestation).toBeVisible({ timeout: 15_000 })
  return attestation
}

test.describe.serial("Medical certificate batch review", () => {
  const cleanupFixtures: BatchReviewFixture[] = []

  test.beforeEach(() => {
    test.skip(!isDbAvailable(), "DB credentials required")
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
    const fixtures = cleanupFixtures.splice(0)
    await Promise.all(fixtures.map(({ intakeId }) => cleanupTestIntake(intakeId)))
    const patientIds = fixtures.map(({ patientId }) => patientId)
    if (patientIds.length > 0) {
      await getSupabaseClient().from("profiles").delete().in("id", patientIds)
    }
  })

  test("doctor and admin see the oldest pending review and acknowledge it", async ({ page }) => {
    const fixture = await seedPendingBatchReview(10_000)
    cleanupFixtures.push(fixture)
    const { intakeId } = fixture

    const adminLogin = await loginAsOperator(page)
    expect(adminLogin.success, adminLogin.error).toBe(true)
    await page.goto("/dashboard")
    await expect(
      page.getByRole("region", { name: "Doctor request queue" }).getByTestId("batch-review-banner"),
    ).toBeVisible({ timeout: 15_000 })

    await logoutTestUser(page)
    const doctorLogin = await loginAsDoctor(page)
    expect(doctorLogin.success, doctorLogin.error).toBe(true)
    const attestation = await openOldestBatchReview(page)
    await attestation.getByLabel("I reviewed the intake and issued certificate.").check()
    await attestation.getByRole("button", { name: "Confirm reviewed" }).click()
    await expect(attestation).not.toBeVisible({ timeout: 10_000 })

    const { data, error } = await getSupabaseClient()
      .from("intakes")
      .select("batch_reviewed_at, batch_reviewed_by")
      .eq("id", intakeId)
      .single()
    expect(error).toBeNull()
    expect(data?.batch_reviewed_at).toBeTruthy()
    expect(data?.batch_reviewed_by).toBe(DOCTOR_ID)
  })

  test("revocation stamps review completion and returns the case to manual assessment", async ({ page }) => {
    const fixture = await seedPendingBatchReview(10_000)
    cleanupFixtures.push(fixture)
    const { intakeId } = fixture
    const login = await loginAsOperator(page)
    expect(login.success, login.error).toBe(true)

    const attestation = await openOldestBatchReview(page)
    await attestation.getByRole("button", { name: "Revoke certificate" }).click()
    await attestation.getByLabel("Why does this certificate need manual review?").fill(
      "The issued dates need a manual clinical correction.",
    )
    await attestation.getByRole("button", { name: "Revoke and return to review" }).click()
    await expect(attestation).not.toBeVisible({ timeout: 10_000 })

    const supabase = getSupabaseClient()
    const [{ data: intake, error: intakeError }, { data: certificate, error: certificateError }] = await Promise.all([
      supabase
        .from("intakes")
        .select("status, batch_reviewed_at, batch_reviewed_by")
        .eq("id", intakeId)
        .single(),
      supabase
        .from("issued_certificates")
        .select("status")
        .eq("intake_id", intakeId)
        .single(),
    ])
    expect(intakeError).toBeNull()
    expect(certificateError).toBeNull()
    expect(intake?.status).toBe("in_review")
    expect(intake?.batch_reviewed_at).toBeTruthy()
    expect(intake?.batch_reviewed_by).toBe(OPERATOR_ID)
    expect(certificate?.status).toBe("revoked")
  })

  test("patient and support roles cannot access the clinical oversight queue", async ({ page }) => {
    const fixture = await seedPendingBatchReview(10_000)
    cleanupFixtures.push(fixture)

    const patientLogin = await loginAsPatient(page)
    expect(patientLogin.success, patientLogin.error).toBe(true)
    await page.goto("/dashboard")
    await expect(page).not.toHaveURL(/\/dashboard(?:\?|$)/)
    await expect(page.getByTestId("batch-review-banner")).toHaveCount(0)

    await logoutTestUser(page)
    const supportLogin = await loginAsSupport(page)
    expect(supportLogin.success, supportLogin.error).toBe(true)
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/admin\/ops/, { timeout: 15_000 })
    await expect(page.getByTestId("batch-review-banner")).toHaveCount(0)
  })

  test("overdue reviews render the warning state", async ({ page }) => {
    const fixture = await seedPendingBatchReview(26)
    cleanupFixtures.push(fixture)
    const login = await loginAsOperator(page)
    expect(login.success, login.error).toBe(true)

    await page.goto("/dashboard")
    const banner = page
      .getByRole("region", { name: "Doctor request queue" })
      .getByTestId("batch-review-banner")
    await expect(banner).toBeVisible({ timeout: 15_000 })
    await expect(banner).toContainText("The oldest review is overdue.")

    await page.emulateMedia({ colorScheme: "dark" })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    const mobileBanner = page
      .getByRole("region", { name: "Doctor request queue" })
      .getByTestId("batch-review-banner")
    await expect(mobileBanner).toBeVisible({ timeout: 15_000 })
    await expect(
      mobileBanner.getByRole("button", { name: "Review oldest certificate" }),
    ).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
})
