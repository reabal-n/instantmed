import type { MedCertDraftData, PathologyDraftData } from "@/types/db"

/**
 * APITemplate.io integration for PDF generation
 */

interface APITemplateResponse {
  download_url?: string
  status?: string
  error?: string
  message?: string
}

type ValidMedCertSubtype = "work" | "uni" | "carer"
export type PathologySubtype = "pathology_bloods" | "pathology_imaging"

// Re-export for consumers
export type { PathologyDraftData }

/**
 * Get the correct template ID based on document type and subtype.
 * Throws an error if the env var is not configured for the given subtype.
 */
function getTemplateIdForSubtype(subtype: ValidMedCertSubtype): string {
  const templateMap: Record<ValidMedCertSubtype, string | undefined> = {
    work: process.env.APITEMPLATE_MEDCERT_WORK_TEMPLATE_ID,
    uni: process.env.APITEMPLATE_MEDCERT_UNI_TEMPLATE_ID,
    carer: process.env.APITEMPLATE_MEDCERT_CARER_TEMPLATE_ID,
  }

  const templateId = templateMap[subtype]

  if (!templateId) {
    const envVarName = `APITEMPLATE_MEDCERT_${subtype.toUpperCase()}_TEMPLATE_ID`
    throw new Error(`PDF template not configured for ${subtype} certificates. Missing: ${envVarName}`)
  }

  return templateId
}

/**
 * Validate that a subtype string is a valid medical certificate subtype
 */
function validateMedCertSubtype(subtype: string | null | undefined): ValidMedCertSubtype {
  const validSubtypes: ValidMedCertSubtype[] = ["work", "uni", "carer"]
  const normalizedSubtype = (subtype || "work").toLowerCase() as ValidMedCertSubtype

  if (!validSubtypes.includes(normalizedSubtype)) {
    return "work"
  }

  return normalizedSubtype
}

/**
 * Generate a medical certificate PDF from draft data using APITemplate.io
 * @param data - The certificate draft data
 * @param subtype - The certificate subtype: 'work' | 'uni' | 'carer'
 */
export async function generateMedCertPdfFromDraft(
  data: MedCertDraftData,
  subtype: string | null | undefined,
): Promise<string> {
  const apiKey = process.env.APITEMPLATE_API_KEY

  if (!apiKey) {
    throw new Error("PDF service is not configured. Please add APITEMPLATE_API_KEY to environment variables.")
  }

  const validatedSubtype = validateMedCertSubtype(subtype)
  const templateId = getTemplateIdForSubtype(validatedSubtype)

  // Format dates for display
  const formatDateForCert = (dateStr: string | null): string => {
    if (!dateStr) return new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    try {
      return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  const baseTemplateData = {
    // Patient details
    patient_name: data.patient_name || "Patient Name",
    patient_dob: formatDateForCert(data.dob),
    dob: formatDateForCert(data.dob),

    // Certificate details
    reason: data.reason || "Medical condition",
    condition: data.reason || "Medical condition",
    date_from: formatDateForCert(data.date_from),
    date_to: formatDateForCert(data.date_to),
    from_date: formatDateForCert(data.date_from),
    to_date: formatDateForCert(data.date_to),
    work_capacity: data.work_capacity || "Unable to work",
    capacity: data.work_capacity || "Unable to work",
    notes: data.notes || "",
    additional_notes: data.notes || "",

    // Doctor details
    doctor_name: data.doctor_name || "Dr Reabal Najjar",
    provider_number: data.provider_number || "2426577L",
    provider_no: data.provider_number || "2426577L",

    // Issue date
    created_date: formatDateForCert(data.created_date),
    issue_date: formatDateForCert(data.created_date),
    date_issued: formatDateForCert(data.created_date),

    // Clinic details (static)
    clinic_name: "InstantMed",
    clinic_address: "Telehealth Medical Services, Australia",
    clinic_phone: "1300 INSTMED",
    clinic_email: "support@instantmed.com.au",
    clinic_abn: "12 345 678 901",
  }

  const subtypeSpecificData: Record<string, unknown> = {
    certificate_type: validatedSubtype,
    cert_type: validatedSubtype,
  }

  if (validatedSubtype === "work") {
    subtypeSpecificData.cert_title = "Medical Certificate - Work Absence"
    subtypeSpecificData.absence_type = "work"
  } else if (validatedSubtype === "uni") {
    subtypeSpecificData.cert_title = "Medical Certificate - University/School"
    subtypeSpecificData.absence_type = "study"
    subtypeSpecificData.institution_type = "educational institution"
  } else if (validatedSubtype === "carer") {
    subtypeSpecificData.cert_title = "Medical Certificate - Carer's Leave"
    subtypeSpecificData.absence_type = "carer duties"
    subtypeSpecificData.care_recipient = "family member"
  }

  const templateData = {
    ...baseTemplateData,
    ...subtypeSpecificData,
  }

  try {
    // APITemplate.io API call
    const response = await fetch("https://rest.apitemplate.io/v2/create-pdf", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        export_type: "json",
        expiration: 60,
        data: templateData,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.message || errorJson.error || `API error: ${response.status}`)
      } catch {
        throw new Error(`PDF service error: ${response.status} ${response.statusText}`)
      }
    }

    const result: APITemplateResponse = await response.json()

    if (!result.download_url) {
      throw new Error(result.message || result.error || "Failed to generate PDF - no download URL returned")
    }

    return result.download_url
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`PDF generation failed: ${error.message}`)
    }
    throw new Error("PDF generation failed: Unknown error")
  }
}

