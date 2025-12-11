'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
import type { ServiceType } from '@/lib/types'
import type {
  MedCertIntakeForm,
  ScriptIntakeForm,
  AccountForm,
  PatientDetailsForm,
} from '@/lib/validations'

const STEPS = [
  { id: 'service', title: 'Service' },
  { id: 'intake', title: 'Medical Info' },
  { id: 'account', title: 'Account' },
  { id: 'details', title: 'Patient Details' },
]

interface FormData {
  serviceType: ServiceType | null
  intakeData: MedCertIntakeForm | ScriptIntakeForm | null
  accountData: AccountForm | null
  patientDetails: PatientDetailsForm | null
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState(0)
  const [showEmergency, setShowEmergency] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string>('')
  
  const [formData, setFormData] = useState<FormData>({
    serviceType: null,
    intakeData: null,
    accountData: null,
    patientDetails: null,
  })

  // Check for pre-selected service from URL
  useEffect(() => {
    const service = searchParams.get('service') as ServiceType | null
    if (service && (service === 'sick_cert' || service === 'prescription')) {
      setFormData((prev) => ({ ...prev, serviceType: service }))
      setCurrentStep(1)
    }
  }, [searchParams])

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && currentStep === 2) {
        // Skip account creation if already logged in
        setCurrentStep(3)
      }
    }
    checkAuth()
  }, [supabase, currentStep])

  const handleServiceSelect = (service: ServiceType) => {
    setFormData((prev) => ({ ...prev, serviceType: service }))
  }

  const handleIntakeComplete = (data: MedCertIntakeForm | ScriptIntakeForm) => {
    setFormData((prev) => ({ ...prev, intakeData: data }))
    setCurrentStep(2)
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
        setAuthError(error.message)
        setIsLoading(false)
        return
      }

      if (authData.user) {
        setFormData((prev) => ({ ...prev, accountData: data }))
        toast.success('Account created successfully!')
        setCurrentStep(3)
      }
    } catch {
      setAuthError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePatientDetailsComplete = async (data: PatientDetailsForm) => {
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please log in to continue')
        setCurrentStep(2)
        setIsLoading(false)
        return
      }

      // Update or create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          auth_user_id: user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName} ${data.lastName}`,
          date_of_birth: data.dateOfBirth,
          gender: data.gender,
          medicare_number: data.medicareNumber.replace(/\s/g, ''),
          medicare_irn: parseInt(data.medicareIrn),
          medicare_expiry: `${data.medicareExpiry.slice(3)}-${data.medicareExpiry.slice(0, 2)}-01`,
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile) {
        toast.error('Failed to retrieve profile')
        setIsLoading(false)
        return
      }

      // Determine if backdated (for med cert)
      let isBackdated = false
      let startDate = null
      
      if (formData.intakeData && 'startDate' in formData.intakeData) {
        const selectedDate = new Date(formData.intakeData.startDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        isBackdated = selectedDate < today
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
          backdated: isBackdated,
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

      setFormData((prev) => ({ ...prev, patientDetails: data }))
      toast.success('Details saved!')
      
      // Redirect to checkout with the request ID and backdated status
      const params = new URLSearchParams({
        request_id: request.id,
        service: formData.serviceType || '',
        ...(isBackdated && { backdated: 'true' }),
      })
      
      router.push(`/checkout?${params.toString()}`)
    } catch (error) {
      console.error('Error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      router.push('/')
    }
  }

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  if (showEmergency) {
    return <EmergencyAlert onDismiss={handleDismissEmergency} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">InstantMed</span>
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
      <div className="border-b border-border py-4">
        <div className="container mx-auto px-4">
          <StepIndicator steps={STEPS} currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 pb-32 md:pb-8">
        <div className="max-w-xl mx-auto">
          {/* Step 1: Service Selection */}
          {currentStep === 0 && (
            <ServiceSelection
              value={formData.serviceType}
              onChange={handleServiceSelect}
              onNext={goNext}
            />
          )}

          {/* Step 2: Intake Form */}
          {currentStep === 1 && formData.serviceType === 'sick_cert' && (
            <MedCertIntake
              onNext={handleIntakeComplete}
              onBack={goBack}
              onEmergency={handleEmergency}
              defaultValues={formData.intakeData as MedCertIntakeForm | undefined}
            />
          )}

          {currentStep === 1 && formData.serviceType === 'prescription' && (
            <ScriptIntake
              onNext={handleIntakeComplete}
              onBack={goBack}
              defaultValues={formData.intakeData as ScriptIntakeForm | undefined}
            />
          )}

          {/* Step 3: Account Creation */}
          {currentStep === 2 && (
            <AccountCreation
              onNext={handleAccountCreate}
              onBack={goBack}
              isLoading={isLoading}
              error={authError}
            />
          )}

          {/* Step 4: Patient Details */}
          {currentStep === 3 && (
            <PatientDetails
              onNext={handlePatientDetailsComplete}
              onBack={goBack}
              isLoading={isLoading}
              defaultValues={formData.patientDetails || undefined}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default function StartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}

