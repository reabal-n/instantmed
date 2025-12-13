'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  Lock,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { FlowContent } from '../flow-content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFlowStore, useFlowIdentity } from '@/lib/flow'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

type AuthMode = 'email_input' | 'otp_verify' | 'checking' | 'authenticated'

// ============================================
// OTP INPUT COMPONENT
// ============================================

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function OTPInput({ length = 6, value, onChange, disabled }: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, char: string) => {
    if (!/^[0-9]?$/.test(char)) return

    const newValue = value.split('')
    newValue[index] = char
    const result = newValue.join('').slice(0, length)
    onChange(result)

    // Auto-focus next input
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            'w-12 h-14 text-center text-xl font-semibold rounded-xl border-2',
            'focus:outline-none focus:ring-0 transition-colors',
            value[i]
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 hover:border-slate-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

interface AuthStepProps {
  onAuthenticated?: () => void
  onSkip?: () => void
  allowSkip?: boolean
}

export function AuthStep({
  onAuthenticated,
  onSkip,
  allowSkip = false,
}: AuthStepProps) {
  const supabase = createClient()
  const identityData = useFlowIdentity()
  const { updateAnswer, nextStep, setIdentityData } = useFlowStore()

  // State
  const [mode, setMode] = useState<AuthMode>('checking')
  const [email, setEmail] = useState(identityData?.email || '')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // User is already authenticated
          setMode('authenticated')
          
          // Update identity data with user email
          if (identityData) {
            setIdentityData({
              ...identityData,
              email: user.email || identityData.email,
            })
          }

          // Store auth status
          updateAnswer('_authenticated', {
            userId: user.id,
            email: user.email,
            authenticatedAt: new Date().toISOString(),
          })

          // Auto-continue after brief delay
          setTimeout(() => {
            onAuthenticated?.()
            nextStep()
          }, 1500)
        } else {
          // Pre-fill email from identity data if available
          if (identityData?.email) {
            setEmail(identityData.email)
          }
          setMode('email_input')
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setMode('email_input')
      }
    }

    checkSession()
  }, [supabase, identityData, setIdentityData, updateAnswer, onAuthenticated, nextStep])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Send magic link / OTP
  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        },
      })

      if (error) throw error

      toast.success('Check your email for a verification code')
      setMode('otp_verify')
      setCountdown(60)
    } catch (err) {
      console.error('Error sending OTP:', err)
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      })

      if (error) throw error

      if (data.user) {
        toast.success('Email verified!')
        setMode('authenticated')

        // Update identity data
        if (identityData) {
          setIdentityData({
            ...identityData,
            email,
          })
        }

        // Store auth status
        updateAnswer('_authenticated', {
          userId: data.user.id,
          email: data.user.email,
          authenticatedAt: new Date().toISOString(),
        })

        // Continue after brief delay
        setTimeout(() => {
          onAuthenticated?.()
          nextStep()
        }, 1500)
      }
    } catch (err) {
      console.error('Error verifying OTP:', err)
      setError(err instanceof Error ? err.message : 'Invalid verification code')
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP
  const handleResend = async () => {
    if (countdown > 0) return
    await handleSendOTP()
  }

  // Handle skip (guest mode)
  const handleSkip = () => {
    updateAnswer('_authenticated', {
      userId: null,
      email: email || null,
      isGuest: true,
      skippedAt: new Date().toISOString(),
    })
    onSkip?.()
    nextStep()
  }

  // ============================================
  // CHECKING STATE
  // ============================================
  if (mode === 'checking') {
    return (
      <FlowContent title="Account" description="">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="mt-4 text-slate-600">Checking your session...</p>
        </div>
      </FlowContent>
    )
  }

  // ============================================
  // AUTHENTICATED STATE
  // ============================================
  if (mode === 'authenticated') {
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
            You're signed in
          </h2>
          <p className="text-slate-600 mt-2">
            Continuing to payment...
          </p>

          <div className="mt-6">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin mx-auto" />
          </div>
        </motion.div>
      </FlowContent>
    )
  }

  // ============================================
  // OTP VERIFICATION STATE
  // ============================================
  if (mode === 'otp_verify') {
    return (
      <FlowContent title="Check your email" description="">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>

            <p className="mt-4 text-slate-600">
              We sent a verification code to
            </p>
            <p className="font-medium text-slate-900">{email}</p>
          </div>

          <div className="space-y-2">
            <OTPInput
              value={otp}
              onChange={setOtp}
              disabled={isLoading}
            />

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </div>

          <Button
            onClick={handleVerifyOTP}
            disabled={otp.length !== 6 || isLoading}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify code
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => {
                setMode('email_input')
                setOtp('')
                setError('')
              }}
              className="text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Change email
            </button>

            <button
              onClick={handleResend}
              disabled={countdown > 0}
              className={cn(
                'flex items-center gap-1',
                countdown > 0
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-emerald-600 hover:text-emerald-700'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Can't find the email? Check your spam folder, or try again with a different email.
          </p>
        </motion.div>
      </FlowContent>
    )
  }

  // ============================================
  // EMAIL INPUT STATE
  // ============================================
  return (
    <FlowContent
      title="Save your progress"
      description="Enter your email to save your draft and receive updates"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="your@email.com"
              className={cn(
                'h-14 pl-12 text-base rounded-xl border-2',
                error
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-slate-200 focus:border-emerald-500'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendOTP()
                }
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <Button
          onClick={handleSendOTP}
          disabled={!email || isLoading}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              Continue with email
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>

        {allowSkip && (
          <button
            onClick={handleSkip}
            className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
          >
            Continue as guest
          </button>
        )}

        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <p>
            We'll send you a one-time code to verify your email. No password needed.
          </p>
        </div>

        {/* Trust signals */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>No spam</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Resume anytime</span>
            </div>
          </div>
        </div>
      </motion.div>
    </FlowContent>
  )
}
