"use client"

/**
 * Review Step - Summary of request before checkout
 * Shows all collected information for patient to verify
 */

import { Check, ChevronDown, ChevronUp, CreditCard, Edit2, Loader2, Lock } from "lucide-react"
import { useEffect, useRef,useState } from "react"

import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"
import { PaymentLogos } from "@/components/checkout/payment-logos"
import { PriorityReviewToggle } from "@/components/request/shared/priority-review-toggle"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { type AttributionData, getAttribution } from "@/lib/analytics/attribution"
import { capture } from "@/lib/analytics/capture"
import { trackFunnelStep } from "@/lib/analytics/conversion-tracking"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { capturePriorityReviewOptedIn, capturePriorityReviewOptedOut } from "@/lib/analytics/priority-review-events"
import { classifyAttributionSource } from "@/lib/analytics/source-classification"
import { getRepeatsExpectation } from "@/lib/clinical/repeats-policy"
import { PRICING as APP_PRICING } from "@/lib/constants"
import { getAddressReviewSummary, getAddressStatusDisplay } from "@/lib/request/address-metadata"
import { getDisplayPrice, getServiceDisplayLabel } from "@/lib/request/display-helpers"
import { normalizeMedicationEntriesAnswer, stringAnswer, stringArrayAnswer } from "@/lib/request/intake-answer-normalizers"
import { getActiveServerDraftSessionId } from "@/lib/request/server-draft"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { markIntentionalNavigation } from "../hooks/use-unsaved-changes"
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

const YES_NO_REVIEW_LABELS: Record<string, string> = {
  no: 'No',
  yes: 'Yes',
}

const UTI_REVIEW_SYMPTOM_LABELS: Record<string, string> = {
  burning: 'Burning or stinging',
  frequency: 'Urinating more often',
  urgency: 'Urgent need to go',
  incomplete: 'Not emptying fully',
  blood: 'Blood in urine',
  cloudy: 'Cloudy or smelly',
}

const UTI_PREGNANCY_REVIEW_LABELS: Record<string, string> = {
  no: 'No',
  not_sure: 'Not sure',
  yes: 'Yes',
}

const CONTRACEPTION_REVIEW_TYPE_LABELS: Record<string, string> = {
  start: 'Start pill',
  continue: 'Repeat prescription route',
  switch: 'Switch pill',
}

const CONTRACEPTION_CURRENT_REVIEW_LABELS: Record<string, string> = {
  pill: 'The pill',
  iud: 'IUD or implant',
  other: 'Other method',
  none: 'None',
}

const PILL_SAFETY_REVIEW_LABELS: Record<string, string> = {
  womens_migraine_aura: 'Migraine with aura',
  womens_blood_clot_history: 'Blood clot history',
  womens_smoker: 'Smoking status',
}

function reviewLabel(labels: Record<string, string>, value: string | undefined): string {
  return value ? labels[value] || value : ''
}

function explicitYesNoReviewLabel(value: unknown): string {
  if (value === true || value === 'yes') return 'Yes'
  if (value === false || value === 'no') return 'No'
  return ''
}

function medicalHistoryReviewValue(response: unknown, detail: unknown): string {
  if (response === false || response === 'no') return 'None reported'
  if (response === true || response === 'yes') {
    return stringAnswer(detail) || 'Not answered'
  }
  return ''
}

const TRUNCATE_THRESHOLD = 60
type ReviewItem = { label: string; value: string; badge?: { label: string; tone: "success" | "warning" } }

function cleanTelemetryValue(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed || null
}

function safeReferrerHost(referrer?: string | null): string | null {
  const raw = cleanTelemetryValue(referrer)
  if (!raw) return null

  try {
    return new URL(raw).hostname.replace(/^www\./, "") || null
  } catch {
    return null
  }
}

