import { NextRequest, NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { createLogger } from "@/lib/observability/logger"
import { getDraftsForIntake } from "@/lib/ai/drafts"
import { generateDraftsForIntake } from "@/app/actions/generate-drafts"

const log = createLogger("doctor-drafts-api")

/**
 * GET /api/doctor/drafts/[intakeId]
 * Fetch AI-generated drafts for an intake (doctor only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ intakeId: string }> }
) {
  try {
    // Require doctor or admin role
    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { profile } = authResult

    const { intakeId } = await params

    if (!intakeId) {
      return NextResponse.json({ error: "Intake ID required" }, { status: 400 })
    }

    const drafts = await getDraftsForIntake(intakeId)

    log.info("Fetched drafts for intake", {
      intakeId,
      doctorId: profile.id,
      draftCount: drafts.length,
    })

    return NextResponse.json({
      success: true,
      drafts,
    })

  } catch (error) {
    log.error("Error fetching drafts", { error })
    return NextResponse.json(
      { success: false, error: "Failed to fetch drafts" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/doctor/drafts/[intakeId]
 * Regenerate AI drafts for an intake (doctor only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ intakeId: string }> }
) {
  try {
    // Require doctor or admin role
    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { profile } = authResult

    const { intakeId } = await params

    if (!intakeId) {
      return NextResponse.json({ error: "Intake ID required" }, { status: 400 })
    }

    log.info("Regenerating drafts for intake", {
      intakeId,
      doctorId: profile.id,
    })

    // Force regeneration
    const result = await generateDraftsForIntake(intakeId, true)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    // Fetch the new drafts
    const drafts = await getDraftsForIntake(intakeId)

    log.info("Regenerated drafts for intake", {
      intakeId,
      doctorId: profile.id,
      clinicalNote: result.clinicalNote?.status,
      medCert: result.medCert?.status,
    })

    return NextResponse.json({
      success: true,
      drafts,
      generation: {
        clinicalNote: result.clinicalNote,
        medCert: result.medCert,
      },
    })

  } catch (error) {
    log.error("Error regenerating drafts", { error })
    return NextResponse.json(
      { success: false, error: "Failed to regenerate drafts" },
      { status: 500 }
    )
  }
}
