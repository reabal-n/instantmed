import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("last-prescription")

/**
 * Get the patient's last approved prescription for quick reorder
 *
 * Based on PATIENT_JOURNEY_SIMULATION.md findings where regular users
 * want "repeat last order" functionality.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Verify user is authenticated
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Look up the profile to get the actual patient_id (profile UUID)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Fetch the last approved prescription for this user
    // Use correct column: 'category' (not 'type') and join intake_answers (not 'answers' column)
    const { data: lastIntake, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        created_at,
        intake_answers:intake_answers (
          answers
        )
      `)
      .eq("patient_id", profile.id)
      .eq("status", "approved")
      .eq("category", "prescription")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !lastIntake) {
      // No previous prescription found - not an error
      return NextResponse.json({ prescription: null })
    }

    // Extract medication details from answers (stored in intake_answers table)
    const intakeAnswers = Array.isArray(lastIntake.intake_answers)
      ? lastIntake.intake_answers[0]
      : lastIntake.intake_answers
    const answers = (intakeAnswers?.answers as Record<string, unknown>) || null

    if (!answers) {
      return NextResponse.json({ prescription: null })
    }

    const prescription = {
      id: lastIntake.id,
      medicationName: (answers.medication_name as string) ||
                      (answers.selected_medication_name as string) ||
                      "Unknown medication",
      strength: (answers.medication_dosage as string) || null,
      form: null,
      lastOrderedAt: lastIntake.created_at,
      pbsCode: (answers.selected_pbs_code as string) || null,
    }

    log.info("Last prescription fetched for quick reorder", {
      profileId: profile.id,
      intakeId: lastIntake.id
    })

    return NextResponse.json({ prescription })
  } catch (error) {
    log.error("Error fetching last prescription", {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { error: "Failed to fetch prescription history" },
      { status: 500 }
    )
  }
}
