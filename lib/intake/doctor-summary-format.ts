/**
 * Doctor-Facing Summary Format
 * 
 * Transforms structured intake data into a concise, scannable format
 * for the doctor review queue. No narrative prose — fields and bullets only.
 * 
 * DESIGN PRINCIPLES:
 * - 10-second scan: Doctor should grasp case in 10 seconds
 * - No interpretation: Present facts, not conclusions
 * - Highlight flags: Red flags and cautions immediately visible
 * - Actionable: Clear what decision is needed
 */

import type {
  StructuredIntake,
  MedCertIntake,
  RepeatRxIntake,
  NewRxIntake,
  ConsultIntake,
  IntakeFlag,
  FlagSeverity,
} from './structured-intake-schema'

// =============================================================================
// DOCTOR SUMMARY TYPES
// =============================================================================

export interface DoctorSummary {
  // Header
  caseId: string
  serviceType: string
  submittedAt: string
  patientId: string
  
  // Quick status
  status: {
    readyForReview: boolean
    flagCount: number
    highestSeverity: FlagSeverity | null
    requiresAction: string[]
  }
  
  // Structured sections
  sections: SummarySection[]
  
  // Flags (prominent display)
  flags: FlagDisplay[]
  
  // Exclusions applied
  exclusions: string[]
  
  // AI collection metadata
  metadata: {
    turns: number
    durationSeconds: number
    formTransitionRecommended: boolean
    formTransitionReason?: string
  }
}

export interface SummarySection {
  title: string
  fields: SummaryField[]
}

export interface SummaryField {
  label: string
  value: string
  highlight?: 'normal' | 'caution' | 'flag'
}

export interface FlagDisplay {
  severity: FlagSeverity
  icon: string
  message: string
  field: string
}

// =============================================================================
// SUMMARY GENERATOR
// =============================================================================

export function generateDoctorSummary(intake: StructuredIntake): DoctorSummary {
  const flags = intake.flags.map(formatFlag)
  const highestSeverity = getHighestSeverity(intake.flags)
  
  return {
    caseId: intake.id,
    serviceType: formatServiceType(intake.serviceType),
    submittedAt: intake.updatedAt,
    patientId: intake.patientId,
    
    status: {
      readyForReview: intake.status === 'ready_for_review',
      flagCount: intake.flags.length,
      highestSeverity,
      requiresAction: getRequiredActions(intake),
    },
    
    sections: generateSections(intake),
    flags,
    exclusions: intake.exclusions,
    
    metadata: {
      turns: intake.aiMetadata.turnCount,
      durationSeconds: Math.round(intake.aiMetadata.collectionDurationMs / 1000),
      formTransitionRecommended: intake.requiresFormTransition,
      formTransitionReason: intake.formTransitionReason,
    },
  }
}

// =============================================================================
// SECTION GENERATORS BY SERVICE TYPE
// =============================================================================

function generateSections(intake: StructuredIntake): SummarySection[] {
  switch (intake.data.type) {
    case 'medical_certificate':
      return generateMedCertSections(intake.data)
    case 'repeat_prescription':
      return generateRepeatRxSections(intake.data)
    case 'new_prescription':
      return generateNewRxSections(intake.data)
    case 'general_consult':
      return generateConsultSections(intake.data)
  }
}

function generateMedCertSections(data: MedCertIntake): SummarySection[] {
  const sections: SummarySection[] = []
  
  // Request details
  sections.push({
    title: 'Certificate Request',
    fields: [
      { label: 'Purpose', value: formatPurpose(data.purpose, data.purposeOther) },
      { label: 'Period', value: `${formatDate(data.startDate)} → ${formatDate(data.endDate)} (${data.durationDays} days)` },
      { 
        label: 'Backdated', 
        value: data.isBackdated ? `Yes: ${data.backdatedReason || 'No reason given'}` : 'No',
        highlight: data.isBackdated ? 'caution' : 'normal',
      },
    ],
  })
  
  // Symptoms
  sections.push({
    title: 'Presenting Symptoms',
    fields: [
      { label: 'Primary', value: data.primarySymptoms.map(s => formatSymptom(s.category, s.description)).join(', ') },
      { label: 'Onset', value: formatOnset(data.symptomOnset) },
      { 
        label: 'Severity', 
        value: data.symptomSeverity,
        highlight: data.symptomSeverity === 'severe' ? 'flag' : 'normal',
      },
    ],
  })
  
  // Carer details if applicable
  if (data.carerDetails) {
    sections.push({
      title: 'Carer Leave Details',
      fields: [
        { label: 'Person', value: data.carerDetails.personName },
        { label: 'Relationship', value: data.carerDetails.relationship },
        { label: 'Condition', value: data.carerDetails.personCondition || 'Not specified' },
      ],
    })
  }
  
  // Additional notes
  if (data.additionalNotes) {
    sections.push({
      title: 'Patient Notes',
      fields: [
        { label: 'Notes', value: data.additionalNotes },
      ],
    })
  }
  
  return sections
}

