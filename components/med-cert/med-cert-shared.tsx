"use client"

import { Check, Lock, Shield, BadgeCheck } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { MED_CERT_COPY } from "@/lib/microcopy/med-cert-v2"
import type { MedCertStep } from "@/types/med-cert"
import { cn } from "@/lib/utils"
import { Phone } from "lucide-react"

// ============================================================================
// CONSTANTS
// ============================================================================

const PROGRESS_STEPS = ["Details", "Review", "Pay"]

// ============================================================================
// TYPES
// ============================================================================

export interface TypeCardProps {
  selected: boolean
  onClick: () => void
  label: string
  description: string
  emoji: string
}

export interface DurationChipProps {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}

export interface SymptomChipProps {
  selected: boolean
  onClick: () => void
  emoji: string
  label: string
}

export interface EmergencyBannerProps {
  accepted: boolean
  onAccept: (accepted: boolean) => void
  timestamp: string | null
}

export interface ReviewRowProps {
  label: string
  value: React.ReactNode
  onEdit?: () => void
}

export interface StepHeaderProps {
  title: string
  subtitle?: string
  emoji?: string
}

export interface ProgressIndicatorProps {
  currentStep: MedCertStep
}

// ============================================================================
// COMPONENTS
// ============================================================================

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  // Map flow step to progress index
  const getProgressIndex = () => {
    switch (currentStep) {
      case "type_and_dates":
      case "symptoms":
      case "safety":
        return 0 // Details
      case "review":
        return 1 // Review
      case "payment":
        return 2 // Pay
      case "confirmation":
        return 3 // Done
      default:
        return 0
    }
  }

  const currentIndex = getProgressIndex()

  if (currentStep === "confirmation") return null

  return (
    <nav aria-label="Request progress" className="w-full">
      <div className="flex items-center justify-center gap-1.5">
        {PROGRESS_STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i < currentIndex
                ? "bg-primary w-8"
                : i === currentIndex
                ? "bg-primary/80 w-10"
                : "bg-muted-foreground/20 w-6"
            )}
          />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-2">
        {PROGRESS_STEPS[currentIndex] || ""}
      </p>
    </nav>
  )
}

export function TrustStrip() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
              <span>{MED_CERT_COPY.trust.ahpra}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>All doctors are AHPRA-registered</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>{MED_CERT_COPY.trust.encrypted}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Bank-level encryption protects your data</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>{MED_CERT_COPY.trust.refund}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Full refund if your request cannot be approved</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export function StepHeader({ title, subtitle, emoji }: StepHeaderProps) {
  return (
    <div className="text-center space-y-1">
      {emoji && <div className="text-3xl mb-2">{emoji}</div>}
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export function TypeCard({ selected, onClick, label, description, emoji }: TypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
        "hover:scale-[1.01] active:scale-[0.99]",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/60 bg-card/50 hover:border-primary/40"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-xl",
          selected ? "bg-primary/10" : "bg-muted"
        )}>
          {emoji}
        </div>
        <div className="flex-1">
          <p className={cn(
            "font-medium transition-colors",
            selected ? "text-primary" : "text-foreground"
          )}>
            {label}
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  )
}

export function DurationChip({ selected, onClick, children }: DurationChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-5 py-3 rounded-full text-sm font-medium transition-all duration-200",
        "hover:scale-105 active:scale-95",
        selected
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted hover:bg-muted/80 border border-border/40"
      )}
    >
      {children}
    </button>
  )
}

export function SymptomChip({ selected, onClick, emoji, label }: SymptomChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
        "hover:scale-105 active:scale-95",
        selected
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted hover:bg-muted/80 border border-border/40"
      )}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  )
}

export function EmergencyBanner({ accepted, onAccept, timestamp }: EmergencyBannerProps) {
  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50/80 dark:bg-red-950/20 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
          <Phone className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-200">
            {MED_CERT_COPY.emergency.heading}
          </h3>
          <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
            {MED_CERT_COPY.emergency.body}
          </p>
        </div>
      </div>

      <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-card border border-red-200 dark:border-red-800/40 cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors">
        <span className="text-sm text-red-900 dark:text-red-200 font-medium flex-1">
          {MED_CERT_COPY.emergency.checkbox}
        </span>
        <Switch
          checked={accepted}
          onCheckedChange={(checked) => onAccept(checked)}
        />
      </label>

      {accepted && timestamp && (
        <p className="text-xs text-red-600/70 text-right">
          Confirmed at {new Date(timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

export function ReviewRow({ label, value, onEdit }: ReviewRowProps) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border/50 last:border-0">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-primary hover:underline"
        >
          {MED_CERT_COPY.review.editButton}
        </button>
      )}
    </div>
  )
}
