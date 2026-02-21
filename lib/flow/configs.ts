import type { FlowConfig, FlowStep, QuestionnaireConfig } from './types'
import { PRICING_DISPLAY } from "@/lib/constants"

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
//
// NOTE: These are client-side defaults. Server-side can override
// via feature flags (see lib/feature-flags.ts -> getSafetyScreeningSymptoms)
// To update symptoms without code deploy, use the feature_flags table
// with key: 'safety_screening_symptoms' and value: string[]
// ============================================

export const SAFETY_SCREENING_SYMPTOMS = [
  'Sudden, severe chest pain or pressure (new for you)',
  'Severe difficulty breathing at rest',
  'Sudden weakness or numbness on one side (stroke signs)',
  'Severe allergic reaction (throat swelling, can\'t breathe)',
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
          helpText: 'Cannot be more than 7 days ago',
          showIf: { fieldId: 'absence_dates', operator: 'equals', value: 'multi_day' },
          validation: { 
            required: true,
            // Dynamic constraint: max 7 days backdating (enforced by field-renderer)
            maxBackdateDays: 7,
          },
        },
        {
          id: 'end_date',
          type: 'date',
          label: 'End date',
          helpText: 'Maximum 3 days from start date',
          showIf: { fieldId: 'absence_dates', operator: 'equals', value: 'multi_day' },
          validation: { 
            required: true,
            // Dynamic constraint: max 3 days from start (enforced by field-renderer)
            maxDurationDays: 3,
            relativeToField: 'start_date',
          },
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
            { value: 'back_pain', label: 'Back pain' },
            { value: 'injury', label: 'Injury/accident' },
            { value: 'migraine', label: 'Migraine/headache' },
            { value: 'mental_health', label: 'Mental health' },
            { value: 'period_pain', label: 'Period pain' },
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
        {
          id: 'symptom_duration',
          type: 'segmented',
          label: 'How long have you had these symptoms?',
          helpText: 'Required for clinical assessment',
          options: [
            { value: 'less_than_24h', label: 'Less than 24 hours' },
            { value: '1_2_days', label: '1-2 days' },
            { value: '3_5_days', label: '3-5 days' },
            { value: '1_week_plus', label: 'Over a week' },
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
    basePriceCents: 1995,
    twoDayPriceCents: 2995,
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
      id: 'medicare_details',
      title: 'Medicare details',
      description: 'Required for e-script generation',
      fields: [
        {
          id: 'medicare_number',
          type: 'text',
          label: 'Medicare card number',
          placeholder: '1234 56789 0',
          helpText: 'The 10-digit number on your Medicare card',
          validation: { required: true, minLength: 10, maxLength: 12 },
        },
        {
          id: 'medicare_irn',
          type: 'text',
          label: 'Individual Reference Number (IRN)',
          placeholder: '1',
          helpText: 'The number next to your name on the card (1-9)',
          validation: { required: true, minLength: 1, maxLength: 1 },
        },
        {
          id: 'medicare_expiry',
          type: 'text',
          label: 'Card expiry date',
          placeholder: 'MM/YYYY',
          helpText: 'Valid to date shown on your card',
          validation: { required: true },
        },
      ],
    },
    {
      id: 'delivery',
      title: 'Delivery',
      description: 'Your e-script will be sent via SMS to your phone',
      fields: [
        {
          id: 'delivery_info',
          type: 'radio',
          label: 'How e-scripts work',
          description: 'Your e-script QR code will be sent directly to your phone via SMS. Take your phone to any pharmacy to have it dispensed.',
          options: [
            { value: 'understood', label: 'I understand - send to my phone' },
          ],
          validation: { required: true },
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
    basePriceCents: 2995,
    priorityFeeCents: 1000,
  },
  requirements: {
    requiresAuth: false,
    requiresMedicare: false,
    requiresIdVerification: false,
  },
  estimatedTime: '~15 mins',
  features: ['Doctor reviewed', 'E-script to your phone', 'Use at any pharmacy'],
}

// Keep prescription config as alias
export const prescriptionConfig = commonScriptsConfig

// ============================================
// GENERAL CONSULT CONFIG
// 6 Pathways: General, New Medication, Men's Health, Women's Health, Hair Loss, Weight Loss
// ============================================

const consultQuestionnaire: QuestionnaireConfig = {
  id: 'consult_v1',
  version: '1.0',
  eligibilityFields: [],
  groups: [
    // ============================================
    // GROUP 1: PATHWAY SELECTION
    // ============================================
    {
      id: 'pathway',
      title: 'What brings you in today?',
      description: 'Tell us what you need help with',
      fields: [
        {
          id: 'primary_concern',
          type: 'textarea',
          label: 'Describe your main concern',
          placeholder: 'Tell us in your own words what you\'d like help with today...',
          helpText: 'Be as detailed as you like — this helps our doctors understand your situation',
          validation: { required: true, minLength: 50, maxLength: 1000 },
        },
        {
          id: 'consult_pathway',
          type: 'select',
          label: 'What type of consultation is this?',
          helpText: 'This helps us show you the right questions',
          options: [
            { value: 'general', label: 'General health concern' },
            { value: 'new_medication', label: 'Request for new medication' },
            { value: 'mens_health', label: 'Men\'s health (e.g., erectile dysfunction)' },
            { value: 'womens_health', label: 'Women\'s health' },
            { value: 'hair_loss', label: 'Hair loss treatment' },
            { value: 'weight_loss', label: 'Weight management' },
          ],
          validation: { required: true },
        },
      ],
    },
    // ============================================
    // GROUP 2: GENERAL CONSULT QUESTIONS
    // ============================================
    {
      id: 'general_details',
      title: 'Tell us more about your concern',
      description: 'These questions help our doctor understand your situation',
      fields: [
        {
          id: 'general_duration',
          type: 'segmented',
          label: 'How long have you had this concern?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'general' },
          options: [
            { value: 'days', label: 'A few days' },
            { value: 'weeks', label: '1-4 weeks' },
            { value: 'months', label: '1-6 months' },
            { value: 'long_term', label: 'Over 6 months' },
          ],
          validation: { required: true },
        },
        {
          id: 'general_severity',
          type: 'segmented',
          label: 'How would you rate the severity?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'general' },
          options: [
            { value: 'mild', label: 'Mild' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'severe', label: 'Severe' },
          ],
          validation: { required: true },
        },
        {
          id: 'general_associated_symptoms',
          type: 'checkbox',
          label: 'Are you experiencing any of these?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'general' },
          options: [
            { value: 'fever', label: 'Fever or chills' },
            { value: 'fatigue', label: 'Unusual fatigue' },
            { value: 'pain', label: 'Pain or discomfort' },
            { value: 'sleep_issues', label: 'Sleep problems' },
            { value: 'appetite_change', label: 'Appetite changes' },
            { value: 'mood_change', label: 'Mood changes' },
            { value: 'none', label: 'None of the above' },
          ],
          validation: { required: true },
        },
        {
          id: 'general_past_history',
          type: 'checkbox',
          label: 'Do you have any of these conditions?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'general' },
          options: [
            { value: 'diabetes', label: 'Diabetes' },
            { value: 'heart_disease', label: 'Heart disease' },
            { value: 'high_bp', label: 'High blood pressure' },
            { value: 'asthma', label: 'Asthma or lung disease' },
            { value: 'mental_health', label: 'Mental health condition' },
            { value: 'autoimmune', label: 'Autoimmune condition' },
            { value: 'cancer', label: 'Cancer (current or past)' },
            { value: 'none', label: 'None of the above' },
          ],
          validation: { required: true },
        },
        {
          id: 'general_other_conditions',
          type: 'textarea',
          label: 'Any other medical conditions?',
          placeholder: 'List any other conditions not mentioned above...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'general' },
          validation: { required: false, maxLength: 500 },
        },
        {
          id: 'general_current_medications',
          type: 'textarea',
          label: 'What medications are you currently taking?',
          placeholder: 'e.g., Metformin 500mg twice daily, Vitamin D...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'general' },
          validation: { required: true, minLength: 2 },
        },
        {
          id: 'general_desired_outcome',
          type: 'checkbox',
          label: 'What are you hoping for from this consultation?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'general' },
          options: [
            { value: 'advice', label: 'Medical advice' },
            { value: 'treatment_plan', label: 'Treatment plan' },
            { value: 'prescription', label: 'Prescription medication' },
            { value: 'referral', label: 'Referral to specialist' },
            { value: 'test_results', label: 'Help understanding test results' },
            { value: 'second_opinion', label: 'Second opinion' },
          ],
          validation: { required: true },
        },
      ],
    },
    // ============================================
    // GROUP 3: NEW MEDICATION QUESTIONS
    // ============================================
    {
      id: 'new_med_details',
      title: 'New medication request',
      description: 'Help us understand what medication you need',
      fields: [
        {
          id: 'new_med_name',
          type: 'text',
          label: 'What medication are you requesting?',
          placeholder: 'e.g., Medication name and strength if known',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'new_medication' },
          validation: { required: true, minLength: 2 },
        },
        {
          id: 'new_med_reason',
          type: 'textarea',
          label: 'Why do you need this medication?',
          placeholder: 'Describe your condition and why you believe this medication would help...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'new_medication' },
          validation: { required: true, minLength: 30, maxLength: 500 },
        },
        {
          id: 'new_med_previous_use',
          type: 'segmented',
          label: 'Have you taken this medication before?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'new_medication' },
          options: [
            { value: 'yes_current', label: 'Yes, currently' },
            { value: 'yes_past', label: 'Yes, in the past' },
            { value: 'no', label: 'No, never' },
          ],
          validation: { required: true },
        },
        {
          id: 'new_med_side_effects',
          type: 'textarea',
          label: 'Did you experience any side effects?',
          placeholder: 'Describe any side effects you experienced...',
          showIf: { fieldId: 'new_med_previous_use', operator: 'not_equals', value: 'no' },
          validation: { required: false, maxLength: 300 },
        },
        {
          id: 'new_med_allergies',
          type: 'toggle',
          label: 'Do you have any medication allergies?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'new_medication' },
          validation: { required: true },
        },
        {
          id: 'new_med_allergy_details',
          type: 'textarea',
          label: 'List your allergies',
          placeholder: 'e.g., Penicillin - causes rash',
          showIf: { fieldId: 'new_med_allergies', operator: 'equals', value: true },
          validation: { required: true, minLength: 5 },
        },
        {
          id: 'new_med_current_meds',
          type: 'textarea',
          label: 'What other medications are you taking?',
          placeholder: 'List all current medications including supplements...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'new_medication' },
          validation: { required: true, minLength: 2 },
        },
        {
          id: 'new_med_conditions',
          type: 'checkbox',
          label: 'Do you have any of these conditions?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'new_medication' },
          options: [
            { value: 'liver_disease', label: 'Liver disease' },
            { value: 'kidney_disease', label: 'Kidney disease' },
            { value: 'heart_disease', label: 'Heart disease' },
            { value: 'pregnant_breastfeeding', label: 'Pregnant or breastfeeding' },
            { value: 'none', label: 'None of the above' },
          ],
          validation: { required: true },
        },
      ],
    },
    // ============================================
    // GROUP 4: MEN'S HEALTH QUESTIONS
    // ============================================
    {
      id: 'mens_health_details',
      title: 'Men\'s health assessment',
      description: 'Confidential questions to help our doctor assess your situation',
      fields: [
        // Age confirmation removed - DOB is captured in details step
        // Safety rules use derived age from DOB via patient_dob field
        {
          id: 'mens_concern_type',
          type: 'select',
          label: 'What is your main concern?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'mens_health' },
          options: [
            { value: 'ed', label: 'Erectile dysfunction' },
            { value: 'pe', label: 'Premature ejaculation' },
            { value: 'low_libido', label: 'Low libido / sex drive' },
            { value: 'other', label: 'Other men\'s health concern' },
          ],
          validation: { required: true },
        },
        {
          id: 'mens_duration',
          type: 'segmented',
          label: 'How long have you experienced this?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'mens_health' },
          options: [
            { value: 'weeks', label: 'A few weeks' },
            { value: 'months', label: '1-6 months' },
            { value: 'year_plus', label: 'Over 6 months' },
          ],
          validation: { required: true },
        },
        {
          id: 'mens_severity',
          type: 'segmented',
          label: 'How would you rate the severity?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'mens_health' },
          options: [
            { value: 'mild', label: 'Mild - occasional' },
            { value: 'moderate', label: 'Moderate - frequent' },
            { value: 'severe', label: 'Severe - always' },
          ],
          validation: { required: true },
        },
        {
          id: 'mens_morning_erections',
          type: 'segmented',
          label: 'Do you still have morning erections?',
          showIf: { fieldId: 'mens_concern_type', operator: 'equals', value: 'ed' },
          options: [
            { value: 'yes_regular', label: 'Yes, regularly' },
            { value: 'sometimes', label: 'Sometimes' },
            { value: 'rarely', label: 'Rarely or never' },
          ],
          validation: { required: true },
        },
        {
          id: 'mens_libido_change',
          type: 'segmented',
          label: 'Has your sex drive changed?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'mens_health' },
          options: [
            { value: 'same', label: 'No change' },
            { value: 'decreased', label: 'Decreased' },
            { value: 'significantly_decreased', label: 'Significantly decreased' },
          ],
          validation: { required: true },
        },
        {
          id: 'mens_cardiovascular',
          type: 'checkbox',
          label: 'Do you have any of these cardiovascular conditions?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'mens_health' },
          options: [
            { value: 'heart_attack', label: 'Previous heart attack' },
            { value: 'stroke', label: 'Previous stroke' },
            { value: 'angina', label: 'Angina (chest pain)' },
            { value: 'heart_failure', label: 'Heart failure' },
            { value: 'arrhythmia', label: 'Irregular heartbeat' },
            { value: 'high_bp', label: 'High blood pressure' },
            { value: 'none', label: 'None of the above' },
          ],
          validation: { required: true },
        },
        {
          id: 'mens_heart_meds',
          type: 'toggle',
          label: 'Are you taking any heart medications or nitrates?',
          helpText: 'e.g., GTN spray, Isosorbide, Nitroglycerin',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'mens_health' },
          validation: { required: true },
        },
        {
          id: 'mens_heart_meds_details',
          type: 'textarea',
          label: 'Which heart medications?',
          placeholder: 'List the heart medications you take...',
          showIf: { fieldId: 'mens_heart_meds', operator: 'equals', value: true },
          validation: { required: true, minLength: 3 },
        },
        {
          id: 'mens_blood_pressure',
          type: 'segmented',
          label: 'Do you know your blood pressure?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'mens_health' },
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
            { value: 'low', label: 'Low' },
            { value: 'unknown', label: "I don't know" },
          ],
          validation: { required: true },
        },
        {
          id: 'mens_lifestyle',
          type: 'checkbox',
          label: 'Which of these apply to you?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'mens_health' },
          options: [
            { value: 'smoker', label: 'Current smoker' },
            { value: 'heavy_alcohol', label: 'Heavy alcohol use (14+ drinks/week)' },
            { value: 'recreational_drugs', label: 'Recreational drug use' },
            { value: 'sedentary', label: 'Sedentary lifestyle' },
            { value: 'none', label: 'None of the above' },
          ],
          validation: { required: true },
        },
        {
          id: 'mens_current_meds',
          type: 'textarea',
          label: 'What medications are you currently taking?',
          placeholder: 'List all current medications...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'mens_health' },
          validation: { required: true, minLength: 2 },
        },
        {
          id: 'mens_tried_treatment',
          type: 'segmented',
          label: 'Have you tried any ED medications before?',
          showIf: { fieldId: 'mens_concern_type', operator: 'equals', value: 'ed' },
          options: [
            { value: 'yes_worked', label: 'Yes, worked well' },
            { value: 'yes_partial', label: 'Yes, partial effect' },
            { value: 'yes_didnt_work', label: 'Yes, didn\'t work' },
            { value: 'no', label: 'No, never tried' },
          ],
          validation: { required: true },
        },
        {
          id: 'mens_previous_treatment',
          type: 'text',
          label: 'Which medications have you tried?',
          placeholder: 'e.g., Sildenafil, Tadalafil...',
          showIf: { fieldId: 'mens_tried_treatment', operator: 'not_equals', value: 'no' },
          validation: { required: true, minLength: 3 },
        },
      ],
    },
    // ============================================
    // GROUP 5: WOMEN'S HEALTH QUESTIONS
    // ============================================
    {
      id: 'womens_health_details',
      title: 'Women\'s health assessment',
      description: 'Confidential questions to help our doctor assess your situation',
      fields: [
        {
          id: 'womens_concern_type',
          type: 'select',
          label: 'What is your main concern?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          options: [
            { value: 'contraception', label: 'Contraception' },
            { value: 'period_problems', label: 'Period problems' },
            { value: 'uti', label: 'Urinary tract infection (UTI)' },
            { value: 'thrush', label: 'Thrush / yeast infection' },
            { value: 'menopause', label: 'Menopause symptoms' },
            { value: 'pcos', label: 'PCOS management' },
            { value: 'other', label: 'Other women\'s health concern' },
          ],
          validation: { required: true },
        },
        {
          id: 'womens_age',
          type: 'number',
          label: 'What is your age?',
          placeholder: 'Your age',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          validation: { required: true, min: 18, max: 100 },
        },
        {
          id: 'womens_pregnancy_status',
          type: 'segmented',
          label: 'Are you currently pregnant or breastfeeding?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          options: [
            { value: 'no', label: 'No' },
            { value: 'pregnant', label: 'Pregnant' },
            { value: 'breastfeeding', label: 'Breastfeeding' },
            { value: 'trying', label: 'Trying to conceive' },
          ],
          validation: { required: true },
        },
        {
          id: 'womens_last_period',
          type: 'segmented',
          label: 'When was your last period?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          options: [
            { value: 'current', label: 'Currently on period' },
            { value: 'within_month', label: 'Within last month' },
            { value: 'over_month', label: 'Over a month ago' },
            { value: 'irregular', label: 'Irregular periods' },
            { value: 'menopause', label: 'No periods (menopause)' },
          ],
          validation: { required: true },
        },
        {
          id: 'womens_symptoms',
          type: 'textarea',
          label: 'Describe your symptoms',
          placeholder: 'Tell us about your symptoms and how they\'re affecting you...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          validation: { required: true, minLength: 20, maxLength: 500 },
        },
        {
          id: 'womens_duration',
          type: 'segmented',
          label: 'How long have you had these symptoms?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          options: [
            { value: 'days', label: 'A few days' },
            { value: 'weeks', label: '1-4 weeks' },
            { value: 'months', label: '1-6 months' },
            { value: 'long_term', label: 'Over 6 months' },
          ],
          validation: { required: true },
        },
        {
          id: 'womens_contraception_current',
          type: 'select',
          label: 'What contraception do you currently use?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          options: [
            { value: 'none', label: 'None' },
            { value: 'pill', label: 'Contraceptive pill' },
            { value: 'iud', label: 'IUD (Mirena/Copper)' },
            { value: 'implant', label: 'Implant (Implanon)' },
            { value: 'injection', label: 'Injection (Depo)' },
            { value: 'condoms', label: 'Condoms only' },
            { value: 'other', label: 'Other' },
          ],
          validation: { required: true },
        },
        {
          id: 'womens_blood_clot_history',
          type: 'toggle',
          label: 'Have you or a close family member had blood clots?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          validation: { required: true },
        },
        {
          id: 'womens_migraine_aura',
          type: 'toggle',
          label: 'Do you get migraines with warning signs like flashing lights, blind spots, or other visual disturbances?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          validation: { required: true },
        },
        {
          id: 'womens_smoker',
          type: 'toggle',
          label: 'Do you currently smoke?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          validation: { required: true },
        },
        {
          id: 'womens_over_35',
          type: 'toggle',
          label: 'Are you over 35 years old?',
          helpText: 'Important for assessing contraceptive options safely',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          validation: { required: true },
        },
        {
          id: 'womens_blood_pressure',
          type: 'segmented',
          label: 'Do you know if you have high blood pressure?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          options: [
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'unknown', label: "I don't know" },
          ],
          validation: { required: true },
        },
        {
          id: 'womens_current_meds',
          type: 'textarea',
          label: 'What medications are you currently taking?',
          placeholder: 'Include any supplements, vitamins, or herbal remedies...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'womens_health' },
          validation: { required: true, minLength: 2 },
        },
      ],
    },
    // ============================================
    // GROUP 6: HAIR LOSS QUESTIONS
    // ============================================
    {
      id: 'hair_loss_details',
      title: 'Hair loss assessment',
      description: 'Help us understand your hair loss situation',
      fields: [
        {
          id: 'hair_gender',
          type: 'segmented',
          label: 'What is your gender?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'hair_loss' },
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ],
          validation: { required: true },
        },
        // Age confirmation removed - DOB captured in details step
        {
          id: 'hair_loss_pattern',
          type: 'select',
          label: 'Where are you experiencing hair loss?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'hair_loss' },
          options: [
            { value: 'hairline', label: 'Receding hairline' },
            { value: 'crown', label: 'Crown / top of head' },
            { value: 'overall', label: 'Overall thinning' },
            { value: 'patches', label: 'Patches (alopecia)' },
            { value: 'multiple', label: 'Multiple areas' },
          ],
          validation: { required: true },
        },
        {
          id: 'hair_loss_duration',
          type: 'segmented',
          label: 'How long have you noticed hair loss?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'hair_loss' },
          options: [
            { value: 'months', label: '1-6 months' },
            { value: 'year', label: '6-12 months' },
            { value: 'years', label: 'Over a year' },
          ],
          validation: { required: true },
        },
        {
          id: 'hair_loss_speed',
          type: 'segmented',
          label: 'How quickly is your hair loss progressing?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'hair_loss' },
          options: [
            { value: 'slow', label: 'Slowly' },
            { value: 'moderate', label: 'Moderately' },
            { value: 'rapid', label: 'Rapidly' },
          ],
          validation: { required: true },
        },
        {
          id: 'hair_family_history',
          type: 'toggle',
          label: 'Is there a family history of hair loss?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'hair_loss' },
          validation: { required: true },
        },
        {
          id: 'hair_medical_conditions',
          type: 'checkbox',
          label: 'Do you have any of these conditions?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'hair_loss' },
          options: [
            { value: 'thyroid', label: 'Thyroid disorder' },
            { value: 'autoimmune', label: 'Autoimmune condition' },
            { value: 'scalp_condition', label: 'Scalp condition (psoriasis, eczema)' },
            { value: 'recent_illness', label: 'Recent major illness or surgery' },
            { value: 'none', label: 'None of the above' },
          ],
          validation: { required: true },
        },
        {
          id: 'hair_pregnancy_female',
          type: 'segmented',
          label: 'Are you pregnant, breastfeeding, or planning pregnancy?',
          showIf: { fieldId: 'hair_gender', operator: 'equals', value: 'female' },
          options: [
            { value: 'no', label: 'No' },
            { value: 'pregnant', label: 'Pregnant' },
            { value: 'breastfeeding', label: 'Breastfeeding' },
            { value: 'planning', label: 'Planning pregnancy' },
          ],
          validation: { required: true },
        },
        {
          id: 'hair_prostate_male',
          type: 'toggle',
          label: 'Do you have any prostate conditions?',
          showIf: { fieldId: 'hair_gender', operator: 'equals', value: 'male' },
          validation: { required: true },
        },
        {
          id: 'hair_tried_treatments',
          type: 'checkbox',
          label: 'Have you tried any hair loss treatments?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'hair_loss' },
          options: [
            { value: 'minoxidil', label: 'Minoxidil (Rogaine)' },
            { value: 'finasteride', label: 'Finasteride (Propecia)' },
            { value: 'supplements', label: 'Hair supplements' },
            { value: 'shampoos', label: 'Medicated shampoos' },
            { value: 'none', label: 'None' },
          ],
          validation: { required: true },
        },
        {
          id: 'hair_treatment_response',
          type: 'textarea',
          label: 'How did the treatments work for you?',
          placeholder: 'Tell us about your experience with previous treatments...',
          showIf: { fieldId: 'hair_tried_treatments', operator: 'not_includes', value: 'none' },
          validation: { required: false, maxLength: 300 },
        },
        {
          id: 'hair_current_meds',
          type: 'textarea',
          label: 'What medications are you currently taking?',
          placeholder: 'List all current medications...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'hair_loss' },
          validation: { required: true, minLength: 2 },
        },
      ],
    },
    // ============================================
    // GROUP 7: WEIGHT LOSS QUESTIONS
    // ============================================
    {
      id: 'weight_loss_details',
      title: 'Weight management assessment',
      description: 'Important questions to determine if weight loss medication is appropriate',
      fields: [
        // Age confirmation removed - DOB captured in details step
        // Safety rules check derived age >= 18 from patient_dob
        {
          id: 'weight_pregnancy_status',
          type: 'segmented',
          label: 'Are you pregnant, breastfeeding, or planning pregnancy?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          options: [
            { value: 'no', label: 'No' },
            { value: 'pregnant', label: 'Pregnant' },
            { value: 'breastfeeding', label: 'Breastfeeding' },
            { value: 'planning', label: 'Planning pregnancy' },
          ],
          validation: { required: true },
        },
        {
          id: 'weight_current_kg',
          type: 'number',
          label: 'What is your current weight (kg)?',
          placeholder: 'e.g., 85',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          validation: { required: true, min: 30, max: 300 },
        },
        {
          id: 'weight_height_cm',
          type: 'number',
          label: 'What is your height (cm)?',
          placeholder: 'e.g., 170',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          validation: { required: true, min: 100, max: 250 },
        },
        {
          id: 'weight_goal',
          type: 'textarea',
          label: 'What are your weight loss goals?',
          placeholder: 'Tell us about your goals and why you\'re seeking help...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          validation: { required: true, minLength: 20, maxLength: 300 },
        },
        {
          id: 'weight_tried_methods',
          type: 'checkbox',
          label: 'What have you tried for weight loss?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          options: [
            { value: 'diet', label: 'Diet changes' },
            { value: 'exercise', label: 'Exercise programs' },
            { value: 'supplements', label: 'Weight loss supplements' },
            { value: 'medication', label: 'Prescription medication' },
            { value: 'surgery', label: 'Bariatric surgery' },
            { value: 'none', label: 'None of the above' },
          ],
          validation: { required: true },
        },
        {
          id: 'weight_comorbidities',
          type: 'checkbox',
          label: 'Do you have any of these conditions?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          options: [
            { value: 'diabetes', label: 'Type 2 diabetes' },
            { value: 'prediabetes', label: 'Pre-diabetes' },
            { value: 'high_bp', label: 'High blood pressure' },
            { value: 'high_cholesterol', label: 'High cholesterol' },
            { value: 'sleep_apnea', label: 'Sleep apnea' },
            { value: 'pcos', label: 'PCOS' },
            { value: 'none', label: 'None of the above' },
          ],
          validation: { required: true },
        },
        {
          id: 'weight_cardiovascular',
          type: 'checkbox',
          label: 'Do you have any cardiovascular conditions?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          options: [
            { value: 'heart_attack', label: 'Previous heart attack' },
            { value: 'stroke', label: 'Previous stroke' },
            { value: 'heart_failure', label: 'Heart failure' },
            { value: 'arrhythmia', label: 'Irregular heartbeat' },
            { value: 'none', label: 'None of the above' },
          ],
          validation: { required: true },
        },
        {
          id: 'weight_eating_disorder',
          type: 'toggle',
          label: 'Do you have a history of eating disorders?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          validation: { required: true },
        },
        {
          id: 'weight_thyroid',
          type: 'toggle',
          label: 'Do you have a thyroid condition?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          validation: { required: true },
        },
        {
          id: 'weight_thyroid_details',
          type: 'text',
          label: 'What thyroid condition and is it treated?',
          placeholder: 'e.g., Hypothyroidism, on Thyroxine 100mcg',
          showIf: { fieldId: 'weight_thyroid', operator: 'equals', value: true },
          validation: { required: true, minLength: 5 },
        },
        {
          id: 'weight_men2_thyroid_cancer',
          type: 'toggle',
          label: 'Do you or any close family members have a history of thyroid cancer?',
          helpText: 'This is important for medication safety. If you\'re unsure, select No and mention it in your notes.',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          validation: { required: true },
        },
        {
          id: 'weight_pancreatitis',
          type: 'toggle',
          label: 'Have you ever had pancreatitis?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          validation: { required: true },
        },
        {
          id: 'weight_gallbladder',
          type: 'toggle',
          label: 'Do you have gallbladder disease or gallstones?',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          validation: { required: true },
        },
        {
          id: 'weight_current_meds',
          type: 'textarea',
          label: 'What medications are you currently taking?',
          placeholder: 'Include any diabetes medications, insulin, etc...',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          validation: { required: true, minLength: 2 },
        },
        {
          id: 'weight_medication_preference',
          type: 'select',
          label: 'Are you interested in any specific medication?',
          helpText: 'Our doctor will determine what\'s appropriate for you',
          showIf: { fieldId: 'consult_pathway', operator: 'equals', value: 'weight_loss' },
          options: [
            { value: 'open', label: 'Open to doctor\'s recommendation' },
            { value: 'injectable', label: 'Injectable option (if suitable)' },
            { value: 'oral', label: 'Oral medication (if suitable)' },
            { value: 'discuss', label: 'I\'d like to discuss options with the doctor' },
          ],
          validation: { required: true },
        },
      ],
    },
    // ============================================
    // GROUP 8: ALLERGIES (ALL PATHWAYS)
    // ============================================
    {
      id: 'allergies',
      title: 'Allergies',
      description: 'Important for your safety',
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
          label: 'List your allergies and reactions',
          placeholder: 'e.g., Penicillin - causes rash, Sulfa drugs - anaphylaxis',
          showIf: { fieldId: 'has_allergies', operator: 'equals', value: true },
          validation: { required: true, minLength: 5 },
        },
      ],
    },
  ],
}