function generateRepeatRxSections(data: RepeatRxIntake): SummarySection[] {
  const sections: SummarySection[] = []
  
  // Medication
  sections.push({
    title: 'Medication',
    fields: [
      { label: 'Name', value: data.medication.name },
      { label: 'Strength', value: data.medication.strength || 'Not specified' },
      { label: 'Form', value: data.medication.form || 'Not specified' },
      { label: 'PBS Code', value: data.medication.pbsCode || '—' },
    ],
  })
  
  // Treatment history
  sections.push({
    title: 'Treatment History',
    fields: [
      { label: 'Duration on medication', value: formatDuration(data.treatmentDuration) },
      { label: 'Originally prescribed by', value: formatPrescriber(data.prescribedBy) },
      { 
        label: 'Last doctor review', 
        value: formatLastReview(data.lastReviewDate),
        highlight: data.lastReviewDate === 'over_1_year' ? 'caution' : 'normal',
      },
    ],
  })
  
  // Current status
  sections.push({
    title: 'Current Status',
    fields: [
      { 
        label: 'Condition control', 
        value: formatControl(data.conditionControl),
        highlight: data.conditionControl === 'poorly_controlled' ? 'flag' : 'normal',
      },
      { 
        label: 'Side effects', 
        value: data.sideEffects === 'none' ? 'None reported' : `${data.sideEffects}${data.sideEffectDetails ? `: ${data.sideEffectDetails}` : ''}`,
        highlight: data.sideEffects === 'severe' ? 'flag' : data.sideEffects === 'moderate' ? 'caution' : 'normal',
      },
      { label: 'Taking as directed', value: data.takingAsDirected ? 'Yes' : 'No' },
      { label: 'Recent changes', value: data.recentChanges ? data.changeDetails || 'Yes (unspecified)' : 'None' },
    ],
  })
  
  // Quantity if specified
  if (data.requestedQuantity || data.requestedRepeats) {
    sections.push({
      title: 'Request',
      fields: [
        { label: 'Quantity', value: data.requestedQuantity?.toString() || 'Standard' },
        { label: 'Repeats', value: data.requestedRepeats?.toString() || 'Standard' },
      ],
    })
  }
  
  return sections
}

function generateNewRxSections(data: NewRxIntake): SummarySection[] {
  const sections: SummarySection[] = []
  
  // Condition
  sections.push({
    title: 'Condition',
    fields: [
      { label: 'Category', value: formatConditionCategory(data.condition.category) },
      { label: 'Description', value: data.condition.description },
      { label: 'Duration', value: data.condition.duration },
      { label: 'Onset', value: data.condition.onset },
    ],
  })
  
  // Previous treatment
  sections.push({
    title: 'Previous Treatment',
    fields: [
      { label: 'Tried before', value: data.previousTreatment.triedBefore ? 'Yes' : 'No' },
      ...(data.previousTreatment.medications?.length ? [
        { label: 'Medications tried', value: data.previousTreatment.medications.join(', ') },
      ] : []),
      ...(data.previousTreatment.effectiveness ? [
        { label: 'Effectiveness', value: data.previousTreatment.effectiveness },
      ] : []),
    ],
  })
  
  // Medication preference (if any)
  if (data.medicationPreference?.hasPreference) {
    sections.push({
      title: 'Patient Preference (Advisory Only)',
      fields: [
        { label: 'Preferred medication', value: data.medicationPreference.preferredMedication || 'Not specified' },
        { label: 'Reason', value: data.medicationPreference.reasonForPreference || 'Not specified' },
      ],
    })
  }
  
  // Safety information
  sections.push({
    title: 'Safety Information',
    fields: [
      { 
        label: 'Allergies', 
        value: data.allergies.hasAllergies 
          ? data.allergies.allergyList?.join(', ') || 'Yes (unspecified)' 
          : 'None reported',
        highlight: data.allergies.hasAllergies ? 'caution' : 'normal',
      },
      { 
        label: 'Current medications', 
        value: data.currentMedications.takingOther 
          ? data.currentMedications.medicationList?.join(', ') || 'Yes (unspecified)' 
          : 'None reported',
      },
    ],
  })
  
  return sections
}

