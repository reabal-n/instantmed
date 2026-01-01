import { getCurrentUser, getUserProfile } from "@/lib/auth"
import { ConsultFlowClient } from "./consult-flow-client"
import { getFeatureFlags } from "@/lib/feature-flags"
import { ServiceDisabledBanner } from "@/components/service-disabled-banner"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Book a General Consult Online | Australian GP | InstantMed",
  description:
    "Book an online consultation with an Australian GP. New prescriptions, complex health concerns, and comprehensive assessments. $44.95 flat fee.",
  keywords: [
    "online doctor consultation australia",
    "telehealth consultation",
    "online gp australia",
    "new prescription online",
    "doctor consultation online",
  ],
  openGraph: {
    title: "Book a General Consult Online | InstantMed Australia",
    description:
      "Speak with an Australian GP online. New prescriptions, complex health concerns, referrals. $44.95 flat fee.",
    url: "https://instantmed.com.au/consult/request",
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
  },
  alternates: {
    canonical: "https://instantmed.com.au/consult/request",
  },
}

function ConsultJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalWebPage",
        name: "Online General Consultation",
        description: "Book an online consultation with AHPRA-registered Australian doctors.",
        url: "https://instantmed.com.au/consult/request",
        provider: {
          "@type": "MedicalBusiness",
          name: "InstantMed",
          url: "https://instantmed.com.au",
          priceRange: "$44.95",
        },
        offers: {
          "@type": "Offer",
          price: "44.95",
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://instantmed.com.au" },
          { "@type": "ListItem", position: 2, name: "General Consult", item: "https://instantmed.com.au/consult" },
          {
            "@type": "ListItem",
            position: 3,
            name: "Request",
            item: "https://instantmed.com.au/consult/request",
          },
        ],
      },
    ],
  }

  return (
    <Script
      id="consult-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default async function ConsultRequestPage() {
  const user = await getCurrentUser()
  const profile = user ? await getUserProfile(user.id) : null
  const flags = await getFeatureFlags()

  // Show disabled state if consults are turned off
  if (flags.disable_consults) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <ServiceDisabledBanner
            serviceName="Online Consultations"
            alternativeService={{
              name: "Medical Certificate",
              href: "/medical-certificate/request",
            }}
          />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <>
      <ConsultJsonLd />
      <ConsultFlowClient
        patientId={profile?.id || null}
        isAuthenticated={!!user}
        needsOnboarding={!!user && !profile}
        userEmail={user?.email ?? undefined}
        userName={profile?.full_name || user?.user_metadata?.full_name}
      />
    </>
  )
}
