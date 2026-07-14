/**
 * Doctor review cockpit E2E coverage.
 *
 * The dashboard owns an in-page split pane, not the retired slide-over. These
 * tests lock the compact review hierarchy, explicit profile intent boundary,
 * and the Clinical / History / Operations patient-record split.
 */

import { expect, type Page, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  getIntakeById,
  getSupabaseClient,
  INTAKE_ID,
  isDbAvailable,
  resetIntakeForRetest,
} from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const E2E_PATIENT_ID = "e2e00000-0000-0000-0000-000000000002"
const SEEDED_PATIENT_NAME = "E2E Test Patient"
const LANDING_PATH = "/medical-certificate"

async function seedReviewContext(): Promise<void> {
  await resetIntakeForRetest(INTAKE_ID)

  const supabase = getSupabaseClient()
  const { error: attributionError } = await supabase
    .from("intakes")
    .update({
      gclid: "e2e-google-click",
      landing_page: `https://instantmed.com.au${LANDING_PATH}`,
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "e2e-clinical-review",
      keyword: "online medical certificate",
      updated_at: new Date().toISOString(),
    })
    .eq("id", INTAKE_ID)

  if (attributionError) {
    throw new Error(`Failed to seed review attribution: ${attributionError.message}`)
  }

  const { error: profileError } = await supabase
    .from("patient_health_profiles")
    .upsert({
      patient_id: E2E_PATIENT_ID,
      allergies: ["Penicillin"],
      allergies_enc: null,
      conditions: ["Asthma"],
      conditions_enc: null,
      current_medications: ["Salbutamol"],
      current_medications_enc: null,
      notes_enc: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "patient_id" })
  if (profileError) throw new Error(`Failed to seed saved clinical profile: ${profileError.message}`)
}

