import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getPatientDateCorrectionState } from "@/app/actions/request-date-correction"
import { checkEmailVerified } from "@/app/actions/resend-verification"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getWaitState, type WaitService } from "@/lib/brand/wait-counter"
import { getIntakeDocument } from "@/lib/data/intake-documents"
import { getIntakeForPatient } from "@/lib/data/intakes"
import { getPatientCertificateDocumentForIntake } from "@/lib/patient/intake-certificate-document"

import { IntakeDetailClient } from "./client"

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
  
  // Layout enforces patient role - use cached profile
  const authUser = (await getAuthenticatedUserWithProfile())!

  // Fetch the intake with ownership check
  const intake = await getIntakeForPatient(id, authUser.profile.id)
  
  if (!intake) {
    notFound()
  }
  
  // Live wait signal, but only while the patient is actually waiting — a
  // decided request needs no median, and this is one extra query per view.
  const WAITING_STATUSES = ["paid", "in_review", "pending_info"]
  const waitService: WaitService | null =
    intake.category === "medical_certificate" ? "med-cert"
      : intake.category === "prescription" ? "rx"
        : intake.category === "consult" ? "consult"
          : null
  const waitState = waitService && WAITING_STATUSES.includes(intake.status)
    ? await getWaitState(new Date(), waitService)
    : null

  // Check email verification status
  const { verified: isEmailVerified, email: userEmail } = await checkEmailVerified()
  const dateCorrectionState = await getPatientDateCorrectionState(id)
  
  // Fetch document for approved intakes
  let document = null
  let intakeDocument = null
  if (intake.status === "approved" || intake.status === "completed") {
    document = await getPatientCertificateDocumentForIntake(id)
    // A canonical invalid certificate deliberately resolves to null and must
    // not regain resend/download affordances through an unstatused legacy row.
    if (document) {
      intakeDocument = await getIntakeDocument(id, "med_cert")
    }
  }
  
  return (
    <IntakeDetailClient 
      intake={intake}
      document={document}
      intakeDocument={intakeDocument}
      retryPayment={retry === "true"}
      isEmailVerified={isEmailVerified}
      userEmail={userEmail}
      dateCorrectionState={dateCorrectionState}
      waitState={waitState}
    />
  )
}
