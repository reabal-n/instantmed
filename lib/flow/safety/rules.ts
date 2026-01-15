import type { SafetyRule, SafetyRulesConfig } from './types'

// ============================================
// SHARED EMERGENCY RULES (highest priority)
// ============================================

const emergencyRules: SafetyRule[] = [
  {
    id: 'emergency_chest_pain',
    name: 'Chest Pain Emergency',
    description: 'Patient reporting chest pain - requires emergency care',
    conditions: [
      { fieldId: 'emergency_symptoms', operator: 'includes_any', value: ['chest_pain'] },
    ],
    outcome: 'DECLINE',
    riskTier: 'critical',
    patientMessage: 'Chest pain can be a sign of a serious medical emergency. Please call 000 or go to your nearest emergency department immediately.',
    doctorNote: 'Patient reported chest pain - directed to emergency services',
    priority: 1000,
  },
  {
    id: 'emergency_breathing',
    name: 'Severe Breathing Difficulty',
    description: 'Patient reporting severe breathing difficulty',
    conditions: [
      { fieldId: 'emergency_symptoms', operator: 'includes_any', value: ['difficulty_breathing'] },
    ],
    outcome: 'DECLINE',
    riskTier: 'critical',
    patientMessage: 'Severe breathing difficulty requires immediate medical attention. Please call 000 or go to your nearest emergency department.',
    doctorNote: 'Patient reported severe breathing difficulty - directed to emergency services',
    priority: 1000,
  },
  {
    id: 'emergency_stroke_symptoms',
    name: 'Stroke Symptoms',
    description: 'Patient reporting sudden weakness/numbness',
    conditions: [
      { fieldId: 'emergency_symptoms', operator: 'includes_any', value: ['sudden_weakness'] },
    ],
    outcome: 'DECLINE',
    riskTier: 'critical',
    patientMessage: 'Sudden weakness or numbness on one side of your body can be a sign of stroke. Please call 000 immediately. Every minute counts.',
    doctorNote: 'Patient reported stroke symptoms - directed to emergency services',
    priority: 1000,
  },
  {
    id: 'emergency_headache',
    name: 'Thunderclap Headache',
    description: 'Patient reporting sudden severe headache',
    conditions: [
      { fieldId: 'emergency_symptoms', operator: 'includes_any', value: ['severe_headache'] },
    ],
    outcome: 'DECLINE',
    riskTier: 'critical',
    patientMessage: 'A sudden, severe headache can indicate a serious condition. Please call 000 or go to your nearest emergency department.',
    doctorNote: 'Patient reported sudden severe headache - directed to emergency services',
    priority: 1000,
  },
  {
    id: 'emergency_self_harm',
    name: 'Self-Harm Thoughts',
    description: 'Patient reporting thoughts of self-harm',
    conditions: [
      { fieldId: 'emergency_symptoms', operator: 'includes_any', value: ['suicidal_thoughts'] },
    ],
    outcome: 'DECLINE',
    riskTier: 'critical',
    patientMessage: 'We care about your wellbeing. Please call Lifeline on 13 11 14 for immediate support, or call 000 if you\'re in danger. You\'re not alone.',
    doctorNote: 'Patient reported thoughts of self-harm - provided crisis resources',
    priority: 1000,
  },
]

// ============================================
// MEDICAL CERTIFICATE RULES
// ============================================

