/**
 * Medical Certificate Test Route
 * 
 * Renders a sample medical certificate PDF for testing purposes.
 * Access at: GET /api/test/med-cert-render
 * 
 * Returns: PDF stream (application/pdf)
 * 
 * NOTE: This is a test route and should be removed or protected in production.
 */

/* eslint-disable no-console */

import { NextRequest, NextResponse } from "next/server"
import { renderMedicalCertificateToPdf } from "@/lib/documents/render-med-cert"
import type { MedCertDraft } from "@/types/db"

// Sample draft data for testing
const SAMPLE_DRAFT: MedCertDraft = {
  id: "test-123",
  request_id: "req-123",
  patient_full_name: "Sarah Elizabeth Johnson",
  patient_dob: "1990-03-15",
  date_from: "2024-01-15",
  date_to: "2024-01-22",
  certificate_type: "work",
  reason_summary: "Acute respiratory infection with fever and fatigue",
  doctor_typed_name: "Dr Reabal Najjar",
  doctor_ahpra: "MED0002576546",
  provider_name: "InstantMed",
  provider_address: "Level 12, 1 Macquarie Place, Sydney NSW 2000",
  signature_asset_url: null,
  status: "issued",
  issued_at: "2024-01-15T10:00:00Z",
  issued_by: "doctor-123",
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
}

export async function GET(request: NextRequest) {
  // SECURITY: Disable test endpoints in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    )
  }

  try {
    // Get certificate type from query param (default: work)
    const certTypeParam = request.nextUrl.searchParams.get("type")
    const certType = (certTypeParam || "work") as "work" | "uni" | "carer"

    // Validate certificate type
    if (!["work", "uni", "carer"].includes(certType)) {
      return NextResponse.json(
        { error: "Invalid certificate type. Must be: work, uni, or carer" },
        { status: 400 }
      )
    }

    // Update sample draft with requested type
    const draft: MedCertDraft = {
      ...SAMPLE_DRAFT,
      certificate_type: certType,
    }

    // Get logo URL from environment or use placeholder
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const logoUrl = `${appUrl}/logos/instantmed-logo.png`

    // Render PDF
    const pdfBuffer = await renderMedicalCertificateToPdf(draft, logoUrl)

    // Return as PDF file
    return new NextResponse(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="medical-certificate-${certType}-test.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[MedCert Test Route] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to render medical certificate",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
