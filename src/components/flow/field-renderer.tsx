'use client'

import { useState } from 'react'
import { HelpCircle, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { FieldConfig } from '@/lib/flow'

interface FieldRendererProps {
  field: FieldConfig
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

export function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const [showHelp, setShowHelp] = useState(false)

  // Render based on field type
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            type={field.type === 'phone' ? 'tel' : field.type}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="h-11"
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className="h-11"
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="resize-none"
          />
        )

      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-11"
          />
        )

      case 'select':
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'w-full h-11 px-3 rounded-lg border border-slate-200',
              'bg-white text-slate-900',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
            )}
          >
            <option value="">Select an option</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                  value === opt.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <div
                  className={cn(
                    'flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5',
                    'flex items-center justify-center',
                    value === opt.value
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-slate-300'
                  )}
                >
                  {value === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-slate-900">{opt.label}</span>
                  {opt.description && (
                    <p className="text-sm text-slate-500 mt-0.5">{opt.description}</p>
                  )}
                </div>
                <input
                  type="radio"
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        )

      case 'checkbox':
      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => {
              const isSelected = selectedValues.includes(opt.value)
              return (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5',
                      'flex items-center justify-center',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-300'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-slate-900">{opt.label}</span>
                    {opt.description && (
                      <p className="text-sm text-slate-500 mt-0.5">{opt.description}</p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (isSelected) {
                        onChange(selectedValues.filter((v) => v !== opt.value))
                      } else {
                        // Handle "none" option clearing others
                        if (opt.value === 'none') {
                          onChange([opt.value])
                        } else {
                          onChange([
                            ...selectedValues.filter((v) => v !== 'none'),
                            opt.value,
                          ])
                        }
                      }
                    }}
                    className="sr-only"
                  />
                </label>
              )
            })}
          </div>
        )

      case 'boolean':
        return (
          <div className="flex gap-3">
            {[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  'flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all',
                  value === opt.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )

      default:
        return <p className="text-sm text-slate-500">Unsupported field type: {field.type}</p>
    }
  }

  return (
    <div className="space-y-2">
      {/* Label with help button */}
      <div className="flex items-start justify-between gap-2">
        <Label className="text-base font-medium text-slate-900">
          {field.label}
          {field.validation?.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </Label>
        {field.helpText && (
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-slate-400 hover:text-slate-600"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Description */}
      {field.description && (
        <p className="text-sm text-slate-500">{field.description}</p>
      )}

      {/* Help text (collapsible) */}
      {showHelp && field.helpText && (
        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
          {field.helpText}
        </div>
      )}

      {/* Field */}
      {renderField()}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
