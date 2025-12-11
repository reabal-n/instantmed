'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Stethoscope, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { EmergencyAlert } from '@/components/onboarding/EmergencyAlert'
import { ServiceSelection } from '@/components/onboarding/steps/ServiceSelection'
import { MedCertIntake } from '@/components/onboarding/steps/MedCertIntake'
import { ScriptIntake } from '@/components/onboarding/steps/ScriptIntake'
import { AccountCreation } from '@/components/onboarding/steps/AccountCreation'
import { PatientDetails } from '@/components/onboarding/steps/PatientDetails'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { ServiceType } from '@/lib/types'
import type {
  MedCertIntakeForm,
  ScriptIntakeForm,
  AccountForm,
  PatientDetailsForm,
} from '@/lib/validations'

// Step configuration - Account is conditional based on auth state
const getSteps = (isLoggedIn: boolean) => {
  if (isLoggedIn) {
    return [
      { id: 'service', title: 'Service Type' },
      { id: 'intake', title: 'Medical Info' },
      { id: 'details', title: 'Patient Details' },
    ]
  }
  return [
    { id: 'service', title: 'Service Type' },
    { id: 'intake', title: 'Medical Info' },
    { id: 'details', title: 'Patient Details' },
    { id: 'account', title: 'Account' },
  ]
}

