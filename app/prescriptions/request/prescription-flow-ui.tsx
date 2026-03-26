"use client"

import type React from "react"

import {
  AlertTriangle,
  Check,
  ExternalLink,
  BadgeCheck,
  Lock,
  Shield,
} from "lucide-react"
import { Button } from "@/components/uix"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RX_MICROCOPY } from "@/lib/microcopy/prescription"

// Time estimate per stage in minutes
const STAGE_TIME_ESTIMATES = [4, 1, 1, 1] // Details takes longer due to medication search

// Trust indicators strip
export function TrustStrip() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 px-3 bg-muted/50 rounded-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
            <BadgeCheck className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
            <span className="hidden sm:inline">AHPRA Doctors</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          All prescriptions reviewed by AHPRA-registered Australian doctors
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
            <Lock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">Encrypted</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          Your data is protected with bank-level 256-bit encryption
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
            <Shield className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">Private</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          We never sell your data. Your health information stays private.
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

// Progress indicator with animated dots and time estimate
export function Progress({ stages, currentIndex }: { stages: readonly string[]; currentIndex: number }) {
  // Calculate remaining time
  const remainingMinutes = STAGE_TIME_ESTIMATES.slice(currentIndex).reduce((a, b) => a + b, 0)

  return (
    <nav aria-label="Progress" className="w-full">
      <div className="flex flex-col items-center gap-2">
        {/* Animated dots */}
        <div className="flex items-center gap-3 relative">
          {stages.map((label, i) => {
            const isComplete = i < currentIndex
            const isCurrent = i === currentIndex
            return (
              <div
                key={label}
                className={`w-2.5 h-2.5 rounded-full relative z-10 transition-all duration-300 ${
                  isComplete ? "bg-primary scale-100" : isCurrent ? "bg-primary/80 scale-[1.02]" : "bg-muted-foreground/30"
                }`}
                role="progressbar"
                aria-valuenow={isComplete ? 100 : isCurrent ? 50 : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label}: ${isComplete ? "Complete" : isCurrent ? "In progress" : "Not started"}`}
              />
            )
          })}
          {/* Animated progress line */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary/20 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(10, (currentIndex / (stages.length - 1)) * 100)}%`,
            }}
          />
        </div>
        {/* Step label with time estimate */}
        <p className="text-xs text-muted-foreground">
          Step {currentIndex + 1} of {stages.length}: <span className="font-medium text-foreground">{stages[currentIndex]}</span>
          <span className="ml-2 text-muted-foreground/70">~{remainingMinutes} min left</span>
        </p>
      </div>
    </nav>
  )
}

// Step header with emoji support
export function StepHeader({ title, subtitle, emoji }: { title: string; subtitle?: string; emoji?: string }) {
  return (
    <header className="text-center space-y-1">
      {emoji && <div className="text-4xl mb-2 animate-float-gentle">{emoji}</div>}
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </header>
  )
}

// Option tile with emoji support
export function OptionTile({
  selected,
  onClick,
  label,
  description,
  icon: Icon,
  emoji,
}: {
  selected: boolean
  onClick: () => void
  label: string
  description?: string
  icon?: React.ElementType
  emoji?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-300 ${
        selected
          ? "border-sky-300/60 dark:border-sky-600/40 bg-sky-50/80 dark:bg-sky-900/20 shadow-[0_2px_8px_rgba(138,187,224,0.15)]"
          : "border-border/60 dark:border-border/40 bg-white dark:bg-card hover:border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-3">
        {emoji && (
          <span className="text-2xl">{emoji}</span>
        )}
        {Icon && !emoji && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
              selected
                ? "bg-sky-100 dark:bg-sky-800/40 text-sky-600 dark:text-sky-400"
                : "bg-muted dark:bg-white/10 text-muted-foreground dark:text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium transition-colors ${selected ? "text-foreground dark:text-foreground" : "text-foreground dark:text-muted-foreground"}`}>{label}</p>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-800/40 flex items-center justify-center">
            <Check className="w-3 h-3 text-sky-600 dark:text-sky-400" />
          </div>
        )}
      </div>
    </button>
  )
}

// Pill button - calm selection styling per brand guidelines
export function PillButton({
  selected,
  onClick,
  children,
  emoji,
}: { selected: boolean; onClick: () => void; children: React.ReactNode; emoji?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
        selected
          ? "bg-sky-50 dark:bg-sky-500/20 text-sky-800 dark:text-sky-200 border-2 border-sky-300/60 dark:border-sky-600/40 shadow-[0_2px_8px_rgba(138,187,224,0.15)]"
          : "bg-white dark:bg-card text-foreground dark:text-muted-foreground border-2 border-border/60 dark:border-border/40 hover:border-border hover:bg-muted/50"
      }`}
    >
      {emoji && <span className="mr-1.5">{emoji}</span>}
      {children}
    </button>
  )
}

// Controlled substance warning
export function ControlledWarning({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-2xl p-5 max-w-sm w-full space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-dawn-600" />
          </div>
          <div>
            <h2 className="font-semibold">{RX_MICROCOPY.controlled.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{RX_MICROCOPY.controlled.body}</p>
          </div>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Includes:</p>
          <div className="flex flex-wrap gap-1">
            {RX_MICROCOPY.controlled.affected.map((med) => (
              <span key={med} className="text-xs bg-background px-2 py-0.5 rounded">
                {med}
              </span>
            ))}
          </div>
        </div>
        <Button onClick={onClose} className="w-full rounded-lg">
          I understand
        </Button>
      </div>
    </div>
  )
}

// Safety knockout screen
export function SafetyKnockout() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-dawn-600" />
      </div>
      <h1 className="text-xl font-semibold mb-2">{RX_MICROCOPY.safety.knockoutTitle}</h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">{RX_MICROCOPY.safety.knockoutBody}</p>
      <Button asChild variant="outline" className="rounded-lg">
        <a
          href="https://www.healthdirect.gov.au/australian-health-services"
          target="_blank"
          rel="noopener noreferrer"
        >
          {RX_MICROCOPY.safety.knockoutCta}
          <ExternalLink className="w-4 h-4 ml-2" />
        </a>
      </Button>
    </div>
  )
}
