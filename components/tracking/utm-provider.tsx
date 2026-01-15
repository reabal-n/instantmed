'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { extractUTMFromURL, storeUTMParams } from '@/lib/tracking/utm'

/**
 * UTM Provider - captures and stores UTM params on page load
 * Add this to your root layout to track attribution across the site
 */
export function UTMProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    if (searchParams) {
      const utmParams = extractUTMFromURL(searchParams)
      storeUTMParams(utmParams)
    }
  }, [searchParams])
  
  return <>{children}</>
}
