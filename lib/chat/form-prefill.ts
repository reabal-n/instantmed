/**
 * Form Pre-fill from Chat Data
 * 
 * Maps AI-collected intake data to form fields for seamless transition.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ChatCollectedData {
  service_type: string
  chatSessionId?: string // Session ID from AI chat flow for transcript linking
  purpose?: string
  certType?: string
  symptoms?: string[] | string
  primarySymptoms?: Array<{ category: string; description?: string }>
  startDate?: string
  dateFrom?: string
  endDate?: string
  duration?: string | number
  durationDays?: number
  medication?: string | { name: string; strength?: string; pbsCode?: string }
  medicationDuration?: string
  treatmentDuration?: string
  controlLevel?: string
  conditionControl?: string
  lastReview?: string
  lastReviewDate?: string
  concern?: string
  concernSummary?: string
  urgency?: string
  consultType?: string
  carerName?: string
  carerRelation?: string
  carerDetails?: { personName?: string; relationship?: string }
  notes?: string
  additionalNotes?: string
  [key: string]: unknown
}

export interface MedCertFormData {
  certificateType: 'work' | 'education' | 'carer' | 'other'
  startDate: string
  endDate: string
  duration: number
  symptoms: string[]
  otherSymptom?: string
  carerName?: string
  carerRelationship?: string
  additionalNotes?: string
}

export interface RepeatRxFormData {
  medicationName: string
  medicationStrength?: string
  pbsCode?: string
  treatmentDuration: string
  conditionControl: string
  lastDoctorVisit: string
  recentChanges: boolean
  changeDetails?: string
  additionalNotes?: string
}

export interface ConsultFormData {
  primaryConcern: string
  concernCategory?: string
  urgency: string
  consultType: string
  symptoms?: string[]
  additionalNotes?: string
}

export type FormPrefillData = MedCertFormData | RepeatRxFormData | ConsultFormData

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

/**
 * Map chat-collected data to medical certificate form
 */
export function mapToMedCertForm(data: ChatCollectedData): Partial<MedCertFormData> {
  const form: Partial<MedCertFormData> = {}
  
  // Certificate type
  const certType = data.purpose || data.certType
  if (certType) {
    const typeMap: Record<string, 'work' | 'education' | 'carer' | 'other'> = {
      'work': 'work',
      'uni': 'education',
      'education': 'education',
      'school': 'education',
      'carer': 'carer',
      'carers': 'carer',
      'other': 'other',
    }
    form.certificateType = typeMap[certType.toLowerCase()] || 'work'
  }
  
  // Dates
  const startDate = data.startDate || data.dateFrom
  if (startDate) {
    form.startDate = normalizeDate(startDate)
  }
  if (data.endDate) {
    form.endDate = normalizeDate(data.endDate)
  }
  
  // Duration
  const duration = data.durationDays || data.duration
  if (duration) {
    form.duration = typeof duration === 'number' ? duration : parseDuration(duration)
  }
  
  // Symptoms
  const symptoms = data.primarySymptoms || data.symptoms
  if (symptoms) {
    if (Array.isArray(symptoms)) {
      form.symptoms = symptoms.map(s => 
        typeof s === 'string' ? s : s.category
      )
      // Check for "other" symptom with description
      const otherSymptom = symptoms.find(s => 
        typeof s === 'object' && s.category === 'other' && s.description
      )
      if (otherSymptom && typeof otherSymptom === 'object') {
        form.otherSymptom = otherSymptom.description
      }
    } else if (typeof symptoms === 'string') {
      form.symptoms = [symptoms]
    }
  }
  
  // Carer details
  if (data.carerDetails) {
    form.carerName = data.carerDetails.personName
    form.carerRelationship = data.carerDetails.relationship
  } else {
    form.carerName = data.carerName
    form.carerRelationship = data.carerRelation
  }
  
  // Notes
  form.additionalNotes = data.additionalNotes || data.notes
  
  return form
}

/**
 * Map chat-collected data to repeat prescription form
 */
