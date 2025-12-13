import type { FlowConfig, FlowStep, QuestionnaireConfig, FieldConfig } from './types'

// ============================================
// SHARED STEP DEFINITIONS
// ============================================

const defaultSteps: FlowStep[] = [
  { id: 'service', label: 'Select service', shortLabel: 'Service' },
  { id: 'questionnaire', label: 'Health questions', shortLabel: 'Questions' },
  { id: 'details', label: 'Your details', shortLabel: 'Details' },
  { id: 'checkout', label: 'Review & pay', shortLabel: 'Pay' },
]

// ============================================
// SHARED ELIGIBILITY FIELDS (Red flags)
// ============================================

const emergencyScreening: FieldConfig[] = [
  {
    id: 'emergency_symptoms',
    type: 'checkbox',
    label: 'Are you currently experiencing any of the following?',
    description: 'Select all that apply. These may require emergency care.',
    options: [
      { value: 'chest_pain', label: 'Chest pain or pressure', isDisqualifying: true },
      { value: 'difficulty_breathing', label: 'Severe difficulty breathing', isDisqualifying: true },
      { value: 'sudden_weakness', label: 'Sudden weakness or numbness on one side', isDisqualifying: true },
      { value: 'severe_headache', label: 'Sudden severe headache', isDisqualifying: true },
      { value: 'suicidal_thoughts', label: 'Thoughts of self-harm', isDisqualifying: true },
      { value: 'none', label: 'None of the above' },
    ],
    validation: { required: true },
    isRedFlag: true,
    redFlagMessage: 'If you\'re experiencing a medical emergency, please call 000 immediately.',
  },
]

// ============================================
// MEDICAL CERTIFICATE CONFIG
// ============================================

const medCertQuestionnaire: QuestionnaireConfig = {
  id: 'med_cert_v2',
  version: '2.0',
  eligibilityFields: [
    ...emergencyScreening,
    {
      id: 'currently_unwell',
      type: 'boolean',
      label: 'Are you currently unwell or recovering from an illness?',
      validation: { required: true },
    },
  ],
  groups: [
    {
      id: 'absence',
      title: 'Absence details',
      description: 'Tell us about your time off',
      fields: [
        {
          id: 'absence_reason',
          type: 'radio',
          label: 'What is the reason for your absence?',
          options: [
            { value: 'illness', label: 'Illness (cold, flu, gastro, etc.)' },
            { value: 'injury', label: 'Injury' },
            { value: 'mental_health', label: 'Mental health' },
            { value: 'medical_appointment', label: 'Medical appointment' },
            { value: 'caring', label: 'Caring for someone' },
            { value: 'other', label: 'Other' },
          ],
          validation: { required: true },
        },
        {
          id: 'absence_start_date',
          type: 'date',
          label: 'Start date',
          validation: { required: true },
        },
        {
          id: 'absence_end_date',
          type: 'date',
          label: 'End date',
          validation: { required: true },
        },
        {
          id: 'employer_name',
          type: 'text',
          label: 'Employer or institution name',
          placeholder: 'Optional - e.g., ABC Company, University of Sydney',
          description: 'This will appear on your certificate',
        },
      ],
    },
    {
      id: 'symptoms',
      title: 'Your symptoms',
      fields: [
        {
          id: 'symptom_description',
          type: 'textarea',
          label: 'Describe your symptoms',
          placeholder: 'What are you experiencing? When did it start?',
          validation: { required: true, minLength: 20 },
        },
        {
          id: 'symptom_severity',
          type: 'radio',
          label: 'How severe are your symptoms?',
          options: [
            { value: 'mild', label: 'Mild - Manageable with rest' },
            { value: 'moderate', label: 'Moderate - Affecting daily activities' },
            { value: 'severe', label: 'Severe - Cannot perform daily activities' },
          ],
          validation: { required: true },
        },
      ],
    },
    {
      id: 'medical_history',
      title: 'Medical background',
      description: 'Quick questions to help the doctor',
      fields: [
        {
          id: 'has_allergies',
          type: 'boolean',
          label: 'Do you have any medication allergies?',
          validation: { required: true },
        },
        {
          id: 'allergy_details',
          type: 'textarea',
          label: 'List your allergies',
          placeholder: 'e.g., Penicillin - causes rash',
          showIf: { fieldId: 'has_allergies', operator: 'equals', value: true },
          validation: { required: true },
        },
        {
          id: 'current_medications',
          type: 'textarea',
          label: 'Current medications (if any)',
          placeholder: 'List any medications you\'re taking',
        },
      ],
    },
  ],
}

