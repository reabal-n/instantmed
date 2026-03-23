"use client"

import { Switch } from "@/components/ui/switch"
import { MED_CERT_COPY } from "@/lib/microcopy/med-cert-v2"
import { StepHeader, ReviewRow } from "@/components/med-cert/med-cert-shared"
import type { MedCertStep } from "@/types/med-cert"

interface ReviewStepProps {
  certTypeLabel: string
  formattedDateRange: string
  durationLabel: string
  symptomLabels: string
  isCarer: boolean
  carerPersonName: string | undefined
  carerRelationship: string | undefined
  patientConfirmedAccurate: boolean
  onConfirmedChange: (checked: boolean) => void
  goToStep: (step: MedCertStep) => void
}

export function ReviewStep({
  certTypeLabel,
  formattedDateRange,
  durationLabel,
  symptomLabels,
  isCarer,
  carerPersonName,
  carerRelationship,
  patientConfirmedAccurate,
  onConfirmedChange,
  goToStep,
}: ReviewStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        emoji="👀"
        title={MED_CERT_COPY.review.heading}
        subtitle={MED_CERT_COPY.review.subtitle}
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 space-y-0">
          <ReviewRow
            label={MED_CERT_COPY.review.labels.certificateType}
            value={certTypeLabel}
            onEdit={() => goToStep("type_and_dates")}
          />
          <ReviewRow
            label={MED_CERT_COPY.review.labels.dates}
            value={formattedDateRange}
            onEdit={() => goToStep("type_and_dates")}
          />
          <ReviewRow
            label={MED_CERT_COPY.review.labels.duration}
            value={durationLabel}
          />
          <ReviewRow
            label={MED_CERT_COPY.review.labels.symptoms}
            value={symptomLabels}
            onEdit={() => goToStep("symptoms")}
          />
          {isCarer && carerPersonName && (
            <ReviewRow
              label={MED_CERT_COPY.review.labels.carerFor}
              value={`${carerPersonName} (${carerRelationship})`}
            />
          )}
        </div>
      </div>

      {/* Attestation toggle */}
      <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors">
        <span className="text-sm flex-1">{MED_CERT_COPY.review.attestation.label}</span>
        <Switch
          checked={patientConfirmedAccurate}
          onCheckedChange={(checked) => onConfirmedChange(checked)}
        />
      </label>

      <p className="text-xs text-center text-muted-foreground">
        {MED_CERT_COPY.review.note}
      </p>
    </div>
  )
}