const medCertRules: SafetyRule[] = [
  ...emergencyRules,
  {
    id: 'medcert_backdated_long',
    name: 'Long Backdating Request',
    description: 'Certificate backdated more than 3 days',
    conditions: [
      {
        fieldId: 'backdating_days',
        operator: 'gt',
        value: 3,
        derivedFrom: {
          type: 'duration_days',
          fields: ['absence_start_date', 'today'],
        },
      },
    ],
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'Certificates backdated more than 3 days require a brief phone consultation with our doctor to verify details.',
    doctorNote: 'Backdating >3 days requested - call required per policy',
    priority: 500,
    services: ['medical-certificate'],
  },
  {
    id: 'medcert_extended_duration',
    name: 'Extended Duration',
    description: 'Certificate for more than 5 consecutive days',
    conditions: [
      {
        fieldId: 'duration_days',
        operator: 'gt',
        value: 5,
        derivedFrom: {
          type: 'duration_days',
          fields: ['absence_start_date', 'absence_end_date'],
        },
      },
    ],
    outcome: 'REQUEST_MORE_INFO',
    riskTier: 'low',
    additionalInfoRequired: [
      {
        id: 'extended_reason',
        label: 'Please explain why you need an extended certificate',
        description: 'Help the doctor understand your situation',
        type: 'textarea',
        required: true,
      },
      {
        id: 'gp_contact',
        label: 'Have you seen a GP about this?',
        type: 'select',
        options: [
          { value: 'yes_recent', label: 'Yes, in the last week' },
          { value: 'yes_older', label: 'Yes, but more than a week ago' },
          { value: 'no', label: 'No' },
        ],
        required: true,
      },
    ],
    patientMessage: 'For certificates longer than 5 days, we need a bit more information to help the doctor.',
    doctorNote: 'Extended duration (>5 days) - additional info requested',
    priority: 300,
    services: ['medical-certificate'],
  },
  {
    id: 'medcert_severe_symptoms',
    name: 'Severe Symptoms',
    description: 'Patient reports severe symptoms',
    conditions: [
      { fieldId: 'symptom_severity', operator: 'equals', value: 'severe' },
    ],
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'You\'ve indicated severe symptoms. We\'d like to have a quick chat to make sure you get the right care.',
    doctorNote: 'Severe symptoms reported - phone assessment recommended',
    priority: 400,
    services: ['medical-certificate'],
  },
  {
    id: 'medcert_mental_health',
    name: 'Mental Health Absence',
    description: 'Absence reason is mental health',
    conditions: [
      { fieldId: 'absence_reason', operator: 'equals', value: 'mental_health' },
    ],
    outcome: 'REQUEST_MORE_INFO',
    riskTier: 'low',
    additionalInfoRequired: [
      {
        id: 'mh_support',
        label: 'Are you currently receiving support for your mental health?',
        type: 'select',
        options: [
          { value: 'yes_psychologist', label: 'Yes, seeing a psychologist' },
          { value: 'yes_psychiatrist', label: 'Yes, seeing a psychiatrist' },
          { value: 'yes_gp', label: 'Yes, through my GP' },
          { value: 'no_would_like', label: 'No, but I\'d like help finding support' },
          { value: 'no', label: 'No' },
        ],
        required: true,
      },
    ],
    patientMessage: 'We want to make sure you\'re getting the support you need. Please answer one quick question.',
    doctorNote: 'Mental health absence - checking support status',
    priority: 200,
    services: ['medical-certificate'],
  },
]

// ============================================
// PRESCRIPTION RULES
// ============================================

const prescriptionRules: SafetyRule[] = [
  ...emergencyRules,
  {
    id: 'rx_controlled_substance',
    name: 'Controlled Substance Request',
    description: 'Request for S8 or controlled medication',
    conditions: [
      { fieldId: 'is_controlled', operator: 'equals', value: true },
    ],
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Controlled substances (Schedule 8) cannot be prescribed through telehealth. Please see your regular GP or visit a clinic in person.',
    doctorNote: 'Controlled substance requested - declined per policy',
    priority: 800,
    services: ['prescription'],
  },
  {
    id: 'rx_new_chronic_medication',
    name: 'New Chronic Medication',
    description: 'New prescription for chronic condition medication',
    conditions: [
      { fieldId: 'prescriptionType', operator: 'equals', value: 'new' },
      { fieldId: 'medical_conditions', operator: 'is_not_empty' },
    ],
    conditionLogic: 'AND',
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'For new medications related to chronic conditions, we need a quick phone consultation to ensure it\'s safe for you.',
    doctorNote: 'New medication for chronic condition - phone assessment required',
    priority: 500,
    services: ['prescription'],
  },
  {
    id: 'rx_multiple_conditions',
    name: 'Multiple Medical Conditions',
    description: 'Patient has multiple medical conditions',
    conditions: [
      {
        fieldId: 'medical_conditions_count',
        operator: 'gte',
        value: 3,
        derivedFrom: {
          type: 'duration_days', // Using as generic counter
          fields: ['medical_conditions'],
        },
      },
    ],
    outcome: 'REQUEST_MORE_INFO',
    riskTier: 'low',
    additionalInfoRequired: [
      {
        id: 'condition_details',
        label: 'Please provide more details about your conditions',
        description: 'This helps us check for potential drug interactions',
        type: 'textarea',
        required: true,
      },
    ],
    patientMessage: 'With multiple conditions, we need a bit more detail to ensure this medication is safe for you.',
    doctorNote: 'Multiple conditions - additional info for safety check',
    priority: 300,
    services: ['prescription'],
  },
  {
    id: 'rx_potential_interaction',
    name: 'Potential Drug Interaction',
    description: 'Current medications may interact',
    conditions: [
      { fieldId: 'other_medications', operator: 'is_not_empty' },
      { fieldId: 'has_interaction_risk', operator: 'equals', value: true },
    ],
    conditionLogic: 'AND',
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'We\'ve identified a potential interaction with your current medications. A brief call will help us ensure your safety.',
    doctorNote: 'Potential drug interaction flagged - call required',
    priority: 600,
    services: ['prescription'],
  },
]

// ============================================
// WEIGHT MANAGEMENT RULES
// ============================================

