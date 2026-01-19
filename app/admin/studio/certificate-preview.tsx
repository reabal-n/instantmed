"use client"

import { useMemo } from "react"
import { QRCodeSVG } from "qrcode.react"
import { cn } from "@/lib/utils"
import type { 
  TemplateConfig, 
  TemplateType,
  PreviewData,
} from "@/types/certificate-template"
import {
  MARGIN_VALUES,
  FONT_SIZE_VALUES,
  ACCENT_COLORS,
} from "@/types/certificate-template"

interface CertificatePreviewProps {
  config: TemplateConfig
  templateType: TemplateType
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
  abn: "12 345 678 901",
  phone: "1300 000 000",
  email: "support@instantmed.com.au",
}

export function CertificatePreview({ config, templateType }: CertificatePreviewProps) {
  const { layout, options } = config
  
  const margin = MARGIN_VALUES[layout.marginPreset]
  const fontSize = FONT_SIZE_VALUES[layout.fontSizePreset]
  const colors = ACCENT_COLORS[layout.accentColorPreset]
  
  const certTitle = useMemo(() => {
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
  }, [templateType])

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

          {/* Medical Statement */}
          <div 
            className="p-3 rounded-lg border-l-4"
            style={{ 
              backgroundColor: `${colors.secondary}08`,
              borderColor: colors.secondary,
            }}
          >
            <p className="text-xs leading-relaxed">{SAMPLE_DATA.medicalStatement}</p>
          </div>

          {/* Doctor Signature */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: colors.border }}>
            <div className="flex justify-between items-end">
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
              
              {options.signatureStyle === "image" ? (
                <div className="w-24 h-12 border-b-2 border-gray-400 flex items-end justify-center pb-1">
                  <span className="text-gray-400 italic text-xs">[Signature]</span>
                </div>
              ) : (
                <div className="text-right">
                  <p className="font-medium italic" style={{ color: colors.primary }}>
                    {SAMPLE_DATA.doctorName}
                  </p>
                  <p className="text-xs text-gray-500">Electronically signed</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification Block */}
        {options.showVerificationBlock && (
          <div 
            className="absolute bottom-4 right-4 flex items-center gap-3 p-3 rounded-lg"
            style={{ 
              backgroundColor: `${colors.primary}08`,
              border: `1px solid ${colors.border}`,
            }}
          >
            <QRCodeSVG 
              value={`https://instantmed.com.au/verify/${SAMPLE_DATA.certificateNumber}`}
              size={48}
              level="M"
              fgColor={colors.primary}
            />
            <div className="text-xs">
              <p className="font-medium" style={{ color: colors.primary }}>Verify Online</p>
              <p className="text-gray-500">instantmed.com.au/verify</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
