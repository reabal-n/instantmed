/**
 * Medical Certificate PDF Template
 * 
 * React-PDF component for rendering professional medical certificates.
 * A4 single-page layout with refined, premium typography.
 * 
 * Design: Clean, authoritative, minimal. No color gradients.
 * Uses dark text with subtle blue accent for structure.
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

// Professional color scheme - refined
const colors = {
  primary: "#111827",       // Near black
  secondary: "#6B7280",    // Gray
  accent: "#2563EB",       // Blue
  accentLight: "#EFF6FF",  // Light blue bg
  border: "#E5E7EB",       // Light gray border
  borderDark: "#D1D5DB",   // Medium border
  white: "#FFFFFF",
  text: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  surface: "#F9FAFB",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingRight: 56,
    paddingBottom: 56,
    paddingLeft: 56,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.5,
  },
  
  // Header
  header: {
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  
  logo: {
    width: 48,
    height: 48,
  },
  
  headerText: {
    flex: 1,
    marginLeft: 16,
  },
  
  clinicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  
  clinicSubtitle: {
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  
  // Title
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 24,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  
  // Content sections
  section: {
    marginBottom: 16,
  },
  
  sectionLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  
  sectionContent: {
    fontSize: 10,
    color: colors.text,
    marginBottom: 4,
  },
  
  // Patient info
  patientGrid: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 24,
  },
  
  patientField: {
    flex: 1,
  },
  
  patientLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  
  patientValue: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "bold",
  },
  
  // Date range
  dateRange: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  dateField: {
    flex: 1,
  },
  
  dateLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  
  dateValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
  },
  
  // Statement
  statement: {
    marginTop: 12,
    marginBottom: 16,
    paddingTop: 14,
    paddingRight: 16,
    paddingBottom: 14,
    paddingLeft: 16,
    backgroundColor: colors.surface,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
  },
  
  statementText: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.7,
    textAlign: "justify",
  },
  
  // Reason section
  reasonBox: {
    marginBottom: 12,
    paddingTop: 10,
    paddingRight: 14,
    paddingBottom: 10,
    paddingLeft: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  
  reasonLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  
  reasonText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  
  // Signature block
  signatureBlock: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  signatureImage: {
    width: 100,
    height: 40,
    marginBottom: 6,
  },
  
  doctorName: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 2,
  },
  
  doctorCredentials: {
    fontSize: 8,
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  
  providerInfo: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    lineHeight: 1.6,
  },
  
  // Footer
  footer: {
    marginTop: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: 7,
    color: colors.textMuted,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  
  spacer: {
    marginBottom: 10,
  },
})

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

function getCertificateTitle(type: "work" | "uni" | "carer" | null | undefined): string {
  const titles = {
    work: "Medical Certificate",
    uni: "Medical Certificate",
    carer: "Medical Certificate",
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
  
  const certTextType: CertificateTextType = certificateType === "uni" ? "study" : certificateType as CertificateTextType
  
  const customText = getCertificateTextWithDefaults(
    certTextType,
    templateConfig?.certificateText?.[certTextType]
  )
  
  const title = customText.title || getCertificateTitle(certificateType)
  
  const statement = customText.attestation || getCertificateStatement(
    certificateType,
    draft.patient_full_name,
    draft.date_from,
    draft.date_to,
    draft.reason_summary
  )
  
  const statementParagraphs = textToParagraphs(statement)
  
  const sealConfig = templateConfig?.seal
  const showSeal = sealConfig?.show ?? true
  const sealSize = SEAL_SIZE_VALUES[sealConfig?.size ?? "sm"]

  // Certificate type subtitle
  const typeSubtitles = {
    work: "Work Absence",
    uni: "Educational Institution",
    carer: "Carer's Leave",
  }
  const subtitle = typeSubtitles[certificateType as keyof typeof typeSubtitles] || "Work Absence"

  return (
    <Document title={title} producer="InstantMed">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.clinicName}>{draft.provider_name}</Text>
            <Text style={styles.clinicSubtitle}>{draft.provider_address}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>
        <Text style={{
          fontSize: 9,
          color: colors.textMuted,
          textAlign: "center",
          marginTop: -18,
          marginBottom: 24,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}>
          {subtitle}
        </Text>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Patient Information</Text>
          <View style={styles.patientGrid}>
            <View style={styles.patientField}>
              <Text style={styles.patientLabel}>Full Name</Text>
              <Text style={styles.patientValue}>{draft.patient_full_name || "\u2014"}</Text>
            </View>
            <View style={styles.patientField}>
              <Text style={styles.patientLabel}>Date of Birth</Text>
              <Text style={styles.patientValue}>{formatDate(draft.patient_dob) || "\u2014"}</Text>
            </View>
          </View>
        </View>

        {/* Certificate Period */}
        <View style={styles.dateRange}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Period From</Text>
            <Text style={styles.dateValue}>{formatDate(draft.date_from) || "\u2014"}</Text>
          </View>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Period To</Text>
            <Text style={styles.dateValue}>{formatDate(draft.date_to) || "\u2014"}</Text>
          </View>
        </View>

        {/* Reason Summary */}
        {draft.reason_summary && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason for Absence</Text>
            <Text style={styles.reasonText}>{draft.reason_summary}</Text>
          </View>
        )}

        {/* Medical Statement */}
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
          {draft.signature_asset_url && (
            <Image src={draft.signature_asset_url} style={styles.signatureImage} />
          )}
          <Text style={styles.doctorName}>{draft.doctor_typed_name}</Text>
          <Text style={styles.doctorCredentials}>AHPRA: {draft.doctor_ahpra}</Text>
          <Text style={styles.providerInfo}>
            {draft.provider_name}
            {"\n"}
            {draft.provider_address}
          </Text>
        </View>

        {/* Seal */}
        {showSeal && sealUrl && (
          <View style={{ position: "absolute", bottom: 60, right: 56, opacity: 0.5 }}>
            <Image src={sealUrl} style={{ width: sealSize, height: sealSize }} />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This medical certificate is issued in accordance with Australian medical standards.</Text>
          <Text style={{ marginTop: 3 }}>Generated by InstantMed Telehealth Services</Text>
        </View>
      </Page>
    </Document>
  )
}
