'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react'
import { FlowContent, FlowSection } from '../flow-content'
import { FieldRenderer } from '../field-renderer'
import { Button } from '@/components/ui/button'
import { useFlowStore, useFlowAnswers, useFlowProgress } from '@/lib/flow'
import type { FlowConfig, FieldConfig, QuestionGroup } from '@/lib/flow'
import { cn } from '@/lib/utils'

interface QuestionnaireStepProps {
  config: FlowConfig
  onComplete?: () => void
  onEligibilityFail?: (reason: string) => void
}

export function QuestionnaireStep({
  config,
  onComplete,
  onEligibilityFail,
}: QuestionnaireStepProps) {
  const { currentGroupIndex } = useFlowProgress()
  const answers = useFlowAnswers()
  const { updateAnswer, nextGroup, prevGroup, nextStep, setEligibility } = useFlowStore()

  const questionnaire = config.questionnaire
  const allGroups = [
    // Eligibility fields as first "group"
    {
      id: 'eligibility',
      title: 'Quick health check',
      description: 'A few important questions before we continue',
      fields: questionnaire.eligibilityFields,
    },
    ...questionnaire.groups,
  ]

  const currentGroup = allGroups[currentGroupIndex]
  const isLastGroup = currentGroupIndex === allGroups.length - 1
  const isFirstGroup = currentGroupIndex === 0

  // Check if current group is complete
  const isGroupComplete = useCallback(() => {
    if (!currentGroup) return false

    return currentGroup.fields.every((field) => {
      // Check if field should be shown
      if (field.showIf) {
        const conditionMet = evaluateCondition(field.showIf, answers)
        if (!conditionMet) return true // Hidden fields don't need values
      }

      // Check if required field has value
      if (field.validation?.required) {
        const value = answers[field.id]
        if (value === undefined || value === null || value === '') return false
        if (Array.isArray(value) && value.length === 0) return false
      }

      return true
    })
  }, [currentGroup, answers])

  // Check for disqualifying answers
  const checkEligibility = useCallback(() => {
    for (const field of questionnaire.eligibilityFields) {
      const value = answers[field.id]

      if (field.isRedFlag && field.options) {
        // Check if any selected option is disqualifying
        const selectedValues = Array.isArray(value) ? value : [value]
        const disqualifyingOption = field.options.find(
          (opt) => opt.isDisqualifying && selectedValues.includes(opt.value)
        )

        if (disqualifyingOption) {
          return {
            eligible: false,
            reason: field.redFlagMessage || 'Based on your answers, this service may not be suitable for you.',
          }
        }
      }
    }

    return { eligible: true, reason: null }
  }, [questionnaire.eligibilityFields, answers])

  // Handle continue
  const handleContinue = () => {
    // If on eligibility group, check eligibility first
    if (currentGroup?.id === 'eligibility') {
      const { eligible, reason } = checkEligibility()
      setEligibility(eligible, reason || undefined)

      if (!eligible) {
        onEligibilityFail?.(reason || 'Not eligible')
        return
      }
    }

    if (isLastGroup) {
      onComplete?.()
      nextStep()
    } else {
      nextGroup()
    }
  }

  // Handle field change
  const handleFieldChange = (fieldId: string, value: unknown) => {
    updateAnswer(fieldId, value)
  }

  // Animation variants
  const groupVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  if (!currentGroup) return null

  return (
    <FlowContent
      title={currentGroup.title}
      description={currentGroup.description}
    >
      {/* Red flag warning for eligibility section */}
      {currentGroup.id === 'eligibility' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 mb-1">Important safety check</p>
              <p className="text-amber-700">
                If you're experiencing a medical emergency, please call 000 immediately.
                This service is for non-urgent conditions only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentGroup.id}
          variants={groupVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {currentGroup.fields.map((field) => {
            // Check conditional display
            if (field.showIf && !evaluateCondition(field.showIf, answers)) {
              return null
            }

            return (
              <FieldRenderer
                key={field.id}
                field={field}
                value={answers[field.id]}
                onChange={(value) => handleFieldChange(field.id, value)}
              />
            )
          })}
        </motion.div>
      </AnimatePresence>

      {/* Navigation within questionnaire */}
      <div className="mt-8 flex items-center justify-between gap-4">
        {/* Back button (within questionnaire groups) */}
        {!isFirstGroup && (
          <Button
            variant="ghost"
            onClick={prevGroup}
            className="text-slate-600"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        )}
        {isFirstGroup && <div />}

        {/* Progress indicator */}
        <div className="flex items-center gap-1.5">
          {allGroups.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                idx === currentGroupIndex
                  ? 'bg-emerald-500'
                  : idx < currentGroupIndex
                  ? 'bg-emerald-300'
                  : 'bg-slate-200'
              )}
            />
          ))}
        </div>

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          disabled={!isGroupComplete()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isLastGroup ? 'Continue' : 'Next'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </FlowContent>
  )
}

// Helper to evaluate conditional logic
function evaluateCondition(
  condition: { fieldId: string; operator: string; value: unknown },
  answers: Record<string, unknown>
): boolean {
  const fieldValue = answers[condition.fieldId]

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value
    case 'not_equals':
      return fieldValue !== condition.value
    case 'contains':
      return Array.isArray(fieldValue) && fieldValue.includes(condition.value)
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > (condition.value as number)
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < (condition.value as number)
    case 'includes':
      return typeof fieldValue === 'string' && fieldValue.includes(condition.value as string)
    default:
      return true
  }
}