export const medCertConfig: FlowConfig = {
  id: 'med-cert',
  serviceSlug: 'medical-certificate',
  serviceName: 'Medical Certificate',
  steps: defaultSteps,
  questionnaire: medCertQuestionnaire,
  pricing: {
    basePriceCents: 2495,
    priorityFeeCents: 1000,
    backdatingFeeCents: 1000,
  },
  requirements: {
    requiresAuth: false,
    requiresMedicare: false,
    requiresIdVerification: false,
  },
}

// ============================================
// PRESCRIPTION CONFIG
// ============================================

const prescriptionQuestionnaire: QuestionnaireConfig = {
  id: 'prescription_v2',
  version: '2.0',
  eligibilityFields: [
    ...emergencyScreening,
  ],
  groups: [
    {
      id: 'medication',
      title: 'Medication details',
      fields: [
        {
          id: 'medication_type',
          type: 'radio',
          label: 'What type of prescription do you need?',
          options: [
            { value: 'repeat', label: 'Repeat/refill of existing medication' },
            { value: 'new', label: 'New medication' },
          ],
          validation: { required: true },
        },
        {
          id: 'medication_name',
          type: 'text',
          label: 'Medication name',
          placeholder: 'e.g., Ventolin, Metformin',
          validation: { required: true },
        },
        {
          id: 'medication_strength',
          type: 'text',
          label: 'Strength/dosage',
          placeholder: 'e.g., 500mg, 100mcg',
        },
        {
          id: 'prescribing_doctor',
          type: 'text',
          label: 'Prescribing doctor (for repeats)',
          placeholder: 'Name of doctor who originally prescribed',
          showIf: { fieldId: 'medication_type', operator: 'equals', value: 'repeat' },
        },
        {
          id: 'reason_for_new',
          type: 'textarea',
          label: 'Why do you need this medication?',
          placeholder: 'Describe your condition and why you need this medication',
          showIf: { fieldId: 'medication_type', operator: 'equals', value: 'new' },
          validation: { required: true, minLength: 20 },
        },
      ],
    },
    {
      id: 'medical_history',
      title: 'Medical background',
      fields: [
        {
          id: 'has_allergies',
          type: 'boolean',
          label: 'Do you have any medication allergies?',
          validation: { required: true },
        },
        {
          id: 'allergy_details',
          type: 'textarea',
          label: 'List your allergies',
          showIf: { fieldId: 'has_allergies', operator: 'equals', value: true },
          validation: { required: true },
        },
        {
          id: 'medical_conditions',
          type: 'multiselect',
          label: 'Do you have any of these conditions?',
          options: [
            { value: 'diabetes', label: 'Diabetes' },
            { value: 'hypertension', label: 'High blood pressure' },
            { value: 'heart_disease', label: 'Heart disease' },
            { value: 'kidney_disease', label: 'Kidney disease' },
            { value: 'liver_disease', label: 'Liver disease' },
            { value: 'asthma', label: 'Asthma/COPD' },
            { value: 'none', label: 'None of the above' },
          ],
        },
        {
          id: 'other_medications',
          type: 'textarea',
          label: 'Other current medications',
          placeholder: 'List any other medications you\'re taking',
          helpText: 'This helps us check for drug interactions',
        },
      ],
    },
    {
      id: 'pharmacy',
      title: 'Pharmacy',
      fields: [
        {
          id: 'pharmacy_preference',
          type: 'radio',
          label: 'How would you like to receive your script?',
          options: [
            { value: 'e_script', label: 'E-script (sent to your phone)' },
            { value: 'pharmacy', label: 'Send directly to my pharmacy' },
          ],
          validation: { required: true },
        },
        {
          id: 'pharmacy_name',
          type: 'text',
          label: 'Pharmacy name',
          placeholder: 'e.g., Chemist Warehouse Bondi',
          showIf: { fieldId: 'pharmacy_preference', operator: 'equals', value: 'pharmacy' },
        },
        {
          id: 'pharmacy_suburb',
          type: 'text',
          label: 'Pharmacy suburb',
          showIf: { fieldId: 'pharmacy_preference', operator: 'equals', value: 'pharmacy' },
        },
      ],
    },
  ],
}

