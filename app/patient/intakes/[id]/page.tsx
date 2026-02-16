import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { getIntakeForPatient } from "@/lib/data/intakes"
import { getLatestDocumentForIntake, getMedCertCertificateForIntake } from "@/lib/data/documents"
import { getIntakeDocument } from "@/lib/data/intake-documents"
import { getCertificateWithPdfUrl } from "@/lib/data/issued-certificates"
import { checkEmailVerified } from "@/app/actions/resend-verification"
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
  
  const authUser = await requireRole(["patient"])

  // Fetch the intake with ownership check
  const intake = await getIntakeForPatient(id, authUser.profile.id)
  
  if (!intake) {
    notFound()
  }
  
  // Check email verification status
  const { verified: isEmailVerified, email: userEmail } = await checkEmailVerified()
  
  // Fetch document for approved intakes
  let document = null
  let intakeDocument = null
  if (intake.status === "approved" || intake.status === "completed") {
    // Priority order for certificate lookup:
    // 1. issued_certificates (new canonical table)
    // 2. med_cert_certificates (legacy)
    // 3. documents table (older legacy)
    document = await getCertificateWithPdfUrl(id) 
      || await getMedCertCertificateForIntake(id) 
      || await getLatestDocumentForIntake(id)
    // Also fetch from intake_documents for resend functionality
    intakeDocument = await getIntakeDocument(id, "med_cert")
  }
  
  return (
    <IntakeDetailClient 
      intake={intake}
      document={document}
      intakeDocument={intakeDocument}
      retryPayment={retry === "true"}
      isEmailVerified={isEmailVerified}
      userEmail={userEmail}
    />
  )
}
