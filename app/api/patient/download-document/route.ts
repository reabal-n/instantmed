import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { auth as _auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getCertificateForIntake, logCertificateEvent } from "@/lib/data/issued-certificates"
import { NextResponse } from "next/server"

export async function GET(_request: Request) {
  try {
    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser || authUser.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(_request.url)
    const intakeId = url.searchParams.get("intakeId") || url.searchParams.get("requestId")

    if (!intakeId) {
      return NextResponse.json(
        { error: "Intake ID is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify patient owns this intake
    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select("id, status, category, patient_id")
      .eq("id", intakeId)
      .eq("patient_id", authUser.profile.id)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json(
        { error: "Intake not found" },
        { status: 404 }
      )
    }

    if (intake.status !== "approved" && intake.status !== "completed") {
      return NextResponse.json(
        { error: "Document is not yet available" },
        { status: 403 }
      )
    }

    // Get certificate from issued_certificates (canonical source)
    const certificate = await getCertificateForIntake(intakeId)
    
    if (!certificate || certificate.status !== "valid") {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (certificate.patient_id !== authUser.profile.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Download from storage using the certificate's storage path
    const { data: document, error: storageError } = await supabase.storage
      .from("documents")
      .download(certificate.storage_path)

    if (storageError || !document) {
      return NextResponse.json(
        { error: "Document not found in storage" },
        { status: 404 }
      )
    }

    // Log download event for audit trail
    void logCertificateEvent(certificate.id, "downloaded", authUser.profile.id, "patient")

    const filename = `Medical_Certificate_${certificate.certificate_number}.pdf`
    return new NextResponse(document, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    )
  }
}
