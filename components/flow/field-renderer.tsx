'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, Check, AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldConfig } from '@/lib/flow'

export interface FieldRendererProps {
  field: FieldConfig
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

export function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const [showHelp, setShowHelp] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  // Shared input styles with focus glow
  const inputBaseClass = cn(
    'w-full rounded-xl border-2 bg-white text-slate-900 text-base',
    'placeholder:text-slate-400',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-0',
    error
      ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.1)]'
      : 'border-slate-200 focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1)]',
    'hover:border-slate-300'
  )

  // Render based on field type
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={field.type === 'phone' ? 'tel' : field.type}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            className={cn(inputBaseClass, 'h-12 px-4')}
          />
        )

      case 'number':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={cn(inputBaseClass, 'h-12 px-4')}
          />
        )

      case 'textarea':
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={field.placeholder}
            rows={3}
            className={cn(inputBaseClass, 'px-4 py-3 resize-none')}
          />
        )

      case 'date':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(inputBaseClass, 'h-12 px-4')}
          />
        )

      case 'select':
        return (
          <div className="relative">
            <select
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={cn(
                inputBaseClass,
                'h-12 px-4 pr-10 appearance-none cursor-pointer'
              )}
            >
              <option value="">Select an option</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((opt, idx) => {
              const isSelected = value === opt.value
              return (
                <motion.label
                  key={opt.value}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer',
                    'transition-all duration-150 ease-out',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm shadow-emerald-500/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  )}
                >
                  <motion.div
                    className={cn(
                      'shrink-0 w-5 h-5 rounded-full border-2 mt-0.5',
                      'flex items-center justify-center',
                      'transition-colors duration-150',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-300 bg-white'
                    )}
                    animate={{ scale: isSelected ? [1, 1.1, 1] : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="w-2 h-2 rounded-full bg-white"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-emerald-900' : 'text-slate-700'
                    )}>
                      {opt.label}
                    </span>
                    {opt.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                    )}
                  </div>
                  <input
                    type="radio"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => onChange(opt.value)}
                    className="sr-only"
                  />
                </motion.label>
              )
            })}
          </div>
        )

      case 'checkbox':
      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {field.options?.map((opt, idx) => {
              const isSelected = selectedValues.includes(opt.value)
              return (
                <motion.label
                  key={opt.value}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer',
                    'transition-all duration-150 ease-out',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm shadow-emerald-500/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  )}
                >
                  <motion.div
                    className={cn(
                      'shrink-0 w-5 h-5 rounded-md border-2 mt-0.5',
                      'flex items-center justify-center',
                      'transition-colors duration-150',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-300 bg-white'
                    )}
                    animate={{ scale: isSelected ? [1, 1.1, 1] : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                        >
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-emerald-900' : 'text-slate-700'
                    )}>
                      {opt.label}
                    </span>
                    {opt.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
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
                </motion.label>
              )
            })}
          </div>
        )

      case 'boolean':
        return (
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: true, label: 'Yes' },
              { val: false, label: 'No' },
            ].map((opt) => (
              <motion.button
                key={String(opt.val)}
                type="button"
                onClick={() => onChange(opt.val)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'py-3.5 px-4 rounded-xl border-2 font-medium text-sm',
                  'transition-all duration-150 ease-out',
                  value === opt.val
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm shadow-emerald-500/10'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-600'
                )}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        )

      default:
        return <p className="text-sm text-slate-500">Unsupported field type: {field.type}</p>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {/* Label with help button */}
      <div className="flex items-start justify-between gap-2">
        <label className="text-sm font-semibold text-slate-800">
          {field.label}
          {field.validation?.required && (
            <span className="text-red-400 ml-0.5">*</span>
          )}
        </label>
        {field.helpText && (
          <motion.button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'p-1 rounded-full transition-colors',
              showHelp ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <HelpCircle className="h-4 w-4" />
          </motion.button>
        )}
      </div>

      {/* Description */}
      {field.description && (
        <p className="text-xs text-slate-500 -mt-1">{field.description}</p>
      )}

      {/* Help text (animated) */}
      <AnimatePresence>
        {showHelp && field.helpText && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {field.helpText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Field */}
      <div className="relative">
        {renderField()}
        
        {/* Focus indicator bar */}
        <motion.div
          className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isFocused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Error message (animated) */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
