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
const _withServiceStep: FlowStep[] = [
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
// CONFIG REGISTRY
// ============================================

export const flowConfigs: Record<string, FlowConfig> = {
  'medical-certificate': medCertConfig,
  'med-cert': medCertConfig,
  'common-scripts': commonScriptsConfig,
  'prescription': commonScriptsConfig,
}

export function getFlowConfig(serviceSlug: string): FlowConfig | null {
  return flowConfigs[serviceSlug] || null
}

export function getAllServiceSlugs(): string[] {
  return ['medical-certificate', 'common-scripts']
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
]
