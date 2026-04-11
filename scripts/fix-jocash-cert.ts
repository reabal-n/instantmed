/**
 * One-off fix: regenerate JO-ANNE Cash's certificate with correct dates.
 *
 * She paid for a 3-day cert (30/03–01/04/2026) but received 1 day due to a bug
 * where the AI draft's dates (stored in `content`) weren't read by the preview
 * action (which only read `data`), causing both dates to fall back to today.
 *
 * Run: npx tsx scripts/fix-jocash-cert.ts
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { executeCertApproval } from "@/lib/cert/execute-approval"

const INTAKE_ID = "2662eb6a-3591-4d72-8ac9-cb4f5fc22894"
const CERT_ID = "0e67640e-76ae-48a9-a21a-7b5bb93c370e"

// Reabal Najjar - the doctor who approved this intake
const DOCTOR = {
  id: "47535b1c-080a-438e-9ead-2b8491009032",
  full_name: "Reabal Najjar",
  provider_number: "6206416B",
  ahpra_number: "MED0002576546",
}

async function main() {
  const supabase = createServiceRoleClient()

  console.log("Step 1: Superseding wrong 1-day certificate...")
  const { error: supersededError } = await supabase
    .from("issued_certificates")
    .update({ status: "superseded", updated_at: new Date().toISOString() })
    .eq("id", CERT_ID)
    .eq("status", "valid")

  if (supersededError) {
    console.error("Failed to supersede certificate:", supersededError.message)
    process.exit(1)
  }
  console.log("  ✓ Certificate superseded")

  console.log("Step 2: Regenerating with correct dates (30/03/2026 – 01/04/2026)...")
  const result = await executeCertApproval({
    intakeId: INTAKE_ID,
    reviewData: {
      doctorName: DOCTOR.full_name,
      consultDate: "2026-03-30",
      startDate: "2026-03-30",
      endDate: "2026-04-01",
      medicalReason: "Upper respiratory tract infection - sore throat, swollen tonsils, headache, fatigue",
    },
    doctorProfile: DOCTOR,
    skipClaim: true,
  })

  if (!result.success) {
    console.error("Certificate regeneration failed:", result.error)
    // Restore the superseded cert so patient doesn't lose access
    await supabase
      .from("issued_certificates")
      .update({ status: "valid", updated_at: new Date().toISOString() })
      .eq("id", CERT_ID)
    console.log("  ✗ Restored original certificate - no changes made")
    process.exit(1)
  }

  console.log("  ✓ New certificate issued:", result.certificateId)
  console.log("  ✓ Email sent to patient:", result.emailSent ? "yes" : "no")
  console.log("\nDone. Patient has been sent the corrected 3-day certificate.")
}

main().catch((err) => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
