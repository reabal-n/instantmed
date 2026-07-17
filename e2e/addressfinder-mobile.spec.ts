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

async function completeToDetails(page: import("@playwright/test").Page) {
  await page.goto("/request?service=repeat-script")
  await dismissOverlays(page)

  const clickPrimary = async () => {
    // Mobile (390px): the in-step primary action is `max-sm:hidden`; the sticky
    // mobile action bar carries the visible "Continue" button (last in the DOM).
    await page.getByRole("button", { name: /^Continue$/i }).last().click()
  }

  await expect(page.getByRole("heading", { name: /Your medication/i })).toBeVisible({ timeout: 20000 })
  // Medication is a free-text name box since #208 (PBS combobox retired), and
  // P2.1 put the prescription-history questions on this same screen.
  await page.locator("#medication-name-0").fill("Atorvastatin")
  await expect(page.locator("#medication-strength-0")).toBeVisible({ timeout: 5000 })

  await page.getByRole("radio", { name: /Under 3 months/i }).click()
  await page.getByPlaceholder(/2 puffs twice daily/i).fill("1 tablet daily")
  await page
    .getByRole("radiogroup", { name: /dose or the way you take this medicine changed/i })
    .getByRole("radio", { name: /No, unchanged/i })
    .click()
  await page.getByPlaceholder(/e\.g\., asthma/i).fill("high cholesterol")
  await page.getByRole("radio", { name: /No side effects/i }).click()
  await clickPrimary()

  await expect(page.getByRole("heading", { name: /Anything the doctor should know/i })).toBeVisible()
  // #209: each question is a radiogroup with a question-specific "no" label;
  // the separate "Medication safety" / "No reactions" question was folded in.
  await page.getByRole("radiogroup", { name: /allerg/i }).getByRole("radio", { name: /^None$/i }).click()
  await page.getByRole("radiogroup", { name: /medical conditions/i }).getByRole("radio", { name: /^No conditions$/i }).click()
  await page.getByRole("radiogroup", { name: /other medications/i }).getByRole("radio", { name: /^No medications$/i }).click()
  const pregnancy = page.getByRole("radiogroup", { name: /pregnant or breastfeeding/i })
  if (await pregnancy.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pregnancy.getByRole("radio", { name: /^No$/i }).click()
  }
  await clickPrimary()

  await expect(page.getByRole("heading", { name: /^Your details$/i }).first()).toBeVisible({ timeout: 20000 })
}

test.describe("Addressfinder mobile path", () => {
  test("selects an Addressfinder result and stores verified provider metadata", async ({ page }) => {
    let autocompleteRequests = 0

    await page.route("**/api/places/autocomplete**", async (route) => {
      autocompleteRequests += 1
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

    // Selecting a verified result must settle the combobox. The selected text
    // is written back into the input, but that write must not trigger the same
    // autocomplete request and reopen the result menu.
    await page.waitForTimeout(500)
    expect(autocompleteRequests).toBe(1)
    await expect(page.getByRole("listbox")).toHaveCount(0)

    await expect.poll(async () => page.evaluate(() => {
      const raw = window.localStorage.getItem("instantmed-request-draft")
      const draft = raw ? JSON.parse(raw) : null
      return draft?.state?.answers ?? null
    }), { timeout: 5000 }).toMatchObject({
      addressLine1: "Unit 2, 21 Kent Road",
      suburb: "DAPTO",
      state: "NSW",
      postcode: "2530",
      addressVerified: true,
      addressProviderPlaceId: "af:address-id",
    })
  })

  test("offers an explicit manual address action when no verified result is found", async ({ page }) => {
    await page.route("**/api/places/autocomplete**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ZERO_RESULTS", predictions: [] }),
      })
    })

    await completeToDetails(page)

    const addressInput = page.locator("input[placeholder='Start typing your address...']")
    await addressInput.fill("No Match Avenue")
    await expect(page.getByRole("button", { name: /Use manual address/i })).toBeVisible({ timeout: 8000 })
    await page.getByRole("button", { name: /Use manual address/i }).click()

    await expect(page.locator("input#suburb")).toBeVisible()
    await expect(page.locator("input#postcode")).toBeVisible()
    await addressInput.fill("No Match Avenue Unit 2")
    await expect(addressInput).toHaveValue("No Match Avenue Unit 2")
    await expect(page.getByRole("button", { name: /Use manual address/i })).toHaveCount(0)

    await expect.poll(async () => page.evaluate(() => {
      const raw = window.localStorage.getItem("instantmed-request-draft")
      const draft = raw ? JSON.parse(raw) : null
      return draft?.state?.answers ?? null
    }), { timeout: 5000 }).toMatchObject({
      addressVerified: false,
      addressProviderPlaceId: "",
    })
  })
})
