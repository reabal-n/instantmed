/* eslint-disable no-console */
/**
 * End-to-End Flow Verification Tests
 * 
 * Validates that all critical paths through the application are properly wired up.
 * These are structural tests that verify the code connections, not runtime behavior.
 * 
 * Run with: npx tsx __tests__/e2e-flow-verification.test.ts
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

const fileExists = (filePath: string): boolean => {
  const fullPath = path.join(process.cwd(), filePath)
  return fs.existsSync(fullPath)
}

const fileContains = (filePath: string, searchString: string): boolean => {
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) return false
  const content = fs.readFileSync(fullPath, "utf-8")
  return content.includes(searchString)
}

const fileExportsFunction = (filePath: string, functionName: string): boolean => {
  const fullPath = path.join(process.cwd(), filePath)
  if (!fs.existsSync(fullPath)) return false
  const content = fs.readFileSync(fullPath, "utf-8")
  return (
    content.includes(`export async function ${functionName}`) ||
    content.includes(`export function ${functionName}`) ||
    content.includes(`export const ${functionName}`)
  )
}

// ============================================================================
// MEDICAL CERTIFICATE FLOW TESTS
// ============================================================================

describe("Medical Certificate Flow - File Structure", () => {
  it("has intake flow component", () => {
    if (!fileExists("components/intake/enhanced-intake-flow.tsx")) {
      throw new Error("Missing enhanced-intake-flow.tsx")
    }
  })

  it("has start page that uses intake flow", () => {
    if (!fileContains("app/start/page.tsx", "EnhancedIntakeFlow")) {
      throw new Error("Start page doesn't use EnhancedIntakeFlow")
    }
  })

  it("has checkout action that creates intakes", () => {
    if (!fileExportsFunction("lib/stripe/checkout.ts", "createIntakeAndCheckoutAction")) {
      throw new Error("Missing createIntakeAndCheckoutAction")
    }
  })

  it("has Stripe webhook handler", () => {
    if (!fileExists("app/api/stripe/webhook/route.ts")) {
      throw new Error("Missing Stripe webhook route")
    }
  })

  it("webhook updates intake to paid status", () => {
    if (!fileContains("app/api/stripe/webhook/route.ts", 'status: "paid"')) {
      throw new Error("Webhook doesn't update status to paid")
    }
  })

  it("has doctor queue page", () => {
    if (!fileExists("app/doctor/queue/page.tsx")) {
      throw new Error("Missing doctor queue page")
    }
  })

  it("has doctor queue actions", () => {
    if (!fileExists("app/doctor/queue/actions.ts")) {
      throw new Error("Missing doctor queue actions")
    }
  })

  it("has approve cert action", () => {
    if (!fileExportsFunction("app/actions/approve-cert.ts", "approveAndSendCert")) {
      throw new Error("Missing approveAndSendCert action")
    }
  })

  it("approve cert generates PDF", () => {
    if (!fileContains("app/actions/approve-cert.ts", "renderToBuffer")) {
      throw new Error("Approve cert doesn't generate PDF")
    }
  })

  it("approve cert sends email", () => {
    if (!fileContains("app/actions/approve-cert.ts", "sendViaResend")) {
      throw new Error("Approve cert doesn't send email")
    }
  })

  it("has PDF generator for med certs", () => {
    if (!fileExists("lib/pdf/med-cert-pdf.tsx")) {
      throw new Error("Missing med-cert-pdf.tsx")
    }
  })

  it("has patient intake detail page", () => {
    if (!fileExists("app/patient/intakes/[id]/page.tsx")) {
      throw new Error("Missing patient intake detail page")
    }
  })
})

// ============================================================================
// GP CONSULT FLOW TESTS
// ============================================================================

describe("GP Consult Flow - File Structure", () => {
  it("has consult landing page", () => {
    if (!fileExists("app/consult/page.tsx")) {
      throw new Error("Missing consult landing page")
    }
  })

  it("consult page links to start flow", () => {
    if (!fileContains("app/consult/page.tsx", "/start?service=consult")) {
      throw new Error("Consult page doesn't link to start flow")
    }
  })

  it("has gp-consult redirect", () => {
    if (!fileContains("app/gp-consult/page.tsx", "redirect")) {
      throw new Error("GP consult page should redirect to /consult")
    }
  })

  it("intake flow supports consult service type", () => {
    if (!fileContains("components/intake/enhanced-intake-flow.tsx", '"consult"')) {
      throw new Error("Intake flow doesn't support consult service type")
    }
  })

  it("checkout maps consult to gp-consult service", () => {
    if (!fileContains("lib/stripe/checkout.ts", '"consult:general": "gp-consult"')) {
      throw new Error("Checkout doesn't map consult to gp-consult service")
    }
  })

  it("has consult validation schema", () => {
    if (!fileContains("lib/validation/schemas.ts", "consultRequestSchema")) {
      throw new Error("Missing consult validation schema")
    }
  })

  it("doctor intake detail handles consults", () => {
    if (!fileContains("app/doctor/intakes/[id]/intake-detail-client.tsx", 'service?.type === "consults"')) {
      throw new Error("Doctor intake detail doesn't handle consults")
    }
  })

  it("has consult service migration", () => {
    if (!fileExists("supabase/migrations/20250111000002_add_consult_service.sql")) {
      throw new Error("Missing consult service migration")
    }
  })
})

// ============================================================================
// REPEAT PRESCRIPTION FLOW TESTS
// ============================================================================

describe("Repeat Prescription Flow - File Structure", () => {
  it("has prescription intake component", () => {
    if (!fileExists("components/intake/prescription-intake.tsx")) {
      throw new Error("Missing prescription-intake.tsx")
    }
  })

  it("has repeat-rx rules engine", () => {
    if (!fileExists("lib/repeat-rx/rules-engine.ts")) {
      throw new Error("Missing repeat-rx rules engine")
    }
  })

  it("has eligibility check API", () => {
    if (!fileExists("app/api/repeat-rx/eligibility/route.ts")) {
      throw new Error("Missing eligibility API route")
    }
  })

  it("has decision API for repeat-rx", () => {
    if (!fileExists("app/api/repeat-rx/[id]/decision/route.ts")) {
      throw new Error("Missing decision API route")
    }
  })

  it("has mark script sent action", () => {
    if (!fileContains("app/doctor/queue/actions.ts", "markScriptSentAction")) {
      throw new Error("Missing markScriptSentAction")
    }
  })

  it("sends email when script is sent", () => {
    if (!fileContains("app/doctor/queue/actions.ts", "sendScriptSentEmail")) {
      throw new Error("markScriptSentAction doesn't send email")
    }
  })

  it("has repeat-rx detail page for doctors", () => {
    if (!fileExists("app/doctor/repeat-rx/[id]/page.tsx")) {
      throw new Error("Missing doctor repeat-rx detail page")
    }
  })
})

// ============================================================================
// PAYMENT FLOW TESTS
// ============================================================================

describe("Payment Flow - File Structure", () => {
  it("has Stripe client", () => {
    if (!fileExists("lib/stripe/client.ts")) {
      throw new Error("Missing Stripe client")
    }
  })

  it("has checkout creation", () => {
    if (!fileExists("lib/stripe/checkout.ts")) {
      throw new Error("Missing Stripe checkout")
    }
  })

  it("has webhook event handler", () => {
    if (!fileContains("app/api/stripe/webhook/route.ts", "checkout.session.completed")) {
      throw new Error("Webhook doesn't handle checkout.session.completed")
    }
  })

  it("has idempotency protection", () => {
    if (!fileContains("app/api/stripe/webhook/route.ts", "tryClaimEvent")) {
      throw new Error("Webhook missing idempotency protection")
    }
  })

  it("has retry payment API", () => {
    if (!fileExists("app/patient/retry-payment/route.ts") && 
        !fileExists("app/api/patient/retry-payment/route.ts")) {
      throw new Error("Missing retry payment API")
    }
  })

  it("has refunds library", () => {
    if (!fileExists("lib/stripe/refunds.ts")) {
      throw new Error("Missing refunds library")
    }
  })

  it("has mark as refunded action", () => {
    if (!fileContains("app/doctor/queue/actions.ts", "markAsRefundedAction")) {
      throw new Error("Missing markAsRefundedAction")
    }
  })
})

// ============================================================================
// NOTIFICATION FLOW TESTS
// ============================================================================

describe("Notification Flow - File Structure", () => {
  it("has notification service", () => {
    if (!fileExists("lib/notifications/service.ts")) {
      throw new Error("Missing notification service")
    }
  })

  it("has notification bell component", () => {
    if (!fileExists("components/shared/notification-bell.tsx")) {
      throw new Error("Missing notification bell")
    }
  })

  it("has notifications page", () => {
    if (!fileExists("app/patient/notifications/page.tsx")) {
      throw new Error("Missing notifications page")
    }
  })

  it("has useNotifications hook", () => {
    if (!fileExists("lib/hooks/use-notifications.ts")) {
      throw new Error("Missing useNotifications hook")
    }
  })

  it("notification URLs point to intakes", () => {
    if (!fileContains("lib/notifications/service.ts", "/patient/intakes/")) {
      throw new Error("Notification URLs should point to /patient/intakes/")
    }
  })

  it("has intakes notification trigger migration", () => {
    if (!fileExists("supabase/migrations/20250111000001_intakes_notification_trigger.sql")) {
      throw new Error("Missing intakes notification trigger migration")
    }
  })
})

// ============================================================================
// EMAIL FLOW TESTS
// ============================================================================

describe("Email Flow - File Structure", () => {
  it("has Resend email client", () => {
    if (!fileExists("lib/email/resend.ts")) {
      throw new Error("Missing Resend email client")
    }
  })

  it("has email templates", () => {
    const templates = [
      "lib/email/templates/request-approved.tsx",
      "lib/email/templates/request-declined.tsx",
      "lib/email/templates/payment-confirmed.tsx",
    ]
    for (const template of templates) {
      if (!fileExists(template)) {
        throw new Error(`Missing email template: ${template}`)
      }
    }
  })

  it("has send status email function", () => {
    if (!fileExists("lib/email/send-status.ts")) {
      throw new Error("Missing send-status.ts")
    }
  })

  it("has med cert email template", () => {
    if (!fileExists("components/email/med-cert-email.tsx")) {
      throw new Error("Missing med-cert-email.tsx")
    }
  })
})

// ============================================================================
// DOCTOR DASHBOARD FLOW TESTS
// ============================================================================

describe("Doctor Dashboard Flow - File Structure", () => {
  it("has doctor layout with auth", () => {
    if (!fileContains("app/doctor/layout.tsx", "getAuthenticatedUserWithProfile") &&
        !fileContains("app/doctor/layout.tsx", "requireAuth")) {
      throw new Error("Doctor layout missing auth check")
    }
  })

  it("has queue with intake fetching", () => {
    if (!fileContains("app/doctor/queue/page.tsx", "getDoctorQueue")) {
      throw new Error("Queue page doesn't fetch intakes")
    }
  })

  it("has intake detail page", () => {
    if (!fileExists("app/doctor/intakes/[id]/page.tsx")) {
      throw new Error("Missing doctor intake detail page")
    }
  })

  it("has document builder page", () => {
    if (!fileExists("app/doctor/intakes/[id]/document/page.tsx")) {
      throw new Error("Missing document builder page")
    }
  })

  it("has analytics page", () => {
    if (!fileExists("app/doctor/analytics/page.tsx")) {
      throw new Error("Missing analytics page")
    }
  })

  it("has patients list page", () => {
    if (!fileExists("app/doctor/patients/page.tsx")) {
      throw new Error("Missing patients page")
    }
  })

  it("queue client has real-time updates", () => {
    if (!fileContains("app/doctor/queue/queue-client.tsx", "createClient")) {
      throw new Error("Queue client missing Supabase client for real-time")
    }
  })
})

// ============================================================================
// PATIENT DASHBOARD FLOW TESTS
// ============================================================================

describe("Patient Dashboard Flow - File Structure", () => {
  it("has patient layout", () => {
    if (!fileExists("app/patient/layout.tsx")) {
      throw new Error("Missing patient layout")
    }
  })

  it("has patient intakes list", () => {
    if (!fileExists("app/patient/intakes/page.tsx")) {
      throw new Error("Missing patient intakes page")
    }
  })

  it("has intake success page", () => {
    if (!fileExists("app/patient/intakes/success/page.tsx")) {
      throw new Error("Missing intake success page")
    }
  })

  it("has patient settings page", () => {
    if (!fileExists("app/patient/settings/page.tsx")) {
      throw new Error("Missing patient settings page")
    }
  })

  it("has onboarding flow", () => {
    if (!fileExists("app/patient/onboarding/page.tsx")) {
      throw new Error("Missing onboarding page")
    }
  })
})

// ============================================================================
// DOCUMENT VERIFICATION FLOW TESTS
// ============================================================================

describe("Document Verification Flow - File Structure", () => {
  it("has verify page", () => {
    if (!fileExists("app/verify/page.tsx")) {
      throw new Error("Missing verify page")
    }
  })

  it("has verify API route", () => {
    if (!fileExists("app/api/verify/route.ts")) {
      throw new Error("Missing verify API route")
    }
  })

  it("verify API checks certificates", () => {
    if (!fileContains("app/api/verify/route.ts", "med_cert_certificates") ||
        !fileContains("app/api/verify/route.ts", "document_verifications")) {
      throw new Error("Verify API doesn't check certificate tables")
    }
  })
})

// ============================================================================
// DATA LAYER TESTS
// ============================================================================

describe("Data Layer - File Structure", () => {
  it("has intakes data module", () => {
    if (!fileExists("lib/data/intakes.ts")) {
      throw new Error("Missing intakes data module")
    }
  })

  it("intakes module has key functions", () => {
    const requiredFunctions = [
      "getPatientIntakes",
      "getDoctorQueue",
      "getIntakeWithDetails",
      "updateIntakeStatus",
      "markIntakeRefunded",
    ]
    for (const fn of requiredFunctions) {
      if (!fileContains("lib/data/intakes.ts", `export async function ${fn}`)) {
        throw new Error(`Missing function: ${fn} in intakes.ts`)
      }
    }
  })

  it("has profiles data module", () => {
    if (!fileExists("lib/data/profiles.ts")) {
      throw new Error("Missing profiles data module")
    }
  })

  it("has documents data module", () => {
    if (!fileExists("lib/data/documents.ts")) {
      throw new Error("Missing documents data module")
    }
  })
})

// ============================================================================
// AUTHENTICATION FLOW TESTS
// ============================================================================

describe("Authentication Flow - File Structure", () => {
  it("has auth library", () => {
    if (!fileExists("lib/auth.ts")) {
      throw new Error("Missing auth.ts")
    }
  })

  it("auth has requireAuth function", () => {
    if (!fileExportsFunction("lib/auth.ts", "requireAuth")) {
      throw new Error("Missing requireAuth function")
    }
  })

  it("has login page", () => {
    if (!fileExists("app/auth/login/page.tsx")) {
      throw new Error("Missing login page")
    }
  })

  it("has register page", () => {
    if (!fileExists("app/auth/register/page.tsx")) {
      throw new Error("Missing register page")
    }
  })

  it("has middleware for auth", () => {
    if (!fileExists("middleware.ts")) {
      throw new Error("Missing middleware.ts")
    }
  })

  it("has ensure-profile action", () => {
    if (!fileExists("app/actions/ensure-profile.ts")) {
      throw new Error("Missing ensure-profile action")
    }
  })
})

// ============================================================================
// ADMIN/SETTINGS FLOW TESTS
// ============================================================================

describe("Admin Settings Flow - File Structure", () => {
  it("has admin settings page", () => {
    if (!fileExists("app/admin/settings/page.tsx") || 
        !fileExists("app/doctor/admin/page.tsx")) {
      throw new Error("Missing admin settings page")
    }
  })

  it("has feature flags library", () => {
    if (!fileExists("lib/feature-flags.ts")) {
      throw new Error("Missing feature-flags.ts")
    }
  })

  it("feature flags has kill switches", () => {
    if (!fileContains("lib/feature-flags.ts", "isServiceDisabled")) {
      throw new Error("Missing isServiceDisabled function")
    }
  })
})

// ============================================================================
// SUMMARY
// ============================================================================

console.log("\n" + "=".repeat(60))
console.log("📊 END-TO-END FLOW VERIFICATION SUMMARY")
console.log("=".repeat(60))
console.log(`Total tests: ${totalTests}`)
console.log(`✅ Passed: ${passedTests}`)
console.log(`❌ Failed: ${failedTests}`)

if (failedTests === 0) {
  console.log("\n✨ All critical flows are properly wired up!")
} else {
  console.log(`\n⚠️  ${failedTests} flow(s) need attention`)
  process.exitCode = 1
}
