"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { IOSToggle } from "@/components/ui/ios-toggle"
import type { FieldConfig } from "@/lib/flow"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FieldRendererProps {
  field: FieldConfig
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a single flow field based on its `type`.
 *
 * Supports: text, textarea, select (card-style), toggle, date, radio.
 * Handles conditional visibility (`showIf`) at the parent level — if the
 * parent hides the field it simply won't mount this component.
 */
export function FieldRenderer({
  field,
  value,
  onChange,
  error,
}: FieldRendererProps) {
  const { id, type, label, placeholder, description, options } = field

  return (
    <div className="mb-4">
      {/* Label */}
      {type !== "toggle" && (
        <Label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
          {field.validation?.required && (
            <span className="text-red-400 ml-0.5">*</span>
          )}
        </Label>
      )}

      {/* Description */}
      {description && type !== "toggle" && (
        <p className="text-xs text-slate-500 mb-2">{description}</p>
      )}

      {/* Field */}
      {renderField(type, {
        id,
        value,
        onChange,
        placeholder,
        label,
        description,
        options,
      })}

      {/* Error */}
      {error && (
        <p className="mt-1.5 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field type renderers
// ---------------------------------------------------------------------------

interface FieldInternals {
  id: string
  value: unknown
  onChange: (value: unknown) => void
  placeholder?: string
  label: string
  description?: string
  options?: FieldConfig["options"]
}

function renderField(type: string, props: FieldInternals) {
  switch (type) {
    case "text":
      return (
        <Input
          id={props.id}
          type="text"
          value={typeof props.value === "string" ? props.value : ""}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className="h-11 rounded-xl"
        />
      )

    case "textarea":
      return (
        <Textarea
          id={props.id}
          value={typeof props.value === "string" ? props.value : ""}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className="min-h-24 rounded-xl resize-none"
        />
      )

    case "date":
      return (
        <Input
          id={props.id}
          type="date"
          value={typeof props.value === "string" ? props.value : ""}
          onChange={(e) => props.onChange(e.target.value)}
          className="h-11 rounded-xl"
        />
      )

    case "toggle":
      return (
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex-1">
            <Label
              htmlFor={props.id}
              className="text-sm font-medium text-slate-700"
            >
              {props.label}
            </Label>
            {props.description && (
              <p className="text-xs text-slate-500 mt-0.5">
                {props.description}
              </p>
            )}
          </div>
          <IOSToggle
            checked={props.value === true}
            onChange={(checked: boolean) => props.onChange(checked)}
          />
        </div>
      )

    case "select":
      return <OptionCards {...props} multi={false} />

    case "multi_select":
      return <OptionCards {...props} multi={true} />

    case "radio":
      return <RadioGroup {...props} />

    default:
      // Fallback: plain text input
      return (
        <Input
          id={props.id}
          type="text"
          value={typeof props.value === "string" ? props.value : ""}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className="h-11 rounded-xl"
        />
      )
  }
}

// ---------------------------------------------------------------------------
// Card-style option selector (single or multi)
// ---------------------------------------------------------------------------

function OptionCards({
  id,
  value,
  onChange,
  options,
  multi,
}: FieldInternals & { multi: boolean }) {
  if (!options || options.length === 0) return null

  const selectedSet = new Set(
    multi
      ? Array.isArray(value)
        ? (value as (string | boolean)[])
        : []
      : value !== undefined && value !== null
        ? [value]
        : []
  )

  const handleClick = (optValue: string | boolean) => {
    if (multi) {
      const current = Array.isArray(value)
        ? (value as (string | boolean)[])
        : []
      if (current.includes(optValue)) {
        onChange(current.filter((v) => v !== optValue))
      } else {
        onChange([...current, optValue])
      }
    } else {
      onChange(optValue)
    }
  }

  return (
    <div className="grid gap-2" role="group" aria-labelledby={id}>
      {options.map((opt) => {
        const isActive = selectedSet.has(opt.value)
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => handleClick(opt.value)}
            className={cn(
              "w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-200",
              "hover:border-emerald-300 hover:bg-emerald-50/30",
              isActive
                ? "border-emerald-500 bg-emerald-50 shadow-sm"
                : "border-slate-200 bg-white"
            )}
          >
            <span className="text-sm font-medium text-slate-800">
              {opt.label}
            </span>
            {opt.description && (
              <span className="block text-xs text-slate-500 mt-0.5">
                {opt.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Radio group (standard HTML radios with styled labels)
// ---------------------------------------------------------------------------

function RadioGroup({ id, value, onChange, options }: FieldInternals) {
  if (!options || options.length === 0) return null

  return (
    <div className="space-y-2" role="radiogroup" aria-labelledby={id}>
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <label
            key={String(opt.value)}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all duration-200",
              "hover:border-emerald-300 hover:bg-emerald-50/30",
              isActive
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 bg-white"
            )}
          >
            <input
              type="radio"
              name={id}
              value={String(opt.value)}
              checked={isActive}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                isActive ? "border-emerald-500" : "border-slate-300"
              )}
            >
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </span>
            <div>
              <span className="text-sm font-medium text-slate-800">
                {opt.label}
              </span>
              {opt.description && (
                <span className="block text-xs text-slate-500 mt-0.5">
                  {opt.description}
                </span>
              )}
            </div>
          </label>
        )
      })}
    </div>
  )
}
