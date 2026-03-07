/**
 * Automated Metadata Generation
 * Auto-generates SEO metadata for all page types
 * 
 * Ensures:
 * - Unique titles and descriptions
 * - Proper keyword inclusion
 * - Character limit compliance
 * - Open Graph optimization
 * - Twitter card setup
 */

import type { Metadata } from 'next'
import type { SEOPage, PageType, MedicationPageData as _MedicationPageData, IntentPageData as _IntentPageData } from './registry'
import { getCanonicalUrl, getRobotsConfig, isMedicationPage, isIntentPage } from './registry'
import { PRICING_DISPLAY } from "@/lib/constants"

// ============================================
// TITLE TEMPLATES
// ============================================

const TITLE_TEMPLATES: Record<PageType, (page: SEOPage) => string> = {
  medication: (page) => {
    if (!isMedicationPage(page)) return `${page.h1} | InstantMed`
    const brandInfo = page.medication.brandNames?.length > 0 
      ? ` (${page.medication.brandNames[0]})` 
      : ''
    return `${page.medication.genericName || page.h1}${brandInfo} Online Australia | Prescription | InstantMed`
  },
  
  condition: (page) => {
    return `${page.h1} Treatment Online Australia | ${extractPrimaryKeyword(page)} | InstantMed`
  },
  
  intent: (page) => {
    if (!isIntentPage(page)) return `${page.h1} | InstantMed`
    const urgency = page.intent.urgency === 'immediate' ? 'Urgent ' : ''
    return `${urgency}${page.h1} | Online Doctors Australia | InstantMed`
  },
  
  'category-hub': (page) => {
    return `${page.h1} | Online Doctor Services | InstantMed`
  },
  
  audience: (page) => {
    return `${page.h1} | Medical Certificates & Prescriptions | InstantMed`
  },
  
  symptom: (page) => {
    return `${page.h1} | Causes & Treatment Options | InstantMed`
  },
  
  comparison: (page) => {
    return `${page.h1} | Compare Treatments | InstantMed`
  },
  
  location: (page) => {
    return `Online Doctor ${page.h1} | Telehealth Services | InstantMed`
  },
  
  certificate: (page) => {
    return `${page.h1} | Medical Certificate Online | InstantMed`
  },
  
  benefit: (page) => {
    return `${page.h1} | Why Choose InstantMed`
  },
  
  resource: (page) => {
    return `${page.h1} | Guide | InstantMed`
  },
}

// ============================================
// DESCRIPTION TEMPLATES
// ============================================

const DESCRIPTION_TEMPLATES: Record<PageType, (page: SEOPage) => string> = {
  medication: (page) => {
    if (!isMedicationPage(page)) return page.content.intro.substring(0, 155)
    const use = page.clinicalInfo?.uses?.[0] || 'various conditions'
    const turnaround = page.consultInfo?.turnaroundTime || '24 hours'
    return `Get ${page.medication.genericName || page.slug} prescribed online for ${use}. Australian doctors review within ${turnaround}. E-script sent to your phone. From ${page.consultInfo?.pricing || PRICING_DISPLAY.REPEAT_SCRIPT}.`
  },
  
  condition: (page) => {
    return `${page.content.intro.substring(0, 120)}... Online treatment from Australian doctors. Same-day assessment available.`
  },
  
  intent: (page) => {
    if (!isIntentPage(page)) return page.content.intro.substring(0, 155)
    return `${page.intent.userNeed}. ${page.content.intro.substring(0, 100)}... Australian doctors available 7 days.`
  },
  
  'category-hub': (page) => {
    return `${page.content.intro.substring(0, 140)}... AHPRA-registered Australian doctors available 7 days.`
  },
  
  audience: (page) => {
    return `Medical certificates and prescriptions online for ${page.slug.replace(/-/g, ' ')}. Fast, convenient, and employer-accepted. From ${PRICING_DISPLAY.MED_CERT}.`
  },
  
  symptom: (page) => {
    return `Experiencing ${page.slug.replace(/-/g, ' ')}? Learn about causes, when to seek help, and treatment options available online.`
  },
  
  comparison: (page) => {
    return `Compare ${page.slug.replace(/-vs-/g, ' vs ')}. Understand differences, effectiveness, side effects, and which option may be right for you.`
  },
  
  location: (page) => {
    return `Online doctor services in ${page.slug}. Medical certificates, prescriptions, and consultations from Australian GPs. No need to visit a clinic.`
  },
  
  certificate: (page) => {
    return `Get a ${page.slug.replace(/-/g, ' ')} online. Valid for employers and universities. Issued by Australian doctors within hours.`
  },
  
  benefit: (page) => {
    return page.content.intro.substring(0, 155)
  },
  
  resource: (page) => {
    return page.content.intro.substring(0, 155)
  },
}

