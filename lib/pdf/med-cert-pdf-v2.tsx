/**
 * Medical Certificate PDF Template V2 (Config-driven)
 * 
 * Formal, official layout following template configuration.
 * Uses @react-pdf/renderer for server-side PDF generation.
 * 
 * Design principles:
 * - Clean typography, consistent alignment, predictable spacing
 * - No gradients, no rounded corners, no fancy elements
 * - Professional, AHPRA-compliant medical certificate
 */

import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer"
import type {
  TemplateConfig,
  ClinicIdentity,
  MarginPreset,
  FontSizePreset,
  AccentColorPreset,
  CertTextType,
} from "@/types/certificate-template"
import {
  getCertificateTextWithDefaults,
  textToParagraphs,
  SEAL_SIZE_VALUES,
} from "@/lib/certificate-defaults"

// ============================================================================
// TYPES
// ============================================================================

export interface MedCertPdfDataV2 {
  // Certificate details
  certificateNumber: string
  verificationCode: string
  certificateType: "work" | "study" | "carer"
  
  // Patient details
  patientName: string
  patientDob: string | null // YYYY-MM-DD, null if not to be shown
  
  // Dates
  issueDate: string // YYYY-MM-DD
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  durationDays: number
  
  // Carer specific (optional)
  carerPersonName?: string
  carerRelationship?: string
  
  // Doctor identity
  doctorName: string
  doctorNominals: string | null
  doctorProviderNumber: string
  doctorAhpraNumber: string
  doctorSignatureUrl: string | null
  
  // Generation metadata
  generatedAt: string // ISO timestamp
}

export interface MedCertPdfRenderOptions {
  data: MedCertPdfDataV2
  clinicIdentity: ClinicIdentity
  templateConfig: TemplateConfig
  logoUrl?: string | null
  sealUrl?: string | null
}

// ============================================================================
// STYLE CONSTANTS
// ============================================================================

const MARGIN_VALUES: Record<MarginPreset, number> = {
  S: 36,  // 0.5 inch
  M: 50,  // ~0.7 inch
  L: 72,  // 1 inch
}

const FONT_SIZE_VALUES: Record<FontSizePreset, { 
  base: number
  heading: number
  title: number
  small: number
  tiny: number 
}> = {
  S: { base: 10, heading: 12, title: 16, small: 8, tiny: 7 },
  M: { base: 11, heading: 13, title: 18, small: 9, tiny: 8 },
  L: { base: 12, heading: 14, title: 20, small: 10, tiny: 9 },
}

const ACCENT_COLORS: Record<AccentColorPreset, { 
  primary: string
  secondary: string
  border: string
  muted: string
}> = {
  mono: { primary: "#000000", secondary: "#333333", border: "#999999", muted: "#666666" },
  slate: { primary: "#1e293b", secondary: "#334155", border: "#94a3b8", muted: "#64748b" },
  blue: { primary: "#1e3a5f", secondary: "#2563eb", border: "#93c5fd", muted: "#6b7280" },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatDob(dateStr: string | null): string {
  if (!dateStr || dateStr.trim() === "") return "Not provided"
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "Not provided"
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  })
}

function getCertTypeLabel(type: "work" | "study" | "carer"): string {
  switch (type) {
    case "work": return "Work Absence Certificate"
    case "study": return "Educational Institution Certificate"
    case "carer": return "Carer's Leave Certificate"
    default: return "Medical Certificate"
  }
}

function getGenericStatement(data: MedCertPdfDataV2): string {
  const { certificateType, patientName, startDate, endDate, durationDays, carerPersonName, carerRelationship } = data
  
  const dateRange = durationDays === 1 
    ? `on ${formatDate(startDate)}`
    : `from ${formatDate(startDate)} to ${formatDate(endDate)} inclusive (${durationDays} days)`
  
  if (certificateType === "carer" && carerPersonName) {
    const relationship = carerRelationship || "family member"
    return `This is to certify that ${patientName} attended a telehealth medical consultation and was assessed as needing to be absent from their usual duties ${dateRange} to provide care for ${carerPersonName} (${relationship}).`
  }
  
  const dutyType = certificateType === "study" 
    ? "educational or study commitments" 
    : "usual work duties"
  
  return `This is to certify that ${patientName} attended a telehealth medical consultation and was assessed as unfit to attend their ${dutyType} ${dateRange} due to a medical condition.`
}

// ============================================================================
// PDF DOCUMENT COMPONENT
// ============================================================================

