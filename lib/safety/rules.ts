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
    id: 'medcert_backdated_excessive',
    name: 'Excessive Backdating Request',
    description: 'Certificate backdated more than 7 days - P1 MC-3 hard limit per MEDICOLEGAL_AUDIT_REPORT',
    conditions: [
      {
        fieldId: 'backdating_days',
        operator: 'gt',
        value: 7,
        derivedFrom: {
          type: 'duration_days',
          fields: ['start_date', 'today'],
        },
      },
    ],
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'We\'re unable to issue certificates backdated more than 7 days. For absences this far in the past, please see your regular GP who can review your medical records.',
    doctorNote: 'Backdating >7 days requested - declined per RACGP guidance. Patient advised to see regular GP.',
    priority: 600,
    services: ['medical-certificate'],
  },
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
          fields: ['start_date', 'today'],
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
  // AUDIT FIX: Future-dated certificates must be declined.
  // Uses signed_days (start_date - today): positive = future date.
  {
    id: 'medcert_future_date',
    name: 'Future-dated certificate',
    description: 'Certificate start date cannot be in the future',
    conditions: [
      {
        fieldId: 'future_days',
        operator: 'gt',
        value: 0,
        derivedFrom: {
          type: 'signed_days',
          fields: ['today', 'start_date'], // positive when start_date is after today
        },
      },
    ],
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Medical certificates cannot be issued for future dates. The start date must be today or in the past.',
    doctorNote: 'Future-dated certificate requested - declined. Certificates can only cover past or current dates.',
    priority: 600,
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
          fields: ['start_date', 'end_date'],
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
    description: 'Patient reports severe symptoms - not yet collected in intake UI',
    conditions: [
      // symptom_severity is not collected by any med cert intake step.
      // Rule is aspirational - will fire once severity field is added to the flow.
      { fieldId: 'symptom_severity', operator: 'equals', value: 'severe', derivedFrom: { type: 'duration_days', fields: ['symptoms'] } },
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
    description: 'Absence reason is mental health - not yet collected in intake UI',
    conditions: [
      // absence_reason is not collected by any med cert intake step.
      // Rule is aspirational - will fire once absence reason field is added to the flow.
      { fieldId: 'absence_reason', operator: 'equals', value: 'mental_health', derivedFrom: { type: 'duration_days', fields: ['symptoms'] } },
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
    description: 'Request for S8 or controlled medication - defense-in-depth (also blocked by isControlledSubstance() in checkout action and medication step UI)',
    conditions: [
      {
        fieldId: 'is_controlled',
        operator: 'equals',
        value: true,
        // Derived: determined by isControlledSubstance() regex against the selected
        // medication name. The medication step blocks S8 drugs client-side and the
        // checkout action blocks them server-side, so this rule is a safety net.
        derivedFrom: { type: 'duration_days', fields: ['medicationName'] },
      },
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
      { fieldId: 'prescriptionHistory', operator: 'equals', value: 'first_time' },
      { fieldId: 'conditions', operator: 'is_not_empty' },
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
          fields: ['conditions'],
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
      { fieldId: 'otherMedications', operator: 'is_not_empty' },
      {
        fieldId: 'has_interaction_risk',
        operator: 'equals',
        value: true,
        // Derived: would be calculated from medication + otherMedications interaction check.
        // Currently not implemented - rule acts as a future hook for drug interaction screening.
        derivedFrom: { type: 'duration_days', fields: ['otherMedications', 'medicationName'] },
      },
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
// CONSULT / MEN'S HEALTH RULES
// ============================================

const consultRules: SafetyRule[] = [
  ...emergencyRules,
  // ----------------------------------------
  // ABSOLUTE CONTRAINDICATION: Nitrates + PDE5 inhibitors
  // Clinical: Sildenafil/tadalafil + nitrates = severe hypotension, potentially fatal
  // TGA/AHPRA requirement - cannot prescribe ED meds to patients on nitrates
  // ----------------------------------------
  {
    id: 'ed_nitrate_contraindication',
    name: 'Nitrate Use - ED Contraindication',
    description: 'Patient is taking nitrates and requesting ED medication - absolute contraindication. Defense-in-depth: ED safety step also hard-blocks nitrate users.',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'ed' },
      { fieldId: 'edNitrates', operator: 'equals', value: true },
    ],
    conditionLogic: 'AND',
    outcome: 'DECLINE',
    riskTier: 'critical',
    patientMessage: 'ED medications (like Viagra or Cialis) cannot be safely used with nitrate medications (like GTN spray or Isosorbide). This combination can cause a dangerous drop in blood pressure. Please speak with your regular GP about safe alternatives.',
    doctorNote: 'Patient on nitrates requesting ED medication - absolute contraindication per TGA guidelines. Declined for safety.',
    priority: 950,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // HIGH RISK: Recent cardiovascular event + ED
  // ----------------------------------------
  {
    id: 'ed_recent_cardiac_event',
    name: 'Recent Cardiac Event - ED',
    description: 'Patient had heart attack or stroke and requesting ED medication without reported GP clearance. Defense-in-depth: ED safety step also requires clearance.',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'ed' },
      { fieldId: 'edRecentHeartEvent', operator: 'equals', value: true },
      { fieldId: 'edGpCleared', operator: 'not_equals', value: true },
    ],
    conditionLogic: 'AND',
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Due to your cardiovascular history, ED medications may not be safe for you. Please consult with your cardiologist or regular GP who knows your full medical history.',
    doctorNote: 'History of MI/stroke - ED medications require in-person cardiology clearance',
    priority: 900,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // MEDIUM RISK: Uncontrolled blood pressure + ED
  // ----------------------------------------
  {
    id: 'ed_uncontrolled_bp',
    name: 'Uncontrolled Blood Pressure - ED',
    description: 'Patient reports severe heart condition and requesting ED medication without reported GP clearance. Defense-in-depth: ED safety step also requires clearance.',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'ed' },
      { fieldId: 'edSevereHeart', operator: 'equals', value: true },
      { fieldId: 'edGpCleared', operator: 'not_equals', value: true },
    ],
    conditionLogic: 'AND',
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'ED medications can affect blood pressure. Since you\'ve indicated high blood pressure, we\'d like to have a quick chat to ensure we can help you safely.',
    doctorNote: 'High BP reported - phone assessment needed before ED medication',
    priority: 600,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // UNDER 18: Age restriction for men's health (derived from DOB)
  // ----------------------------------------
  {
    id: 'mens_health_under_18',
    name: 'Under 18 - Men\'s Health',
    description: 'Patient is under 18 for men\'s health consultation',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'ed' },
      { 
        fieldId: 'patient_age',
        operator: 'lt',
        value: 18,
        derivedFrom: {
          type: 'age',
          fields: ['patient_dob'],
        },
      },
    ],
    conditionLogic: 'AND',
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'This service is only available for adults 18 years and over. Please speak with your GP or a youth health service.',
    doctorNote: 'Patient under 18 - not eligible for men\'s health program',
    priority: 900,
    services: ['gp-consult', 'consult'],
  },
  // ============================================
  // WOMEN'S HEALTH / OCP WHOMEC RULES
  // Based on WHO Medical Eligibility Criteria for contraceptives
  // ============================================
  // ----------------------------------------
  // BLOOD CLOT HISTORY - Absolute contraindication for combined OCP
  // ----------------------------------------
  {
    id: 'ocp_blood_clot_contraindication',
    name: 'Blood Clot History - OCP Contraindication',
    description: 'Patient has personal or family history of blood clots - absolute contraindication for combined OCP. Not yet collected in intake UI.',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'womens_health' },
      { fieldId: 'contraceptionType', operator: 'is_not_empty' },
      // womens_blood_clot_history: not yet collected by women's health assessment step.
      // Rule is aspirational - will fire once blood clot screening is added.
      { fieldId: 'womens_blood_clot_history', operator: 'equals', value: true, derivedFrom: { type: 'duration_days', fields: ['contraceptionType'] } },
    ],
    conditionLogic: 'AND',
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Due to your history of blood clots, the combined contraceptive pill is not safe for you. Please speak with your GP about alternative contraception options like the mini-pill, implant, or IUD which may be suitable.',
    doctorNote: 'Blood clot history - combined OCP contraindicated per WHOMEC Category 4. Declined for safety.',
    priority: 900,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // MIGRAINE WITH AURA - Absolute contraindication for combined OCP
  // ----------------------------------------
  {
    id: 'ocp_migraine_aura_contraindication',
    name: 'Migraine with Aura - OCP Contraindication',
    description: 'Patient has migraine with aura - absolute contraindication for combined OCP. Not yet collected in intake UI.',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'womens_health' },
      { fieldId: 'contraceptionType', operator: 'is_not_empty' },
      // womens_migraine_aura: not yet collected by women's health assessment step.
      { fieldId: 'womens_migraine_aura', operator: 'equals', value: true, derivedFrom: { type: 'duration_days', fields: ['contraceptionType'] } },
    ],
    conditionLogic: 'AND',
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Migraines with visual disturbances (aura) increase stroke risk when combined with oestrogen-containing contraceptives. Please speak with your GP about progestogen-only options like the mini-pill, implant, or hormonal IUD.',
    doctorNote: 'Migraine with aura - combined OCP contraindicated per WHOMEC Category 4. Stroke risk.',
    priority: 900,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // SMOKER AGED >35 - Absolute contraindication for combined OCP
  // ----------------------------------------
  {
    id: 'ocp_smoker_over_35_contraindication',
    name: 'Smoker Over 35 - OCP Contraindication',
    description: 'Patient is a smoker aged over 35 - absolute contraindication for combined OCP. Not yet collected in intake UI.',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'womens_health' },
      { fieldId: 'contraceptionType', operator: 'is_not_empty' },
      // womens_smoker, womens_over_35: not yet collected by women's health assessment step.
      { fieldId: 'womens_smoker', operator: 'equals', value: true, derivedFrom: { type: 'duration_days', fields: ['contraceptionType'] } },
      { fieldId: 'womens_over_35', operator: 'equals', value: true, derivedFrom: { type: 'age', fields: ['patient_dob'] } },
    ],
    conditionLogic: 'AND',
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Smoking over age 35 significantly increases cardiovascular risk with oestrogen-containing contraceptives. Please speak with your GP about safer alternatives like the mini-pill, implant, or IUD.',
    doctorNote: 'Smoker >35 - combined OCP contraindicated per WHOMEC Category 4. Cardiovascular risk.',
    priority: 900,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // UNDER 18: Age restriction for hair loss
  // ----------------------------------------
  {
    id: 'hair_loss_under_18',
    name: 'Under 18 - Hair Loss',
    description: 'Patient is under 18 for hair loss consultation',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'hair_loss' },
      {
        fieldId: 'patient_age',
        operator: 'lt',
        value: 18,
        derivedFrom: {
          type: 'age',
          fields: ['patient_dob'],
        },
      },
    ],
    conditionLogic: 'AND',
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Hair loss treatment is only available for adults 18 years and over. Please speak with your GP.',
    doctorNote: 'Patient under 18 - not eligible for hair loss treatment',
    priority: 900,
    services: ['gp-consult', 'consult'],
  },
  // ============================================
  // GENERAL CONSULT SAFETY RULES
  // ============================================
  // ----------------------------------------
  // CHEST PAIN - Emergency redirect for general consult
  // ----------------------------------------
  {
    id: 'general_chest_pain',
    name: 'Chest Pain - General Consult',
    description: 'Patient reporting chest pain in general consult - requires emergency care',
    conditions: [
      { fieldId: 'general_associated_symptoms', operator: 'includes_any', value: ['chest_pain'] },
    ],
    outcome: 'DECLINE',
    riskTier: 'critical',
    patientMessage: 'Chest pain requires immediate medical attention. Please call 000 or go to your nearest emergency department right away.',
    doctorNote: 'Patient reported chest pain in general consult - directed to emergency services',
    priority: 1000,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // SUICIDAL IDEATION - Emergency redirect with crisis resources
  // ----------------------------------------
  {
    id: 'general_suicidal_ideation',
    name: 'Suicidal Ideation - General Consult',
    description: 'Patient reporting suicidal thoughts in general consult',
    conditions: [
      { fieldId: 'general_associated_symptoms', operator: 'includes_any', value: ['suicidal_thoughts', 'self_harm'] },
    ],
    outcome: 'DECLINE',
    riskTier: 'critical',
    patientMessage: 'We care about your wellbeing. Please call Lifeline on 13 11 14 for immediate 24/7 support, or call 000 if you\'re in danger. You\'re not alone.',
    doctorNote: 'Patient reported suicidal ideation in general consult - provided crisis resources',
    priority: 1000,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // PREGNANCY-RELATED CONCERNS - Requires call
  // ----------------------------------------
  {
    id: 'general_pregnancy_concern',
    name: 'Pregnancy Concern - General Consult',
    description: 'Patient has pregnancy-related health concern requiring phone assessment',
    conditions: [
      { fieldId: 'consultCategory', operator: 'equals', value: 'general' },
      { fieldId: 'isPregnantOrBreastfeeding', operator: 'equals', value: true },
    ],
    conditionLogic: 'AND',
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'Pregnancy-related concerns need careful assessment. A doctor will call you to ensure we can help you safely.',
    doctorNote: 'Pregnant/breastfeeding patient in general consult - phone assessment required for medication safety',
    priority: 700,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // RECENT SURGERY COMPLICATIONS - Requires call
  // ----------------------------------------
  {
    id: 'general_recent_surgery',
    name: 'Recent Surgery Complications - General Consult',
    description: 'Patient has had recent surgery and is experiencing complications',
    conditions: [
      { fieldId: 'general_associated_symptoms', operator: 'includes_any', value: ['post_surgical_complications'] },
    ],
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'Post-surgical concerns require a phone assessment to ensure you receive appropriate care. A doctor will call you.',
    doctorNote: 'Post-surgical complications reported - phone assessment required to evaluate severity',
    priority: 700,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // SEVERE SYMPTOMS - General consult escalation
  // ----------------------------------------
  {
    id: 'general_severe_symptoms',
    name: 'Severe Symptoms - General Consult',
    description: 'Patient reports severe symptoms in general consult',
    conditions: [
      { fieldId: 'consultCategory', operator: 'equals', value: 'general' },
      // Maps to consultUrgency from consult-reason-step (closest available field)
      { fieldId: 'consultUrgency', operator: 'equals', value: 'urgent' },
    ],
    conditionLogic: 'AND',
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'You\'ve reported severe symptoms. A doctor will call you for a more thorough assessment to ensure you get the right care.',
    doctorNote: 'Severe symptoms reported in general consult - phone assessment recommended',
    priority: 500,
    services: ['gp-consult', 'consult'],
  },
  // ============================================
  // BROADER WOMEN'S HEALTH SAFETY RULES
  // ============================================
  // ----------------------------------------
  // PREGNANCY with hormonal medications - Decline
  // Combined OCP, HRT, and other hormonal treatments are contraindicated in pregnancy
  // ----------------------------------------
  {
    id: 'womens_pregnancy_hormonal',
    name: 'Pregnancy - Hormonal Medication Contraindication',
    description: 'Patient is pregnant and requesting hormonal medication - contraindicated',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'womens_health' },
      { fieldId: 'pregnancyStatus', operator: 'equals', value: 'pregnant' },
      { fieldId: 'contraceptionType', operator: 'is_not_empty' },
    ],
    conditionLogic: 'AND',
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Hormonal medications are not safe during pregnancy. Please speak with your GP or obstetrician for appropriate care during pregnancy.',
    doctorNote: 'Pregnant patient requesting hormonal medication - contraindicated. Referred to GP/obstetrician.',
    priority: 900,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // DVT/PE HISTORY with hormonal treatments - Decline
  // Blood clot history is an absolute contraindication for any oestrogen-containing treatment
  // This broadens the existing OCP-only rule to cover all hormonal pathways
  // ----------------------------------------
  {
    id: 'womens_dvt_pe_hormonal',
    name: 'DVT/PE History - Hormonal Treatment Contraindication',
    description: 'Patient has DVT/PE history and requesting hormonal treatment beyond just OCP',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'womens_health' },
      // womens_blood_clot_history: not yet collected by women's health assessment step.
      { fieldId: 'womens_blood_clot_history', operator: 'equals', value: true, derivedFrom: { type: 'duration_days', fields: ['contraceptionType'] } },
      { fieldId: 'contraceptionType', operator: 'is_not_empty' },
    ],
    conditionLogic: 'AND',
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Due to your history of blood clots, oestrogen-containing hormonal treatments are not safe for you. Please speak with your GP about non-hormonal alternatives or progestogen-only options.',
    doctorNote: 'Blood clot history with hormonal treatment request (non-OCP pathway) - oestrogen contraindicated per WHOMEC Category 4.',
    priority: 900,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // UNDIAGNOSED VAGINAL BLEEDING - Requires call
  // Unexplained bleeding needs clinical assessment before prescribing
  // ----------------------------------------
  {
    id: 'womens_undiagnosed_bleeding',
    name: 'Undiagnosed Vaginal Bleeding',
    description: 'Patient has irregular or unexplained vaginal bleeding that requires clinical assessment',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'womens_health' },
      // womens_last_period: lastPeriod is free text in the UI, not a select with 'irregular' option.
      // Rule is aspirational - will fire if lastPeriod is changed to structured input.
      { fieldId: 'womens_last_period', operator: 'equals', value: 'irregular', derivedFrom: { type: 'duration_days', fields: ['lastPeriod'] } },
    ],
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'Irregular or unexplained bleeding needs careful assessment before we can prescribe any treatment. A doctor will call you to discuss your symptoms.',
    doctorNote: 'Irregular/undiagnosed vaginal bleeding - phone assessment required before prescribing. May need investigation.',
    priority: 700,
    services: ['gp-consult', 'consult'],
  },
  // ----------------------------------------
  // BREASTFEEDING with hormonal medications - Requires call
  // Some hormonal medications are safe during breastfeeding, others are not
  // ----------------------------------------
  {
    id: 'womens_breastfeeding_hormonal',
    name: 'Breastfeeding - Hormonal Medication Review',
    description: 'Patient is breastfeeding and requesting hormonal medication - needs careful review',
    conditions: [
      { fieldId: 'consultSubtype', operator: 'equals', value: 'womens_health' },
      { fieldId: 'pregnancyStatus', operator: 'equals', value: 'breastfeeding' },
      { fieldId: 'contraceptionType', operator: 'is_not_empty' },
    ],
    conditionLogic: 'AND',
    outcome: 'REQUIRES_CALL',
    riskTier: 'medium',
    patientMessage: 'Some hormonal medications are not suitable while breastfeeding. A doctor will call you to discuss safe options.',
    doctorNote: 'Breastfeeding patient requesting hormonal medication - phone assessment required for safe prescribing.',
    priority: 700,
    services: ['gp-consult', 'consult'],
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
      { 
        fieldId: 'patient_age',
        operator: 'lt',
        value: 18,
        derivedFrom: {
          type: 'age',
          fields: ['patient_dob'],
        },
      },
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
      // weight_pregnancy_status: not yet collected in weight loss assessment step.
      // Rule is aspirational - will fire once pregnancy screening is added.
      { fieldId: 'weight_pregnancy_status', operator: 'not_equals', value: 'no', derivedFrom: { type: 'duration_days', fields: ['isPregnantOrBreastfeeding'] } },
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
          fields: ['currentWeight', 'currentHeight'],
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
      // Step saves as eatingDisorderHistory (camelCase). Step also sets requiresCall=true directly.
      { fieldId: 'eatingDisorderHistory', operator: 'equals', value: 'yes' },
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
      // weight_men2_thyroid_cancer: not yet collected in weight loss assessment step.
      // Rule is aspirational - will fire once MEN2/thyroid cancer screening is added.
      { fieldId: 'weight_men2_thyroid_cancer', operator: 'equals', value: true, derivedFrom: { type: 'duration_days', fields: ['weightLossMedPreference'] } },
    ],
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'Due to your personal or family history of medullary thyroid cancer or MEN2 syndrome, GLP-1 weight loss medications are not suitable for you. Please discuss alternative options with your GP.',
    doctorNote: 'MEN2/medullary thyroid cancer history - absolute contraindication for GLP-1 agonists per TGA guidelines',
    priority: 950,
    services: ['weight-management'],
  },
  {
    id: 'weight_pancreatitis',
    name: 'Pancreatitis History',
    description: 'Patient has history of pancreatitis - absolute contraindication for GLP-1 agonists',
    conditions: [
      // weight_pancreatitis: not yet collected in weight loss assessment step.
      // Rule is aspirational - will fire once pancreatitis screening is added.
      { fieldId: 'weight_pancreatitis', operator: 'equals', value: true, derivedFrom: { type: 'duration_days', fields: ['weightLossMedPreference'] } },
    ],
    outcome: 'DECLINE',
    riskTier: 'high',
    patientMessage: 'GLP-1 medications are contraindicated in patients with a history of pancreatitis. Please consult your regular doctor about alternative weight management options.',
    doctorNote: 'Pancreatitis history - absolute contraindication for GLP-1 agonists per TGA guidelines. Declined for safety.',
    priority: 950,
    services: ['weight-management'],
  },
  {
    id: 'weight_heart_disease',
    name: 'Heart Disease',
    description: 'Patient has heart disease',
    conditions: [
      // Step uses wlHistoryHeartCondition (boolean toggle), not medical_conditions array
      { fieldId: 'wlHistoryHeartCondition', operator: 'equals', value: true },
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

export const consultSafetyConfig: SafetyRulesConfig = {
  serviceSlug: 'consult',
  version: '1.0',
  rules: consultRules,
  defaultOutcome: 'ALLOW',
  defaultRiskTier: 'low',
}

// ============================================
// CONFIG REGISTRY
// ============================================

export const safetyConfigs: Record<string, SafetyRulesConfig> = {
  // Medical certificates - all variations
  'medical-certificate': medCertSafetyConfig,
  'med-cert': medCertSafetyConfig,
  'med-cert-sick': medCertSafetyConfig,
  'med-cert-carer': medCertSafetyConfig,
  'med-cert-fitness': medCertSafetyConfig,
  'sick-certificate': medCertSafetyConfig,
  
  // Prescriptions - all variations
  prescription: prescriptionSafetyConfig,
  'repeat-prescription': prescriptionSafetyConfig,
  'repeat-scripts': prescriptionSafetyConfig,
  'common-scripts': prescriptionSafetyConfig,
  'script-renewal': prescriptionSafetyConfig,
  
  // Weight management
  'weight-management': weightSafetyConfig,
  weight: weightSafetyConfig,
  'weight-loss': weightSafetyConfig,
  
  // Consultations
  consult: consultSafetyConfig,
  'gp-consult': consultSafetyConfig, // backward compat
  consultation: consultSafetyConfig,
}

export function getSafetyConfig(serviceSlug: string): SafetyRulesConfig | null {
  return safetyConfigs[serviceSlug] || null
}
