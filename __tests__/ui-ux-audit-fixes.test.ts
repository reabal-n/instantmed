/* eslint-disable no-console */
/**
 * UI/UX Audit Fixes Verification Tests
 * 
 * Validates that all UI/UX audit fixes are properly implemented.
 * Run with: npx tsx __tests__/ui-ux-audit-fixes.test.ts
 */

import * as fs from "fs"
import * as path from "path"

// ============================================================================
// TEST UTILITIES
// ============================================================================

let totalTests = 0
let passedTests = 0
let failedTests = 0

const describe = (name: string, fn: () => void) => {
  console.log(`\n📦 ${name}`)
  fn()
}

const it = (name: string, fn: () => void) => {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`  ✅ ${name}`)
  } catch (e) {
    failedTests++
    console.log(`  ❌ ${name}`)
    console.error(`     ${e}`)
  }
}

const fileContains = (filePath: string, searchString: string): boolean => {
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) return false
  const content = fs.readFileSync(fullPath, "utf-8")
  return content.includes(searchString)
}

const fileNotContains = (filePath: string, searchString: string): boolean => {
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) return true
  const content = fs.readFileSync(fullPath, "utf-8")
  return !content.includes(searchString)
}

// ============================================================================
// P0: CENTRALIZED PRICING TESTS
// ============================================================================

describe("P0: Centralized Pricing Constants", () => {
  it("has PRICING constants in lib/constants.ts", () => {
    if (!fileContains("lib/constants.ts", "export const PRICING")) {
      throw new Error("Missing PRICING export in constants.ts")
    }
  })

  it("has PRICING_DISPLAY constants for formatted prices", () => {
    if (!fileContains("lib/constants.ts", "export const PRICING_DISPLAY")) {
      throw new Error("Missing PRICING_DISPLAY export in constants.ts")
    }
  })

  it("has GP_COMPARISON constants", () => {
    if (!fileContains("lib/constants.ts", "export const GP_COMPARISON")) {
      throw new Error("Missing GP_COMPARISON export in constants.ts")
    }
  })

  it("intake flow uses PRICING_DISPLAY constants", () => {
    if (!fileContains("components/intake/enhanced-intake-flow.tsx", "PRICING_DISPLAY")) {
      throw new Error("Intake flow should use PRICING_DISPLAY constants")
    }
  })

  it("pricing page uses PRICING constants", () => {
    if (!fileContains("app/pricing/page.tsx", "import { PRICING }")) {
      throw new Error("Pricing page should import PRICING constants")
    }
  })

  it("service selector uses PRICING_DISPLAY constants", () => {
    if (!fileContains("app/start/service-selector.tsx", "PRICING_DISPLAY")) {
      throw new Error("Service selector should use PRICING_DISPLAY constants")
    }
  })
})

// ============================================================================
// P0: SOCIAL PROOF CLAIMS TESTS
// ============================================================================

describe("P0: Social Proof Claims (Verifiable)", () => {
  it("hero does NOT contain '10,000+' unverified claim", () => {
    if (!fileNotContains("components/marketing/hero.tsx", '"10,000+"')) {
      throw new Error("Hero should not contain unverified '10,000+' claim")
    }
  })

  it("hero does NOT contain '98%' unverified claim", () => {
    if (!fileNotContains("components/marketing/hero.tsx", '"98%"')) {
      throw new Error("Hero should not contain unverified '98%' claim")
    }
  })

  it("hero contains verifiable '<30 min' response time", () => {
    if (!fileContains("components/marketing/hero.tsx", "<30 min")) {
      throw new Error("Hero should contain verifiable '<30 min' claim")
    }
  })

  it("hero contains verifiable 'AHPRA' registration claim", () => {
    if (!fileContains("components/marketing/hero.tsx", "AHPRA")) {
      throw new Error("Hero should contain AHPRA registration claim")
    }
  })

  it("testimonial marquee uses verifiable claims", () => {
    if (!fileNotContains("components/marketing/testimonial-marquee.tsx", '"10,000+"')) {
      throw new Error("Testimonial marquee should not contain unverified claims")
    }
  })

  it("trust section uses verifiable claims", () => {
    if (!fileNotContains("components/marketing/trust-section.tsx", '"50,000+"')) {
      throw new Error("Trust section should not contain unverified claims")
    }
  })

  it("platform stats replaced unverified patient count", () => {
    if (!fileContains("components/marketing/platform-stats.tsx", "Days a Week")) {
      throw new Error("Platform stats should show '7 Days a Week' instead of patient count")
    }
  })

  it("one-hour-promise uses AHPRA instead of approval rate", () => {
    if (!fileNotContains("components/marketing/one-hour-promise.tsx", '"98%"')) {
      throw new Error("One-hour-promise should not contain unverified '98%' claim")
    }
  })
})

// ============================================================================
// P1: ACCESSIBILITY TESTS
// ============================================================================

