/**
 * Medical Certificate PDF Factory
 * 
 * Consolidated factory for generating med cert PDFs with:
 * - Server-side React-PDF rendering
 * - Doctor-editable fields from document drafts
 * - Branding assets (logo, signature)
 * - No email logic (handled separately)
 */

import "server-only"
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import type { MedCertDraftData } from "@/types/db"
import { getLogoUrl, getSignatureUrl } from "@/lib/assets/asset-urls"
import { logger } from "@/lib/logger"

// PDF Styles
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
  },
  header: {
    flexDirection: "row",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#00E2B5",
    paddingBottom: 20,
    alignItems: "flex-start",
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginRight: 20,
  },
  logo: {
    width: 80,
    height: 80,
  },
  headerText: {
    flexDirection: "column",
    flex: 1,
  },
  clinicName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 3,
  },
  tagline: {
    fontSize: 9,
    color: "#64748B",
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 8,
    color: "#94A3B8",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
    color: "#0F172A",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: 140,
    fontWeight: "bold",
    color: "#475569",
  },
  value: {
    flex: 1,
    color: "#0F172A",
  },
  statement: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#00E2B5",
  },
  statementText: {
    fontSize: 11,
    color: "#334155",
  },
  signature: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 15,
  },
  signatureImage: {
    width: 120,
    height: 50,
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0F172A",
  },
  signatureDetails: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },
  clinicInfo: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94A3B8",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  certId: {
    fontSize: 8,
    color: "#94A3B8",
  },
})

/**
 * Format date for display (Australian format)
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return new Date().toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return dateStr
    }
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

/**
 * Get certificate title based on subtype
 */
function getCertTitle(subtype: string): string {
  switch (subtype) {
    case "uni":
      return "Medical Certificate - Educational Institution"
    case "carer":
      return "Medical Certificate - Carer's Leave"
    default:
      return "Medical Certificate - Work Absence"
  }
}

/**
 * Get medical statement text based on certificate subtype
 */
function getStatementText(data: MedCertDraftData, subtype: string): string {
  const patientName = data.patient_name || "the patient"
  const dateFrom = formatDate(data.date_from)
  const dateTo = formatDate(data.date_to)
  const reason = data.reason || "a medical condition"

  switch (subtype) {
    case "uni":
      return `This is to certify that ${patientName} was examined and found to be suffering from ${reason}. In my professional opinion, they were/will be unfit to attend their educational institution or complete assessments from ${dateFrom} to ${dateTo} inclusive.`
    case "carer":
      return `This is to certify that ${patientName} is required to provide care for a family member who is suffering from ${reason}. In my professional opinion, they require carer's leave from ${dateFrom} to ${dateTo} inclusive.`
    default:
      return `This is to certify that ${patientName} was examined and found to be suffering from ${reason}. In my professional opinion, they were/will be unfit for work from ${dateFrom} to ${dateTo} inclusive.`
  }
}

/**
 * Medical Certificate PDF Document Component
 */
