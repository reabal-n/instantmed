export const revalidate = 86400

import type { Metadata } from 'next'
import { PrescriptionsLanding } from '@/components/marketing/prescriptions-landing'
import { PRESCRIPTION_FAQ } from '@/lib/data/prescription-faq'
import {
  BreadcrumbSchema,
  MedicalServiceSchema,
  PrescriptionHowToSchema,
  SpeakableSchema,
  FAQSchema,
  ReviewAggregateSchema,
  HealthArticleSchema,
} from '@/components/seo/healthcare-schema'
import { PRICING, REVIEW_AGGREGATE } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Online Prescription Australia | Repeat & New Medication | InstantMed',
  description: `Renew your regular medications or get a new prescription online. AHPRA-registered Australian doctors review your request and send an eScript to your phone - any pharmacy, same day. Repeat from $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`,
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
    'new prescription online australia',
  ],
  openGraph: {
    title: 'Online Prescription Australia | Repeat & New Medication | InstantMed',
    description: `Renew your regular medications online. AHPRA-registered doctors send an eScript to your phone. Any pharmacy, same day. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`,
    type: 'website',
    url: 'https://instantmed.com.au/prescriptions',
    locale: 'en_AU',
    siteName: 'InstantMed',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Prescription Australia | InstantMed',
    description: `Renew your regular medications online. eScript to your phone, any pharmacy. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`,
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
        description={`Renew your regular medications or get a new prescription online. AHPRA-registered Australian doctors review your request and send an eScript to your phone. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`}
        price={PRICING.REPEAT_SCRIPT.toFixed(2)}
      />
      <PrescriptionHowToSchema />
      <SpeakableSchema
        name="Online Prescription Australia"
        description={`Renew your regular medications or get a new prescription online. AHPRA-registered Australian doctors review your request and send an eScript to your phone. Any pharmacy, same day. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`}
        url="/prescriptions"
      />
      <FAQSchema faqs={[...PRESCRIPTION_FAQ]} />
      <ReviewAggregateSchema
        ratingValue={REVIEW_AGGREGATE.ratingValue}
        reviewCount={REVIEW_AGGREGATE.reviewCount}
      />
      <HealthArticleSchema
        title="Online Prescription Australia"
        description={`Renew your regular medications or get a new prescription online. AHPRA-registered Australian doctors send an eScript to your phone. From $${PRICING.REPEAT_SCRIPT.toFixed(2)}.`}
        url="/prescriptions"
      />
      <PrescriptionsLanding />
    </>
  )
}
