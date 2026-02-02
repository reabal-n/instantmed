'use client'

import { useEffect, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { 
  trackFunnelStep, 
  trackPurchase, 
  clearFunnelData 
} from '@/lib/analytics/conversion-tracking'
import { 
  storeLastService, 
  markPurchaseComplete,
  trackVisit,
} from '@/lib/user/returning-user'

const SERVICE_NAMES: Record<string, string> = {
  'med-cert': 'Medical Certificate',
  'repeat-script': 'Repeat Prescription',
  'consult': 'GP Consultation',
}

/**
 * Hook to track page visits and funnel progression
 */
export function usePageTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page visit
    const service = searchParams?.get('service') || undefined
    trackVisit(pathname, service)

    // Track funnel steps based on pathname
    if (pathname.includes('/medical-certificate')) {
      trackFunnelStep('landing', 'med-cert')
      storeLastService('med-cert', 'Medical Certificate')
    } else if (pathname.includes('/repeat-prescription')) {
      trackFunnelStep('landing', 'repeat-prescription')
      storeLastService('repeat-prescription', 'Repeat Prescription')
    } else if (pathname.includes('/general-consult')) {
      trackFunnelStep('landing', 'general-consult')
      storeLastService('general-consult', 'GP Consultation')
    } else if (pathname === '/start') {
      const service = searchParams?.get('service')
      if (service) {
        trackFunnelStep('start', service)
        storeLastService(service, SERVICE_NAMES[service] || service)
      }
    }
  }, [pathname, searchParams])
}

/**
 * Hook to track checkout events
 */
export function useCheckoutTracking() {
  const trackCheckoutStart = useCallback((service: string) => {
    trackFunnelStep('checkout', service)
  }, [])

  const trackIntakeComplete = useCallback((service: string) => {
    trackFunnelStep('intake_complete', service)
  }, [])

  const trackPaymentComplete = useCallback((params: {
    transactionId: string
    value: number
    service: string
  }) => {
    const serviceName = SERVICE_NAMES[params.service] || params.service
    
    trackPurchase({
      transactionId: params.transactionId,
      value: params.value,
      service: params.service,
      serviceName,
    })

    // Mark user as customer for personalization
    markPurchaseComplete()
    
    // Clear funnel data after successful conversion
    clearFunnelData()
  }, [])

  return {
    trackCheckoutStart,
    trackIntakeComplete,
    trackPaymentComplete,
  }
}

/**
 * Simple hook to fire conversion on component mount
 * Useful for thank-you/success pages
 */
export function useConversionOnMount(params: {
  transactionId: string
  value: number
  service: string
}) {
  const { trackPaymentComplete } = useCheckoutTracking()
  const { transactionId, value, service } = params

  useEffect(() => {
    if (transactionId) {
      trackPaymentComplete({ transactionId, value, service })
    }
  }, [transactionId, value, service, trackPaymentComplete])
}