// ============================================
// KEYWORD GENERATORS
// ============================================

function generateKeywords(page: SEOPage): string[] {
  const baseKeywords = page.metadata.keywords || []
  const generatedKeywords: string[] = []
  
  // Add page type keywords
  if (page.type === 'medication') {
    generatedKeywords.push(
      `${page.slug} online`,
      `${page.slug} prescription`,
      `${page.slug} australia`,
      `${page.slug} telehealth`,
    )
  } else if (page.type === 'condition') {
    generatedKeywords.push(
      `${page.slug} treatment online`,
      `${page.slug} online doctor`,
      `${page.slug} telehealth`,
      `treat ${page.slug} online`,
    )
  } else if (isIntentPage(page)) {
    generatedKeywords.push(...(page.intent.alternateQueries || []))
  }
  
  // Combine and deduplicate
  return [...new Set([...baseKeywords, ...generatedKeywords])]
}

// ============================================
// MAIN METADATA GENERATOR
// ============================================

export function generateMetadata(page: SEOPage): Metadata {
  const canonical = getCanonicalUrl(page)
  const robotsConfig = getRobotsConfig(page)
  
  // Generate title
  const titleGenerator = TITLE_TEMPLATES[page.type]
  const title = page.title || titleGenerator(page)
  
  // Ensure title length is optimal (50-60 chars)
  const optimizedTitle = optimizeTitleLength(title)
  
  // Generate description
  const descGenerator = DESCRIPTION_TEMPLATES[page.type]
  const description = page.description || descGenerator(page)
  
  // Ensure description length is optimal (150-160 chars)
  const optimizedDescription = optimizeDescriptionLength(description)
  
  // Generate keywords
  const keywords = generateKeywords(page)
  
  // Generate Open Graph image URL
  const ogImage = generateOGImageUrl(page)
  
  return {
    title: optimizedTitle,
    description: optimizedDescription,
    keywords,
    
    robots: {
      index: robotsConfig.index,
      follow: robotsConfig.follow,
      googleBot: {
        index: robotsConfig.index,
        follow: robotsConfig.follow,
        'max-image-preview': robotsConfig.maxImagePreview || 'large',
        'max-snippet': robotsConfig.maxSnippet || 160,
        'max-video-preview': robotsConfig.maxVideoPreview || -1,
      },
    },
    
    alternates: {
      canonical,
    },
    
    openGraph: {
      type: 'website',
      locale: 'en_AU',
      url: canonical,
      siteName: 'InstantMed',
      title: optimizedTitle,
      description: optimizedDescription,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: optimizedTitle,
        },
      ],
    },
    
    twitter: {
      card: 'summary_large_image',
      title: optimizedTitle,
      description: optimizedDescription,
      images: [ogImage],
    },
    
    other: {
      'author': 'InstantMed',
      'publication': 'InstantMed',
    },
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractPrimaryKeyword(page: SEOPage): string {
  if (page.metadata.keywords && page.metadata.keywords.length > 0) {
    return page.metadata.keywords[0]
  }
  return page.slug.split('-').slice(0, 2).join(' ')
}

