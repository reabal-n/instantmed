import type { FlowConfig, FlowStep, QuestionnaireConfig, FieldConfig } from './types'

// ============================================
// SIMPLIFIED 3-STEP MODEL
// ============================================

const simplifiedSteps: FlowStep[] = [
  { id: 'questions', label: 'Health questions', shortLabel: 'Questions' },
  { id: 'details', label: 'Your details', shortLabel: 'Details' },
  { id: 'checkout', label: 'Review & pay', shortLabel: 'Pay' },
]

// For services that need service selection first
const withServiceStep: FlowStep[] = [
  { id: 'service', label: 'Select service', shortLabel: 'Service' },
  ...simplifiedSteps,
]

// ============================================
// SHARED ELIGIBILITY FIELDS (Safety screening)
// ============================================

const emergencyScreening: FieldConfig = {
  id: 'emergency_symptoms',
  type: 'checkbox',
  label: 'Please confirm you are NOT currently experiencing:',
  description: 'Select if any apply. These require emergency care.',
  options: [
    { value: 'chest_pain', label: 'Chest pain or pressure', isDisqualifying: true },
    { value: 'difficulty_breathing', label: 'Severe difficulty breathing', isDisqualifying: true },
    { value: 'sudden_weakness', label: 'Sudden weakness on one side', isDisqualifying: true },
    { value: 'severe_headache', label: 'Worst headache of your life', isDisqualifying: true },
    { value: 'suicidal_thoughts', label: 'Thoughts of self-harm', isDisqualifying: true },
    { value: 'none', label: 'None of the above - I\'m safe to continue' },
  ],
  validation: { required: true },
  isRedFlag: true,
  redFlagMessage: 'If you\'re experiencing a medical emergency, call 000 immediately.',
}

// ============================================
// MEDICAL CERTIFICATE CONFIG
// ============================================

const medCertQuestionnaire: QuestionnaireConfig = {
  id: 'med_cert_v3',
  version: '3.0',
  eligibilityFields: [emergencyScreening],
  groups: [
    {
      id: 'absence',
      title: 'Absence details',
      description: 'Quick info about your time off',
      fields: [
        {
          id: 'certificate_type',
          type: 'radio',
          label: 'What type of certificate do you need?',
          options: [
            { value: 'sick_leave', label: 'Sick leave' },
            { value: 'carers_leave', label: 'Carer\'s leave' },
            { value: 'fitness', label: 'Fitness for work/study' },
            { value: 'medical_appointment', label: 'Medical appointment' },
          ],
          validation: { required: true },
        },
        {
          id: 'absence_dates',
          type: 'radio',
          label: 'When do you need the certificate for?',
          options: [
            { value: 'today', label: 'Today only' },
            { value: 'yesterday', label: 'Yesterday' },
            { value: 'multi_day', label: 'Multiple days' },
          ],
          validation: { required: true },
        },
        {
          id: 'start_date',
          type: 'date',
          label: 'Start date',
          showIf: { fieldId: 'absence_dates', operator: 'equals', value: 'multi_day' },
          validation: { required: true },
        },
        {
          id: 'end_date',
          type: 'date',
          label: 'End date',
          showIf: { fieldId: 'absence_dates', operator: 'equals', value: 'multi_day' },
          validation: { required: true },
        },
        {
          id: 'employer_name',
          type: 'text',
          label: 'Employer/institution name (optional)',
          placeholder: 'Will appear on certificate',
        },
      ],
    },
    {
      id: 'reason',
      title: 'Your condition',
      fields: [
        {
          id: 'reason_category',
          type: 'radio',
          label: 'What\'s the main reason?',
          options: [
            { value: 'cold_flu', label: 'Cold, flu, or respiratory' },
            { value: 'gastro', label: 'Stomach/digestive issues' },
            { value: 'injury', label: 'Injury or pain' },
            { value: 'mental_health', label: 'Mental health' },
            { value: 'migraine', label: 'Migraine/headache' },
            { value: 'other', label: 'Other' },
          ],
          validation: { required: true },
        },
        {
          id: 'symptoms_brief',
          type: 'textarea',
          label: 'Briefly describe your symptoms',
          placeholder: 'e.g., Fever, body aches, unable to work',
          validation: { required: true, minLength: 10, maxLength: 500 },
        },
        {
          id: 'severity',
          type: 'radio',
          label: 'How are you feeling?',
          options: [
            { value: 'mild', label: 'Mild - Resting helps' },
            { value: 'moderate', label: 'Moderate - Hard to function' },
            { value: 'severe', label: 'Severe - Can\'t do daily activities' },
          ],
          validation: { required: true },
        },
      ],
    },
    {
      id: 'medical_quick',
      title: 'Quick medical check',
      fields: [
        {
          id: 'allergies',
          type: 'radio',
          label: 'Any medication allergies?',
          options: [
            { value: 'no', label: 'No known allergies' },
            { value: 'yes', label: 'Yes' },
          ],
          validation: { required: true },
        },
        {
          id: 'allergy_list',
          type: 'text',
          label: 'List allergies',
          showIf: { fieldId: 'allergies', operator: 'equals', value: 'yes' },
          validation: { required: true },
        },
        {
          id: 'current_meds',
          type: 'text',
          label: 'Current medications (if any)',
          placeholder: 'Leave blank if none',
        },
      ],
    },
  ],
}

