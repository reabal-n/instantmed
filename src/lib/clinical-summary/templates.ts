import type { SummaryTemplate, ClinicalFinding, ClinicalSummaryData } from './types'

// ============================================
// CLINICAL SUMMARY TEMPLATES
// ============================================

// Weight Loss Template
const weightLossTemplate: SummaryTemplate = {
  serviceType: 'weight_loss',
  
  generateChiefRequest: (answers) => {
    const weight = answers.current_weight as number
    const target = answers.target_weight as number
    const attempts = answers.weight_loss_attempts as string[]
    
    let request = `Patient seeking weight management support.`
    if (weight && target) {
      request += ` Current weight: ${weight}kg, target: ${target}kg (goal: ${weight - target}kg loss).`
    }
    if (attempts && attempts.length > 0 && !attempts.includes('none')) {
      request += ` Previous attempts: ${attempts.join(', ')}.`
    }
    return request
  },
  
  generateClinicalFindings: (answers, intake) => {
    const findings: ClinicalFinding[] = []
    
    // BMI
    if (intake.bmi) {
      const bmi = intake.bmi as number
      findings.push({
        label: 'BMI',
        value: `${bmi.toFixed(1)} kg/m²`,
        isAbnormal: bmi >= 30,
      })
    }
    
    // Weight
    if (answers.current_weight) {
      findings.push({
        label: 'Current Weight',
        value: `${answers.current_weight}kg`,
      })
    }
    
    // Height
    if (answers.height) {
      findings.push({
        label: 'Height',
        value: `${answers.height}cm`,
      })
    }
    
    // Exercise
    if (answers.exercise_frequency) {
      findings.push({
        label: 'Exercise Frequency',
        value: formatFrequency(answers.exercise_frequency as string),
      })
    }
    
    return findings
  },
  
  generateRecommendation: (data) => {
    if (data.redFlags.length > 0) {
      return 'Not suitable for GLP-1 therapy via telehealth. Recommend in-person assessment.'
    }
    
    const bmiValue = parseFloat(data.clinicalFindings.find(f => f.label === 'BMI')?.value || '0')
    
    if (bmiValue >= 30) {
      return 'BMI ≥30. Eligible for GLP-1 therapy. Recommend initiating semaglutide/liraglutide with lifestyle modifications.'
    } else if (bmiValue >= 27) {
      return 'BMI 27-30. May be eligible with documented comorbidities. Consider lifestyle-first approach or low-dose initiation.'
    }
    
    return 'BMI <27. GLP-1 therapy generally not indicated. Recommend dietary counseling and exercise program.'
  },
}

// Medical Certificate Template
const medCertTemplate: SummaryTemplate = {
  serviceType: 'med_certs',
  
  generateChiefRequest: (answers) => {
    const reason = answers.absence_reason as string
    const start = answers.absence_start_date as string
    const end = answers.absence_end_date as string
    const severity = answers.symptom_severity as string
    
    let request = `Request for medical certificate.`
    if (reason) {
      request += ` Reason: ${formatReason(reason)}.`
    }
    if (start && end) {
      const days = calculateDays(start, end)
      request += ` Period: ${formatDate(start)} to ${formatDate(end)} (${days} day${days > 1 ? 's' : ''}).`
    }
    if (severity) {
      request += ` Severity: ${severity}.`
    }
    return request
  },
  
  generateClinicalFindings: (answers, intake) => {
    const findings: ClinicalFinding[] = []
    
    if (answers.symptom_description) {
      findings.push({
        label: 'Presenting Symptoms',
        value: answers.symptom_description as string,
      })
    }
    
    if (answers.symptom_duration) {
      findings.push({
        label: 'Duration',
        value: formatDuration(answers.symptom_duration as string),
      })
    }
    
    if (answers.symptom_severity) {
      findings.push({
        label: 'Severity',
        value: (answers.symptom_severity as string).charAt(0).toUpperCase() + 
               (answers.symptom_severity as string).slice(1),
        isAbnormal: answers.symptom_severity === 'severe',
      })
    }
    
    return findings
  },
  
  generateRecommendation: (data) => {
    const severity = data.clinicalFindings.find(f => f.label === 'Severity')?.value?.toLowerCase()
    
    if (severity === 'severe') {
      return 'Symptoms reported as severe. Consider recommending in-person GP review if not improving.'
    }
    
    return 'Suitable for medical certificate. Patient reports inability to attend work/study due to stated condition.'
  },
}

