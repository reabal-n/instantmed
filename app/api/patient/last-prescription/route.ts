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
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  try {
    const supabase = createServiceRoleClient()

    // Verify user is authenticated and matches the requested userId
    const { userId: clerkUserId } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (clerkUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch the last approved prescription for this user
    const { data: lastIntake, error: fetchError } = await supabase
      .from("intakes")
      .select(`
        id,
        answers,
        created_at
      `)
      .eq("patient_id", userId)
      .eq("status", "approved")
      .in("type", ["repeat-script", "prescription"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !lastIntake) {
      // No previous prescription found - not an error
      return NextResponse.json({ prescription: null })
    }

    // Extract medication details from answers
    const answers = lastIntake.answers as Record<string, unknown> | null
    
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
      userId, 
      intakeId: lastIntake.id 
    })

    return NextResponse.json({ prescription })
  } catch (error) {
    log.error("Error fetching last prescription", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      { error: "Failed to fetch prescription history" },
      { status: 500 }
    )
  }
}
