import { redirect, notFound } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getIntakeForPatient } from "@/lib/data/intakes"
import { getLatestDocumentForIntake, getMedCertCertificateForIntake } from "@/lib/data/documents"
import { getIntakeDocument } from "@/lib/data/intake-documents"
import { IntakeDetailClient } from "./client"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Request ${id.slice(0, 8)} | InstantMed`,
    description: "View the status and details of your medical request.",
  }
}

export default async function PatientIntakeDetailPage({
  params,
  searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ retry?: string }> }) {
  const { id } = await params
  const { retry } = await searchParams
  
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    redirect("/sign-in")
  }
  
  // Fetch the intake with ownership check
  const intake = await getIntakeForPatient(id, authUser.profile.id)
  
  if (!intake) {
    notFound()
  }
  
  // Fetch document for approved intakes
  let document = null
  let intakeDocument = null
  if (intake.status === "approved" || intake.status === "completed") {
    // Try med_cert_certificates table first, then fall back to documents table
    document = await getMedCertCertificateForIntake(id) || await getLatestDocumentForIntake(id)
    // Also fetch from intake_documents for resend functionality
    intakeDocument = await getIntakeDocument(id, "med_cert")
  }
  
  return (
    <IntakeDetailClient 
      intake={intake}
      document={document}
      intakeDocument={intakeDocument}
      retryPayment={retry === "true"}
    />
  )
}
