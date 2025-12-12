import type { ClinicalSummaryData } from './types'
import { getTemplate, defaultTemplate } from './templates'

// ============================================
// CLINICAL SUMMARY GENERATOR
// ============================================

interface GenerateSummaryParams {
  intake: {
    id: string
    reference_number: string
    risk_tier: string
    risk_score: number
    risk_reasons: string[]
    triage_result: string
    created_at: string
  }
  patient: {
    full_name: string
    date_of_birth: string
  }
  service: {
    name: string
    type: string
  }
  answers?: {
    answers: Record<string, unknown>
    has_allergies: boolean
    allergy_details: string
    has_current_medications: boolean
    current_medications: string[]
    has_medical_conditions: boolean
    medical_conditions: string[]
    red_flags: string[]
    yellow_flags: string[]
    bmi?: number
    [key: string]: unknown
  }
}

/**
 * Generate structured clinical summary data
 */
export function generateSummaryData(params: GenerateSummaryParams): ClinicalSummaryData {
  const { intake, patient, service, answers } = params
  
  // Calculate age
  const birthDate = new Date(patient.date_of_birth)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  // Get service-specific template
  const template = getTemplate(service.type) || defaultTemplate
  
  // Build summary data
  const data: ClinicalSummaryData = {
    // Demographics
    patientName: patient.full_name,
    dateOfBirth: patient.date_of_birth,
    age,
    
    // Request info
    referenceNumber: intake.reference_number,
    serviceType: service.type,
    serviceName: service.name,
    requestDate: intake.created_at,
    
    // Chief request
    chiefRequest: template.generateChiefRequest(answers?.answers || {}),
    
    // Medical history
    allergies: answers?.has_allergies 
      ? (answers.allergy_details || 'Yes - details not specified')
      : 'NKDA',
    currentMedications: answers?.has_current_medications
      ? (Array.isArray(answers.current_medications) 
          ? answers.current_medications.join(', ')
          : 'Yes - see questionnaire')
      : 'Nil regular',
    medicalConditions: answers?.has_medical_conditions
      ? (Array.isArray(answers.medical_conditions)
          ? answers.medical_conditions.join(', ')
          : 'Yes - see questionnaire')
      : 'Nil significant',
    
    // Clinical findings
    clinicalFindings: template.generateClinicalFindings(answers?.answers || {}, answers || {}),
    
    // Risk assessment
    riskTier: intake.risk_tier,
    riskScore: intake.risk_score,
    redFlags: answers?.red_flags || [],
    yellowFlags: answers?.yellow_flags || [],
    
    // Decision
    triageResult: intake.triage_result || 'Pending review',
    recommendation: '', // Will be set below
  }
  
  // Generate recommendation
  data.recommendation = template.generateRecommendation(data)
  
  return data
}

/**
 * Generate formatted text summary for copy/paste
 */
