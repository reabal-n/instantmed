import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

import { LEGACY_REPEAT_RX_RECONCILIATION_NOTE } from "@/lib/clinical/repeat-rx-attestation"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  cleanupTestIntake,
  getIntakeById,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const E2E_OPERATOR_ID = "e2e00000-0000-0000-0000-000000000001"
const E2E_PATIENT_ID = "e2e00000-0000-0000-0000-000000000002"
const E2E_CONSULT_SERVICE_ID = "e2e00000-0000-0000-0000-000000000022"

async function seedRepeatPrescriptionCase({
  answerOverrides = {},
  confirmUnchangedRegimen = true,
  patientId = E2E_PATIENT_ID,
}: {
  answerOverrides?: Record<string, unknown>
  confirmUnchangedRegimen?: boolean
  patientId?: string
} = {}): Promise<string> {
  const seed = await seedTestIntake({
    status: "in_review",
    payment_status: "paid",
    category: "prescription",
    claimed_by: E2E_OPERATOR_ID,
    patient_id: patientId,
  })

  if (!seed.success || !seed.intakeId) {
    throw new Error(`Failed to seed repeat prescription case: ${seed.error}`)
  }

  const supabase = getSupabaseClient()
  const { error: patientError } = await supabase
    .from("profiles")
    .update({
      sex: "M",
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId)

  if (patientError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to complete repeat prescription patient identity: ${patientError.message}`)
  }

  const { error: noteError } = await supabase
    .from("intakes")
    .update({
      doctor_notes:
        "E2E review note: patient repeat prescription history and safety answers reviewed before prescribing.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", seed.intakeId)

  if (noteError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to seed repeat prescription clinical note: ${noteError.message}`)
  }

  const { error } = await supabase.from("intake_answers").insert({
    intake_id: seed.intakeId,
    answers: {
      medicationName: "Atorvastatin",
      medicationStrength: "20 mg",
      medicationForm: "tablet",
      currentDose: "Take one tablet at night",
      prescriptionHistory: "Previously prescribed by regular GP",
      known_allergies: "No known allergies",
      existing_conditions: "Hypercholesterolaemia",
      current_medications: "Atorvastatin",
      isPregnantOrBreastfeeding: "no",
      hasAdverseMedicationReactions: "no",
      ...(confirmUnchangedRegimen ? { doseChanged: false } : {}),
      ...answerOverrides,
    },
  })

  if (error) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to seed repeat prescription answers: ${error.message}`)
  }

  return seed.intakeId
}

async function seedReviewProfilePatient({
  sex = "M",
}: {
  sex?: "F" | "M"
} = {}): Promise<string> {
  const patientId = randomUUID()
  const profileToken = patientId.slice(0, 8)
  const phoneSuffix = String(Number.parseInt(profileToken, 16)).padStart(8, "0").slice(-8)
  const now = new Date().toISOString()
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("profiles")
    .insert({
      id: patientId,
      auth_user_id: null,
      email: `doctor-review-${patientId}@test.instantmed.com.au`,
      full_name: `E2E Profile ${profileToken}`,
      date_of_birth: "1985-05-20",
      role: "patient",
      sex,
      onboarding_completed: true,
      email_verified: true,
      email_verified_at: now,
      address_line1: "12 Clinical Way",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      phone: `04${phoneSuffix}`,
      medicare_number: "2123456701",
      medicare_irn: 1,
      medicare_expiry: "2028-12-01",
      created_at: now,
      updated_at: now,
    })

  if (error) throw new Error(`Failed to seed profile-review patient: ${error.message}`)
  return patientId
}

async function cleanupReviewProfilePatient(patientId: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from("patient_health_profiles").delete().eq("patient_id", patientId)
  await supabase.from("profiles").delete().eq("id", patientId)
}

async function recordDurableScriptEvidence(intakeId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("intakes")
    .update({
      status: "awaiting_script",
      script_sent: true,
      script_sent_at: now,
      script_notes: "Sent outside Parchment: E2E manual script evidence",
      parchment_reference: "E2E-MANUAL-SCRIPT",
      updated_at: now,
    })
    .eq("id", intakeId)

  if (error) {
    throw new Error(`Failed to record durable script evidence: ${error.message}`)
  }
}

async function seedPrescribingConsultCase({
  answers,
  doctorNotes,
  patientId,
  sex,
  subtype,
}: {
  answers: Record<string, unknown>
  doctorNotes: string
  patientId: string
  sex: "F" | "M"
  subtype: "ed" | "hair_loss" | "womens_health"
}): Promise<string> {
  const supabase = getSupabaseClient()
  const { error: serviceError } = await supabase
    .from("services")
    .upsert({
      id: E2E_CONSULT_SERVICE_ID,
      slug: "consult-e2e",
      name: "E2E Consult",
      short_name: "E2E Consult",
      description: "Deterministic E2E consult service",
      type: "consult",
      price_cents: 4995,
      is_active: true,
      created_at: new Date().toISOString(),
    }, { onConflict: "id" })

  if (serviceError) {
    throw new Error(`Failed to seed consult service: ${serviceError.message}`)
  }

  const seed = await seedTestIntake({
    status: "paid",
    payment_status: "paid",
    category: "consult",
    service_id: E2E_CONSULT_SERVICE_ID,
    claimed_by: E2E_OPERATOR_ID,
    patient_id: patientId,
  })

  if (!seed.success || !seed.intakeId) {
    throw new Error(`Failed to seed ${subtype} consult case: ${seed.error}`)
  }

  const now = new Date().toISOString()
  const { error: patientError } = await supabase
    .from("profiles")
    .update({
      sex,
      updated_at: now,
    })
    .eq("id", patientId)

  if (patientError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to complete ${subtype} patient identity: ${patientError.message}`)
  }

  const { error: intakeError } = await supabase
    .from("intakes")
    .update({
      subtype,
      doctor_notes: doctorNotes,
      updated_at: now,
    })
    .eq("id", seed.intakeId)

  if (intakeError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to seed ${subtype} intake metadata: ${intakeError.message}`)
  }

  const { error: answersError } = await supabase.from("intake_answers").insert({
    intake_id: seed.intakeId,
    answers: { consultSubtype: subtype, ...answers },
  })

  if (answersError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Failed to seed ${subtype} answers: ${answersError.message}`)
  }

  return seed.intakeId
}

