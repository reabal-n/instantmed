"use client"

/**
 * Review Step - Summary of request before checkout
 * Shows all collected information for patient to verify
 */

import { useState } from "react"
import { Check, Edit2, Shield, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface ReviewStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
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
    <div className="rounded-2xl border border-border/60 dark:border-white/10 bg-card/70 dark:bg-white/5 backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-5 pt-4 pb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-xs gap-1 rounded-lg hover:bg-card/60 dark:hover:bg-white/10">
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

export default function ReviewStep({ serviceType, onNext }: ReviewStepProps) {
  const { answers, firstName, lastName, email, phone, goToStep, safetyConfirmed, setSafetyConfirmed } = useRequestStore()

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

  // Prescription specific sections
  if (serviceType === 'prescription' || serviceType === 'repeat-script') {
    const medications = answers.medications as Array<{ product: unknown; name: string; strength?: string; form?: string }> | undefined
    const medicationName = answers.medicationName as string
    const medicationStrength = answers.medicationStrength as string
    const medicationForm = answers.medicationForm as string

    if (medications && medications.length > 1) {
      // Multi-medication mode
      const items = medications.flatMap((med, i) => [
        { label: `Medication ${i + 1}`, value: med.name || '' },
        ...(med.strength ? [{ label: `Strength`, value: med.strength }] : []),
        ...(med.form ? [{ label: `Form`, value: med.form }] : []),
      ])
      sections.push({ title: 'Medications', items, stepId: 'medication' })
    } else {
      sections.push({
        title: 'Medication',
        items: [
          { label: 'Name', value: medicationName || '' },
          { label: 'Strength', value: medicationStrength || '' },
          { label: 'Form', value: medicationForm || '' },
        ],
        stepId: 'medication',
      })
    }

    // Prescription history & side effects
    const prescriptionHistory = answers.prescriptionHistory as string | undefined
    const lastPrescribedBy = answers.lastPrescribedBy as string | undefined
    const hasSideEffects = answers.hasSideEffects as boolean | undefined
    const sideEffects = answers.sideEffects as string | undefined

    if (prescriptionHistory) {
      const PRESCRIPTION_HISTORY_LABELS: Record<string, string> = {
        less_than_3_months: 'Less than 3 months ago',
        '3_to_6_months': '3-6 months ago',
        '6_to_12_months': '6-12 months ago',
        over_12_months: 'Over 12 months ago',
      }
      const historyItems = [
        { label: 'Last prescribed', value: PRESCRIPTION_HISTORY_LABELS[prescriptionHistory] || prescriptionHistory },
        ...(lastPrescribedBy ? [{ label: 'Last prescriber', value: lastPrescribedBy }] : []),
        { label: 'Side effects', value: hasSideEffects ? (sideEffects || 'Yes') : 'None reported' },
      ]
      sections.push({ title: 'Prescription History', items: historyItems, stepId: 'medication-history' })
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
      if (answers.preferredTimeSlot || answers.preferredDays || answers.callbackPhone) {
        const TIME_LABELS: Record<string, string> = { morning: 'Morning (9am-12pm)', afternoon: 'Afternoon (12pm-5pm)', evening: 'Evening (5pm-8pm)' }
        const DAY_LABELS: Record<string, string> = { weekday: 'Weekdays', weekend: 'Weekends', any: 'Any day' }
        sections.push({
          title: 'Call Scheduling',
          items: [
            { label: 'Preferred time', value: TIME_LABELS[answers.preferredTimeSlot as string] || String(answers.preferredTimeSlot || '—') },
            { label: 'Preferred days', value: DAY_LABELS[answers.preferredDays as string] || String(answers.preferredDays || '—') },
            { label: 'Phone', value: String(answers.callbackPhone || '—') },
          ],
          stepId: 'weight-loss-call',
        })
      }
    }
  }

  // Medical history section (shared)
  const hasAllergies = answers.hasAllergies as boolean
  const allergies = answers.allergies as string
  const hasConditions = answers.hasConditions as boolean
  const conditions = answers.conditions as string
  const isPregnantOrBreastfeeding = answers.isPregnantOrBreastfeeding as boolean | undefined
  const hasAdverseMedicationReactions = answers.hasAdverseMedicationReactions as boolean | undefined
  const hasOtherMedications = answers.hasOtherMedications as boolean | undefined
  const otherMedications = answers.otherMedications as string | undefined

  if (hasAllergies !== undefined || hasConditions !== undefined) {
    const medHistoryItems = [
      { label: 'Allergies', value: hasAllergies ? (allergies || 'Yes') : 'None' },
      { label: 'Conditions', value: hasConditions ? (conditions || 'Yes') : 'None' },
    ]
    if (hasOtherMedications !== undefined) {
      medHistoryItems.push({ label: 'Other medications', value: hasOtherMedications ? (otherMedications || 'Yes') : 'None' })
    }
    if (isPregnantOrBreastfeeding !== undefined) {
      medHistoryItems.push({ label: 'Pregnant/breastfeeding', value: isPregnantOrBreastfeeding ? 'Yes' : 'No' })
    }
    if (hasAdverseMedicationReactions !== undefined) {
      medHistoryItems.push({ label: 'Adverse medication reactions', value: hasAdverseMedicationReactions ? 'Yes' : 'No' })
    }
    sections.push({
      title: 'Medical History',
      items: medHistoryItems,
      stepId: 'medical-history',
    })
  }

  // Patient details
  sections.push({
    title: 'Your Details',
    items: [
      { label: 'Name', value: `${firstName} ${lastName}`.trim() },
      { label: 'Email', value: email },
      { label: 'Phone', value: phone || 'Not provided' },
    ],
    stepId: 'details',
  })

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Review your request</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Please check the details below before proceeding to payment
        </p>
      </div>

      {/* Review sections */}
      <div className="space-y-4">
        {sections.map((section, i) => (
          <ReviewSection
            key={i}
            title={section.title}
            items={section.items}
            onEdit={section.stepId ? () => goToStep(section.stepId as Parameters<typeof goToStep>[0]) : undefined}
          />
        ))}
      </div>

      {/* Reassurance badges — frosted glass */}
      <div className="grid grid-cols-3 gap-2 py-2">
        {[
          { icon: Shield, color: 'text-emerald-600', label: 'Real Australian doctor' },
          { icon: Clock, color: 'text-primary', label: 'Issued within ~1 hour' },
          { icon: RefreshCw, color: 'text-green-600', label: 'Full refund guarantee' },
        ].map((badge) => (
          <div
            key={badge.label}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-card/50 dark:bg-white/5 border border-border/60 dark:border-white/10 backdrop-blur-sm"
          >
            <badge.icon className={`w-4 h-4 ${badge.color}`} />
            <span className="text-xs text-muted-foreground text-center leading-tight">{badge.label}</span>
          </div>
        ))
        }
      </div>

      {/* Safety consent */}
      <div className="rounded-2xl border border-border/50 dark:border-white/10 bg-muted/30 dark:bg-white/5 p-5">
        <div className="flex items-center gap-3">
          <Switch
            id="safety-consent"
            checked={safetyConfirmed}
            onCheckedChange={setSafetyConfirmed}
          />
          <Label htmlFor="safety-consent" className="text-sm cursor-pointer leading-snug text-muted-foreground">
            I confirm this is not a medical emergency. If I am experiencing an emergency, I will call 000.
          </Label>
        </div>
      </div>

      {/* Continue button */}
      <Button onClick={onNext} className="w-full h-12 mt-6" disabled={!safetyConfirmed}>
        Continue to payment
      </Button>
    </div>
  )
}
