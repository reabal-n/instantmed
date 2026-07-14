"use client"

import { Check } from "lucide-react"
import type { ElementType, KeyboardEvent, ReactNode } from "react"
import { useRef } from "react"

import { requestCx } from "@/components/request/request-cx"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

/**
 * WAI-ARIA roving tabindex + arrow-key navigation for a `role="radiogroup"`.
 * The whole group is a single Tab stop; Arrow keys move focus AND selection
 * (selection follows focus, per the radio pattern), with wraparound; Home/End
 * jump to the ends. Without this, keyboard users had to Tab through every
 * option and could not arrow between them.
 *
 * Exported so the hand-rolled `role="radio"` groups in the bespoke step
 * components (e.g. certificate-step) get the same keyboard behaviour without
 * adopting the full SegmentedChoiceGroup markup.
 */
export function useRovingRadio(
  count: number,
  selectedIndex: number,
  onSelect: (index: number) => void,
  /**
   * Optional predicate marking an option index as disabled. Arrow/Home/End
   * navigation and the resting tab stop both skip disabled indices so focus
   * never lands on a non-interactive control (WCAG 2.1.1 — no keyboard trap).
   */
  isDisabled?: (index: number) => boolean,
) {
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])

  const registerRef = (index: number) => (el: HTMLButtonElement | null) => {
    itemsRef.current[index] = el
  }

  const disabledAt = (index: number) => (isDisabled ? isDisabled(index) : false)

  // First option that can actually receive focus. Falls back to 0 when every
  // option is disabled so the group is never silently dropped from the markup.
  const firstEnabledIndex = (() => {
    for (let i = 0; i < count; i++) {
      if (!disabledAt(i)) return i
    }
    return 0
  })()

  // The selected option is the tab stop. If nothing is selected yet (or the
  // selected option is disabled), the first ENABLED option is, so the group is
  // keyboard-reachable in one Tab without landing on a disabled control.
  const tabIndexFor = (index: number) => {
    if (disabledAt(index)) return -1
    const restingIndex =
      selectedIndex === -1 || disabledAt(selectedIndex) ? firstEnabledIndex : selectedIndex
    return index === restingIndex ? 0 : -1
  }

  // Walk from `start` in `step` direction, wrapping, until an enabled option is
  // found. Returns the start itself if no enabled option exists (all disabled).
  const nextEnabledIndex = (start: number, step: number) => {
    for (let i = 1; i <= count; i++) {
      const candidate = (start + step * i + count * i) % count
      if (!disabledAt(candidate)) return candidate
    }
    return start
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = nextEnabledIndex(currentIndex, 1)
        break
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = nextEnabledIndex(currentIndex, -1)
        break
      case "Home":
        // First enabled option, then walk forward if index 0 is disabled.
        nextIndex = disabledAt(0) ? nextEnabledIndex(0, 1) : 0
        break
      case "End":
        // Last enabled option, then walk backward if the final index is disabled.
        nextIndex = disabledAt(count - 1) ? nextEnabledIndex(count - 1, -1) : count - 1
        break
      default:
        return
    }
    event.preventDefault()
    if (disabledAt(nextIndex)) return
    onSelect(nextIndex)
    itemsRef.current[nextIndex]?.focus()
  }

  return { registerRef, tabIndexFor, onKeyDown }
}

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
    <div className={requestCx("space-y-1.5", className)} data-intake-step-intro="true">
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
      className={requestCx(
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
  hintId?: string
  required?: boolean
  icon?: ElementType
  id?: string
  className?: string
}

export function QuestionPrompt({
  label,
  hint,
  hintId,
  required,
  icon: Icon,
  id,
  className,
}: QuestionPromptProps) {
  return (
    <div className={requestCx("space-y-1", className)}>
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
        <p id={hintId} className={requestCx("text-xs leading-relaxed text-muted-foreground", Icon && "pl-6")}>
          {hint}
        </p>
      )}
    </div>
  )
}

interface CompactChoiceRowProps {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
  detail?: ReactNode
}

