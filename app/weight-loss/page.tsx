import type { Metadata } from 'next'
import { ServiceLandingPage } from '@/components/marketing/service-landing-page'
import { weightLossConfig } from '@/lib/marketing/services'

export const metadata: Metadata = {
  title: weightLossConfig.metaTitle,
  description: weightLossConfig.metaDescription,
  openGraph: {
    title: weightLossConfig.metaTitle,
    description: weightLossConfig.metaDescription,
    type: 'website',
  },
}

export default function WeightLossPage() {
  return <ServiceLandingPage config={weightLossConfig} />
}
