import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { repeatScriptFunnelConfig } from '@/lib/marketing/service-funnel-configs'
import { getDailyStats } from '@/lib/marketing/daily-stats'
import { getFeatureFlags } from '@/lib/feature-flags'
import { BreadcrumbSchema, MedicalServiceSchema, PrescriptionHowToSchema } from '@/components/seo/healthcare-schema'

export const metadata: Metadata = {
  title: 'Online Repeat Medication | Same-Day Service',
  description: 'Renew your regular medications online. Australian doctors review your request and send to any pharmacy. No appointments, no waiting rooms.',
  openGraph: {
    title: 'Online Repeat Medication | InstantMed',
    description: 'Renew your regular medications online. Australian doctors review your request and send to any pharmacy.',
    type: 'website',
    url: 'https://instantmed.com.au/prescriptions',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Repeat Medication | InstantMed',
    description: 'Renew your regular medications online. Australian doctors review your request and send to your phone.',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/prescriptions',
  },
}

export default async function PrescriptionsPage() {
  const [liveStats, flags] = await Promise.all([
    getDailyStats(7),
    getFeatureFlags(),
  ])
  return (
    <>
      {/* SEO Structured Data */}
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Repeat Medication", url: "https://instantmed.com.au/prescriptions" }
        ]}
      />
      <MedicalServiceSchema
        name="Online Repeat Medication"
        description="Renew your regular medications online. Reviewed by Australian registered doctors. Delivered to your phone via SMS."
        price="29.95"
      />
      <PrescriptionHowToSchema />
      <ServiceFunnelPage config={{ ...repeatScriptFunnelConfig, liveStats }} isDisabled={flags.disable_repeat_scripts} />
    </>
  )
}