async function seedWomensHealthUtiCase(patientId: string): Promise<string> {
  return seedPrescribingConsultCase({
    patientId,
    sex: "F",
    subtype: "womens_health",
    doctorNotes:
      "S: Patient reports lower urinary tract symptoms.\nO: Structured UTI screen completed.\nA: Likely uncomplicated lower UTI.\nP: Prescribe if clinically appropriate.",
    answers: {
      womensHealthOption: "uti",
      utiSymptoms: ["burning", "frequency", "urgency", "cloudy"],
      utiRedFlags: "no",
      utiPregnant: "no",
      known_allergies: "No known allergies",
      existing_conditions: "None reported",
      current_medications: "None reported",
    },
  })
}

const SPECIALTY_SCENARIOS = [
  {
    label: "erectile dysfunction",
    subtype: "ed" as const,
    title: "Erectile dysfunction consult",
    expectedFact: "As-needed",
    answers: {
      edGoal: "improve_erections",
      edDuration: "1_to_3_years",
      edPreference: "prn",
      iiefTotal: 12,
      edNitrates: "no",
      edRecentHeartEvent: "no",
      edSevereHeart: "no",
      edBpMedication: "no",
      edAlphaBlockers: "no",
      previousEdMeds: "no",
      has_allergies: "no",
      has_conditions: "no",
      takes_medications: "no",
    },
  },
  {
    label: "hair loss",
    subtype: "hair_loss" as const,
    title: "Hair loss consult",
    expectedFact: "Over 12 months",
    answers: {
      hairGoal: "both",
      hairOnset: "over_12_months",
      hairPattern: "noticeable_thinning",
      hairFamilyHistory: "no_or_unsure",
      hairMedicationPreference: "oral",
      hairReproductive: "no",
      scalpNone: true,
      hairLowBP: false,
      hairHeartConditions: false,
      has_allergies: "no",
      has_conditions: "no",
      takes_medications: "no",
    },
  },
]

