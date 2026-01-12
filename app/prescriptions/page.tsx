import type { Metadata } from 'next'
import { ServiceLandingPage } from '@/components/marketing/service-landing-page'
import { prescriptionsConfig } from '@/lib/marketing/services'

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: prescriptionsConfig.metaTitle,
  description: prescriptionsConfig.metaDescription,
  openGraph: {
    title: prescriptionsConfig.metaTitle,
    description: prescriptionsConfig.metaDescription,
    type: 'website',
  },
}

export default function PrescriptionsPage() {
  return <ServiceLandingPage config={prescriptionsConfig} />
}
