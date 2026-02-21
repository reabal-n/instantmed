import { NextRequest, NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { getIntakeWithDetails, getNextQueueIntakeId } from "@/lib/data/intakes"
import { getOrCreateMedCertDraftForIntake } from "@/lib/data/documents"
import { getAIDraftsForIntake } from "@/app/actions/draft-approval"
import { logClinicianOpenedRequest } from "@/lib/audit/compliance-audit"

/**
 * GET /api/doctor/intakes/[id]/review-data
 *
 * Returns all data needed by the IntakeReviewPanel (slide-over from queue).
 * Auth: doctor or admin only.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: intakeId } = await params

  // Auth check
  const auth = await getApiAuth()
  if (!auth || !["doctor", "admin"].includes(auth.profile.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch intake details
  const intake = await getIntakeWithDetails(intakeId)
  if (!intake) {
    return NextResponse.json({ error: "Intake not found" }, { status: 404 })
  }

  // Compliance audit logging
  await logClinicianOpenedRequest(intakeId, "intake", auth.profile.id)

  // Determine service type for conditional fetches
  const serviceType = (intake.service as { type?: string } | undefined)?.type

  // Parallel fetches
  const [aiDrafts, nextIntakeId, medCertDraft] = await Promise.all([
    getAIDraftsForIntake(intakeId),
    getNextQueueIntakeId(intakeId),
    serviceType === "med_certs"
      ? getOrCreateMedCertDraftForIntake(intakeId)
      : Promise.resolve(null),
  ])

  // Compute patient age
  let patientAge: number | null = null
  if (intake.patient.date_of_birth) {
    const birthDate = new Date(intake.patient.date_of_birth)
    const today = new Date()
    patientAge = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      patientAge--
    }
  }

  // Mask Medicare number
  let maskedMedicare = "Not provided"
  if (intake.patient.medicare_number) {
    const cleaned = intake.patient.medicare_number.replace(/\s/g, "")
    maskedMedicare =
      cleaned.length >= 6
        ? `${cleaned.slice(0, 4)} •••• ${cleaned.slice(-2)}`
        : intake.patient.medicare_number
  }

  return NextResponse.json({
    intake,
    patientAge,
    maskedMedicare,
    aiDrafts,
    nextIntakeId,
    draftId: medCertDraft?.id || null,
  })
}