export const consultConfig: FlowConfig = {
  id: 'consult',
  serviceSlug: 'consult',
  serviceName: 'Doctor Consultation',
  serviceDescription: 'Speak with an Australian doctor about any health concern',
  category: 'consult',
  icon: 'Stethoscope',
  steps: refinedSteps,
  questionnaire: consultQuestionnaire,
  pricing: {
    basePriceCents: 4995,
    priorityFeeCents: 1500,
  },
  requirements: {
    requiresAuth: false,
    requiresMedicare: false,
    requiresIdVerification: false,
  },
  estimatedTime: '~20 mins',
  features: ['Doctor reviewed', 'Personalized advice', 'Prescriptions if appropriate'],
}

// ============================================
// CONFIG REGISTRY
// ============================================

export const flowConfigs: Record<string, FlowConfig> = {
  'medical-certificate': medCertConfig,
  'med-cert': medCertConfig,
  'common-scripts': commonScriptsConfig,
  'prescription': commonScriptsConfig,
  'consult': consultConfig,
  'gp-consult': consultConfig, // backward compat for existing DB rows
}

export function getFlowConfig(serviceSlug: string): FlowConfig | null {
  return flowConfigs[serviceSlug] || null
}

export function getAllServiceSlugs(): string[] {
  return ['medical-certificate', 'common-scripts', 'consult']
}

// Service categories for display (per brand voice guidelines)
export const serviceCategories = [
  {
    slug: 'medical-certificate',
    name: 'Medical Certificate',
    description: 'Sick leave, carer\'s leave, or fitness certificates',
    price: PRICING_DISPLAY.MED_CERT,
    time: '~15 mins',
    icon: 'FileText',
    popular: true,
    features: ['Doctor reviewed', 'Same-day delivery', 'Employer-ready PDF'],
  },
  {
    slug: 'common-scripts',
    name: 'Repeat Prescription',
    description: 'Repeat scripts for ongoing medications',
    price: PRICING_DISPLAY.REPEAT_SCRIPT,
    time: '~15 mins',
    icon: 'Pill',
    features: ['Doctor reviewed', 'E-script to your phone', 'Use at any pharmacy'],
  },
  {
    slug: 'consult',
    name: 'Doctor Consultation',
    description: 'Speak with an Australian doctor about any health concern',
    price: PRICING_DISPLAY.CONSULT,
    time: '~20 mins',
    icon: 'Stethoscope',
    features: ['Doctor reviewed', 'Personalized advice', 'Prescriptions if appropriate'],
  },
]
