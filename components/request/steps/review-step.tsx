"use client"

/**
 * Review Step - Summary of request before checkout
 * Shows all collected information for patient to verify
 */

import { useState } from "react"
import { Edit2, ChevronDown, ChevronUp, ShieldCheck, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { PRICING } from "@/lib/constants"

interface ReviewStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack?: () => void
  onComplete?: () => void
}

const SERVICE_LABELS: Record<UnifiedServiceType, string> = {
  'med-cert': 'Medical Certificate',
  'prescription': 'Prescription Request',
  'repeat-script': 'Repeat Prescription',
  'consult': 'Doctor Consultation',
}

const CERT_TYPE_LABELS: Record<string, string> = {
  'work': 'Work/Sick Leave',
  'study': 'Study / University',
  'carer': 'Carer\'s Leave',
}

const SYMPTOM_DURATION_LABELS: Record<string, string> = {
  'today': 'Today',
  '1_2_days': '1-2 days',
  '3_5_days': '3-5 days',
  'week_plus': 'A week+',
  // Legacy values (for existing submissions)
  '1_day': '1 day',
  '2_days': '2 days',
  '3_days': '3 days',
  'less_than_24h': 'Less than 24 hours',
  '1_week_plus': 'Over a week',
}

const TRUNCATE_THRESHOLD = 60

function ExpandableValue({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false)
  const needsTruncation = value.length > TRUNCATE_THRESHOLD

  if (!needsTruncation) {
    return <span>{value}</span>
  }

  return (
    <span>
      {expanded ? value : value.substring(0, TRUNCATE_THRESHOLD) + '...'}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="ml-1 inline-flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-normal"
      >
        {expanded ? (
          <>Less <ChevronUp className="w-3 h-3" /></>
        ) : (
          <>More <ChevronDown className="w-3 h-3" /></>
        )}
      </button>
    </span>
  )
}

function ReviewSection({
  title,
  items,
  onEdit
}: {
  title: string
  items: { label: string; value: string }[]
  onEdit?: () => void
}) {
  return (
    <div className="rounded-2xl border border-border/60 dark:border-white/10 bg-white dark:bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-5 pt-4 pb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-xs gap-1 rounded-lg hover:bg-muted/50 dark:hover:bg-white/10">
            <Edit2 className="w-3 h-3" />
            Edit
          </Button>
        )}
      </div>
      <div className="px-5 pb-4">
        <dl className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="font-medium text-right max-w-[60%]">
                {item.value ? <ExpandableValue value={item.value} /> : '—'}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

function getPriceForService(serviceType: UnifiedServiceType, answers: Record<string, unknown>): number {
  if (serviceType === 'med-cert') {
    const duration = String(answers.duration || '2')
    if (duration === '1') return PRICING.MED_CERT
    if (duration === '3') return PRICING.MED_CERT_3DAY
    return PRICING.MED_CERT_2DAY
  }
  if (serviceType === 'prescription' || serviceType === 'repeat-script') return PRICING.REPEAT_SCRIPT
  if (serviceType === 'consult') {
    const subtype = String(answers.consultSubtype || '')
    if (subtype === 'ed') return PRICING.MENS_HEALTH
    if (subtype === 'hair_loss') return PRICING.HAIR_LOSS
    if (subtype === 'womens_health') return PRICING.WOMENS_HEALTH
    if (subtype === 'weight_loss') return PRICING.WEIGHT_LOSS
    return PRICING.CONSULT
  }
  return PRICING.CONSULT
}

