"use client"

import type * as React from "react"
import { useState, useCallback, useMemo } from "react"
import { ChevronDown, Check, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { FlowConfig, FlowSection, FlowQuestion } from "@/lib/intake/flow-engine"
import { getVisibleSections, getVisibleQuestions, checkSafetyFlags } from "@/lib/intake/flow-engine"
import { RadioGroup, RadioCard } from "@/components/ui/radio-group-card"

interface CollapsibleFormProps {
  config: FlowConfig
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  errors?: Record<string, string>
  onValidate?: (errors: Record<string, string>) => void
}

// Chip component
function Chip({
  selected,
  onClick,
  children,
  emoji,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  emoji?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-full text-sm font-medium transition-all duration-150 flex items-center gap-1.5",
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80",
        "active:scale-95",
      )}
    >
      {emoji && <span>{emoji}</span>}
      {children}
    </button>
  )
}

// Card selector
function CardSelector({
  selected,
  onClick,
  children,
  emoji,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  emoji?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-xl border-2 text-center transition-all duration-150 min-h-20",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/50 hover:bg-muted/50",
        "active:scale-[0.98]",
      )}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
      {emoji && <div className="text-2xl mb-1">{emoji}</div>}
      <div className="font-medium text-sm">{children}</div>
    </button>
  )
}

// Toggle button
function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            !value ? "bg-primary text-primary-foreground" : "bg-background border hover:bg-muted",
          )}
        >
          No
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            value ? "bg-primary text-primary-foreground" : "bg-background border hover:bg-muted",
          )}
        >
          Yes
        </button>
      </div>
    </div>
  )
}

// Question renderer
function QuestionField({
  question,
  value,
  onChange,
  error,
}: {
  question: FlowQuestion
  value: string | string[] | boolean | undefined
  onChange: (value: string | string[] | boolean) => void
  error?: string
}) {
  switch (question.type) {
    case "single":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{question.label}</Label>
          {question.sublabel && <p className="text-xs text-muted-foreground">{question.sublabel}</p>}
          <RadioGroup
            value={typeof value === 'string' ? value : undefined}
            onValueChange={onChange}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {question.options?.map((opt) => (
              <RadioCard
                key={opt.id}
                value={opt.id}
                title={opt.label}
                icon={opt.emoji ? <span className="text-xl">{opt.emoji}</span> : undefined}
              />
            ))}
          </RadioGroup>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "multi":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{question.label}</Label>
          {question.sublabel && <p className="text-xs text-muted-foreground">{question.sublabel}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {question.options?.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt.id)
              return (
                <CardSelector
                  key={opt.id}
                  selected={selected}
                  onClick={() => {
                    const current = Array.isArray(value) ? value : []
                    onChange(selected ? current.filter((v) => v !== opt.id) : [...current, opt.id])
                  }}
                  emoji={opt.emoji}
                >
                  {opt.label}
                </CardSelector>
              )
            })}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "chips":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{question.label}</Label>
          {question.sublabel && <p className="text-xs text-muted-foreground">{question.sublabel}</p>}
          <div className="flex flex-wrap gap-2">
            {question.options?.map((opt) => (
              <Chip key={opt.id} selected={value === opt.id} onClick={() => onChange(opt.id)} emoji={opt.emoji}>
                {opt.label}
              </Chip>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "text":
      const isMultiline = question.placeholder?.includes("...") || question.id === "notes"
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{question.label}</Label>
          {question.sublabel && <p className="text-xs text-muted-foreground">{question.sublabel}</p>}
          {isMultiline ? (
            <Textarea
              value={typeof value === 'string' ? value : ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={question.placeholder}
              className="min-h-20"
            />
          ) : (
            <Input value={typeof value === 'string' ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder={question.placeholder} />
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "date":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{question.label}</Label>
          <Input type="date" value={typeof value === 'string' ? value : ""} onChange={(e) => onChange(e.target.value)} />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    case "toggle":
      return (
        <div className="space-y-2">
          <Toggle value={value === true} onChange={onChange} label={question.label} />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )

    default:
      return null
  }
}

// Collapsible section
function Section({
  section,
  data,
  onChange,
  errors,
  isOpen,
  onToggle,
  isComplete,
}: {
  section: FlowSection
  data: Record<string, unknown>
  onChange: (field: string, value: string | string[] | boolean) => void
  errors?: Record<string, string>
  isOpen: boolean
  onToggle: () => void
  isComplete: boolean
}) {
  const visibleQuestions = getVisibleQuestions(section, data)

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {section.emoji && <span className="text-xl">{section.emoji}</span>}
          <div className="text-left">
            <div className="font-medium">{section.title}</div>
            {section.subtitle && <div className="text-xs text-muted-foreground">{section.subtitle}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
          <div className="pt-4 space-y-4">
            {visibleQuestions.map((question) => (
              <QuestionField
                key={question.id}
                question={question}
                value={data[question.id] as string | string[] | boolean | undefined}
                onChange={(value) => onChange(question.id, value)}
                error={errors?.[question.id]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CollapsibleForm({ config, data, onChange, errors = {}, onValidate: _onValidate }: CollapsibleFormProps) {
  const visibleSections = useMemo(() => getVisibleSections(config, data), [config, data])

  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    for (const section of visibleSections) {
      const questions = getVisibleQuestions(section, data)
      const hasRequired = questions.some((q) => q.required)
      const isComplete = questions.every((q) => {
        if (!q.required) return true
        const val = data[q.id]
        return val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)
      })

      if (hasRequired && !isComplete) {
        return new Set([section.id])
      }
    }
    return new Set()
  })

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  const handleChange = useCallback(
    (field: string, value: string | string[] | boolean) => {
      onChange({ ...data, [field]: value })
    },
    [data, onChange],
  )

  // Check section completion
  const isSectionComplete = useCallback(
    (section: FlowSection) => {
      const questions = getVisibleQuestions(section, data)
      return questions.every((q) => {
        if (!q.required) return true
        const val = data[q.id]
        return val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)
      })
    },
    [data],
  )

  // Safety flags
  const safetyFlags = useMemo(() => checkSafetyFlags(config, data), [config, data])

  const knockoutFlag = safetyFlags.find((f) => f.severity === "knockout")

  return (
    <div className="space-y-3">
      {/* Knockout warning */}
      {knockoutFlag && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-destructive">We recommend in-person care</div>
            <p className="text-sm text-destructive/80 mt-1">{knockoutFlag.message}</p>
          </div>
        </div>
      )}

      {/* Sections */}
      {visibleSections.map((section) => (
        <Section
          key={section.id}
          section={section}
          data={data}
          onChange={handleChange}
          errors={errors}
          isOpen={openSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          isComplete={isSectionComplete(section)}
        />
      ))}

      {/* Safety section */}
      {config.safetySection && (
        <Section
          section={config.safetySection}
          data={data}
          onChange={handleChange}
          errors={errors}
          isOpen={openSections.has(config.safetySection.id)}
          onToggle={() => toggleSection(config.safetySection!.id)}
          isComplete={isSectionComplete(config.safetySection)}
        />
      )}
    </div>
  )
}
