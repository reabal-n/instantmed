import { NextRequest, NextResponse } from "next/server"

import { requireApiRole } from "@/lib/auth/helpers"
import { getCertificateForIntake } from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("doctor-cert-download")

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/doctor/certificates/[intakeId]/download
 *
 * Doctor/admin endpoint to download the actual stored certificate PDF.
 * Returns the PDF that was sent to the patient - not a regenerated preview.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ intakeId: string }> }
) {
  const { intakeId } = await params

  if (!UUID_RE.test(intakeId)) {
    return NextResponse.json({ error: "Invalid intake ID" }, { status: 400 })
  }

  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireApiRole(["doctor", "admin"])
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const certificate = await getCertificateForIntake(intakeId)
  if (!certificate || !certificate.storage_path) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
  }

  const supabase = createServiceRoleClient()
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("documents")
    .createSignedUrl(certificate.storage_path, 300)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    log.error("Failed to generate signed URL", { intakeId, error: signedUrlError })
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 })
  }

  const pdfResponse = await fetch(signedUrlData.signedUrl)
  if (!pdfResponse.ok) {
    log.error("Failed to fetch PDF from storage", { intakeId, status: pdfResponse.status })
    return NextResponse.json({ error: "Certificate file not available" }, { status: 500 })
  }

  const pdfBuffer = await pdfResponse.arrayBuffer()

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${intakeId}.pdf"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
      "Cache-Control": "private, no-store",
    },
  })
}
