import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { repeatScriptFunnelConfig } from '@/lib/marketing/service-funnel-configs'
import { getDailyStats } from '@/lib/marketing/daily-stats'
import { getFeatureFlags } from '@/lib/feature-flags'
import { BreadcrumbSchema, MedicalServiceSchema, PrescriptionHowToSchema, SpeakableSchema, ReviewAggregateSchema, FAQSchema } from '@/components/seo/healthcare-schema'

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
      <SpeakableSchema
        name="Online Repeat Medication Australia"
        description="Renew your regular medications online. Australian registered doctors review your request and send an eScript to your phone. From $29.95."
        url="/prescriptions"
      />
      <FAQSchema faqs={[
        { question: "What medications can you prescribe?", answer: "We can prescribe most common repeat medications — blood pressure, cholesterol, contraceptives, asthma inhalers, reflux, thyroid, and more. We cannot prescribe Schedule 8 medications (opioids, stimulants) or benzodiazepines." },
        { question: "Is the eScript accepted at any pharmacy?", answer: "Yes. eScripts are the national standard in Australia. Take your phone to any pharmacy and they'll scan it directly — no paper needed." },
        { question: "Do I need a previous prescription?", answer: "This service is for medications you've already been prescribed. If you need a new medication, our general consult service is more appropriate." },
        { question: "Will my PBS subsidies still apply?", answer: "Yes. If your medication is listed on the PBS, you'll pay the subsidised price at the pharmacy as usual. Our consultation fee is separate from your medication cost." },
        { question: "What if the doctor can't prescribe my medication?", answer: "If your medication isn't suitable for online prescribing (e.g. you need blood tests first), we'll explain why and refund your payment in full." },
      ]} />
      <ReviewAggregateSchema ratingValue={4.8} reviewCount={49} />
      <ServiceFunnelPage config={{ ...repeatScriptFunnelConfig, liveStats }} isDisabled={flags.disable_repeat_scripts} />
    </>
  )
}