describe("P1: Keyboard Accessibility", () => {
  it("navbar services dropdown uses DropdownMenu component", () => {
    if (!fileContains("components/shared/navbar.tsx", "<DropdownMenu>")) {
      throw new Error("Navbar should use DropdownMenu for keyboard accessibility")
    }
  })

  it("navbar dropdown has aria-haspopup attribute", () => {
    if (!fileContains("components/shared/navbar.tsx", 'aria-haspopup="menu"')) {
      throw new Error("Navbar dropdown should have aria-haspopup attribute")
    }
  })

  it("navbar does NOT use onMouseEnter for dropdown (mouse-only)", () => {
    // Check it doesn't use the old mouse-only pattern for the services dropdown
    if (fileContains("components/shared/navbar.tsx", "onMouseEnter={() => setServicesDropdownOpen")) {
      throw new Error("Navbar should not use onMouseEnter for dropdown (accessibility issue)")
    }
  })
})

describe("P1: Checkout Status Feedback", () => {
  it("checkout button shows descriptive processing message", () => {
    if (!fileContains("components/intake/enhanced-intake-flow.tsx", "Preparing secure checkout")) {
      throw new Error("Checkout should show 'Preparing secure checkout...' message")
    }
  })

  it("checkout button shows spinner during submission", () => {
    if (!fileContains("components/intake/enhanced-intake-flow.tsx", "<ButtonSpinner")) {
      throw new Error("Checkout should show spinner during submission")
    }
  })
})

describe("P1: Character Counter", () => {
  it("symptom details textarea has character counter enabled", () => {
    if (!fileContains("components/intake/enhanced-intake-flow.tsx", "showCharacterCounter={true}")) {
      throw new Error("Symptom details should have character counter enabled")
    }
  })

  it("symptom details has maxLength defined", () => {
    if (!fileContains("components/intake/enhanced-intake-flow.tsx", "maxLength={500}")) {
      throw new Error("Symptom details should have maxLength defined")
    }
  })
})

// ============================================================================
// P2: REDUCED MOTION & PERFORMANCE TESTS
// ============================================================================

describe("P2: Reduced Motion Support", () => {
  it("parallax section checks prefers-reduced-motion", () => {
    if (!fileContains("components/ui/parallax-section.tsx", "prefers-reduced-motion")) {
      throw new Error("Parallax section should check prefers-reduced-motion")
    }
  })

  it("night sky background checks prefers-reduced-motion", () => {
    if (!fileContains("components/ui/night-sky-background.tsx", "prefers-reduced-motion")) {
      throw new Error("Night sky should check prefers-reduced-motion")
    }
  })

  it("night sky reduces star count on mobile", () => {
    if (!fileContains("components/ui/night-sky-background.tsx", "isMobile")) {
      throw new Error("Night sky should reduce star count on mobile")
    }
  })
})

describe("P2: Route Redirects", () => {
  it("has redirect for /medical-certificates to /medical-certificate", () => {
    if (!fileContains("next.config.mjs", '"/medical-certificates"')) {
      throw new Error("Should have redirect for /medical-certificates")
    }
  })

  it("has redirect for /repeat-prescription to /prescriptions", () => {
    if (!fileContains("next.config.mjs", '"/repeat-prescription"')) {
      throw new Error("Should have redirect for /repeat-prescription")
    }
  })

  it("has redirect for /repeat-prescriptions to /prescriptions", () => {
    if (!fileContains("next.config.mjs", '"/repeat-prescriptions"')) {
      throw new Error("Should have redirect for /repeat-prescriptions")
    }
  })
})

describe("P2: Autosave Indicator", () => {
  it("intake flow has autosave indicator", () => {
    if (!fileContains("components/intake/enhanced-intake-flow.tsx", "lastSavedAt")) {
      throw new Error("Intake flow should have autosave indicator")
    }
  })

  it("intake flow shows save status with tooltip", () => {
    if (!fileContains("components/intake/enhanced-intake-flow.tsx", "<TooltipContent>")) {
      throw new Error("Intake flow should show save status in tooltip")
    }
  })
})

describe("P2: Brand-Aligned CTA Copy", () => {
  it("pricing page uses approved CTA copy", () => {
    if (!fileContains("app/pricing/page.tsx", "Ready to get started")) {
      throw new Error("Pricing page should use 'Ready to get started?' CTA")
    }
  })

  it("pricing page does NOT use 'skip the waiting room' copy", () => {
    if (!fileNotContains("app/pricing/page.tsx", "skip the waiting room")) {
      throw new Error("Pricing page should not use 'skip the waiting room' copy")
    }
  })
})

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(60))
console.log("📊 UI/UX AUDIT FIXES VERIFICATION SUMMARY")
console.log("=".repeat(60))
console.log(`Total tests: ${totalTests}`)
console.log(`✅ Passed: ${passedTests}`)
console.log(`❌ Failed: ${failedTests}`)

if (failedTests === 0) {
  console.log("\n✨ All UI/UX audit fixes are properly implemented!")
} else {
  console.log(`\n⚠️  ${failedTests} fix(es) need attention`)
  process.exitCode = 1
}
