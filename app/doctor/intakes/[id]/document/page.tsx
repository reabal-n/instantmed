import { redirect, notFound } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { getIntakeWithDetails } from "@/lib/data/intakes"
import { getOrCreateMedCertDraftForIntake, getLatestDocumentForIntake, getAIDraftsForIntake } from "@/lib/data/documents"
import { getDoctorIdentity, isDoctorIdentityComplete } from "@/lib/data/doctor-identity"
import { DocumentBuilderClient } from "./document-builder-client"

export const dynamic = "force-dynamic"

export default async function IntakeDocumentBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Layout enforces doctor/admin role
  const { profile } = await requireRole(["doctor", "admin"])

  // Check doctor credentials
  const doctorIdentity = await getDoctorIdentity(profile.id)
  const hasCredentials = isDoctorIdentityComplete(doctorIdentity)

  const intake = await getIntakeWithDetails(id)

  if (!intake) {
    notFound()
  }

  const service = intake.service as { type?: string } | undefined

  // Only allow document building for med certs
  if (service?.type !== "med_certs") {
    redirect(`/doctor/intakes/${id}`)
  }

  // Get or create draft (will be seeded from AI draft if one exists)
  const draft = await getOrCreateMedCertDraftForIntake(id)

  if (!draft) {
    redirect(`/doctor/intakes/${id}`)
  }

  // Fetch AI-generated clinical intelligence (clinical note + flags) in parallel
  const [existingDocument, aiDrafts] = await Promise.all([
    getLatestDocumentForIntake(id),
    getAIDraftsForIntake(id),
  ])

  // Calculate patient age
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

  const patientAge = calculateAge(intake.patient.date_of_birth)

  return (
    <DocumentBuilderClient
      intake={intake}
      draft={draft}
      existingDocument={existingDocument}
      patientAge={patientAge}
      hasCredentials={hasCredentials}
      aiDrafts={aiDrafts}
    />
  )
}