export const medCertConfig: FlowConfig = {
  id: 'med-cert',
  serviceSlug: 'medical-certificate',
  serviceName: 'Medical Certificate',
  serviceDescription: 'Sick leave, carer\'s leave, or fitness certificates',
  category: 'medical-certificate',
  icon: 'FileText',
  steps: simplifiedSteps,
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
  estimatedTime: '~15 mins',
  features: ['No phone call needed', 'Same-day delivery', 'Employer-ready PDF', 'Backdating available'],
}

// ============================================
// COMMON SCRIPTS CONFIG
// ============================================

const commonScriptsQuestionnaire: QuestionnaireConfig = {
  id: 'common_scripts_v1',
  version: '1.0',
  eligibilityFields: [emergencyScreening],
  groups: [
    {
      id: 'medication',
      title: 'Your medication',
      fields: [
        {
          id: 'script_type',
          type: 'radio',
          label: 'What do you need?',
          options: [
            { value: 'repeat', label: 'Repeat of existing script' },
            { value: 'new', label: 'New prescription' },
          ],
          validation: { required: true },
        },
        {
          id: 'medication_category',
          type: 'select',
          label: 'Medication category',
          options: [
            { value: 'contraceptive', label: 'Contraceptive pill' },
            { value: 'blood_pressure', label: 'Blood pressure' },
            { value: 'cholesterol', label: 'Cholesterol' },
            { value: 'asthma', label: 'Asthma/respiratory' },
            { value: 'diabetes', label: 'Diabetes' },
            { value: 'reflux', label: 'Reflux/heartburn' },
            { value: 'thyroid', label: 'Thyroid' },
            { value: 'skin', label: 'Skin conditions' },
            { value: 'other', label: 'Other' },
          ],
          validation: { required: true },
        },
        {
          id: 'medication_name',
          type: 'text',
          label: 'Medication name',
          placeholder: 'e.g., Metformin 500mg',
          validation: { required: true },
          helpText: 'Include strength if you know it',
        },
        {
          id: 'last_prescribed',
          type: 'radio',
          label: 'When was this last prescribed?',
          options: [
            { value: 'within_6mo', label: 'Within 6 months' },
            { value: '6mo_1yr', label: '6 months to 1 year' },
            { value: 'over_1yr', label: 'Over 1 year ago' },
            { value: 'never', label: 'Never (new medication)' },
          ],
          showIf: { fieldId: 'script_type', operator: 'equals', value: 'repeat' },
          validation: { required: true },
        },
        {
          id: 'reason_for_new',
          type: 'textarea',
          label: 'Why do you need this medication?',
          placeholder: 'Describe your condition briefly',
          showIf: { fieldId: 'script_type', operator: 'equals', value: 'new' },
          validation: { required: true, minLength: 20 },
        },
      ],
    },
    {
      id: 'safety',
      title: 'Safety check',
      fields: [
        {
          id: 'side_effects',
          type: 'radio',
          label: 'Any problems with this medication?',
          options: [
            { value: 'no', label: 'No issues - works well' },
            { value: 'minor', label: 'Minor side effects' },
            { value: 'major', label: 'Significant side effects' },
          ],
          showIf: { fieldId: 'script_type', operator: 'equals', value: 'repeat' },
          validation: { required: true },
        },
        {
          id: 'side_effect_details',
          type: 'textarea',
          label: 'What side effects?',
          showIf: { fieldId: 'side_effects', operator: 'not_equals', value: 'no' },
        },
        {
          id: 'allergies',
          type: 'radio',
          label: 'Any medication allergies?',
          options: [
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
          ],
          validation: { required: true },
        },
        {
          id: 'allergy_list',
          type: 'text',
          label: 'List allergies',
          showIf: { fieldId: 'allergies', operator: 'equals', value: 'yes' },
          validation: { required: true },
        },
        {
          id: 'other_medications',
          type: 'text',
          label: 'Other current medications',
          placeholder: 'List any other meds you take',
        },
      ],
    },
    {
      id: 'delivery',
      title: 'Delivery',
      fields: [
        {
          id: 'delivery_method',
          type: 'radio',
          label: 'How would you like your script?',
          options: [
            { value: 'escript', label: 'E-script (to your phone)' },
            { value: 'pharmacy', label: 'Send to pharmacy' },
          ],
          validation: { required: true },
        },
        {
          id: 'pharmacy_details',
          type: 'text',
          label: 'Pharmacy name & suburb',
          placeholder: 'e.g., Chemist Warehouse Bondi',
          showIf: { fieldId: 'delivery_method', operator: 'equals', value: 'pharmacy' },
        },
      ],
    },
  ],
}

