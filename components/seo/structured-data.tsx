/**
 * Schema.org Structured Data Components
 * 
 * Provides JSON-LD structured data for SEO rich snippets in Google.
 * Includes MedicalBusiness, LocalBusiness, FAQPage, and Service schemas.
 */

import Script from "next/script"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"
const BUSINESS_NAME = "InstantMed"

/**
 * Organization schema - base identity
 */
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BUSINESS_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/branding/logo.png`,
      width: 512,
      height: 512,
    },
    sameAs: [
      // Add social media URLs when available
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "support@instantmed.com.au",
      availableLanguage: "English",
    },
  }

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

/**
 * MedicalBusiness schema - telehealth-specific
 */
export function MedicalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": `${SITE_URL}/#medicalbusiness`,
    name: BUSINESS_NAME,
    description: "Australian telehealth platform providing online medical certificates, prescription renewals, and doctor consultations. AHPRA-registered doctors available 7 days a week.",
    url: SITE_URL,
    telephone: "+61-support", // Update with actual phone if available
    email: "support@instantmed.com.au",
    logo: `${SITE_URL}/branding/logo.png`,
    image: `${SITE_URL}/og-image.jpg`,
    priceRange: "$$",
    currenciesAccepted: "AUD",
    paymentAccepted: "Credit Card, Debit Card",
    areaServed: {
      "@type": "Country",
      name: "Australia",
    },
    serviceArea: {
      "@type": "GeoShape",
      name: "Australia-wide telehealth services",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "AU",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -33.8688,
      longitude: 151.2093,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    ],
    medicalSpecialty: [
      "General Practice",
      "Telemedicine",
    ],
    availableService: [
      {
        "@type": "MedicalProcedure",
        name: "Medical Certificate",
        description: "Online medical certificates for work or study, reviewed by AHPRA-registered doctors",
      },
      {
        "@type": "MedicalProcedure",
        name: "Prescription Renewal",
        description: "Repeat prescription requests for existing medications",
      },
      {
        "@type": "MedicalProcedure",
        name: "Online Consultation",
        description: "Text-based consultations with Australian doctors",
      },
    ],
  }

  return (
    <Script
      id="medical-business-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

/**
 * LocalBusiness schema for local SEO
 */
export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: BUSINESS_NAME,
    description: "Online telehealth platform serving all of Australia. Get medical certificates, prescription renewals, and doctor consultations from your phone.",
    url: SITE_URL,
    image: `${SITE_URL}/og-image.jpg`,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressCountry: "AU",
      addressRegion: "Australia-wide",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -33.8688,
      longitude: 151.2093,
    },
    openingHours: "Mo-Su 00:00-23:59",
    telephone: "+61-support",
  }

  return (
    <Script
      id="local-business-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

/**
 * Service schema for specific service pages
 */
interface ServiceSchemaProps {
  name: string
  description: string
  url: string
  price?: string
  priceCurrency?: string
}

export function ServiceSchema({ name, description, url, price, priceCurrency = "AUD" }: ServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: `${SITE_URL}${url}`,
    provider: {
      "@type": "MedicalBusiness",
      "@id": `${SITE_URL}/#medicalbusiness`,
      name: BUSINESS_NAME,
    },
    areaServed: {
      "@type": "Country",
      name: "Australia",
    },
    ...(price && {
      offers: {
        "@type": "Offer",
        price,
        priceCurrency,
        availability: "https://schema.org/InStock",
      },
    }),
  }

  return (
    <Script
      id={`service-schema-${name.toLowerCase().replace(/\s/g, "-")}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

/**
 * FAQPage schema for FAQ sections
 */
interface FAQItem {
  question: string
  answer: string
}

interface FAQPageSchemaProps {
  faqs: FAQItem[]
  pageUrl?: string
}

export function FAQPageSchema({ faqs, pageUrl }: FAQPageSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
    ...(pageUrl && { url: `${SITE_URL}${pageUrl}` }),
  }

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

/**
 * BreadcrumbList schema for navigation
 */
interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  }

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

/**
 * WebSite schema with search action
 */
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BUSINESS_NAME,
    url: SITE_URL,
    description: "Australian telehealth platform for medical certificates, prescription renewals, and online doctor consultations",
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  )
}

/**
 * Combined schema component for the main layout
 * Include this in your root layout for site-wide SEO
 */
export function SiteStructuredData() {
  return (
    <>
      <OrganizationSchema />
      <MedicalBusinessSchema />
      <WebSiteSchema />
    </>
  )
}

/**
 * Medical Certificate page specific schema
 */
export function MedicalCertificateSchema() {
  return (
    <>
      <ServiceSchema
        name="Online Medical Certificate"
        description="Get a medical certificate for work or study reviewed by an AHPRA-registered Australian doctor. Most requests processed within an hour."
        url="/medical-certificate"
        price="24.95"
      />
      <FAQPageSchema
        faqs={[
          {
            question: "How quickly can I get a medical certificate?",
            answer: "Most medical certificate requests are reviewed within an hour during business hours. You'll receive your certificate via email once approved.",
          },
          {
            question: "Is the medical certificate valid for work?",
            answer: "Yes, our medical certificates are issued by AHPRA-registered Australian doctors and are valid for employers and educational institutions.",
          },
          {
            question: "Can I get a backdated medical certificate?",
            answer: "Medical certificates cannot be backdated. The certificate start date will be from when you submit your request.",
          },
          {
            question: "What if my request is not approved?",
            answer: "If a doctor cannot issue a certificate based on your request, you'll receive a full refund. No certificate, no charge.",
          },
        ]}
        pageUrl="/medical-certificate"
      />
    </>
  )
}

/**
 * Prescription page specific schema
 */
export function PrescriptionSchema() {
  return (
    <>
      <ServiceSchema
        name="Prescription Renewal"
        description="Request a repeat prescription for your existing medication. Reviewed by AHPRA-registered doctors."
        url="/prescriptions"
        price="19.95"
      />
      <FAQPageSchema
        faqs={[
          {
            question: "Can I get any prescription renewed online?",
            answer: "We can renew most ongoing medications where you have an established history. Some medications like Schedule 8 controlled substances cannot be prescribed via telehealth.",
          },
          {
            question: "Do I need to have been prescribed this medication before?",
            answer: "Yes, prescription renewals are for medications you're currently taking and have been prescribed by a doctor previously.",
          },
          {
            question: "How do I receive my prescription?",
            answer: "You'll receive an electronic prescription (eScript) via SMS or email that you can take to any pharmacy in Australia.",
          },
        ]}
        pageUrl="/prescriptions"
      />
    </>
  )
}
