/**
 * Template-based PDF renderer using pdf-lib
 *
 * Loads a pre-designed clean template PDF from /public/templates/ and draws
 * dynamic text (body paragraphs, issue date, certificate ref) on top using
 * drawText(). Templates contain the visual design (logo, title, signature,
 * stamp, doctor info, footer) with no body text — all body content is drawn
 * by this renderer.
 *
 * Uses a dynamic flowing layout: text starts at an anchor Y and flows
 * downward. Each section's Y is computed from the previous section's end.
 * Body text is auto-wrapped by the wrapText() utility.
 *
 * Templates: work_template.pdf, study_template.pdf, carer_template.pdf
 * (all share the same design/spacing — only the title differs)
 */

import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib"
import * as fs from "fs/promises"
import * as path from "path"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("template-renderer")

// A4: 595.28 x 841.89pt (ISO standard)
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89

/** Convert top-origin Y to PDF bottom-origin Y */
function ty(topY: number): number {
  return PAGE_HEIGHT - topY
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TemplatePdfInput {
  certificateType: "work" | "study" | "carer"
  patientName: string
  consultationDate: string // formatted display string e.g. "18 February 2026"
  startDate: string        // formatted display string
  endDate: string          // formatted display string
  certificateRef: string   // IM-WORK-20260218-00847
  issueDate: string        // formatted date for header e.g. "18/02/2026"
}

export interface TemplatePdfResult {
  success: boolean
  buffer?: Buffer
  error?: string
}

// ---------------------------------------------------------------------------
// Layout configuration
//
// Single config for all template types (same design/spacing).
// Uses a dynamic flowing layout — text starts at anchorY and flows down.
//
// Coordinate reference (top-origin, measured from the carer template screenshot):
//   Header block (logo + clinic info):      ~0–90 pt
//   Divider line:                           ~100 pt
//   Title ("Medical/Carer Certificate"):    ~150 pt
//   Issue date (right-aligned):             ~170 pt
//   Body text anchor:                       ~290 pt
//   Doctor block:                           ~560 pt
//   Signature:                              ~610 pt
//   Bottom divider line:                    ~650 pt
//   Certificate ref:                        ~670 pt
//   Footer disclaimer:                      ~715 pt
// ---------------------------------------------------------------------------

const LAYOUT = {
  /** Issue date Y — in the space between title and body, right-aligned */
  issueDateY: 170,
  /** Where "To whom it may concern," starts */
  anchorY: 290,
  /** Gap between salutation and body paragraph */
  bodyGap: 10,
  /** Gap between body paragraph and return paragraph */
  paragraphGap: 14,
  /** Line height for body text (11pt × ~1.55 leading) */
  lineHeight: 17,
  /** Left margin for body text */
  bodyX: 72,
  /** Max text width for body paragraphs */
  bodyWidth: 450,
  /** Certificate ref Y — between bottom divider (~650) and footer (~715) */
  certIdY: 695,
  /** Right margin for date */
  rightMargin: 50,
  /** Maximum Y before body text would collide with doctor block (~560pt) */
  maxBodyY: 540,
  /** Font sizes */
  fontSize: {
    body: 11,
    salutation: 11,
    issueDate: 10,
    certId: 8,
  },
}

// ---------------------------------------------------------------------------
// Body text generators — single string per paragraph, auto-wrapped at render
// ---------------------------------------------------------------------------

function getDatePhrase(input: TemplatePdfInput): string {
  // Single day: "on 18 February 2026"
  // Multi-day: "from 18 February 2026 to 20 February 2026 inclusive"
  if (input.startDate === input.endDate) {
    return `on ${input.startDate}`
  }
  return `from ${input.startDate} to ${input.endDate} inclusive`
}

function getBodyText(input: TemplatePdfInput): string {
  const datePart = getDatePhrase(input)
  switch (input.certificateType) {
    case "work":
      return `This is to certify that ${input.patientName} has been reviewed and assessed on ${input.consultationDate}. In my clinical opinion, they are medically unfit to attend work or fulfil their usual occupational duties ${datePart}.`
    case "study":
      return `This is to certify that ${input.patientName} has been reviewed and assessed on ${input.consultationDate}. In my clinical opinion, they are medically unfit to attend classes, sit examinations, or complete academic assessments ${datePart}.`
    case "carer":
      return `This is to certify that ${input.patientName} has been reviewed and assessed on ${input.consultationDate}. They are required to provide full-time care for a dependent family member who is currently unwell and are therefore unable to attend work or fulfil their usual duties ${datePart}.`
  }
}

function getReturnText(input: TemplatePdfInput): string {
  const isSingleDay = input.startDate === input.endDate
  switch (input.certificateType) {
    case "work":
      if (isSingleDay) {
        return `They are advised to rest and recover and are expected to return to work the following day.`
      }
      return `They are advised to rest and recover during this period and are expected to return to work on ${input.endDate}, or earlier if symptoms resolve.`
    case "study":
      if (isSingleDay) {
        return `They require rest and recovery and are expected to resume academic activities the following day. I would support an application for special consideration, exam deferral, or alternative assessment arrangement as deemed appropriate by their institution.`
      }
      return `They require this period for rest and recovery and are expected to resume academic activities on ${input.endDate}, or earlier if symptoms resolve. I would support an application for special consideration, exam deferral, or alternative assessment arrangement as deemed appropriate by their institution.`
    case "carer":
      if (isSingleDay) {
        return `They are expected to return to work the following day, subject to the dependent's recovery.`
      }
      return `They are expected to return to work on ${input.endDate}, subject to the dependent's recovery.`
  }
}

// ---------------------------------------------------------------------------
// Word-wrapping utility
// ---------------------------------------------------------------------------

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export async function renderTemplatePdf(input: TemplatePdfInput): Promise<TemplatePdfResult> {
  try {
    // Validate patient name — strip control chars, zero-width chars, soft hyphens
    const trimmedName = input.patientName?.replace(/[\x00-\x1F\x7F\u200B-\u200D\uFEFF\u00AD]/g, "").trim()
    if (!trimmedName) {
      return { success: false, error: "Patient name is required" }
    }
    if (trimmedName.length > 100) {
      return { success: false, error: "Patient name exceeds maximum length (100 characters)" }
    }
    // Use the sanitised name for rendering
    const sanitisedInput = { ...input, patientName: trimmedName }

    const templateFile = `${sanitisedInput.certificateType}_template.pdf`

    // Load template PDF — try filesystem first (local dev), then HTTP fetch (Vercel serverless).
    // Vercel serverless functions don't have /public on the filesystem; files are served via CDN.
    let templateBytes: Buffer
    try {
      const templatePath = path.join(process.cwd(), "public", "templates", templateFile)
      templateBytes = await fs.readFile(templatePath)
    } catch {
      // Filesystem not available (Vercel serverless) — fetch from public URL
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000")
        const res = await fetch(`${baseUrl}/templates/${templateFile}`)
        if (!res.ok) {
          return { success: false, error: `Template not found: ${templateFile} (HTTP ${res.status})` }
        }
        templateBytes = Buffer.from(await res.arrayBuffer())
      } catch (fetchErr) {
        log.error("Template load failed (both fs and fetch)", { templateFile, error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr) })
        return { success: false, error: `Template not found: ${templateFile}` }
      }
    }

    const pdfDoc = await PDFDocument.load(templateBytes)
    const page = pdfDoc.getPage(0)

    // Embed fonts — Helvetica for a clean, modern sans-serif look
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    const textColor = rgb(0.15, 0.15, 0.15) // soft black, less harsh than pure black
    const lightGrey = rgb(0.55, 0.55, 0.55) // for certificate ref

    // Helper: draw a single line of text
    const drawLine = (
      text: string,
      x: number,
      topY: number,
      font: PDFFont,
      size: number,
      color = textColor,
    ) => {
      page.drawText(text, {
        x,
        y: ty(topY),
        size,
        font,
        color,
      })
    }

    // Helper: draw a wrapped paragraph, returns the Y position after the last line
    const drawWrappedParagraph = (
      text: string,
      x: number,
      startTopY: number,
      font: PDFFont,
      size: number,
      lineHeight: number,
      maxWidth: number,
      color = textColor,
    ): number => {
      const lines = wrapText(text, font, size, maxWidth)
      let currentY = startTopY
      for (const line of lines) {
        drawLine(line, x, currentY, font, size, color)
        currentY += lineHeight
      }
      return currentY
    }

    // ---- Issue date (right-aligned, below title area) ----
    const dateWidth = fontRegular.widthOfTextAtSize(sanitisedInput.issueDate, LAYOUT.fontSize.issueDate)
    drawLine(
      sanitisedInput.issueDate,
      PAGE_WIDTH - LAYOUT.rightMargin - dateWidth,
      LAYOUT.issueDateY,
      fontRegular,
      LAYOUT.fontSize.issueDate,
    )

    // ---- Dynamic flowing body text ----
    let currentY = LAYOUT.anchorY

    // Salutation
    drawLine(
      "To whom it may concern,",
      LAYOUT.bodyX,
      currentY,
      fontItalic,
      LAYOUT.fontSize.salutation,
    )
    currentY += LAYOUT.lineHeight + LAYOUT.bodyGap

    // Body paragraph (auto-wrapped)
    const bodyText = getBodyText(sanitisedInput)
    currentY = drawWrappedParagraph(
      bodyText,
      LAYOUT.bodyX,
      currentY,
      fontRegular,
      LAYOUT.fontSize.body,
      LAYOUT.lineHeight,
      LAYOUT.bodyWidth,
    )

    // Gap between body and return paragraph
    currentY += LAYOUT.paragraphGap

    // Guard: check body text hasn't overflowed into doctor block area
    if (currentY > LAYOUT.maxBodyY) {
      return { success: false, error: "Certificate body text is too long — it would overlap the doctor information block. Please shorten the patient name or date range." }
    }

    // Return paragraph (auto-wrapped)
    const returnText = getReturnText(sanitisedInput)
    const endY = drawWrappedParagraph(
      returnText,
      LAYOUT.bodyX,
      currentY,
      fontRegular,
      LAYOUT.fontSize.body,
      LAYOUT.lineHeight,
      LAYOUT.bodyWidth,
    )

    // Guard: final overflow check after all text is drawn
    if (endY > LAYOUT.maxBodyY) {
      return { success: false, error: "Certificate body text is too long — it would overlap the doctor information block. Please shorten the patient name or date range." }
    }

    // ---- Certificate ref (centered, light grey, small — between bottom divider and footer) ----
    const certIdLabel = `CERTIFICATE ID: ${sanitisedInput.certificateRef}`
    const certIdWidth = fontRegular.widthOfTextAtSize(certIdLabel, LAYOUT.fontSize.certId)
    const certIdX = (PAGE_WIDTH - certIdWidth) / 2
    drawLine(
      certIdLabel,
      certIdX,
      LAYOUT.certIdY,
      fontRegular,
      LAYOUT.fontSize.certId,
      lightGrey,
    )

    // ---- Save ----
    const pdfBytes = await pdfDoc.save()

    log.info("Template PDF rendered", {
      certificateType: sanitisedInput.certificateType,
      certificateRef: sanitisedInput.certificateRef,
    })

    return {
      success: true,
      buffer: Buffer.from(pdfBytes),
    }
  } catch (error) {
    log.error("Template PDF render failed", {}, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Template PDF rendering failed",
    }
  }
}
