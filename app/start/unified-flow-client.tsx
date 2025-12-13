'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

import {
  FlowShell,
  FlowContent,
  ServiceStep,
  UnifiedQuestionsStep,
  DetailsStep,
  ResumePrompt,
} from '@/components/flow'
import { Button } from '@/components/ui/button'
import {
  useFlowStore,
  useFlowStep,
  useFlowService,
  getFlowConfig,
  medCertConfig,
  getFlowSession,
  useDraftPersistence,
  useDraftResume,
  claimDraft as claimDraftAuth,
} from '@/lib/flow'
import type { FlowConfig, FlowStepId } from '@/lib/flow'

function StartFlowContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentStepId = useFlowStep()
  const serviceSlug = useFlowService()
  const { setServiceSlug, goToStep, nextStep, reset, restoreFromDraft } = useFlowStore()
  const draftId = useFlowStore((s) => s.draftId)
  const sessionId = useFlowStore((s) => s.sessionId)

  // Get config based on service (default to medCert for now)
  const [config, setConfig] = useState<FlowConfig>(medCertConfig)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showResumePrompt, setShowResumePrompt] = useState(false)

  // Draft persistence
  useDraftPersistence({
    warnOnUnload: true,
  })

  // Draft resume detection
  const { 
    hasDrafts, 
    drafts, 
    isLoading: isLoadingDrafts,
    resumeDraft,
    deleteDraft,
    startFresh,
  } = useDraftResume({
    checkOnMount: true,
  })

  // Check auth on mount and claim draft if needed
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getFlowSession()
      setIsCheckingAuth(false)

      // If user just signed in, claim any anonymous draft
      if (session.isAuthenticated && session.userId && draftId) {
        try {
          await claimDraftAuth(draftId, session.userId)
        } catch (error) {
          console.error('Failed to claim draft:', error)
        }
      }
    }

    checkAuth()
  }, [draftId])

  // Show resume prompt if there are drafts and no service selected
  useEffect(() => {
    const skipResume = searchParams.get('fresh') === 'true'
    
    if (!skipResume && hasDrafts && !serviceSlug && !isLoadingDrafts) {
      setShowResumePrompt(true)
    }
  }, [hasDrafts, serviceSlug, isLoadingDrafts, searchParams])

  // Handle URL params on mount
  useEffect(() => {
    const serviceParam = searchParams.get('service')
    const stepParam = searchParams.get('step')
    const draftParam = searchParams.get('draft')

    // Resume specific draft if provided
    if (draftParam) {
      resumeDraft(draftParam).catch(console.error)
      return
    }

    // Set service from URL if provided
    if (serviceParam && !serviceSlug) {
      const serviceConfig = getFlowConfig(serviceParam)
      if (serviceConfig) {
        setServiceSlug(serviceParam)
        setConfig(serviceConfig)
        // Skip service selection if service is pre-selected
        goToStep('questions')
        setShowResumePrompt(false)
      }
    }

    // Resume at step if specified
    if (stepParam) {
      const validSteps: FlowStepId[] = ['service', 'questions', 'details', 'checkout']
      if (validSteps.includes(stepParam as FlowStepId)) {
        goToStep(stepParam as FlowStepId)
      }
    }
  }, [searchParams, serviceSlug, setServiceSlug, goToStep, resumeDraft])

  // Update config when service changes
  useEffect(() => {
    if (serviceSlug) {
      const newConfig = getFlowConfig(serviceSlug)
      if (newConfig) {
        setConfig(newConfig)
      }
    }
  }, [serviceSlug])

  // Handle resume draft
  const handleResumeDraft = useCallback(async (id: string) => {
    try {
      await resumeDraft(id)
      setShowResumePrompt(false)
      
      // Update config based on resumed service
      const state = useFlowStore.getState()
      if (state.serviceSlug) {
        const newConfig = getFlowConfig(state.serviceSlug)
        if (newConfig) {
          setConfig(newConfig)
        }
      }
    } catch (error) {
      console.error('Failed to resume draft:', error)
    }
  }, [resumeDraft])

  // Handle start fresh
  const handleStartFresh = useCallback(() => {
    startFresh()
    setShowResumePrompt(false)
  }, [startFresh])

  // Handle delete draft
  const handleDeleteDraft = useCallback(async (id: string) => {
    await deleteDraft(id)
    
    // If no more drafts, hide the prompt
    if (drafts.length <= 1) {
      setShowResumePrompt(false)
    }
  }, [deleteDraft, drafts.length])

  // Handle service selection
  const handleServiceSelect = (slug: string) => {
    const newConfig = getFlowConfig(slug)
    if (newConfig) {
      setConfig(newConfig)
    }
  }

  // Handle eligibility failure (from questionnaire)
  const [showEligibilityFail, setShowEligibilityFail] = useState(false)
  const [eligibilityReason, setEligibilityReason] = useState('')

  const handleEligibilityFail = (reason: string) => {
    setEligibilityReason(reason)
    setShowEligibilityFail(true)
  }

  // Handle flow completion (move to checkout)
  const handleFlowComplete = async () => {
    // Redirect to checkout page
    router.push(`/checkout?service=${serviceSlug}`)
  }

  // Handle exit
  const handleExit = () => {
    router.push('/')
  }

  // Show loading while checking auth or drafts
  if (isCheckingAuth || isLoadingDrafts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  // Show resume prompt if applicable
  if (showResumePrompt && drafts.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
        {/* Noise texture overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.015] z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="w-full max-w-md relative z-10">
          <ResumePrompt
            drafts={drafts}
            onResume={handleResumeDraft}
            onStartFresh={handleStartFresh}
            onDelete={handleDeleteDraft}
            isLoading={isLoadingDrafts}
          />
        </div>
      </div>
    )
  }

  // Render eligibility fail screen
  if (showEligibilityFail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            This service may not be right for you
          </h1>

          <p className="text-slate-600 mb-6">
            {eligibilityReason || 'Based on your answers, we recommend you seek care in person.'}
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>If this is an emergency:</strong> Call 000 immediately or go to your nearest emergency department.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setShowEligibilityFail(false)
                reset()
                goToStep('service')
              }}
              variant="outline"
              className="w-full"
            >
              Try a different service
            </Button>

            <Button onClick={handleExit} className="w-full">
              Return home
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Render current step (simplified 3-step flow)
  const renderStep = () => {
    switch (currentStepId) {
      case 'service':
        return <ServiceStep onServiceSelect={handleServiceSelect} />

      case 'questions':
        return (
          <UnifiedQuestionsStep
            config={config}
            onEligibilityFail={handleEligibilityFail}
          />
        )

      case 'details':
        return <DetailsStep config={config} />

      case 'checkout':
        // This should redirect to /checkout
        handleFlowComplete()
        return (
          <FlowContent title="Redirecting..." description="">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
            </div>
          </FlowContent>
        )

      default:
        return <ServiceStep onServiceSelect={handleServiceSelect} />
    }
  }

  return (
    <FlowShell
      config={config}
      onComplete={handleFlowComplete}
      onExit={handleExit}
      showCTA={false} // Each step handles its own CTA
    >
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </FlowShell>
  )
}

// Loading fallback
function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
    </div>
  )
}

export function UnifiedFlowClient() {
  return (
    <Suspense fallback={<LoadingState />}>
      <StartFlowContent />
    </Suspense>
  )
}
