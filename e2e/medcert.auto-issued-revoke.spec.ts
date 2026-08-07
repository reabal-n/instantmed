import { expect, test } from "@playwright/test"

import { loginAsDoctor, loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  cleanupTestIntake,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

/**
 * Behavioural proof for the auto-issued certificate correction path.
 *
 * Replaces the revocation coverage lost with `medcert.batch-review.spec.ts`
 * (#428). That spec asserted the real chain — UI click through to a revoked
 * certificate and a reopened intake — and deleting it left only source-string
 * assertions, which cannot catch a broken action, a rejected DB transition, or
 * a control that renders but does nothing.
 *
 * Deliberately seeds the CANONICAL seeded patient (`seedTestIntake`'s default)
 * rather than minting a fresh profile id. The deleted spec re-pointed to its
 * own patient, which escaped `filterSeededE2EIntakes` (patient-id keyed) and
 * let a crashed teardown leak a test intake into real operator reads — logged
 * as an open audit finding in the 2026-07-12 cleanup roadmap. Do not
 * reintroduce a bespoke patient id here.
 */

const OPERATOR_ID = "e2e00000-0000-0000-0000-000000000001"
const SERVICE_ID = "e2e00000-0000-0000-0000-000000000020"

async function seedAutoIssuedCertificate(): Promise<{ intakeId: string; certNumber: string }> {
  const seeded = await seedTestIntake({
    status: "approved",
    payment_status: "paid",
    category: "medical_certificate",
    service_id: SERVICE_ID,
  })
  if (!seeded.success || !seeded.intakeId) {
    throw new Error(seeded.error || "Could not seed auto-issued intake")
  }

  const supabase = getSupabaseClient()
  const approvedAt = new Date(Date.now() - 3_600_000).toISOString()
  const today = new Date().toISOString().slice(0, 10)
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const certNumber = `E2E-AUTO-${unique}`

  const { error: intakeError } = await supabase
    .from("intakes")
    .update({
      ai_approved: true,
      ai_approved_at: approvedAt,
      ai_approval_reason: "E2E deterministic eligible certificate",
      approved_at: approvedAt,
      reviewed_at: approvedAt,
      reviewed_by: OPERATOR_ID,
      exclude_from_reporting: true,
      updated_at: approvedAt,
    })
    .eq("id", seeded.intakeId)
  if (intakeError) throw new Error(`Could not mark intake auto-issued: ${intakeError.message}`)

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
  if (answersError) throw new Error(`Could not seed intake answers: ${answersError.message}`)

  const { error: certificateError } = await supabase.from("issued_certificates").insert({
    intake_id: seeded.intakeId,
    certificate_number: certNumber,
    verification_code: `E2EAUTO${unique}`.replace(/-/g, ""),
    idempotency_key: `e2e-auto-${seeded.intakeId}`,
    certificate_type: "work",
    status: "valid",
    issue_date: today,
    start_date: today,
    end_date: today,
    patient_id: "e2e00000-0000-0000-0000-000000000002",
    patient_name: "E2E Test Patient",
    patient_dob: "1990-05-15",
    doctor_id: OPERATOR_ID,
    doctor_name: "Dr. E2E Operator",
    doctor_nominals: "MBBS",
    doctor_provider_number: "1234567A",
    doctor_ahpra_number: "MED0001234567",
    template_config_snapshot: {},
    clinic_identity_snapshot: {},
    storage_path: `med-certs/e2e/auto-${unique}.pdf`,
    email_sent_at: approvedAt,
  })
  if (certificateError) throw new Error(`Could not seed certificate: ${certificateError.message}`)

  return { intakeId: seeded.intakeId, certNumber }
}

test.describe("auto-issued certificate revocation", () => {
  test.skip(!isDbAvailable(), "Requires Supabase service-role credentials")

  test("admin revokes an auto-issued certificate and the case returns to manual review", async ({
    page,
  }) => {
    const { intakeId } = await seedAutoIssuedCertificate()

    try {
      const login = await loginAsOperator(page)
      expect(login.success, login.error).toBe(true)

      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`/doctor/intakes/${intakeId}`)
      await waitForPageLoad(page)

      // The whole point of the fix: a delivered auto-issued certificate must
      // still offer exactly one decision — revoke.
      const trigger = page.getByTestId("revoke-auto-issued-trigger")
      await expect(trigger).toBeVisible()
      await trigger.click()

      await page
        .getByLabel("Why does this certificate need manual review?")
        .fill("E2E: duration exceeds what the clinical note supports")

      await page.getByTestId("revoke-auto-issued-submit").click()

      // Typed confirmation, not a second plain click.
      const typedInput = page.getByTestId("typed-confirm-input")
      await expect(typedInput).toBeVisible()
      const confirmButton = page.getByTestId("typed-confirm-action")
      await expect(confirmButton).toBeDisabled()
      await typedInput.fill("REVOKE")
      await expect(confirmButton).toBeEnabled()
      await confirmButton.click()

      // Assert the real outcome, not a toast.
      const supabase = getSupabaseClient()
      await expect
        .poll(
          async () => {
            const { data } = await supabase
              .from("issued_certificates")
              .select("status")
              .eq("intake_id", intakeId)
              .maybeSingle()
            return data?.status ?? null
          },
          { timeout: 20_000, message: "certificate should end up revoked" },
        )
        .toBe("revoked")

      const { data: intake } = await supabase
        .from("intakes")
        .select("status")
        .eq("id", intakeId)
        .maybeSingle()
      expect(intake?.status).toBe("in_review")
    } finally {
      await logoutTestUser(page)
      await cleanupTestIntake(intakeId)
    }
  })

  test("a non-admin doctor is not offered the auto-issued revoke control", async ({ page }) => {
    // The server action is admin-only because the caller supplies an arbitrary
    // intake id and the lookup runs with the service role. The UI must agree.
    const { intakeId } = await seedAutoIssuedCertificate()

    try {
      const login = await loginAsDoctor(page)
      expect(login.success, login.error).toBe(true)

      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`/doctor/intakes/${intakeId}`)
      await waitForPageLoad(page)

      await expect(page.getByTestId("revoke-auto-issued-trigger")).toHaveCount(0)

      const supabase = getSupabaseClient()
      const { data: certificate } = await supabase
        .from("issued_certificates")
        .select("status")
        .eq("intake_id", intakeId)
        .maybeSingle()
      expect(certificate?.status).toBe("valid")
    } finally {
      await logoutTestUser(page)
      await cleanupTestIntake(intakeId)
    }
  })
})