interface FormData {
  serviceType: ServiceType | null
  intakeData: MedCertIntakeForm | ScriptIntakeForm | null
  accountData: AccountForm | null
  patientDetails: PatientDetailsForm | null
  isBackdated: boolean
  backdatingFee: number
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    y: 10,
  }),
  center: {
    x: 0,
    opacity: 1,
    y: 0,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    y: 10,
  }),
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 20,
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [showEmergency, setShowEmergency] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  const [formData, setFormData] = useState<FormData>({
    serviceType: null,
    intakeData: null,
    accountData: null,
    patientDetails: null,
    isBackdated: false,
    backdatingFee: 0,
  })

  const steps = getSteps(isLoggedIn)

  // Check for pre-selected service from URL
  useEffect(() => {
    const service = searchParams.get('service') as ServiceType | null
    if (service && (service === 'sick_cert' || service === 'prescription')) {
      setFormData((prev) => ({ ...prev, serviceType: service }))
      // Only auto-advance if we're on step 0
      if (currentStep === 0 && !isCheckingAuth) {
        setCurrentStep(1)
      }
    }
  }, [searchParams, currentStep, isCheckingAuth])

  // Check authentication status on mount and when returning from OAuth
  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true)
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Error checking auth:', error)
          setIsLoggedIn(false)
          setUserId(null)
        } else if (user) {
          setIsLoggedIn(true)
          setUserId(user.id)
          
          // If user just came from Google signup during onboarding, show success
          const googleSignup = searchParams.get('google_signup')
          if (googleSignup === 'true') {
            toast.success('Signed in with Google!')
            // Remove the query param from URL
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('google_signup')
            window.history.replaceState({}, '', newUrl.toString())
          }
        } else {
          setIsLoggedIn(false)
          setUserId(null)
        }
      } catch (error) {
        console.error('Unexpected error checking auth:', error)
        setIsLoggedIn(false)
        setUserId(null)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    
    checkAuth()

    // Listen for auth state changes (e.g., when returning from OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsLoggedIn(true)
        setUserId(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false)
        setUserId(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, searchParams])

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1)
    setCurrentStep(step)
  }

  const handleServiceSelect = (service: ServiceType) => {
    setFormData((prev) => ({ ...prev, serviceType: service }))
    goToStep(1)
  }

  const handleIntakeComplete = (data: MedCertIntakeForm | ScriptIntakeForm) => {
    // Check for backdating if it's a med cert
    let isBackdated = false
    let backdatingFee = 0
    
    if ('startDate' in data && formData.serviceType === 'sick_cert') {
      const selectedDate = new Date(data.startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      isBackdated = selectedDate < today
      backdatingFee = isBackdated ? 1000 : 0 // $10.00 in cents
    }
    
    setFormData((prev) => ({ 
      ...prev, 
      intakeData: data,
      isBackdated,
      backdatingFee,
    }))
    goToStep(2) // Go to Patient Details
  }

  const handleEmergency = useCallback(() => {
    setShowEmergency(true)
  }, [])

  const handleDismissEmergency = () => {
    setShowEmergency(false)
    // Clear the red flag symptoms
    if (formData.intakeData && 'symptoms' in formData.intakeData) {
      const clearedSymptoms = formData.intakeData.symptoms.filter(
        (s) => !['chest_pain', 'severe_breathlessness'].includes(s)
      )
      setFormData((prev) => ({
        ...prev,
        intakeData: { ...prev.intakeData as MedCertIntakeForm, symptoms: clearedSymptoms },
      }))
    }
  }

  const handlePatientDetailsComplete = async (data: PatientDetailsForm) => {
    setIsLoading(true)
    setFormData((prev) => ({ ...prev, patientDetails: data }))

    try {
      // If user is logged in, proceed directly to checkout
      if (isLoggedIn && userId) {
        await saveAndProceedToCheckout(data, userId)
      } else {
        // Go to account creation
        goToStep(3)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const handleAccountCreate = async (data: AccountForm) => {
    setIsLoading(true)
    setAuthError('')

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Account creation error:', error)
        setAuthError(error.message)
        toast.error(error.message || 'Failed to create account')
        setIsLoading(false)
        return
      }

      if (authData?.user) {
        setFormData((prev) => ({ ...prev, accountData: data }))
        setIsLoggedIn(true)
        setUserId(authData.user.id)
        toast.success('Account created successfully!')
        
        // Now save patient details and proceed to checkout
        if (formData.patientDetails) {
          await saveAndProceedToCheckout(formData.patientDetails, authData.user.id)
        } else {
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error('Unexpected error creating account:', error)
      setAuthError('An unexpected error occurred. Please try again.')
      toast.error('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const saveAndProceedToCheckout = async (patientDetails: PatientDetailsForm, authUserId: string) => {
    try {
      // Update or create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          auth_user_id: authUserId,
          first_name: patientDetails.firstName,
          last_name: patientDetails.lastName,
          full_name: `${patientDetails.firstName} ${patientDetails.lastName}`,
          date_of_birth: patientDetails.dateOfBirth,
          gender: patientDetails.gender,
          medicare_number: patientDetails.medicareNumber.replace(/\s/g, ''),
          medicare_irn: parseInt(patientDetails.medicareIrn),
          medicare_expiry: `${patientDetails.medicareExpiry.slice(3)}-${patientDetails.medicareExpiry.slice(0, 2)}-01`,
          role: 'patient',
          onboarding_completed: true,
        }, {
          onConflict: 'auth_user_id',
        })

      if (profileError) {
        console.error('Profile error:', profileError)
        toast.error('Failed to save patient details')
        setIsLoading(false)
        return
      }

      // Get the profile ID
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single()

      if (profileFetchError) {
        console.error('Error fetching profile:', profileFetchError)
        toast.error('Failed to retrieve profile. Please try again.')
        setIsLoading(false)
        return
      }

      if (!profile) {
        console.error('Profile not found after creation')
        toast.error('Failed to retrieve profile')
        setIsLoading(false)
        return
      }

      // Determine start date
      let startDate = null
      if (formData.intakeData && 'startDate' in formData.intakeData) {
        startDate = formData.intakeData.startDate
      }

      // Create the request/consultation
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .insert({
          patient_id: profile.id,
          type: formData.serviceType,
          category: formData.serviceType === 'sick_cert' ? 'medical_certificate' : 'prescription',
          status: 'pending',
          payment_status: 'pending_payment',
          backdated: formData.isBackdated,
          start_date: startDate,
          priority_review: false,
        })
        .select()
        .single()

      if (requestError) {
        console.error('Request error:', requestError)
        toast.error('Failed to create consultation request')
        setIsLoading(false)
        return
      }

      // Save the intake answers
      try {
        const { error: answersError } = await supabase
          .from('request_answers')
          .insert({
            request_id: request.id,
            answers: formData.intakeData,
          })

        if (answersError) {
          console.error('Answers error:', answersError)
          // Non-critical, continue to checkout
        }
      } catch (answersErr) {
        console.error('Unexpected error saving answers:', answersErr)
        // Non-critical, continue to checkout
      }

      toast.success('Details saved!')
      
      // Redirect to checkout with the request ID and backdated status
      const params = new URLSearchParams({
        request_id: request.id,
        service: formData.serviceType || '',
        ...(formData.isBackdated && { backdated: 'true' }),
      })
      
      router.push(`/checkout?${params.toString()}`)
    } catch (error) {
      console.error('Error:', error)
      toast.error('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const goBack = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1)
    } else {
      router.push('/')
    }
  }

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (showEmergency) {
    return <EmergencyAlert onDismiss={handleDismissEmergency} />
  }

  // Determine which step content to show
  const getStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            key="service"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springTransition}
          >
            <ServiceSelection
              value={formData.serviceType}
              onChange={handleServiceSelect}
              onNext={() => formData.serviceType && goToStep(1)}
            />
          </motion.div>
        )
      case 1:
        if (formData.serviceType === 'sick_cert') {
          return (
            <motion.div
              key="medcert-intake"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
            >
              <MedCertIntake
                onNext={handleIntakeComplete}
                onBack={goBack}
                onEmergency={handleEmergency}
                defaultValues={formData.intakeData as MedCertIntakeForm | undefined}
                isBackdated={formData.isBackdated}
                backdatingFee={formData.backdatingFee}
              />
            </motion.div>
          )
        }
        return (
          <motion.div
            key="script-intake"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springTransition}
          >
            <ScriptIntake
              onNext={handleIntakeComplete}
              onBack={goBack}
              defaultValues={formData.intakeData as ScriptIntakeForm | undefined}
            />
          </motion.div>
        )
      case 2:
        return (
          <motion.div
            key="patient-details"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springTransition}
          >
            <PatientDetails
              onNext={handlePatientDetailsComplete}
              onBack={goBack}
              isLoading={isLoading}
              defaultValues={formData.patientDetails || undefined}
            />
          </motion.div>
        )
      case 3:
        // Only show account creation for non-logged-in users
        if (!isLoggedIn) {
          return (
            <motion.div
              key="account"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
            >
              <AccountCreation
                onNext={handleAccountCreate}
                onBack={goBack}
                isLoading={isLoading}
                error={authError}
              />
            </motion.div>
          )
        }
        return null
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-warm">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">InstantMed</span>
          </Link>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b border-border bg-white py-4">
        <div className="container mx-auto px-4">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>
      </div>

      {/* Content with Animation */}
      <main className="container mx-auto px-4 py-8 pb-32 md:pb-8">
        <div className="max-w-xl mx-auto relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {getStepContent()}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default function StartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