export function mapToRepeatRxForm(data: ChatCollectedData): Partial<RepeatRxFormData> {
  const form: Partial<RepeatRxFormData> = {}
  
  // Medication
  if (data.medication) {
    if (typeof data.medication === 'object') {
      form.medicationName = data.medication.name
      form.medicationStrength = data.medication.strength
      form.pbsCode = data.medication.pbsCode
    } else {
      form.medicationName = data.medication
    }
  }
  
  // Treatment duration
  const duration = data.treatmentDuration || data.medicationDuration
  if (duration) {
    const durationMap: Record<string, string> = {
      'under_3m': 'under_3_months',
      '<3m': 'under_3_months',
      'under_3_months': 'under_3_months',
      '3_12m': '3_to_12_months',
      '3-12m': '3_to_12_months',
      '3_to_12_months': '3_to_12_months',
      'over_1y': 'over_1_year',
      '>1y': 'over_1_year',
      'over_1_year': 'over_1_year',
    }
    form.treatmentDuration = durationMap[duration] || duration
  }
  
  // Condition control
  const control = data.conditionControl || data.controlLevel
  if (control) {
    const controlMap: Record<string, string> = {
      'well': 'well_controlled',
      'well_controlled': 'well_controlled',
      'partial': 'partially_controlled',
      'partially_controlled': 'partially_controlled',
      'poor': 'poorly_controlled',
      'poorly_controlled': 'poorly_controlled',
    }
    form.conditionControl = controlMap[control] || control
  }
  
  // Last review
  const lastReview = data.lastReviewDate || data.lastReview
  if (lastReview) {
    const reviewMap: Record<string, string> = {
      'under_6m': 'under_6_months',
      'under_6_months': 'under_6_months',
      '6_12m': '6_to_12_months',
      '6_to_12_months': '6_to_12_months',
      'over_1y': 'over_1_year',
      'over_1_year': 'over_1_year',
    }
    form.lastDoctorVisit = reviewMap[lastReview] || lastReview
  }
  
  // Notes
  form.additionalNotes = data.additionalNotes || data.notes
  
  return form
}

/**
 * Map chat-collected data to consult form
 */
export function mapToConsultForm(data: ChatCollectedData): Partial<ConsultFormData> {
  const form: Partial<ConsultFormData> = {}
  
  // Primary concern
  form.primaryConcern = data.concernSummary || data.concern
  
  // Urgency
  if (data.urgency) {
    const urgencyMap: Record<string, string> = {
      'urgent': 'urgent',
      'soon': 'within_few_days',
      'routine': 'routine',
    }
    form.urgency = urgencyMap[data.urgency] || data.urgency
  }
  
  // Consult type
  if (data.consultType) {
    form.consultType = data.consultType
  }
  
  // Notes
  form.additionalNotes = data.additionalNotes || data.notes
  
  return form
}

/**
 * Main function to prefill form from chat data
 */
export function prefillFormFromChat(
  chatData: ChatCollectedData
): { formData: Partial<FormPrefillData>; serviceType: string; fieldsPopulated: string[] } {
  const serviceType = chatData.service_type
  let formData: Partial<FormPrefillData>
  
  switch (serviceType) {
    case 'med_cert':
    case 'medical_certificate':
      formData = mapToMedCertForm(chatData)
      break
    case 'repeat_rx':
    case 'repeat_prescription':
      formData = mapToRepeatRxForm(chatData)
      break
    case 'consult':
    case 'general_consult':
    case 'new_rx':
    case 'new_prescription':
      formData = mapToConsultForm(chatData)
      break
    default:
      formData = {}
  }
  
  // Track which fields were populated
  const fieldsPopulated = Object.keys(formData).filter(
    key => formData[key as keyof typeof formData] !== undefined
  )
  
  return {
    formData,
    serviceType,
    fieldsPopulated,
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizeDate(dateStr: string): string {
  if (dateStr === 'today') {
    return new Date().toISOString().split('T')[0]
  }
  if (dateStr === 'tomorrow') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }
  // Try to parse as ISO date
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  return dateStr
}

function parseDuration(duration: string): number {
  const durationMap: Record<string, number> = {
    'today': 1,
    '1': 1,
    '2': 2,
    '2days': 2,
    '3': 3,
    '3days': 3,
    '4+': 4,
    '4-7days': 5,
  }
  return durationMap[duration] || 1
}

// =============================================================================
// STORAGE FOR DRAFT PREFILL
// =============================================================================

const PREFILL_STORAGE_KEY = 'instantmed_form_prefill'

/**
 * Save prefill data including optional chatSessionId for transcript linking
 */
export function savePrefillData(data: ChatCollectedData, chatSessionId?: string): void {
  if (typeof window === 'undefined') return
  try {
    const dataWithSession = chatSessionId 
      ? { ...data, chatSessionId } 
      : data
    localStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify({
      data: dataWithSession,
      timestamp: Date.now(),
    }))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the chat session ID from prefill data if available
 */
export function getChatSessionId(): string | null {
  const prefillData = loadPrefillData()
  return prefillData?.chatSessionId || null
}

export function loadPrefillData(): ChatCollectedData | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(PREFILL_STORAGE_KEY)
    if (!stored) return null
    
    const { data, timestamp } = JSON.parse(stored)
    // Expire after 1 hour
    if (Date.now() - timestamp > 60 * 60 * 1000) {
      localStorage.removeItem(PREFILL_STORAGE_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function clearPrefillData(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREFILL_STORAGE_KEY)
}