export const commonScriptsConfig: FlowConfig = {
  id: 'common-scripts',
  serviceSlug: 'common-scripts',
  serviceName: 'Common Prescriptions',
  serviceDescription: 'Repeat scripts for ongoing medications',
  category: 'common-scripts',
  icon: 'Pill',
  steps: simplifiedSteps,
  questionnaire: commonScriptsQuestionnaire,
  pricing: {
    basePriceCents: 1995,
    priorityFeeCents: 1000,
  },
  requirements: {
    requiresAuth: false,
    requiresMedicare: false,
    requiresIdVerification: false,
  },
  estimatedTime: '~15 mins',
  features: ['No phone call needed', 'E-script available', 'Sent to your pharmacy', 'Medication review'],
}

// Keep prescription config as alias
export const prescriptionConfig = commonScriptsConfig

// ============================================
// WEIGHT MANAGEMENT CONFIG
// ============================================

const weightQuestionnaire: QuestionnaireConfig = {
  id: 'weight_v3',
  version: '3.0',
  eligibilityFields: [
    emergencyScreening,
    {
      id: 'age_check',
      type: 'radio',
      label: 'Are you 18 years or older?',
      options: [
        { value: 'yes', label: 'Yes, I\'m 18+' },
        { value: 'no', label: 'No', isDisqualifying: true },
      ],
      validation: { required: true },
      isRedFlag: true,
      redFlagMessage: 'You must be 18+ for weight management services.',
    },
    {
      id: 'pregnancy_check',
      type: 'radio',
      label: 'Are you pregnant, breastfeeding, or trying to conceive?',
      options: [
        { value: 'no', label: 'No' },
        { value: 'yes', label: 'Yes', isDisqualifying: true },
      ],
      validation: { required: true },
      isRedFlag: true,
      redFlagMessage: 'Weight loss medications aren\'t safe during pregnancy/breastfeeding.',
    },
  ],
  groups: [
    {
      id: 'measurements',
      title: 'Your measurements',
      description: 'Used to calculate your BMI and eligibility',
      fields: [
        {
          id: 'weight_kg',
          type: 'number',
          label: 'Current weight (kg)',
          placeholder: '85',
          validation: { required: true, min: 40, max: 300 },
        },
        {
          id: 'height_cm',
          type: 'number',
          label: 'Height (cm)',
          placeholder: '170',
          validation: { required: true, min: 120, max: 230 },
        },
        {
          id: 'goal_weight',
          type: 'number',
          label: 'Goal weight (kg)',
          placeholder: '75',
          validation: { required: true, min: 40, max: 200 },
        },
      ],
    },
    {
      id: 'history',
      title: 'Weight loss journey',
      fields: [
        {
          id: 'tried_before',
          type: 'multiselect',
          label: 'What have you tried? (select all that apply)',
          options: [
            { value: 'diet', label: 'Diet changes' },
            { value: 'exercise', label: 'Exercise' },
            { value: 'weight_watchers', label: 'Weight Watchers / programs' },
            { value: 'meal_replacement', label: 'Meal replacements' },
            { value: 'supplements', label: 'Supplements' },
            { value: 'medication', label: 'Prescription medication' },
            { value: 'none', label: 'Nothing yet' },
          ],
        },
        {
          id: 'motivation',
          type: 'radio',
          label: 'Main reason for weight loss?',
          options: [
            { value: 'health', label: 'Health improvement' },
            { value: 'energy', label: 'More energy' },
            { value: 'confidence', label: 'Confidence' },
            { value: 'doctor_advised', label: 'Doctor recommended' },
            { value: 'other', label: 'Other' },
          ],
          validation: { required: true },
        },
        {
          id: 'eating_disorder',
          type: 'radio',
          label: 'Any history of eating disorders?',
          options: [
            { value: 'no', label: 'No' },
            { value: 'past', label: 'Yes, in the past' },
            { value: 'current', label: 'Yes, currently', isDisqualifying: true },
          ],
          validation: { required: true },
          helpText: 'We ask to ensure safe and appropriate care.',
        },
      ],
    },
    {
      id: 'medical',
      title: 'Medical check',
      fields: [
        {
          id: 'conditions',
          type: 'multiselect',
          label: 'Any of these conditions?',
          options: [
            { value: 'diabetes', label: 'Type 2 diabetes' },
            { value: 'prediabetes', label: 'Prediabetes' },
            { value: 'pcos', label: 'PCOS' },
            { value: 'thyroid', label: 'Thyroid issues' },
            { value: 'heart', label: 'Heart condition' },
            { value: 'kidney', label: 'Kidney disease' },
            { value: 'none', label: 'None' },
          ],
        },
        {
          id: 'current_meds',
          type: 'text',
          label: 'Current medications',
          placeholder: 'List any medications',
        },
        {
          id: 'allergies',
          type: 'radio',
          label: 'Medication allergies?',
          options: [
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
          ],
          validation: { required: true },
        },
        {
          id: 'allergy_list',
          type: 'text',
          label: 'Allergies',
          showIf: { fieldId: 'allergies', operator: 'equals', value: 'yes' },
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
  serviceDescription: 'Medically supervised weight loss programs',
  category: 'weight-management',
  icon: 'Scale',
  steps: simplifiedSteps,
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
  estimatedTime: '~2 hours',
  features: ['Initial consultation', 'Ongoing support', 'Medication if suitable'],
}

// ============================================
// MEN'S HEALTH CONFIG
// ============================================

const mensHealthQuestionnaire: QuestionnaireConfig = {
  id: 'mens_health_v1',
  version: '1.0',
  eligibilityFields: [
    emergencyScreening,
    {
      id: 'gender_check',
      type: 'radio',
      label: 'Please confirm you identify as male or are seeking men\'s health services',
      options: [
        { value: 'yes', label: 'Yes, confirm' },
        { value: 'no', label: 'No - please try another service', isDisqualifying: true },
      ],
      validation: { required: true },
    },
    {
      id: 'age_check',
      type: 'radio',
      label: 'Are you 18 years or older?',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No', isDisqualifying: true },
      ],
      validation: { required: true },
    },
  ],
  groups: [
    {
      id: 'concern',
      title: 'What brings you in today?',
      fields: [
        {
          id: 'concern_type',
          type: 'radio',
          label: 'Primary concern',
          options: [
            { value: 'ed', label: 'Erectile function' },
            { value: 'pe', label: 'Premature concerns' },
            { value: 'hair', label: 'Hair loss' },
            { value: 'testosterone', label: 'Low energy / testosterone' },
            { value: 'sti_test', label: 'STI testing' },
            { value: 'other', label: 'Other men\'s health' },
          ],
          validation: { required: true },
        },
        {
          id: 'duration',
          type: 'radio',
          label: 'How long has this been an issue?',
          options: [
            { value: 'recent', label: 'Less than 1 month' },
            { value: 'few_months', label: '1-6 months' },
            { value: 'long_term', label: 'Over 6 months' },
          ],
          showIf: { fieldId: 'concern_type', operator: 'not_equals', value: 'sti_test' },
          validation: { required: true },
        },
        {
          id: 'previous_treatment',
          type: 'radio',
          label: 'Have you tried treatment before?',
          options: [
            { value: 'no', label: 'No, first time' },
            { value: 'yes_worked', label: 'Yes, it helped' },
            { value: 'yes_didnt', label: 'Yes, but didn\'t work well' },
          ],
          showIf: { fieldId: 'concern_type', operator: 'not_equals', value: 'sti_test' },
        },
        {
          id: 'previous_med',
          type: 'text',
          label: 'What did you try?',
          placeholder: 'Medication name',
          showIf: { fieldId: 'previous_treatment', operator: 'not_equals', value: 'no' },
        },
      ],
    },
    {
      id: 'health',
      title: 'Health background',
      fields: [
        {
          id: 'heart_conditions',
          type: 'radio',
          label: 'Any heart conditions or taking nitrates?',
          options: [
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
          ],
          validation: { required: true },
          helpText: 'Important for medication safety',
        },
        {
          id: 'heart_details',
          type: 'textarea',
          label: 'Please describe',
          showIf: { fieldId: 'heart_conditions', operator: 'equals', value: 'yes' },
          validation: { required: true },
        },
        {
          id: 'blood_pressure',
          type: 'radio',
          label: 'Blood pressure issues?',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High (on medication)' },
            { value: 'low', label: 'Low' },
            { value: 'unknown', label: 'Not sure' },
          ],
        },
        {
          id: 'current_meds',
          type: 'text',
          label: 'Current medications',
          placeholder: 'List any you take',
        },
        {
          id: 'allergies',
          type: 'text',
          label: 'Medication allergies',
          placeholder: 'None if no allergies',
        },
      ],
    },
  ],
}

export const mensHealthConfig: FlowConfig = {
  id: 'mens-health',
  serviceSlug: 'mens-health',
  serviceName: 'Men\'s Health',
  serviceDescription: 'ED, hair loss, and men\'s wellness',
  category: 'mens-health',
  icon: 'User',
  steps: simplifiedSteps,
  questionnaire: mensHealthQuestionnaire,
  pricing: {
    basePriceCents: 2995,
    priorityFeeCents: 1000,
  },
  requirements: {
    requiresAuth: true,
    requiresMedicare: false,
    requiresIdVerification: true,
    minAge: 18,
  },
  estimatedTime: '~1 hour',
  features: ['Discreet delivery', 'Ongoing support', 'Doctor chat available'],
}

// ============================================
// CONFIG REGISTRY
// ============================================

export const flowConfigs: Record<string, FlowConfig> = {
  'medical-certificate': medCertConfig,
  'med-cert': medCertConfig,
  'common-scripts': commonScriptsConfig,
  'prescription': commonScriptsConfig,
  'weight-management': weightConfig,
  'weight': weightConfig,
  'mens-health': mensHealthConfig,
}

export function getFlowConfig(serviceSlug: string): FlowConfig | null {
  return flowConfigs[serviceSlug] || null
}

export function getAllServiceSlugs(): string[] {
  return ['medical-certificate', 'common-scripts', 'weight-management', 'mens-health']
}

// Service categories for display
export const serviceCategories = [
  {
    slug: 'medical-certificate',
    name: 'Medical Certificate',
    description: 'Sick leave, carer\'s leave, or fitness certificates',
    price: '$29.95',
    time: '~15 mins',
    icon: 'FileText',
    popular: true,
    noCallRequired: true,
    features: ['No phone call needed', 'Same-day delivery', 'Employer-ready PDF', 'Backdating available'],
  },
  {
    slug: 'common-scripts',
    name: 'Repeat Prescriptions',
    description: 'Repeat scripts for ongoing medications',
    price: '$19.95',
    time: '~15 mins',
    icon: 'Pill',
    noCallRequired: true,
    features: ['No phone call needed', 'E-script available', 'Sent to your pharmacy'],
  },
  {
    slug: 'weight-management',
    name: 'Weight Management',
    description: 'Medically supervised weight loss programs',
    price: '$49.95',
    time: '~2 hours',
    icon: 'Scale',
    features: ['Initial consultation', 'Ongoing support', 'Medication if suitable'],
  },
  {
    slug: 'mens-health',
    name: 'Men\'s Health',
    description: 'ED, hair loss, and men\'s wellness',
    price: '$29.95',
    time: '~1 hour',
    icon: 'User',
    features: ['Discreet delivery', 'Ongoing support', 'Doctor chat'],
  },
]