export default function ReviewStep({ serviceType, onNext }: ReviewStepProps) {
  const { answers, firstName, lastName, email, phone, dob, goToStep, safetyConfirmed, setSafetyConfirmed } = useRequestStore()

  // Build review sections based on service type
  const sections: { title: string; items: { label: string; value: string }[]; stepId?: string }[] = []

  // Service info
  const CONSULT_SUBTYPE_REVIEW_LABELS: Record<string, string> = {
    general: 'General Consultation',
    new_medication: 'General Consultation',
    ed: 'ED Consultation',
    hair_loss: 'Hair Loss Consultation',
    womens_health: "Women's Health Consultation",
    weight_loss: 'Weight Management Consultation',
  }
  const consultSubtypeForLabel = answers.consultSubtype as string | undefined
  const serviceLabel = serviceType === 'consult' && consultSubtypeForLabel
    ? CONSULT_SUBTYPE_REVIEW_LABELS[consultSubtypeForLabel] || SERVICE_LABELS[serviceType]
    : SERVICE_LABELS[serviceType]

  sections.push({
    title: 'Request Type',
    items: [
      { label: 'Service', value: serviceLabel },
    ],
  })

  // Med-cert specific sections
  if (serviceType === 'med-cert') {
    const certType = answers.certType as string
    const duration = answers.duration as string
    const startDate = answers.startDate as string
    
    sections.push({
      title: 'Certificate Details',
      items: [
        { label: 'Type', value: CERT_TYPE_LABELS[certType] || certType },
        { label: 'Duration', value: duration ? `${duration} day${duration === '1' ? '' : 's'}` : '' },
        { label: 'Start date', value: startDate ? new Date(startDate).toLocaleDateString('en-AU') : '' },
      ],
      stepId: 'certificate',
    })

    const symptoms = answers.symptoms as string[] | undefined
    const symptomDetails = answers.symptomDetails as string
    const symptomDuration = answers.symptomDuration as string
    
    sections.push({
      title: 'Symptoms',
      items: [
        { label: 'Symptoms', value: symptoms?.join(', ') || '' },
        { label: 'Duration', value: SYMPTOM_DURATION_LABELS[symptomDuration] || symptomDuration || '' },
        { label: 'Details', value: symptomDetails || '' },
      ],
      stepId: 'symptoms',
    })
  }

  // Prescription specific sections — combined Medication + History into one card
  if (serviceType === 'prescription' || serviceType === 'repeat-script') {
    const medications = answers.medications as Array<{ product: unknown; name: string; strength?: string; form?: string }> | undefined
    const medicationName = answers.medicationName as string
    const medicationStrength = answers.medicationStrength as string
    const prescriptionHistory = answers.prescriptionHistory as string | undefined
    const hasSideEffects = answers.hasSideEffects as boolean | undefined
    const sideEffects = answers.sideEffects as string | undefined

    const PRESCRIPTION_HISTORY_LABELS: Record<string, string> = {
      less_than_3_months: 'Less than 3 months ago',
      '3_to_6_months': '3-6 months ago',
      '6_to_12_months': '6-12 months ago',
      over_12_months: 'Over 12 months ago',
    }

    if (medications && medications.length > 1) {
      // Multi-medication mode
      const items = medications.flatMap((med, i) => [
        { label: `Medication ${i + 1}`, value: med.name || '' },
        ...(med.strength ? [{ label: `Strength`, value: med.strength }] : []),
      ])
      if (prescriptionHistory) {
        items.push({ label: 'Last prescribed', value: PRESCRIPTION_HISTORY_LABELS[prescriptionHistory] || prescriptionHistory })
      }
      if (hasSideEffects) {
        items.push({ label: 'Side effects', value: sideEffects || 'Yes' })
      }
      sections.push({ title: 'Medications', items, stepId: 'medication' })
    } else {
      const items = [
        { label: 'Medication', value: medicationName || '' },
        ...(medicationStrength ? [{ label: 'Strength', value: medicationStrength }] : []),
      ]
      if (prescriptionHistory) {
        items.push({ label: 'Last prescribed', value: PRESCRIPTION_HISTORY_LABELS[prescriptionHistory] || prescriptionHistory })
      }
      if (hasSideEffects) {
        items.push({ label: 'Side effects', value: sideEffects || 'Yes' })
      }
      sections.push({ title: 'Medication', items, stepId: 'medication' })
    }
  }

  // Consult-specific sections
  if (serviceType === 'consult') {
    const consultSubtype = answers.consultSubtype as string | undefined
    const consultCategory = answers.consultCategory as string | undefined
    const consultDetails = answers.consultDetails as string | undefined

    // General / new medication consult
    if (consultCategory || consultDetails) {
      const CATEGORY_LABELS: Record<string, string> = {
        general: 'General consultation',
        new_medication: 'General consultation',
        ed: 'Erectile dysfunction',
        hair_loss: 'Hair loss treatment',
        womens_health: "Women's health",
        weight_loss: 'Weight management',
      }
      sections.push({
        title: 'Consultation Details',
        items: [
          ...(consultCategory ? [{ label: 'Category', value: CATEGORY_LABELS[consultCategory] || consultCategory }] : []),
          ...(consultDetails ? [{ label: 'Details', value: consultDetails }] : []),
        ],
        stepId: 'consult-reason',
      })
    }

    // ED assessment
    if (consultSubtype === 'ed') {
      const ED_ONSET_LABELS: Record<string, string> = {
        recent: 'Recently (< 3 months)',
        gradual: 'Gradually over time',
        sudden: 'Suddenly',
        always: 'Always had difficulty',
      }
      const ED_FREQ_LABELS: Record<string, string> = {
        always: 'Every time',
        often: 'Most of the time',
        sometimes: 'Sometimes',
        rarely: 'Rarely',
      }
      const ED_MORNING_LABELS: Record<string, string> = {
        yes: 'Yes',
        sometimes: 'Sometimes',
        rarely: 'Rarely / No',
      }
      const ED_PREF_LABELS: Record<string, string> = {
        daily: 'Daily (Tadalafil 5mg)',
        prn: 'As-needed (Sildenafil/Tadalafil)',
      }

      const edItems = [
        { label: 'Onset', value: ED_ONSET_LABELS[answers.edOnset as string] || String(answers.edOnset || '—') },
        { label: 'Frequency', value: ED_FREQ_LABELS[answers.edFrequency as string] || String(answers.edFrequency || '—') },
        { label: 'Morning erections', value: ED_MORNING_LABELS[answers.edMorningErections as string] || String(answers.edMorningErections || '—') },
        { label: 'Preference', value: ED_PREF_LABELS[answers.edPreference as string] || String(answers.edPreference || '—') },
      ]
      if (answers.edSafety_managedCondition) {
        edItems.push({ label: 'Managed condition', value: 'Yes — under doctor supervision' })
      }
      if (answers.edAdditionalInfo) {
        edItems.push({ label: 'Additional info', value: String(answers.edAdditionalInfo) })
      }
      sections.push({
        title: 'ED Assessment',
        items: edItems,
        stepId: 'ed-assessment',
      })
    }

    // Hair loss assessment
    if (consultSubtype === 'hair_loss') {
      const PATTERN_LABELS: Record<string, string> = {
        male_pattern: 'Male pattern baldness',
        receding: 'Receding hairline',
        thinning_crown: 'Thinning at crown',
        overall_thinning: 'Overall thinning',
        overall: 'Overall thinning',
        patchy: 'Patchy hair loss',
        other: 'Other pattern',
      }
      const HAIR_DURATION_LABELS: Record<string, string> = {
        less_than_6_months: 'Less than 6 months',
        '6_to_12_months': '6-12 months',
        '1_to_2_years': '1-2 years',
        more_than_2_years: 'More than 2 years',
      }
      const FAMILY_HISTORY_LABELS: Record<string, string> = {
        yes_father: "Yes, father's side",
        yes_mother: "Yes, mother's side",
        yes_both: 'Yes, both sides',
        no: 'No family history',
        unknown: 'Not sure',
      }
      const HAIR_MED_LABELS: Record<string, string> = {
        finasteride: 'Finasteride (oral)',
        minoxidil: 'Minoxidil (topical)',
      }
      const triedTreatments = [
        { key: 'triedMinoxidil', label: 'Minoxidil' },
        { key: 'triedFinasteride', label: 'Finasteride' },
        { key: 'triedBiotin', label: 'Biotin' },
        { key: 'triedShampoos', label: 'Medicated shampoos' },
        { key: 'triedPRP', label: 'PRP therapy' },
        { key: 'triedOther', label: 'Other' },
      ].filter(t => answers[t.key]).map(t => t.label)
      const scalpConditions = [
        { key: 'scalpDandruff', label: 'Dandruff' },
        { key: 'scalpPsoriasis', label: 'Psoriasis' },
        { key: 'scalpItching', label: 'Itching' },
        { key: 'scalpFolliculitis', label: 'Folliculitis' },
      ].filter(c => answers[c.key]).map(c => c.label)

      const hairItems = [
        { label: 'Pattern', value: PATTERN_LABELS[answers.hairPattern as string] || String(answers.hairPattern || '—') },
        { label: 'Duration', value: HAIR_DURATION_LABELS[answers.hairDuration as string] || String(answers.hairDuration || '—') },
        { label: 'Family history', value: FAMILY_HISTORY_LABELS[answers.hairFamilyHistory as string] || String(answers.hairFamilyHistory || '—') },
        { label: 'Preference', value: HAIR_MED_LABELS[answers.hairMedicationPreference as string] || String(answers.hairMedicationPreference || '—') },
      ]
      if (triedTreatments.length > 0) {
        hairItems.push({ label: 'Tried previously', value: triedTreatments.join(', ') })
      }
      if (scalpConditions.length > 0) {
        hairItems.push({ label: 'Scalp conditions', value: scalpConditions.join(', ') })
      } else if (answers.scalpNone) {
        hairItems.push({ label: 'Scalp conditions', value: 'None' })
      }
      if (answers.hairAdditionalInfo) {
        hairItems.push({ label: 'Additional info', value: String(answers.hairAdditionalInfo) })
      }
      sections.push({
        title: 'Hair Loss Assessment',
        items: hairItems,
        stepId: 'hair-loss-assessment',
      })
    }

    // Women's health assessment
    if (consultSubtype === 'womens_health') {
      const WH_TYPE_LABELS: Record<string, string> = {
        contraception: 'Contraception',
        ocp_new: 'Contraception (new)',
        ocp_repeat: 'Contraception (repeat)',
        morning_after: 'Morning-after pill',
        uti: 'UTI treatment',
        period_pain: 'Period pain',
        other: 'Other concern',
      }
      const whOption = answers.womensHealthOption as string | undefined
      const whItems = [
        { label: 'Concern', value: WH_TYPE_LABELS[whOption as string] || String(whOption || '—') },
      ]

      // Contraception details
      if (whOption === 'ocp_new' || whOption === 'ocp_repeat' || whOption === 'contraception') {
        const CONTRACEPTION_TYPE_LABELS: Record<string, string> = { start: 'Start new', continue: 'Continue/repeat', switch: 'Switch type' }
        const CURRENT_LABELS: Record<string, string> = { pill: 'The pill', iud: 'IUD/implant', other: 'Other method', none: 'None' }
        const PREGNANCY_LABELS: Record<string, string> = { no: 'No', not_sure: 'Not sure', yes: 'Yes' }
        if (answers.contraceptionType) whItems.push({ label: 'Type', value: CONTRACEPTION_TYPE_LABELS[answers.contraceptionType as string] || String(answers.contraceptionType) })
        if (answers.contraceptionCurrent) whItems.push({ label: 'Current contraception', value: CURRENT_LABELS[answers.contraceptionCurrent as string] || String(answers.contraceptionCurrent) })
        if (answers.pregnancyStatus) whItems.push({ label: 'Pregnant', value: PREGNANCY_LABELS[answers.pregnancyStatus as string] || String(answers.pregnancyStatus) })
      }

      // Morning-after details
      if (whOption === 'morning_after') {
        const HOURS_LABELS: Record<string, string> = { under_24: '< 24 hours', '24_to_72': '24-72 hours', '72_to_120': '72-120 hours' }
        if (answers.hoursSinceIntercourse) whItems.push({ label: 'Time since', value: HOURS_LABELS[answers.hoursSinceIntercourse as string] || String(answers.hoursSinceIntercourse) })
      }

      // UTI details
      if (whOption === 'uti') {
        const utiSymptoms = answers.utiSymptoms as string[] | undefined
        if (utiSymptoms?.length) whItems.push({ label: 'Symptoms', value: utiSymptoms.join(', ') })
      }

      // General details
      if ((whOption === 'period_pain' || whOption === 'other') && answers.womensDetails) {
        whItems.push({ label: 'Details', value: String(answers.womensDetails) })
      }

      sections.push({
        title: "Women's Health",
        items: whItems,
        stepId: 'womens-health-type',
      })
    }

    // Weight loss assessment
    if (consultSubtype === 'weight_loss') {
      const bmi = answers.currentWeight && answers.currentHeight
        ? (parseFloat(String(answers.currentWeight)) / Math.pow(parseFloat(String(answers.currentHeight)) / 100, 2)).toFixed(1)
        : null
      const WL_MED_LABELS: Record<string, string> = {
        glp1: 'GLP-1 (e.g., Ozempic)',
        duromine: 'Duromine (Phentermine)',
      }
      const PREV_ATTEMPTS_LABELS: Record<string, string> = {
        none: 'No previous attempts',
        diet_exercise: 'Diet and exercise only',
        programs: 'Weight loss programs',
        medication: 'Weight loss medication',
        multiple: 'Multiple methods',
      }
      const medicalHistory = [
        { key: 'wlHistoryDiabetes', label: 'Type 2 diabetes' },
        { key: 'wlHistoryHeartCondition', label: 'Heart condition' },
        { key: 'wlHistoryHighBP', label: 'High blood pressure' },
        { key: 'wlHistoryThyroid', label: 'Thyroid disorder' },
        { key: 'wlHistorySleepApnea', label: 'Sleep apnea' },
        { key: 'wlHistoryPCOS', label: 'PCOS' },
      ].filter(h => answers[h.key]).map(h => h.label)

      const wlItems = [
        { label: 'Current weight', value: answers.currentWeight ? `${answers.currentWeight} kg` : '—' },
        { label: 'Height', value: answers.currentHeight ? `${answers.currentHeight} cm` : '—' },
        { label: 'Target weight', value: answers.targetWeight ? `${answers.targetWeight} kg` : '—' },
        ...(bmi ? [{ label: 'BMI', value: bmi }] : []),
        { label: 'Previous attempts', value: PREV_ATTEMPTS_LABELS[answers.previousAttempts as string] || String(answers.previousAttempts || '—') },
        { label: 'Medication preference', value: WL_MED_LABELS[answers.weightLossMedPreference as string] || String(answers.weightLossMedPreference || '—') },
        { label: 'Eating disorder history', value: answers.eatingDisorderHistory === 'yes' ? 'Yes' : 'No' },
      ]
      if (answers.wlAdverseReactions === 'yes') {
        wlItems.push({ label: 'Adverse reactions', value: String(answers.wlAdverseReactionsDetails || 'Yes') })
      }
      if (medicalHistory.length > 0) {
        wlItems.push({ label: 'Medical history', value: medicalHistory.join(', ') })
      }
      if (answers.weightLossGoals) {
        wlItems.push({ label: 'Goals', value: String(answers.weightLossGoals) })
      }
      sections.push({
        title: 'Weight Loss Assessment',
        items: wlItems,
        stepId: 'weight-loss-assessment',
      })

      // Call scheduling (if present)
      if (answers.preferredTimeSlot || answers.callbackPhone) {
        const TIME_LABELS: Record<string, string> = { morning: 'Morning (9am-12pm)', afternoon: 'Afternoon (12pm-5pm)', evening: 'Evening (5pm-8pm)' }
        sections.push({
          title: 'Call Scheduling',
          items: [
            { label: 'Preferred time', value: TIME_LABELS[answers.preferredTimeSlot as string] || String(answers.preferredTimeSlot || '—') },
            { label: 'Phone', value: String(answers.callbackPhone || '—') },
          ],
          stepId: 'weight-loss-call',
        })
      }
    }
  }

  // Medical history — only show items with notable values (positive flags)
  const hasAllergies = answers.hasAllergies as boolean
  const allergies = answers.allergies as string
  const hasConditions = answers.hasConditions as boolean
  const conditions = answers.conditions as string
  const isPregnantOrBreastfeeding = answers.isPregnantOrBreastfeeding as boolean | undefined
  const hasAdverseMedicationReactions = answers.hasAdverseMedicationReactions as boolean | undefined
  const hasOtherMedications = answers.hasOtherMedications as boolean | undefined
  const otherMedications = answers.otherMedications as string | undefined

  if (hasAllergies !== undefined || hasConditions !== undefined) {
    const medHistoryItems: { label: string; value: string }[] = []
    // Only show positive flags or things the doctor needs to see
    if (hasAllergies) medHistoryItems.push({ label: 'Allergies', value: allergies || 'Yes' })
    if (hasConditions) medHistoryItems.push({ label: 'Conditions', value: conditions || 'Yes' })
    if (hasOtherMedications) medHistoryItems.push({ label: 'Other medications', value: otherMedications || 'Yes' })
    if (isPregnantOrBreastfeeding) medHistoryItems.push({ label: 'Pregnant/breastfeeding', value: 'Yes' })
    if (hasAdverseMedicationReactions) medHistoryItems.push({ label: 'Adverse reactions', value: 'Yes' })

    // If everything is clear, show a single "all clear" line
    if (medHistoryItems.length === 0) {
      medHistoryItems.push({ label: 'Medical history', value: 'Nothing to report' })
    }

    sections.push({
      title: 'Medical History',
      items: medHistoryItems,
      stepId: 'medical-history',
    })
  }

  // Patient details — compact
  const dobDisplay = dob ? new Date(dob).toLocaleDateString('en-AU') : ''
  const detailItems = [
    { label: 'Name', value: `${firstName} ${lastName}`.trim() },
    { label: 'Email', value: email },
    { label: 'Date of birth', value: dobDisplay || '—' },
  ]
  // Only show phone if provided
  if (phone) detailItems.push({ label: 'Phone', value: phone })
  // Show Medicare and address for prescriptions
  const medicareNumber = answers.medicareNumber as string | undefined
  if (medicareNumber) detailItems.push({ label: 'Medicare', value: medicareNumber.replace(/(\d{4})(\d{5})(\d)/, '$1 $2 $3') })
  const addressLine1 = answers.addressLine1 as string | undefined
  const suburb = answers.suburb as string | undefined
  const addressState = answers.state as string | undefined
  const postcode = answers.postcode as string | undefined
  if (addressLine1) {
    const addressParts = [addressLine1, suburb, addressState, postcode].filter(Boolean)
    detailItems.push({ label: 'Address', value: addressParts.join(', ') })
  }
  sections.push({
    title: 'Your Details',
    items: detailItems,
    stepId: 'details',
  })

  // Filter out the standalone "Request Type" section — redundant since the flow header already shows the service
  const displaySections = sections.filter(s => s.title !== 'Request Type')

  return (
    <div className="space-y-3">
      {/* Compact header */}
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold">Review your request</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Check the details below, then continue to payment
        </p>
      </div>

      {/* Review sections */}
      <div className="space-y-3">
        {displaySections.map((section, i) => (
          <ReviewSection
            key={i}
            title={section.title}
            items={section.items}
            onEdit={section.stepId ? () => goToStep(section.stepId as Parameters<typeof goToStep>[0]) : undefined}
          />
        ))}
      </div>

      {/* Safety consent + Continue */}
      <div className="space-y-3 pt-1">
        {/* Price summary — show before CTA so there's no payment surprise */}
        {(() => {
          const price = getPriceForService(serviceType, answers)
          return (
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/40 dark:bg-white/5 border border-border/40">
              <span className="text-sm text-muted-foreground">Total today</span>
              <span className="text-base font-semibold text-foreground">${price.toFixed(2)}</span>
            </div>
          )
        })()}

        <div className={`rounded-2xl border p-4 transition-colors duration-200 ${safetyConfirmed ? 'border-border/50 dark:border-white/10 bg-muted/30 dark:bg-white/5' : 'border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20'}`}>
          <div className="flex items-start gap-3">
            <Checkbox
              id="safety-consent"
              checked={safetyConfirmed}
              onCheckedChange={(checked) => setSafetyConfirmed(checked === true)}
              className="mt-0.5"
              aria-label="Confirm this is not a medical emergency"
            />
            <Label htmlFor="safety-consent" className="text-sm cursor-pointer leading-snug text-muted-foreground">
              I confirm this is not a medical emergency. If I am experiencing an emergency, I will call 000.
            </Label>
          </div>
          {!safetyConfirmed && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 pl-7">
              Tick the box to confirm and continue to payment
            </p>
          )}
        </div>

        <Button onClick={onNext} className="w-full h-12" disabled={!safetyConfirmed}>
          Continue to payment
        </Button>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              AHPRA-registered doctor
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {serviceType === 'consult' ? "Money-back guarantee" : "Full refund if declined"}
            </span>
          </div>
          <LegitScriptSeal size="sm" />
        </div>
      </div>
    </div>
  )
}
