export const revalidate = 86400

import type { Metadata } from 'next'

import { PrescriptionsLanding } from '@/components/marketing/prescriptions-landing'
import {
  BreadcrumbSchema,
  FAQSchema,
  HealthArticleSchema,
  MedicalServiceSchema,
  PrescriptionHowToSchema,
  SpeakableSchema,
} from '@/components/seo/healthcare-schema'
import { PRICING } from '@/lib/constants'
import { PRESCRIPTION_FAQ } from '@/lib/data/prescription-faq'

export const metadata: Metadata = {
  title: 'Repeat Prescription Online | Doctor Review',
  description: `Request doctor review for regular repeat medications online. Fill out a form, no appointment needed, no waiting room. eScript sent if approved. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`,
  keywords: [
    'online prescription australia',
    'repeat prescription online',
    'escript australia',
    'online repeat medication',
    'telehealth prescription',
    'repeat prescription telehealth',
    'online doctor prescription',
    'get prescription online australia',
    'repeat medication online',
    'repeat medication review australia',
  ],
  openGraph: {
    title: 'Repeat Prescription Online | Doctor Review | InstantMed',
    description: `Fill out a form, no appointment needed. If approved, an eScript is sent to your phone. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`,
    type: 'website',
    url: 'https://instantmed.com.au/prescriptions',
    locale: 'en_AU',
    siteName: 'InstantMed',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Repeat Prescription Online | Doctor Review | InstantMed',
    description: `Repeat medication review online. eScript to your phone if approved. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`,
  },
  alternates: {
    canonical: 'https://instantmed.com.au/prescriptions',
  },
}

export default function PrescriptionsPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://instantmed.com.au' },
          { name: 'Online Prescriptions', url: 'https://instantmed.com.au/prescriptions' },
        ]}
      />
      <MedicalServiceSchema
        name="Online Prescription Australia"
        description={`Request doctor review for regular repeat medications online. AHPRA-registered Australian doctors review your request and send an eScript to your phone if approved. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`}
        price={PRICING.REPEAT_SCRIPT.toFixed(2)}
      />
      <PrescriptionHowToSchema />
      <SpeakableSchema
        name="Online Prescription Australia"
        description={`Request doctor review for regular repeat medications online. AHPRA-registered Australian doctors review your request and send an eScript to your phone if approved. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`}
        url="/prescriptions"
      />
      <FAQSchema faqs={[...PRESCRIPTION_FAQ]} />
      <HealthArticleSchema
        title="Online Prescription Australia"
        description={`Request doctor review for regular repeat medications online. AHPRA-registered Australian doctors send an eScript to your phone if approved. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`}
        url="/prescriptions"
      />
      <PrescriptionsLanding />
    </>
  )
}
