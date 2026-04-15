import type { Metadata } from "next"

import { BreadcrumbSchema } from "@/components/seo"

// Revalidate every 24 hours - trust content is mostly static
export const revalidate = 86400

export const metadata: Metadata = {
  title: { absolute: "Why Trust InstantMed? | AHPRA Registered Doctors" },
  description:
    "Doctor verification, data security and Medicare compliance. 100% Australian-based with AHPRA-registered doctors. Bank-level encryption.",
  keywords: [
    "AHPRA registered telehealth",
    "Australian online doctor",
    "telehealth security",
    "Medicare compliant telehealth",
    "verified online doctors Australia",
    "telehealth trust safety",
    "legitimate online doctor Australia",
  ],
  openGraph: {
    title: "Why Trust InstantMed? | AHPRA Registered Doctors",
    description:
      "Learn about our doctor verification process, data security, and Medicare compliance. 100% Australian-based with AHPRA registered doctors.",
    type: "website",
    url: "https://instantmed.com.au/trust",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why Trust InstantMed? | AHPRA Registered Doctors",
    description: "100% Australian-based with AHPRA registered doctors. Bank-level security. Full transparency.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/trust",
  },
}

/**
 * /trust layout - BreadcrumbSchema only.
 *
 * Previously ALSO emitted FAQSchema - but trust-client.tsx emits its own
 * FAQPage JSON-LD inline (with the full trustFAQs data), creating a
 * duplicate FAQPage on the same URL. GSC flagged this as critical
 * 2026-04-06. Removed from layout in the same fix as /general-consult
 * and /pricing (commit: duplicate FAQPage sweep).
 */
export default function TrustLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Trust & Safety", url: "https://instantmed.com.au/trust" }
        ]}
      />
      {children}
    </>
  )
}
