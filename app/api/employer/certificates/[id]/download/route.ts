import { NextRequest, NextResponse } from "next/server"

import {
  getEmployerCertificateStorageVersion,
  verifyEmployerCertificateToken,
} from "@/lib/crypto/employer-certificate-token"
import {
  getCertificateById,
  getCertificateForIntake,
  logCertificateEvent,
} from "@/lib/data/issued-certificates"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("employer-certificate-download")

function unavailable(status: 403 | 404 | 410) {
  const message = status === 410
    ? "This certificate link is no longer current. Ask the employee to send a new link."
    : "This certificate link is invalid or has expired."
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: certificateId } = await params
  const token = request.nextUrl.searchParams.get("token")
  const tokenPayload = token ? verifyEmployerCertificateToken(token) : null

  if (!tokenPayload || tokenPayload.certificateId !== certificateId) {
    return unavailable(403)
  }

  const certificate = await getCertificateById(certificateId)
  if (!certificate || certificate.status !== "valid") {
    return unavailable(certificate ? 410 : 404)
  }

  // A status check alone is insufficient if legacy data contains more than one
  // valid row. Require this exact row to be the current intake certificate.
  const currentCertificate = await getCertificateForIntake(certificate.intake_id)
  if (!currentCertificate || currentCertificate.id !== certificate.id) {
    return unavailable(410)
  }

  // Corrections keep the certificate id but switch to a new object path. The
  // path fingerprint makes every previously emailed token immediately stale.
  if (
    tokenPayload.storageVersion !==
    getEmployerCertificateStorageVersion(certificate.storage_path)
  ) {
    return unavailable(410)
  }

  const supabase = createServiceRoleClient()
  const { data: pdf, error: downloadError } = await supabase.storage
    .from("documents")
    .download(certificate.storage_path)

  if (downloadError || !pdf) {
    log.error("Employer certificate storage download failed", {
      certificateId,
      storagePath: certificate.storage_path,
    }, downloadError ?? undefined)
    return NextResponse.json(
      { error: "The certificate could not be opened. Please try again." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    )
  }

  const auditResult = await logCertificateEvent(
    certificate.id,
    "downloaded",
    null,
    "system",
    { channel: "employer_version_bound_link" },
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? undefined,
    request.headers.get("user-agent") ?? undefined,
  )

  if (!auditResult.success) {
    log.error("Employer certificate access audit failed", { certificateId })
    return NextResponse.json(
      { error: "Certificate access is temporarily unavailable." },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store",
          "Retry-After": "30",
        },
      },
    )
  }

  return new NextResponse(await pdf.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="instantmed-certificate.pdf"',
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
