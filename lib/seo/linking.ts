/**
 * Internal Linking Engine
 * Automatically generates related content links for SEO and UX
 * 
 * This engine:
 * - Finds related pages based on type, category, keywords
 * - Generates "People also search" sections
 * - Creates "Common next steps" flows
 * - Builds contextual navigation
 */

import { intentPages } from './intents'
import type { RelatedLink, PageType } from './registry'

// ============================================
// TYPES
// ============================================

export interface LinkingContext {
  currentPage: {
    slug: string
    type: PageType
    category?: string
    keywords?: string[]
  }
  maxLinks?: number
}

export interface LinkSection {
  title: string
  links: RelatedLink[]
  type: 'related' | 'next-steps' | 'also-search' | 'treatments'
}

// ============================================
// MAIN LINKING ENGINE
// ============================================

export function generateRelatedLinks(context: LinkingContext): LinkSection[] {
  const { currentPage, maxLinks = 6 } = context
  const sections: LinkSection[] = []

  // 1. Related content (same or related type)
  const relatedLinks = findRelatedContent(currentPage, maxLinks)
  if (relatedLinks.length > 0) {
    sections.push({
      title: 'Related Information',
      links: relatedLinks,
      type: 'related',
    })
  }

  // 2. Next steps (conversion funnel)
  const nextSteps = findNextSteps(currentPage, maxLinks)
  if (nextSteps.length > 0) {
    sections.push({
      title: 'Common Next Steps',
      links: nextSteps,
      type: 'next-steps',
    })
  }

  // 3. People also search (intent-based)
  const alsoSearch = findPeopleAlsoSearch(currentPage, maxLinks)
  if (alsoSearch.length > 0) {
    sections.push({
      title: 'People Also Search For',
      links: alsoSearch,
      type: 'also-search',
    })
  }

  // 4. Other treatments (medication/condition specific)
  const treatments = findOtherTreatments(currentPage, maxLinks)
  if (treatments.length > 0) {
    sections.push({
      title: 'Other Treatments We Can Help With',
      links: treatments,
      type: 'treatments',
    })
  }

  return sections
}

// ============================================
// RELATED CONTENT FINDER
// ============================================

function findRelatedContent(
  current: LinkingContext['currentPage'],
  maxLinks: number
): RelatedLink[] {
  const links: RelatedLink[] = []

  // Medication pages removed for Google Ads compliance

  // If condition page, show:
    // - Related conditions
  if (current.type === 'condition') {
    // TODO: Implement condition relationships
  }

  // If intent page, show:
  // - Related intent pages
  // - Relevant category pages
  if (current.type === 'intent') {
    const currentIntent = intentPages.find(p => p.slug === current.slug)
    if (currentIntent) {
      // Same service type intents
      const sameServiceIntents = intentPages
        .filter(p =>
          p.slug !== current.slug &&
          p.intent.serviceType === currentIntent.intent.serviceType
        )
        .slice(0, 3)
        .map(p => ({
          type: 'intent' as const,
          slug: p.slug,
          title: p.h1,
          description: p.intent.userNeed,
        }))
      links.push(...sameServiceIntents)
    }
  }

  return links.slice(0, maxLinks)
}

// ============================================
// NEXT STEPS FINDER (Conversion Funnel)
// ============================================

function findNextSteps(
  current: LinkingContext['currentPage'],
  maxLinks: number
): RelatedLink[] {
  const steps: RelatedLink[] = []

  // Medication pages removed for Google Ads compliance

  // Condition page → Treatment options
  if (current.type === 'condition') {
    steps.push({
      type: 'category',
      slug: 'prescriptions',
      title: 'Get Treatment',
      description: 'Speak with a doctor',
    })
  }

  // Intent page → Direct to service
  if (current.type === 'intent') {
    const intentPage = intentPages.find(p => p.slug === current.slug)
    if (intentPage) {
      if (intentPage.intent.serviceType === 'medical-certificate') {
        steps.push({
          type: 'category',
          slug: 'medical-certificate/new',
          title: 'Get Medical Certificate',
          description: 'Start your request now',
        })
      } else if (intentPage.intent.serviceType === 'prescription') {
        steps.push({
          type: 'category',
          slug: 'prescriptions',
          title: 'Request Prescription',
          description: 'Start online consultation',
        })
      }
    }
  }

  // Always offer: Browse all services
  if (steps.length < maxLinks) {
    steps.push({
      type: 'category',
      slug: 'pricing',
      title: 'View All Services & Pricing',
      description: 'See what else we offer',
    })
  }

  return steps.slice(0, maxLinks)
}

