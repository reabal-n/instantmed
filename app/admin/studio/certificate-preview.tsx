"use client"

import { useMemo } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { 
  TemplateConfig, 
  TemplateType,
  SealConfig,
  PreviewData,
} from "@/types/certificate-template"
import {
  MARGIN_VALUES,
  FONT_SIZE_VALUES,
  ACCENT_COLORS,
} from "@/types/certificate-template"
import {
  type CertificateTextConfig,
  SEAL_SIZE_VALUES,
  textToParagraphs,
} from "@/lib/certificate-defaults"

interface CertificatePreviewProps {
  config: TemplateConfig
  templateType: TemplateType
  certificateText?: CertificateTextConfig
  sealConfig?: SealConfig
}

// Sample data for preview
const SAMPLE_DATA: PreviewData = {
  patientName: "Sarah Johnson",
  patientDob: "1990-05-15",
  doctorName: "Dr. Michael Chen",
  doctorProviderNumber: "2468135ACT",
  doctorAhpra: "MED0001234567",
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  durationDays: 3,
  certificateNumber: "MC-2026-00001",
  issueDate: new Date().toISOString().split("T")[0],
  medicalStatement: "The above-named patient has presented with symptoms consistent with a minor illness and is unfit for work/study for the period specified above.",
  hasSignatureImage: true,
  employerName: "Acme Corporation",
}

const SAMPLE_CLINIC = {
  name: "InstantMed Telehealth",
  address: "Level 10, 123 Collins Street",
  suburb: "Melbourne",
  state: "VIC",
  postcode: "3000",
  abn: "64 694 559 334",
  phone: "1300 000 000",
  email: "support@instantmed.com.au",
}