export const prescriptionConfig: FlowConfig = {
  id: 'prescription',
  serviceSlug: 'prescription',
  serviceName: 'Prescription',
  steps: defaultSteps,
  questionnaire: prescriptionQuestionnaire,
  pricing: {
    basePriceCents: 1995,
    priorityFeeCents: 1000,
  },
  requirements: {
    requiresAuth: false,
    requiresMedicare: false,
    requiresIdVerification: false,
  },
}

// ============================================
// REFERRAL CONFIG
// ============================================

const referralQuestionnaire: QuestionnaireConfig = {
  id: 'referral_v2',
  version: '2.0',
  eligibilityFields: emergencyScreening,
  groups: [
    {
      id: 'referral_type',
      title: 'Referral details',
      fields: [
        {
          id: 'specialist_type',
          type: 'select',
          label: 'What type of specialist do you need?',
          options: [
            { value: 'dermatologist', label: 'Dermatologist (skin)' },
            { value: 'cardiologist', label: 'Cardiologist (heart)' },
            { value: 'gastroenterologist', label: 'Gastroenterologist (digestive)' },
            { value: 'neurologist', label: 'Neurologist (brain/nerves)' },
            { value: 'orthopaedic', label: 'Orthopaedic surgeon (bones/joints)' },
            { value: 'psychiatrist', label: 'Psychiatrist (mental health)' },
            { value: 'psychologist', label: 'Psychologist' },
            { value: 'ophthalmologist', label: 'Ophthalmologist (eyes)' },
            { value: 'ent', label: 'ENT (ear, nose, throat)' },
            { value: 'urologist', label: 'Urologist' },
            { value: 'gynaecologist', label: 'Gynaecologist' },
            { value: 'other', label: 'Other' },
          ],
          validation: { required: true },
        },
        {
          id: 'other_specialist',
          type: 'text',
          label: 'Specify specialist type',
          showIf: { fieldId: 'specialist_type', operator: 'equals', value: 'other' },
          validation: { required: true },
        },
        {
          id: 'specific_doctor',
          type: 'text',
          label: 'Specific doctor name (if known)',
          placeholder: 'Leave blank if no preference',
        },
        {
          id: 'reason_for_referral',
          type: 'textarea',
          label: 'Why do you need this referral?',
          placeholder: 'Describe your symptoms or condition',
          validation: { required: true, minLength: 30 },
        },
      ],
    },
    {
      id: 'history',
      title: 'Relevant history',
      fields: [
        {
          id: 'previous_treatment',
          type: 'textarea',
          label: 'Have you had any previous treatment for this?',
          placeholder: 'e.g., Seen GP, tried medications, had tests',
        },
        {
          id: 'recent_tests',
          type: 'textarea',
          label: 'Any recent test results?',
          placeholder: 'Blood tests, imaging, etc.',
        },
        {
          id: 'current_medications',
          type: 'textarea',
          label: 'Current medications',
        },
      ],
    },
  ],
}

export const referralConfig: FlowConfig = {
  id: 'referral',
  serviceSlug: 'referral',
  serviceName: 'Specialist Referral',
  steps: defaultSteps,
  questionnaire: referralQuestionnaire,
  pricing: {
    basePriceCents: 3495,
    priorityFeeCents: 1500,
  },
  requirements: {
    requiresAuth: false,
    requiresMedicare: false,
    requiresIdVerification: false,
  },
}

// ============================================
// WEIGHT MANAGEMENT CONFIG
// ============================================

