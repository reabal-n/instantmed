'use client'

import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, Check, AlertCircle, ChevronDown, AlertTriangle, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IOSToggle, SegmentedControl } from '@/components/ui/ios-toggle'
import { MedicationSearch, type MedicationSelection } from './medication-search'
import type { FieldConfig } from '@/lib/flow'
import { checkSymptoms } from '@/components/intake/symptom-checker'

// Fields that should be scanned for red flag symptoms
const RED_FLAG_SCAN_FIELDS = [
  'primary_concern',
  'symptoms_description',
  'reason_for_new',
  'new_med_reason',
  'general_other_conditions',
  'womens_symptoms',
  'otherSymptom',
  'consult_details',
]

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

  // Real-time red flag scanning for textarea fields containing medical symptoms
  const shouldScanForRedFlags = field.type === 'textarea' && RED_FLAG_SCAN_FIELDS.includes(field.id)
  const textValueForScan = (shouldScanForRedFlags && typeof value === 'string') ? value : ''
  
  const redFlagResult = useMemo(() => {
    if (!shouldScanForRedFlags || !textValueForScan || textValueForScan.length < 10) {
      return null
    }
    return checkSymptoms([], textValueForScan)
  }, [shouldScanForRedFlags, textValueForScan])
  
  const hasCriticalRedFlags = redFlagResult?.severity === 'critical'
  const hasUrgentFlags = redFlagResult?.severity === 'urgent'

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
        // Special case: medication_name field uses MedicationSearch component
        if (field.id === 'medication_name') {
          const medValue = value as MedicationSelection | string | null
          // Convert string to MedicationSelection format if needed
          const selection: MedicationSelection | null = 
            typeof medValue === 'string' && medValue 
              ? { medicationId: null, name: medValue, isManualEntry: true }
              : (medValue as MedicationSelection | null)
          
          return (
            <MedicationSearch
              value={selection}
              onChange={(sel) => {
                // Store just the medication name string for form compatibility
                onChange(sel?.name || '')
              }}
              placeholder={field.placeholder}
              error={error}
            />
          )
        }
        
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

      case 'textarea': {
        const textValue = (value as string) || ''
        const minLen = field.validation?.minLength || 0
        const maxLen = field.validation?.maxLength
        const charCount = textValue.length
        const needsMoreChars = minLen > 0 && charCount < minLen
        
        return (
          <div className="space-y-1.5">
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={textValue}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={field.placeholder}
              rows={3}
              className={cn(
                inputBaseClass, 
                'px-4 py-3 resize-none',
                hasCriticalRedFlags && 'border-red-400 focus:border-red-500'
              )}
            />
            
            {/* CRITICAL RED FLAG WARNING - Emergency symptoms detected */}
            <AnimatePresence>
              {hasCriticalRedFlags && redFlagResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-red-800 text-sm">
                          These symptoms need immediate attention
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          {redFlagResult.message}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {redFlagResult.redFlags.map((flag) => (
                            <span 
                              key={flag} 
                              className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <a
                            href="tel:000"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call 000
                          </a>
                          <a
                            href="tel:131114"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-700 text-xs font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                          >
                            Lifeline: 13 11 14
                          </a>
                        </div>
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          This service cannot help with emergency symptoms. Please seek immediate care.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* URGENT FLAG WARNING - Needs prompt attention but can continue */}
            <AnimatePresence>
              {hasUrgentFlags && !hasCriticalRedFlags && redFlagResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-800 font-medium">
                          These symptoms may need prompt attention
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Our doctors will prioritize your request if you continue.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Character count indicator - shows when focused or under minimum */}
            {(isFocused || needsMoreChars) && minLen > 0 && !hasCriticalRedFlags && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between text-xs"
              >
                <span className={cn(
                  needsMoreChars ? 'text-amber-600' : 'text-slate-400'
                )}>
                  {needsMoreChars 
                    ? `${minLen - charCount} more characters needed`
                    : 'Minimum met'
                  }
                </span>
                <span className={cn(
                  'tabular-nums',
                  needsMoreChars ? 'text-amber-600' : 'text-slate-400',
                  maxLen && charCount > maxLen && 'text-red-500'
                )}>
                  {charCount}{maxLen ? `/${maxLen}` : ''}
                </span>
              </motion.div>
            )}
          </div>
        )
      }

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
      case 'multiselect': {
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
      }

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

      case 'toggle':
        return (
          <IOSToggle
            checked={value === true}
            onChange={(checked) => onChange(checked)}
            size="md"
          />
        )

      case 'segmented':
        return (
          <SegmentedControl
            value={(value as string) || ''}
            onChange={(val) => onChange(val)}
            options={field.options?.map(opt => ({ value: opt.value, label: opt.label })) || []}
            className="w-full"
          />
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
