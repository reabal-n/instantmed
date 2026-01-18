'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertTriangle, Check, ArrowRight, Loader2, Shield } from 'lucide-react'
import { FieldRenderer } from '../field-renderer'
import { useFlowStore, useFlowAnswers } from '@/lib/flow'
import type { FlowConfig, QuestionGroup, FieldConfig } from '@/lib/flow'
import { cn } from '@/lib/utils'
import posthog from 'posthog-js'

// Shake animation for validation errors
const shakeAnimation = {
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.5 }
  }
}

interface UnifiedQuestionsStepProps {
  config: FlowConfig
  onComplete?: () => void
  onEligibilityFail?: (reason: string) => void
}

/**
 * Unified questions step with accordion groups and progressive disclosure
 * Handles all service categories with 3 main sections:
 * 1. Eligibility (safety screening)
 * 2. Grouped questions (collapsible)
 * 3. Continue button
 */
export function UnifiedQuestionsStep({
  config,
  onComplete,
  onEligibilityFail,
}: UnifiedQuestionsStepProps) {
  const answers = useFlowAnswers()
  const { updateAnswer, nextStep } = useFlowStore()
  
  // Refs for scroll to first error
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  
  // Track which accordion sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['eligibility', config.questionnaire.groups[0]?.id])
  )
  
  // Track completion state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [shouldShake, setShouldShake] = useState(false)
  
  // Check if a field should be visible (conditional logic)
  const isFieldVisible = useCallback((field: FieldConfig): boolean => {
    if (!field.showIf) return true
    
    const { fieldId, operator, value } = field.showIf
    const currentValue = answers[fieldId]
    
    switch (operator) {
      case 'equals':
        return currentValue === value
      case 'not_equals':
        return currentValue !== value
      case 'contains':
        return typeof currentValue === 'string' && currentValue.includes(value as string)
      case 'includes':
        return Array.isArray(currentValue) && currentValue.includes(value)
      default:
        return true
    }
  }, [answers])
  
  // Check if eligibility is passed
  const eligibilityStatus = useMemo(() => {
    const eligibilityFields = config.questionnaire.eligibilityFields
    
    for (const field of eligibilityFields) {
      const value = answers[field.id]
      
      // Check for disqualifying values
      if (field.options) {
        if (Array.isArray(value)) {
          const hasDisqualifying = value.some(v => 
            field.options?.find(o => o.value === v)?.isDisqualifying
          )
          if (hasDisqualifying) {
            return { passed: false, reason: field.redFlagMessage || 'Not eligible for this service' }
          }
        } else if (typeof value === 'string') {
          const option = field.options.find(o => o.value === value)
          if (option?.isDisqualifying) {
            return { passed: false, reason: field.redFlagMessage || 'Not eligible for this service' }
          }
        }
      }
      
      // Check if required field is answered
      if (field.validation?.required && !value) {
        return { passed: false, reason: 'incomplete' }
      }
    }
    
    return { passed: true, reason: null }
  }, [answers, config.questionnaire.eligibilityFields])
  
  // Check if a group is complete (including minLength validation)
  const isGroupComplete = useCallback((group: QuestionGroup): boolean => {
    for (const field of group.fields) {
      if (!isFieldVisible(field)) continue
      if (field.validation?.required) {
        const value = answers[field.id]
        // Check if value exists
        if (value === undefined || value === null) {
          return false
        }
        // Check string/textarea fields
        if (typeof value === 'string') {
          if (value.trim() === '') return false
          // Check minLength for textarea/text fields
          if (field.validation.minLength && value.length < field.validation.minLength) {
            return false
          }
        }
        // Check toggle fields (must be explicitly true or false, not undefined)
        if (field.type === 'toggle' && typeof value !== 'boolean') {
          return false
        }
      }
    }
    return true
  }, [answers, isFieldVisible])
  
  // Check if all required fields are complete
  const isFormComplete = useMemo(() => {
    // Eligibility must pass
    if (!eligibilityStatus.passed || eligibilityStatus.reason === 'incomplete') {
      return false
    }
    
    // All groups must be complete
    for (const group of config.questionnaire.groups) {
      if (!isGroupComplete(group)) {
        return false
      }
    }
    
    return true
  }, [eligibilityStatus, config.questionnaire.groups, isGroupComplete])
  
  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }
  
  // Handle field change with validation
  const handleFieldChange = (fieldId: string, value: unknown) => {
    // Enforce 2-day maximum for medical certificate end dates
    if (fieldId === 'end_date' && answers.start_date) {
      const startDate = new Date(answers.start_date as string)
      const endDate = new Date(value as string)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Maximum 2 days total (0 or 1 day after start = 1 or 2 total days)
      if (daysDiff > 1) {
        const maxEndDate = new Date(startDate)
        maxEndDate.setDate(maxEndDate.getDate() + 1)
        value = maxEndDate.toISOString().split('T')[0]
      }
    }
    
    // Enforce earliest start date = yesterday for medical certificates
    if (fieldId === 'start_date') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      
      const selectedDate = new Date(value as string)
      if (selectedDate < yesterday) {
        value = yesterday.toISOString().split('T')[0]
      }
    }
    
    updateAnswer(fieldId, value)
  }
  
  // Handle continue with shake animation and scroll to first error
  const handleContinue = async () => {
    if (!isFormComplete) {
      setShowValidationErrors(true)
      setShouldShake(true)
      
      // Reset shake after animation
      setTimeout(() => setShouldShake(false), 500)
      
      // Find first incomplete section and scroll to it
      const incompleteSections: string[] = []
      if (!eligibilityStatus.passed) incompleteSections.push('eligibility')
      for (const group of config.questionnaire.groups) {
        if (!isGroupComplete(group)) incompleteSections.push(group.id)
      }
      
      // Expand all incomplete sections
      setExpandedSections(new Set(incompleteSections))
      
      // Scroll to first incomplete section after a brief delay for expansion
      if (incompleteSections.length > 0) {
        setTimeout(() => {
          const firstIncompleteRef = sectionRefs.current[incompleteSections[0]]
          if (firstIncompleteRef) {
            firstIncompleteRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
      return
    }
    
    // Check for eligibility failure
    if (!eligibilityStatus.passed && eligibilityStatus.reason !== 'incomplete') {
      onEligibilityFail?.(eligibilityStatus.reason!)
      return
    }
    
    setIsSubmitting(true)

    try {
      // Track questionnaire completion in PostHog
      posthog.capture('questionnaire_completed', {
        service_category: config.category,
        total_sections: totalGroups,
        completed_sections: completedGroups,
        questions_answered: Object.keys(answers).length,
      })

      onComplete?.()
      nextStep()
    } catch (error) {
      posthog.captureException(error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Render a field group section
  const renderSection = (
    id: string,
    title: string,
    description: string | undefined,
    fields: FieldConfig[],
    status: 'complete' | 'incomplete' | 'error'
  ) => {
    const isExpanded = expandedSections.has(id)
    const visibleFields = fields.filter(isFieldVisible)
    
    if (visibleFields.length === 0) return null
    
    return (
      <motion.div 
        key={id}
        ref={(el) => { sectionRefs.current[id] = el }}
        animate={shouldShake && status !== 'complete' ? shakeAnimation.shake : {}}
        className={cn(
          'border rounded-xl overflow-hidden transition-all',
          status === 'complete' && 'border-emerald-200 bg-emerald-50/30',
          status === 'incomplete' && 'border-slate-200',
          status === 'error' && 'border-red-200 bg-red-50/30'
        )}
      >
        {/* Section header */}
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className={cn(
            'w-full flex items-center justify-between p-4 text-left transition-colors',
            'hover:bg-slate-50',
            isExpanded && 'border-b border-slate-100'
          )}
        >
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
              status === 'complete' && 'bg-emerald-500',
              status === 'incomplete' && 'bg-slate-200',
              status === 'error' && 'bg-red-500'
            )}>
              {status === 'complete' && <Check className="w-4 h-4 text-white" />}
              {status === 'error' && <AlertTriangle className="w-4 h-4 text-white" />}
              {status === 'incomplete' && (
                <span className="w-2 h-2 bg-slate-400 rounded-full" />
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              {description && !isExpanded && (
                <p className="text-sm text-slate-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {status === 'complete' && !isExpanded && (
              <span className="text-xs text-emerald-600 font-medium">Complete</span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>
        
        {/* Section content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-5">
                {description && (
                  <p className="text-sm text-slate-500 -mt-1 mb-4">{description}</p>
                )}
                
                {visibleFields.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={answers[field.id]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    error={
                      showValidationErrors && field.validation?.required && !answers[field.id]
                        ? 'This field is required'
                        : undefined
                    }
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }
  
  // Get eligibility section status
  const getEligibilityStatus = (): 'complete' | 'incomplete' | 'error' => {
    if (!eligibilityStatus.passed) {
      return eligibilityStatus.reason === 'incomplete' ? 'incomplete' : 'error'
    }
    return 'complete'
  }
  
  // Get group status
  const getGroupStatus = (group: QuestionGroup): 'complete' | 'incomplete' | 'error' => {
    return isGroupComplete(group) ? 'complete' : 'incomplete'
  }

  // Calculate progress
  const totalGroups = config.questionnaire.groups.length + (config.questionnaire.eligibilityFields.length > 0 ? 1 : 0)
  const completedGroups = config.questionnaire.groups.filter(isGroupComplete).length + 
    (getEligibilityStatus() === 'complete' ? 1 : 0)
  const progressPercent = (completedGroups / totalGroups) * 100

  return (
    <div className="p-5 sm:p-6">
      {/* Compact header with progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-slate-900">Health questions</h2>
          <span className="text-xs font-medium text-slate-500">
            {completedGroups}/{totalGroups} sections
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      
      {/* Sections */}
      <div className="space-y-3">
        {/* Eligibility section */}
        {config.questionnaire.eligibilityFields.length > 0 && renderSection(
          'eligibility',
          'Safety check',
          undefined,
          config.questionnaire.eligibilityFields,
          getEligibilityStatus()
        )}
        
        {/* Question groups */}
        {config.questionnaire.groups.map((group) => renderSection(
          group.id,
          group.title,
          group.description,
          group.fields,
          getGroupStatus(group)
        ))}
      </div>
      
      {/* Continue button */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <motion.button
          onClick={handleContinue}
          disabled={isSubmitting}
          whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
          className={cn(
            'w-full h-13 sm:h-14 text-base font-semibold rounded-xl',
            'flex items-center justify-center gap-2',
            'transition-all duration-200',
            isFormComplete
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
        
        {/* Validation error */}
        <AnimatePresence>
          {showValidationErrors && !isFormComplete && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="text-xs text-red-500 text-center mt-3"
            >
              Please complete all required fields
            </motion.p>
          )}
        </AnimatePresence>
        
        {/* Security note - minimal */}
        <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-slate-400">
          <Shield className="w-3 h-3" />
          <span>Encrypted · Doctor reviewed</span>
        </div>
      </div>
    </div>
  )
}
