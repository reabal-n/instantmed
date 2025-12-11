import { redirect, notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getRequestWithDetails, formatCategory, formatSubtype } from "@/lib/data/requests"
import { getOrCreateMedCertDraftForRequest, getLatestDocumentForRequest } from "@/lib/data/documents"
import { DocumentBuilderClient } from "./document-builder-client"

export default async function DocumentBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Ensure user is a doctor
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/auth/login")
  }

  // Fetch the request with all details
  const request = await getRequestWithDetails(id)

  if (!request) {
    notFound()
  }

  // Only allow document building for medical certificates for now
  if (request.category !== "medical_certificate") {
    redirect(`/doctor/requests/${id}`)
  }

  // Get or create draft
  const draft = await getOrCreateMedCertDraftForRequest(id)

  if (!draft) {
    // Handle error - couldn't create draft
    redirect(`/doctor/requests/${id}`)
  }

  // Check if a document already exists
  const existingDocument = await getLatestDocumentForRequest(id)

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

  const patientAge = calculateAge(request.patient.date_of_birth)

  return (
    <DocumentBuilderClient
      request={request}
      draft={draft}
      existingDocument={existingDocument}
      patientAge={patientAge}
      formatCategory={formatCategory}
      formatSubtype={formatSubtype}
    />
  )
}