test.describe("Doctor prescription UI flow", () => {
  const testIntakeIds: string[] = []
  const testPatientIds: string[] = []

  test.beforeEach(async ({ page }) => {
    test.skip(!isDbAvailable(), "Database required for prescription UI flow")
    const login = await loginAsOperator(page)
    expect(login.success, `E2E login should succeed: ${login.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
    for (const intakeId of testIntakeIds.splice(0)) {
      await cleanupTestIntake(intakeId)
    }
    for (const patientId of testPatientIds.splice(0)) {
      await cleanupReviewProfilePatient(patientId)
    }
  })

  test("shows request-versus-profile differences only after explicit profile intent", async ({ page }) => {
    const patientId = await seedReviewProfilePatient()
    testPatientIds.push(patientId)
    const intakeId = await seedRepeatPrescriptionCase({ patientId })
    testIntakeIds.push(intakeId)

    const supabase = getSupabaseClient()
    const { error } = await supabase.from("patient_health_profiles").insert({
      patient_id: patientId,
      allergies: ["Penicillin"],
      allergies_enc: null,
      conditions: ["Asthma"],
      conditions_enc: null,
      current_medications: ["Salbutamol"],
      current_medications_enc: null,
      notes_enc: null,
      updated_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Failed to seed profile conflict: ${error.message}`)

    let profileSummaryRequests = 0
    page.on("request", (request) => {
      if (request.url().includes(`/api/doctor/patients/${patientId}/summary`)) {
        profileSummaryRequests += 1
      }
    })

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)
    await expect.poll(() => profileSummaryRequests).toBe(0)

    await page.getByRole("button", { name: "View profile" }).click()
    const drawer = page.getByRole("dialog", { name: "Patient profile" })
    await expect(drawer).toBeVisible()
    await expect.poll(() => profileSummaryRequests).toBeGreaterThanOrEqual(1)
    await expect(drawer.getByText("Identity and contact", { exact: true })).toBeVisible()
    await expect(drawer.getByText(/Patient-entered · Updated/)).toBeVisible({ timeout: 15000 })
    await expect(drawer.getByText("Review differences", { exact: true })).toBeVisible()
    await expect(drawer.getByText("Current request", { exact: true }).first()).toBeVisible()
    await expect(drawer.getByText("Saved profile", { exact: true }).first()).toBeVisible()
    await expect(drawer.getByText("Penicillin", { exact: true })).toBeVisible()
    await expect(drawer.getByText("No known allergies", { exact: true })).toBeVisible()

    await Promise.all([
      page.waitForURL(`**/doctor/patients/${patientId}?requestId=${intakeId}`),
      drawer.getByRole("link", { name: "Open full record" }).click(),
    ])
    const clinicalPanel = page.getByRole("tabpanel", { name: "Clinical" })
    await expect(clinicalPanel.getByText("Review differences", { exact: true })).toBeVisible()
    await expect(clinicalPanel.getByText("No known allergies", { exact: true })).toBeVisible()
    await expect(clinicalPanel.getByText("Penicillin", { exact: true })).toBeVisible()
  })

  test("shows an explicit empty saved-profile state without inventing differences", async ({ page }) => {
    const patientId = await seedReviewProfilePatient()
    testPatientIds.push(patientId)
    const intakeId = await seedRepeatPrescriptionCase({ patientId })
    testIntakeIds.push(intakeId)

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)
    await page.getByRole("button", { name: "View profile" }).click()

    const drawer = page.getByRole("dialog", { name: "Patient profile" })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText("No saved clinical profile", { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(drawer.getByText("Review differences", { exact: true })).toHaveCount(0)
  })

  test("renders an embedded strength once while keeping it inferred and the missing form explicit", async ({ page }) => {
    const patientId = await seedReviewProfilePatient()
    testPatientIds.push(patientId)
    const intakeId = await seedRepeatPrescriptionCase({
      patientId,
      answerOverrides: {
        medicationName: "Effexor 75mg",
        medicationStrength: "",
        medicationForm: "",
        currentDose: "75 mg once daily",
        indication: "Anxiety",
        prescriptionHistory: "3_to_6_months",
      },
    })
    testIntakeIds.push(intakeId)

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)

    const packet = page.getByRole("region", { name: "Request packet" })
    await expect(packet).toBeVisible({ timeout: 15000 })
    await expect(packet.getByText("2 items to confirm", { exact: true })).toBeVisible()

    const medicine = packet.locator('[data-review-fact="medicine"]')
    const strength = packet.locator('[data-review-fact="strength"]')
    const form = packet.locator('[data-review-fact="form"]')
    const recency = packet.locator('[data-review-fact="last_prescribed"]')

    await expect(medicine.getByText("Effexor", { exact: true })).toBeVisible()
    await expect(medicine).not.toContainText("75mg")
    await expect(page.getByText("Effexor", { exact: true })).toHaveCount(1)
    await expect(strength).toHaveAttribute("data-review-fact-state", "inferred")
    await expect(strength.getByText("75mg", { exact: true })).toBeVisible()
    await expect(strength.getByText("Inferred from patient text · Confirm strength", { exact: true })).toBeVisible()
    await expect(form).toHaveAttribute("data-review-fact-state", "missing")
    await expect(form.getByText("Not recorded", { exact: true })).toBeVisible()
    await expect(form.getByText("Confirm form", { exact: true })).toBeVisible()
    await expect(recency.getByText("3–6 months ago", { exact: true })).toBeVisible()
    await expect(page.getByText("3_to_6_months", { exact: true })).toHaveCount(0)
  })

  test("shows prior request history while excluding the active request from the profile drawer", async ({ page }) => {
    const patientId = await seedReviewProfilePatient()
    testPatientIds.push(patientId)
    const prior = await seedTestIntake({
      status: "paid",
      payment_status: "paid",
      category: "medical_certificate",
      patient_id: patientId,
    })
    if (!prior.success || !prior.intakeId) {
      throw new Error(`Failed to seed prior request: ${prior.error}`)
    }
    testIntakeIds.push(prior.intakeId)

    const intakeId = await seedRepeatPrescriptionCase({ patientId })
    testIntakeIds.push(intakeId)
    const [priorIntake, activeIntake] = await Promise.all([
      getIntakeById(prior.intakeId),
      getIntakeById(intakeId),
    ])
    if (!priorIntake?.reference_number || !activeIntake?.reference_number) {
      throw new Error("Seeded request references should be available")
    }

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)
    await page.getByRole("button", { name: "View profile" }).click()

    const drawer = page.getByRole("dialog", { name: "Patient profile" })
    await expect(drawer.getByText("2 requests total · 0 notes total", { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(drawer.getByText(priorIntake.reference_number)).toBeVisible()
    await expect(drawer.getByText(activeIntake.reference_number)).toHaveCount(0)
  })

  for (const scenario of SPECIALTY_SCENARIOS) {
    test(`renders one canonical packet for ${scenario.label} prescribing`, async ({ page }) => {
      const patientId = await seedReviewProfilePatient()
      testPatientIds.push(patientId)
      const intakeId = await seedPrescribingConsultCase({
        patientId,
        sex: "M",
        subtype: scenario.subtype,
        doctorNotes: `E2E ${scenario.label} review note.`,
        answers: scenario.answers,
      })
      testIntakeIds.push(intakeId)

      await page.goto(`/doctor/intakes/${intakeId}`)
      await waitForPageLoad(page)

      const packet = page.getByRole("region", { name: "Request packet" })
      await expect(packet).toBeVisible({ timeout: 15000 })
      await expect(packet.getByRole("heading", { name: scenario.title })).toBeVisible()
      await expect(packet.getByText(scenario.expectedFact, { exact: true })).toBeVisible()
      await expect(page.locator('[data-review-packet="true"]')).toHaveCount(1)

      const actionRail = page.locator('[data-review-action-rail="true"]').first()
      await expect(actionRail.getByRole("button", { name: "Prescribe" })).toBeVisible()
      await expect(actionRail.getByRole("button", { name: "Complete request" })).toBeDisabled()
      await expect(actionRail.getByRole("button", { name: "Approve" })).toHaveCount(0)
    })
  }

  test("auto-unlocks Complete request after durable script evidence is recorded", async ({ page }) => {
    const intakeId = await seedRepeatPrescriptionCase()
    testIntakeIds.push(intakeId)

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)

    const actionRail = page.locator('[data-review-action-rail="true"]').first()
    await expect(actionRail.getByRole("button", { name: "Prescribe" })).toBeVisible({ timeout: 15000 })

    const completeButton = actionRail.getByRole("button", { name: "Complete request" })
    await expect(completeButton).toBeDisabled()
    await expect(actionRail.getByText("Complete or record the prescription in Parchment first.")).toBeVisible()

    await actionRail.getByRole("button", { name: "Sent outside Parchment" }).click()
    const manualSentPanel = page.getByRole("dialog", { name: "Confirm sent outside Parchment" })
    await expect(manualSentPanel).toBeVisible()
    await expect(manualSentPanel.getByLabel("Parchment or external reference")).toBeVisible()
    await expect(manualSentPanel.getByLabel("Channel used (recorded in the audit log)")).toBeVisible()
    await expect(manualSentPanel.getByRole("button", { name: "Confirm sent" })).toBeEnabled()
    await page.keyboard.press("Escape")
    await expect(manualSentPanel).toBeHidden()

    await recordDurableScriptEvidence(intakeId)
    await page.evaluate(() => window.dispatchEvent(new Event("focus")))

    const refreshedActionRail = page.locator('[data-review-action-rail="true"]').first()
    await expect(page.getByText("Prescription recorded — complete when ready")).toBeVisible()
    await expect(page.getByText("Prescription recorded").first()).toBeVisible()
    await expect(page.getByText("Prescription already recorded").first()).toBeVisible()
    await expect(refreshedActionRail.getByRole("button", { name: "Prescribe" })).toHaveCount(0)
    await expect(refreshedActionRail.getByRole("button", { name: "Complete request" })).toBeEnabled()
  })

  test("requires a saved reconciliation acknowledgement for recorded legacy script evidence", async ({ page }) => {
    const intakeId = await seedRepeatPrescriptionCase({ confirmUnchangedRegimen: false })
    testIntakeIds.push(intakeId)
    await recordDurableScriptEvidence(intakeId)

    await page.goto(`/doctor/intakes/${intakeId}`)
    await waitForPageLoad(page)

    const actionRail = page.locator('[data-review-action-rail="true"]').first()
    await expect(actionRail.getByRole("button", { name: "Prescribe" })).toHaveCount(0)
    await expect(actionRail.getByRole("button", { name: "Sent outside Parchment" })).toHaveCount(0)

    const completeButton = actionRail.getByRole("button", { name: "Complete request" })
    await expect(completeButton).toBeDisabled()
    await page.getByRole("button", {
      name: "Recorded-script reconciliation note · Review required",
    }).click()

    await page.getByRole("button", { name: "Acknowledge recorded script evidence" }).click()
    await expect(completeButton).toBeDisabled()
    await page.getByRole("button", { name: "Save reconciliation note" }).click()

    await expect.poll(async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from("intakes")
        .select("doctor_notes")
        .eq("id", intakeId)
        .single()
      return data?.doctor_notes ?? ""
    }, { timeout: 15000 }).toContain(LEGACY_REPEAT_RX_RECONCILIATION_NOTE)
    await expect(completeButton).toBeEnabled()

    await completeButton.click()
    await expect.poll(async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from("intakes")
        .select("status")
        .eq("id", intakeId)
        .single()
      return data?.status ?? null
    }).toBe("completed")
  })

  test("women's health UTI review keeps completion disabled until fulfilment is recorded", async ({ page }) => {
    const patientId = await seedReviewProfilePatient({ sex: "F" })
    testPatientIds.push(patientId)
    const intakeId = await seedWomensHealthUtiCase(patientId)
    testIntakeIds.push(intakeId)

    await page.goto("/dashboard?status=review#doctor-queue")
    await waitForPageLoad(page)

    const row = page.locator(`[data-testid="queue-row-${intakeId}"]`)
    await expect(row).toBeVisible({ timeout: 15000 })
    await row.getByRole("button", { name: /Open case for/i }).click()

    await expect(page.getByText("Women's health · UTI")).toBeVisible({ timeout: 15000 })

    const compactSafety = page.locator('[data-compact-safety-summary="true"]')
    await expect(compactSafety).toBeVisible()
    await expect(compactSafety.locator('[data-safety-severity="info"]')).toHaveCount(3)
    await expect(compactSafety.locator('[data-safety-severity="block"]')).toHaveCount(0)
    await expect(compactSafety.locator('[data-safety-severity="caution"]')).toHaveCount(0)

    const actionRail = page.locator('[data-review-action-rail="true"]').first()
    await expect(actionRail.getByRole("button", { name: "Prescribe" })).toBeVisible()
    const completeButton = actionRail.getByRole("button", { name: "Complete request" })
    await expect(completeButton).toBeVisible()
    await expect(completeButton).toBeDisabled()
    await expect(actionRail.getByRole("button", { name: "Approve" })).toHaveCount(0)
  })
})
