import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { getIntakeWithDetails, getPatientIntakes, getNextQueueIntakeId } from "@/lib/data/intakes"
import { getOrCreateMedCertDraftForIntake } from "@/lib/data/documents"
import { IntakeDetailClient } from "./intake-detail-client"
import { logClinicianOpenedRequest } from "@/lib/audit/compliance-audit"
import { getAIDraftsForIntake } from "@/app/actions/draft-approval"

export const dynamic = "force-dynamic"

export default async function DoctorIntakeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { id } = await params
  const { action } = await searchParams

  // Layout enforces doctor/admin role
  const { profile } = await requireRole(["doctor", "admin"])

  const intake = await getIntakeWithDetails(id)

  if (!intake) {
    notFound()
  }

  // Compliance audit logging (AUDIT_LOGGING_REQUIREMENTS.md)
  await logClinicianOpenedRequest(id, "intake", profile.id)

  // Fetch patient's previous intakes for history
  const { data: patientHistory } = await getPatientIntakes(intake.patient.id, { pageSize: 6 })
  const previousIntakes = patientHistory.filter((r: { id: string }) => r.id !== id).slice(0, 5)

  // Fetch AI drafts and next intake ID in parallel
  const [aiDrafts, nextIntakeId, medCertDraft] = await Promise.all([
    getAIDraftsForIntake(id),
    getNextQueueIntakeId(id),
    // Pre-fetch or create med cert draft if it's a med cert service
    (intake.service as { type?: string } | undefined)?.type === "med_certs"
      ? getOrCreateMedCertDraftForIntake(id)
      : Promise.resolve(null),
  ])

  // Calculate patient age from DOB
  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Mask Medicare number
  const maskMedicare = (medicare: string | null): string => {
    if (!medicare) return "Not provided"
    const cleaned = medicare.replace(/\s/g, "")
    if (cleaned.length < 6) return medicare
    return `${cleaned.slice(0, 4)} •••• ${cleaned.slice(-2)}`
  }

  const patientAge = calculateAge(intake.patient.date_of_birth)
  const maskedMedicare = maskMedicare(intake.patient.medicare_number)

  return (
    <IntakeDetailClient
      intake={intake}
      patientAge={patientAge}
      maskedMedicare={maskedMedicare}
      previousIntakes={previousIntakes}
      initialAction={action}
      aiDrafts={aiDrafts}
      nextIntakeId={nextIntakeId}
      draftId={medCertDraft?.id || null}
    />
  )
}
