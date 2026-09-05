import { type Browser, type BrowserContext, expect, type Page } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

import { PATIENT_REQUEST_ACCESS_COOKIE, signPatientRequestAccessToken } from "../../lib/crypto/patient-request-access-token"
import type { PaidIntakeEvidence } from "./hosted-stripe"
import { readLatestMailpitLink } from "./mailpit"

const ORIGIN = "http://127.0.0.1:3060"

/** Uses only the two synthetic paid guests already owned and cleaned by the runner. */
export async function verifyGuestRequestAccess({ page, browser, evidence, otherOwnerState }: {
  page: Page
  browser: Browser
  evidence: PaidIntakeEvidence
  otherOwnerState: Awaited<ReturnType<BrowserContext["storageState"]>>
}) {
  const token = signPatientRequestAccessToken(evidence.intakeId)
  await page.goto(`/track/${token}`)
  await expect(page).toHaveURL(`${ORIGIN}/track/request`)
  const cookie = (await page.context().cookies()).find((entry) => entry.name === PATIENT_REQUEST_ACCESS_COOKIE)
  expect(cookie?.httpOnly).toBe(true)
  expect(cookie?.path).toBe("/track")
  expect(await page.locator("input:visible, select:visible, textarea:visible").count()).toBe(0)
  const button = page.getByRole("button", { name: "Email me a secure access link", exact: true })
  await expect(button).toBeVisible()

  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const dark of [false, true]) {
      await page.evaluate((value) => document.documentElement.classList.toggle("dark", value), dark)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      const bounds = await button.boundingBox()
      expect(bounds?.height).toBeGreaterThanOrEqual(48)
      // Explicit visual artifacts only on this clean, anonymous status page.
      await page.screenshot({ path: `test-results/hosted-stripe/tracker-${width}-${dark ? "dark" : "light"}.png` })
    }
  }
  const anonymousDownload = await page.request.get(`/api/patient/documents/${evidence.intakeId}/download`)
  expect(anonymousDownload.status()).toBe(401)

  const other = await browser.newContext({ baseURL: ORIGIN, storageState: otherOwnerState })
  try {
    const otherPage = await other.newPage()
    await otherPage.goto(`/track/${token}`)
    await expect(otherPage).toHaveURL(`${ORIGIN}/track/request`)
    const forbidden = await other.request.get(`/api/patient/documents/${evidence.intakeId}/download`)
    expect(forbidden.status()).toBe(403)
    const csrf = await (await other.request.get("/api/csrf")).json()
    const reply = await other.request.post("/api/patient/messages", {
      headers: { "x-csrf-token": csrf.token },
      data: { intakeId: evidence.intakeId, content: "Synthetic ownership denial check" },
    })
    expect(reply.status()).toBe(404)
  } finally { await other.close() }

  const post = page.waitForRequest((request) => request.url() === `${ORIGIN}/track/request/access-link`)
  await button.click()
  const submitted = await post
  expect(submitted.method()).toBe("POST")
  expect(submitted.postData()).toBe(null)
  await expect(page.getByRole("status").filter({ hasText: "Check the inbox" })).toBeVisible()
  const link = await readLatestMailpitLink(evidence.email)
  await page.goto(link)
  await expect(page).toHaveURL(`${ORIGIN}/patient/intakes/${evidence.intakeId}`, { timeout: 60_000 })
  const service = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data } = await service.from("profiles").select("auth_user_id,email_verified_at").eq("id", evidence.patientId).single()
  expect(Boolean(data?.auth_user_id && data.email_verified_at)).toBe(true)
  const { data: owner } = await service.auth.admin.getUserById(data!.auth_user_id)
  expect(owner.user?.email).toBe(evidence.email)

  // Replayed provider link in a fresh browser cannot confer ownership.
  const replay = await browser.newContext({ baseURL: ORIGIN })
  try {
    const replayPage = await replay.newPage()
    await replayPage.goto(link)
    await expect(replayPage).toHaveURL(/\/sign-in\?auth_error=link_expired/, { timeout: 60_000 })
    expect((await replay.request.get(`/api/patient/documents/${evidence.intakeId}/download`)).status()).toBe(401)
  } finally { await replay.close() }
}
