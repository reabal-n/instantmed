'use client'

import { useState, useCallback, useRef } from 'react'
import { Loader2, ArrowRight, Check, AlertCircle, Cloud, CloudOff } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CTAState = 'disabled' | 'enabled' | 'loading' | 'success' | 'error'

interface FlowCTAProps {
  /** Primary button label */
  label: string
  /** Button disabled state */
  disabled?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Click handler */
  onClick?: () => void | Promise<void>
  /** Button variant */
  variant?: 'primary' | 'secondary'
  /** Additional class names */
  className?: string
  /** Helper text shown below button */
  helperText?: string
  /** Fields remaining count (for intelligent messaging) */
  fieldsRemaining?: number
  /** Is form complete? */
  isComplete?: boolean
  /** Sync status */
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error' | 'pending'
  /** Last saved timestamp */
  lastSavedAt?: string | null
  /** Show save indicator */
  showSaveIndicator?: boolean
}

export function FlowCTA({
  label,
  disabled = false,
  isLoading = false,
  onClick,
  variant = 'primary',
  className,
  helperText,
  fieldsRemaining,
  isComplete = false,
  syncStatus = 'idle',
  lastSavedAt,
  showSaveIndicator = true,
}: FlowCTAProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLockRef = useRef(false)

  // Determine CTA state - consider internal submitting state
  const getState = (): CTAState => {
    if (isLoading || isSubmitting) return 'loading'
    if (disabled || !isComplete) return 'disabled'
    return 'enabled'
  }

  const state = getState()

  // Protected click handler to prevent double-submit
  const handleClick = useCallback(async () => {
    // Prevent double-click with ref lock (synchronous check)
    if (submitLockRef.current || isSubmitting || isLoading || disabled) return
    
    submitLockRef.current = true
    setIsSubmitting(true)
    
    try {
      await onClick?.()
    } finally {
      // Reset after a delay to prevent rapid re-clicks
      setTimeout(() => {
        submitLockRef.current = false
        setIsSubmitting(false)
      }, 500)
    }
  }, [onClick, isSubmitting, isLoading, disabled])

  // Generate intelligent helper text
  const getHelperText = (): string | null => {
    if (helperText) return helperText
    
    if (fieldsRemaining && fieldsRemaining > 0) {
      return `${fieldsRemaining} required field${fieldsRemaining > 1 ? 's' : ''} remaining`
    }
    
    if (state === 'loading') {
      return 'Processing your request...'
    }
    
    if (isComplete) {
      return 'Ready to continue'
    }
    
    return null
  }

  const dynamicHelper = getHelperText()

  // Format saved time
  const formatSavedTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    
    if (diffSecs < 10) return 'Saved just now'
    if (diffSecs < 60) return `Saved ${diffSecs}s ago`
    if (diffSecs < 3600) return `Saved ${Math.floor(diffSecs / 60)}m ago`
    return `Saved at ${date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`
  }

  // Animation variants
  const fadeIn = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, y: 5 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -5 },
      }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-white/40 dark:border-white/10',
        'px-4 py-4 sm:py-5',
        'safe-area-pb', // Support for notch devices
        className
      )}
    >
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Save status indicator */}
        {showSaveIndicator && (
          <AnimatePresence mode="wait">
            <motion.div
              key={syncStatus}
              {...fadeIn}
              className="flex items-center justify-center gap-2 text-xs"
            >
              {syncStatus === 'saving' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                  <span className="text-slate-400">Saving...</span>
                </>
              )}
              {syncStatus === 'saved' && lastSavedAt && (
                <>
                  <Cloud className="h-3 w-3 text-indigo-500" />
                  <span className="text-slate-400">{formatSavedTime(lastSavedAt)}</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <CloudOff className="h-3 w-3 text-dawn-500" />
                  <span className="text-dawn-600">Changes saved locally</span>
                </>
              )}
              {syncStatus === 'pending' && (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-dawn-400 animate-pulse" />
                  <span className="text-slate-400">Unsaved changes</span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Main CTA button */}
        <motion.div
          whileHover={state === 'enabled' && !prefersReducedMotion ? { scale: 1.01 } : {}}
          whileTap={state === 'enabled' && !prefersReducedMotion ? { scale: 0.99 } : {}}
        >
          <Button
            onClick={handleClick}
            disabled={state === 'disabled' || state === 'loading'}
            size="lg"
            className={cn(
              'w-full h-13 sm:h-14 text-base font-semibold rounded-full',
              'transition-all duration-200',
              variant === 'primary' && [
                state === 'enabled' && [
                  'bg-linear-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white',
                  'shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)]',
                  'hover:-translate-y-0.5 active:scale-[0.98]',
                ],
                state === 'disabled' && [
                  'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed',
                  'shadow-none',
                ],
                state === 'loading' && [
                  'bg-linear-to-r from-primary-500 to-primary-600 text-white cursor-wait',
                  'shadow-[0_8px_30px_rgb(59,130,246,0.3)]',
                ],
              ],
              variant === 'secondary' && [
                'bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10',
                'hover:bg-white/85 dark:hover:bg-slate-900/80',
                'shadow-[0_4px_16px_rgb(0,0,0,0.04)]',
              ]
            )}
          >
            <AnimatePresence mode="wait">
              {state === 'loading' ? (
                <motion.span
                  key="loading"
                  {...fadeIn}
                  className="flex items-center"
                >
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing...
                </motion.span>
              ) : (
                <motion.span
                  key="default"
                  {...fadeIn}
                  className="flex items-center"
                >
                  {label}
                  <ArrowRight className={cn(
                    'h-5 w-5 ml-2 transition-transform',
                    state === 'enabled' && 'group-hover:translate-x-0.5'
                  )} />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>

        {/* Helper text */}
        <AnimatePresence mode="wait">
          {dynamicHelper && (
            <motion.div
              key={dynamicHelper}
              {...fadeIn}
              className="flex items-center justify-center gap-2"
            >
              {state === 'disabled' && fieldsRemaining && fieldsRemaining > 0 && (
                <AlertCircle className="h-3.5 w-3.5 text-dawn-500" />
              )}
              {isComplete && state !== 'loading' && (
                <Check className="h-3.5 w-3.5 text-indigo-500" />
              )}
              <span className={cn(
                'text-xs',
                state === 'disabled' && fieldsRemaining ? 'text-dawn-600' : 'text-slate-400'
              )}>
                {dynamicHelper}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            256-bit encrypted
          </span>
          <span className="text-slate-300">•</span>
          <span>AHPRA doctors</span>
          <span className="text-slate-300">•</span>
          <span>Usually reviewed within an hour</span>
        </div>
      </div>
    </div>
  )
}

// Simplified CTA for steps that manage their own button
export function InlineFlowCTA({
  label,
  disabled = false,
  isLoading = false,
  onClick,
  className,
}: Pick<FlowCTAProps, 'label' | 'disabled' | 'isLoading' | 'onClick' | 'className'>) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <motion.div
      whileHover={!disabled && !isLoading && !prefersReducedMotion ? { scale: 1.01 } : {}}
      whileTap={!disabled && !isLoading && !prefersReducedMotion ? { scale: 0.99 } : {}}
      className={className}
    >
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        size="lg"
        className={cn(
          'w-full h-13 sm:h-14 text-base font-semibold rounded-full',
          'transition-all duration-200',
          !disabled && [
            'bg-linear-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white',
            'shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)]',
            'hover:-translate-y-0.5 active:scale-[0.98]',
          ],
          disabled && [
            'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none',
          ]
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            {label}
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        )}
      </Button>
    </motion.div>
  )
}
