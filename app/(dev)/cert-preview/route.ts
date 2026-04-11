/**
 * DEV ONLY - Certificate PDF preview route
 *
 * Generates a test certificate PDF and streams it directly to the browser
 * for layout calibration. Blocked in production/preview by middleware.
 *
 * Usage: GET /cert-preview?type=work|study|carer
 *
 * Open in browser → inspect where title, body text, cert ID, and QR code land.
 * Adjust LAYOUT constants in lib/pdf/template-renderer.ts until everything fits.
 */

import { NextResponse } from "next/server"
import { renderTemplatePdf } from "@/lib/pdf/template-renderer"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawType = searchParams.get("type") ?? "work"
  const type = ["work", "study", "carer"].includes(rawType)
    ? (rawType as "work" | "study" | "carer")
    : "work"

  const result = await renderTemplatePdf({
    certificateType: type,
    patientName: "Sarah Jane Mitchell",
    patientDateOfBirth: "15/06/1990",
    consultationDate: "1 April 2026",
    startDate: "1 April 2026",
    endDate: "2 April 2026",
    certificateRef: "IM-WORK-20260401-00000001",
    issueDate: "01/04/2026",
  })

  if (!result.success || !result.buffer) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return new NextResponse(result.buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cert-preview-${type}.pdf"`,
    },
  })
}
