import { getCurrentUser, getUserProfile } from "@/lib/auth"
import { PrescriptionFlowClient } from "./prescription-flow-client"
import { getFeatureFlags } from "@/lib/feature-flags"
import { ServiceDisabledBanner } from "@/components/service-disabled-banner"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Request a Prescription Online Australia | Repeat Scripts | InstantMed",
  description:
    "Request prescriptions online from Australian doctors. Repeat scripts reviewed same-day. E-script sent to your phone for any pharmacy. No phone call needed. $24.95.",
  keywords: [
    "online prescription australia",
    "repeat prescription online",
    "request script online",
    "e-script online",
    "telehealth prescription",
    "medication refill online",
    "repeat script australia",
  ],
  openGraph: {
    title: "Request a Prescription Online | InstantMed Australia",
    description:
      "Request repeat scripts online. Doctor-reviewed same-day, e-script sent to your phone. No phone call needed.",
    url: "https://instantmed.com.au/prescriptions/request",
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request a Prescription Online | InstantMed",
    description: "Repeat scripts reviewed by Australian GPs. E-script sent to your phone.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/prescriptions/request",
  },
}

function PrescriptionJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalWebPage",
        name: "Online Prescription Request",
        description: "Request prescriptions online from AHPRA-registered Australian doctors.",
        url: "https://instantmed.com.au/prescriptions/request",
        mainEntity: {
          "@type": "MedicalProcedure",
          name: "Online Prescription Request",
          procedureType: "https://schema.org/NoninvasiveProcedure",
          howPerformed:
            "Submit your medication details online. An Australian GP reviews and issues an e-script if appropriate.",
        },
        provider: {
          "@type": "MedicalBusiness",
          name: "InstantMed",
          url: "https://instantmed.com.au",
          priceRange: "$24.95",
        },
        offers: {
          "@type": "Offer",
          price: "24.95",
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Can I get a prescription online in Australia?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. AHPRA-registered doctors can issue prescriptions online after reviewing your request. The doctor will assess whether a prescription is appropriate for your situation.",
            },
          },
          {
            "@type": "Question",
            name: "What medications can be prescribed online?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Many common medications can be prescribed online, including repeat medications. Some medications (like Schedule 8 controlled substances) require an in-person consultation.",
            },
          },
          {
            "@type": "Question",
            name: "How do I receive my prescription?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "If approved, you'll receive an electronic prescription (eScript) via SMS and email. You can take this to any pharmacy in Australia.",
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://instantmed.com.au" },
          { "@type": "ListItem", position: 2, name: "Prescriptions", item: "https://instantmed.com.au/prescriptions" },
          {
            "@type": "ListItem",
            position: 3,
            name: "Request",
            item: "https://instantmed.com.au/prescriptions/request",
          },
        ],
      },
    ],
  }

  return (
    <Script
      id="prescription-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default async function PrescriptionRequestPage() {
  const user = await getCurrentUser()
  const profile = user ? await getUserProfile(user.id) : null
  const flags = await getFeatureFlags()

  // Show disabled state if repeat scripts are turned off
  if (flags.disable_repeat_scripts) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <ServiceDisabledBanner
            serviceName="Repeat Prescriptions"
            alternativeService={{
              name: "Online Consultation",
              href: "/consult/request",
            }}
          />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <>
      <PrescriptionJsonLd />
      <PrescriptionFlowClient
        patientId={profile?.id || null}
        isAuthenticated={!!user}
        needsOnboarding={!!user && !profile}
        userEmail={user?.email ?? undefined}
        userName={profile?.full_name || user?.user_metadata?.full_name}
      />
    </>
  )
}
