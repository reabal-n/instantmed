import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { repeatScriptFunnelConfig } from '@/lib/marketing/service-funnel-configs'

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: 'Online Repeat Prescriptions | Same-Day Scripts | InstantMed',
  description: 'Renew your regular medications online. Australian doctors review your request and send scripts to any pharmacy. No appointments, no waiting rooms.',
  openGraph: {
    title: 'Online Repeat Prescriptions | InstantMed',
    description: 'Renew your regular medications online. Australian doctors review your request and send scripts to any pharmacy.',
    type: 'website',
  },
}

export default function PrescriptionsPage() {
  return <ServiceFunnelPage config={repeatScriptFunnelConfig} />
}