// ============================================
// PEOPLE ALSO SEARCH FINDER
// ============================================

function findPeopleAlsoSearch(
  current: LinkingContext['currentPage'],
  maxLinks: number
): RelatedLink[] {
  const searches: RelatedLink[] = []

  // Medication pages removed for Google Ads compliance

  // Condition → Related intents
  if (current.type === 'condition') {
    const relatedIntents = intentPages
      .filter(p =>
        p.intent.alternateQueries.some(q =>
          q.includes(current.slug.replace(/-/g, ' '))
        )
      )
      .slice(0, 3)
      .map(p => ({
        type: 'intent' as const,
        slug: p.slug,
        title: p.intent.searchQuery,
        description: p.intent.userNeed,
      }))
    searches.push(...relatedIntents)
  }

  return searches.slice(0, maxLinks)
}

// ============================================
// OTHER TREATMENTS FINDER
// ============================================

function findOtherTreatments(
  current: LinkingContext['currentPage'],
  maxLinks: number
): RelatedLink[] {
  const treatments: RelatedLink[] = []

  // Medication pages removed for Google Ads compliance

  return treatments.slice(0, maxLinks)
}

// ============================================
// LINK QUALITY SCORING
// ============================================

interface LinkScore {
  link: RelatedLink
  score: number
  reasons: string[]
}

export function scoreLinkRelevance(
  link: RelatedLink,
  context: LinkingContext['currentPage']
): LinkScore {
  let score = 0
  const reasons: string[] = []

  // Same category = high relevance
  if (link.type === context.type) {
    score += 0.3
    reasons.push('Same content type')
  }

  // Keyword overlap
  if (context.keywords && link.description) {
    const overlap = context.keywords.filter(k =>
      link.description!.toLowerCase().includes(k.toLowerCase())
    ).length
    const keywordScore = overlap / context.keywords.length
    score += keywordScore * 0.4
    if (overlap > 0) {
      reasons.push(`${overlap} keyword matches`)
    }
  }

  // Title similarity
  if (link.title.toLowerCase().includes(context.slug.replace(/-/g, ' '))) {
    score += 0.3
    reasons.push('Title match')
  }

  return { link, score, reasons }
}

// ============================================
// BREADCRUMB GENERATOR
// ============================================

export function generateBreadcrumbs(
  currentSlug: string,
  pageType: PageType
): Array<{ name: string; url: string }> {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
  ]

  const typeMap: Record<PageType, { name: string; url: string }> = {
    medication: { name: 'Services', url: '/' }, // Medication pages removed, redirect to home
    condition: { name: 'Conditions', url: '/conditions' },
    'category-hub': { name: 'Health Services', url: '/' },
    audience: { name: 'Who We Help', url: '/for' },
    intent: { name: 'Services', url: '/' },
    symptom: { name: 'Symptoms', url: '/symptoms' },
    comparison: { name: 'Compare', url: '/compare' },
    location: { name: 'Locations', url: '/locations' },
    certificate: { name: 'Medical Certificates', url: '/medical-certificate' },
    benefit: { name: 'Health', url: '/health' },
    resource: { name: 'Guides', url: '/health/guides' },
  }

  const typeInfo = typeMap[pageType]
  if (typeInfo) {
    breadcrumbs.push(typeInfo)
  }

  // Current page (no link)
  breadcrumbs.push({
    name: currentSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    url: '',
  })

  return breadcrumbs
}
