import "server-only"
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { MedCertDraftData } from "../../types/db"

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#00E2B5",
    borderBottomStyle: "solid",
    paddingBottom: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 5,
  },
  tagline: {
    fontSize: 10,
    color: "#64748B",
  },
  title: {
    fontSize: 18,
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
    borderBottomStyle: "solid",
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
  },
  statementText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: "#334155",
  },
  signature: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderTopStyle: "solid",
    paddingTop: 15,
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
  certId: {
    position: "absolute",
    bottom: 30,
    right: 50,
    fontSize: 8,
    color: "#94A3B8",
  },
  clinicInfo: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 10,
  },
})

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
  try {
    return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
  } catch {
    return dateStr
  }
}

// Get certificate title based on subtype
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

// Get statement text based on subtype
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

// Medical Certificate PDF Document
function MedCertDocument({ data, subtype, certId }: { data: MedCertDraftData; subtype: string; certId: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>InstantMed</Text>
          <Text style={styles.tagline}>Telehealth Medical Services • Australia</Text>
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
            <Text style={styles.label}>Period From:</Text>
            <Text style={styles.value}>{formatDate(data.date_from)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Period To:</Text>
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

        {/* Additional Notes */}
        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.value}>{data.notes}</Text>
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signature}>
          <Text style={styles.signatureName}>{data.doctor_name || "Dr Reabal Najjar"}</Text>
          <Text style={styles.signatureDetails}>Provider Number: {data.provider_number || "2426577L"}</Text>
          <Text style={styles.clinicInfo}>
            InstantMed • Telehealth Medical Services{"\n"}
            support@instantmed.com.au • instantmed.com.au
          </Text>
        </View>

        {/* Certificate ID */}
        <Text style={styles.certId}>Certificate ID: {certId}</Text>
      </Page>
    </Document>
  )
}

/**
 * Generate a medical certificate PDF from draft data.
 * Returns a Buffer containing the PDF data.
 */
export async function generateMedCertPdf(
  data: MedCertDraftData,
  subtype: string | null | undefined,
  requestId: string
): Promise<Buffer> {
  const validatedSubtype = (subtype || "work").toLowerCase()
  const certId = `MC-${requestId.substring(0, 8).toUpperCase()}`

  try {
    const pdfBuffer = await renderToBuffer(
      <MedCertDocument data={data} subtype={validatedSubtype} certId={certId} />
    )

    return Buffer.from(pdfBuffer)
  } catch (error) {
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Validate that a subtype string is a valid medical certificate subtype
 */
export function validateMedCertSubtype(subtype: string | null | undefined): "work" | "uni" | "carer" {
  const validSubtypes = ["work", "uni", "carer"]
  const normalizedSubtype = (subtype || "work").toLowerCase()
  
  if (!validSubtypes.includes(normalizedSubtype)) {
    return "work"
  }
  
  return normalizedSubtype as "work" | "uni" | "carer"
}
