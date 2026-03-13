import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { repeatScriptFunnelConfig } from '@/lib/marketing/service-funnel-configs'
import { getFeatureFlags } from '@/lib/feature-flags'

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: 'Online Repeat Medication | Same-Day Doctor Review',
  description: 'Renew your regular medications online. Australian doctors review your request and send your medication to any pharmacy. Submit from home.',
  openGraph: {
    title: 'Online Repeat Medication | InstantMed',
    description: 'Renew your regular medications online. Australian doctors review your request and send your medication to any pharmacy.',
    type: 'website',
  },
}

export default async function RepeatPrescriptionsPage() {
  const flags = await getFeatureFlags()
  return <ServiceFunnelPage config={repeatScriptFunnelConfig} isDisabled={flags.disable_repeat_scripts} />
}
