/**
 * Certificate Template Types
 * Config-driven, versioned template system for medical certificates
 */

// ============================================================================
// CLINIC IDENTITY
// ============================================================================

export interface ClinicIdentity {
  id: string
  clinic_name: string
  trading_name: string | null
  address_line_1: string
  address_line_2: string | null
  suburb: string
  state: "ACT" | "NSW" | "NT" | "QLD" | "SA" | "TAS" | "VIC" | "WA"
  postcode: string
  abn: string
  phone: string | null
  email: string | null
  logo_storage_path: string | null
  footer_disclaimer: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export type ClinicIdentityInput = Omit<
  ClinicIdentity,
  "id" | "is_active" | "created_at" | "updated_at" | "created_by" | "updated_by"
>

// ============================================================================
// TEMPLATE LAYOUT CONFIG
// ============================================================================

export type HeaderStyle = "logo-left" | "logo-center" | "no-logo"
export type MarginPreset = "S" | "M" | "L"
export type FontSizePreset = "S" | "M" | "L"
export type AccentColorPreset = "mono" | "slate" | "blue"
export type SignatureStyle = "image" | "typed"

export interface TemplateLayoutConfig {
  headerStyle: HeaderStyle
  marginPreset: MarginPreset
  fontSizePreset: FontSizePreset
  accentColorPreset: AccentColorPreset
}

export interface TemplateOptionsConfig {
  showVerificationBlock: boolean
  signatureStyle: SignatureStyle
  showAbn: boolean
  showPhone: boolean
  showEmail: boolean
  showAddress: boolean
}

export interface TemplateConfig {
  layout: TemplateLayoutConfig
  options: TemplateOptionsConfig
}

// ============================================================================
// CERTIFICATE TEMPLATE
// ============================================================================

export type TemplateType = "med_cert_work" | "med_cert_uni" | "med_cert_carer"

export interface CertificateTemplate {
  id: string
  template_type: TemplateType
  version: number
  name: string
  config: TemplateConfig
  is_active: boolean
  activated_at: string | null
  activated_by: string | null
  created_at: string
  created_by: string | null
}

export interface CertificateTemplateWithCreator extends CertificateTemplate {
  creator?: {
    full_name: string
  } | null
  activator?: {
    full_name: string
  } | null
}

// ============================================================================
// PREVIEW SCENARIOS
// ============================================================================

export interface PreviewScenario {
  id: string
  label: string
  description: string
  enabled: boolean
}

export interface PreviewData {
  patientName: string
  patientDob: string
  doctorName: string
  doctorProviderNumber: string
  doctorAhpra: string
  startDate: string
  endDate: string
  durationDays: number
  certificateNumber: string
  issueDate: string
  medicalStatement: string
  hasSignatureImage: boolean
  employerName?: string
}

export const DEFAULT_PREVIEW_SCENARIOS: PreviewScenario[] = [
  {
    id: "long-patient-name",
    label: "Long patient name",
    description: "Test with a very long patient name",
    enabled: false,
  },
  {
    id: "long-address",
    label: "Long address",
    description: "Test with long clinic address",
    enabled: false,
  },
  {
    id: "no-signature",
    label: "No signature image",
    description: "Test typed signature fallback",
    enabled: false,
  },
  {
    id: "multi-day",
    label: "Multi-day leave",
    description: "Test with 5+ day absence",
    enabled: false,
  },
  {
    id: "employer-present",
    label: "Employer name present",
    description: "Test with employer/institution name",
    enabled: false,
  },
]

// ============================================================================
// DEFAULT TEMPLATE CONFIG
// ============================================================================

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  layout: {
    headerStyle: "logo-left",
    marginPreset: "M",
    fontSizePreset: "M",
    accentColorPreset: "slate",
  },
  options: {
    showVerificationBlock: true,
    signatureStyle: "image",
    showAbn: true,
    showPhone: false,
    showEmail: true,
    showAddress: true,
  },
}

// ============================================================================
// MARGIN VALUES (in pixels for preview, points for PDF)
// ============================================================================

export const MARGIN_VALUES: Record<MarginPreset, number> = {
  S: 24,
  M: 40,
  L: 56,
}

export const FONT_SIZE_VALUES: Record<FontSizePreset, { base: number; heading: number; small: number }> = {
  S: { base: 10, heading: 14, small: 8 },
  M: { base: 11, heading: 16, small: 9 },
  L: { base: 12, heading: 18, small: 10 },
}

export const ACCENT_COLORS: Record<AccentColorPreset, { primary: string; secondary: string; border: string }> = {
  mono: { primary: "#000000", secondary: "#666666", border: "#cccccc" },
  slate: { primary: "#1e293b", secondary: "#475569", border: "#cbd5e1" },
  blue: { primary: "#1e40af", secondary: "#3b82f6", border: "#93c5fd" },
}