/**
 * Test the APITemplate connection
 */
export async function testApiTemplateConnection(): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.APITEMPLATE_API_KEY

  if (!apiKey) {
    return { success: false, error: "API key not configured" }
  }

  try {
    const response = await fetch("https://rest.apitemplate.io/v2/list-templates", {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
      },
    })

    if (response.ok) {
      return { success: true }
    } else {
      const errorText = await response.text()
      return { success: false, error: `API returned ${response.status}: ${errorText}` }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Connection failed" }
  }
}

/**
 * Check which template IDs are configured
 */
export function getConfiguredTemplates(): { work: boolean; uni: boolean; carer: boolean } {
  return {
    work: !!process.env.APITEMPLATE_MEDCERT_WORK_TEMPLATE_ID,
    uni: !!process.env.APITEMPLATE_MEDCERT_UNI_TEMPLATE_ID,
    carer: !!process.env.APITEMPLATE_MEDCERT_CARER_TEMPLATE_ID,
  }
}

/**
 * Get the correct pathology template ID based on subtype.
 * Throws an error if the env var is not configured.
 */
function getPathologyTemplateIdForSubtype(subtype: PathologySubtype): string {
  const templateMap: Record<PathologySubtype, { envVar: string; value: string | undefined }> = {
    pathology_bloods: {
      envVar: "APITEMPLATE_PATHOLOGY_BLOODS_TEMPLATE_ID",
      value: process.env.APITEMPLATE_PATHOLOGY_BLOODS_TEMPLATE_ID,
    },
    pathology_imaging: {
      envVar: "APITEMPLATE_PATHOLOGY_IMAGING_TEMPLATE_ID",
      value: process.env.APITEMPLATE_PATHOLOGY_IMAGING_TEMPLATE_ID,
    },
  }

  const config = templateMap[subtype]

  if (!config) {
    throw new Error(`Unknown pathology subtype: ${subtype}. Expected 'pathology_bloods' or 'pathology_imaging'`)
  }

  if (!config.value) {
    throw new Error(`PDF template not configured for ${subtype}. Missing: ${config.envVar}`)
  }

  return config.value
}

/**
 * Validate pathology subtype string
 */