function generateConsultSections(data: ConsultIntake): SummarySection[] {
  const sections: SummarySection[] = []
  
  // Primary concern
  sections.push({
    title: 'Concern',
    fields: [
      { label: 'Summary', value: data.concern.summary },
      { label: 'Category', value: formatConsultCategory(data.concern.category) },
      { label: 'Duration', value: data.concern.duration },
      { 
        label: 'Urgency', 
        value: data.concern.urgency,
        highlight: data.concern.urgency === 'urgent' ? 'flag' : 'normal',
      },
    ],
  })
  
  // Symptoms if provided
  if (data.symptoms) {
    sections.push({
      title: 'Symptoms',
      fields: [
        { label: 'List', value: data.symptoms.list.join(', ') },
        { 
          label: 'Severity', 
          value: data.symptoms.severity,
          highlight: data.symptoms.severity === 'severe' ? 'flag' : 'normal',
        },
        { 
          label: 'Progression', 
          value: data.symptoms.progression,
          highlight: data.symptoms.progression === 'worsening' ? 'caution' : 'normal',
        },
      ],
    })
  }
  
  // Expectation and preference
  sections.push({
    title: 'Consult Details',
    fields: [
      { label: 'Expectation', value: formatExpectation(data.expectation) },
      { label: 'Consult type', value: formatConsultType(data.consultType) },
      ...(data.preferredTime ? [
        { label: 'Preferred time', value: data.preferredTime },
      ] : []),
    ],
  })
  
  return sections
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

function formatServiceType(type: string): string {
  const map: Record<string, string> = {
    medical_certificate: 'Medical Certificate',
    repeat_prescription: 'Repeat Prescription',
    new_prescription: 'New Prescription',
    general_consult: 'GP Consult',
  }
  return map[type] || type
}

function formatPurpose(purpose: string, other?: string): string {
  const map: Record<string, string> = {
    work: 'Work',
    education: 'Education (Uni/School)',
    carer: "Carer's Leave",
    other: other || 'Other',
  }
  return map[purpose] || purpose
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  } catch {
    return iso
  }
}

function formatSymptom(category: string, description?: string): string {
  const map: Record<string, string> = {
    respiratory_upper: 'Upper respiratory (cold/flu/sore throat)',
    respiratory_lower: 'Lower respiratory (cough/chest)',
    gastrointestinal: 'Gastrointestinal',
    headache_migraine: 'Headache/Migraine',
    musculoskeletal: 'Musculoskeletal',
    fatigue_malaise: 'Fatigue/Malaise',
    menstrual: 'Menstrual',
    mental_health: 'Mental health',
    fever: 'Fever',
    other: description || 'Other',
  }
  return map[category] || category
}

function formatOnset(onset: string): string {
  const map: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    '2-3_days': '2-3 days ago',
    '4-7_days': '4-7 days ago',
    over_1_week: 'Over 1 week ago',
  }
  return map[onset] || onset
}

function formatDuration(duration: string): string {
  const map: Record<string, string> = {
    under_3_months: '< 3 months',
    '3_to_12_months': '3-12 months',
    over_1_year: '> 1 year',
  }
  return map[duration] || duration
}

function formatPrescriber(prescriber: string): string {
  const map: Record<string, string> = {
    regular_gp: 'Regular GP',
    specialist: 'Specialist',
    other_doctor: 'Other doctor',
    this_service: 'This service',
  }
  return map[prescriber] || prescriber
}

function formatLastReview(review: string): string {
  const map: Record<string, string> = {
    under_3_months: '< 3 months ago',
    '3_to_6_months': '3-6 months ago',
    '6_to_12_months': '6-12 months ago',
    over_1_year: '> 1 year ago',
  }
  return map[review] || review
}

