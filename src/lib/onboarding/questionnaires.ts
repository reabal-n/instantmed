import type { Questionnaire, QuestionConfig, QuestionGroup, EligibilityRule } from './types'
import type { ServiceType } from '@/types/database'

// ============================================
// SHARED QUESTIONS
// ============================================

const emergencyScreening: QuestionConfig[] = [
  {
    id: 'emergency_symptoms',
    type: 'checkbox',
    question: 'Are you currently experiencing any of the following?',
    description: 'Please check all that apply',
    required: true,
    options: [
      { value: 'chest_pain', label: 'Chest pain or pressure', isDisqualifying: true },
      { value: 'difficulty_breathing', label: 'Severe difficulty breathing', isDisqualifying: true },
      { value: 'sudden_weakness', label: 'Sudden weakness or numbness', isDisqualifying: true },
      { value: 'severe_headache', label: 'Sudden severe headache', isDisqualifying: true },
      { value: 'suicidal_thoughts', label: 'Thoughts of self-harm', isDisqualifying: true },
      { value: 'none', label: 'None of the above' },
    ],
    redFlagValues: ['chest_pain', 'difficulty_breathing', 'sudden_weakness', 'severe_headache', 'suicidal_thoughts'],
    whyWeAsk: 'These symptoms may require immediate emergency care.',
  },
]

const medicalHistory: QuestionGroup = {
  id: 'medical_history',
  title: 'Medical History',
  description: 'Help us understand your health background',
  questions: [
    {
      id: 'has_allergies',
      type: 'boolean',
      question: 'Do you have any allergies to medications?',
      required: true,
    },
    {
      id: 'allergy_details',
      type: 'textarea',
      question: 'Please list your allergies',
      required: true,
      showIf: { questionId: 'has_allergies', operator: 'equals', value: true },
      placeholder: 'e.g., Penicillin, Sulfa drugs...',
    },
    {
      id: 'has_current_medications',
      type: 'boolean',
      question: 'Are you currently taking any medications?',
      required: true,
      whyWeAsk: 'To check for potential drug interactions.',
    },
    {
      id: 'current_medications',
      type: 'textarea',
      question: 'Please list all current medications',
      required: true,
      showIf: { questionId: 'has_current_medications', operator: 'equals', value: true },
      placeholder: 'Include dosage if known...',
    },
    {
      id: 'has_medical_conditions',
      type: 'boolean',
      question: 'Do you have any chronic medical conditions?',
      required: true,
    },
    {
      id: 'medical_conditions',
      type: 'multiselect',
      question: 'Please select all conditions that apply',
      required: true,
      showIf: { questionId: 'has_medical_conditions', operator: 'equals', value: true },
      options: [
        { value: 'diabetes', label: 'Diabetes' },
        { value: 'hypertension', label: 'High blood pressure' },
        { value: 'heart_disease', label: 'Heart disease' },
        { value: 'asthma', label: 'Asthma' },
        { value: 'thyroid', label: 'Thyroid disorder' },
        { value: 'kidney_disease', label: 'Kidney disease' },
        { value: 'liver_disease', label: 'Liver disease' },
        { value: 'mental_health', label: 'Mental health condition' },
        { value: 'other', label: 'Other' },
      ],
    },
  ],
}

// ============================================
// WEIGHT LOSS QUESTIONNAIRE
// ============================================

