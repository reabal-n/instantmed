/* eslint-disable no-console */
/**
 * Admin Crash Diagnostic Tests
 * 
 * Purpose: Capture detailed error information for /admin routes that crash.
 * Instruments console, page errors, and network responses.
 */

import { test, expect } from "@playwright/test"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"

// Collect all diagnostic info
interface DiagnosticInfo {
  route: string
  consoleMessages: Array<{ type: string; text: string }>
  pageErrors: string[]
  networkErrors: Array<{ url: string; status: number; statusText: string }>
  responseBody?: string
}

test.describe("Admin Crash Diagnostics", () => {
  let diagnostics: DiagnosticInfo

  test.beforeEach(async ({ page }) => {
    // Initialize diagnostics
    diagnostics = {
      route: "",
      consoleMessages: [],
      pageErrors: [],
      networkErrors: [],
    }

    // Capture all console messages
    page.on("console", (msg) => {
      diagnostics.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      })
      // Print errors immediately
      if (msg.type() === "error") {
        console.log(`[CONSOLE ERROR] ${msg.text()}`)
      }
    })

    // Capture page errors (uncaught exceptions)
    page.on("pageerror", (error) => {
      diagnostics.pageErrors.push(error.message + "\n" + error.stack)
      console.log(`[PAGE ERROR] ${error.message}`)
      console.log(error.stack)
    })

    // Capture failed network responses
    page.on("response", async (response) => {
      if (response.status() >= 400) {
        let body = ""
        try {
          body = await response.text()
        } catch {
          body = "[Could not read body]"
        }
        diagnostics.networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        })
        console.log(`[NETWORK ERROR] ${response.status()} ${response.url()}`)
        console.log(`  Body: ${body.slice(0, 500)}`)
      }
    })

    // Login as operator
    const result = await loginAsOperator(page)
    if (!result.success) {
      console.log(`[LOGIN FAILED] ${result.error}`)
    }
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    // Print diagnostic summary
    console.log("\n" + "=".repeat(60))
    console.log(`DIAGNOSTIC SUMMARY: ${diagnostics.route}`)
    console.log("=".repeat(60))

    if (diagnostics.pageErrors.length > 0) {
      console.log("\n📛 PAGE ERRORS:")
      diagnostics.pageErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`)
      })
    }

    if (diagnostics.networkErrors.length > 0) {
      console.log("\n🌐 NETWORK ERRORS:")
      diagnostics.networkErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.status} ${err.url}`)
      })
    }

    const errors = diagnostics.consoleMessages.filter(m => m.type === "error")
    if (errors.length > 0) {
      console.log("\n🔴 CONSOLE ERRORS:")
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.text}`)
      })
    }

    console.log("=".repeat(60) + "\n")

    await logoutTestUser(page)
  })

  test("diagnose /admin/studio crash", async ({ page }) => {
    diagnostics.route = "/admin/studio"

    // Navigate and wait for either success or error
    const response = await page.goto("/admin/studio", { waitUntil: "networkidle" })
    
    console.log(`\n[NAVIGATION] /admin/studio - Status: ${response?.status()}`)

    // Wait a bit for any async errors
    await page.waitForTimeout(2000)

    // Check if error boundary is showing
    const errorBoundary = page.locator('text="Something went wrong"')
    const hasError = await errorBoundary.isVisible().catch(() => false)

    if (hasError) {
      console.log("\n❌ ERROR BOUNDARY DETECTED")
      
      // Try to get more context from the page
      const pageContent = await page.content()
      
      // Look for any error details in the page
      const errorMatch = pageContent.match(/error[:\s]+([^<]+)/i)
      if (errorMatch) {
        console.log(`  Possible error: ${errorMatch[1]}`)
      }
    }

    // Check for expected content
    const hasStudio = await page.locator('text="Template Studio"').isVisible().catch(() => false)
    console.log(`[CHECK] Has "Template Studio" heading: ${hasStudio}`)

    // This test is for diagnostics - we expect it might fail
    // The goal is to capture the error info
    expect(hasError, "Should not show error boundary").toBe(false)
  })

  test("diagnose /admin/clinic crash", async ({ page }) => {
    diagnostics.route = "/admin/clinic"

    // Navigate and wait for either success or error
    const response = await page.goto("/admin/clinic", { waitUntil: "networkidle" })
    
    console.log(`\n[NAVIGATION] /admin/clinic - Status: ${response?.status()}`)

    // Wait a bit for any async errors
    await page.waitForTimeout(2000)

    // Check if error boundary is showing
    const errorBoundary = page.locator('text="Something went wrong"')
    const hasError = await errorBoundary.isVisible().catch(() => false)

    if (hasError) {
      console.log("\n❌ ERROR BOUNDARY DETECTED")
      
      // Try to get more context from the page
      const pageContent = await page.content()
      
      // Look for any error details in the page
      const errorMatch = pageContent.match(/error[:\s]+([^<]+)/i)
      if (errorMatch) {
        console.log(`  Possible error: ${errorMatch[1]}`)
      }
    }

    // Check for expected content
    const hasClinic = await page.locator('text="Clinic Identity"').isVisible().catch(() => false)
    console.log(`[CHECK] Has "Clinic Identity" heading: ${hasClinic}`)

    // This test is for diagnostics
    expect(hasError, "Should not show error boundary").toBe(false)
  })
})
