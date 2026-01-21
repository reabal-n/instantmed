import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { repeatScriptFunnelConfig } from '@/lib/marketing/service-funnel-configs'
import { BreadcrumbSchema, MedicalServiceSchema, PrescriptionHowToSchema } from '@/components/seo/healthcare-schema'

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
  return (
    <>
      {/* SEO Structured Data */}
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Prescriptions", url: "https://instantmed.com.au/prescriptions" }
        ]} 
      />
      <MedicalServiceSchema 
        name="Online Repeat Prescription"
        description="Renew your regular medications online. Reviewed by Australian registered doctors. eScript sent to your phone via SMS."
        price="29.95"
      />
      <PrescriptionHowToSchema />
      <ServiceFunnelPage config={repeatScriptFunnelConfig} />
    </>
  )
}
