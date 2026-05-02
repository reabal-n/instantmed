"use client"

/**
 * Review Step - Summary of request before checkout
 * Shows all collected information for patient to verify
 */

import { Check, ChevronDown, ChevronUp, Clock, CreditCard, Edit2, Loader2, Lock, MessageSquare, RefreshCw, ShieldCheck, Smartphone } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import { useRef,useState } from "react"

import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"
import { PaymentLogos } from "@/components/checkout/payment-logos"
import { GoogleAdsCert } from "@/components/marketing/google-ads-cert"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getAttribution } from "@/lib/analytics/attribution"
import { trackFunnelStep } from "@/lib/analytics/conversion-tracking"
import { PRICING as APP_PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { CONSULT_SUBTYPE_DISPLAY_LABELS,getDisplayPrice, getServiceDisplayLabel } from "@/lib/request/display-helpers"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

interface ReviewStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack?: () => void
  onComplete?: () => void
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
        aria-expanded={expanded}
        aria-label={expanded ? "Show less" : "Show more"}
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
    <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06]">
      <div className="px-5 pt-4 pb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="px-2 text-xs gap-1 rounded-lg hover:bg-muted/50 dark:hover:bg-white/10" aria-label={`Edit ${title}`}>
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
                {item.value ? <ExpandableValue value={item.value} /> : '-'}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

