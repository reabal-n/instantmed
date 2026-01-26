"use client"

/**
 * Review Step - Summary of request before checkout
 * Shows all collected information for patient to verify
 */

import { Check, Edit2 } from "lucide-react"
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
              <dd className="font-medium text-right max-w-[60%]">{item.value || '—'}</dd>
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
  sections.push({
    title: 'Request Type',
    items: [
      { label: 'Service', value: SERVICE_LABELS[serviceType] },
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
        { label: 'Details', value: symptomDetails?.substring(0, 50) + (symptomDetails?.length > 50 ? '...' : '') || '' },
      ],
      stepId: 'symptoms',
    })
  }

  // Prescription specific sections
  if (serviceType === 'prescription' || serviceType === 'repeat-script') {
    const medicationName = answers.medicationName as string
    const medicationStrength = answers.medicationStrength as string
    const medicationForm = answers.medicationForm as string
    
    sections.push({
      title: 'Medication',
      items: [
        { label: 'Name', value: medicationName || '' },
        { label: 'Strength', value: medicationStrength || '' },
        { label: 'Form', value: medicationForm || '' },
      ],
      stepId: 'medication',
    })

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

      {/* Continue button */}
      <Button onClick={onNext} className="w-full h-12 mt-6">
        Continue to payment
      </Button>
    </div>
  )
}
