import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { medCertFunnelConfig } from '@/lib/marketing/service-funnel-configs'

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: 'Online Medical Certificates | Same Day',
  description: 'Get a valid medical certificate from an Australian doctor in under an hour. Accepted by all employers. No appointments, no waiting rooms.',
  openGraph: {
    title: 'Online Medical Certificates | InstantMed',
    description: 'Get a valid medical certificate from an Australian doctor in under an hour. Accepted by all employers.',
    type: 'website',
  },
}

export default function MedicalCertificatesPage() {
  return <ServiceFunnelPage config={medCertFunnelConfig} />
}
