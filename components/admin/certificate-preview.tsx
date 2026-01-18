"use client"

import { useMemo } from "react"
import type {
  ClinicIdentity,
  TemplateConfig,
  PreviewData,
} from "@/types/certificate-template"

// Import constants directly to avoid type issues
const MARGIN_VALUES_MAP = {
  S: 24,
  M: 40,
  L: 56,
}

const FONT_SIZE_VALUES_MAP = {
  S: { base: 10, heading: 14, small: 8 },
  M: { base: 11, heading: 16, small: 9 },
  L: { base: 12, heading: 18, small: 10 },
}

const ACCENT_COLORS_MAP = {
  mono: { primary: "#000000", secondary: "#666666", border: "#cccccc" },
  slate: { primary: "#1e293b", secondary: "#475569", border: "#cbd5e1" },
  blue: { primary: "#1e40af", secondary: "#3b82f6", border: "#93c5fd" },
}

interface CertificatePreviewProps {
  clinicIdentity: ClinicIdentity | null
  config: TemplateConfig
  previewData: PreviewData
  className?: string
}

export function CertificatePreview({
  clinicIdentity,
  config,
  previewData,
  className = "",
}: CertificatePreviewProps) {
  const styles = useMemo(() => {
    const margin = MARGIN_VALUES_MAP[config.layout.marginPreset]
    const fontSize = FONT_SIZE_VALUES_MAP[config.layout.fontSizePreset]
    const colors = ACCENT_COLORS_MAP[config.layout.accentColorPreset]

    return {
      margin,
      fontSize,
      colors,
    }
  }, [config.layout])

  const clinic = clinicIdentity || {
    clinic_name: "InstantMed Pty Ltd",
    trading_name: "InstantMed",
    address_line_1: "Level 1, 123 Collins Street",
    address_line_2: null,
    suburb: "Melbourne",
    state: "VIC",
    postcode: "3000",
    abn: "00 000 000 000",
    phone: null,
    email: "support@instantmed.com.au",
    footer_disclaimer: "This medical certificate was issued via InstantMed telehealth services.",
    logo_storage_path: null,
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className={`bg-white shadow-lg ${className}`}>
      {/* A4 aspect ratio container (210mm × 297mm ≈ 1:1.414) */}
      <div
        className="relative bg-white"
        style={{
          aspectRatio: "210 / 297",
          padding: styles.margin,
          fontFamily: "serif",
          fontSize: styles.fontSize.base,
          color: styles.colors.primary,
        }}
      >
        {/* Header */}
        <header
          className="pb-4 mb-6"
          style={{
            borderBottom: `2px solid ${styles.colors.border}`,
          }}
        >
          <div
            className={`flex items-start gap-4 ${
              config.layout.headerStyle === "logo-center"
                ? "flex-col items-center text-center"
                : config.layout.headerStyle === "no-logo"
                ? "justify-center text-center"
                : "justify-between"
            }`}
          >
            {/* Logo */}
            {config.layout.headerStyle !== "no-logo" && (
              <div
                className={`shrink-0 ${
                  config.layout.headerStyle === "logo-center" ? "mb-2" : ""
                }`}
              >
                <div
                  className="flex items-center justify-center bg-gray-100 text-gray-400"
                  style={{
                    width: 80,
                    height: 40,
                    fontSize: 10,
                  }}
                >
                  {clinic.logo_storage_path ? "[LOGO]" : "LOGO"}
                </div>
              </div>
            )}

            {/* Clinic Details */}
            <div
              className={
                config.layout.headerStyle === "logo-left" ? "text-right" : ""
              }
            >
              <h1
                style={{
                  fontSize: styles.fontSize.heading,
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                {clinic.trading_name || clinic.clinic_name}
              </h1>
              {config.options.showAddress && (
                <p
                  style={{
                    fontSize: styles.fontSize.small,
                    color: styles.colors.secondary,
                    lineHeight: 1.4,
                  }}
                >
                  {clinic.address_line_1}
                  {clinic.address_line_2 && <>, {clinic.address_line_2}</>}
                  <br />
                  {clinic.suburb}, {clinic.state} {clinic.postcode}
                </p>
              )}
              {config.options.showAbn && (
                <p
                  style={{
                    fontSize: styles.fontSize.small,
                    color: styles.colors.secondary,
                  }}
                >
                  ABN: {clinic.abn}
                </p>
              )}
              {(config.options.showPhone || config.options.showEmail) && (
                <p
                  style={{
                    fontSize: styles.fontSize.small,
                    color: styles.colors.secondary,
                  }}
                >
                  {config.options.showPhone && clinic.phone && (
                    <span>{clinic.phone}</span>
                  )}
                  {config.options.showPhone &&
                    clinic.phone &&
                    config.options.showEmail &&
                    clinic.email && <span> • </span>}
                  {config.options.showEmail && clinic.email && (
                    <span>{clinic.email}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Title */}
        <h2
          className="text-center mb-6"
          style={{
            fontSize: styles.fontSize.heading + 4,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Medical Certificate
        </h2>

        {/* Patient Details */}
        <section className="mb-6">
          <h3
            className="mb-2"
            style={{
              fontSize: styles.fontSize.base + 1,
              fontWeight: 600,
              borderBottom: `1px solid ${styles.colors.border}`,
              paddingBottom: 4,
            }}
          >
            Patient Details
          </h3>
          <div className="grid grid-cols-2 gap-y-1">
            <div>
              <span style={{ color: styles.colors.secondary }}>Full Name:</span>
            </div>
            <div style={{ fontWeight: 500 }}>{previewData.patientName}</div>
            <div>
              <span style={{ color: styles.colors.secondary }}>
                Date of Birth:
              </span>
            </div>
            <div style={{ fontWeight: 500 }}>
              {formatDate(previewData.patientDob)}
            </div>
          </div>
        </section>

        {/* Certificate Details */}
        <section className="mb-6">
          <h3
            className="mb-2"
            style={{
              fontSize: styles.fontSize.base + 1,
              fontWeight: 600,
              borderBottom: `1px solid ${styles.colors.border}`,
              paddingBottom: 4,
            }}
          >
            Certificate Details
          </h3>
          <div className="grid grid-cols-2 gap-y-1">
            <div>
              <span style={{ color: styles.colors.secondary }}>
                Date Issued:
              </span>
            </div>
            <div style={{ fontWeight: 500 }}>
              {formatDate(previewData.issueDate)}
            </div>
            <div>
              <span style={{ color: styles.colors.secondary }}>
                Absence From:
              </span>
            </div>
            <div style={{ fontWeight: 500 }}>
              {formatDate(previewData.startDate)}
            </div>
            <div>
              <span style={{ color: styles.colors.secondary }}>
                Absence To:
              </span>
            </div>
            <div style={{ fontWeight: 500 }}>
              {formatDate(previewData.endDate)}
            </div>
            <div>
              <span style={{ color: styles.colors.secondary }}>Duration:</span>
            </div>
            <div style={{ fontWeight: 500 }}>
              {previewData.durationDays} day
              {previewData.durationDays !== 1 ? "s" : ""}
            </div>
          </div>
        </section>

        {/* Medical Statement */}
        <section className="mb-8">
          <h3
            className="mb-2"
            style={{
              fontSize: styles.fontSize.base + 1,
              fontWeight: 600,
              borderBottom: `1px solid ${styles.colors.border}`,
              paddingBottom: 4,
            }}
          >
            Medical Statement
          </h3>
          <p
            style={{
              lineHeight: 1.6,
              textAlign: "justify",
            }}
          >
            {previewData.medicalStatement}
          </p>
        </section>

        {/* Signature */}
        <section className="mb-6">
          {config.options.signatureStyle === "image" &&
          previewData.hasSignatureImage ? (
            <div className="mb-2">
              <div
                className="bg-gray-100 text-gray-400 flex items-center justify-center"
                style={{ width: 150, height: 50, fontSize: 10 }}
              >
                [SIGNATURE]
              </div>
            </div>
          ) : (
            <p
              className="italic mb-2"
              style={{ color: styles.colors.secondary }}
            >
              Electronically signed
            </p>
          )}
          <p style={{ fontWeight: 600 }}>{previewData.doctorName}</p>
          <p style={{ fontSize: styles.fontSize.small, color: styles.colors.secondary }}>
            Provider Number: {previewData.doctorProviderNumber}
          </p>
          <p style={{ fontSize: styles.fontSize.small, color: styles.colors.secondary }}>
            AHPRA: {previewData.doctorAhpra}
          </p>
        </section>

        {/* Footer */}
        <footer
          className="absolute bottom-0 left-0 right-0 pt-4"
          style={{
            padding: styles.margin,
            paddingTop: 16,
            borderTop: `1px solid ${styles.colors.border}`,
          }}
        >
          {config.options.showVerificationBlock && (
            <div className="flex justify-between items-end">
              <div>
                <p
                  style={{
                    fontSize: styles.fontSize.small,
                    color: styles.colors.secondary,
                  }}
                >
                  Certificate ID: {previewData.certificateNumber}
                </p>
                <p
                  style={{
                    fontSize: styles.fontSize.small,
                    color: styles.colors.secondary,
                  }}
                >
                  Verify at: instantmed.com.au/verify
                </p>
              </div>
              <div
                className="bg-gray-100 flex items-center justify-center"
                style={{ width: 60, height: 60, fontSize: 8 }}
              >
                [QR]
              </div>
            </div>
          )}
          {clinic.footer_disclaimer && (
            <p
              className="mt-3"
              style={{
                fontSize: styles.fontSize.small - 1,
                color: styles.colors.secondary,
                lineHeight: 1.4,
              }}
            >
              {clinic.footer_disclaimer}
            </p>
          )}
        </footer>
      </div>
    </div>
  )
}

// Generate preview data based on scenarios
export function generatePreviewData(scenarios: Record<string, boolean>): PreviewData {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 1)
  
  const daysOff = scenarios["multi-day"] ? 5 : 2
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + daysOff - 1)

  return {
    patientName: scenarios["long-patient-name"]
      ? "Alexandra Elizabeth Montgomery-Worthington III"
      : "John Smith",
    patientDob: "1990-05-15",
    doctorName: "Dr. Sarah Johnson",
    doctorProviderNumber: "2426577L",
    doctorAhpra: "MED0002576546",
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    durationDays: daysOff,
    certificateNumber: "MC-2025-A1B2C3D4",
    issueDate: today.toISOString().split("T")[0],
    medicalStatement:
      "This is to certify that the above-named patient attended a telehealth consultation and, in my professional medical opinion, was/is unfit for their usual work duties for the period specified above due to a medical condition.",
    hasSignatureImage: !scenarios["no-signature"],
    employerName: scenarios["employer-present"] ? "Acme Corporation Pty Ltd" : undefined,
  }
}