export default function ReviewStep({ serviceType, onNext }: ReviewStepProps) {
  const { answers, firstName, lastName, email, phone, dob, goToStep, safetyConfirmed, setSafetyConfirmed, getIdentity, setConsent } = useRequestStore()
  const posthog = usePostHog()
  const consentRef = useRef<HTMLDivElement>(null)
  const isPrescriptionCheckout = serviceType === "prescription" || serviceType === "repeat-script"
  const price = getDisplayPrice(serviceType, answers)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [isPriority, setIsPriority] = useState(false)
  const totalDue = price + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)

  const handleConsentChange = (checked: boolean) => {
    setSafetyConfirmed(checked)
    if (isPrescriptionCheckout) {
      setConsent("agreedToTerms", checked)
      setConsent("confirmedAccuracy", checked)
      setConsent("telehealthConsent", checked)
    }
  }

  const handleContinue = () => {
    posthog?.capture('step_completed', {
      step: 'review',
      service_type: serviceType,
      consult_subtype: answers.consultSubtype,
      has_safety_consent: safetyConfirmed,
    })
    onNext()
  }

  const handlePayment = async () => {
    if (!safetyConfirmed || !isPrescriptionCheckout) {
      handleDisabledClick()
      return
    }

    setIsProcessing(true)
    setError(null)

    const identity = getIdentity()
    posthog?.capture("checkout_initiated", {
      service_type: serviceType,
      price_dollars: totalDue,
      is_priority: isPriority,
      subscribe_and_save: false,
    })
    void trackFunnelStep("checkout", serviceType, identity.email)

    try {
      const result = await createCheckoutFromUnifiedFlow({
        serviceType,
        answers: {
          ...answers,
          agreedToTerms: true,
          confirmedAccuracy: true,
          telehealthConsentGiven: true,
          isPriority,
          subscribeAndSave: false,
        },
        identity,
        attribution: getAttribution(),
        posthogDistinctId: posthog?.get_distinct_id() || undefined,
      })

      if (!result.success) {
        posthog?.capture("checkout_failed", {
          service_type: serviceType,
          stage: "session_creation",
        })
        setError(result.error || "Unable to create payment session. Please try again.")
        return
      }

      if (!result.checkoutUrl) {
        posthog?.capture("checkout_failed", {
          service_type: serviceType,
          stage: "missing_checkout_url",
        })
        setError("Unable to create payment session. Please try again.")
        return
      }

      posthog?.capture("checkout_redirecting", {
        service_type: serviceType,
        price_dollars: totalDue,
      })
      setShowCheckmark(true)
      setTimeout(() => {
        window.location.href = result.checkoutUrl!
      }, 500)
    } catch {
      posthog?.capture("checkout_failed", {
        service_type: serviceType,
        stage: "exception",
      })
      setError("Something went wrong. Please try again or contact support.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDisabledClick = () => {
    consentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Focus the checkbox to make the requirement visually obvious
    consentRef.current?.querySelector('button')?.focus()
  }

  // Build review sections based on service type
  const sections: { title: string; items: { label: string; value: string }[]; stepId?: string }[] = []

  // Service info
  const consultSubtypeForLabel = answers.consultSubtype as string | undefined
  const serviceLabel = getServiceDisplayLabel(serviceType, consultSubtypeForLabel)

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

  // Prescription specific sections - combined Medication + History into one card
  if (serviceType === 'prescription' || serviceType === 'repeat-script') {
    const medications = answers.medications as Array<{ product: unknown; name: string; strength?: string; form?: string }> | undefined
    const medicationName = answers.medicationName as string
    const medicationStrength = answers.medicationStrength as string
    const prescriptionHistory = answers.prescriptionHistory as string | undefined
    const currentDose = answers.currentDose as string | undefined
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
      if (currentDose) {
        items.push({ label: 'Current dose', value: currentDose })
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
      if (currentDose) {
        items.push({ label: 'Current dose', value: currentDose })
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
        skin: 'Skin condition',
        infection: 'Infection',
        mental_health: 'Mental health',
        ...CONSULT_SUBTYPE_DISPLAY_LABELS,
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
      const ED_GOAL_LABELS: Record<string, string> = {
        improve_erections: 'Improve erections',
        more_spontaneity: 'More spontaneity',
        boost_confidence: 'Boost confidence',
        better_stamina: 'Better stamina',
        maintain: 'Maintain what I have',
      }
      const ED_DURATION_LABELS: Record<string, string> = {
        less_than_3_months: 'Less than 3 months',
        '3_to_12_months': '3\u201312 months',
        '1_to_3_years': '1\u20133 years',
        '3_plus_years': '3+ years',
      }
      const ED_PREF_LABELS: Record<string, string> = {
        daily: 'Daily (always ready)',
        prn: 'As-needed',
        doctor_decides: 'Doctor\u2019s recommendation',
      }

      const edItems: { label: string; value: string }[] = []

      if (answers.edGoal) {
        edItems.push({ label: 'Main goal', value: ED_GOAL_LABELS[answers.edGoal as string] || String(answers.edGoal) })
      }
      if (answers.edDuration) {
        edItems.push({ label: 'Duration of concern', value: ED_DURATION_LABELS[answers.edDuration as string] || String(answers.edDuration) })
      }
      if (answers.iiefTotal !== undefined) {
        const score = answers.iiefTotal as number
        const severity = score >= 22 ? 'Mild' : score >= 17 ? 'Mild\u2013moderate' : score >= 12 ? 'Moderate' : 'Significant'
        edItems.push({ label: 'IIEF-5 score', value: `${score}/25 \u2014 ${severity}` })
      }
      if (answers.edPreference) {
        edItems.push({ label: 'Treatment preference', value: ED_PREF_LABELS[answers.edPreference as string] || String(answers.edPreference) })
      }
      if (answers.bmi) {
        edItems.push({ label: 'BMI', value: String(answers.bmi) })
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

    // Hair loss assessment (4-step flow: goals, pattern, health, preferences)
    if (consultSubtype === 'hair_loss') {
      const GOAL_LABELS: Record<string, string> = {
        prevent: 'Prevent further loss',
        regrow: 'Regrow what I\'ve lost',
        both: 'Both (stop + regrow)',
        exploring: 'Just exploring options',
      }
      const ONSET_LABELS: Record<string, string> = {
        not_yet: 'Not yet (prevention)',
        few_months: 'Last few months',
        '6_12_months': '6-12 months',
        '1_2_years': '1-2 years',
        '2_plus_years': '2+ years',
      }
      const PATTERN_LABELS: Record<string, string> = {
        none: 'No noticeable loss',
        slight_recession: 'Slight recession at temples',
        noticeable_thinning: 'Noticeable thinning / recession',
        crown_plus_hairline: 'Crown thinning + hairline recession',
        significant: 'Significant overall thinning',
        extensive: 'Extensive loss',
      }
      const FAMILY_HISTORY_LABELS: Record<string, string> = {
        yes_father: "Yes, father's side",
        yes_mother: "Yes, mother's side",
        yes_both: 'Yes, both sides',
        no: 'No family history',
        unknown: 'Not sure',
      }
      const HAIR_MED_LABELS: Record<string, string> = {
        oral: 'Daily oral tablet',
        combination: 'Combination (oral + OTC scalp treatment)',
        doctor_decides: 'Doctor to recommend',
      }
      const REPRODUCTIVE_LABELS: Record<string, string> = {
        no: 'No',
        na: 'Not applicable',
        yes: 'Yes',
      }
      const triedTreatments = [
        { key: 'triedMinoxidil', label: 'Topical solution' },
        { key: 'triedFinasteride', label: 'Oral medication' },
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
        { label: 'Goal', value: GOAL_LABELS[answers.hairGoal as string] || String(answers.hairGoal || '-') },
        { label: 'Onset', value: ONSET_LABELS[answers.hairOnset as string] || String(answers.hairOnset || '-') },
        { label: 'Pattern', value: PATTERN_LABELS[answers.hairPattern as string] || String(answers.hairPattern || '-') },
        { label: 'Family history', value: FAMILY_HISTORY_LABELS[answers.hairFamilyHistory as string] || String(answers.hairFamilyHistory || '-') },
        { label: 'Preference', value: HAIR_MED_LABELS[answers.hairMedicationPreference as string] || String(answers.hairMedicationPreference || '-') },
      ]
      if (answers.hairReproductive) {
        hairItems.push({ label: 'Partner pregnant/trying', value: REPRODUCTIVE_LABELS[answers.hairReproductive as string] || String(answers.hairReproductive) })
      }
      if (triedTreatments.length > 0) {
        hairItems.push({ label: 'Tried previously', value: triedTreatments.join(', ') })
      }
      if (scalpConditions.length > 0) {
        hairItems.push({ label: 'Scalp conditions', value: scalpConditions.join(', ') })
      } else if (answers.scalpNone) {
        hairItems.push({ label: 'Scalp conditions', value: 'None' })
      }
      if (answers.hairLowBP || answers.hairHeartConditions) {
        const bpItems = []
        if (answers.hairLowBP) bpItems.push('Low blood pressure / dizziness')
        if (answers.hairHeartConditions) bpItems.push('Heart conditions / palpitations')
        hairItems.push({ label: 'Cardiovascular', value: bpItems.join(', ') })
      }
      if (answers.hairAdditionalInfo) {
        hairItems.push({ label: 'Additional info', value: String(answers.hairAdditionalInfo) })
      }
      sections.push({
        title: 'Hair Loss Assessment',
        items: hairItems,
        stepId: 'hair-loss-goals',
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
        { label: 'Concern', value: WH_TYPE_LABELS[whOption as string] || String(whOption || '-') },
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
        { label: 'Current weight', value: answers.currentWeight ? `${answers.currentWeight} kg` : '-' },
        { label: 'Height', value: answers.currentHeight ? `${answers.currentHeight} cm` : '-' },
        { label: 'Target weight', value: answers.targetWeight ? `${answers.targetWeight} kg` : '-' },
        ...(bmi ? [{ label: 'BMI', value: bmi }] : []),
        { label: 'Previous attempts', value: PREV_ATTEMPTS_LABELS[answers.previousAttempts as string] || String(answers.previousAttempts || '-') },
        { label: 'Medication preference', value: WL_MED_LABELS[answers.weightLossMedPreference as string] || String(answers.weightLossMedPreference || '-') },
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
            { label: 'Preferred time', value: TIME_LABELS[answers.preferredTimeSlot as string] || String(answers.preferredTimeSlot || '-') },
            { label: 'Phone', value: String(answers.callbackPhone || '-') },
          ],
          stepId: 'weight-loss-call',
        })
      }
    }
  }

  // Medical history - only show items with notable values (positive flags)
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

  // Patient details - compact
  const dobDisplay = dob ? new Date(dob).toLocaleDateString('en-AU') : ''
  const detailItems = [
    { label: 'Name', value: `${firstName} ${lastName}`.trim() },
    { label: 'Email', value: email },
    { label: 'Date of birth', value: dobDisplay || '-' },
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

  // Filter out the standalone "Request Type" section - redundant since the flow header already shows the service
  const displaySections = sections.filter(s => s.title !== 'Request Type')

  return (
    <div className="space-y-3">
      {/* Compact header */}
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold">One last check</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Make sure everything looks right. A doctor reviews as soon as you submit.
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
        {isPrescriptionCheckout && (
          <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                htmlFor="review-express-review-toggle"
                className={`min-h-[86px] rounded-xl border p-3 cursor-pointer transition-colors ${
                  isPriority ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <Switch
                    id="review-express-review-toggle"
                    checked={isPriority}
                    onCheckedChange={(checked) => {
                      setIsPriority(checked)
                      if (checked) posthog?.capture("express_review_opted_in", { service_type: serviceType })
                    }}
                    aria-label="Enable express review"
                  />
                </div>
                <div className="text-sm font-medium leading-tight">Express review</div>
                <div className="mt-1 text-xs text-muted-foreground">+{PRICING_DISPLAY.PRIORITY_FEE}</div>
              </label>
              <div className="min-h-[86px] rounded-xl border border-border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <div className="text-sm font-medium leading-tight">One-off request</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  No subscription. The doctor reviews this request, then you pay again only when you need another script.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                eScript by SMS
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Doctor reviews
              </span>
            </div>
          </div>
        )}

        {/* Price summary - show before CTA so there's no payment surprise */}
        <div className="px-4 py-3 rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{isPrescriptionCheckout ? "Due today" : "Total today"}</span>
            <span className="text-base font-semibold text-foreground">
              ${totalDue.toFixed(2)}
            </span>
          </div>
          {isPrescriptionCheckout && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>One-time fee</span>
              {isPriority && <span>Includes express review</span>}
            </div>
          )}
        </div>

        <div ref={consentRef} className={`rounded-2xl border p-4 transition-colors duration-200 ${safetyConfirmed ? 'border-border/50 dark:border-white/10 bg-muted/30 dark:bg-white/5' : 'border-warning-border bg-warning-light/50 dark:bg-warning/10'}`}>
          <div className="flex items-start gap-3">
            <Checkbox
              id="safety-consent"
              checked={safetyConfirmed}
              onCheckedChange={(checked) => handleConsentChange(checked === true)}
              className="mt-0.5"
              aria-label={isPrescriptionCheckout ? "Confirm request and payment terms" : "Confirm this is not a medical emergency"}
            />
            <Label htmlFor="safety-consent" className="text-sm cursor-pointer leading-snug text-muted-foreground">
              {isPrescriptionCheckout ? (
                <>
                  I confirm this is not a medical emergency, my information is accurate, and I agree to the{" "}
                  <a href="/terms" className="text-primary underline" target="_blank" onClick={(event) => event.stopPropagation()}>
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-primary underline" target="_blank" onClick={(event) => event.stopPropagation()}>
                    Privacy Policy
                  </a>
                  .
                </>
              ) : (
                "I confirm this is not a medical emergency. In an emergency, I'll call 000."
              )}
            </Label>
          </div>
          {!safetyConfirmed && (
            <p id="safety-consent-warning" className="text-xs text-warning mt-2 pl-7" aria-live="polite">
              Please confirm above to continue
            </p>
          )}
        </div>

        {/*
          Button stays focusable + clickable even when consent is missing so keyboard users get
          the same "scroll to consent" affordance as mouse users. aria-disabled communicates the
          state to screen readers; disabled={false} keeps the event handlers live.
        */}
        <Button
          onClick={safetyConfirmed ? (isPrescriptionCheckout ? handlePayment : handleContinue) : handleDisabledClick}
          className={`w-full h-12 ${safetyConfirmed ? '' : 'opacity-60 hover:opacity-70'}`}
          aria-disabled={!safetyConfirmed || isProcessing}
          aria-describedby={!safetyConfirmed ? 'safety-consent-warning' : undefined}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isPrescriptionCheckout ? (
            <>
              <CreditCard className="h-4 w-4" />
              Pay ${totalDue.toFixed(2)}
            </>
          ) : (
            "Continue to payment"
          )}
        </Button>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isPrescriptionCheckout && (
          <p className="text-center text-[11px] text-muted-foreground">
            Express review available at checkout (+{PRICING_DISPLAY.PRIORITY_FEE})
          </p>
        )}

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              AHPRA-registered doctor
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {serviceType === 'consult' ? "Refund if we can't help" : "Full refund if declined"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LegitScriptSeal size="sm" />
            <GoogleAdsCert size="sm" />
          </div>
          {isPrescriptionCheckout && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <PaymentLogos />
            </div>
          )}
        </div>
      </div>

      {showCheckmark && (
        <div
          role="status"
          aria-label="Redirecting to secure payment"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  )
}
