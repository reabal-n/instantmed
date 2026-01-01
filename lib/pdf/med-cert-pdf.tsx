/**
 * Medical Certificate PDF Template (react-pdf version)
 * 
 * Uses @react-pdf/renderer for server-side PDF generation.
 * This creates a professional, AHPRA-compliant medical certificate.
 */

import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

// ============================================================================
// TYPES
// ============================================================================

export interface MedCertPdfData {
  // Certificate details
  certificateNumber: string
  certificateType: "work" | "study" | "carer"
  
  // Patient details
  patientName: string
  patientDob: string // YYYY-MM-DD
  
  // Dates
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  durationDays: number
  
  // Clinical
  symptomsSummary: string
  
  // Carer (optional)
  carerPersonName?: string
  carerRelationship?: string
  
  // Clinician
  clinicianName: string
  clinicianRegistration: string // AHPRA number
  
  // Generation metadata
  generatedAt: string // ISO timestamp
  watermark: string
}

// ============================================================================
// STYLES
// ============================================================================

const colors = {
  primary: "#00C9A7",
  primaryDark: "#00A087",
  text: "#1f2937",
  textLight: "#6b7280",
  border: "#e5e7eb",
  background: "#f9fafb",
  white: "#ffffff",
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 50,
    paddingBottom: 80,
    paddingHorizontal: 50,
    backgroundColor: colors.white,
  },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
  },
  logoSubtitle: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
  certNumber: {
    fontSize: 10,
    color: colors.textLight,
    textAlign: "right",
  },
  certNumberValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "right",
  },
  
  // Title
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: "center",
    marginBottom: 30,
  },
  
  // Content sections
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  
  // Row layout
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    width: "35%",
    fontSize: 10,
    color: colors.textLight,
  },
  value: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
  },
  
  // Statement box
  statementBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 20,
    marginBottom: 25,
  },
  statementText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 1.6,
    textAlign: "justify",
  },
  
  // Clinician signature area
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signatureBlock: {
    width: "45%",
  },
  signatureLabel: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    paddingBottom: 3,
    marginBottom: 4,
  },
  signatureValue: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "bold",
  },
  ahpraNumber: {
    fontSize: 10,
    color: colors.textLight,
  },
  
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
  },
  footerText: {
    fontSize: 8,
    color: colors.textLight,
    textAlign: "center",
    marginBottom: 4,
  },
  watermark: {
    fontSize: 8,
    color: colors.textLight,
    textAlign: "center",
    fontFamily: "Courier",
  },
  verifyText: {
    fontSize: 8,
    color: colors.primary,
    textAlign: "center",
    marginTop: 4,
  },
  
  // Disclaimer
  disclaimer: {
    fontSize: 8,
    color: colors.textLight,
    marginTop: 20,
    lineHeight: 1.4,
  },
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatDob(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getCertTypeLabel(type: "work" | "study" | "carer"): string {
  switch (type) {
    case "work":
      return "Work Absence"
    case "study":
      return "Study/Educational"
    case "carer":
      return "Carer's Leave"
    default:
      return "Medical"
  }
}

function getCertTypeStatement(data: MedCertPdfData): string {
  const { certificateType, patientName, startDate, endDate, durationDays, carerPersonName, carerRelationship } = data
  
  const dateRange = durationDays === 1 
    ? formatDate(startDate)
    : `${formatDate(startDate)} to ${formatDate(endDate)} (${durationDays} day${durationDays > 1 ? "s" : ""})`
  
  if (certificateType === "carer" && carerPersonName) {
    return `This is to certify that ${patientName} has attended a telehealth consultation and, in my professional medical opinion, was required to be absent from work or study on ${dateRange} to provide care for ${carerPersonName} (${carerRelationship || "family member"}).`
  }
  
  const purposeText = certificateType === "study" 
    ? "educational institution or place of study" 
    : "place of employment"
  
  return `This is to certify that ${patientName} has attended a telehealth consultation and, in my professional medical opinion, was unfit to attend their ${purposeText} on ${dateRange} due to a medical condition.`
}

// ============================================================================
// PDF DOCUMENT COMPONENT
// ============================================================================

export function MedCertPdfDocument({ data }: { data: MedCertPdfData }) {
  const certTypeLabel = getCertTypeLabel(data.certificateType)
  const statement = getCertTypeStatement(data)
  
  return (
    <Document
      title={`Medical Certificate - ${data.patientName}`}
      author="InstantMed"
      subject="Medical Certificate"
      keywords="medical certificate, doctor, telehealth"
      creator="InstantMed Platform"
      producer="InstantMed via @react-pdf/renderer"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>InstantMed</Text>
            <Text style={styles.logoSubtitle}>Telehealth Medical Certificates</Text>
          </View>
          <View>
            <Text style={styles.certNumber}>Certificate No.</Text>
            <Text style={styles.certNumberValue}>
              {data.certificateNumber}
            </Text>
          </View>
        </View>
        
        {/* Title */}
        <Text style={styles.title}>Medical Certificate</Text>
        <Text style={styles.subtitle}>{certTypeLabel}</Text>
        
        {/* Patient Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{data.patientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{formatDob(data.patientDob)}</Text>
          </View>
        </View>
        
        {/* Period of Absence */}
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
              {data.durationDays} day{data.durationDays > 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        
        {/* Carer Details (if applicable) */}
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
        
        {/* Medical Statement */}
        <View style={styles.statementBox}>
          <Text style={styles.statementText}>{statement}</Text>
        </View>
        
        {/* Symptoms (general) */}
        <View style={styles.row}>
          <Text style={styles.label}>Presenting Symptoms:</Text>
          <Text style={styles.value}>{data.symptomsSummary}</Text>
        </View>
        
        {/* Clinician Signature */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Issued by</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureValue}>{data.clinicianName}</Text>
              </View>
              <Text style={styles.ahpraNumber}>AHPRA: {data.clinicianRegistration}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Date of Issue</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureValue}>
                  {formatDate(data.generatedAt.split("T")[0])}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This certificate was issued following a telehealth consultation conducted in accordance with Medical Board of Australia guidelines. 
          The certificate is based on information provided by the patient and the medical practitioner&apos;s professional assessment. 
          This document is for medical purposes only and does not imply any other entitlements.
        </Text>
        
        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            InstantMed Pty Ltd | ABN 12 345 678 901 | support@instantmed.com.au
          </Text>
          <Text style={styles.watermark}>{data.watermark}</Text>
          <Text style={styles.verifyText}>
            Verify this certificate at instantmed.com.au/verify
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default MedCertPdfDocument
