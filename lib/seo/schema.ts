/**
 * JSON-LD Schema Generation for SEO Pages
 * Provides rich structured data for Google and other search engines
 */

import type {
  ConditionPage,
  CertificatePage,
  BenefitPage,
  ResourcePage,
} from '@/lib/seo/pages'

type PageUnion = ConditionPage | CertificatePage | BenefitPage | ResourcePage

export function generateFAQSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }
}

export function generateMedicalWebPageSchema(page: PageUnion, pageType: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: page.h1,
    description: page.description,
    url: `https://instantmed.com.au/seo/${pageType === 'condition' ? 'conditions' : pageType === 'certificate' ? 'certificates' : pageType === 'benefit' ? 'why' : 'resources'}/${'slug' in page ? page.slug : ''}`,
    author: {
      '@type': 'Organization',
      name: 'InstantMed',
      url: 'https://instantmed.com.au',
    },
    publisher: {
      '@type': 'Organization',
      name: 'InstantMed',
      logo: {
        '@type': 'ImageObject',
        url: 'https://instantmed.com.au/logo.png',
      },
    },
    dateModified: new Date().toISOString(),
  }
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: 'InstantMed',
    description: 'Online telehealth consultations with Australian-registered GPs',
    url: 'https://instantmed.com.au',
    logo: 'https://instantmed.com.au/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: 'en-AU',
    },
    areaServed: {
      '@type': 'Country',
      name: 'AU',
    },
    medicalSpecialty: ['General Practice', 'Telehealth'],
  }
}

export function generateBreadcrumbSchema(pageTitle: string, pageType: string, slug?: string) {
  const items: Array<{
    '@type': string
    position: number
    name: string
    item?: string
  }> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://instantmed.com.au',
    },
  ]

  if (pageType === 'condition') {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Conditions',
      item: 'https://instantmed.com.au/seo/conditions',
    })
    if (slug) {
      items.push({
        '@type': 'ListItem',
        position: 3,
        name: pageTitle,
        item: `https://instantmed.com.au/seo/conditions/${slug}`,
      })
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}
