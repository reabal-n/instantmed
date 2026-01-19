import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Why Trust InstantMed? | AHPRA Registered Doctors",
  description:
    "Learn about our doctor verification process, data security, Medicare compliance, and how we ensure safe, legitimate telehealth consultations. 100% Australian-based with AHPRA registered doctors.",
  keywords: [
    "AHPRA registered telehealth",
    "Australian online doctor",
    "telehealth security",
    "Medicare compliant telehealth",
    "verified online doctors Australia",
  ],
  openGraph: {
    title: "Why Trust InstantMed? | AHPRA Registered Doctors",
    description:
      "Learn about our doctor verification process, data security, and Medicare compliance. 100% Australian-based with AHPRA registered doctors.",
    type: "website",
    url: "https://instantmed.com.au/trust",
  },
  other: {
    "link:preconnect:unsplash": "https://images.unsplash.com",
  },
}

export function generateViewport() {
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    ],
  }
}