function safeLandingPath(landingPage?: string | null): string | null {
  const raw = cleanTelemetryValue(landingPage)
  if (!raw) return null

  try {
    const url = raw.startsWith("http")
      ? new URL(raw)
      : new URL(raw, "https://instantmed.com.au")
    return url.pathname || "/"
  } catch {
    return raw.startsWith("/") ? raw.split(/[?#]/)[0] || "/" : null
  }
}

function buildCheckoutInitiatedAttributionProps(attribution: AttributionData) {
  const classification = classifyAttributionSource(attribution)

  return {
    utm_source: cleanTelemetryValue(attribution.utm_source),
    utm_medium: cleanTelemetryValue(attribution.utm_medium),
    utm_id: cleanTelemetryValue(attribution.utm_id),
    utm_campaign: cleanTelemetryValue(attribution.utm_campaign),
    utm_content: cleanTelemetryValue(attribution.utm_content),
    utm_term: cleanTelemetryValue(attribution.utm_term),
    campaignid: cleanTelemetryValue(attribution.campaignid),
    has_click_id: Boolean(attribution.gclid || attribution.gbraid || attribution.wbraid),
    referrer_host: safeReferrerHost(attribution.referrer),
    landing_path: safeLandingPath(attribution.landing_page),
    attribution_group: classification.group,
  }
}

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
        className="ml-1 inline-flex min-h-11 items-center gap-0.5 text-base text-primary hover:text-primary/80 font-normal"
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

/**
 * One dense summary card (P1.2, 2026-07-10). The stacked per-section cards
 * pushed Pay far below the fold at the highest-anxiety moment; sections are
 * now divided groups inside a single card, and EMPTY rows are hidden — a
 * "Symptoms: -" line at the pay moment reads as a bug, not a summary.
 */
function ReviewSummaryCard({
  sections,
  onEditStep,
}: {
  sections: { title: string; items: ReviewItem[]; stepId?: string }[]
  onEditStep: (stepId: string) => void
}) {
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => Boolean(item.value) || Boolean(item.badge)),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="rounded-2xl border border-border/50 bg-white dark:bg-card dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none divide-y divide-border/40 dark:divide-white/10">
      {visibleSections.map((section) => (
        <div key={section.title} className="px-5 py-3.5">
          <div className="flex items-center justify-between gap-3 pb-2">
            <h3 className="min-w-0 text-base font-medium text-foreground">{section.title}</h3>
            {section.stepId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(section.stepId as string)}
                className="-mr-2 h-11 min-w-11 shrink-0 gap-1 rounded-lg px-3 text-sm hover:bg-muted/50 dark:hover:bg-white/10"
                aria-label={`Edit ${section.title}`}
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
          <dl className="space-y-2">
            {section.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-3 text-base">
                <dt className="min-w-0 text-muted-foreground">{item.label}</dt>
                <dd className="flex max-w-[64%] flex-col items-end gap-1 text-right font-medium">
                  {item.value ? <span><ExpandableValue value={item.value} /></span> : null}
                  {item.badge && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        item.badge.tone === "success"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                      }`}
                    >
                      {item.badge.label}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

export default function ReviewStep({ serviceType }: ReviewStepProps) {
  const { answers, firstName, lastName, email, phone, dob, goToStep, safetyConfirmed, setSafetyConfirmed, getIdentity, setConsent } = useRequestStore()
  const posthog = usePostHog()
  const consentRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const isPrescriptionCheckout = serviceType === "prescription" || serviceType === "repeat-script"
  const price = getDisplayPrice(serviceType, answers)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [isPriority, setIsPriority] = useState(false)
  const totalDue = price + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)

  // review-step is the single review+pay step for EVERY service (the unification
  // retired the separate consult checkout-step + med-cert checkout-step on
  // 2026-06-28), so it owns checkout_viewed (reached-checkout) for all of them.
  // No more consult double-count guard — there is no second checkout surface.
  useEffect(() => {
    posthog?.capture("checkout_viewed", {
      service_type: serviceType,
      consult_subtype: answers.consultSubtype,
    })
  }, [posthog, serviceType, answers.consultSubtype])

  // Pull a checkout error into view so it isn't missed below the fold / pay CTA.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [error])

  const handleConsentChange = (checked: boolean) => {
    setSafetyConfirmed(checked)
    // review-step is the pay step for every service now, so the single consent
    // tick records the payment terms + accuracy attestation for all of them.
    setConsent("agreedToTerms", checked)
    setConsent("confirmedAccuracy", checked)
    setConsent("telehealthConsent", checked)
  }

  const handlePayment = async () => {
    if (!safetyConfirmed) {
      handleDisabledClick()
      return
    }

    setIsProcessing(true)
    setError(null)

    const identity = getIdentity()
    const attribution = getAttribution()
    capture("checkout_initiated", {
      service_type: serviceType,
      consult_subtype: answers.consultSubtype,
      price_dollars: totalDue,
      is_priority: isPriority,
      ...buildCheckoutInitiatedAttributionProps(attribution),
    }, {
      send_instantly: true,
      transport: "sendBeacon",
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
        },
        identity,
        attribution,
        posthogDistinctId: posthog?.get_distinct_id() || undefined,
        serverDraftSessionId: getActiveServerDraftSessionId(serviceType) ?? undefined,
      })

      if (!result.success) {
        posthog?.capture("checkout_failed", {
          service_type: serviceType,
          consult_subtype: answers.consultSubtype,
          stage: "session_creation",
          // Real reason ("No such price", "Phone number is required", ...) so the
          // failure breakdown is actionable. System message, not patient input.
          reason: result.error?.slice(0, 200),
        })
        setError(result.error || "Unable to create payment session. Please try again.")
        return
      }

      if (!result.checkoutUrl) {
        posthog?.capture("checkout_failed", {
          service_type: serviceType,
          consult_subtype: answers.consultSubtype,
          stage: "missing_checkout_url",
          reason: "missing_checkout_url",
        })
        setError("Unable to create payment session. Please try again.")
        return
      }

      posthog?.capture("checkout_redirecting", {
        service_type: serviceType,
        consult_subtype: answers.consultSubtype,
        price_dollars: totalDue,
      })
      setShowCheckmark(true)
      setTimeout(() => {
        // The Stripe redirect is a page unload at the pay step — without this
        // every paying customer fired intake_abandoned_passive.
        markIntentionalNavigation()
        window.location.href = result.checkoutUrl!
      }, 500)
    } catch (e) {
      posthog?.capture("checkout_failed", {
        service_type: serviceType,
        consult_subtype: answers.consultSubtype,
        stage: "exception",
        reason: e instanceof Error ? e.message.slice(0, 200) : "exception",
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
  const sections: { title: string; items: ReviewItem[]; stepId?: string }[] = []

  // Service info
  const consultSubtypeForLabel = stringAnswer(answers.consultSubtype) || undefined
  const serviceLabel = getServiceDisplayLabel(serviceType, consultSubtypeForLabel)
  // "What to expect" re: repeats — only for services that get a repeatable script
  // (null for med certs / women's health / weight loss). Expectation-setting copy.
  const repeatsExpectation = getRepeatsExpectation(serviceType, consultSubtypeForLabel)

  sections.push({
    title: 'Request Type',
    items: [
      { label: 'Service', value: serviceLabel },
    ],
  })

  // Med-cert specific sections
  if (serviceType === 'med-cert') {
    const certType = stringAnswer(answers.certType)
    const duration = stringAnswer(answers.duration)
    const startDate = stringAnswer(answers.startDate)
    
    sections.push({
      title: 'Certificate Details',
      items: [
        { label: 'Type', value: CERT_TYPE_LABELS[certType] || certType },
        { label: 'Duration', value: duration ? `${duration} day${duration === '1' ? '' : 's'}` : '' },
        { label: 'Start date', value: startDate ? new Date(startDate).toLocaleDateString('en-AU') : '' },
      ],
      stepId: 'certificate',
    })

    const symptoms = stringArrayAnswer(answers.symptoms)
    const symptomDetails = stringAnswer(answers.symptomDetails)
    const symptomDuration = stringAnswer(answers.symptomDuration)
    
    sections.push({
      title: 'Symptoms',
      items: [
        { label: 'Symptoms', value: symptoms.join(', ') || '' },
        { label: 'Duration', value: SYMPTOM_DURATION_LABELS[symptomDuration] || symptomDuration || '' },
        { label: 'Details', value: symptomDetails || '' },
      ],
      stepId: 'symptoms',
    })
  }

  // Prescription-specific sections. Keep the medication identity and the
  // patient-reported prescribing history under the steps that own them.
  if (serviceType === 'prescription' || serviceType === 'repeat-script') {
    const medications = normalizeMedicationEntriesAnswer(answers.medications)
    const primaryMedication = medications[0]
    const medicationName = stringAnswer(answers.medicationName) || primaryMedication?.name || ""
    const medicationStrength = stringAnswer(answers.medicationStrength) || primaryMedication?.strength || ""
    const prescriptionHistory = stringAnswer(answers.prescriptionHistory) || undefined
    const currentDose = stringAnswer(answers.currentDose) || undefined
    const indication = stringAnswer(answers.indication) || undefined
    const doseChanged = answers.doseChanged as boolean | undefined
    const hasSideEffects = answers.hasSideEffects as boolean | undefined
    const sideEffects = stringAnswer(answers.sideEffects) || undefined

    const PRESCRIPTION_HISTORY_LABELS: Record<string, string> = {
      less_than_3_months: 'Less than 3 months ago',
      '3_to_6_months': '3-6 months ago',
      '6_to_12_months': '6-12 months ago',
      over_12_months: 'Over 12 months ago',
    }

    const medicationItems: ReviewItem[] = medications.length > 1
      ? medications.flatMap((med, i) => [
        { label: `Medication ${i + 1}`, value: med.name || '' },
        ...(med.strength ? [{ label: `Strength ${i + 1}`, value: med.strength }] : []),
      ])
      : [
        { label: 'Medication', value: medicationName || '' },
        ...(medicationStrength ? [{ label: 'Strength', value: medicationStrength }] : []),
      ]

    sections.push({
      title: medications.length > 1 ? 'Medications' : 'Medication',
      items: medicationItems,
      stepId: 'medication',
    })

    const prescriptionDetailItems: ReviewItem[] = []
    if (prescriptionHistory) {
      prescriptionDetailItems.push({
        label: 'Last prescribed',
        value: PRESCRIPTION_HISTORY_LABELS[prescriptionHistory] || prescriptionHistory,
      })
    }
    if (currentDose) {
      prescriptionDetailItems.push({ label: 'Current dose', value: currentDose })
    }
    if (doseChanged === false) {
      prescriptionDetailItems.push({ label: 'Same dose and directions', value: 'Confirmed' })
    }
    if (indication) {
      prescriptionDetailItems.push({ label: 'Used for', value: indication })
    }
    if (hasSideEffects === false) {
      prescriptionDetailItems.push({ label: 'Side effects', value: 'No side effects reported' })
    } else if (hasSideEffects === true) {
      prescriptionDetailItems.push({ label: 'Side effects', value: sideEffects || 'Not answered' })
    }

    sections.push({
      title: 'Prescription details',
      items: prescriptionDetailItems,
      // Same screen as the Medication section since P2.1 merged the medicine
      // and its history into one step; both Edit links land there.
      stepId: 'medication',
    })
  }

  // Consult-specific sections
  if (serviceType === 'consult') {
    const consultSubtype = stringAnswer(answers.consultSubtype) || undefined

    // Erectile dysfunction review groups
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
        daily: 'Every day',
        prn: 'Only when I need it',
        // Retired from the UI 2026-07-19; stored drafts still render it.
        doctor_decides: 'Doctor\u2019s recommendation',
      }
      const ED_FREQUENCY_LABELS: Record<number, string> = {
        1: 'Almost never',
        2: 'Much less than half the time',
        3: 'About half the time',
        4: 'Much more than half the time',
        5: 'Almost always',
      }

      const edGoal = stringAnswer(answers.edGoal)
      const edDuration = stringAnswer(answers.edDuration)
      const edPreference = stringAnswer(answers.edPreference)
      const edAdditionalInfo = stringAnswer(answers.edAdditionalInfo)

      const edConcernItems: ReviewItem[] = []
      // `edGoal` stopped being collected on 2026-07-19; a restored draft may
      // still carry one.
      if (edGoal) {
        edConcernItems.push({
          label: 'Main goal',
          value: ED_GOAL_LABELS[edGoal] || edGoal,
        })
      }
      edConcernItems.push({
        label: 'Duration of concern',
        value: edDuration ? ED_DURATION_LABELS[edDuration] || edDuration : '',
      })
      if (answers.edErectionFrequency !== undefined) {
        const frequency = answers.edErectionFrequency as number
        edConcernItems.push({
          label: 'How often it happens',
          value: `${frequency}/5 \u2014 ${ED_FREQUENCY_LABELS[frequency] || 'Not answered'}`,
        })
      }
      // Only pre-2026-07-19 intakes carry an IIEF-5 total.
      if (answers.iiefTotal !== undefined) {
        const score = answers.iiefTotal as number
        const severity = score >= 22 ? 'Mild' : score >= 17 ? 'Mild\u2013moderate' : score >= 12 ? 'Moderate' : 'Significant'
        edConcernItems.push({ label: 'IIEF-5 score', value: `${score}/25 \u2014 ${severity}` })
      }
      sections.push({
        title: 'Your concern',
        items: edConcernItems,
        stepId: 'ed-goals',
      })

      const edSafetyItems: ReviewItem[] = [
        { label: 'Nitrates', value: explicitYesNoReviewLabel(answers.edNitrates) },
        { label: 'Alpha-blockers', value: explicitYesNoReviewLabel(answers.edAlphaBlockers) },
        {
          label: 'Recent cardiac event (6 months)',
          value: explicitYesNoReviewLabel(answers.edRecentHeartEvent),
        },
        {
          label: 'Severe heart condition/very low blood pressure',
          value: explicitYesNoReviewLabel(answers.edSevereHeart),
        },
      ]
      if (answers.edGpCleared === true) {
        edSafetyItems.push({ label: 'GP clearance', value: 'Confirmed' })
      }
      edSafetyItems.push(
        {
          label: 'Current medications',
          value: medicalHistoryReviewValue(answers.takes_medications, answers.current_medications),
        },
        {
          label: 'Allergies',
          value: medicalHistoryReviewValue(answers.has_allergies, answers.known_allergies),
        },
        {
          label: 'Other conditions',
          value: medicalHistoryReviewValue(answers.has_conditions, answers.existing_conditions),
        },
      )
      sections.push({
        title: 'Safety & health',
        items: edSafetyItems,
        stepId: 'ed-health',
      })

      sections.push({
        title: 'Treatment preference',
        items: [
          {
            label: 'Preference',
            value: edPreference ? ED_PREF_LABELS[edPreference] || edPreference : '',
          },
          {
            label: 'Tried treatment before',
            value: answers.previousEdMeds === true
              ? stringAnswer(answers.edPreviousTreatment) || 'Yes'
              : answers.previousEdMeds === false
                ? 'No'
                : '',
          },
          { label: 'Additional information', value: edAdditionalInfo },
        ],
        stepId: 'ed-preferences',
      })
    }

    // Hair loss review groups
    if (consultSubtype === 'hair_loss') {
      const GOAL_LABELS: Record<string, string> = {
        prevent: 'Prevent further loss',
        regrow: 'Regrow what I\'ve lost',
        both: 'Both (stop + regrow)',
        exploring: 'Just exploring options',
      }
      const ONSET_LABELS: Record<string, string> = {
        not_yet: 'Not yet (prevention)',
        under_6_months: 'Under 6 months',
        over_12_months: 'Over 12 months',
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
        yes_father: "Father's side",
        yes_mother: "Mother's side",
        yes_both: 'Both sides',
        no_or_unsure: 'No or not sure',
        // Legacy stored draft values from the former separate "No" / "Not sure" UI.
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

      const hairGoal = stringAnswer(answers.hairGoal)
      const hairOnset = stringAnswer(answers.hairOnset)
      const hairPattern = stringAnswer(answers.hairPattern)
      const hairFamilyHistory = stringAnswer(answers.hairFamilyHistory)
      const hairPreference = stringAnswer(answers.hairMedicationPreference)
      const hairReproductive = stringAnswer(answers.hairReproductive)
      const hairAdditionalInfo = stringAnswer(answers.hairAdditionalInfo)

      sections.push({
        title: 'Your goals',
        items: [
          {
            label: 'Goal',
            value: hairGoal ? GOAL_LABELS[hairGoal] || hairGoal : '',
          },
          {
            label: 'Onset',
            value: hairOnset ? ONSET_LABELS[hairOnset] || hairOnset : '',
          },
        ],
        stepId: 'hair-loss-goals',
      })

      const hairAssessmentItems: ReviewItem[] = [
        { label: 'Pattern', value: hairPattern ? PATTERN_LABELS[hairPattern] || hairPattern : '' },
        {
          label: 'Family history',
          value: hairFamilyHistory
            ? FAMILY_HISTORY_LABELS[hairFamilyHistory] || hairFamilyHistory
            : '',
        },
      ]
      if (triedTreatments.length > 0) {
        hairAssessmentItems.push({ label: 'Tried previously', value: triedTreatments.join(', ') })
      }
      sections.push({
        title: 'Pattern & history',
        items: hairAssessmentItems,
        stepId: 'hair-loss-assessment',
      })

      const hairSafetyItems: ReviewItem[] = [
        {
          label: 'Partner pregnant/trying',
          value: hairReproductive
            ? REPRODUCTIVE_LABELS[hairReproductive] || hairReproductive
            : '',
        },
      ]
      if (scalpConditions.length > 0) {
        hairSafetyItems.push({ label: 'Scalp conditions', value: scalpConditions.join(', ') })
      } else if (answers.scalpNone === true) {
        hairSafetyItems.push({ label: 'Scalp conditions', value: 'None reported' })
      }
      hairSafetyItems.push(
        {
          label: 'Low blood pressure/dizziness',
          value: explicitYesNoReviewLabel(answers.hairLowBP),
        },
        {
          label: 'Heart conditions/heart medication',
          value: explicitYesNoReviewLabel(answers.hairHeartConditions),
        },
        {
          label: 'Current medications',
          value: medicalHistoryReviewValue(answers.takes_medications, answers.current_medications),
        },
        {
          label: 'Allergies',
          value: medicalHistoryReviewValue(answers.has_allergies, answers.known_allergies),
        },
        {
          label: 'Other conditions',
          value: medicalHistoryReviewValue(answers.has_conditions, answers.existing_conditions),
        },
      )
      sections.push({
        title: 'Safety & health',
        items: hairSafetyItems,
        stepId: 'hair-loss-health',
      })

      sections.push({
        title: 'Treatment preference',
        items: [
          {
            label: 'Preference',
            value: hairPreference ? HAIR_MED_LABELS[hairPreference] || hairPreference : '',
          },
          { label: 'Additional information', value: hairAdditionalInfo },
        ],
        stepId: 'hair-loss-preferences',
      })
    }

    // Women's health pathway choice and assessment answers have separate owners.
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
      const whOption = stringAnswer(answers.womensHealthOption)
      const whAssessmentItems: ReviewItem[] = []

      sections.push({
        title: "Women's health",
        items: [
          {
            label: 'Concern',
            value: whOption ? WH_TYPE_LABELS[whOption] || whOption : '',
          },
        ],
        stepId: 'womens-health-type',
      })

      // Contraception details
      if (whOption === 'ocp_new' || whOption === 'ocp_repeat' || whOption === 'contraception') {
        const contraceptionType = stringAnswer(answers.contraceptionType)
        const contraceptionCurrent = stringAnswer(answers.contraceptionCurrent)
        const pregnancyStatus = stringAnswer(answers.pregnancyStatus)
        if (contraceptionType) whAssessmentItems.push({ label: 'Pill request', value: reviewLabel(CONTRACEPTION_REVIEW_TYPE_LABELS, contraceptionType) })
        if (contraceptionCurrent) whAssessmentItems.push({ label: 'Current contraception', value: reviewLabel(CONTRACEPTION_CURRENT_REVIEW_LABELS, contraceptionCurrent) })
        if (pregnancyStatus) whAssessmentItems.push({ label: 'Pregnancy check', value: reviewLabel(UTI_PREGNANCY_REVIEW_LABELS, pregnancyStatus) })
        for (const [key, label] of Object.entries(PILL_SAFETY_REVIEW_LABELS)) {
          const value = stringAnswer(answers[key])
          if (value) whAssessmentItems.push({ label, value: reviewLabel(YES_NO_REVIEW_LABELS, value) })
        }
        const lastPeriod = stringAnswer(answers.lastPeriod)
        const contraceptionDetails = stringAnswer(answers.contraceptionDetails)
        if (lastPeriod) whAssessmentItems.push({ label: 'Last period', value: lastPeriod })
        if (contraceptionDetails) whAssessmentItems.push({ label: 'Details', value: contraceptionDetails })
      }

      // Morning-after details
      if (whOption === 'morning_after') {
        const HOURS_LABELS: Record<string, string> = { under_24: '< 24 hours', '24_to_72': '24-72 hours', '72_to_120': '72-120 hours' }
        if (answers.hoursSinceIntercourse) whAssessmentItems.push({ label: 'Time since', value: HOURS_LABELS[answers.hoursSinceIntercourse as string] || String(answers.hoursSinceIntercourse) })
      }

      // UTI details
      if (whOption === 'uti') {
        const utiSymptoms = stringArrayAnswer(answers.utiSymptoms)
        const utiRedFlags = stringAnswer(answers.utiRedFlags)
        const utiPregnant = stringAnswer(answers.utiPregnant)
        const utiDetails = stringAnswer(answers.utiDetails)
        if (utiSymptoms?.length) {
          whAssessmentItems.push({
            label: 'Symptoms',
            value: utiSymptoms.map((symptom) => reviewLabel(UTI_REVIEW_SYMPTOM_LABELS, symptom)).join(', '),
          })
        }
        if (utiRedFlags) whAssessmentItems.push({ label: 'UTI red flags', value: reviewLabel(YES_NO_REVIEW_LABELS, utiRedFlags) })
        if (utiPregnant) whAssessmentItems.push({ label: 'Pregnancy check', value: reviewLabel(UTI_PREGNANCY_REVIEW_LABELS, utiPregnant) })
        if (utiDetails) whAssessmentItems.push({ label: 'Details', value: utiDetails })
      }

      // General details
      if ((whOption === 'period_pain' || whOption === 'other') && answers.womensDetails) {
        whAssessmentItems.push({ label: 'Details', value: String(answers.womensDetails) })
      }

      sections.push({
        title: 'Assessment & safety',
        items: whAssessmentItems,
        stepId: 'womens-health-assessment',
      })
    }

    // Weight loss assessment
    if (consultSubtype === 'weight_loss') {
      const bmi = answers.currentWeight && answers.currentHeight
        ? (parseFloat(String(answers.currentWeight)) / Math.pow(parseFloat(String(answers.currentHeight)) / 100, 2)).toFixed(1)
        : null
      const WL_MED_LABELS: Record<string, string> = {
        glp1: 'Longer-term appetite support',
        duromine: 'Short-term supervised support',
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
  const detailItems: ReviewItem[] = [
    { label: 'Name', value: `${firstName} ${lastName}`.trim() },
    { label: 'Email', value: email },
    { label: 'Date of birth', value: dobDisplay },
  ]
  // Only show phone if provided
  if (phone) detailItems.push({ label: 'Phone', value: phone })
  // Show Medicare and address for prescriptions
  const medicareNumber = answers.medicareNumber as string | undefined
  if (medicareNumber) detailItems.push({ label: 'Medicare', value: medicareNumber.replace(/(\d{4})(\d{5})(\d)/, '$1 $2 $3') })
  if (serviceType === 'consult' && consultSubtypeForLabel === 'ed') {
    const bmi = stringAnswer(answers.bmi)
    if (bmi) detailItems.push({ label: 'BMI', value: bmi })
  }
  const addressSummary = getAddressReviewSummary(answers)
  if (addressSummary) {
    detailItems.push({
      label: 'Address',
      value: addressSummary.compact,
      badge: {
        label: getAddressStatusDisplay(addressSummary.isVerified),
        tone: addressSummary.isVerified ? "success" : "warning",
      },
    })
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
        <p className="text-base text-muted-foreground mt-0.5">
          Make sure everything looks right. Doctor review follows after payment.
        </p>
      </div>

      {/* Review summary — one dense card, sections divided, empty rows hidden */}
      <ReviewSummaryCard
        sections={displaySections}
        onEditStep={(stepId) => goToStep(stepId as Parameters<typeof goToStep>[0])}
      />

      {/* Safety consent + Continue */}
      <div className="space-y-3 pt-1">
        {/* Price summary - show before CTA so there's no payment surprise */}
        <div className="px-4 py-3 rounded-2xl border border-border/50 bg-white dark:bg-card dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-base text-muted-foreground">{isPrescriptionCheckout ? "Due today" : "Total today"}</span>
            <span className="text-base font-semibold text-foreground">
              ${totalDue.toFixed(2)}
            </span>
          </div>
          <div className="pt-1">
            <PriorityReviewToggle
              id="review-priority-review-toggle"
              checked={isPriority}
              onCheckedChange={setIsPriority}
              onOptIn={() => capturePriorityReviewOptedIn(posthog, { service_type: serviceType, surface: "review" })}
              onOptOut={() => capturePriorityReviewOptedOut(posthog, { service_type: serviceType, surface: "review" })}
            />
          </div>
        </div>

        {repeatsExpectation && (
          <div className="px-4 py-3 rounded-2xl border border-border/50 bg-muted/30 dark:bg-white/5">
            <p className="text-base leading-snug text-muted-foreground">
              <span className="font-medium text-foreground">What to expect: </span>
              {repeatsExpectation}
            </p>
          </div>
        )}

        <div ref={consentRef}>
          <Checkbox
            id="safety-consent"
            checked={safetyConfirmed}
            onCheckedChange={(checked) => handleConsentChange(checked === true)}
            className={`w-full max-w-none items-start rounded-xl border-2 p-3.5 text-left transition-[background-color,border-color,box-shadow] duration-200 ${
              safetyConfirmed
                ? "border-primary bg-primary/5 shadow-sm shadow-primary/[0.05]"
                : "border-border bg-white hover:border-primary/40 dark:bg-card"
            }`}
            boxClassName="mt-0.5 h-5 w-5 rounded-lg border-2"
            aria-label="Confirm request and payment terms"
          >
            <span className="block text-base leading-relaxed text-foreground">
              I confirm this is not a medical emergency, my information is accurate, and I agree to the{" "}
              <a href="/terms" className="text-primary underline" target="_blank" onClick={(event) => event.stopPropagation()}>
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary underline" target="_blank" onClick={(event) => event.stopPropagation()}>
                Privacy Policy
              </a>
              .
            </span>
          </Checkbox>
          {!safetyConfirmed && (
            <p id="safety-consent-warning" className="mt-2 text-center text-base text-warning" aria-live="polite">
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
          data-intake-primary-action="true"
          data-intake-primary-label={`Pay $${totalDue.toFixed(2)}`}
          data-intake-primary-ready={safetyConfirmed ? "true" : "false"}
          onClick={safetyConfirmed ? handlePayment : handleDisabledClick}
          variant={safetyConfirmed ? "default" : "secondary"}
          className="w-full h-12 max-sm:hidden"
          aria-disabled={!safetyConfirmed || isProcessing}
          aria-describedby={!safetyConfirmed ? 'safety-consent-warning' : undefined}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Pay ${totalDue.toFixed(2)}
            </>
          )}
        </Button>

        <div ref={errorRef} aria-live="polite">
        {error && (
          error.toLowerCase().includes("account already exists") ? (
            // Mirror checkout-step.tsx: an account-owning email is intentionally
            // bounced to sign-in; without the inline CTA this reads as
            // "nothing happened". Keep the matcher byte-identical to that surface.
            <Alert variant="destructive" role="alert">
              <AlertDescription className="space-y-2">
                <p>An account already exists with this email address.</p>
                <p>
                  <a
                    href={`/sign-in?redirect_url=${encodeURIComponent('/request' + window.location.search)}`}
                    className="underline font-medium hover:opacity-80"
                  >
                    Sign in to continue →
                  </a>
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" role="alert">
              <AlertDescription className="space-y-1">
                <p>{error}</p>
                <p className="text-base opacity-90">
                  Your card hasn&apos;t been charged. Try again, or email{" "}
                  <a href="mailto:support@instantmed.com.au" className="font-medium underline">
                    support@instantmed.com.au
                  </a>{" "}
                  if this keeps happening.
                </p>
              </AlertDescription>
            </Alert>
          )
        )}
        </div>

        {/* One quiet trust cluster (no boxed badges) — accepted cards + the
            highest-value pay-moment reassurance. Replaces the old boxed trust
            footer as part of the 2026-06-28 trust dedup. */}
        <div className="flex flex-col items-center justify-center gap-1.5 pt-1 text-sm text-muted-foreground">
          <PaymentLogos />
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
            Secure Stripe checkout · Full refund if declined
          </span>
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