export function CompactChoiceRow({
  label,
  hint,
  required,
  children,
  detail,
}: CompactChoiceRowProps) {
  return (
    <div
      data-intake-compact-choice-row="true"
      className="border-b border-border/40 last:border-b-0"
    >
      <div className="flex min-h-12 items-center gap-3 py-2.5">
        <QuestionPrompt
          label={label}
          hint={hint}
          required={required}
          className="min-w-0 flex-1"
        />
        <div className="w-40 shrink-0">{children}</div>
      </div>
      {detail && (
        <div className="pb-3">{detail}</div>
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
  columns?: "auto" | "three" | "two" | "one"
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
  const selectedIndex = options.findIndex((option) => option.value === value)
  const { registerRef, tabIndexFor, onKeyDown } = useRovingRadio(
    options.length,
    selectedIndex,
    (index) => onChange(options[index].value),
  )
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={requestCx(
        "grid gap-2",
        columns === "one" && "grid-cols-1",
        columns === "two" && "grid-cols-2",
        columns === "three" && "grid-cols-3",
        columns === "auto" && "grid-cols-2 sm:grid-cols-4",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            ref={registerRef(index)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={tabIndexFor(index)}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={requestCx(
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

interface ScaleChoiceGroupProps {
  values: readonly number[]
  value?: number | null
  onChange: (value: number) => void
  ariaLabel: string
  lowLabel: string
  highLabel: string
  className?: string
}

export function ScaleChoiceGroup({
  values,
  value,
  onChange,
  ariaLabel,
  lowLabel,
  highLabel,
  className,
}: ScaleChoiceGroupProps) {
  const selectedIndex = values.findIndex((option) => option === value)
  const { registerRef, tabIndexFor, onKeyDown } = useRovingRadio(
    values.length,
    selectedIndex,
    (index) => onChange(values[index]),
  )

  return (
    <div className={requestCx("space-y-1.5", className)}>
      <div
        data-intake-scale-choice-group="true"
        role="radiogroup"
        aria-label={ariaLabel}
        className="grid grid-cols-5 gap-1.5"
      >
        {values.map((option, index) => {
          const selected = value === option
          return (
            <button
              key={option}
              ref={registerRef(index)}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${option} out of ${values.length}`}
              tabIndex={tabIndexFor(index)}
              onClick={() => onChange(option)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={requestCx(
                "flex min-h-11 items-center justify-center rounded-lg border px-2 text-sm font-semibold tabular-nums transition-[background-color,border-color,color,box-shadow]",
                "touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5",
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between gap-3 text-[11px] leading-tight text-muted-foreground">
        <span>{lowLabel}</span>
        <span className="text-right">{highLabel}</span>
      </div>
    </div>
  )
}

export interface ChoiceCardOption<T extends string> extends ChoiceOption<T> {
  icon?: ElementType
  chips?: readonly string[]
  disabled?: boolean
  disabledLabel?: string
}

interface ChoiceCardGroupProps<T extends string> {
  options: readonly ChoiceCardOption<T>[]
  value?: T | ""
  onChange: (value: T) => void
  ariaLabel: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  ariaInvalid?: boolean
  columns?: "one" | "two" | "three"
  mobileColumns?: "one" | "two" | "three"
  compact?: boolean
  hideChipsOnMobile?: boolean
  className?: string
}

export function ChoiceCardGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaInvalid,
  columns = "one",
  mobileColumns = "one",
  compact = false,
  hideChipsOnMobile = false,
  className,
}: ChoiceCardGroupProps<T>) {
  const selectedIndex = options.findIndex((option) => option.value === value)
  const { registerRef, tabIndexFor, onKeyDown } = useRovingRadio(
    options.length,
    selectedIndex,
    (index) => {
      const option = options[index]
      if (!option.disabled) onChange(option.value)
    },
    (index) => options[index]?.disabled === true,
  )
  const mobileGridClass =
    mobileColumns === "three"
      ? "grid-cols-3"
      : mobileColumns === "two"
        ? "grid-cols-2"
        : "grid-cols-1"
  const desktopGridClass =
    columns === "three"
      ? "sm:grid-cols-3"
      : columns === "two"
        ? "sm:grid-cols-2"
        : "sm:grid-cols-1"

  return (
    <div
      data-intake-choice-card-group="true"
      role="radiogroup"
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid || undefined}
      className={requestCx(
        "grid gap-2",
        mobileGridClass,
        desktopGridClass,
        className,
      )}
    >
      {options.map((option, index) => {
        const Icon = option.icon
        const selected = value === option.value
        const disabled = option.disabled === true
        const hasDescription = Boolean(option.description)
        const hasChips = Boolean(option.chips?.length)
        const chipOnlyHiddenOnMobile = compact && hideChipsOnMobile && hasChips && !hasDescription
        const hasVisibleMobileSupport = hasDescription || (hasChips && !hideChipsOnMobile)
        const alignClass = chipOnlyHiddenOnMobile
          ? "items-center sm:items-start"
          : compact && !hasVisibleMobileSupport
            ? "items-center"
            : "items-start"
        const iconShellClass = chipOnlyHiddenOnMobile
          ? "h-7 w-7 sm:h-9 sm:w-9"
          : compact && !hasVisibleMobileSupport
            ? "h-7 w-7"
            : "h-9 w-9"
        const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4"
        const selectedOffsetClass = chipOnlyHiddenOnMobile
          ? "sm:mt-0.5"
          : hasVisibleMobileSupport
            ? "mt-0.5"
            : undefined

        return (
          <button
            key={option.value}
            ref={registerRef(index)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled || undefined}
            tabIndex={tabIndexFor(index)}
            onClick={() => {
              if (!disabled) onChange(option.value)
            }}
            onKeyDown={(event) => {
              if (!disabled) onKeyDown(event, index)
            }}
            className={requestCx(
              "group w-full rounded-xl border text-left transition-[background-color,border-color,box-shadow] duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              compact ? "px-2.5 py-2.5" : "px-4 py-3.5",
              disabled
                ? "cursor-not-allowed border-dashed border-border bg-muted/30 opacity-70"
                : selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5",
            )}
            data-intake-choice-card="true"
          >
            <span className={requestCx("flex gap-2.5", alignClass)}>
              {Icon && (
                <span
                  className={requestCx(
                    "flex shrink-0 items-center justify-center rounded-lg",
                    iconShellClass,
                    selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  <Icon className={iconClass} />
                </span>
              )}
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block text-sm font-medium leading-snug text-foreground">
                  {option.label}
                </span>
                {option.description && (
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </span>
                )}
                {option.chips && option.chips.length > 0 && (
                  <span
                    className={requestCx(
                      "flex flex-wrap gap-1.5 pt-1",
                      compact && hideChipsOnMobile && "hidden sm:flex",
                    )}
                  >
                    {option.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {chip}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              {disabled && option.disabledLabel && (
                <span className="shrink-0 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {option.disabledLabel}
                </span>
              )}
              {!disabled && selected && (
                <span className={requestCx("flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground", selectedOffsetClass)}>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export interface ChipToggleOption {
  key: string
  label: string
}

interface ChipToggleGroupProps {
  options: readonly ChipToggleOption[]
  values: Record<string, unknown>
  onChange: (key: string, checked: boolean) => void
  ariaLabel: string
  className?: string
}

export function ChipToggleGroup({
  options,
  values,
  onChange,
  ariaLabel,
  className,
}: ChipToggleGroupProps) {
  return (
    <div
      data-intake-chip-toggle-group="true"
      role="group"
      aria-label={ariaLabel}
      className={requestCx("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const selected = values[option.key] === true
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={selected}
            data-intake-chip-toggle="true"
            onClick={() => onChange(option.key, !selected)}
            className={requestCx(
              "inline-flex min-h-12 items-center justify-center rounded-full border px-3 py-2 text-sm font-medium leading-tight transition-[background-color,border-color,color,box-shadow]",
              "touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              selected
                ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                : "border-border/60 bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
            )}
          >
            {selected && <Check className="mr-1.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export interface ToggleListItem {
  key: string
  label: string
  helpText?: string
}

interface ToggleListProps {
  items: readonly ToggleListItem[]
  values: Record<string, unknown>
  onChange: (key: string, checked: boolean) => void
  className?: string
}

export function ToggleList({
  items,
  values,
  onChange,
  className,
}: ToggleListProps) {
  return (
    <div
      data-intake-toggle-list="true"
      className={requestCx("space-y-2", className)}
    >
      {items.map((item) => (
        <div
          key={item.key}
          data-intake-toggle-row="true"
          className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border/60 bg-white p-3 shadow-sm shadow-primary/[0.03] dark:bg-card dark:shadow-none"
        >
          <Label htmlFor={item.key} className="flex-1 cursor-pointer text-sm leading-snug">
            {item.label}
            {item.helpText && (
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {item.helpText}
              </span>
            )}
          </Label>
          <Switch
            id={item.key}
            checked={values[item.key] === true}
            onCheckedChange={(checked) => onChange(item.key, checked)}
          />
        </div>
      ))}
    </div>
  )
}

interface BinaryChoiceProps {
  value: boolean | undefined
  onChange: (value: boolean) => void
  ariaLabel: string
  ariaDescribedBy?: string
  ariaInvalid?: boolean
  ariaRequired?: boolean
  yesLabel?: string
  noLabel?: string
  className?: string
}

export function BinaryChoice({
  value,
  onChange,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  ariaRequired,
  yesLabel = "Yes",
  noLabel = "No",
  className,
}: BinaryChoiceProps) {
  const options = [
    { value: false, label: noLabel },
    { value: true, label: yesLabel },
  ]
  const selectedIndex = options.findIndex((option) => option.value === value)
  const { registerRef, tabIndexFor, onKeyDown } = useRovingRadio(
    options.length,
    selectedIndex,
    (index) => onChange(options[index].value),
  )

  return (
    <div
      data-intake-binary-choice="true"
      role="radiogroup"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid || undefined}
      aria-required={ariaRequired || undefined}
      className={requestCx("grid grid-cols-2 gap-2", className)}
    >
      {options.map((option, index) => {
        const selected = value === option.value
        return (
          <button
            key={String(option.value)}
            ref={registerRef(index)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={tabIndexFor(index)}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={requestCx(
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
  const binaryValue = value === yesValue
    ? true
    : value === noValue
      ? false
      : undefined

  return (
    <BinaryChoice
      value={binaryValue}
      onChange={(next) => onChange(next ? yesValue : noValue)}
      ariaLabel={ariaLabel}
      yesLabel={yesLabel}
      noLabel={noLabel}
      className={className}
    />
  )
}

interface YesNoDetailQuestionProps {
  label: string
  helpText?: string
  yesLabel?: string
  noLabel?: string
  value: boolean | undefined
  onSelect: (value: boolean) => void
  detail?: string
  onDetailChange?: (value: string) => void
  detailPlaceholder?: string
  error?: string
  id?: string
  className?: string
}

function questionIdFromLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function YesNoDetailQuestion({
  label,
  helpText,
  yesLabel = "Yes",
  noLabel = "No",
  value,
  onSelect,
  detail,
  onDetailChange,
  detailPlaceholder,
  error,
  id,
  className,
}: YesNoDetailQuestionProps) {
  const questionId = id || questionIdFromLabel(label)
  const errorId = `${questionId}-error`
  const hintId = helpText ? `${questionId}-hint` : undefined
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined

  return (
    <div
      data-intake-yes-no-detail-question="true"
      className={requestCx("space-y-2.5", className)}
      role="group"
      aria-labelledby={`${questionId}-label`}
    >
      <QuestionPrompt
        id={`${questionId}-label`}
        label={label}
        hint={helpText}
        hintId={hintId}
        required
      />
      <BinaryChoice
        value={value}
        onChange={onSelect}
        ariaLabel={label}
        ariaDescribedBy={describedBy}
        ariaInvalid={Boolean(error)}
        ariaRequired
        noLabel={noLabel}
        yesLabel={yesLabel}
      />
      {value === true && onDetailChange && (
        <Textarea
          value={detail || ""}
          onValueChange={onDetailChange}
          placeholder={detailPlaceholder}
          className="min-h-[60px]"
          textareaClassName="text-base sm:text-sm"
          aria-describedby={describedBy}
        />
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}
