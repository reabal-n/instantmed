import { redirect, notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getIntakeWithDetails } from "@/lib/data/intakes"
import { getOrCreateMedCertDraftForIntake, getLatestDocumentForIntake } from "@/lib/data/documents"
import { DocumentBuilderClient } from "./document-builder-client"

export const dynamic = "force-dynamic"

export default async function IntakeDocumentBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  const intake = await getIntakeWithDetails(id)

  if (!intake) {
    notFound()
  }

  const service = intake.service as { type?: string } | undefined

  // Only allow document building for med certs
  if (service?.type !== "med_certs") {
    redirect(`/doctor/intakes/${id}`)
  }

  // Get or create draft
  const draft = await getOrCreateMedCertDraftForIntake(id)

  if (!draft) {
    redirect(`/doctor/intakes/${id}`)
  }

  // Check if a document already exists
  const existingDocument = await getLatestDocumentForIntake(id)

  // Calculate patient age
  const calculateAge = (dob: string): number => {
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
    />
  )
}
