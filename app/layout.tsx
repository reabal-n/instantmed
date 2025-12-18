import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Lora, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { WebVitalsReporter } from "@/lib/analytics/web-vitals"
import { Toaster } from "@/components/ui/sonner"
import { SocialProofPopup } from "@/components/shared/social-proof-popup"
import { StickyCTABar } from "@/components/shared/sticky-cta-bar"
import { SkipToContent } from "@/components/shared/skip-to-content"
import { ParticleParallaxBackground } from "@/components/effects/particle-parallax-background"
import { ThemeProvider } from "next-themes"
import { HeroUIProviderWrapper } from "@/components/providers/heroui-provider"
import { OrganizationSchema, ReviewAggregateSchema } from "@/components/seo/healthcare-schema"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "InstantMed - Online Doctor Consultations Australia | Med Certs & Scripts",
    template: "%s | InstantMed",
  },
  description:
    "Get medical certificates and prescriptions online from AHPRA-registered Australian GPs. Same-day response, 7 days a week. No waiting rooms, no hold music.",
  keywords: [
    "online doctor Australia",
    "telehealth Australia",
    "medical certificate online",
    "online prescription",
    "GP online",
    "sick certificate",
    "repeat prescription online",
    "telehealth GP",
    "virtual doctor",
    "InstantMed",
  ],
  authors: [{ name: "InstantMed" }],
  creator: "InstantMed",
  publisher: "InstantMed",
  metadataBase: new URL("https://instantmed.com.au"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://instantmed.com.au",
    siteName: "InstantMed",
    title: "InstantMed - Online Doctor Consultations Australia",
    description:
      "Medical certificates and scripts — handled in minutes. AHPRA-registered Australian GPs available 7 days.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "InstantMed - Instant care. Real doctors. Zero nonsense.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantMed - Online Doctor Consultations Australia",
    description: "Medical certificates and scripts — handled in minutes by real Australian GPs.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
}

function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "InstantMed",
    description: "Online telehealth consultations with Australian-registered GPs",
    url: "https://instantmed.com.au",
    logo: "https://instantmed.com.au/logo.png",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressCountry: "AU",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -33.8688,
      longitude: 151.2093,
    },
    areaServed: {
      "@type": "Country",
      name: "Australia",
    },
    serviceType: ["Telehealth", "Online Medical Consultation", "Medical Certificates", "Prescriptions"],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "200",
      bestRating: "5",
      worstRating: "1",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <JsonLd />
        <OrganizationSchema />
        <ReviewAggregateSchema ratingValue={4.9} reviewCount={200} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <HeroUIProviderWrapper>
            <ParticleParallaxBackground intensity="medium" />
            <SkipToContent />
            <div id="main-content" className="page-enter relative">
              {children}
            </div>
            <Toaster position="top-center" richColors />
            <SocialProofPopup />
            <StickyCTABar />
            <Analytics />
            <WebVitalsReporter />
          </HeroUIProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