const weightLossQuestionnaire: Questionnaire = {
  id: 'weight_loss_v1',
  version: '1.0',
  serviceType: 'weight_loss',
  eligibilityQuestions: [
    ...emergencyScreening,
    {
      id: 'age_check',
      type: 'boolean',
      question: 'Are you 18 years or older?',
      required: true,
    },
    {
      id: 'pregnancy_status',
      type: 'radio',
      question: 'Are you currently pregnant, breastfeeding, or trying to conceive?',
      required: true,
      options: [
        { value: 'not_pregnant', label: 'No' },
        { value: 'pregnant', label: 'Yes, I am pregnant', isDisqualifying: true },
        { value: 'breastfeeding', label: 'Yes, I am breastfeeding', isDisqualifying: true },
        { value: 'trying', label: 'Yes, trying to conceive', isDisqualifying: true },
      ],
      whyWeAsk: 'GLP-1 medications are not safe during pregnancy or breastfeeding.',
    },
    {
      id: 'eating_disorder_history',
      type: 'boolean',
      question: 'Have you ever been diagnosed with an eating disorder?',
      required: true,
      yellowFlagValues: [true],
    },
  ],
  questionGroups: [
    {
      id: 'weight_info',
      title: 'Weight Information',
      questions: [
        {
          id: 'current_weight',
          type: 'number',
          question: 'What is your current weight?',
          placeholder: 'Weight in kg',
          required: true,
          min: 30,
          max: 300,
        },
        {
          id: 'height',
          type: 'number',
          question: 'What is your height?',
          placeholder: 'Height in cm',
          required: true,
          min: 100,
          max: 250,
        },
        {
          id: 'target_weight',
          type: 'number',
          question: 'What is your target weight?',
          placeholder: 'Target in kg',
          required: true,
          min: 30,
          max: 300,
        },
        {
          id: 'weight_loss_attempts',
          type: 'multiselect',
          question: 'What weight loss methods have you tried before?',
          options: [
            { value: 'diet', label: 'Diet changes' },
            { value: 'exercise', label: 'Exercise' },
            { value: 'meal_replacement', label: 'Meal replacements' },
            { value: 'prescription', label: 'Prescription medication' },
            { value: 'surgery', label: 'Bariatric surgery' },
            { value: 'none', label: 'None' },
          ],
        },
      ],
    },
    medicalHistory,
    {
      id: 'lifestyle',
      title: 'Lifestyle',
      questions: [
        {
          id: 'exercise_frequency',
          type: 'radio',
          question: 'How often do you exercise?',
          required: true,
          options: [
            { value: 'never', label: 'Never' },
            { value: 'rarely', label: '1-2 times per month' },
            { value: 'sometimes', label: '1-2 times per week' },
            { value: 'often', label: '3-4 times per week' },
            { value: 'daily', label: 'Daily' },
          ],
        },
        {
          id: 'alcohol_consumption',
          type: 'radio',
          question: 'How often do you consume alcohol?',
          required: true,
          options: [
            { value: 'never', label: 'Never' },
            { value: 'rarely', label: 'Rarely' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'daily', label: 'Daily' },
          ],
        },
      ],
    },
  ],
}

// ============================================
// MED CERT QUESTIONNAIRE
// ============================================

