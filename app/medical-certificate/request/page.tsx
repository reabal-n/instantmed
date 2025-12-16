import { MedCertForm } from "./med-cert-form"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Get a Medical Certificate Online | Same Day | InstantMed Australia",
  description:
    "Request an online medical certificate from an Australian registered GP. Reviewed by real doctors, delivered to your inbox in under 1 hour. Valid for work, university, or carer's leave. Only $24.99.",
  keywords: [
    "online medical certificate",
    "medical certificate australia",
    "same day medical certificate",
    "medical certificate for work",
    "medical certificate for uni",
    "medical certificate for university",
    "sick certificate online",
    "doctor certificate online",
    "carer's leave certificate",
    "telehealth certificate",
    "GP certificate online",
  ],
  openGraph: {
    title: "Get a Medical Certificate Online | Same Day | InstantMed",
    description:
      "Australian GP-reviewed medical certificates in under 1 hour. For work, uni or carer's leave. No phone calls needed.",
    url: "https://instantmed.com.au/medical-certificate/request",
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
    images: [
      {
        url: "/og-medical-certificate.png",
        width: 1200,
        height: 630,
        alt: "Get an Online Medical Certificate - InstantMed",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Get a Medical Certificate Online | InstantMed",
    description: "Same day medical certificates from Australian GPs. Valid for work, uni or carer's leave.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/medical-certificate/request",
  },
}

function MedCertJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: "Online Medical Certificate",
    description:
      "Get a medical certificate from an Australian registered GP online. Valid for work, university, or carer's leave.",
    url: "https://instantmed.com.au/medical-certificate/request",
    mainEntity: {
      "@type": "MedicalProcedure",
      name: "Online Medical Certificate Request",
      procedureType: "https://schema.org/NoninvasiveProcedure",
      howPerformed: "A registered Australian doctor reviews your request online and issues a medical certificate.",
      preparation: "Complete the online form with your symptoms and details.",
      followup: "Certificate delivered to your email inbox.",
    },
    provider: {
      "@type": "MedicalBusiness",
      name: "InstantMed",
      url: "https://instantmed.com.au",
      logo: "https://instantmed.com.au/logo.png",
      address: {
        "@type": "PostalAddress",
        addressCountry: "AU",
      },
      priceRange: "$24.99",
    },
    offers: {
      "@type": "Offer",
      price: "24.99",
      priceCurrency: "AUD",
      availability: "https://schema.org/InStock",
      validFrom: "2024-01-01",
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://instantmed.com.au",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Medical Certificate",
          item: "https://instantmed.com.au/medical-certificate",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Request",
          item: "https://instantmed.com.au/medical-certificate/request",
        },
      ],
    },
  }

  return (
    <Script
      id="med-cert-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default async function MedCertRequestPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  return (
    <>
      <MedCertJsonLd />
      <MedCertForm
        patientId={authUser?.profile?.id || null}
        isAuthenticated={!!authUser}
        needsOnboarding={authUser?.profile ? !authUser.profile.onboarding_completed : true}
        userEmail={authUser?.user?.email}
        userName={authUser?.profile?.full_name || authUser?.user?.user_metadata?.full_name}
      />
    </>
  )
}
