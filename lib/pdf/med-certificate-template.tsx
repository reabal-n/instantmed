/**
 * Medical Certificate PDF Template
 * 
 * React-PDF component for rendering professional medical certificates.
 * A4 single-page layout with:
 * - InstantMed logo
 * - Patient details (name, DOB)
 * - Certificate period (from/to dates)
 * - Certificate type-specific text
 * - Doctor signature block
 * - Provider information
 * 
 * Note: ESLint jsx-a11y/alt-text disabled for React-PDF Image components
 * which don't support alt prop (not rendered to HTML).
 */

 

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import type { MedCertDraft } from "@/types/db"
import type { TemplateConfig } from "@/types/certificate-template"
import {
  getCertificateTextWithDefaults,
  textToParagraphs,
  SEAL_SIZE_VALUES,
  type CertificateTextType,
} from "@/lib/certificate-defaults"

// Professional color scheme
const colors = {
  primary: "#0F172A",      // Dark blue
  secondary: "#64748B",    // Gray-blue
  accent: "#06B6D4",       // Cyan
  border: "#E2E8F0",       // Light gray
  white: "#FFFFFF",
  text: "#1E293B",
  lightText: "#64748B",
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingRight: 50,
    paddingBottom: 50,
    paddingLeft: 50,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.4,
  },
  
  // Header
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  
  logo: {
    width: 60,
    height: 60,
  },
  
  headerText: {
    flex: 1,
    marginLeft: 20,
  },
  
  clinicName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 3,
  },
  
  clinicSubtitle: {
    fontSize: 9,
    color: colors.lightText,
  },
  
  // Title
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 25,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  
  // Content sections
  section: {
    marginBottom: 18,
  },
  
  sectionLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.secondary,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  
  sectionContent: {
    fontSize: 11,
    color: colors.text,
    marginBottom: 4,
  },
  
  // Patient info
  patientGrid: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 20,
  },
  
  patientField: {
    flex: 1,
  },
  
  patientLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.secondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  
  patientValue: {
    fontSize: 11,
    color: colors.text,
  },
  
  // Date range
  dateRange: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  dateField: {
    flex: 1,
  },
  
  dateLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.secondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  
  dateValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
  },
  
  // Statement
  statement: {
    marginTop: 15,
    marginBottom: 15,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  
  statementText: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 1.6,
    textAlign: "justify",
  },
  
  // Reason section
  reasonBox: {
    marginBottom: 15,
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FAFBFC",
  },
  
  reasonLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.secondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  
  reasonText: {
    fontSize: 10,
    color: colors.text,
    fontStyle: "italic",
  },
  
  // Signature block
  signatureBlock: {
    marginTop: 25,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  signatureImage: {
    width: 100,
    height: 40,
    marginBottom: 5,
  },
  
  doctorName: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 2,
  },
  
  doctorCredentials: {
    fontSize: 9,
    color: colors.lightText,
    marginBottom: 8,
  },
  
  providerInfo: {
    fontSize: 9,
    color: colors.lightText,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  // Footer
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: 8,
    color: colors.lightText,
    textAlign: "center",
  },
  
  // Spacer
  spacer: {
    marginBottom: 10,
  },
})

/**
 * Format date to Australian format (DD/MM/YYYY)
 */
function formatDate(date: string | null | undefined): string {
  if (!date) return ""
  try {
    const d = new Date(date)
    return d.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return date
  }
}

/**
 * Get statement text based on certificate type
 */
function getCertificateStatement(
  type: "work" | "uni" | "carer" | null | undefined,
  patientName: string | null | undefined,
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
  reason: string | null | undefined
): string {
  const name = patientName || "the patient"
  const from = formatDate(dateFrom)
  const to = formatDate(dateTo)
  const reasonText = reason || "a medical condition"

  const statements = {
    work: `This is to certify that ${name} has been examined by me and, in my professional opinion, the patient was/will be unfit for work from ${from} to ${to} due to ${reasonText}.`,
    uni: `This is to certify that ${name} has been examined by me and, in my professional opinion, the patient was/will be unfit to attend educational institutions or undertake formal studies from ${from} to ${to} due to ${reasonText}.`,
    carer: `This is to certify that ${name} requires leave from work to provide care for a family member due to ${reasonText}. This need for care is anticipated to continue from ${from} to ${to}.`,
  }

  return statements[type as keyof typeof statements] || statements.work
}

/**
 * Get certificate type title
 */