// Men's Health (ED) Template
const mensHealthEDTemplate: SummaryTemplate = {
  serviceType: 'mens_health',
  
  generateChiefRequest: (answers) => {
    const duration = answers.ed_duration as string
    const frequency = answers.ed_frequency as string
    
    let request = `Male patient seeking treatment for erectile dysfunction.`
    if (duration) {
      request += ` Duration: ${formatDuration(duration)}.`
    }
    if (frequency) {
      request += ` Occurrence: ${formatFrequency(frequency)}.`
    }
    return request
  },
  
  generateClinicalFindings: (answers, intake) => {
    const findings: ClinicalFinding[] = []
    
    if (answers.ed_duration) {
      findings.push({
        label: 'Duration',
        value: formatDuration(answers.ed_duration as string),
      })
    }
    
    if (answers.ed_frequency) {
      findings.push({
        label: 'Frequency',
        value: formatFrequency(answers.ed_frequency as string),
      })
    }
    
    if (answers.morning_erections) {
      findings.push({
        label: 'Morning Erections',
        value: formatFrequency(answers.morning_erections as string),
        isAbnormal: answers.morning_erections === 'rarely',
      })
    }
    
    if (answers.cardio_conditions) {
      const conditions = answers.cardio_conditions as string[]
      if (conditions.length > 0 && !conditions.includes('none')) {
        findings.push({
          label: 'CV Risk Factors',
          value: conditions.join(', '),
          isAbnormal: true,
        })
      }
    }
    
    return findings
  },
  
  generateRecommendation: (data) => {
    if (data.redFlags.length > 0) {
      return 'Contraindications identified. PDE5 inhibitors not suitable. Recommend cardiology review.'
    }
    
    const hasCVRisk = data.clinicalFindings.some(f => f.label === 'CV Risk Factors')
    const morningErections = data.clinicalFindings.find(f => f.label === 'Morning Erections')?.value
    
    if (hasCVRisk) {
      return 'CV risk factors present. Consider low-dose PDE5 inhibitor (sildenafil 25mg or tadalafil 5mg) with monitoring advice.'
    }
    
    if (morningErections?.includes('regular')) {
      return 'Pattern suggests situational/psychogenic component. Suitable for trial of PDE5 inhibitor. Consider counseling referral.'
    }
    
    return 'Suitable for PDE5 inhibitor therapy. Recommend standard dosing with patient education.'
  },
}

// Template Registry
const templates: Record<string, SummaryTemplate> = {
  weight_loss: weightLossTemplate,
  med_certs: medCertTemplate,
  mens_health: mensHealthEDTemplate,
}

export function getTemplate(serviceType: string): SummaryTemplate | null {
  return templates[serviceType] || null
}

// Default template for services without specific templates
export const defaultTemplate: SummaryTemplate = {
  serviceType: 'default',
  
  generateChiefRequest: (answers) => {
    return 'Patient request for telehealth consultation.'
  },
  
  generateClinicalFindings: (answers, intake) => {
    return []
  },
  
  generateRecommendation: (data) => {
    if (data.redFlags.length > 0) {
      return 'Red flags identified. Review required before approval.'
    }
    return 'Review patient responses and make clinical determination.'
  },
}

// Helper functions
function formatFrequency(value: string): string {
  const map: Record<string, string> = {
    never: 'Never',
    rarely: 'Rarely',
    sometimes: 'Sometimes',
    often: 'Often',
    regularly: 'Regularly',
    daily: 'Daily',
    always: 'Always',
  }
  return map[value] || value
}

function formatReason(value: string): string {
  const map: Record<string, string> = {
    illness: 'Illness',
    injury: 'Injury',
    mental_health: 'Mental health',
    medical_appointment: 'Medical appointment',
    caring: 'Caring for family member',
    other: 'Other',
  }
  return map[value] || value
}

function formatDuration(value: string): string {
  const map: Record<string, string> = {
    today: 'Started today',
    '1-3_days': '1-3 days',
    '4-7_days': '4-7 days',
    over_week: 'Over 1 week',
    less_1_month: 'Less than 1 month',
    '1-6_months': '1-6 months',
    '6-12_months': '6-12 months',
    over_1_year: 'Over 1 year',
  }
  return map[value] || value
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calculateDays(start: string, end: string): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
}