const weightRules: SafetyRule[] = [
  ...emergencyRules,
  {
    id: 'weight_not_18',
    name: 'Under 18',
    description: 'Patient is under 18 years old',
    conditions: [
      { fieldId: 'age_18_plus', operator: 'equals', value: false },
    ],
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Weight management programs with medication are only available for adults 18 and over. Please consult your GP for advice.',
    doctorNote: 'Patient under 18 - not eligible for program',
    priority: 900,
    services: ['weight-management'],
  },
  {
    id: 'weight_pregnancy',
    name: 'Pregnancy/Breastfeeding',
    description: 'Patient is pregnant or breastfeeding',
    conditions: [
      { fieldId: 'pregnancy_status', operator: 'not_equals', value: 'no' },
    ],
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Weight loss medications are not safe during pregnancy or breastfeeding. Please speak with your GP about safe options for you.',
    doctorNote: 'Pregnant/breastfeeding - not eligible for weight medication',
    priority: 900,
    services: ['weight-management'],
  },
  {
    id: 'weight_low_bmi',
    name: 'BMI Too Low',
    description: 'BMI is below threshold for medication',
    conditions: [
      {
        fieldId: 'bmi',
        operator: 'lt',
        value: 27,
        derivedFrom: {
          type: 'bmi',
          fields: ['current_weight', 'height'],
        },
      },
    ],
    outcome: 'DECLINE',
    riskTier: 'low',
    patientMessage: 'Based on your measurements, you may not be eligible for weight loss medication. These are typically prescribed for BMI of 27+. We can still help with lifestyle guidance!',
    doctorNote: 'BMI <27 - not eligible for medication per guidelines',
    priority: 700,
    services: ['weight-management'],
  },
  {
    id: 'weight_eating_disorder',
    name: 'Eating Disorder History',
    description: 'Patient has history of eating disorder',
    conditions: [
      { fieldId: 'eating_disorder_history', operator: 'equals', value: true },
    ],
    outcome: 'REQUIRES_CALL',
    riskTier: 'high',
    patientMessage: 'Given your history, we\'d like to have a careful conversation to ensure any treatment is safe and supportive for you.',
    doctorNote: 'Eating disorder history - sensitive case, call required',
    priority: 700,
    services: ['weight-management'],
  },
  {
    id: 'weight_men2_thyroid_cancer',
    name: 'MEN2 or Medullary Thyroid Cancer History',
    description: 'Patient or family has history of MEN2 syndrome or medullary thyroid cancer - absolute contraindication for GLP-1 agonists',
    conditions: [
      { fieldId: 'weight_men2_thyroid_cancer', operator: 'equals', value: true },
    ],
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Due to your personal or family history of medullary thyroid cancer or MEN2 syndrome, GLP-1 weight loss medications are not suitable for you. Please discuss alternative options with your GP.',
    doctorNote: 'MEN2/medullary thyroid cancer history - absolute contraindication for GLP-1 agonists per TGA guidelines',
    priority: 950,
    services: ['weight-management'],
  },
  {
    id: 'weight_heart_disease',
    name: 'Heart Disease',
    description: 'Patient has heart disease',
    conditions: [
      { fieldId: 'medical_conditions', operator: 'includes_any', value: ['heart_disease'] },
    ],
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'With heart conditions, we want to discuss the safest approach for your weight management. A doctor will call you.',
    doctorNote: 'Heart disease - requires careful medication selection',
    priority: 600,
    services: ['weight-management'],
  },
]

// ============================================
// SERVICE CONFIGS
// ============================================

export const medCertSafetyConfig: SafetyRulesConfig = {
  serviceSlug: 'medical-certificate',
  version: '1.0',
  rules: medCertRules,
  defaultOutcome: 'ALLOW',
  defaultRiskTier: 'low',
}

export const prescriptionSafetyConfig: SafetyRulesConfig = {
  serviceSlug: 'prescription',
  version: '1.0',
  rules: prescriptionRules,
  defaultOutcome: 'ALLOW',
  defaultRiskTier: 'low',
}

export const weightSafetyConfig: SafetyRulesConfig = {
  serviceSlug: 'weight-management',
  version: '1.0',
  rules: weightRules,
  defaultOutcome: 'ALLOW',
  defaultRiskTier: 'low',
}

// ============================================
// CONFIG REGISTRY
// ============================================

export const safetyConfigs: Record<string, SafetyRulesConfig> = {
  'medical-certificate': medCertSafetyConfig,
  'med-cert': medCertSafetyConfig,
  prescription: prescriptionSafetyConfig,
  'weight-management': weightSafetyConfig,
  weight: weightSafetyConfig,
}

export function getSafetyConfig(serviceSlug: string): SafetyRulesConfig | null {
  return safetyConfigs[serviceSlug] || null
}
