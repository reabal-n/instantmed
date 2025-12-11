/**
 * Test Mode Helper
 * Enables test features for development/staging environments
 */

export function getIsTestMode(): boolean {
  // Server-side: only check env var
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_TEST_MODE === "true" || process.env.NODE_ENV !== "production"
  }

  // Client-side: check localStorage override first
  const override = localStorage.getItem("test-mode-override")
  if (override !== null) {
    return override === "true"
  }

  // Fallback to env var
  return process.env.NEXT_PUBLIC_TEST_MODE === "true" || process.env.NODE_ENV !== "production"
}

export const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true" || process.env.NODE_ENV !== "production"

// Test Medicare data
export const TEST_DATA = {
  medicare: {
    number: "1111111111",
    irn: 1,
    expiryMonth: "01",
    expiryYear: "30",
  },
  dob: "1990-01-01",
  dobFormatted: "01/01/1990",
  stripeTestCard: "4242 4242 4242 4242",
}

export function setTestModeOverride(enabled: boolean | null): void {
  if (typeof window === "undefined") return

  if (enabled === null) {
    localStorage.removeItem("test-mode-override")
  } else {
    localStorage.setItem("test-mode-override", String(enabled))
  }

  // Trigger storage event for other tabs and reload
  window.dispatchEvent(new Event("test-mode-changed"))
}
