"use client"

/**
 * Review Step - Summary of request before checkout
 * Shows all collected information for patient to verify
 */

import { useState } from "react"
import { Check, Edit2, Shield, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  'uni': 'Study/University',
  'carer': 'Carer\'s Leave',
}

const PRESCRIPTION_HISTORY_LABELS: Record<string, string> = {
  'less_than_3_months': 'Less than 3 months ago',
  '3_to_6_months': '3-6 months ago',
  '6_to_12_months': '6-12 months ago',
  'over_12_months': 'Over 12 months ago',
  'never': 'Never prescribed',
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
    <Card className="border-muted">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-xs gap-1">
            <Edit2 className="w-3 h-3" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <dl className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="font-medium text-right max-w-[60%]">
                {item.value ? <ExpandableValue value={item.value} /> : '—'}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export default function ReviewStep({ serviceType, onNext }: ReviewStepProps) {
  const { answers, firstName, lastName, email, phone, goToStep } = useRequestStore()

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
        { label: 'Duration', value: symptomDuration || '' },
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

    const prescriptionHistory = answers.prescriptionHistory as string
    const hasSideEffects = answers.hasSideEffects as boolean
    
    sections.push({
      title: 'Prescription History',
      items: [
        { label: 'Last prescribed', value: PRESCRIPTION_HISTORY_LABELS[prescriptionHistory] || prescriptionHistory || '' },
        { label: 'Side effects', value: hasSideEffects ? 'Yes' : 'No' },
      ],
      stepId: 'medication-history',
    })
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
        moderate: '3-12 months',
        longterm: '> 12 months',
        always: 'Always had difficulty',
      }
      const ED_FREQ_LABELS: Record<string, string> = {
        always: 'Every time',
        often: 'Most of the time',
        sometimes: 'Sometimes',
        rarely: 'Rarely',
      }
      sections.push({
        title: 'ED Assessment',
        items: [
          { label: 'Onset', value: ED_ONSET_LABELS[answers.edOnset as string] || String(answers.edOnset || '—') },
          { label: 'Frequency', value: ED_FREQ_LABELS[answers.edFrequency as string] || String(answers.edFrequency || '—') },
          { label: 'Morning erections', value: answers.edMorningErections === 'yes' ? 'Yes' : answers.edMorningErections === 'no' ? 'No' : '—' },
        ],
        stepId: 'ed-assessment',
      })
    }

    // Hair loss assessment
    if (consultSubtype === 'hair_loss') {
      const PATTERN_LABELS: Record<string, string> = {
        receding: 'Receding hairline',
        thinning_crown: 'Thinning at crown',
        overall: 'Overall thinning',
        patchy: 'Patchy loss',
        other: 'Other pattern',
      }
      sections.push({
        title: 'Hair Loss Assessment',
        items: [
          { label: 'Pattern', value: PATTERN_LABELS[answers.hairPattern as string] || String(answers.hairPattern || '—') },
          { label: 'Duration', value: String(answers.hairDuration || '—') },
          { label: 'Family history', value: String(answers.hairFamilyHistory || '—') },
        ],
        stepId: 'hair-loss-assessment',
      })
    }

    // Women's health assessment
    if (consultSubtype === 'womens_health') {
      const WH_TYPE_LABELS: Record<string, string> = {
        contraception: 'Contraception',
        morning_after: 'Morning-after pill',
        uti: 'UTI treatment',
        period_pain: 'Period pain',
        other: 'Other concern',
      }
      sections.push({
        title: "Women's Health",
        items: [
          { label: 'Concern', value: WH_TYPE_LABELS[answers.womensHealthOption as string] || String(answers.womensHealthOption || '—') },
        ],
        stepId: 'womens-health-type',
      })
    }

    // Weight loss assessment
    if (consultSubtype === 'weight_loss') {
      const bmi = answers.currentWeight && answers.currentHeight
        ? (parseFloat(String(answers.currentWeight)) / Math.pow(parseFloat(String(answers.currentHeight)) / 100, 2)).toFixed(1)
        : null
      sections.push({
        title: 'Weight Loss Assessment',
        items: [
          { label: 'Current weight', value: answers.currentWeight ? `${answers.currentWeight} kg` : '—' },
          { label: 'Target weight', value: answers.targetWeight ? `${answers.targetWeight} kg` : '—' },
          ...(bmi ? [{ label: 'BMI', value: bmi }] : []),
        ],
        stepId: 'weight-loss-assessment',
      })
    }
  }

  // Medical history section (shared)
  const hasAllergies = answers.hasAllergies as boolean
  const allergies = answers.allergies as string
  const hasConditions = answers.hasConditions as boolean
  const conditions = answers.conditions as string

  if (hasAllergies !== undefined || hasConditions !== undefined) {
    sections.push({
      title: 'Medical History',
      items: [
        { label: 'Allergies', value: hasAllergies ? (allergies || 'Yes') : 'None' },
        { label: 'Conditions', value: hasConditions ? (conditions || 'Yes') : 'None' },
      ],
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
      <div className="space-y-3">
        {sections.map((section, i) => (
          <ReviewSection
            key={i}
            title={section.title}
            items={section.items}
            onEdit={section.stepId ? () => goToStep(section.stepId as Parameters<typeof goToStep>[0]) : undefined}
          />
        ))}
      </div>

      {/* Reassurance micro-copy */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground py-2">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          Reviewed by a real Australian doctor
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-primary" />
          Most certs issued within 30 minutes
        </span>
        <span className="flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5 text-green-600" />
          Full refund if we can&apos;t help
        </span>
      </div>

      {/* Continue button */}
      <Button onClick={onNext} className="w-full h-12 mt-6">
        Continue to payment
      </Button>
    </div>
  )
}
