"use client"

import { Pill } from "lucide-react"

import type { PrescribingPacket, PrescribingPacketRequiredField } from "@/lib/clinical/prescribing-packet"
import { cn } from "@/lib/utils"

interface PrescribingPacketCardProps {
  packet: PrescribingPacket
  /**
   * Safety/caution notes from the clinical screen (e.g. ED cardiac cautions).
   * Rendered calm (8px dot + plain text), never as a loud colored-background pill.
   */
  cautions?: string[]
  className?: string
}

const FULFILMENT_LABEL: Record<PrescribingPacket["fulfilment"]["status"], string> = {
  not_prescribed: "Not prescribed yet",
  prescribed: "Prescribed in Parchment",
  completed: "Script sent",
}

function humanizeField(field: PrescribingPacketRequiredField): string {
  if (field === "dose") return "dose & frequency"
  if (field === "indication") return "what it's for"
  return "medication"
}

/**
 * Single canonical medication packet for the doctor review surfaces. Surfaces
 * medication · dose · indication (the dose+indication that PrescriptionIntent
 * lacked), plus optional context, missing-field flags, cautions, and fulfilment
 * status. Calm chrome only — no `bg-amber-50` style pills (see
 * lib/__tests__/review-calm-chrome.test.ts).
 */
export function PrescribingPacketCard({ packet, cautions, className }: PrescribingPacketCardProps) {
  if (packet.serviceKind === "unknown" && !packet.medicationLabel) return null

  const detailLine = [packet.dose, packet.indication].filter(Boolean).join(" · ")

  return (
    <div className={cn("rounded-lg border border-border/50 bg-card px-3 py-2", className)}>
      <div className="flex items-center gap-1.5">
        <Pill className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-[11px] font-medium text-muted-foreground">Prescribing packet</span>
      </div>

      <p className="mt-0.5 text-sm font-semibold text-foreground">
        {packet.medicationLabel ?? packet.primaryLabel}
      </p>
      {detailLine ? <p className="text-xs text-muted-foreground">{detailLine}</p> : null}

      {packet.missingRequiredFields.length > 0 ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
          Patient did not provide {packet.missingRequiredFields.map(humanizeField).join(", ")}
        </p>
      ) : null}

      {packet.optionalContext.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {packet.optionalContext.map((item) => (
            <li key={item} className="text-xs text-muted-foreground">{item}</li>
          ))}
        </ul>
      ) : null}

      {cautions && cautions.length > 0 ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
          <span>{cautions.join(" · ")}</span>
        </p>
      ) : null}

      <p className="mt-1 text-[11px] text-muted-foreground">{FULFILMENT_LABEL[packet.fulfilment.status]}</p>
    </div>
  )
}