const weightQuestionnaire: QuestionnaireConfig = {
  id: 'weight_v2',
  version: '2.0',
  eligibilityFields: [
    ...emergencyScreening,
    {
      id: 'age_18_plus',
      type: 'boolean',
      label: 'Are you 18 years or older?',
      validation: { required: true },
      isRedFlag: true,
      redFlagMessage: 'You must be 18 or older for this service.',
    },
    {
      id: 'pregnancy_status',
      type: 'radio',
      label: 'Are you currently pregnant, breastfeeding, or trying to conceive?',
      options: [
        { value: 'no', label: 'No' },
        { value: 'pregnant', label: 'Yes, I am pregnant', isDisqualifying: true },
        { value: 'breastfeeding', label: 'Yes, I am breastfeeding', isDisqualifying: true },
        { value: 'trying', label: 'Yes, trying to conceive', isDisqualifying: true },
      ],
      validation: { required: true },
      helpText: 'Weight loss medications are not safe during pregnancy or breastfeeding.',
    },
  ],
  groups: [
    {
      id: 'measurements',
      title: 'Your measurements',
      fields: [
        {
          id: 'current_weight',
          type: 'number',
          label: 'Current weight (kg)',
          placeholder: 'e.g., 85',
          validation: { required: true, min: 30, max: 300 },
        },
        {
          id: 'height',
          type: 'number',
          label: 'Height (cm)',
          placeholder: 'e.g., 170',
          validation: { required: true, min: 100, max: 250 },
        },
        {
          id: 'target_weight',
          type: 'number',
          label: 'Target weight (kg)',
          placeholder: 'e.g., 75',
          validation: { required: true, min: 30, max: 300 },
        },
      ],
    },
    {
      id: 'history',
      title: 'Weight loss history',
      fields: [
        {
          id: 'previous_attempts',
          type: 'multiselect',
          label: 'What have you tried before?',
          options: [
            { value: 'diet', label: 'Diet changes' },
            { value: 'exercise', label: 'Exercise programs' },
            { value: 'meal_replacement', label: 'Meal replacements' },
            { value: 'prescription', label: 'Prescription medication' },
            { value: 'supplements', label: 'Weight loss supplements' },
            { value: 'none', label: 'None of the above' },
          ],
        },
        {
          id: 'eating_disorder_history',
          type: 'boolean',
          label: 'Have you ever been diagnosed with an eating disorder?',
          validation: { required: true },
          helpText: 'This helps us provide safe and appropriate care.',
        },
      ],
    },
    {
      id: 'medical',
      title: 'Medical background',
      fields: [
        {
          id: 'medical_conditions',
          type: 'multiselect',
          label: 'Do you have any of these conditions?',
          options: [
            { value: 'diabetes_type2', label: 'Type 2 diabetes' },
            { value: 'prediabetes', label: 'Prediabetes' },
            { value: 'pcos', label: 'PCOS' },
            { value: 'thyroid', label: 'Thyroid condition' },
            { value: 'heart_disease', label: 'Heart disease' },
            { value: 'kidney_disease', label: 'Kidney disease' },
            { value: 'none', label: 'None of the above' },
          ],
        },
        {
          id: 'current_medications',
          type: 'textarea',
          label: 'Current medications',
          placeholder: 'List any medications you\'re taking',
        },
        {
          id: 'has_allergies',
          type: 'boolean',
          label: 'Any medication allergies?',
          validation: { required: true },
        },
        {
          id: 'allergy_details',
          type: 'textarea',
          label: 'Allergy details',
          showIf: { fieldId: 'has_allergies', operator: 'equals', value: true },
          validation: { required: true },
        },
      ],
    },
  ],
}

export const weightConfig: FlowConfig = {
  id: 'weight-management',
  serviceSlug: 'weight-management',
  serviceName: 'Weight Management',
  steps: defaultSteps,
  questionnaire: weightQuestionnaire,
  pricing: {
    basePriceCents: 4995,
    priorityFeeCents: 1500,
  },
  requirements: {
    requiresAuth: true,
    requiresMedicare: false,
    requiresIdVerification: true,
    minAge: 18,
  },
}

// ============================================
// CONFIG REGISTRY
// ============================================

export const flowConfigs: Record<string, FlowConfig> = {
  'medical-certificate': medCertConfig,
  'med-cert': medCertConfig,
  prescription: prescriptionConfig,
  referral: referralConfig,
  'weight-management': weightConfig,
  weight: weightConfig,
}

export function getFlowConfig(serviceSlug: string): FlowConfig | null {
  return flowConfigs[serviceSlug] || null
}

export function getAllServiceSlugs(): string[] {
  return ['medical-certificate', 'prescription', 'referral', 'weight-management']
}
