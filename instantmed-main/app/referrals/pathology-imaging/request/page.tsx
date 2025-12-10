import { Suspense } from "react"
import type { Metadata } from "next"
import { PathologyImagingFlowClient } from "./pathology-imaging-flow-client"
import { getCurrentUser, getUserProfile } from "@/lib/auth"
import { Loader2 } from "lucide-react"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Online Pathology & Imaging Referral Australia | Blood Tests & Scans | InstantMed",
  description:
    "Request pathology and imaging referrals online. Blood tests, X-rays, ultrasounds, CT and MRI referrals from Australian GPs. Same-day, no phone call needed. From $34.95.",
  keywords: [
    "online pathology referral",
    "blood test referral online",
    "pathology request online",
    "online blood test order",
    "imaging referral online",
    "x-ray referral online",
    "ultrasound referral online",
    "CT scan referral online",
    "MRI referral online",
    "radiology referral australia",
  ],
  openGraph: {
    title: "Online Pathology & Imaging Referral | InstantMed Australia",
    description:
      "Request blood tests, X-rays, ultrasounds, CT and MRI referrals online. GP-reviewed same-day. Medicare eligible.",
    url: "https://instantmed.com.au/referrals/pathology-imaging/request",
    siteName: "InstantMed",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Pathology & Imaging Referral | InstantMed",
    description: "Request blood tests and imaging referrals online. Reviewed by Australian GPs.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/referrals/pathology-imaging/request",
  },
}

function PathologyImagingJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalWebPage",
        name: "Online Pathology & Imaging Referral",
        description: "Request pathology and imaging referrals from AHPRA-registered Australian doctors.",
        url: "https://instantmed.com.au/referrals/pathology-imaging/request",
        mainEntity: {
          "@type": "MedicalProcedure",
          name: "Online Pathology & Imaging Referral Request",
          procedureType: "https://schema.org/NoninvasiveProcedure",
          howPerformed:
            "Submit your test requirements online. An Australian GP reviews and issues a referral if appropriate.",
        },
        provider: {
          "@type": "MedicalBusiness",
          name: "InstantMed",
          url: "https://instantmed.com.au",
          priceRange: "$34.95-$39.95",
        },
        offers: {
          "@type": "Offer",
          price: "34.95",
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Can I get a blood test referral online?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. You can request a pathology referral online and an AHPRA-registered doctor will review your request. If appropriate, they'll issue a referral you can take to any pathology collection centre.",
            },
          },
          {
            "@type": "Question",
            name: "Which pathology tests can be requested?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Common tests include full blood count, liver function, kidney function, thyroid, cholesterol, iron studies, diabetes screening, and STI tests. The doctor will assess whether the requested tests are appropriate.",
            },
          },
          {
            "@type": "Question",
            name: "Can I get an X-ray or ultrasound referral online?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. You can request imaging referrals for X-rays, ultrasounds, CT scans, and MRIs. The doctor will review your request and determine if a referral is appropriate.",
            },
          },
          {
            "@type": "Question",
            name: "Where can I get my tests done?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You can take your referral to any pathology collection centre or radiology clinic in Australia, including Laverty, Douglass Hanly Moir, QML, and others.",
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://instantmed.com.au" },
          { "@type": "ListItem", position: 2, name: "Referrals", item: "https://instantmed.com.au/referrals" },
          {
            "@type": "ListItem",
            position: 3,
            name: "Pathology & Imaging",
            item: "https://instantmed.com.au/referrals/pathology-imaging",
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "Request",
            item: "https://instantmed.com.au/referrals/pathology-imaging/request",
          },
        ],
      },
    ],
  }

  return (
    <Script
      id="pathology-imaging-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

async function FlowLoader() {
  const user = await getCurrentUser()
  const profile = user ? await getUserProfile(user.id) : null

  return (
    <PathologyImagingFlowClient
      patientId={profile?.id || null}
      isAuthenticated={!!user}
      needsOnboarding={!!user && !profile}
      userEmail={user?.email}
      userName={profile?.full_name || user?.user_metadata?.full_name}
    />
  )
}

export default function PathologyImagingRequestPage() {
  return (
    <>
      <PathologyImagingJsonLd />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <FlowLoader />
      </Suspense>
    </>
  )
}