export function validatePathologySubtype(subtype: string | null | undefined): PathologySubtype {
  const validSubtypes: PathologySubtype[] = ["pathology_bloods", "pathology_imaging"]
  const normalizedSubtype = subtype as PathologySubtype

  if (!validSubtypes.includes(normalizedSubtype)) {
    return "pathology_imaging"
  }

  return normalizedSubtype
}

/**
 * Generate a pathology/imaging referral PDF from draft data using APITemplate.io
 * @param subtype - The referral subtype: 'pathology_bloods' | 'pathology_imaging'
 * @param data - The referral draft data
 */
export async function generatePathologyReferralPdfFromDraft(
  subtype: PathologySubtype,
  data: PathologyDraftData,
): Promise<string> {
  const apiKey = process.env.APITEMPLATE_API_KEY

  if (!apiKey) {
    throw new Error("PDF service is not configured. Please add APITEMPLATE_API_KEY to environment variables.")
  }

  const validatedSubtype = validatePathologySubtype(subtype)
  const templateId = getPathologyTemplateIdForSubtype(validatedSubtype)

  // Format dates for display
  const formatDateForReferral = (dateStr: string | null): string => {
    if (!dateStr) return new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    try {
      return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  const isBloodTest = validatedSubtype === "pathology_bloods"

  const templateData = {
    // Patient details
    patient_name: data.patient_name || "Patient Name",
    patient_dob: formatDateForReferral(data.dob),
    dob: formatDateForReferral(data.dob),
    medicare_number: data.medicare_number || "Not provided",
    medicare_no: data.medicare_number || "Not provided",

    // Referral details
    tests_requested: data.tests_requested || "As specified",
    requested_tests: data.tests_requested || "As specified",
    clinical_indication: data.clinical_indication || "As clinically indicated",
    indication: data.clinical_indication || "As clinically indicated",
    symptom_duration: data.symptom_duration || "Not specified",
    duration: data.symptom_duration || "Not specified",
    severity: data.severity || "Not specified",
    urgency: data.urgency || "Routine",
    previous_tests: data.previous_tests || "None noted",
    prior_tests: data.previous_tests || "None noted",

    // Doctor details
    doctor_name: data.doctor_name || "Dr Reabal Najjar",
    provider_number: data.provider_number || "2426577L",
    provider_no: data.provider_number || "2426577L",

    // Issue date
    created_date: formatDateForReferral(data.created_date),
    issue_date: formatDateForReferral(data.created_date),
    request_date: formatDateForReferral(data.created_date),

    // Referral type
    referral_type: isBloodTest ? "Pathology Request - Blood Tests" : "Imaging Request",
    form_type: isBloodTest ? "pathology" : "imaging",
    is_blood_test: isBloodTest,
    is_imaging: !isBloodTest,

    // Clinic details (static)
    clinic_name: "InstantMed",
    clinic_address: "Telehealth Medical Services, Australia",
    clinic_phone: "1300 INSTMED",
    clinic_email: "support@instantmed.com.au",
    clinic_abn: "12 345 678 901",
  }

  try {
    const response = await fetch("https://rest.apitemplate.io/v2/create-pdf", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        export_type: "json",
        expiration: 60,
        data: templateData,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.message || errorJson.error || `API error: ${response.status}`)
      } catch {
        throw new Error(`PDF service error: ${response.status} ${response.statusText}`)
      }
    }

    const result: { download_url?: string; status?: string; error?: string; message?: string } = await response.json()

    if (!result.download_url) {
      throw new Error(result.message || result.error || "Failed to generate PDF - no download URL returned")
    }

    return result.download_url
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`PDF generation failed: ${error.message}`)
    }
    throw new Error("PDF generation failed: Unknown error")
  }
}

/**
 * Check which pathology template IDs are configured
 */
export function getConfiguredPathologyTemplates(): { bloods: boolean; imaging: boolean } {
  return {
    bloods: !!process.env.APITEMPLATE_PATHOLOGY_BLOODS_TEMPLATE_ID,
    imaging: !!process.env.APITEMPLATE_PATHOLOGY_IMAGING_TEMPLATE_ID,
  }
}
