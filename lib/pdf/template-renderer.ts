/**
 * Template-based PDF renderer using pdf-lib
 *
 * Loads a single pre-designed template PDF from /public/templates/template.pdf
 * and draws all dynamic content on top using drawText() and drawImage().
 *
 * Dynamic content drawn by this renderer:
 *   - Certificate title (Medical Certificate / Carer Certificate)
 *   - Issue date (right-aligned)
 *   - Body text (salutation + paragraphs, auto-wrapped)
 *   - Certificate ID (small grey, centered above footer)
 *   - QR code (right of footer, links to /verify?id=...)
 */

import { PDFDocument, rgb, StandardFonts, degrees, type PDFFont } from "pdf-lib"
import QRCode from "qrcode"
import * as fs from "fs/promises"
import * as path from "path"
import * as Sentry from "@sentry/nextjs"
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
  patientDateOfBirth?: string | null // formatted DD/MM/YYYY for display after name
  consultationDate: string // formatted display string e.g. "18 February 2026"
  startDate: string        // formatted display string
  endDate: string          // formatted display string
  certificateRef: string   // IM-WORK-20260218-00847
  issueDate: string        // formatted date for header e.g. "18/02/2026"
  isPreview?: boolean      // if true, stamps a diagonal "PREVIEW ONLY" watermark
}

export interface TemplatePdfResult {
  success: boolean
  buffer?: Buffer
  error?: string
}

// ---------------------------------------------------------------------------
// Layout configuration
//
// Single template for all certificate types.
// Dynamic title + body drawn on top of blank areas in the template.
//
// Top-origin coordinates (measured from template):
//   Header block (logo + clinic info):    ~0–220 pt
//   Divider line:                         ~230 pt
//   Title (dynamic):                      ~285 pt  ← drawn by renderer
//   Issue date (right-aligned):           ~315 pt  ← drawn by renderer
//   Body text anchor:                     ~380 pt  ← drawn by renderer
//   Doctor block:                         ~700 pt  (baked in template)
//   Bottom divider line:                  ~780 pt  (baked in template)
//   Certificate ID:                       ~800 pt  ← drawn by renderer
//   Footer text:                          ~820 pt  (baked in template)
//   QR code (right of footer):            ~815 pt  ← drawn by renderer
// ---------------------------------------------------------------------------

const LAYOUT = {
  /** Title Y — centered, large, below top divider */
  titleY: 285,
  /** Issue date Y — right-aligned, between top divider (~230) and title (~285) */
  issueDateY: 248,
  /** Where "To whom it may concern," starts */
  anchorY: 380,
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
  /** Certificate ID Y — below footer text, near bottom edge */
  certIdY: 820,
  /** Right margin */
  rightMargin: 50,
  /** Maximum Y before body text would collide with doctor block (~535pt) */
  maxBodyY: 530,
  /** QR code: top-origin Y, right-aligned. Bottom-right corner above footer. */
  qrY: 745,
  /** QR code rendered size in points */
  qrSize: 55,
  /** Font sizes */
  fontSize: {
    title: 18,
    body: 11,
    salutation: 11,
    issueDate: 10,
    certId: 8,
  },
}

// ---------------------------------------------------------------------------
// Helpers: name capitalisation
// ---------------------------------------------------------------------------

function toTitleCase(name: string): string {
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "")
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return ""
      if (word.includes("-")) return word.split("-").map(cap).join("-")
      if (word.includes("'")) return word.split("'").map(cap).join("'")
      return cap(word)
    })
    .filter(Boolean)
    .join(" ")
}

// ---------------------------------------------------------------------------
// Body text generators
// ---------------------------------------------------------------------------

function getTitle(type: TemplatePdfInput["certificateType"]): string {
  return type === "carer" ? "Carer Certificate" : "Medical Certificate"
}

function getDatePhrase(input: TemplatePdfInput): string {
  if (input.startDate === input.endDate) return `on ${input.startDate}`
  return `from ${input.startDate} to ${input.endDate} inclusive`
}

