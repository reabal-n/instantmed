"use client"

import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface StepContainerProps {
  children: React.ReactNode
  className?: string
  direction?: "forward" | "backward"
}

export const StepContainer = forwardRef<HTMLDivElement, StepContainerProps>(
  ({ children, className, direction = "forward" }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-step-enter",
          direction === "backward" && "animate-step-enter-reverse",
          className
        )}
      >
        {children}
      </div>
    )
  }
)

StepContainer.displayName = "StepContainer"

interface StepHeaderProps {
  emoji?: string
  title: string
  subtitle?: string
  stepNumber?: number
  totalSteps?: number
  className?: string
}

export function EngagingStepHeader({
  emoji,
  title,
  subtitle,
  stepNumber,
  totalSteps,
  className,
}: StepHeaderProps) {
  return (
    <div className={cn("text-center mb-6", className)}>
      {emoji && (
        <div className="text-4xl mb-3 animate-bounce-gentle">{emoji}</div>
      )}
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
          {subtitle}
        </p>
      )}
      {stepNumber && totalSteps && (
        <p className="text-xs text-muted-foreground/60 mt-2">
          Step {stepNumber} of {totalSteps}
        </p>
      )}
    </div>
  )
}

interface OptionCardProps {
  selected: boolean
  onClick: () => void
  emoji?: string
  icon?: React.ReactNode
  label: string
  description?: string
  disabled?: boolean
  className?: string
}

export function OptionCard({
  selected,
  onClick,
  emoji,
  icon,
  label,
  description,
  disabled = false,
  className,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-4 rounded-2xl border-2 text-left transition-all duration-200",
        "hover:-translate-y-0.5 active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
          : "border-border/60 bg-white/50 hover:border-primary/40 hover:bg-white/80",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {emoji && (
          <span className={cn("text-2xl", selected && "animate-bounce-once")}>
            {emoji}
          </span>
        )}
        {icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-medium transition-colors",
              selected ? "text-primary" : "text-foreground"
            )}
          >
            {label}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-scale-in">
            <svg
              className="w-4 h-4 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>
    </button>
  )
}

interface ChipOptionProps {
  selected: boolean
  onClick: () => void
  emoji?: string
  label: string
  disabled?: boolean
  className?: string
}

export function ChipOption({
  selected,
  onClick,
  emoji,
  label,
  disabled = false,
  className,
}: ChipOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2.5 rounded-full border-2 font-medium text-sm transition-all duration-200",
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-md"
          : "border-border/60 bg-white/50 hover:border-primary/40",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        className
      )}
    >
      {emoji && <span className="mr-1.5">{emoji}</span>}
      {label}
    </button>
  )
}

interface YesNoButtonsProps {
  value: boolean | null
  onChange: (value: boolean) => void
  yesLabel?: string
  noLabel?: string
  yesEmoji?: string
  noEmoji?: string
  disabled?: boolean
}

export function YesNoButtons({
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  yesEmoji = "✅",
  noEmoji = "❌",
  disabled = false,
}: YesNoButtonsProps) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => onChange(true)}
        disabled={disabled}
        className={cn(
          "flex-1 p-4 rounded-xl border-2 font-medium transition-all duration-200",
          "hover:-translate-y-0.5 active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          value === true
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-border/60 hover:border-emerald-300"
        )}
      >
        <span className="text-xl mr-2">{yesEmoji}</span>
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        disabled={disabled}
        className={cn(
          "flex-1 p-4 rounded-xl border-2 font-medium transition-all duration-200",
          "hover:-translate-y-0.5 active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          value === false
            ? "border-red-500 bg-red-50 text-red-700"
            : "border-border/60 hover:border-red-300"
        )}
      >
        <span className="text-xl mr-2">{noEmoji}</span>
        {noLabel}
      </button>
    </div>
  )
}

interface ProgressDotsProps {
  total: number
  current: number
  className?: string
}

export function ProgressDots({ total, current, className }: ProgressDotsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i === current
              ? "w-8 bg-primary"
              : i < current
              ? "w-2 bg-primary/60"
              : "w-2 bg-muted"
          )}
        />
      ))}
    </div>
  )
}

interface SuccessConfettiProps {
  show: boolean
}

export function SuccessConfetti({ show }: SuccessConfettiProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-6xl animate-bounce-gentle">🎉</div>
      </div>
    </div>
  )
}
