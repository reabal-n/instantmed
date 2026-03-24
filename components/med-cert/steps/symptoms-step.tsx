"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MED_CERT_COPY } from "@/lib/microcopy/med-cert-v2"
import { SYMPTOM_OPTIONS, CARER_RELATIONSHIPS } from "@/types/med-cert"
import { StepHeader, SymptomChip, DurationChip } from "@/components/med-cert/med-cert-shared"
import type { SymptomId } from "@/types/med-cert"

interface SymptomsStepProps {
  isCarer: boolean
  symptoms: SymptomId[]
  carerPersonName: string | undefined
  carerRelationship: string | undefined
  otherSymptomDetails: string | undefined
  onSymptomToggle: (symptomId: SymptomId) => void
  onCarerNameChange: (name: string) => void
  onCarerRelationshipChange: (relationship: string) => void
  onOtherDetailsChange: (details: string) => void
}

export function SymptomsStep({
  isCarer,
  symptoms,
  carerPersonName,
  carerRelationship,
  otherSymptomDetails,
  onSymptomToggle,
  onCarerNameChange,
  onCarerRelationshipChange,
  onOtherDetailsChange,
}: SymptomsStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        emoji={isCarer ? "❤️" : "🤒"}
        title={isCarer ? MED_CERT_COPY.symptoms.headingCarer : MED_CERT_COPY.symptoms.heading}
        subtitle={MED_CERT_COPY.symptoms.subtitle}
      />

      {/* Carer details first */}
      {isCarer && (
        <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border animate-fade-in">
          <p className="font-medium text-sm">{MED_CERT_COPY.symptoms.carerSection.heading}</p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="carer-name" className="text-sm">
                {MED_CERT_COPY.symptoms.carerSection.nameLabel}
              </Label>
              <Input
                id="carer-name"
                value={carerPersonName || ""}
                onChange={(e) => onCarerNameChange(e.target.value)}
                placeholder={MED_CERT_COPY.symptoms.carerSection.namePlaceholder}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">
                {MED_CERT_COPY.symptoms.carerSection.relationshipLabel}
              </Label>
              <div className="flex flex-wrap gap-2">
                {CARER_RELATIONSHIPS.map((rel) => (
                  <DurationChip
                    key={rel.id}
                    selected={carerRelationship === rel.id}
                    onClick={() => onCarerRelationshipChange(rel.id)}
                  >
                    {rel.label}
                  </DurationChip>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Symptom chips */}
      <div className="flex flex-wrap gap-2">
        {SYMPTOM_OPTIONS.map((symptom) => (
          <SymptomChip
            key={symptom.id}
            selected={symptoms?.includes(symptom.id) || false}
            onClick={() => onSymptomToggle(symptom.id)}
            emoji={symptom.emoji}
            label={symptom.label}
          />
        ))}
      </div>

      {/* Other details */}
      {symptoms?.includes("other") && (
        <div className="space-y-2 animate-fade-in">
          <Label htmlFor="other-details" className="text-sm font-medium">
            {MED_CERT_COPY.symptoms.otherLabel}
          </Label>
          <Input
            id="other-details"
            value={otherSymptomDetails || ""}
            onChange={(e) => onOtherDetailsChange(e.target.value)}
            placeholder={MED_CERT_COPY.symptoms.otherPlaceholder}
            className="h-11 rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            {MED_CERT_COPY.symptoms.otherHint}
          </p>
        </div>
      )}
    </div>
  )
}
