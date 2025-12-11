import { redirect, notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getRequestWithDetails } from "@/lib/data/requests"
import { getOrCreatePathologyDraftForRequest, getLatestDocumentForRequest } from "@/lib/data/documents"
import { PathologyDocumentBuilderClient } from "./pathology-document-builder-client"

interface PathologyDocumentPageProps {
  params: Promise<{ id: string }>
}

export default async function PathologyDocumentPage({ params }: PathologyDocumentPageProps) {
  const { id } = await params

  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/auth/login")
  }

  const request = await getRequestWithDetails(id)

  if (!request) {
    notFound()
  }

  // Verify this is a pathology referral
  if (request.category !== "referral" || request.subtype !== "pathology-imaging") {
    redirect(`/doctor/requests/${id}`)
  }

  const draft = await getOrCreatePathologyDraftForRequest(id)

  if (!draft) {
    redirect(`/doctor/requests/${id}`)
  }

  const existingDocument = await getLatestDocumentForRequest(id)

  // Calculate patient age
  const patientDob = request.patient.date_of_birth
  const patientAge = patientDob
    ? Math.floor((Date.now() - new Date(patientDob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0

  const formatCategory = (category: string | null) => {
    if (!category) return "Unknown"
    return category
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  const formatSubtype = (subtype: string | null) => {
    if (!subtype) return "Unknown"
    return subtype
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  return (
    <PathologyDocumentBuilderClient
      request={request}
      draft={draft}
      existingDocument={existingDocument}
      patientAge={patientAge}
      formatCategory={formatCategory}
      formatSubtype={formatSubtype}
    />
  )
}
