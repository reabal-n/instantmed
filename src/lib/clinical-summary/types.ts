// ============================================
// CLINICAL SUMMARY TYPES
// ============================================

export interface ClinicalSummaryData {
  // Patient demographics
  patientName: string
  dateOfBirth: string
  age: number
  
  // Request details
  referenceNumber: string
  serviceType: string
  serviceName: string
  requestDate: string
  
  // Chief request/complaint
  chiefRequest: string
  
  // Medical history
  allergies: string
  currentMedications: string
  medicalConditions: string
  
  // Clinical data (varies by service)
  clinicalFindings: ClinicalFinding[]
  
  // Risk assessment
  riskTier: string
  riskScore: number
  redFlags: string[]
  yellowFlags: string[]
  
  // Decision
  triageResult: string
  recommendation: string
}

export interface ClinicalFinding {
  label: string
  value: string
  isAbnormal?: boolean
}

export interface SummaryTemplate {
  serviceType: string
  generateChiefRequest: (answers: Record<string, unknown>) => string
  generateClinicalFindings: (answers: Record<string, unknown>, intake: Record<string, unknown>) => ClinicalFinding[]
  generateRecommendation: (data: ClinicalSummaryData) => string
}

export interface StoredSummary {
  id: string
  intake_id: string
  version: number
  summary_text: string
  summary_data: ClinicalSummaryData
  generated_by_id: string
  created_at: string
}
