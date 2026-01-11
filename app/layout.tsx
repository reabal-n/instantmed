import type React from "react"
import type { Metadata, Viewport } from "next"
import { Source_Sans_3, Lora, JetBrains_Mono, Caveat } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { WebVitalsReporter } from "@/lib/analytics/web-vitals"
import { Toaster } from "@/components/ui/sonner"
import { SocialProofPopup } from "@/components/shared/social-proof-popup"
import { StickyCTABar } from "@/components/shared/sticky-cta-bar"
import { SkipToContent } from "@/components/shared/skip-to-content"
import { SkyBackground } from "@/components/ui/sky-background"
import { NightSkyBackground } from "@/components/ui/night-sky-background"
import { ThemeProvider } from "next-themes"
import { HeroUIProviderWrapper } from "@/components/providers/heroui-provider"
import { SupabaseAuthProvider } from "@/components/providers/supabase-auth-provider"
import { OrganizationSchema, ReviewAggregateSchema } from "@/components/seo/healthcare-schema"
import { PostHogIdentify } from "@/components/analytics/posthog-identify"
import Script from "next/script"
import "./globals.css"

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwritten",
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: {
    default: "Lumen Health - Online Doctor Consultations Australia | Med Certs & Scripts",
    template: "%s | Lumen Health",
  },
  description:
    "An asynchronous telehealth platform for Australians to get medical certificates ($19.95), repeat prescriptions ($29.95), and new consultations ($49.95) online. AHPRA-registered doctors review requests asynchronously (no video calls). Mobile-optimized, Medicare-friendly, with built-in safety features and secure payment processing.",
  keywords: [
    "online doctor Australia",
    "telehealth Australia",
    "medical certificate online",
    "online doctor consultation",
    "GP online",
    "sick certificate",
    "repeat request online",
    "telehealth GP",
    "virtual doctor",
    "Lumen Health",
  ],
  authors: [{ name: "Lumen Health" }],
  creator: "Lumen Health",
  publisher: "Lumen Health",
  metadataBase: new URL("https://lumenhealth.com.au"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://lumenhealth.com.au",
    siteName: "Lumen Health",
    title: "Lumen Health - Online Doctor Consultations Australia",
    description:
      "An asynchronous telehealth platform for Australians. Get medical certificates ($19.95), repeat prescriptions ($29.95), and new consultations ($49.95) reviewed by AHPRA-registered doctors. No video calls, mobile-optimized, Medicare-friendly.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lumen Health - Radiant care. Real doctors. Zero nonsense.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumen Health - Online Doctor Consultations Australia",
    description: "Asynchronous telehealth platform for Australians. Medical certificates ($19.95), prescriptions ($29.95), and consultations ($49.95) reviewed by AHPRA-registered doctors. No video calls required.",
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
    // Google Search Console verification code
    // Get it from: https://search.google.com/search-console
    // Property Settings → Ownership verification → HTML tag method
    // Copy the content value from the meta tag
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
  },
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#F5A962",
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
    name: "Lumen Health",
    description: "Online telehealth consultations with Australian-registered GPs",
    url: "https://lumenhealth.com.au",
    logo: "https://lumenhealth.com.au/logo.png",
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
    serviceType: ["Telehealth", "Online Medical Consultation", "Medical Certificates", "Doctor Consultations"],
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
      className={`${sourceSans.variable} ${lora.variable} ${jetbrainsMono.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17795889471"
          strategy="afterInteractive"
        />
        <Script id="google-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17795889471');
          `}
        </Script>
        <JsonLd />
        <OrganizationSchema />
        <ReviewAggregateSchema ratingValue={4.9} reviewCount={200} />
      </head>
      <body className="font-sans antialiased text-foreground" style={{ background: 'transparent' }}>
        <SupabaseAuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <HeroUIProviderWrapper>
              <SkyBackground fullPage />
              <NightSkyBackground starCount={100} showShootingStars />
              <SkipToContent />
              <div id="main-content" className="page-enter relative z-10">
                {children}
              </div>
              <Toaster position="top-center" richColors />
              <SocialProofPopup />
              <StickyCTABar />
              <Analytics />
              <WebVitalsReporter />
              <PostHogIdentify />
            </HeroUIProviderWrapper>
          </ThemeProvider>
        </SupabaseAuthProvider>
      </body>
    </html>
  )
}
