import type { Rule } from './types'

// ============================================
// RULES CONFIGURATION
// ============================================

export const rules: Rule[] = [
  // ========== UNIVERSAL SAFETY RULES ==========
  {
    id: 'emergency_symptoms',
    name: 'Emergency Symptoms Detected',
    description: 'Patient has selected emergency symptoms',
    conditions: [
      {
        field: 'eligibilityAnswers.emergency_symptoms',
        operator: 'contains',
        value: 'chest_pain',
      },
    ],
    isHardStop: true,
    isSoftFlag: false,
    action: 'decline',
    riskScoreAdd: 100,
    riskTierOverride: 'critical',
    patientMessage: 'Your symptoms may require emergency care. Please call 000 or go to your nearest emergency department.',
    adminMessage: 'EMERGENCY: Patient reported chest pain. Request auto-declined.',
    category: 'safety',
    priority: 100,
    isActive: true,
  },
  {
    id: 'emergency_breathing',
    name: 'Severe Breathing Difficulty',
    conditions: [
      {
        field: 'eligibilityAnswers.emergency_symptoms',
        operator: 'contains',
        value: 'difficulty_breathing',
      },
    ],
    isHardStop: true,
    isSoftFlag: false,
    action: 'decline',
    riskScoreAdd: 100,
    riskTierOverride: 'critical',
    patientMessage: 'Severe breathing difficulties require immediate medical attention. Please call 000.',
    adminMessage: 'EMERGENCY: Patient reported severe breathing difficulty. Request auto-declined.',
    category: 'safety',
    priority: 100,
    isActive: true,
  },
  {
    id: 'suicidal_thoughts',
    name: 'Suicidal Ideation',
    conditions: [
      {
        field: 'eligibilityAnswers.emergency_symptoms',
        operator: 'contains',
        value: 'suicidal_thoughts',
      },
    ],
    isHardStop: true,
    isSoftFlag: false,
    action: 'decline',
    riskScoreAdd: 100,
    riskTierOverride: 'critical',
    patientMessage: 'If you are having thoughts of self-harm, please call Lifeline on 13 11 14 or go to your nearest emergency department.',
    adminMessage: 'CRISIS: Patient reported suicidal thoughts. Provide crisis resources.',
    category: 'safety',
    priority: 100,
    isActive: true,
  },

  // ========== WEIGHT LOSS RULES ==========
  {
    id: 'wl_pregnancy',
    name: 'Weight Loss - Pregnancy',
    serviceTypes: ['weight_loss'],
    conditions: [
      {
        field: 'eligibilityAnswers.pregnancy_status',
        operator: 'not_equals',
        value: 'not_pregnant',
      },
    ],
    isHardStop: true,
    isSoftFlag: false,
    action: 'decline',
    riskScoreAdd: 100,
    patientMessage: 'GLP-1 medications are not safe during pregnancy or breastfeeding. Please consult your GP for alternative weight management options.',
    adminMessage: 'Patient is pregnant/breastfeeding. GLP-1 contraindicated.',
    category: 'medical',
    priority: 90,
    isActive: true,
  },
  {
    id: 'wl_low_bmi',
    name: 'Weight Loss - BMI Too Low',
    serviceTypes: ['weight_loss'],
    conditions: [
      {
        field: 'intakeData.bmi',
        operator: 'lt',
        value: 27,
      },
    ],
    isHardStop: false,
    isSoftFlag: false,
    action: 'requires_live_consult',
    riskScoreAdd: 40,
    riskTierOverride: 'moderate',
    patientMessage: 'Based on your BMI, you may need a consultation to discuss if this treatment is right for you.',
    adminMessage: 'BMI below 27. Consider if GLP-1 is appropriate. May need comorbidity justification.',
    category: 'medical',
    priority: 80,
    isActive: true,
  },
  {
    id: 'wl_very_high_bmi',
    name: 'Weight Loss - Very High BMI',
    serviceTypes: ['weight_loss'],
    conditions: [
      {
        field: 'intakeData.bmi',
        operator: 'gte',
        value: 45,
      },
    ],
    isHardStop: false,
    isSoftFlag: true,
    action: 'request_more_info',
    riskScoreAdd: 30,
    riskTierOverride: 'high',
    patientMessage: 'We need some additional information to ensure this treatment is safe for you.',
    adminMessage: 'Very high BMI (≥45). Consider bariatric surgery referral. Assess comorbidities.',
    category: 'medical',
    priority: 70,
    isActive: true,
  },
  {
    id: 'wl_eating_disorder',
    name: 'Weight Loss - Eating Disorder History',
    serviceTypes: ['weight_loss'],
    conditions: [
      {
        field: 'eligibilityAnswers.eating_disorder_history',
        operator: 'equals',
        value: true,
      },
    ],
    isHardStop: false,
    isSoftFlag: false,
    action: 'requires_live_consult',
    riskScoreAdd: 50,
    riskTierOverride: 'high',
    patientMessage: 'Given your history, we recommend a consultation to discuss your options.',
    adminMessage: 'Patient has eating disorder history. Requires careful assessment.',
    category: 'medical',
    priority: 85,
    isActive: true,
  },

  // ========== MEN'S HEALTH (ED) RULES ==========
  {
    id: 'ed_nitrates',
    name: 'ED - Nitrate Medications',
    serviceTypes: ['mens_health'],
    conditions: [
      {
        field: 'eligibilityAnswers.nitrates',
        operator: 'equals',
        value: true,
      },
    ],
    isHardStop: true,
    isSoftFlag: false,
    action: 'decline',
    riskScoreAdd: 100,
    patientMessage: 'ED medications cannot be prescribed if you take nitrates, as this combination can cause dangerous drops in blood pressure. Please speak with your regular doctor.',
    adminMessage: 'Patient on nitrates. ED medication absolutely contraindicated.',
    category: 'medical',
    priority: 95,
    isActive: true,
  },
  {
    id: 'ed_recent_cardiac_event',
    name: 'ED - Recent Cardiac Event',
    serviceTypes: ['mens_health'],
    conditions: [
      {
        field: 'eligibilityAnswers.recent_heart_event',
        operator: 'equals',
        value: true,
      },
    ],
    isHardStop: true,
    isSoftFlag: false,
    action: 'decline',
    riskScoreAdd: 100,
    patientMessage: 'Given your recent cardiac event, ED medications require specialist clearance. Please consult with your cardiologist.',
    adminMessage: 'Recent cardiac event (MI/stroke within 6 months). ED medication contraindicated.',
    category: 'medical',
    priority: 95,
    isActive: true,
  },
  {
    id: 'ed_cardiovascular_risk',
    name: 'ED - Multiple CV Risk Factors',
    serviceTypes: ['mens_health'],
    conditions: [
      {
        field: 'answers.cardio_conditions',
        operator: 'not_in',
        value: ['none'],
      },
    ],
    isHardStop: false,
    isSoftFlag: true,
    action: 'allow',
    riskScoreAdd: 25,
    riskTierOverride: 'moderate',
    patientMessage: '',
    adminMessage: 'Patient has cardiovascular risk factors. Review carefully before prescribing.',
    category: 'medical',
    priority: 70,
    isActive: true,
  },

  // ========== MED CERT RULES ==========
  {
    id: 'mc_long_absence',
    name: 'Med Cert - Extended Absence',
    serviceTypes: ['med_certs'],
    conditions: [
      {
        field: 'intakeData.absenceDays',
        operator: 'gt',
        value: 5,
      },
    ],
    isHardStop: false,
    isSoftFlag: true,
    action: 'request_more_info',
    riskScoreAdd: 20,
    patientMessage: 'For absences longer than 5 days, we may need additional information.',
    adminMessage: 'Extended absence (>5 days). Consider requesting more details.',
    category: 'operational',
    priority: 50,
    isActive: true,
  },
  {
    id: 'mc_severe_symptoms',
    name: 'Med Cert - Severe Symptoms',
    serviceTypes: ['med_certs'],
    conditions: [
      {
        field: 'answers.symptom_severity',
        operator: 'equals',
        value: 'severe',
      },
    ],
    isHardStop: false,
    isSoftFlag: true,
    action: 'allow',
    riskScoreAdd: 15,
    patientMessage: '',
    adminMessage: 'Patient reports severe symptoms. Consider recommending in-person review.',
    category: 'medical',
    priority: 60,
    isActive: true,
  },
  {
    id: 'mc_backdated',
    name: 'Med Cert - Backdated Request',
    serviceTypes: ['med_certs'],
    conditions: [
      {
        field: 'answers.absence_start_date',
        operator: 'lt',
        value: 'today-3', // Placeholder - evaluated at runtime
      },
    ],
    isHardStop: false,
    isSoftFlag: true,
    action: 'request_more_info',
    riskScoreAdd: 30,
    patientMessage: 'Backdated certificates may require additional verification.',
    adminMessage: 'Request for backdated certificate. Verify circumstances.',
    category: 'regulatory',
    priority: 65,
    isActive: true,
  },

  // ========== GENERAL MEDICAL RULES ==========
  {
    id: 'multiple_medications',
    name: 'Multiple Current Medications',
    conditions: [
      {
        field: 'answers.has_current_medications',
        operator: 'equals',
        value: true,
      },
    ],
    isHardStop: false,
    isSoftFlag: true,
    action: 'allow',
    riskScoreAdd: 10,
    patientMessage: '',
    adminMessage: 'Patient on current medications. Check for interactions.',
    category: 'medical',
    priority: 40,
    isActive: true,
  },
  {
    id: 'drug_allergies',
    name: 'Drug Allergies Present',
    conditions: [
      {
        field: 'answers.has_allergies',
        operator: 'equals',
        value: true,
      },
    ],
    isHardStop: false,
    isSoftFlag: true,
    action: 'allow',
    riskScoreAdd: 10,
    patientMessage: '',
    adminMessage: 'Patient has drug allergies. Review allergy list before prescribing.',
    category: 'medical',
    priority: 40,
    isActive: true,
  },
]

// Export function to get rules by service
export function getRulesForService(serviceSlug: string, serviceType: string): Rule[] {
  return rules.filter((rule) => {
    // Rule applies if no service restriction, or matches service
    const matchesService = 
      (!rule.serviceSlug || rule.serviceSlug === serviceSlug) &&
      (!rule.serviceTypes || rule.serviceTypes.length === 0 || rule.serviceTypes.includes(serviceType))
    
    return matchesService && rule.isActive
  }).sort((a, b) => b.priority - a.priority) // Higher priority first
}
