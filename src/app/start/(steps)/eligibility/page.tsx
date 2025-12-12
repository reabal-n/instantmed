'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingStore, useOnboardingProgress } from '@/lib/onboarding/store'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { StepContainer } from '@/components/onboarding/step-container'
import { QuestionField } from '@/components/onboarding/question-field'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { getQuestionnaire, getEligibilityRules } from '@/lib/onboarding/questionnaires'
import { AlertTriangle, XCircle } from 'lucide-react'

export default function EligibilityPage() {
  const router = useRouter()
  const { currentStep, completedSteps } = useOnboardingProgress()
  const {
    serviceSlug,
    eligibilityAnswers,
    setEligibilityAnswers,
    setEligibilityResult,
    nextStep,
    prevStep,
    setStep,
  } = useOnboardingStore()

  const [answers, setAnswers] = useState<Record<string, unknown>>(eligibilityAnswers)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failureReason, setFailureReason] = useState<string | null>(null)
  const [isEmergency, setIsEmergency] = useState(false)

  // Get questionnaire for selected service
  const questionnaire = useMemo(() => {
    if (!serviceSlug) return null
    return getQuestionnaire(serviceSlug)
  }, [serviceSlug])

  const eligibilityRules = useMemo(() => {
    if (!serviceSlug) return []
    return getEligibilityRules(serviceSlug)
  }, [serviceSlug])

  // Ensure correct step and service is selected
  useEffect(() => {
    if (!serviceSlug) {
      router.push('/start')
      return
    }
    if (currentStep !== 'eligibility') {
      setStep('eligibility')
    }
  }, [serviceSlug, currentStep, setStep, router])

  // Check for emergency symptoms
  useEffect(() => {
    const emergencySymptoms = answers.emergency_symptoms as string[] | undefined
    if (emergencySymptoms && emergencySymptoms.length > 0) {
      const hasEmergency = emergencySymptoms.some(
        (s) => s !== 'none'
      )
      setIsEmergency(hasEmergency)
    } else {
      setIsEmergency(false)
    }
  }, [answers.emergency_symptoms])

  const handleAnswerChange = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    setErrors((prev) => ({ ...prev, [questionId]: '' }))
    setFailureReason(null)
  }

  const validateAndCheckEligibility = (): { isValid: boolean; isEligible: boolean; reason?: string } => {
    const newErrors: Record<string, string> = {}
    let isEligible = true
    let failReason: string | undefined

    if (!questionnaire) {
      return { isValid: false, isEligible: false, reason: 'Questionnaire not found' }
    }

    // Check emergency first
    if (isEmergency) {
      return {
        isValid: true,
        isEligible: false,
        reason: 'Please call 000 immediately or go to your nearest emergency department.',
      }
    }

    // Validate required questions
    for (const question of questionnaire.eligibilityQuestions) {
      const answer = answers[question.id]
      
      if (question.required) {
        if (answer === undefined || answer === null || answer === '') {
          newErrors[question.id] = 'This question is required'
        } else if (Array.isArray(answer) && answer.length === 0) {
          newErrors[question.id] = 'Please select at least one option'
        }
      }

      // Check for disqualifying options
      if (question.options) {
        const selectedValues = Array.isArray(answer) ? answer : [answer]
        for (const optValue of selectedValues) {
          const option = question.options.find((o) => o.value === optValue)
          if (option?.isDisqualifying) {
            isEligible = false
            failReason = question.whyWeAsk || 'Based on your answers, this service may not be suitable for you.'
          }
        }
      }

      // Check red flag values
      if (question.redFlagValues && question.redFlagValues.includes(answer)) {
        isEligible = false
        failReason = question.whyWeAsk || 'Based on your answers, we need to refer you to a different service.'
      }
    }

    // Check eligibility rules
    for (const rule of eligibilityRules) {
      const answer = answers[rule.questionId]
      let ruleViolated = false

      switch (rule.operator) {
        case 'equals':
          ruleViolated = answer === rule.value
          break
        case 'not_equals':
          ruleViolated = answer !== rule.value
          break
        case 'contains':
          ruleViolated = Array.isArray(answer) && answer.includes(rule.value)
          break
      }

      if (ruleViolated && rule.isHardStop) {
        isEligible = false
        failReason = rule.failMessage
      }
    }

    setErrors(newErrors)
    return {
      isValid: Object.keys(newErrors).length === 0,
      isEligible,
      reason: failReason,
    }
  }

  const handleContinue = () => {
    const { isValid, isEligible, reason } = validateAndCheckEligibility()

    if (!isValid) return

    setEligibilityAnswers(answers)

    if (!isEligible) {
      setFailureReason(reason || 'You may not be eligible for this service.')
      setEligibilityResult(false, reason)
      return
    }

    setEligibilityResult(true)
    nextStep()
    router.push('/start/questions')
  }

  const handleBack = () => {
    prevStep()
    router.push('/start')
  }

  if (!questionnaire) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
        className="mb-8"
      />

      <StepContainer
        title="Let's check your eligibility"
        description="We need to ask a few quick questions to make sure this service is right for you."
        onNext={handleContinue}
        onBack={handleBack}
        nextLabel="Continue"
        nextDisabled={isEmergency}
      >
        {/* Emergency Alert */}
        {isEmergency && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-5 w-5" />
            <AlertTitle>Emergency - Call 000</AlertTitle>
            <AlertDescription>
              Based on your symptoms, you may need immediate medical attention. 
              Please call 000 or go to your nearest emergency department immediately.
            </AlertDescription>
          </Alert>
        )}

        {/* Eligibility Failure Alert */}
        {failureReason && !isEmergency && (
          <Alert variant="warning" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Service may not be suitable</AlertTitle>
            <AlertDescription>
              {failureReason}
              <br />
              <button 
                onClick={handleBack}
                className="mt-2 text-sm font-medium underline"
              >
                Choose a different service
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Questions */}
        <div className="space-y-8">
          {questionnaire.eligibilityQuestions.map((question) => (
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
