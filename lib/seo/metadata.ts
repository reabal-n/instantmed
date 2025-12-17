/**
 * SEO Metadata Utilities
 * 
 * Helpers for generating consistent metadata across pages.
 */

import type { Metadata } from "next"

const SITE_NAME = "InstantMed"
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
const DEFAULT_DESCRIPTION = "Get medical certificates and prescriptions online. Reviewed by AHPRA-registered Australian doctors. Fast, secure, and Medicare-friendly."

interface PageMetadataOptions {
  title: string
  description?: string
  keywords?: string[]
  image?: string
  noIndex?: boolean
  canonical?: string
}

/**
 * Generate consistent page metadata
 */
export function generatePageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  image,
  noIndex = false,
  canonical,
}: PageMetadataOptions): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`
  const ogImage = image || `${SITE_URL}/og-default.png`
  
  return {
    title: fullTitle,
    description,
    keywords: [
      "telehealth",
      "medical certificate",
      "prescription",
      "online doctor",
      "Australia",
      ...keywords,
    ],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    
    // Robots
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    
    // Canonical URL
    ...(canonical && {
      alternates: {
        canonical: canonical.startsWith("http") ? canonical : `${SITE_URL}${canonical}`,
      },
    }),
    
    // Open Graph
    openGraph: {
      type: "website",
      locale: "en_AU",
      url: SITE_URL,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    
    // Twitter
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  }
}

/**
 * Generate service page metadata
 */
export function generateServiceMetadata(
  serviceName: string,
  serviceDescription: string,
  keywords: string[] = []
): Metadata {
  return generatePageMetadata({
    title: serviceName,
    description: serviceDescription,
    keywords: [serviceName.toLowerCase(), ...keywords],
    canonical: `/${serviceName.toLowerCase().replace(/\s+/g, "-")}`,
  })
}

/**
 * Generate blog post metadata
 */
export function generateBlogMetadata(
  title: string,
  excerpt: string,
  slug: string,
  image?: string,
  publishedAt?: string
): Metadata {
  const metadata = generatePageMetadata({
    title,
    description: excerpt,
    image,
    keywords: ["health", "medical", "australia"],
    canonical: `/blog/${slug}`,
  })
  
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      ...(publishedAt && { publishedTime: publishedAt }),
    },
  }
}

/**
 * Default metadata for the site
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "telehealth",
    "medical certificate",
    "prescription",
    "online doctor",
    "Australia",
    "Medicare",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
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
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
  verification: {
    // Add verification codes when available
    // google: 'verification-code',
  },
}