function formatControl(control: string): string {
  const map: Record<string, string> = {
    well_controlled: 'Well controlled',
    partially_controlled: 'Partially controlled',
    poorly_controlled: 'Poorly controlled',
  }
  return map[control] || control
}

function formatConditionCategory(category: string): string {
  const map: Record<string, string> = {
    skin: 'Skin',
    infection: 'Infection',
    respiratory: 'Respiratory',
    contraception: 'Contraception',
    mental_health: 'Mental health',
    pain: 'Pain',
    gastrointestinal: 'Gastrointestinal',
    other: 'Other',
  }
  return map[category] || category
}

function formatConsultCategory(category: string): string {
  const map: Record<string, string> = {
    new_symptom: 'New symptom',
    ongoing_condition: 'Ongoing condition',
    test_results: 'Test results',
    second_opinion: 'Second opinion',
    preventive: 'Preventive care',
    mental_health: 'Mental health',
    sexual_health: 'Sexual health',
    other: 'Other',
  }
  return map[category] || category
}

function formatExpectation(expectation: string): string {
  const map: Record<string, string> = {
    advice: 'Medical advice',
    diagnosis: 'Diagnosis',
    prescription: 'Prescription',
    referral: 'Referral',
    unsure: 'Not sure',
  }
  return map[expectation] || expectation
}

function formatConsultType(type: string): string {
  const map: Record<string, string> = {
    video: 'Video call',
    phone: 'Phone call',
    async: 'Async review',
  }
  return map[type] || type
}

function formatFlag(flag: IntakeFlag): FlagDisplay {
  const icons: Record<FlagSeverity, string> = {
    info: 'ℹ️',
    caution: '⚠️',
    urgent: '🔴',
    blocker: '🚫',
  }
  
  return {
    severity: flag.severity,
    icon: icons[flag.severity],
    message: flag.message,
    field: flag.triggeredBy,
  }
}

function getHighestSeverity(flags: IntakeFlag[]): FlagSeverity | null {
  if (flags.length === 0) return null
  
  const order: FlagSeverity[] = ['blocker', 'urgent', 'caution', 'info']
  for (const severity of order) {
    if (flags.some(f => f.severity === severity)) {
      return severity
    }
  }
  return null
}

function getRequiredActions(intake: StructuredIntake): string[] {
  const actions: string[] = []
  
  if (intake.status === 'ready_for_review') {
    actions.push('Review and approve/reject')
  }
  
  if (intake.flags.some(f => f.severity === 'blocker')) {
    actions.push('Address blocker flag')
  }
  
  if (intake.requiresFormTransition) {
    actions.push('Consider full form intake')
  }
  
  if (intake.data.type === 'medical_certificate' && intake.data.isBackdated) {
    actions.push('Verify backdating reason')
  }
  
  return actions
}

// =============================================================================
// PLAIN TEXT EXPORT (for copy/paste, EMR notes)
// =============================================================================

export function exportAsPlainText(summary: DoctorSummary): string {
  const lines: string[] = []
  
  // Header
  lines.push(`=== ${summary.serviceType} ===`)
  lines.push(`Case: ${summary.caseId}`)
  lines.push(`Submitted: ${formatDate(summary.submittedAt)}`)
  lines.push('')
  
  // Flags first (if any)
  if (summary.flags.length > 0) {
    lines.push('FLAGS:')
    for (const flag of summary.flags) {
      lines.push(`  ${flag.icon} [${flag.severity.toUpperCase()}] ${flag.message}`)
    }
    lines.push('')
  }
  
  // Sections
  for (const section of summary.sections) {
    lines.push(`${section.title}:`)
    for (const field of section.fields) {
      const highlight = field.highlight === 'flag' ? ' ⚠️' : ''
      lines.push(`  • ${field.label}: ${field.value}${highlight}`)
    }
    lines.push('')
  }
  
  // Exclusions
  if (summary.exclusions.length > 0) {
    lines.push('EXCLUSIONS APPLIED:')
    for (const exc of summary.exclusions) {
      lines.push(`  • ${exc}`)
    }
    lines.push('')
  }
  
  // Metadata
  lines.push(`---`)
  lines.push(`AI intake: ${summary.metadata.turns} turns, ${summary.metadata.durationSeconds}s`)
  
  return lines.join('\n')
}