export function generateSummaryText(data: ClinicalSummaryData): string {
  const lines: string[] = []
  
  // Header
  lines.push('═══════════════════════════════════════════════════════════')
  lines.push('CLINICAL SUMMARY')
  lines.push('═══════════════════════════════════════════════════════════')
  lines.push('')
  
  // Patient & Request Info
  lines.push(`Reference: ${data.referenceNumber}`)
  lines.push(`Service: ${data.serviceName}`)
  lines.push(`Date: ${new Date(data.requestDate).toLocaleDateString('en-AU')}`)
  lines.push('')
  lines.push(`Patient: ${data.patientName}`)
  lines.push(`DOB: ${new Date(data.dateOfBirth).toLocaleDateString('en-AU')} (${data.age} years)`)
  lines.push('')
  
  // Chief Request
  lines.push('───────────────────────────────────────────────────────────')
  lines.push('CHIEF REQUEST')
  lines.push('───────────────────────────────────────────────────────────')
  lines.push(data.chiefRequest)
  lines.push('')
  
  // Medical History
  lines.push('───────────────────────────────────────────────────────────')
  lines.push('MEDICAL HISTORY')
  lines.push('───────────────────────────────────────────────────────────')
  lines.push(`Allergies: ${data.allergies}`)
  lines.push(`Medications: ${data.currentMedications}`)
  lines.push(`Conditions: ${data.medicalConditions}`)
  lines.push('')
  
  // Clinical Findings (if any)
  if (data.clinicalFindings.length > 0) {
    lines.push('───────────────────────────────────────────────────────────')
    lines.push('CLINICAL FINDINGS')
    lines.push('───────────────────────────────────────────────────────────')
    data.clinicalFindings.forEach(finding => {
      const abnormalMarker = finding.isAbnormal ? ' [!]' : ''
      lines.push(`${finding.label}: ${finding.value}${abnormalMarker}`)
    })
    lines.push('')
  }
  
  // Red/Yellow Flags
  if (data.redFlags.length > 0 || data.yellowFlags.length > 0) {
    lines.push('───────────────────────────────────────────────────────────')
    lines.push('FLAGS')
    lines.push('───────────────────────────────────────────────────────────')
    if (data.redFlags.length > 0) {
      lines.push('RED FLAGS:')
      data.redFlags.forEach(flag => lines.push(`  ⚠ ${flag}`))
    }
    if (data.yellowFlags.length > 0) {
      lines.push('YELLOW FLAGS:')
      data.yellowFlags.forEach(flag => lines.push(`  △ ${flag}`))
    }
    lines.push('')
  }
  
  // Risk Assessment
  lines.push('───────────────────────────────────────────────────────────')
  lines.push('RISK ASSESSMENT')
  lines.push('───────────────────────────────────────────────────────────')
  lines.push(`Tier: ${data.riskTier.toUpperCase()} (Score: ${data.riskScore}/100)`)
  lines.push(`Triage: ${data.triageResult}`)
  lines.push('')
  
  // Recommendation
  lines.push('───────────────────────────────────────────────────────────')
  lines.push('RECOMMENDATION')
  lines.push('───────────────────────────────────────────────────────────')
  lines.push(data.recommendation)
  lines.push('')
  
  // Footer
  lines.push('═══════════════════════════════════════════════════════════')
  lines.push(`Generated: ${new Date().toLocaleString('en-AU')}`)
  lines.push('InstantMed Telehealth')
  lines.push('═══════════════════════════════════════════════════════════')
  
  return lines.join('\n')
}

/**
 * Generate HTML summary for rich display
 */
export function generateSummaryHtml(data: ClinicalSummaryData): string {
  return `
    <div class="clinical-summary">
      <h2>Clinical Summary</h2>
      
      <section>
        <p><strong>Reference:</strong> ${data.referenceNumber}</p>
        <p><strong>Service:</strong> ${data.serviceName}</p>
        <p><strong>Patient:</strong> ${data.patientName} (${data.age}y)</p>
      </section>
      
      <section>
        <h3>Chief Request</h3>
        <p>${data.chiefRequest}</p>
      </section>
      
      <section>
        <h3>Medical History</h3>
        <p><strong>Allergies:</strong> ${data.allergies}</p>
        <p><strong>Medications:</strong> ${data.currentMedications}</p>
        <p><strong>Conditions:</strong> ${data.medicalConditions}</p>
      </section>
      
      ${data.clinicalFindings.length > 0 ? `
        <section>
          <h3>Clinical Findings</h3>
          <ul>
            ${data.clinicalFindings.map(f => 
              `<li${f.isAbnormal ? ' class="abnormal"' : ''}><strong>${f.label}:</strong> ${f.value}</li>`
            ).join('')}
          </ul>
        </section>
      ` : ''}
      
      <section>
        <h3>Risk Assessment</h3>
        <p><strong>Tier:</strong> ${data.riskTier.toUpperCase()} (${data.riskScore}/100)</p>
        ${data.redFlags.length > 0 ? `<p class="red-flags"><strong>Red Flags:</strong> ${data.redFlags.join(', ')}</p>` : ''}
      </section>
      
      <section>
        <h3>Recommendation</h3>
        <p>${data.recommendation}</p>
      </section>
    </div>
  `
}