function getBodyText(input: TemplatePdfInput): string {
  const displayName = toTitleCase(input.patientName)
  const nameWithDob = input.patientDateOfBirth
    ? `${displayName} (DOB: ${input.patientDateOfBirth})`
    : displayName
  const datePart = getDatePhrase(input)
  switch (input.certificateType) {
    case "work":
      return `This is to certify that ${nameWithDob} has been reviewed and assessed on ${input.consultationDate}. In my clinical opinion, they are medically unfit to attend work or fulfil their usual occupational duties ${datePart}.`
    case "study":
      return `This is to certify that ${nameWithDob} has been reviewed and assessed on ${input.consultationDate}. In my clinical opinion, they are medically unfit to attend classes, sit examinations, or complete academic assessments ${datePart}.`
    case "carer":
      return `This is to certify that ${nameWithDob} has been reviewed and assessed on ${input.consultationDate}. They are required to provide full-time care for a dependent family member who is currently unwell and are therefore unable to attend work or fulfil their usual duties ${datePart}.`
  }
}

function getReturnText(input: TemplatePdfInput): string {
  const isSingleDay = input.startDate === input.endDate
  const periodRef = isSingleDay ? "this date" : "this period"
  switch (input.certificateType) {
    case "work":
      return `They are advised to rest and recover and may return to work once ${periodRef} has concluded, or earlier if symptoms resolve.`
    case "study":
      return `They require rest and recovery and may resume academic activities once ${periodRef} has concluded, or earlier if symptoms resolve. I would support an application for special consideration, exam deferral, or alternative assessment arrangement as deemed appropriate by their institution.`
    case "carer":
      return `They may return to work once ${periodRef} has concluded, subject to the dependent's recovery.`
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
    if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export async function renderTemplatePdf(input: TemplatePdfInput): Promise<TemplatePdfResult> {
  try {
    // Sanitise patient name
    // eslint-disable-next-line no-control-regex -- Intentional: strip control chars from patient names for PDF safety
    const trimmedName = input.patientName?.replace(/[\x00-\x1F\x7F\u200B-\u200D\uFEFF\u00AD]/g, "").trim()
    if (!trimmedName) return { success: false, error: "Patient name is required" }
    if (trimmedName.length > 100) return { success: false, error: "Patient name exceeds maximum length (100 characters)" }

    const ALLOWED_TYPES = new Set(["work", "study", "carer"])
    if (!ALLOWED_TYPES.has(input.certificateType)) {
      return { success: false, error: `Invalid certificate type: ${input.certificateType}` }
    }

    const sanitisedInput = { ...input, patientName: trimmedName }
    const templateFile = "template.pdf"

    // Load template PDF from filesystem. `outputFileTracingIncludes` in
    // next.config.mjs ensures public/templates/** is bundled into the
    // serverless function, so this read works in both local dev and on Vercel.
    let templateBytes: Buffer
    try {
      const templatePath = path.join(process.cwd(), "public", "templates", templateFile)
      templateBytes = await fs.readFile(templatePath)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error("Template load failed", { templateFile, error: msg })
      Sentry.captureException(err, { tags: { subsystem: "cert-template-load" } })
      return { success: false, error: `Template not found: ${templateFile}` }
    }

    let pdfDoc
    try {
      pdfDoc = await PDFDocument.load(templateBytes)
    } catch (loadError) {
      log.error("Failed to parse template PDF", { templateFile, error: loadError instanceof Error ? loadError.message : String(loadError) })
      return { success: false, error: `Template PDF is corrupt or invalid: ${templateFile}` }
    }

    const page = pdfDoc.getPage(0)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier)

    const textColor = rgb(0.15, 0.15, 0.15)
    const darkNavy = rgb(0.05, 0.08, 0.28)

    const drawLine = (text: string, x: number, topY: number, font: PDFFont, size: number, color = textColor) => {
      page.drawText(text, { x, y: ty(topY), size, font, color })
    }

    const drawWrappedParagraph = (
      text: string, x: number, startTopY: number,
      font: PDFFont, size: number, lineHeight: number, maxWidth: number,
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

    // ---- Title (centered, bold) ----
    const title = getTitle(sanitisedInput.certificateType)
    const titleWidth = fontBold.widthOfTextAtSize(title, LAYOUT.fontSize.title)
    drawLine(title, (PAGE_WIDTH - titleWidth) / 2, LAYOUT.titleY, fontBold, LAYOUT.fontSize.title)

    // ---- Issue date (right-aligned, between top divider and title) ----
    const dateWidth = fontRegular.widthOfTextAtSize(sanitisedInput.issueDate, LAYOUT.fontSize.issueDate)
    drawLine(sanitisedInput.issueDate, PAGE_WIDTH - LAYOUT.rightMargin - dateWidth, LAYOUT.issueDateY, fontRegular, LAYOUT.fontSize.issueDate)

    // ---- Body text (flowing) ----
    let currentY = LAYOUT.anchorY

    drawLine("To whom it may concern,", LAYOUT.bodyX, currentY, fontItalic, LAYOUT.fontSize.salutation)
    currentY += LAYOUT.lineHeight + LAYOUT.bodyGap

    const bodyText = getBodyText(sanitisedInput)
    currentY = drawWrappedParagraph(bodyText, LAYOUT.bodyX, currentY, fontRegular, LAYOUT.fontSize.body, LAYOUT.lineHeight, LAYOUT.bodyWidth)
    currentY += LAYOUT.paragraphGap

    if (currentY > LAYOUT.maxBodyY) {
      return { success: false, error: "Certificate body text is too long — it would overlap the doctor information block." }
    }

    const returnText = getReturnText(sanitisedInput)
    const endY = drawWrappedParagraph(returnText, LAYOUT.bodyX, currentY, fontRegular, LAYOUT.fontSize.body, LAYOUT.lineHeight, LAYOUT.bodyWidth)

    if (endY > LAYOUT.maxBodyY) {
      return { success: false, error: "Certificate body text is too long — it would overlap the doctor information block." }
    }

    // ---- Certificate ID (centered, dark navy, monospace, below footer) ----
    const certIdLabel = `CERTIFICATE ID: ${sanitisedInput.certificateRef}`
    const certIdWidth = fontMono.widthOfTextAtSize(certIdLabel, LAYOUT.fontSize.certId)
    drawLine(certIdLabel, (PAGE_WIDTH - certIdWidth) / 2, LAYOUT.certIdY, fontMono, LAYOUT.fontSize.certId, darkNavy)

    // ---- QR code (right of footer text) ----
    const verifyUrl = `https://instantmed.com.au/verify/${sanitisedInput.certificateRef}`
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 120, // render at 2× for crispness, scale down in PDF
      margin: 1,
      color: { dark: "#262626", light: "#ffffff" },
    })
    const qrImage = await pdfDoc.embedPng(qrBuffer)
    page.drawImage(qrImage, {
      x: PAGE_WIDTH - LAYOUT.rightMargin - LAYOUT.qrSize,
      y: ty(LAYOUT.qrY + LAYOUT.qrSize),
      width: LAYOUT.qrSize,
      height: LAYOUT.qrSize,
    })

    // ---- PREVIEW watermark (diagonal, semi-transparent) ----
    if (sanitisedInput.isPreview) {
      page.drawText("PREVIEW ONLY", {
        x: 95,
        y: PAGE_HEIGHT / 2 - 20,
        size: 64,
        font: fontBold,
        color: rgb(0.85, 0.1, 0.1),
        opacity: 0.12,
        rotate: degrees(45),
      })
    }

    // ---- Save ----
    const pdfBytes = await pdfDoc.save()

    log.info("Template PDF rendered", {
      certificateType: sanitisedInput.certificateType,
      certificateRef: sanitisedInput.certificateRef,
    })

    return { success: true, buffer: Buffer.from(pdfBytes) }

  } catch (error) {
    log.error("Template PDF render failed", {}, error instanceof Error ? error : undefined)
    return { success: false, error: error instanceof Error ? error.message : "Template PDF rendering failed" }
  }
}
