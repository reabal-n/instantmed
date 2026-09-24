import { readFile } from "node:fs/promises"

import { expect, test } from "@playwright/test"

import { loginAsTestUser } from "./helpers/auth"
import { getSupabaseClient } from "./helpers/db"

test("checkout-created guest and signed-in weight preferences survive actual doctor reload", async ({ page }) => {
  test.skip(!process.env.WEIGHT_CHECKOUT_EVIDENCE_PATH, "Run through the isolated production E2E runner")
  expect(process.env.E2E_ISOLATED_SUPABASE).toBe("1")
  expect(process.env.SUPABASE_URL).toBe("http://127.0.0.1:55321")
  const rows: Array<{ actor: string; preference: string; intakeId: string; patientId: string }> =
    (await readFile(process.env.WEIGHT_CHECKOUT_EVIDENCE_PATH!, "utf8")).trim().split("\n").map(line => JSON.parse(line))
  expect(rows).toHaveLength(6)
  expect(new Set(rows.map(row => `${row.actor}:${row.preference}`)).size).toBe(6)
  const labels: Record<string, string> = {
    daily_oral: "Daily oral treatment", weekly_injection: "Weekly injection", unsure: "Unsure — discuss with the doctor",
  }
  const login = await loginAsTestUser(page, "operator")
  expect(login.success, login.error).toBe(true)
  const db = getSupabaseClient()
  for (const row of rows) {
    await page.goto(`/doctor/intakes/${row.intakeId}`)
    await expect(page.locator('main [data-review-fact="treatment_preference"]').first()).toContainText(labels[row.preference])
    await expect(page.getByText("MEN2 / medullary thyroid cancer history", { exact: true }).first()).toBeVisible()
    await page.reload()
    await expect(page.locator('main [data-review-fact="treatment_preference"]').first()).toContainText(labels[row.preference])
    await expect(page.getByRole("button", { name: "Complete request", exact: true }).and(page.locator(":enabled"))).toHaveCount(0)
    const { data, error } = await db.from("intakes").select("patient_id,payment_status").eq("id", row.intakeId).single()
    expect(error).toBeNull()
    expect(data).toMatchObject({ patient_id: row.patientId, payment_status: "pending" })
  }
  // The runner destroys this entire disposable backend even on failure.
  // No payment submission, status promotion, or prescribing action occurs.
})
