import type { Metadata } from 'next'
import { ServiceLandingPage } from '@/components/marketing/service-landing-page'
import { commonScriptsConfig } from '@/lib/marketing/services'

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: commonScriptsConfig.metaTitle,
  description: commonScriptsConfig.metaDescription,
  openGraph: {
    title: commonScriptsConfig.metaTitle,
    description: commonScriptsConfig.metaDescription,
    type: 'website',
  },
}

export default function CommonScriptsPage() {
  return <ServiceLandingPage config={commonScriptsConfig} />
}
