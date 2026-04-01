import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { repeatScriptFunnelConfig } from '@/lib/marketing/service-funnel-configs'
import { getFeatureFlags } from '@/lib/feature-flags'
import { BreadcrumbSchema, MedicalServiceSchema, FAQSchema } from '@/components/seo/healthcare-schema'
import { RepeatRxGuideSection } from '@/components/marketing/sections/repeat-rx-guide-section'

// ISR — revalidate every 5 minutes (feature flags cached via unstable_cache)
export const revalidate = 300

const repeatRxFaqs = [
  { question: "What medications can you prescribe?", answer: "We can prescribe most common repeat medications — blood pressure, cholesterol, contraceptives, asthma inhalers, reflux, thyroid, antidepressants (when stable), and more. We cannot prescribe Schedule 8 medications (opioids, stimulants) or benzodiazepines." },
  { question: "Is the eScript accepted at any pharmacy?", answer: "Yes. eScripts are the national standard in Australia. Take your phone to any pharmacy and they'll scan it directly — no paper needed." },
  { question: "Do I need a previous prescription?", answer: "This service is for medications you've already been prescribed. If you need a new medication, our general consult service is more appropriate." },
  { question: "Will my PBS subsidies still apply?", answer: "Yes. If your medication is listed on the PBS, you'll pay the subsidised price at the pharmacy as usual. Our consultation fee is separate from your medication cost." },
  { question: "What if the doctor can't prescribe my medication?", answer: "If your medication isn't suitable for online prescribing (e.g. you need blood tests first), we'll explain why and refund your payment in full." },
  { question: "How does an eScript work?", answer: "After approval, you receive an SMS with your eScript token. Show this at any pharmacy — they scan it from your phone screen and dispense your medication. No paper scripts, no printing needed." },
  { question: "Can I get repeats included?", answer: "Yes, where clinically appropriate. The doctor determines the number of repeats based on your medication and clinical situation. Repeats are included on the eScript." },
  { question: "What if my medication needs blood tests first?", answer: "Some medications (like methotrexate or lithium) require recent blood test results before renewal. If the doctor needs test results they don't have, they'll let you know and refund your payment." },
  { question: "Is this a private service or bulk-billed?", answer: "This is a private service at $29.95 per consultation. Medicare rebates don't apply, but PBS subsidies still apply at the pharmacy. The $29.95 covers the doctor's assessment, not the medication itself." },
  { question: "Can I get the contraceptive pill renewed?", answer: "Yes. Oral contraceptives are one of the most common medications renewed through our service. The doctor will ask about blood pressure and any side effects as part of the review." },
  { question: "What about mental health medication?", answer: "Stable patients on existing antidepressants or anti-anxiety medication can renew through our service. If your dose needs changing or you're experiencing new symptoms, a general consultation is more appropriate." },
  { question: "How quickly will I get my prescription?", answer: "Most prescriptions are reviewed and sent within 30–60 minutes during operating hours (8am–10pm AEST, 7 days). You'll receive an SMS as soon as the eScript is ready." },
]

export const metadata: Metadata = {
  title: 'Repeat Medication Online | Same-Day Review',
  description: 'Renew your regular medications online. Australian doctors review your request and send your medication to any pharmacy. Submit from home.',
  openGraph: {
    title: 'Online Repeat Medication | InstantMed',
    description: 'Renew your regular medications online. Australian doctors review your request and send your medication to any pharmacy.',
    type: 'website',
    url: 'https://instantmed.com.au/repeat-prescriptions',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/repeat-prescriptions',
  },
}

export default async function RepeatPrescriptionsPage() {
  const flags = await getFeatureFlags()
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Repeat Medication", url: "https://instantmed.com.au/repeat-prescriptions" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Repeat Medication"
        description="Renew your regular medications online. Australian doctors review your request and send an eScript to any pharmacy."
        price="29.95"
      />
      <FAQSchema faqs={repeatRxFaqs} />
      <ServiceFunnelPage config={repeatScriptFunnelConfig} isDisabled={flags.disable_repeat_scripts}>
        <RepeatRxGuideSection />
      </ServiceFunnelPage>
    </>
  )
}
