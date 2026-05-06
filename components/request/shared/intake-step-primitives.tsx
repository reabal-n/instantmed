"use client"

import { Check } from "lucide-react"
import type { ElementType, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface StepIntroProps {
  title: string
  description?: string
  eyebrow?: string
  className?: string
}

export function IntakeStepIntro({
  title,
  description,
  eyebrow,
  className,
}: StepIntroProps) {
  return (
    <div className={cn("space-y-1.5", className)} data-intake-step-intro="true">
      {eyebrow && (
        <p className="text-xs font-medium text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

interface QuestionCardProps {
  children: ReactNode
  className?: string
  compact?: boolean
}

export function QuestionCard({
  children,
  className,
  compact = false,
}: QuestionCardProps) {
  return (
    <section
      data-intake-question-card="true"
      className={cn(
        "rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:bg-card dark:shadow-none",
        compact ? "space-y-3 p-3" : "space-y-4 p-4",
        className,
      )}
    >
      {children}
    </section>
  )
}

interface QuestionPromptProps {
  label: string
  hint?: string
  required?: boolean
  icon?: ElementType
  id?: string
  className?: string
}

export function QuestionPrompt({
  label,
  hint,
  required,
  icon: Icon,
  id,
  className,
}: QuestionPromptProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-start gap-2">
        {Icon && (
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <p id={id} className="text-sm font-medium leading-snug text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
          {required && <span className="sr-only"> required</span>}
        </p>
      </div>
      {hint && (
        <p className={cn("text-xs leading-relaxed text-muted-foreground", Icon && "pl-6")}>
          {hint}
        </p>
      )}
    </div>
  )
}

export interface ChoiceOption<T extends string> {
  value: T
  label: string
  description?: string
}

interface SegmentedChoiceGroupProps<T extends string> {
  options: readonly ChoiceOption<T>[]
  value?: T | ""
  onChange: (value: T) => void
  ariaLabel: string
  columns?: "auto" | "two" | "one"
  className?: string
}

export function SegmentedChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  columns = "auto",
  className,
}: SegmentedChoiceGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "grid gap-2",
        columns === "one" && "grid-cols-1",
        columns === "two" && "grid-cols-2",
        columns === "auto" && "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-12 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-medium leading-tight transition-[background-color,border-color,color,box-shadow]",
              "touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "border-border/60 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
            )}
          >
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

interface BinaryChoiceProps {
  value: boolean | undefined
  onChange: (value: boolean) => void
  ariaLabel: string
  yesLabel?: string
  noLabel?: string
  className?: string
}

export function BinaryChoice({
  value,
  onChange,
  ariaLabel,
  yesLabel = "Yes",
  noLabel = "No",
  className,
}: BinaryChoiceProps) {
  const options = [
    { value: false, label: noLabel },
    { value: true, label: yesLabel },
  ]

  return (
    <div
      data-intake-binary-choice="true"
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid grid-cols-2 gap-2", className)}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-[background-color,border-color,color,box-shadow]",
              "touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              selected
                ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                : "border-border/60 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
            )}
          >
            {selected && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

interface StringBinaryChoiceProps<TNo extends string, TYes extends string> {
  value: TNo | TYes | undefined
  noValue: TNo
  yesValue: TYes
  onChange: (value: TNo | TYes) => void
  ariaLabel: string
  yesLabel?: string
  noLabel?: string
  className?: string
}

export function StringBinaryChoice<TNo extends string, TYes extends string>({
  value,
  noValue,
  yesValue,
  onChange,
  ariaLabel,
  yesLabel = "Yes",
  noLabel = "No",
  className,
}: StringBinaryChoiceProps<TNo, TYes>) {
  return (
    <BinaryChoice
      value={value === undefined ? undefined : value === yesValue}
      onChange={(next) => onChange(next ? yesValue : noValue)}
      ariaLabel={ariaLabel}
      yesLabel={yesLabel}
      noLabel={noLabel}
      className={className}
    />
  )
}
