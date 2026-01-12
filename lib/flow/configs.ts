import type { FlowConfig, FlowStep, QuestionnaireConfig } from './types'

// ============================================
// 5-STEP MODEL PER REFINED SPEC
// ============================================

const refinedSteps: FlowStep[] = [
  { id: 'safety', label: 'Safety check', shortLabel: 'Safety' },
  { id: 'questions', label: 'Health questions', shortLabel: 'Questions' },
  { id: 'details', label: 'Your details', shortLabel: 'Details' },
  { id: 'checkout', label: 'Review & pay', shortLabel: 'Pay' },
]

// ============================================
// SAFETY SCREENING SYMPTOMS (Step 2 - Hard Gate)
// Displayed in dedicated SafetyStep component
// Uses iOS-style toggle for confirmation
// ============================================

export const SAFETY_SCREENING_SYMPTOMS = [
  'Chest pain or pressure',
  'Severe difficulty breathing',
  'Sudden weakness on one side (stroke signs)',
  'Severe allergic reaction (swelling, can\'t breathe)',
  'Thoughts of self-harm or suicide',
]

// ============================================
// MEDICAL CERTIFICATE CONFIG
// Per spec: 3-day max, all text fields mandatory
// ============================================

const medCertQuestionnaire: QuestionnaireConfig = {
  id: 'med_cert_v4',
  version: '4.0',
  eligibilityFields: [], // Safety now handled in dedicated step
  groups: [
    {
      id: 'certificate',
      title: 'Certificate details',
      description: 'Tell us about the certificate you need',
      fields: [
        {
          id: 'certificate_type',
          type: 'segmented',
          label: 'What type of certificate do you need?',
          options: [
            { value: 'sick_leave', label: 'Sick leave' },
            { value: 'carers_leave', label: 'Carer\'s leave' },
            { value: 'fitness', label: 'Fitness for work/study' },
          ],
          validation: { required: true },
        },
        {
          id: 'absence_dates',
          type: 'segmented',
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
          description: 'Earliest: yesterday',
          showIf: { fieldId: 'absence_dates', operator: 'equals', value: 'multi_day' },
          validation: { required: true },
        },
        {
          id: 'end_date',
          type: 'date',
          label: 'End date',
          description: 'Maximum 3 days total',
          showIf: { fieldId: 'absence_dates', operator: 'equals', value: 'multi_day' },
          validation: { required: true },
        },
        {
          id: 'employer_name',
          type: 'text',
          label: 'Employer or institution name',
          placeholder: 'Will appear on certificate',
          validation: { required: true, minLength: 2 },
        },
      ],
    },
    {
      id: 'condition',
      title: 'Your condition',
      description: 'Help us understand what you\'re experiencing',
      fields: [
        {
          id: 'reason_category',
          type: 'segmented',
          label: 'What is the main reason for your absence?',
          options: [
            { value: 'cold_flu', label: 'Cold/flu/respiratory' },
            { value: 'gastro', label: 'Stomach/digestive' },
            { value: 'injury', label: 'Injury/pain' },
            { value: 'mental_health', label: 'Mental health' },
            { value: 'migraine', label: 'Migraine/headache' },
            { value: 'other', label: 'Other' },
          ],
          validation: { required: true },
        },
        {
          id: 'symptoms_description',
          type: 'textarea',
          label: 'Describe your symptoms and how they\'re affecting you',
          placeholder: 'e.g., I\'ve had a fever since yesterday, severe body aches, and I can\'t concentrate at work...',
          helpText: 'This helps the doctor write your certificate',
          validation: { required: true, minLength: 20, maxLength: 500 },
        },
        {
          id: 'severity',
          type: 'segmented',
          label: 'How severe are your symptoms?',
          options: [
            { value: 'mild', label: 'Mild' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'severe', label: 'Severe' },
          ],
          validation: { required: true },
        },
      ],
    },
    {
      id: 'medical_background',
      title: 'Medical background',
      description: 'A few quick questions for safety',
      fields: [
        {
          id: 'has_allergies',
          type: 'toggle',
          label: 'Do you have any medication allergies?',
          validation: { required: true },
        },
        {
          id: 'allergy_details',
          type: 'textarea',
          label: 'List your allergies',
          placeholder: 'e.g., Penicillin - causes rash',
          showIf: { fieldId: 'has_allergies', operator: 'equals', value: true },
          validation: { required: true, minLength: 5 },
        },
        {
          id: 'takes_medications',
          type: 'toggle',
          label: 'Are you currently taking any medications?',
          validation: { required: true },
        },
        {
          id: 'medication_details',
          type: 'textarea',
          label: 'List your current medications',
          placeholder: 'e.g., Paracetamol 500mg twice daily',
          showIf: { fieldId: 'takes_medications', operator: 'equals', value: true },
          validation: { required: true, minLength: 5 },
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
  steps: refinedSteps,
  questionnaire: medCertQuestionnaire,
  pricing: {
    basePriceCents: 2995,
    priorityFeeCents: 1000,
  },
  requirements: {
    requiresAuth: false,
    requiresMedicare: false,
    requiresIdVerification: false,
  },
  estimatedTime: '~15 mins',
  features: ['Doctor reviewed', 'Same-day delivery', 'Employer-ready PDF'],
}

// ============================================
// REPEAT PRESCRIPTION CONFIG
// Per spec: all text fields mandatory with minimums
// ============================================

const prescriptionQuestionnaire: QuestionnaireConfig = {
  id: 'prescription_v2',
  version: '2.0',
  eligibilityFields: [], // Safety now handled in dedicated step
  groups: [
    {
      id: 'medication',
      title: 'Your medication',
      description: 'Tell us about the medication you need',
      fields: [
        {
          id: 'script_type',
          type: 'segmented',
          label: 'What type of script do you need?',
          options: [
            { value: 'repeat', label: 'Repeat of existing script' },
            { value: 'new', label: 'New prescription' },
          ],
          validation: { required: true },
        },
        {
          id: 'medication_category',
          type: 'select',
          label: 'What category of medication?',
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
          label: 'Medication name and strength',
          placeholder: 'e.g., Metformin 500mg',
          helpText: 'Start typing to search. Doctor will review.',
          validation: { required: true, minLength: 3 },
        },
        {
          id: 'last_prescribed',
          type: 'segmented',
          label: 'When was this medication last prescribed to you?',
          options: [
            { value: 'within_6mo', label: 'Within 6 months' },
            { value: '6mo_1yr', label: '6-12 months ago' },
            { value: 'over_1yr', label: 'Over 1 year ago' },
          ],
          showIf: { fieldId: 'script_type', operator: 'equals', value: 'repeat' },
          validation: { required: true },
        },
        {
          id: 'reason_for_new',
          type: 'textarea',
          label: 'Why do you need this medication?',
          placeholder: 'Describe your condition and why you believe this medication is appropriate...',
          helpText: 'This helps the doctor assess your request',
          showIf: { fieldId: 'script_type', operator: 'equals', value: 'new' },
          validation: { required: true, minLength: 30, maxLength: 500 },
        },
      ],
    },
    {
      id: 'safety_check',
      title: 'Safety check',
      description: 'Important questions about your medication history',
      fields: [
        {
          id: 'side_effects',
          type: 'segmented',
          label: 'Have you experienced any problems or side effects with this medication?',
          options: [
            { value: 'no', label: 'No issues' },
            { value: 'minor', label: 'Minor side effects' },
            { value: 'major', label: 'Significant side effects' },
          ],
          showIf: { fieldId: 'script_type', operator: 'equals', value: 'repeat' },
          validation: { required: true },
        },
        {
          id: 'side_effect_details',
          type: 'textarea',
          label: 'Describe the side effects you\'ve experienced',
          placeholder: 'e.g., Mild nausea for the first few days...',
          showIf: { fieldId: 'side_effects', operator: 'not_equals', value: 'no' },
          validation: { required: true, minLength: 10 },
        },
        {
          id: 'has_allergies',
          type: 'toggle',
          label: 'Do you have any medication allergies?',
          validation: { required: true },
        },
        {
          id: 'allergy_details',
          type: 'textarea',
          label: 'List your allergies',
          placeholder: 'e.g., Penicillin - causes rash',
          showIf: { fieldId: 'has_allergies', operator: 'equals', value: true },
          validation: { required: true, minLength: 5 },
        },
        {
          id: 'takes_other_meds',
          type: 'toggle',
          label: 'Are you taking any other medications?',
          validation: { required: true },
        },
        {
          id: 'other_medication_details',
          type: 'textarea',
          label: 'List your other medications',
          placeholder: 'e.g., Aspirin 100mg daily, Vitamin D...',
          showIf: { fieldId: 'takes_other_meds', operator: 'equals', value: true },
          validation: { required: true, minLength: 5 },
        },
      ],
    },
    {
      id: 'delivery',
      title: 'Delivery',
      description: 'How would you like to receive your script?',
      fields: [
        {
          id: 'delivery_method',
          type: 'segmented',
          label: 'How would you like to receive your script?',
          options: [
            { value: 'escript', label: 'E-script (to your phone)' },
            { value: 'pharmacy', label: 'Send to pharmacy' },
          ],
          validation: { required: true },
        },
        {
          id: 'pharmacy_details',
          type: 'text',
          label: 'Pharmacy name and suburb',
          placeholder: 'e.g., Chemist Warehouse Bondi',
          showIf: { fieldId: 'delivery_method', operator: 'equals', value: 'pharmacy' },
          validation: { required: true, minLength: 5 },
        },
      ],
    },
  ],
}

export const commonScriptsConfig: FlowConfig = {
  id: 'common-scripts',
  serviceSlug: 'common-scripts',
  serviceName: 'Repeat Prescription',
  serviceDescription: 'Repeat scripts for ongoing medications',
  category: 'common-scripts',
  icon: 'Pill',
  steps: refinedSteps,
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
  estimatedTime: '~15 mins',
  features: ['Doctor reviewed', 'E-script available', 'Sent to your pharmacy'],
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

// Service categories for display (per brand voice guidelines)
export const serviceCategories = [
  {
    slug: 'medical-certificate',
    name: 'Medical Certificate',
    description: 'Sick leave, carer\'s leave, or fitness certificates',
    price: '$19.95',
    time: '~15 mins',
    icon: 'FileText',
    popular: true,
    features: ['Doctor reviewed', 'Same-day delivery', 'Employer-ready PDF'],
  },
  {
    slug: 'common-scripts',
    name: 'Repeat Prescription',
    description: 'Repeat scripts for ongoing medications',
    price: '$29.95',
    time: '~15 mins',
    icon: 'Pill',
    features: ['Doctor reviewed', 'E-script available', 'Sent to your pharmacy'],
  },
]
