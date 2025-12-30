'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  AlertCircle,
  Phone,
  ArrowRight,
  Loader2,
  FileText,
  Clock,
  Shield,
  ExternalLink,
} from 'lucide-react'
import { FlowContent } from '../flow-content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFlowStore, useFlowAnswers, useFlowService } from '@/lib/flow'
import {
  evaluateSafety,
  evaluateSafetyWithAdditionalInfo,
  type SafetyEvaluationResult,
  type SafetyOutcome,
} from '@/lib/flow/safety'
import { cn } from '@/lib/utils'

// ============================================
// OUTCOME ICONS & COLORS
// ============================================

const outcomeConfig: Record<
  SafetyOutcome,
  {
    icon: typeof CheckCircle2
    bgColor: string
    iconColor: string
    borderColor: string
  }
> = {
  ALLOW: {
    icon: CheckCircle2,
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
  },
  REQUEST_MORE_INFO: {
    icon: FileText,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
  },
  REQUIRES_CALL: {
    icon: Phone,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  DECLINE: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
  },
}

// ============================================
// MAIN COMPONENT
// ============================================

interface SafetyCheckStepProps {
  onContinue?: () => void
  onDecline?: (reason: string) => void
  onRequestCall?: () => void
}

export function SafetyCheckStep({
  onContinue,
  onDecline,
  onRequestCall,
}: SafetyCheckStepProps) {
  const serviceSlug = useFlowService()
  const answers = useFlowAnswers()
  const { updateAnswer, nextStep, setEligibility } = useFlowStore()

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(true)
  const [result, setResult] = useState<SafetyEvaluationResult | null>(null)
  const [additionalInfo, setAdditionalInfo] = useState<Record<string, string>>({})
  const [isReEvaluating, setIsReEvaluating] = useState(false)
  const [callRequested, setCallRequested] = useState(false)

  // Run evaluation on mount
  useEffect(() => {
    if (!serviceSlug) return

    // Simulate brief evaluation delay for UX
    const timer = setTimeout(() => {
      const evaluationResult = evaluateSafety(serviceSlug, answers)
      setResult(evaluationResult)
      setIsEvaluating(false)

      // Update store with eligibility
      setEligibility(
        evaluationResult.outcome === 'ALLOW',
        evaluationResult.outcome !== 'ALLOW'
          ? evaluationResult.patientMessage
          : undefined
      )

      // Log to store for persistence
      updateAnswer('_safetyEvaluation', {
        outcome: evaluationResult.outcome,
        riskTier: evaluationResult.riskTier,
        triggeredRules: evaluationResult.triggeredRules.map((r) => r.ruleId),
        evaluatedAt: evaluationResult.evaluatedAt,
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [serviceSlug, answers, setEligibility, updateAnswer])

  // Handle additional info submission
  const handleSubmitAdditionalInfo = () => {
    if (!serviceSlug) return

    setIsReEvaluating(true)

    setTimeout(() => {
      const newResult = evaluateSafetyWithAdditionalInfo(
        serviceSlug,
        answers,
        additionalInfo
      )
      setResult(newResult)
      setIsReEvaluating(false)

      // Update store
      setEligibility(
        newResult.outcome === 'ALLOW',
        newResult.outcome !== 'ALLOW' ? newResult.patientMessage : undefined
      )

      // Store additional info
      updateAnswer('_additionalInfo', additionalInfo)
      updateAnswer('_safetyEvaluation', {
        outcome: newResult.outcome,
        riskTier: newResult.riskTier,
        triggeredRules: newResult.triggeredRules.map((r) => r.ruleId),
        evaluatedAt: newResult.evaluatedAt,
        additionalInfoProvided: true,
      })
    }, 500)
  }

  // Handle continue
  const handleContinue = () => {
    if (result?.outcome === 'ALLOW') {
      onContinue?.()
      nextStep()
    }
  }

  // Handle decline
  const handleDecline = () => {
    onDecline?.(result?.patientMessage || 'Not eligible')
  }

  // Handle request call
  const handleRequestCall = () => {
    setCallRequested(true)
    updateAnswer('_callRequested', {
      requestedAt: new Date().toISOString(),
      reason: result?.patientMessage,
    })
    onRequestCall?.()
  }

  // Check if additional info is complete
  const isAdditionalInfoComplete = useMemo(() => {
    if (!result?.additionalInfoRequired) return true
    return result.additionalInfoRequired
      .filter((item) => item.required)
      .every((item) => additionalInfo[item.id]?.trim())
  }, [result, additionalInfo])

  // Loading state
  if (isEvaluating) {
    return (
      <FlowContent title="Checking your information" description="">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Shield className="w-8 h-8 text-emerald-600 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
          </div>
          <p className="mt-6 text-slate-600">Reviewing your responses...</p>
          <p className="text-sm text-slate-400 mt-1">This only takes a moment</p>
        </div>
      </FlowContent>
    )
  }

  if (!result) return null

  const config = outcomeConfig[result.outcome]
  const Icon = config.icon

  // ============================================
  // ALLOW OUTCOME
  // ============================================
  if (result.outcome === 'ALLOW') {
    return (
      <FlowContent title="" description="">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div
            className={cn(
              'w-20 h-20 rounded-full mx-auto flex items-center justify-center',
              config.bgColor
            )}
          >
            <Icon className={cn('w-10 h-10', config.iconColor)} />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mt-6">
            {result.patientTitle}
          </h2>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">
            {result.patientMessage}
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Shield className="w-4 h-4" />
              <span>Your information has been reviewed</span>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full max-w-sm mx-auto h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              Continue to payment
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </FlowContent>
    )
  }

  // ============================================
  // REQUEST_MORE_INFO OUTCOME
  // ============================================
  if (result.outcome === 'REQUEST_MORE_INFO') {
    return (
      <FlowContent title="" description="">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div
              className={cn(
                'w-16 h-16 rounded-full mx-auto flex items-center justify-center',
                config.bgColor
              )}
            >
              <Icon className={cn('w-8 h-8', config.iconColor)} />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mt-4">
              {result.patientTitle}
            </h2>
            <p className="text-slate-600 mt-2">{result.patientMessage}</p>
          </div>

          {/* Additional info form */}
          <div
            className={cn(
              'p-5 rounded-xl border-2',
              config.bgColor,
              config.borderColor
            )}
          >
            <div className="space-y-4">
              {result.additionalInfoRequired.map((item) => (
                <div key={item.id}>
                  <Label className="text-sm font-medium text-slate-700">
                    {item.label}
                    {item.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.description}
                    </p>
                  )}

                  {item.type === 'textarea' ? (
                    <textarea
                      value={additionalInfo[item.id] || ''}
                      onChange={(e) =>
                        setAdditionalInfo((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="mt-1.5 w-full min-h-20 p-3 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-0 resize-none text-sm"
                      placeholder="Type your response..."
                    />
                  ) : item.type === 'select' && item.options ? (
                    <select
                      value={additionalInfo[item.id] || ''}
                      onChange={(e) =>
                        setAdditionalInfo((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="mt-1.5 w-full h-11 px-3 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-0 text-sm"
                    >
                      <option value="">Select an option</option>
                      {item.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={additionalInfo[item.id] || ''}
                      onChange={(e) =>
                        setAdditionalInfo((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="mt-1.5 h-11"
                      placeholder="Type your response..."
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmitAdditionalInfo}
            disabled={!isAdditionalInfoComplete || isReEvaluating}
            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
          >
            {isReEvaluating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                Submit and continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </motion.div>
      </FlowContent>
    )
  }

  // ============================================
  // REQUIRES_CALL OUTCOME
  // ============================================
  if (result.outcome === 'REQUIRES_CALL') {
    if (callRequested) {
      return (
        <FlowContent title="" description="">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mt-6">
              We&apos;ll be in touch soon
            </h2>
            <p className="text-slate-600 mt-2 max-w-md mx-auto">
              A member of our team will call you within 2 business hours to
              complete your consultation.
            </p>

            <div className="mt-8 p-4 rounded-xl bg-blue-50 border border-blue-200 max-w-sm mx-auto">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">What happens next?</p>
                  <p className="text-sm text-slate-600">
                    Our doctor will review your case and call you to discuss
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500 mt-6">
              You won&apos;t be charged until after your consultation
            </p>
          </motion.div>
        </FlowContent>
      )
    }

    return (
      <FlowContent title="" description="">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div
              className={cn(
                'w-16 h-16 rounded-full mx-auto flex items-center justify-center',
                config.bgColor
              )}
            >
              <Icon className={cn('w-8 h-8', config.iconColor)} />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mt-4">
              {result.patientTitle}
            </h2>
            <p className="text-slate-600 mt-2 max-w-md mx-auto">
              {result.patientMessage}
            </p>
          </div>

          <div
            className={cn(
              'p-5 rounded-xl border-2',
              config.bgColor,
              config.borderColor
            )}
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">
                    Phone consultation required
                  </p>
                  <p className="text-sm text-slate-600">
                    A doctor will call you to discuss your request in more detail.
                    This usually takes 5-10 minutes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">
                    Typical wait time: 1-2 hours
                  </p>
                  <p className="text-sm text-slate-600">
                    During business hours (8am-8pm AEST)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">No upfront charge</p>
                  <p className="text-sm text-slate-600">
                    You&apos;ll only pay if the doctor can help you
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRequestCall}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Phone className="w-5 h-5 mr-2" />
              Request a callback
            </Button>

            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="w-full text-slate-500"
            >
              Go back and edit my answers
            </Button>
          </div>
        </motion.div>
      </FlowContent>
    )
  }

  // ============================================
  // DECLINE OUTCOME
  // ============================================
  return (
    <FlowContent title="" description="">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center">
          <div
            className={cn(
              'w-16 h-16 rounded-full mx-auto flex items-center justify-center',
              config.bgColor
            )}
          >
            <Icon className={cn('w-8 h-8', config.iconColor)} />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mt-4">
            {result.patientTitle}
          </h2>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">
            {result.patientMessage}
          </p>
        </div>

        {/* Emergency notice if critical */}
        {result.riskTier === 'critical' && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">
                  If this is an emergency
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Call <strong>000</strong> immediately or go to your nearest
                  emergency department.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alternative options */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="font-medium text-slate-900 mb-3">
            Alternative options for you:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400 mt-0.5" />
              <span className="text-sm text-slate-600">
                Visit your regular GP for in-person assessment
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400 mt-0.5" />
              <span className="text-sm text-slate-600">
                Use the{' '}
                <a
                  href="https://www.healthdirect.gov.au/symptom-checker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Healthdirect Symptom Checker
                  <ExternalLink className="w-3 h-3" />
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400 mt-0.5" />
              <span className="text-sm text-slate-600">
                Call healthdirect 24/7 on{' '}
                <strong className="text-slate-900">1800 022 222</strong>
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full h-12 rounded-xl"
          >
            Go back and edit my answers
          </Button>

          <Button
            variant="ghost"
            onClick={handleDecline}
            className="w-full text-slate-500"
          >
            Return to home
          </Button>
        </div>
      </motion.div>
    </FlowContent>
  )
}
