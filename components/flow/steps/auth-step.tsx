'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Mail,
  Loader2,
  CheckCircle2,
  Sparkles,
  Lock,
} from 'lucide-react'
import { FlowContent } from '../flow-content'
import { Button } from '@/components/ui/button'
import { useFlowStore, useFlowIdentity } from '@/lib/flow'
import { GoogleIcon } from '@/components/icons/google-icon'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// ============================================
// TYPES
// ============================================

type AuthMode = 'email_input' | 'checking' | 'authenticated'

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
  const router = useRouter()
  const supabase = createClient()
  const identityData = useFlowIdentity()
  const { updateAnswer, nextStep, setIdentityData } = useFlowStore()

  // State
  const [mode, setMode] = useState<AuthMode>('checking')
  const [email, setEmail] = useState(identityData?.email || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [_isChecking, setIsChecking] = useState(true)
  const _isSignedIn = !!user

  // Check for existing session on mount - use Supabase
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
        
        if (currentUser) {
          // User is already authenticated via Supabase
          // Use setTimeout to avoid synchronous setState in effect
          const timer = setTimeout(() => {
            setMode('authenticated')
          }, 0)
          
          // Update identity data with user email
          const userEmail = currentUser.email
          if (identityData) {
            setIdentityData({
              ...identityData,
              email: userEmail || identityData.email,
            })
          }

          // Store auth status
          updateAnswer('_authenticated', {
            userId: currentUser.id,
            email: userEmail,
            authenticatedAt: new Date().toISOString(),
          })

          // Auto-continue after brief delay
          const continueTimer = setTimeout(() => {
            onAuthenticated?.()
            nextStep()
          }, 1500)
          
          return () => {
            clearTimeout(timer)
            clearTimeout(continueTimer)
          }
        } else {
          // Not signed in, show email input
          const timer = setTimeout(() => {
            if (identityData?.email) {
              setEmail(identityData.email)
            }
            setMode('email_input')
          }, 0)
          
          return () => clearTimeout(timer)
        }
      } catch (_error) {
        // Error checking session - show email input
        const timer = setTimeout(() => {
          if (identityData?.email) {
            setEmail(identityData.email)
          }
          setMode('email_input')
        }, 0)
        
        return () => clearTimeout(timer)
      } finally {
        setIsChecking(false)
      }
    }
    
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        setMode('authenticated')
        const userEmail = session.user.email
        if (identityData) {
          setIdentityData({
            ...identityData,
            email: userEmail || identityData.email,
          })
        }
        updateAnswer('_authenticated', {
          userId: session.user.id,
          email: userEmail,
          authenticatedAt: new Date().toISOString(),
        })
        onAuthenticated?.()
        nextStep()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, identityData, setIdentityData, updateAnswer, onAuthenticated, nextStep])

  // Handle sign in - redirect to login
  const handleSignIn = () => {
    setIsLoading(true)
    setError('')

    // Redirect to login page with return URL
    router.push(`/auth/login?redirect=${encodeURIComponent(window.location.href)}`)
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

  // Handle Google OAuth - redirect to login
  const handleGoogleSignIn = () => {
    setIsLoading(true)
    setError('')

    // Redirect to login page with return URL
    router.push(`/auth/login?redirect=${encodeURIComponent(window.location.href)}`)
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
            You&apos;re signed in
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
  // EMAIL INPUT STATE
  // ============================================
  return (
    <FlowContent
      title="Create your account"
      description="Sign in to save your progress and receive your documents"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Google OAuth Button */}
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          variant="outline"
          className="w-full h-12 text-base rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        >
          <GoogleIcon />
          <span className="ml-3">Continue with Google</span>
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400">or</span>
          </div>
        </div>

        <Button
          onClick={handleSignIn}
          disabled={isLoading}
          variant="outline"
          className="w-full h-12 text-base rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        >
          <Mail className="w-5 h-5 mr-3" />
          Continue with email
        </Button>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {allowSkip && (
          <button
            onClick={handleSkip}
            className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
          >
            Continue as guest
          </button>
        )}

        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Lock className="w-4 h-4 shrink-0" />
          <p>
            Your data is secure and never shared without your permission.
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