function getCertificateTitle(type: "work" | "uni" | "carer" | null | undefined): string {
  const titles = {
    work: "Medical Certificate - Work Absence",
    uni: "Medical Certificate - Educational Institution",
    carer: "Medical Certificate - Carer's Leave",
  }
  return titles[type as keyof typeof titles] || titles.work
}

/**
 * Medical Certificate PDF Component
 */
export function MedicalCertificateTemplate({
  draft,
  logoUrl,
  templateConfig,
  sealUrl,
}: {
  draft: MedCertDraft
  logoUrl: string
  templateConfig?: TemplateConfig
  sealUrl?: string
}) {
  const certificateType = draft.certificate_type || "work"
  
  // Get certificate text type
  const certTextType: CertificateTextType = certificateType === "uni" ? "study" : certificateType as CertificateTextType
  
  // Get custom text from template config, with defaults
  const customText = getCertificateTextWithDefaults(
    certTextType,
    templateConfig?.certificateText?.[certTextType]
  )
  
  // Use custom title or fall back to default
  const title = customText.title || getCertificateTitle(certificateType)
  
  // Use custom attestation or generate statement
  const statement = customText.attestation || getCertificateStatement(
    certificateType,
    draft.patient_full_name,
    draft.date_from,
    draft.date_to,
    draft.reason_summary
  )
  
  // Split statement into paragraphs
  const statementParagraphs = textToParagraphs(statement)
  
  // Seal configuration
  const sealConfig = templateConfig?.seal
  const showSeal = sealConfig?.show ?? true
  const sealSize = SEAL_SIZE_VALUES[sealConfig?.size ?? "sm"]

  return (
    <Document title={title} producer="InstantMed">
      <Page size="A4" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.clinicName}>{draft.provider_name}</Text>
            <Text style={styles.clinicSubtitle}>{draft.provider_address}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Patient Information</Text>
          <View style={styles.patientGrid}>
            <View style={styles.patientField}>
              <Text style={styles.patientLabel}>Name</Text>
              <Text style={styles.patientValue}>{draft.patient_full_name || "—"}</Text>
            </View>
            <View style={styles.patientField}>
              <Text style={styles.patientLabel}>Date of Birth</Text>
              <Text style={styles.patientValue}>{formatDate(draft.patient_dob) || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Certificate Period */}
        <View style={styles.dateRange}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Period From</Text>
            <Text style={styles.dateValue}>{formatDate(draft.date_from) || "—"}</Text>
          </View>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Period To</Text>
            <Text style={styles.dateValue}>{formatDate(draft.date_to) || "—"}</Text>
          </View>
        </View>

        {/* Reason Summary */}
        {draft.reason_summary && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason for Absence</Text>
            <Text style={styles.reasonText}>{draft.reason_summary}</Text>
          </View>
        )}

        {/* Medical Statement / Attestation */}
        <View style={styles.statement}>
          {statementParagraphs.map((paragraph, index) => (
            <Text key={index} style={index > 0 ? [styles.statementText, { marginTop: 8 }] : styles.statementText}>
              {paragraph}
            </Text>
          ))}
        </View>

        {/* Additional Notes */}
        {customText.notes && (
          <View style={styles.spacer}>
            <Text style={styles.sectionContent}>
              <Text style={{ fontWeight: "bold" }}>Notes: </Text>
              {customText.notes}
            </Text>
          </View>
        )}

        {/* Restrictions */}
        {customText.restrictions && (
          <View style={styles.spacer}>
            <Text style={[styles.sectionContent, { fontStyle: "italic" }]}>
              <Text style={{ fontWeight: "bold" }}>Restrictions: </Text>
              {customText.restrictions}
            </Text>
          </View>
        )}

        {/* Signature Block */}
        <View style={styles.signatureBlock}>
          {/* Signature Image */}
          {draft.signature_asset_url && (
            <Image src={draft.signature_asset_url} style={styles.signatureImage} />
          )}

          {/* Doctor Name and Credentials */}
          <Text style={styles.doctorName}>{draft.doctor_typed_name}</Text>
          <Text style={styles.doctorCredentials}>AHPRA Number: {draft.doctor_ahpra}</Text>

          {/* Provider Info */}
          <Text style={styles.providerInfo}>
            {draft.provider_name}
            {"\n"}
            {draft.provider_address}
          </Text>
        </View>

        {/* Seal */}
        {showSeal && sealUrl && (
          <View style={{ position: "absolute", bottom: 60, right: 50, opacity: 0.6 }}>
            <Image src={sealUrl} style={{ width: sealSize, height: sealSize }} />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This medical certificate is issued in accordance with Australian medical standards.</Text>
        </View>
      </Page>
    </Document>
  )
}
