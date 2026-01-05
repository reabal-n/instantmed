'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import { FlowContent, FlowSection } from '../flow-content'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useFlowStore, useFlowIdentity } from '@/lib/flow'
import type { FlowConfig, IdentityData, ConsentType } from '@/lib/flow'
import { cn } from '@/lib/utils'
import { useUser, useClerk } from '@clerk/nextjs'

interface DetailsStepProps {
  config: FlowConfig
  onComplete?: () => void
}

// Required consents
const REQUIRED_CONSENTS: { type: ConsentType; label: string; version: string }[] = [
  {
    type: 'telehealth_terms',
    label: 'I agree to the telehealth consultation terms',
    version: '1.0',
  },
  {
    type: 'privacy_policy',
    label: 'I have read and accept the privacy policy',
    version: '1.0',
  },
  {
    type: 'fee_agreement',
    label: 'I understand the fee structure and agree to pay for this service',
    version: '1.0',
  },
]

export function DetailsStep({ config: _config, onComplete }: DetailsStepProps) {
  const existingIdentity = useFlowIdentity()
  const { setIdentityData, addConsent, nextStep } = useFlowStore()
  const { user: clerkUser, isLoaded } = useUser()
  const { openSignIn } = useClerk()

  // Check auth status based on Clerk
  const isLoggedIn = !!clerkUser
  const isCheckingAuth = !isLoaded

  // Form state
  const [formData, setFormData] = useState<Partial<IdentityData>>({
    firstName: existingIdentity?.firstName || '',
    lastName: existingIdentity?.lastName || '',
    email: existingIdentity?.email || '',
    phone: existingIdentity?.phone || '',
    dateOfBirth: existingIdentity?.dateOfBirth || '',
  })

  // Consents state
  const [acceptedConsents, setAcceptedConsents] = useState<Set<ConsentType>>(new Set())

  // Auth form state (for non-logged-in users)
  const [_authMode, _setAuthMode] = useState<'signup' | 'login'>('signup')
  const [_password, _setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Prefill form with Clerk user data
  useEffect(() => {
    if (clerkUser) {
      setFormData((prev) => ({ 
        ...prev, 
        email: clerkUser.primaryEmailAddress?.emailAddress || prev.email,
        firstName: clerkUser.firstName || prev.firstName,
        lastName: clerkUser.lastName || prev.lastName,
      }))
    }
  }, [clerkUser])

  // Update form field
  const updateField = (field: keyof IdentityData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Toggle consent
  const toggleConsent = (type: ConsentType) => {
    setAcceptedConsents((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  // Check if form is complete
  const isFormComplete = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth']
    const hasAllFields = requiredFields.every(
      (f) => formData[f as keyof IdentityData]?.toString().trim()
    )
    const hasAllConsents = REQUIRED_CONSENTS.every((c) => acceptedConsents.has(c.type))
    // With Clerk, we don't need password check - auth is handled separately
    const isAuthenticated = isLoggedIn

    return hasAllFields && hasAllConsents && isAuthenticated
  }

  // Handle continue
  const handleContinue = async () => {
    // If not logged in, open Clerk sign-in modal
    if (!isLoggedIn) {
      openSignIn({
        afterSignInUrl: window.location.href,
        afterSignUpUrl: window.location.href,
      })
      return
    }
    
    if (!isFormComplete()) return

    setIsSubmitting(true)
    setAuthError('')

    try {
      // Save identity data
      setIdentityData(formData as IdentityData)

      // Record consents
      const now = new Date().toISOString()
      REQUIRED_CONSENTS.forEach((consent) => {
        if (acceptedConsents.has(consent.type)) {
          addConsent({
            type: consent.type,
            version: consent.version,
            grantedAt: now,
            textHash: `${consent.type}_${consent.version}`, // Simplified hash
          })
        }
      })

      // Move to next step
      onComplete?.()
      nextStep()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error:', error)
      }
      setAuthError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <FlowContent title="Loading..." description="">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </FlowContent>
    )
  }

  return (
    <FlowContent
      title="Your details"
      description="We need a few details to process your request securely."
    >
      <div className="space-y-8">
        {/* Personal details */}
        <FlowSection title="Personal information">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name *</Label>
              <Input
                id="firstName"
                value={formData.firstName || ''}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="John"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last name *</Label>
              <Input
                id="lastName"
                value={formData.lastName || ''}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Smith"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth || ''}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="0400 000 000"
                className="mt-1.5 h-11"
              />
            </div>
          </div>
        </FlowSection>

        {/* Account section (if not logged in) */}
        {!isLoggedIn && (
          <FlowSection title="Create account">
            <p className="text-sm text-slate-500 mb-4">
              Sign in to track your request and access your documents.
            </p>

            <div className="space-y-4">
              <Button
                type="button"
                onClick={() => openSignIn({
                  afterSignInUrl: window.location.href,
                  afterSignUpUrl: window.location.href,
                })}
                className="w-full h-11"
              >
                Sign in or create account
              </Button>

              {authError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {authError}
                </div>
              )}

              <p className="text-sm text-slate-500 text-center">
                You&apos;ll need to sign in to continue with your request.
              </p>
            </div>
          </FlowSection>
        )}

        {/* If logged in, show email only */}
        {isLoggedIn && (
          <FlowSection>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || clerkUser?.primaryEmailAddress?.emailAddress || ''}
                disabled
                className="mt-1.5 h-11 bg-slate-50"
              />
              <p className="mt-1 text-xs text-slate-400">
                Logged in as {clerkUser?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </FlowSection>
        )}

        {/* Consents */}
        <FlowSection title="Agreements">
          <div className="space-y-3">
            {REQUIRED_CONSENTS.map((consent) => {
              const isAccepted = acceptedConsents.has(consent.type)
              return (
                <label
                  key={consent.type}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                    isAccepted
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'shrink-0 w-5 h-5 rounded border-2 mt-0.5',
                      'flex items-center justify-center',
                      isAccepted
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-300'
                    )}
                  >
                    {isAccepted && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-slate-700">{consent.label}</span>
                  <input
                    type="checkbox"
                    checked={isAccepted}
                    onChange={() => toggleConsent(consent.type)}
                    className="sr-only"
                  />
                </label>
              )
            })}
          </div>
        </FlowSection>

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          disabled={!isFormComplete() || isSubmitting}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            'Continue to payment'
          )}
        </Button>
      </div>
    </FlowContent>
  )
}
