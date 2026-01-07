/**
 * Comparison Pages Data
 * SEO pages comparing similar medications or treatments
 * 
 * These pages target "[treatment A] vs [treatment B]" search queries
 * Must be medically accurate, neutral, and avoid misleading claims
 * 
 * NOTE: Medication comparison pages have been removed for Google Ads compliance
 */

import type { SEOPage, FAQ } from './registry'

export interface ComparisonPage extends Omit<SEOPage, 'type'> {
  type: 'comparison'
  comparison: {
    itemA: {
      name: string
      slug: string
      type: 'medication' | 'treatment' | 'service'
    }
    itemB: {
      name: string
      slug: string
      type: 'medication' | 'treatment' | 'service'
    }
    category: 'medication' | 'treatment' | 'service'
    comparisonDimensions: string[] // e.g., ['effectiveness', 'duration', 'side effects', 'cost']
  }
  content: {
    intro: string
    uniqueBlocks: any[] // Required by SEOPage but not used in comparisons
    keyDifferences: {
      heading: string
      itemA: string
      itemB: string
    }[]
    similarities: string[]
    sections: {
      heading: string
      content: string
    }[]
  }
}

export const comparisonPages: ComparisonPage[] = [
  // All medication comparison pages removed for Google Ads compliance
  // Previously included: tadalafil-vs-sildenafil, finasteride-vs-minoxidil, trimethoprim-vs-nitrofurantoin
]

export function getComparisonBySlug(slug: string): ComparisonPage | undefined {
  return comparisonPages.find(p => p.slug === slug)
}

export function getAllComparisonSlugs(): string[] {
  return comparisonPages.map(p => p.slug)
}

export function getRelatedComparisons(medicationSlug: string): ComparisonPage[] {
  return comparisonPages.filter(p => 
    p.comparison.itemA.slug === medicationSlug || 
    p.comparison.itemB.slug === medicationSlug
  )
}