export function MedCertPdfDocumentV2({ 
  data, 
  clinicIdentity, 
  templateConfig,
  logoUrl,
  sealUrl,
}: MedCertPdfRenderOptions) {
  const { layout, options } = templateConfig
  
  // Resolve style values from config
  const margin = MARGIN_VALUES[layout.marginPreset]
  const fontSize = FONT_SIZE_VALUES[layout.fontSizePreset]
  const colors = ACCENT_COLORS[layout.accentColorPreset]
  
  // Build clinic display name
  const clinicDisplayName = clinicIdentity.trading_name || clinicIdentity.clinic_name
  
  // Build clinic address string
  const clinicAddress = [
    clinicIdentity.address_line_1,
    clinicIdentity.address_line_2,
    `${clinicIdentity.suburb}, ${clinicIdentity.state} ${clinicIdentity.postcode}`,
  ].filter(Boolean).join(", ")
  
  // Build doctor display name with nominals
  const doctorDisplayName = data.doctorNominals 
    ? `${data.doctorName}, ${data.doctorNominals}`
    : data.doctorName
  
  // Get certificate text type from data.certificateType
  const certTextType: CertTextType = data.certificateType === "study" ? "study" : data.certificateType
  
  // Get custom text from templateConfig, with defaults fallback
  const customText = getCertificateTextWithDefaults(
    certTextType,
    templateConfig.certificateText?.[certTextType]
  )
  
  // Use custom title or fall back to generic
  const certTitle = customText.title || "Medical Certificate"
  const certTypeLabel = getCertTypeLabel(data.certificateType)
  
  // Use custom attestation or generate generic statement
  const attestationText = customText.attestation || getGenericStatement(data)
  const attestationParagraphs = textToParagraphs(attestationText)
  
  // Seal configuration
  const sealConfig = templateConfig.seal
  const showSeal = sealConfig?.show ?? true
  const sealSize = SEAL_SIZE_VALUES[sealConfig?.size ?? "sm"]
  
  // Dynamic styles based on config
  const styles = StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: fontSize.base,
      paddingTop: margin,
      paddingBottom: margin + 60, // Extra space for footer
      paddingHorizontal: margin,
      backgroundColor: "#ffffff",
      color: colors.primary,
    },
    
    // Header styles
    header: {
      marginBottom: 24,
      paddingBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: colors.border,
    },
    headerLogoLeft: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headerLogoCenter: {
      alignItems: "center",
    },
    headerNoLogo: {
      alignItems: "center",
    },
    logo: {
      width: 100,
      height: 40,
      objectFit: "contain",
    },
    clinicBlock: {
      maxWidth: 250,
    },
    clinicBlockCenter: {
      alignItems: "center",
      textAlign: "center",
    },
    clinicName: {
      fontSize: fontSize.heading + 2,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 2,
    },
    clinicDetail: {
      fontSize: fontSize.small,
      color: colors.muted,
      lineHeight: 1.4,
    },
    
    // Title
    titleContainer: {
      marginVertical: 20,
      alignItems: "center",
    },
    title: {
      fontSize: fontSize.title,
      fontWeight: "bold",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 2,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: fontSize.base,
      color: colors.secondary,
    },
    
    // Sections
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: fontSize.heading,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    row: {
      flexDirection: "row",
      marginBottom: 4,
    },
    label: {
      width: 140,
      fontSize: fontSize.base,
      color: colors.muted,
    },
    value: {
      flex: 1,
      fontSize: fontSize.base,
      color: colors.primary,
      fontWeight: "bold",
    },
    
    // Statement box
    statementBox: {
      marginVertical: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: "#fafafa",
    },
    statementText: {
      fontSize: fontSize.base,
      color: colors.primary,
      lineHeight: 1.6,
      textAlign: "justify",
    },
    
    // Doctor block
    doctorSection: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    doctorRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    doctorBlock: {
      width: "48%",
    },
    signatureContainer: {
      height: 50,
      marginBottom: 8,
      justifyContent: "flex-end",
    },
    signatureImage: {
      width: 120,
      height: 40,
      objectFit: "contain",
    },
    signatureTyped: {
      fontSize: fontSize.small,
      color: colors.muted,
      fontStyle: "italic",
    },
    doctorName: {
      fontSize: fontSize.heading,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 2,
    },
    doctorDetail: {
      fontSize: fontSize.small,
      color: colors.muted,
      marginBottom: 1,
    },
    issueDateBlock: {
      alignItems: "flex-end",
    },
    issueDateLabel: {
      fontSize: fontSize.small,
      color: colors.muted,
      marginBottom: 2,
    },
    issueDateValue: {
      fontSize: fontSize.heading,
      fontWeight: "bold",
      color: colors.primary,
    },
    
    // Footer
    footer: {
      position: "absolute",
      bottom: margin,
      left: margin,
      right: margin,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    verificationBlock: {
      maxWidth: "60%",
    },
    verificationLabel: {
      fontSize: fontSize.tiny,
      color: colors.muted,
      marginBottom: 2,
    },
    verificationCode: {
      fontSize: fontSize.small,
      fontFamily: "Courier",
      color: colors.primary,
      fontWeight: "bold",
    },
    verificationUrl: {
      fontSize: fontSize.tiny,
      color: colors.secondary,
      marginTop: 2,
    },
    disclaimer: {
      fontSize: fontSize.tiny,
      color: colors.muted,
      lineHeight: 1.4,
      textAlign: "center",
    },
  })
  
  return (
    <Document
      title={`Medical Certificate - ${data.patientName}`}
      author={clinicDisplayName}
      subject="Medical Certificate"
      creator={`${clinicDisplayName} via InstantMed`}
      producer="InstantMed (@react-pdf/renderer)"
    >
      <Page size="A4" style={styles.page}>
        {/* ================================================================ */}
        {/* HEADER */}
        {/* ================================================================ */}
        <View style={styles.header}>
          {layout.headerStyle === "logo-left" && (
            <View style={styles.headerLogoLeft}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                {logoUrl && (
                   
                  <Image src={logoUrl} style={[styles.logo, { marginRight: 12 }]} />
                )}
                <View style={styles.clinicBlock}>
                  <Text style={styles.clinicName}>{clinicDisplayName}</Text>
                  {options.showAddress && (
                    <Text style={styles.clinicDetail}>{clinicAddress}</Text>
                  )}
                  {options.showAbn && (
                    <Text style={styles.clinicDetail}>ABN: {clinicIdentity.abn}</Text>
                  )}
                  {(options.showPhone || options.showEmail) && (
                    <Text style={styles.clinicDetail}>
                      {[
                        options.showPhone && clinicIdentity.phone,
                        options.showEmail && clinicIdentity.email,
                      ].filter(Boolean).join(" | ")}
                    </Text>
                  )}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.clinicDetail, { marginBottom: 2 }]}>Certificate No.</Text>
                <Text style={[styles.doctorName, { fontSize: fontSize.small }]}>
                  {data.certificateNumber}
                </Text>
              </View>
            </View>
          )}
          
          {layout.headerStyle === "logo-center" && (
            <View style={styles.headerLogoCenter}>
              {logoUrl && (
                 
                <Image src={logoUrl} style={[styles.logo, { marginBottom: 8 }]} />
              )}
              <View style={styles.clinicBlockCenter}>
                <Text style={styles.clinicName}>{clinicDisplayName}</Text>
                {options.showAddress && (
                  <Text style={styles.clinicDetail}>{clinicAddress}</Text>
                )}
                {options.showAbn && (
                  <Text style={styles.clinicDetail}>ABN: {clinicIdentity.abn}</Text>
                )}
                {(options.showPhone || options.showEmail) && (
                  <Text style={styles.clinicDetail}>
                    {[
                      options.showPhone && clinicIdentity.phone,
                      options.showEmail && clinicIdentity.email,
                    ].filter(Boolean).join(" | ")}
                  </Text>
                )}
                <Text style={[styles.clinicDetail, { marginTop: 8 }]}>
                  Certificate No. {data.certificateNumber}
                </Text>
              </View>
            </View>
          )}
          
          {layout.headerStyle === "no-logo" && (
            <View style={styles.headerNoLogo}>
              <View style={styles.clinicBlockCenter}>
                <Text style={styles.clinicName}>{clinicDisplayName}</Text>
                {options.showAddress && (
                  <Text style={styles.clinicDetail}>{clinicAddress}</Text>
                )}
                {options.showAbn && (
                  <Text style={styles.clinicDetail}>ABN: {clinicIdentity.abn}</Text>
                )}
                {(options.showPhone || options.showEmail) && (
                  <Text style={styles.clinicDetail}>
                    {[
                      options.showPhone && clinicIdentity.phone,
                      options.showEmail && clinicIdentity.email,
                    ].filter(Boolean).join(" | ")}
                  </Text>
                )}
                <Text style={[styles.clinicDetail, { marginTop: 8 }]}>
                  Certificate No. {data.certificateNumber}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {/* ================================================================ */}
        {/* TITLE */}
        {/* ================================================================ */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{certTitle}</Text>
          <Text style={styles.subtitle}>{certTypeLabel}</Text>
        </View>
        
        {/* ================================================================ */}
        {/* PATIENT DETAILS */}
        {/* ================================================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{data.patientName}</Text>
          </View>
          {data.patientDob && (
            <View style={styles.row}>
              <Text style={styles.label}>Date of Birth:</Text>
              <Text style={styles.value}>{formatDob(data.patientDob)}</Text>
            </View>
          )}
        </View>
        
        {/* ================================================================ */}
        {/* PERIOD OF ABSENCE */}
        {/* ================================================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Period of Absence</Text>
          <View style={styles.row}>
            <Text style={styles.label}>From:</Text>
            <Text style={styles.value}>{formatDate(data.startDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>To:</Text>
            <Text style={styles.value}>{formatDate(data.endDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Duration:</Text>
            <Text style={styles.value}>
              {data.durationDays} day{data.durationDays !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        
        {/* ================================================================ */}
        {/* CARER DETAILS (if applicable) */}
        {/* ================================================================ */}
        {data.certificateType === "carer" && data.carerPersonName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Person Requiring Care</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{data.carerPersonName}</Text>
            </View>
            {data.carerRelationship && (
              <View style={styles.row}>
                <Text style={styles.label}>Relationship:</Text>
                <Text style={styles.value}>{data.carerRelationship}</Text>
              </View>
            )}
          </View>
        )}
        
        {/* ================================================================ */}
        {/* MEDICAL STATEMENT / ATTESTATION */}
        {/* ================================================================ */}
        <View style={styles.statementBox}>
          {attestationParagraphs.map((paragraph, index) => (
            <Text 
              key={index} 
              style={index > 0 ? [styles.statementText, { marginTop: 8 }] : styles.statementText}
            >
              {paragraph}
            </Text>
          ))}
        </View>

        {/* Additional Notes */}
        {customText.notes && (
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.statementText, { fontSize: fontSize.small }]}>
              <Text style={{ fontWeight: "bold" }}>Notes: </Text>
              {customText.notes}
            </Text>
          </View>
        )}

        {/* Restrictions */}
        {customText.restrictions && (
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.statementText, { fontSize: fontSize.small, fontStyle: "italic" }]}>
              <Text style={{ fontWeight: "bold" }}>Restrictions: </Text>
              {customText.restrictions}
            </Text>
          </View>
        )}
        
        {/* ================================================================ */}
        {/* DOCTOR BLOCK */}
        {/* ================================================================ */}
        <View style={styles.doctorSection}>
          <View style={styles.doctorRow}>
            <View style={styles.doctorBlock}>
              {/* Signature */}
              <View style={styles.signatureContainer}>
                {options.signatureStyle === "image" && data.doctorSignatureUrl ? (
                   
                  <Image src={data.doctorSignatureUrl} style={styles.signatureImage} />
                ) : (
                  <Text style={styles.signatureTyped}>Electronically signed</Text>
                )}
              </View>
              
              {/* Doctor details */}
              <Text style={styles.doctorName}>{doctorDisplayName}</Text>
              <Text style={styles.doctorDetail}>
                Provider No: {data.doctorProviderNumber}
              </Text>
              <Text style={styles.doctorDetail}>
                AHPRA: {data.doctorAhpraNumber}
              </Text>
              {options.signatureStyle !== "image" || !data.doctorSignatureUrl ? (
                <Text style={[styles.doctorDetail, { marginTop: 4 }]}>
                  Signed: {formatTimestamp(data.generatedAt)}
                </Text>
              ) : null}
            </View>
            
            <View style={[styles.doctorBlock, styles.issueDateBlock]}>
              <Text style={styles.issueDateLabel}>Date of Issue</Text>
              <Text style={styles.issueDateValue}>{formatDate(data.issueDate)}</Text>
            </View>
          </View>
        </View>
        
        {/* ================================================================ */}
        {/* SEAL */}
        {/* ================================================================ */}
        {showSeal && sealUrl && (
          <View style={{ position: "absolute", bottom: margin + 70, right: margin, opacity: 0.6 }}>
            <Image src={sealUrl} style={{ width: sealSize, height: sealSize }} />
          </View>
        )}

        {/* ================================================================ */}
        {/* FOOTER */}
        {/* ================================================================ */}
        <View style={styles.footer} fixed>
          {options.showVerificationBlock && (
            <View style={styles.verificationBlock}>
              <Text style={styles.verificationLabel}>Verification Code</Text>
              <Text style={styles.verificationCode}>{data.verificationCode}</Text>
              <Text style={styles.verificationUrl}>
                Verify at: instantmed.com.au/verify
              </Text>
            </View>
          )}
          
          {clinicIdentity.footer_disclaimer && (
            <Text style={styles.disclaimer}>
              {clinicIdentity.footer_disclaimer}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  )
}

export default MedCertPdfDocumentV2
