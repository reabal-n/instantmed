import type { Metadata } from 'next'
import { ServiceLandingPage } from '@/components/marketing/service-landing-page'
import { medicalCertificatesConfig } from '@/lib/marketing/services'

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: medicalCertificatesConfig.metaTitle,
  description: medicalCertificatesConfig.metaDescription,
  openGraph: {
    title: medicalCertificatesConfig.metaTitle,
    description: medicalCertificatesConfig.metaDescription,
    type: 'website',
  },
}

export default function MedicalCertificatesPage() {
  return <ServiceLandingPage config={medicalCertificatesConfig} />
}
