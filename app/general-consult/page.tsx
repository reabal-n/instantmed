import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { generalConsultFunnelConfig } from '@/lib/marketing/service-funnel-configs'

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: 'Online GP Consultation | Speak with a Doctor | InstantMed',
  description: 'A proper GP consult without the clinic visit. Australian doctors assess your health concerns and provide treatment advice, prescriptions, or referrals.',
  openGraph: {
    title: 'Online GP Consultation | InstantMed',
    description: 'A proper GP consult without the clinic visit. Australian doctors assess your health concerns.',
    type: 'website',
  },
}

export default function GeneralConsultPage() {
  return <ServiceFunnelPage config={generalConsultFunnelConfig} />
}
