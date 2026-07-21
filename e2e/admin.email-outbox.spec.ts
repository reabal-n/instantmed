/**
 * Email Delivery Hub E2E Smoke Test
 *
 * Verifies ops can see med_cert_patient outbox rows in the current
 * /admin/emails/hub delivery ledger without needing database access.
 */

import { expect,test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { getSupabaseClient, INTAKE_ID, isDbAvailable } from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

async function seedMedCertPatientOutboxRow(): Promise<{ id: string; subject: string }> {
  const subject = `E2E med cert delivery ledger ${Date.now()}`
  const { data, error } = await getSupabaseClient()
    .from("email_outbox")
    .insert({
      email_type: "med_cert_patient",
      to_email: "auto.medcert.e2e@example.test",
      to_name: "E2E Test Patient",
      subject,
      status: "skipped_e2e",
      provider: "resend",
      provider_message_id: null,
      retry_count: 0,
      intake_id: INTAKE_ID,
      metadata: {
        e2e: true,
        source: "admin.email-outbox.spec",
      },
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(`Failed to seed med_cert_patient outbox row: ${error?.message || "missing row"}`)
  }

  return { id: data.id, subject }
}

async function deleteOutboxRow(id: string | null): Promise<void> {
  if (!id) return

  const { error } = await getSupabaseClient()
    .from("email_outbox")
    .delete()
    .eq("id", id)

  if (error) {
    throw new Error(`Failed to delete E2E outbox row: ${error.message}`)
  }
}

test.describe("Email Delivery Hub", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `E2E login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("email delivery hub loads current overview and queue controls", async ({ page }) => {
    await page.goto("/admin/emails/hub")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /email delivery/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /queue/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /send test/i })).toBeVisible()

    await page.goto("/admin/emails/hub?tab=queue")
    await waitForPageLoad(page)

    await expect(page.getByText(/outgoing email ledger/i)).toBeVisible()
    await expect(page.getByPlaceholder(/search recipient, subject, intake/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /^failed$/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /^pending$/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /^sent$/i })).toBeVisible()
  })

  test("med_cert_patient delivery row is visible in the ops ledger", async ({ page }) => {
    test.skip(!isDbAvailable(), "Database not available")

    const seeded = await seedMedCertPatientOutboxRow()

    try {
      await page.goto("/admin/emails/hub?tab=queue")
      await waitForPageLoad(page)

      const searchInput = page.getByPlaceholder(/search recipient, subject, intake/i)
      await searchInput.fill(seeded.subject)

      // Gate on the seeded subject, which is the only text here guaranteed to
      // match exactly one row. Everything below is a generic label that also
      // describes real production email, so asserting one of those first races
      // the debounced search: until the filter applies the ledger is still
      // showing every row, and this spec then fails strict mode rather than
      // finding nothing. That stayed invisible while the ledger was small and
      // started failing at 425 med_cert_patient rows, with no code change and
      // no leaked fixtures (the afterEach delete works). Growth broke it, so
      // do not "fix" a recurrence by widening the timeout.
      await expect(page.getByText(seeded.subject)).toBeVisible({ timeout: 10000 })

      // Now that the filter has demonstrably applied, the generic labels
      // describe the seeded row. first() keeps them stable if the hub ever
      // renders a row plus a detail pane for the same record.
      await expect(page.getByText("Medical Certificate - Patient").first()).toBeVisible()
      await expect(page.getByText("sent (test)").first()).toBeVisible()
      await expect(page.getByText(`Intake ${INTAKE_ID.slice(0, 8)}`).first()).toBeVisible()
      await expect(page.getByRole("link", { name: /open/i }).first()).toBeVisible()
    } finally {
      await deleteOutboxRow(seeded.id)
    }
  })
})

test.describe("Email Delivery Hub Access Control", () => {
  test("unauthenticated access is blocked", async ({ page, context }) => {
    await context.clearCookies()

    const response = await page.goto("/admin/emails/hub")
    const currentUrl = page.url()

    expect(
      currentUrl.includes("sign-in") ||
      currentUrl.includes("login") ||
      response?.status() === 401 ||
      response?.status() === 403
    ).toBe(true)
  })
})
