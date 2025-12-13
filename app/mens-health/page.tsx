import type { Metadata } from 'next'
import { ServiceLandingPage } from '@/components/marketing/service-landing-page'
import { mensHealthConfig } from '@/lib/marketing/services'

export const metadata: Metadata = {
  title: mensHealthConfig.metaTitle,
  description: mensHealthConfig.metaDescription,
  openGraph: {
    title: mensHealthConfig.metaTitle,
    description: mensHealthConfig.metaDescription,
    type: 'website',
  },
}

export default function MensHealthPage() {
  return <ServiceLandingPage config={mensHealthConfig} />
}