const medCertQuestionnaire: Questionnaire = {
  id: 'med_cert_v1',
  version: '1.0',
  serviceType: 'med_certs',
  eligibilityQuestions: [
    ...emergencyScreening,
    {
      id: 'current_condition',
      type: 'boolean',
      question: 'Are you currently unwell or recovering from an illness/injury?',
      required: true,
    },
  ],
  questionGroups: [
    {
      id: 'absence_details',
      title: 'Absence Details',
      questions: [
        {
          id: 'absence_reason',
          type: 'radio',
          question: 'What is the reason for your absence?',
          required: true,
          options: [
            { value: 'illness', label: 'Illness (cold, flu, etc.)' },
            { value: 'injury', label: 'Injury' },
            { value: 'mental_health', label: 'Mental health day' },
            { value: 'medical_appointment', label: 'Medical appointment' },
            { value: 'caring', label: 'Caring for sick family member' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          id: 'absence_start_date',
          type: 'date',
          question: 'Start date of absence',
          required: true,
        },
        {
          id: 'absence_end_date',
          type: 'date',
          question: 'End date of absence',
          required: true,
        },
        {
          id: 'employer_name',
          type: 'text',
          question: 'Employer or institution name (optional)',
          placeholder: 'e.g., ABC Company',
        },
      ],
    },
    {
      id: 'symptoms',
      title: 'Symptoms',
      questions: [
        {
          id: 'symptom_description',
          type: 'textarea',
          question: 'Please describe your symptoms',
          required: true,
          placeholder: 'Describe what you are experiencing...',
          minLength: 20,
        },
        {
          id: 'symptom_severity',
          type: 'radio',
          question: 'How severe are your symptoms?',
          required: true,
          options: [
            { value: 'mild', label: 'Mild - Can manage with rest' },
            { value: 'moderate', label: 'Moderate - Significantly affecting daily activities' },
            { value: 'severe', label: 'Severe - Unable to perform daily activities' },
          ],
        },
        {
          id: 'symptom_duration',
          type: 'radio',
          question: 'How long have you had these symptoms?',
          required: true,
          options: [
            { value: 'today', label: 'Started today' },
            { value: '1-3_days', label: '1-3 days' },
            { value: '4-7_days', label: '4-7 days' },
            { value: 'over_week', label: 'Over a week' },
          ],
        },
      ],
    },
  ],
}

// ============================================
// MEN'S HEALTH (ED) QUESTIONNAIRE
// ============================================

const mensHealthEDQuestionnaire: Questionnaire = {
  id: 'mens_health_ed_v1',
  version: '1.0',
  serviceType: 'mens_health',
  eligibilityQuestions: [
    ...emergencyScreening,
    {
      id: 'age_check',
      type: 'boolean',
      question: 'Are you 18 years or older?',
      required: true,
    },
    {
      id: 'biological_male',
      type: 'boolean',
      question: 'Were you assigned male at birth?',
      required: true,
    },
    {
      id: 'nitrates',
      type: 'boolean',
      question: 'Are you currently taking nitrate medications (e.g., for angina)?',
      required: true,
      redFlagValues: [true],
      whyWeAsk: 'ED medications can cause dangerous drops in blood pressure when combined with nitrates.',
    },
    {
      id: 'recent_heart_event',
      type: 'boolean',
      question: 'Have you had a heart attack or stroke in the last 6 months?',
      required: true,
      redFlagValues: [true],
    },
  ],
  questionGroups: [
    {
      id: 'ed_history',
      title: 'About Your Condition',
      questions: [
        {
          id: 'ed_duration',
          type: 'radio',
          question: 'How long have you experienced erectile difficulties?',
          required: true,
          options: [
            { value: 'less_1_month', label: 'Less than 1 month' },
            { value: '1-6_months', label: '1-6 months' },
            { value: '6-12_months', label: '6-12 months' },
            { value: 'over_1_year', label: 'Over 1 year' },
          ],
        },
        {
          id: 'ed_frequency',
          type: 'radio',
          question: 'How often do you experience difficulties?',
          required: true,
          options: [
            { value: 'sometimes', label: 'Sometimes (less than half the time)' },
            { value: 'often', label: 'Often (more than half the time)' },
            { value: 'always', label: 'Always or almost always' },
          ],
        },
        {
          id: 'morning_erections',
          type: 'radio',
          question: 'Do you experience morning erections?',
          required: true,
          options: [
            { value: 'regularly', label: 'Yes, regularly' },
            { value: 'sometimes', label: 'Sometimes' },
            { value: 'rarely', label: 'Rarely or never' },
          ],
          whyWeAsk: 'This helps distinguish between physical and psychological causes.',
        },
      ],
    },
    medicalHistory,
    {
      id: 'cardiovascular',
      title: 'Cardiovascular Health',
      questions: [
        {
          id: 'cardio_conditions',
          type: 'multiselect',
          question: 'Do you have any of the following conditions?',
          options: [
            { value: 'hypertension', label: 'High blood pressure' },
            { value: 'heart_disease', label: 'Heart disease' },
            { value: 'arrhythmia', label: 'Heart rhythm problems' },
            { value: 'high_cholesterol', label: 'High cholesterol' },
            { value: 'diabetes', label: 'Diabetes' },
            { value: 'none', label: 'None of the above' },
          ],
          riskWeight: 2,
        },
      ],
    },
  ],
}

// ============================================
// QUESTIONNAIRE REGISTRY
// ============================================

export const questionnaires: Record<string, Questionnaire> = {
  'weight-loss': weightLossQuestionnaire,
  'med-cert-sick': medCertQuestionnaire,
  'med-cert-carer': medCertQuestionnaire,
  'mens-health-ed': mensHealthEDQuestionnaire,
}

export function getQuestionnaire(serviceSlug: string): Questionnaire | null {
  return questionnaires[serviceSlug] || null
}

// ============================================
// ELIGIBILITY RULES
// ============================================

export const eligibilityRules: Record<string, EligibilityRule[]> = {
  'weight-loss': [
    {
      questionId: 'age_check',
      operator: 'equals',
      value: false,
      failMessage: 'You must be 18 years or older for this service.',
      isHardStop: true,
    },
    {
      questionId: 'pregnancy_status',
      operator: 'not_equals',
      value: 'not_pregnant',
      failMessage: 'This service is not available during pregnancy or breastfeeding.',
      isHardStop: true,
    },
  ],
  'mens-health-ed': [
    {
      questionId: 'nitrates',
      operator: 'equals',
      value: true,
      failMessage: 'ED medications cannot be prescribed while taking nitrates. Please consult your doctor.',
      isHardStop: true,
    },
    {
      questionId: 'recent_heart_event',
      operator: 'equals',
      value: true,
      failMessage: 'Due to your recent cardiovascular event, we recommend consulting a specialist.',
      isHardStop: true,
    },
  ],
}

export function getEligibilityRules(serviceSlug: string): EligibilityRule[] {
  return eligibilityRules[serviceSlug] || []
}
