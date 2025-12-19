'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingStore, useOnboardingProgress } from '@/lib/onboarding/store'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { StepContainer } from '@/components/onboarding/step-container'
import { QuestionField } from '@/components/onboarding/question-field'
import { getQuestionnaire } from '@/lib/onboarding/questionnaires'
import type { QuestionConfig } from '@/lib/onboarding/types'

export default function QuestionsPage() {
  const router = useRouter()
  const { currentStep, completedSteps } = useOnboardingProgress()
  const {
    serviceSlug,
    isEligible,
    questionnaireAnswers,
    setQuestionnaireAnswers,
    nextStep,
    prevStep,
    setStep,
  } = useOnboardingStore()

  const [answers, setAnswers] = useState<Record<string, unknown>>(questionnaireAnswers)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)

  // Get questionnaire
  const questionnaire = useMemo(() => {
    if (!serviceSlug) return null
    return getQuestionnaire(serviceSlug)
  }, [serviceSlug])

  // Ensure correct step and eligibility
  useEffect(() => {
    if (!serviceSlug) {
      router.push('/start')
      return
    }
    if (isEligible === false) {
      router.push('/start/eligibility')
      return
    }
    if (currentStep !== 'questions') {
      setStep('questions')
    }
  }, [serviceSlug, isEligible, currentStep, setStep, router])

  const currentGroup = questionnaire?.questionGroups[currentGroupIndex]
  const isLastGroup = questionnaire 
    ? currentGroupIndex === questionnaire.questionGroups.length - 1 
    : false

  // Filter visible questions based on showIf conditions
  const visibleQuestions = useMemo(() => {
    if (!currentGroup) return []
    
    return currentGroup.questions.filter((question) => {
      if (!question.showIf) return true
      
      const dependentValue = answers[question.showIf.questionId]
      const { operator, value } = question.showIf
      
      switch (operator) {
        case 'equals':
          return dependentValue === value
        case 'not_equals':
          return dependentValue !== value
        case 'contains':
          return Array.isArray(dependentValue) && dependentValue.includes(value)
        default:
          return true
      }
    })
  }, [currentGroup, answers])

  const handleAnswerChange = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setErrors((prev) => ({ ...prev, [questionId]: '' }))
  }

  const validateCurrentGroup = (): boolean => {
    const newErrors: Record<string, string> = {}

    for (const question of visibleQuestions) {
      const answer = answers[question.id]
      
      if (question.required) {
        if (answer === undefined || answer === null || answer === '') {
          newErrors[question.id] = 'This question is required'
        } else if (Array.isArray(answer) && answer.length === 0) {
          newErrors[question.id] = 'Please select at least one option'
        }
      }

      // Min/max validation for numbers
      if (question.type === 'number' && answer !== null && answer !== undefined) {
        const numValue = Number(answer)
        if (question.min !== undefined && numValue < question.min) {
          newErrors[question.id] = `Value must be at least ${question.min}`
        }
        if (question.max !== undefined && numValue > question.max) {
          newErrors[question.id] = `Value must be at most ${question.max}`
        }
      }

      // Min length validation for text
      if ((question.type === 'text' || question.type === 'textarea') && answer) {
        const strValue = String(answer)
        if (question.minLength && strValue.length < question.minLength) {
          newErrors[question.id] = `Please provide at least ${question.minLength} characters`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (!validateCurrentGroup()) return

    // Save answers
    setQuestionnaireAnswers(answers)

    if (isLastGroup) {
      // Move to next major step
      nextStep()
      router.push('/start/identity')
    } else {
      // Move to next question group
      setCurrentGroupIndex((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      prevStep()
      router.push('/start/eligibility')
    }
  }

  if (!questionnaire || !currentGroup) {
    return null
  }

  const totalGroups = questionnaire.questionGroups.length
  const groupProgress = `${currentGroupIndex + 1} of ${totalGroups}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
        className="mb-8"
      />

      <StepContainer
        title={currentGroup.title}
        description={currentGroup.description || `Section ${groupProgress}`}
        onNext={handleContinue}
        onBack={handleBack}
        nextLabel={isLastGroup ? 'Continue' : 'Next'}
      >
        {/* Group progress indicator */}
        {totalGroups > 1 && (
          <div className="flex items-center gap-2 mb-6">
            {questionnaire.questionGroups.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentGroupIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-8">
          {visibleQuestions.map((question) => (
            <QuestionField
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={(value) => handleAnswerChange(question.id, value)}
              error={errors[question.id]}
            />
          ))}
        </div>
      </StepContainer>
    </div>
  )
}