function optimizeTitleLength(title: string, maxLength: number = 60): string {
  if (title.length <= maxLength) return title
  
  // Try to cut at word boundary
  const cutTitle = title.substring(0, maxLength)
  const lastSpace = cutTitle.lastIndexOf(' ')
  
  if (lastSpace > maxLength * 0.8) {
    return cutTitle.substring(0, lastSpace) + '...'
  }
  
  return cutTitle + '...'
}

function optimizeDescriptionLength(description: string, maxLength: number = 160): string {
  if (description.length <= maxLength) return description
  
  // Try to cut at sentence boundary
  const cutDesc = description.substring(0, maxLength)
  const lastPeriod = cutDesc.lastIndexOf('.')
  const lastSpace = cutDesc.lastIndexOf(' ')
  
  if (lastPeriod > maxLength * 0.7) {
    return cutDesc.substring(0, lastPeriod + 1)
  }
  
  if (lastSpace > maxLength * 0.85) {
    return cutDesc.substring(0, lastSpace) + '...'
  }
  
  return cutDesc + '...'
}

function generateOGImageUrl(page: SEOPage): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://instantmed.com.au'
  
  // Uses page-type specific default images for MVP
  // Future: implement dynamic OG image generation via Vercel OG or similar
  const imageMap: Record<PageType, string> = {
    medication: '/og-medication.png',
    condition: '/og-condition.png',
    intent: '/og-urgent.png',
    'category-hub': '/og-category.png',
    audience: '/og-audience.png',
    symptom: '/og-symptom.png',
    comparison: '/og-compare.png',
    location: '/og-location.png',
    certificate: '/og-certificate.png',
    benefit: '/og-benefit.png',
    resource: '/og-resource.png',
  }
  
  return `${baseUrl}${imageMap[page.type] || '/og-default.png'}`
}

// ============================================
// STRUCTURED DATA GENERATORS
// ============================================

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://instantmed.com.au'
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs
      .filter(b => b.url)
      .map((b, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: b.name,
        item: b.url.startsWith('http') ? b.url : `${baseUrl}${b.url}`,
      })),
  }
}

export function generateMedicalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: 'InstantMed',
    description: 'Online medical certificates and prescriptions from Australian doctors',
    url: 'https://instantmed.com.au',
    email: 'hello@instantmed.com.au',
    priceRange: PRICING_DISPLAY.RANGE,
    areaServed: {
      '@type': 'Country',
      name: 'Australia',
    },
    availableLanguage: ['English'],
    medicalSpecialty: ['Telemedicine', 'General Practice'],
    openingHours: 'Mo-Su 07:00-22:00',
  }
}

export interface DrugSchemaInput {
  genericName: string
  brandNames: string[]
  description?: string
  dosageForms: string[]
  commonDosages: string[]
}

export function generateDrugSchema(medication: DrugSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Drug',
    name: medication.genericName,
    alternateName: medication.brandNames,
    description: medication.description,
    administrationRoute: medication.dosageForms.join(', '),
    availableStrength: medication.commonDosages.map((d) => ({
      '@type': 'DrugStrength',
      description: d,
    })),
  }
}

// ============================================
// VALIDATION
// ============================================

export function validateMetadata(metadata: Metadata): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check title length
  const titleLength = metadata.title?.toString().length || 0
  if (titleLength === 0) {
    errors.push('Title is required')
  } else if (titleLength < 30) {
    warnings.push('Title is too short (< 30 chars)')
  } else if (titleLength > 60) {
    warnings.push('Title is too long (> 60 chars)')
  }
  
  // Check description length
  const descLength = metadata.description?.length || 0
  if (descLength === 0) {
    errors.push('Description is required')
  } else if (descLength < 120) {
    warnings.push('Description is too short (< 120 chars)')
  } else if (descLength > 160) {
    warnings.push('Description is too long (> 160 chars)')
  }
  
  // Check keywords
  if (!metadata.keywords || (Array.isArray(metadata.keywords) && metadata.keywords.length === 0)) {
    warnings.push('No keywords provided')
  }
  
  // Check canonical
  if (!metadata.alternates?.canonical) {
    errors.push('Canonical URL is required')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
