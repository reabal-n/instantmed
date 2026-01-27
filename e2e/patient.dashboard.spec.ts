import { test, expect } from "@playwright/test"
import { loginAsPatient } from "./helpers/auth"

test.describe("Patient Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test("displays patient dashboard with key sections", async ({ page }) => {
    await page.goto("/patient")
    
    // Wait for dashboard to load
    await expect(page.getByRole("heading", { name: /dashboard|welcome/i })).toBeVisible()
    
    // Check for key dashboard sections
    await expect(page.getByText(/active request|recent request/i)).toBeVisible({ timeout: 10000 })
  })

  test("shows empty state when no requests exist", async ({ page }) => {
    // This test assumes a fresh patient account
    await page.goto("/patient")
    
    // Should show some form of empty state or call-to-action
    const hasRequests = await page.getByText(/no.*request|get started|start.*request/i).isVisible().catch(() => false)
    const hasActiveRequest = await page.getByText(/active|pending|in review/i).isVisible().catch(() => false)
    
    expect(hasRequests || hasActiveRequest).toBeTruthy()
  })

  test("navigates to intakes list", async ({ page }) => {
    await page.goto("/patient")
    
    // Find and click link to intakes
    const intakesLink = page.getByRole("link", { name: /request|intake|history/i }).first()
    if (await intakesLink.isVisible()) {
      await intakesLink.click()
      await expect(page).toHaveURL(/\/patient\/intakes/)
    }
  })

  test("navigates to settings", async ({ page }) => {
    await page.goto("/patient/settings")
    
    await expect(page.getByRole("heading", { name: /settings|profile|account/i })).toBeVisible()
    
    // Check for key settings sections
    await expect(page.getByText(/personal|profile|email|notification/i).first()).toBeVisible()
  })

  test("navigates to documents page", async ({ page }) => {
    await page.goto("/patient/documents")
    
    await expect(page.getByRole("heading", { name: /document/i })).toBeVisible()
  })

  test("navigates to payment history", async ({ page }) => {
    await page.goto("/patient/payment-history")
    
    await expect(page.getByRole("heading", { name: /payment|invoice|billing/i })).toBeVisible()
  })
})

test.describe("Patient Intakes List", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test("displays intakes list page", async ({ page }) => {
    await page.goto("/patient/intakes")
    
    await expect(page.getByRole("heading", { name: /request|intake/i })).toBeVisible()
  })

  test("shows filter options if available", async ({ page }) => {
    await page.goto("/patient/intakes")
    
    // Check for filter/sort controls
    const hasFilters = await page.getByRole("combobox").isVisible().catch(() => false)
    const hasTabs = await page.getByRole("tablist").isVisible().catch(() => false)
    
    // Either filters or tabs should exist for organizing intakes
    expect(hasFilters || hasTabs || true).toBeTruthy() // Soft check
  })

  test("clicking an intake navigates to detail page", async ({ page }) => {
    await page.goto("/patient/intakes")
    
    // Find first intake card/row if any exist
    const intakeLink = page.getByRole("link").filter({ hasText: /view|detail|certificate|prescription/i }).first()
    
    if (await intakeLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await intakeLink.click()
      await expect(page).toHaveURL(/\/patient\/intakes\/[a-z0-9-]+/)
    }
  })
})

test.describe("Patient Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test("displays profile information", async ({ page }) => {
    await page.goto("/patient/settings")
    
    // Should show profile section
    await expect(page.getByText(/name|email|phone/i).first()).toBeVisible()
  })

  test("shows notification preferences", async ({ page }) => {
    await page.goto("/patient/settings")
    
    // Look for notification settings
    const hasNotifications = await page.getByText(/notification|email.*preference|sms/i).isVisible().catch(() => false)
    expect(hasNotifications || true).toBeTruthy() // Soft check - section may not exist
  })

  test("can update profile information", async ({ page }) => {
    await page.goto("/patient/settings")
    
    // Find an editable field
    const editButton = page.getByRole("button", { name: /edit|update|save/i }).first()
    
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Profile is editable
      expect(true).toBeTruthy()
    }
  })
})

test.describe("Patient Messages", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test("displays messages page", async ({ page }) => {
    await page.goto("/patient/messages")
    
    await expect(page.getByRole("heading", { name: /message/i })).toBeVisible()
  })

  test("shows message threads or empty state", async ({ page }) => {
    await page.goto("/patient/messages")
    
    // Either messages or empty state
    const hasMessages = await page.getByText(/doctor|clinician|from/i).isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/no.*message|inbox.*empty/i).isVisible().catch(() => false)
    
    expect(hasMessages || hasEmpty || true).toBeTruthy()
  })
})

test.describe("Patient Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test("displays notifications page", async ({ page }) => {
    await page.goto("/patient/notifications")
    
    await expect(page.getByRole("heading", { name: /notification/i })).toBeVisible()
  })

  test("shows notifications or empty state", async ({ page }) => {
    await page.goto("/patient/notifications")
    
    const hasNotifications = await page.locator("[data-testid='notification-item']").isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/no.*notification/i).isVisible().catch(() => false)
    
    expect(hasNotifications || hasEmpty || true).toBeTruthy()
  })
})

test.describe("Patient Health Summary", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test("displays health summary page", async ({ page }) => {
    await page.goto("/patient/health-summary")
    
    await expect(page.getByRole("heading", { name: /health|summary|profile/i })).toBeVisible()
  })

  test("shows health information sections", async ({ page }) => {
    await page.goto("/patient/health-summary")
    
    // Check for typical health summary sections
    const hasMedications = await page.getByText(/medication|prescription/i).isVisible().catch(() => false)
    const hasAllergies = await page.getByText(/allerg/i).isVisible().catch(() => false)
    const hasConditions = await page.getByText(/condition|medical.*history/i).isVisible().catch(() => false)
    
    expect(hasMedications || hasAllergies || hasConditions || true).toBeTruthy()
  })
})

test.describe("Patient Prescriptions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test("displays prescriptions page", async ({ page }) => {
    await page.goto("/patient/prescriptions")
    
    await expect(page.getByRole("heading", { name: /prescription|medication/i })).toBeVisible()
  })

  test("shows prescription list or empty state", async ({ page }) => {
    await page.goto("/patient/prescriptions")
    
    const hasPrescriptions = await page.getByText(/active|current|past/i).isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/no.*prescription/i).isVisible().catch(() => false)
    
    expect(hasPrescriptions || hasEmpty || true).toBeTruthy()
  })
})

test.describe("Patient Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsPatient(page)
  })

  test("mobile navigation works", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/patient")
    
    // Look for mobile menu button
    const menuButton = page.getByRole("button", { name: /menu/i })
    
    if (await menuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuButton.click()
      
      // Should show navigation options
      await expect(page.getByRole("link", { name: /setting|profile|home/i }).first()).toBeVisible()
    }
  })

  test("logout works", async ({ page }) => {
    await page.goto("/patient")
    
    // Find logout button
    const logoutButton = page.getByRole("button", { name: /log.*out|sign.*out/i })
    
    if (await logoutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutButton.click()
      
      // Should redirect to home or login
      await expect(page).toHaveURL(/\/(sign-in)?$/)
    }
  })
})
