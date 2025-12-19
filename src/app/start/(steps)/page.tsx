'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingStore, useOnboardingProgress } from '@/lib/onboarding/store'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { StepContainer } from '@/components/onboarding/step-container'
import { ServiceCard } from '@/components/onboarding/service-card'
import type { Service } from '@/types/database'

// Mock services - in production, fetch from Supabase
const mockServices: Service[] = [
  {
    id: '1',
    slug: 'weight-loss',
    name: 'Weight Loss Program',
    short_name: 'Weight Loss',
    description: 'Medically supervised weight management with GLP-1 medications like Ozempic and Wegovy.',
    type: 'weight_loss',
    category: null,
    price_cents: 4900,
    priority_fee_cents: 1500,
    is_active: true,
    requires_id_verification: true,
    requires_medicare: false,
    requires_photo: false,
    min_age: 18,
    max_age: null,
    allowed_states: null,
    sla_standard_minutes: 1440,
    sla_priority_minutes: 240,
    questionnaire_id: 'weight_loss_v1',
    eligibility_rules: {},
    icon_name: 'scale',
    display_order: 1,
    badge_text: 'Most Popular',
    meta_title: null,
    meta_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    slug: 'med-cert-sick',
    name: 'Sick Certificate',
    short_name: 'Sick Cert',
    description: 'Medical certificate for work or study. Get yours in under 30 minutes.',
    type: 'med_certs',
    category: null,
    price_cents: 1900,
    priority_fee_cents: 1000,
    is_active: true,
    requires_id_verification: false,
    requires_medicare: false,
    requires_photo: false,
    min_age: null,
    max_age: null,
    allowed_states: null,
    sla_standard_minutes: 1440,
    sla_priority_minutes: 60,
    questionnaire_id: 'med_cert_v1',
    eligibility_rules: {},
    icon_name: 'file-text',
    display_order: 2,
    badge_text: null,
    meta_title: null,
    meta_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    slug: 'mens-health-ed',
    name: 'Erectile Dysfunction',
    short_name: 'ED Treatment',
    description: 'Discreet, effective treatment for erectile dysfunction. Prescribed by Australian doctors.',
    type: 'mens_health',
    category: null,
    price_cents: 3900,
    priority_fee_cents: 1500,
    is_active: true,
    requires_id_verification: true,
    requires_medicare: false,
    requires_photo: false,
    min_age: 18,
    max_age: null,
    allowed_states: null,
    sla_standard_minutes: 1440,
    sla_priority_minutes: 240,
    questionnaire_id: 'mens_health_ed_v1',
    eligibility_rules: {},
    icon_name: 'heart',
    display_order: 3,
    badge_text: null,
    meta_title: null,
    meta_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    slug: 'common-scripts',
    name: 'Prescription Refill',
    short_name: 'Scripts',
    description: 'Refill your regular prescriptions online. Fast and convenient.',
    type: 'common_scripts',
    category: null,
    price_cents: 2500,
    priority_fee_cents: 1000,
    is_active: true,
    requires_id_verification: false,
    requires_medicare: false,
    requires_photo: false,
    min_age: null,
    max_age: null,
    allowed_states: null,
    sla_standard_minutes: 1440,
    sla_priority_minutes: 240,
    questionnaire_id: null,
    eligibility_rules: {},
    icon_name: 'pill',
    display_order: 4,
    badge_text: null,
    meta_title: null,
    meta_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export default function ServiceSelectionPage() {
  const router = useRouter()
  const { currentStep, completedSteps } = useOnboardingProgress()
  const { 
    serviceSlug, 
    selectService, 
    nextStep,
    setStep,
  } = useOnboardingStore()
  
  const [services] = useState<Service[]>(mockServices)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(serviceSlug)

  // Ensure we're on the correct step
  useEffect(() => {
    if (currentStep !== 'service') {
      setStep('service')
    }
  }, [currentStep, setStep])

  const handleServiceSelect = (service: Service) => {
    setSelectedSlug(service.slug)
    selectService(service.slug, service.type)
  }

  const handleContinue = () => {
    if (selectedSlug) {
      const service = services.find(s => s.slug === selectedSlug)
      if (service) {
        selectService(service.slug, service.type)
        nextStep()
        router.push('/start/eligibility')
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
        className="mb-8"
      />

      <StepContainer
        title="What can we help you with today?"
        description="Select a service to get started. All consultations are with Australian-registered doctors."
        onNext={handleContinue}
        nextLabel="Continue"
        nextDisabled={!selectedSlug}
        showBack={false}
      >
        <div className="space-y-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={selectedSlug === service.slug}
              onSelect={() => handleServiceSelect(service)}
            />
          ))}
        </div>
      </StepContainer>
    </div>
  )
}
