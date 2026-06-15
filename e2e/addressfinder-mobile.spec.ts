import { expect, test } from "@playwright/test"

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

async function dismissOverlays(page: import("@playwright/test").Page) {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 2000 }).catch(() => false)) {
    await essentialOnly.click()
  }

  await page.evaluate(() => {
    const style = document.createElement("style")
    style.textContent = `
      [data-nextjs-dialog-overlay], [data-nextjs-toast],
      [class*="nextjs-portal"],
      button[aria-label="Open chat assistant"],
      [data-nextjs-dev-toolbar] { display: none !important; }
    `
    document.head.appendChild(style)
  })
}

async function stubMedicationSearch(page: import("@playwright/test").Page) {
  await page.route("**/api/medications/search**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            drug_name: "Atorvastatin",
            strength: "20 mg",
            form: "tablet",
            pbs_code: "1234A",
          },
        ],
      }),
    })
  })
}

async function completeToDetails(page: import("@playwright/test").Page) {
  await page.goto("/request?service=repeat-script")
  await dismissOverlays(page)

  await expect(page.getByRole("heading", { name: /Which medication do you need/i })).toBeVisible({ timeout: 20000 })
  const medicationInput = page.getByRole("combobox", { name: /Medication name search/i })
  await medicationInput.fill("Atorvastatin")
  await page.getByRole("option", { name: /Atorvastatin/i }).first().click()
  await page.getByRole("button", { name: /^Continue$/i }).last().click()

  await expect(page.getByText(/When were you last prescribed/i).first()).toBeVisible()
  await page.getByRole("radio", { name: /Under 3 months/i }).click()
  await page.getByPlaceholder(/2 puffs twice daily/i).fill("1 tablet daily")
  await page.getByRole("radio", { name: /No side effects/i }).click()
  await page.getByRole("button", { name: /^Continue$/i }).last().click()

  await expect(page.getByRole("heading", { name: /Anything the doctor should know/i })).toBeVisible()
  await page.getByRole("radio", { name: /No allergies/i }).click()
  await page.getByRole("radio", { name: /No conditions/i }).click()
  await page.getByRole("radio", { name: /No medications/i }).click()
  await expect(page.getByRole("heading", { name: /Medication safety/i })).toBeVisible()
  await page.getByRole("radio", { name: /^No$/i }).first().click()
  await page.getByRole("radio", { name: /No reactions/i }).click()
  await page.getByRole("button", { name: /^Continue$/i }).last().click()

  await expect(page.getByRole("heading", { name: /^Your details$/i }).first()).toBeVisible({ timeout: 20000 })
}

test.describe("Addressfinder mobile path", () => {
  test("selects an Addressfinder result and stores verified provider metadata", async ({ page }) => {
    await stubMedicationSearch(page)
    await page.route("**/api/places/autocomplete**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "OK",
          provider: "addressfinder",
          predictions: [
            {
              description: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
              place_id: "af:address-id",
              structured_formatting: {
                main_text: "Unit 2, 21 Kent Road",
                secondary_text: "DAPTO NSW 2530",
              },
            },
          ],
        }),
      })
    })
    await page.route("**/api/places/details**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "OK",
          provider: "addressfinder",
          address: {
            addressLine1: "Unit 2, 21 Kent Road",
            addressLine2: null,
            suburb: "DAPTO",
            state: "NSW",
            postcode: "2530",
            fullAddress: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
            placeId: "af:address-id",
          },
        }),
      })
    })

    await completeToDetails(page)

    await page.locator("input[placeholder='Start typing your address...']").fill("21 Kent")
    await page.getByRole("option", { name: /Unit 2, 21 Kent Road/i }).click()

    await expect(page.locator("input#suburb")).toHaveValue("DAPTO")
    await expect(page.locator("input#postcode")).toHaveValue("2530")

    const draft = await page.evaluate(() => {
      const raw = window.localStorage.getItem("instantmed-request-draft")
      return raw ? JSON.parse(raw) : null
    })
    expect(draft?.state?.answers).toMatchObject({
      addressLine1: "Unit 2, 21 Kent Road",
      suburb: "DAPTO",
      state: "NSW",
      postcode: "2530",
      addressVerified: true,
      addressProviderPlaceId: "af:address-id",
    })
  })

  test("offers an explicit manual address action when no verified result is found", async ({ page }) => {
    await stubMedicationSearch(page)
    await page.route("**/api/places/autocomplete**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ZERO_RESULTS", predictions: [] }),
      })
    })

    await completeToDetails(page)

    await page.locator("input[placeholder='Start typing your address...']").fill("No Match Avenue")
    await expect(page.getByRole("button", { name: /Use manual address/i })).toBeVisible({ timeout: 8000 })
    await page.getByRole("button", { name: /Use manual address/i }).click()

    await expect(page.locator("input#suburb")).toBeVisible()
    await expect(page.locator("input#postcode")).toBeVisible()

    const draft = await page.evaluate(() => {
      const raw = window.localStorage.getItem("instantmed-request-draft")
      return raw ? JSON.parse(raw) : null
    })
    expect(draft?.state?.answers).toMatchObject({
      addressVerified: false,
      addressProviderPlaceId: "",
    })
  })
})
