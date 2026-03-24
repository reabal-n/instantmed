"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MED_CERT_COPY } from "@/lib/microcopy/med-cert-v2"
import { StepHeader, TypeCard, DurationChip } from "@/components/med-cert/med-cert-shared"
import type { CertificateType } from "@/types/med-cert"

interface TypeAndDatesStepProps {
  certificateType: CertificateType | undefined
  durationDays: number | "extended" | undefined
  startDate: string | undefined
  onTypeSelect: (type: CertificateType) => void
  onDurationSelect: (days: 1 | 2) => void
  onLongerDurationRedirect: () => void
  onStartDateChange: (date: string) => void
}

export function TypeAndDatesStep({
  certificateType,
  durationDays,
  startDate,
  onTypeSelect,
  onDurationSelect,
  onLongerDurationRedirect,
  onStartDateChange,
}: TypeAndDatesStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        title={MED_CERT_COPY.typeAndDates.heading}
        subtitle={MED_CERT_COPY.typeAndDates.subtitle}
      />

      {/* Certificate type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {MED_CERT_COPY.typeAndDates.typeLabel}
        </Label>
        <div className="space-y-2">
          <TypeCard
            selected={certificateType === "work"}
            onClick={() => onTypeSelect("work")}
            label={MED_CERT_COPY.typeAndDates.types.work.label}
            description={MED_CERT_COPY.typeAndDates.types.work.description}
            emoji={MED_CERT_COPY.typeAndDates.types.work.emoji}
          />
          <TypeCard
            selected={certificateType === "study"}
            onClick={() => onTypeSelect("study")}
            label={MED_CERT_COPY.typeAndDates.types.study.label}
            description={MED_CERT_COPY.typeAndDates.types.study.description}
            emoji={MED_CERT_COPY.typeAndDates.types.study.emoji}
          />
          <TypeCard
            selected={certificateType === "carer"}
            onClick={() => onTypeSelect("carer")}
            label={MED_CERT_COPY.typeAndDates.types.carer.label}
            description={MED_CERT_COPY.typeAndDates.types.carer.description}
            emoji={MED_CERT_COPY.typeAndDates.types.carer.emoji}
          />
        </div>
      </div>

      {/* Duration */}
      {certificateType && (
        <div className="space-y-3 animate-fade-in">
          <Label className="text-sm font-medium">
            {MED_CERT_COPY.typeAndDates.durationLabel}
          </Label>
          <div className="flex flex-wrap gap-2">
            <DurationChip
              selected={durationDays === 1}
              onClick={() => onDurationSelect(1)}
            >
              {MED_CERT_COPY.typeAndDates.durationOptions[1]}
            </DurationChip>
            <DurationChip
              selected={durationDays === 2}
              onClick={() => onDurationSelect(2)}
            >
              {MED_CERT_COPY.typeAndDates.durationOptions[2]}
            </DurationChip>
          </div>
          {/* Discreet link for longer durations - routes to general consultation */}
          <button
            type="button"
            onClick={onLongerDurationRedirect}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            {MED_CERT_COPY.typeAndDates.longerDurationLink}
          </button>
        </div>
      )}

      {/* Start date */}
      {certificateType && durationDays && (
        <div className="space-y-2 animate-fade-in">
          <Label htmlFor="start-date" className="text-sm font-medium">
            {MED_CERT_COPY.typeAndDates.startDateLabel}
          </Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="h-12 rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            {MED_CERT_COPY.typeAndDates.startDateHint}
          </p>
        </div>
      )}
    </div>
  )
}
