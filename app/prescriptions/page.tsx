export const revalidate = 86400

import type { Metadata } from 'next'
import Link from 'next/link'

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

function PrescriptionAuthorityResourceLink() {
  const resources = [
    {
      href: "/resources/secure-online-prescription-requests",
      title: "How secure online prescription requests work in Australia",
      body: "eScript tokens, doctor review, safety boundaries, and medicine-neutral public language.",
    },
    {
      href: "/resources/repeat-prescription-safety-checklist",
      title: "Repeat prescription safety checklist",
      body: "Identity, current medicine details, monitoring needs, safety changes, and secure eScript delivery.",
    },
    {
      href: "/online-prescriptions",
      title: "Online prescriptions in Australia",
      body: "A practical guide to repeat prescription review, eScripts, PBS, Medicare, and when in-person care is safer.",
    },
  ] as const

  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {resources.map((resource) => (
          <Link
            key={resource.href}
            href={resource.href}
            className="group flex h-full flex-col gap-3 rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Source-backed explainer
              </p>
              <p className="mt-2 text-base font-semibold text-foreground">
                {resource.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {resource.body}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="mt-auto shrink-0 text-lg font-semibold text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
            >
              -&gt;
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
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
      <PrescriptionsLanding>
        <PrescriptionAuthorityResourceLink />
      </PrescriptionsLanding>
    </>
  )
}
