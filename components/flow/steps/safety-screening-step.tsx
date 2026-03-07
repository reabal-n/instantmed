'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Phone, Heart, Shield, ArrowRight } from 'lucide-react'
import { FlowContent } from '../flow-content'
import { IOSToggle } from '@/components/ui/ios-toggle'
import { useFlowStore, useFlowAnswers, SAFETY_SCREENING_SYMPTOMS } from '@/lib/flow'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { fetchSafetySymptoms } from '@/app/actions/safety-symptoms'

interface SafetyScreeningStepProps {
  /** Optional pre-loaded symptoms from server component */
  symptoms?: string[]
}

/**
 * Step 2: Safety Screening
 * Hard gate with iOS-style toggle confirmation
 * Per refined intake spec - user must confirm they are NOT experiencing emergency symptoms
 * 
 * Symptoms can be dynamically updated via feature flags without code deploy.
 * Falls back to static SAFETY_SCREENING_SYMPTOMS if feature flags unavailable.
 */
export function SafetyScreeningStep({ symptoms: initialSymptoms }: SafetyScreeningStepProps) {
  const [symptoms, setSymptoms] = useState<string[]>(initialSymptoms || SAFETY_SCREENING_SYMPTOMS)
  const answers = useFlowAnswers()
  const { updateAnswer, nextStep } = useFlowStore()
  
  const safetyConfirmed = answers.safety_confirmed === true
  const [showEmergencyResources, setShowEmergencyResources] = useState(false)

  // Load dynamic symptoms from feature flags if not pre-loaded
  useEffect(() => {
    if (!initialSymptoms) {
      fetchSafetySymptoms()
        .then(setSymptoms)
        .catch(() => {/* Keep static fallback on error */})
    }
  }, [initialSymptoms])

  const handleToggle = (checked: boolean) => {
    updateAnswer('safety_confirmed', checked)
  }

  const handleContinue = () => {
    if (safetyConfirmed) {
      nextStep()
    }
  }

  const handleEmergencyClick = () => {
    setShowEmergencyResources(true)
  }

  return (
    <FlowContent
      title="Safety check"
      description="Before we continue, we need to make sure this service is right for you."
    >
      <div className="space-y-6">
        {/* Emergency symptoms list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-white/50 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl p-5"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Please confirm you are NOT currently experiencing:
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                These symptoms require emergency care
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 ml-1">
            {symptoms.map((symptom: string, index: number) => (
              <motion.li
                key={symptom}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2.5 text-sm text-slate-700"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {symptom}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Safety confirmation toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'rounded-xl border-2 p-5 transition-all duration-200',
            safetyConfirmed
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-white/50 dark:border-white/10 bg-white/80 dark:bg-white/5'
          )}
        >
          <IOSToggle
            checked={safetyConfirmed}
            onChange={handleToggle}
            label="I confirm none of these apply to me"
            description="I understand this is a non-urgent telehealth service"
            size="lg"
          />

          <AnimatePresence>
            {safetyConfirmed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-emerald-200 text-emerald-700">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Ready to continue</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Emergency help link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={handleEmergencyClick}
          className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2 transition-colors"
        >
          Need emergency help? <span className="underline">View resources</span>
        </motion.button>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="pt-2"
        >
          <Button
            onClick={handleContinue}
            disabled={!safetyConfirmed}
            className={cn(
              'w-full h-13 text-base font-semibold rounded-xl transition-all duration-200',
              safetyConfirmed
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            )}
          >
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>

      {/* Emergency resources modal */}
      <AnimatePresence>
        {showEmergencyResources && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowEmergencyResources(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white/95 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">
                    Emergency Resources
                  </h3>
                  <p className="text-sm text-slate-500">
                    If you&apos;re experiencing a medical emergency
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <a
                  href="tel:000"
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-colors"
                >
                  <Phone className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">Call 000</p>
                    <p className="text-sm text-red-700">Emergency services</p>
                  </div>
                </a>

                <a
                  href="tel:131114"
                  className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Heart className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">Lifeline: 13 11 14</p>
                    <p className="text-sm text-blue-700">24/7 crisis support</p>
                  </div>
                </a>

                <a
                  href="tel:1800022222"
                  className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">Healthdirect: 1800 022 222</p>
                    <p className="text-sm text-blue-700">Health advice line</p>
                  </div>
                </a>
              </div>

              <Button
                onClick={() => setShowEmergencyResources(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FlowContent>
  )
}