export function CertificatePreview({ 
  config, 
  templateType, 
  certificateText,
  sealConfig,
}: CertificatePreviewProps) {
  const { layout, options } = config
  
  const margin = MARGIN_VALUES[layout.marginPreset]
  const fontSize = FONT_SIZE_VALUES[layout.fontSizePreset]
  const colors = ACCENT_COLORS[layout.accentColorPreset]
  
  // Use custom title if provided, otherwise fall back to default
  const certTitle = useMemo(() => {
    if (certificateText?.title) {
      return certificateText.title.toUpperCase()
    }
    switch (templateType) {
      case "med_cert_work":
        return "MEDICAL CERTIFICATE"
      case "med_cert_uni":
        return "MEDICAL CERTIFICATE"
      case "med_cert_carer":
        return "CARER'S CERTIFICATE"
      default:
        return "MEDICAL CERTIFICATE"
    }
  }, [templateType, certificateText?.title])

  // Use custom attestation if provided
  const attestationParagraphs = useMemo(() => {
    const text = certificateText?.attestation || SAMPLE_DATA.medicalStatement
    return textToParagraphs(text)
  }, [certificateText?.attestation])

  // Seal configuration
  const showSeal = sealConfig?.show ?? true
  const sealSize = SEAL_SIZE_VALUES[sealConfig?.size ?? "sm"]

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border">
      {/* A4 Preview (scaled down) */}
      <div 
        className="w-full aspect-[1/1.414] bg-white relative overflow-hidden"
        style={{ 
          padding: `${margin * 0.6}px`,
          fontSize: `${fontSize.base * 0.85}px`,
        }}
      >
        {/* Header */}
        <div 
          className={cn(
            "flex items-start gap-4 pb-4 border-b-2 mb-6",
            layout.headerStyle === "logo-center" && "flex-col items-center text-center"
          )}
          style={{ borderColor: colors.border }}
        >
          {layout.headerStyle !== "no-logo" && (
            <div 
              className={cn(
                "w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-lg",
                layout.headerStyle === "logo-center" && "mx-auto"
              )}
              style={{ backgroundColor: colors.primary }}
            >
              IM
            </div>
          )}
          <div className={cn(layout.headerStyle === "logo-center" && "text-center")}>
            <h2 
              className="font-bold"
              style={{ fontSize: `${fontSize.heading}px`, color: colors.primary }}
            >
              {SAMPLE_CLINIC.name}
            </h2>
            {options.showAddress && (
              <p className="text-gray-600 text-xs mt-1">
                {SAMPLE_CLINIC.address}, {SAMPLE_CLINIC.suburb} {SAMPLE_CLINIC.state} {SAMPLE_CLINIC.postcode}
              </p>
            )}
            <div className="flex gap-4 mt-1 text-xs text-gray-500">
              {options.showPhone && <span>Ph: {SAMPLE_CLINIC.phone}</span>}
              {options.showEmail && <span>{SAMPLE_CLINIC.email}</span>}
              {options.showAbn && <span>ABN: {SAMPLE_CLINIC.abn}</span>}
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 
          className="text-center font-bold tracking-wide mb-6"
          style={{ fontSize: `${fontSize.heading * 1.2}px`, color: colors.primary }}
        >
          {certTitle}
        </h1>

        {/* Certificate Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Certificate No:</span>
              <span className="ml-2 font-medium">{SAMPLE_DATA.certificateNumber}</span>
            </div>
            <div>
              <span className="text-gray-500">Issue Date:</span>
              <span className="ml-2 font-medium">{formatDate(SAMPLE_DATA.issueDate)}</span>
            </div>
          </div>

          {/* Patient Info */}
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${colors.primary}08` }}
          >
            <p className="text-xs text-gray-500 mb-1">Patient Name</p>
            <p className="font-semibold" style={{ color: colors.primary }}>
              {SAMPLE_DATA.patientName}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Date of Birth: {formatDate(SAMPLE_DATA.patientDob)}
            </p>
          </div>

          {/* Duration */}
          <div className="text-xs">
            <p className="text-gray-500 mb-1">Period of Absence</p>
            <p className="font-medium">
              {formatDate(SAMPLE_DATA.startDate)} to {formatDate(SAMPLE_DATA.endDate)}
              <span className="text-gray-500 ml-2">({SAMPLE_DATA.durationDays} days)</span>
            </p>
          </div>

          {/* Medical Statement / Attestation */}
          <div 
            className="p-3 rounded-lg border-l-4"
            style={{ 
              backgroundColor: `${colors.secondary}08`,
              borderColor: colors.secondary,
            }}
          >
            {attestationParagraphs.map((paragraph, index) => (
              <p key={index} className={cn("text-xs leading-relaxed", index > 0 && "mt-2")}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Additional Notes */}
          {certificateText?.notes && (
            <div className="text-xs text-gray-600 mt-2">
              <span className="font-medium">Notes: </span>
              {certificateText.notes}
            </div>
          )}

          {/* Restrictions */}
          {certificateText?.restrictions && (
            <div className="text-xs text-gray-600 mt-2 italic">
              <span className="font-medium">Restrictions: </span>
              {certificateText.restrictions}
            </div>
          )}

          {/* Doctor Details & Signature */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: colors.border }}>
            <div>
              <p className="font-semibold" style={{ color: colors.primary }}>
                {SAMPLE_DATA.doctorName}
              </p>
              <p className="text-xs text-gray-500">MBBS, FRACGP</p>
              <p className="text-xs text-gray-500 mt-1">
                Provider No: {SAMPLE_DATA.doctorProviderNumber}
              </p>
              <p className="text-xs text-gray-500">
                AHPRA: {SAMPLE_DATA.doctorAhpra}
              </p>
            </div>
            
            {/* Signature below doctor details */}
            <div className="mt-3">
              {options.signatureStyle === "image" ? (
                <div className="w-32 h-12 border-b-2 border-gray-400 flex items-end justify-start pb-1">
                  <span className="text-gray-400 italic text-xs">[Signature]</span>
                </div>
              ) : (
                <div>
                  <p className="font-medium italic" style={{ color: colors.primary }}>
                    {SAMPLE_DATA.doctorName}
                  </p>
                  <p className="text-xs text-gray-500">Electronically signed</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Disclaimer */}
          <div className="mt-4 pt-3 border-t border-dashed" style={{ borderColor: colors.border }}>
            <p className="text-[9px] text-gray-400 text-center">
              To verify this certificate, visit instantmed.com.au/verify and enter certificate number {SAMPLE_DATA.certificateNumber}
            </p>
          </div>
        </div>

        {/* Seal - bottom right */}
        {showSeal && (
          <div 
            className="absolute opacity-60"
            style={{ 
              bottom: 16,
              right: 16,
              width: sealSize * 0.6,
              height: sealSize * 0.6,
            }}
          >
            <Image
              src="/branding/seal.svg"
              alt="Certificate seal"
              width={sealSize}
              height={sealSize}
              className="w-full h-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