async function cleanupReviewContext(): Promise<void> {
  const supabase = getSupabaseClient()
  const [profileResult, intakeResult] = await Promise.all([
    supabase
      .from("patient_health_profiles")
      .delete()
      .eq("patient_id", E2E_PATIENT_ID),
    supabase
      .from("intakes")
      .update({
        gclid: null,
        landing_page: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        keyword: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", INTAKE_ID),
  ])

  if (profileResult.error) {
    throw new Error(`Failed to clean saved clinical profile: ${profileResult.error.message}`)
  }
  if (intakeResult.error) {
    throw new Error(`Failed to clean review attribution: ${intakeResult.error.message}`)
  }
}

async function openSeededReviewCockpit(page: Page) {
  await page.goto("/dashboard")
  await waitForPageLoad(page)

  await expect(page.getByRole("heading", { name: "Today's queue" })).toBeVisible({ timeout: 15_000 })

  const patientRow = page
    .getByTestId(`queue-row-${INTAKE_ID}`)
    .getByRole("button", {
      name: new RegExp(`Open case for ${SEEDED_PATIENT_NAME}`, "i"),
    })
  await expect(patientRow).toBeVisible({ timeout: 15_000 })
  await patientRow.click()

  const cockpit = page.getByTestId("intake-review-panel")
  await expect(cockpit).toBeVisible({ timeout: 15_000 })
  await expect(cockpit.getByRole("heading", { name: SEEDED_PATIENT_NAME })).toBeVisible()
  return cockpit
}

test.describe("Doctor review cockpit", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    test.skip(!isDbAvailable(), "DB credentials required")
    await seedReviewContext()
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)

    // Compile and authenticate the drawer endpoint before the dashboard mounts.
    // In Next dev mode, compiling it on first click can trigger a full-page Fast
    // Refresh that correctly closes the transient drawer and makes this UI test
    // race the development server rather than the product behavior.
    const summaryResponse = await page.request.get(
      `/api/doctor/patients/${E2E_PATIENT_ID}/summary`,
    )
    expect(summaryResponse.ok(), "Patient summary route should be ready").toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
    await cleanupReviewContext()
  })

  test("opens the inline cockpit with patient safety context and one request packet", async ({ page }) => {
    const cockpit = await openSeededReviewCockpit(page)
    const safetyBand = cockpit.getByRole("region", { name: "Patient safety context" })

    await expect(safetyBand).toBeVisible()
    await expect(safetyBand.getByLabel(`Acquisition source: Google Ads via ${LANDING_PATH}`)).toBeVisible()
    await expect(safetyBand.getByText("Age / DOB", { exact: true })).toBeVisible()
    await expect(safetyBand.getByText("Sex", { exact: true })).toBeVisible()
    await expect(safetyBand.getByText("Location", { exact: true })).toBeVisible()
    await expect(safetyBand.getByText("Phone", { exact: true })).toBeVisible()
    await expect(safetyBand.getByText("Medicare / IHI", { exact: true })).toBeVisible()
    await expect(safetyBand.getByText("Visits", { exact: true })).toBeVisible()
    await expect(safetyBand.getByRole("button", { name: "View profile" })).toBeVisible()
    await expect(safetyBand.getByRole("link", { name: "Open full record" })).toHaveAttribute(
      "href",
      `/doctor/intakes/${INTAKE_ID}`,
    )

    await expect(cockpit.getByRole("region", { name: "Request packet" })).toHaveCount(1)
  })

  test("keeps the draft note and full intake collapsed until requested", async ({ page }) => {
    const cockpit = await openSeededReviewCockpit(page)
    const draftNote = cockpit.getByRole("button", { name: "Draft note · Review required" })
    const fullIntake = cockpit.getByRole("button", { name: /Show full intake/i })

    await expect(draftNote).toHaveAttribute("aria-expanded", "false")
    await expect(fullIntake).toHaveAttribute("aria-expanded", "false")
    await expect(cockpit.locator('[contenteditable="true"]')).toHaveCount(0)

    await draftNote.click()
    await expect(draftNote).toHaveAttribute("aria-expanded", "true")
    await expect(cockpit.locator('[contenteditable="true"]')).toHaveCount(1)

    await fullIntake.click()
    await expect(cockpit.getByRole("button", { name: "Hide full intake" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    await expect(cockpit.getByRole("region", { name: "Full intake answers" })).toBeVisible()
  })

  test("quick profile adds saved clinical context without repeating the active request", async ({ page }) => {
    const cockpit = await openSeededReviewCockpit(page)
    const activeIntake = await getIntakeById(INTAKE_ID)

    await cockpit.getByRole("button", { name: "View profile" }).click()
    const drawer = page.getByRole("dialog", { name: "Patient profile" })

    await expect(drawer).toBeVisible()
    await expect(drawer.getByText("Saved clinical profile", { exact: true })).toBeVisible()
    await expect(drawer.getByText("Penicillin", { exact: true })).toBeVisible()
    await expect(drawer.getByText("Asthma", { exact: true })).toBeVisible()
    await expect(drawer.getByText("Salbutamol", { exact: true })).toBeVisible()
    await expect(drawer.getByText(/requests total · \d+ notes total/)).toBeVisible()
    await expect(drawer.getByText("Recent activity", { exact: true })).toBeVisible()
    if (activeIntake?.reference_number) {
      await expect(drawer.getByText(activeIntake.reference_number, { exact: true })).toHaveCount(0)
    }
    await expect(drawer.getByRole("link", { name: "Open full record" })).toHaveAttribute(
      "href",
      `/doctor/patients/${E2E_PATIENT_ID}`,
    )
  })

  test("full patient record opens on Clinical and separates history from operations", async ({ page }) => {
    const cockpit = await openSeededReviewCockpit(page)
    await cockpit.getByRole("button", { name: "View profile" }).click()

    const drawer = page.getByRole("dialog", { name: "Patient profile" })
    await Promise.all([
      page.waitForURL(`**/doctor/patients/${E2E_PATIENT_ID}`, { timeout: 15_000 }),
      drawer.getByRole("link", { name: "Open full record" }).click(),
    ])
    await waitForPageLoad(page)
    await expect(page).toHaveURL(`/doctor/patients/${E2E_PATIENT_ID}`)

    const tabs = page.getByRole("tablist", { name: "Patient record sections" })
    const clinicalTab = tabs.getByRole("tab", { name: "Clinical" })
    const historyTab = tabs.getByRole("tab", { name: "History" })
    const operationsTab = tabs.getByRole("tab", { name: "Operations" })

    await expect(clinicalTab).toHaveAttribute("aria-selected", "true")
    const clinicalPanel = page.getByRole("tabpanel", { name: "Clinical" })
    await expect(clinicalPanel.getByText("Saved clinical profile", { exact: true })).toBeVisible()
    await expect(clinicalPanel.getByText("Identity and contact", { exact: true })).toBeVisible()
    await expect(clinicalPanel.getByText("Acquisition", { exact: true })).toHaveCount(0)

    await historyTab.click()
    await expect(historyTab).toHaveAttribute("aria-selected", "true")
    const historyPanel = page.getByRole("tabpanel", { name: "History" })
    await expect(historyPanel.getByText("Clinical history", { exact: true })).toBeVisible()

    await operationsTab.click()
    await expect(operationsTab).toHaveAttribute("aria-selected", "true")
    const operationsPanel = page.getByRole("tabpanel", { name: "Operations" })
    await expect(operationsPanel.getByText("Prescribing", { exact: true })).toBeVisible()
    await expect(operationsPanel.getByText("Acquisition", { exact: true })).toBeVisible()
    const landingPageTerm = operationsPanel.getByText("Landing page", { exact: true }).first()
    await expect(landingPageTerm.locator("..").locator("dd")).toHaveText(LANDING_PATH)
    await expect(operationsPanel.getByText("e2e-clinical-review", { exact: true })).toBeVisible()
    await expect(operationsPanel.getByText("online medical certificate", { exact: true })).toBeVisible()
    await expect(operationsPanel.getByText("Operational activity", { exact: true })).toBeVisible()
    await expect(operationsPanel.getByText("Profile administration", { exact: true })).toBeVisible()
  })
})