function MedCertDocument({
  data,
  subtype,
  certId,
  logoUrl,
  signatureUrl,
}: {
  data: MedCertDraftData
  subtype: string
  certId: string
  logoUrl: string
  signatureUrl: string
}) {
  return (
    <Document title={`Medical Certificate ${certId}`} producer="InstantMed (React-PDF)">
      <Page size="A4" style={styles.page}>
        {/* Header with Logo and Clinic Info */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.logo} src={logoUrl} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.clinicName}>InstantMed</Text>
            <Text style={styles.tagline}>Telehealth Medical Services • Australia</Text>
            <Text style={styles.contactInfo}>
              support@instantmed.com.au{"\n"}
              instantmed.com.au{"\n"}
              ABN: 00 000 000 000
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{getCertTitle(subtype)}</Text>

        {/* Patient Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{data.patient_name || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{formatDate(data.dob)}</Text>
          </View>
        </View>

        {/* Certificate Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certificate Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date Issued:</Text>
            <Text style={styles.value}>{formatDate(data.created_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Absence From:</Text>
            <Text style={styles.value}>{formatDate(data.date_from)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Absence To:</Text>
            <Text style={styles.value}>{formatDate(data.date_to)}</Text>
          </View>
          {data.work_capacity && (
            <View style={styles.row}>
              <Text style={styles.label}>Work Capacity:</Text>
              <Text style={styles.value}>{data.work_capacity}</Text>
            </View>
          )}
        </View>

        {/* Medical Statement */}
        <View style={styles.statement}>
          <Text style={styles.statementText}>{getStatementText(data, subtype)}</Text>
        </View>

        {/* Additional Clinical Notes */}
        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinical Notes</Text>
            <Text style={styles.value}>{data.notes}</Text>
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signature}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={styles.signatureImage} src={signatureUrl} />
          <Text style={styles.signatureName}>{data.doctor_name || "Dr Reabal Najjar"}</Text>
          <Text style={styles.signatureDetails}>
            Provider Number: {data.provider_number || "2426577L"}
          </Text>
          <Text style={styles.clinicInfo}>
            InstantMed Telehealth{"\n"}
            Registered Medical Practitioner{"\n"}
            support@instantmed.com.au
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.certId}>Certificate ID: {certId}</Text>
          <Text style={styles.certId}>{formatDate(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  )
}

export type MedCertPdfGenerationParams = {
  data: MedCertDraftData
  subtype?: string | null
  requestId: string
}

export type MedCertPdfGenerationResult = {
  buffer: Buffer
  certId: string
  size: number
}

/**
 * Generate a medical certificate PDF from draft data.
 * 
 * This is the consolidated factory that:
 * - Accepts MedCertDraftData (from doctor edits)
 * - Renders using @react-pdf/renderer (server-side)
 * - Includes branding assets (logo, signature)
 * - Returns Buffer for upload to Supabase Storage
 * - Has NO email logic (separation of concerns)
 * 
 * @throws Error if PDF generation fails
 */
export async function generateMedCertPdfFactory(
  params: MedCertPdfGenerationParams
): Promise<MedCertPdfGenerationResult> {
  const { data, subtype, requestId } = params
  const certId = `MC-${requestId.substring(0, 8).toUpperCase()}`
  const validatedSubtype = validateMedCertSubtype(subtype)

  logger.info(`[pdf-factory] Generating med cert PDF for request ${requestId}`, {
    certId,
    subtype: validatedSubtype,
    patientName: data.patient_name,
  })

  try {
    // Get absolute URLs for branding assets
    const logoUrl = getLogoUrl()
    const signatureUrl = getSignatureUrl()

    // Render PDF to buffer
    const pdfBuffer = await renderToBuffer(
      <MedCertDocument
        data={data}
        subtype={validatedSubtype}
        certId={certId}
        logoUrl={logoUrl}
        signatureUrl={signatureUrl}
      />
    )

    const buffer = Buffer.from(pdfBuffer)

    logger.info(`[pdf-factory] PDF generated successfully: ${certId} (${buffer.length} bytes)`)

    return {
      buffer,
      certId,
      size: buffer.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error(`[pdf-factory] PDF generation failed for ${requestId}`, {
      error: errorMessage,
      certId,
    })
    throw new Error(`PDF generation failed: ${errorMessage}`)
  }
}

/**
 * Validate and normalize medical certificate subtype
 */
export function validateMedCertSubtype(subtype: string | null | undefined): "work" | "uni" | "carer" {
  const validSubtypes = ["work", "uni", "carer"]
  const normalized = (subtype || "work").toLowerCase().trim()

  if (!validSubtypes.includes(normalized)) {
    logger.warn(`[pdf-factory] Invalid subtype "${subtype}", using "work" as default`)
    return "work"
  }

  return normalized as "work" | "uni" | "carer"
}
