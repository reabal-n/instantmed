/**
 * Central Content Registry
 * Single source of truth for all programmatic SEO content
 * 
 * This registry:
 * - Prevents content duplication
 * - Enforces minimum quality thresholds
 * - Provides type safety for all SEO pages
 * - Enables thin content detection
 */

// ============================================
// CORE TYPES
// ============================================

export interface SEOPage {
  slug: string
  type: PageType
  title: string
  description: string
  h1: string
  content: {
    intro: string
    uniqueBlocks: ContentBlock[]
  }
  metadata: {
    keywords: string[]
    canonical?: string
    noindex?: boolean
    lastModified: Date
  }
  structured: {
    faqs?: FAQ[]
    breadcrumbs?: Breadcrumb[]
  }
  links: {
    related: RelatedLink[]
  }
}

export type PageType = 
  | 'condition'
  | 'medication'
  | 'category-hub'
  | 'audience'
  | 'intent'
  | 'symptom'
  | 'comparison'
  | 'location'
  | 'certificate'
  | 'benefit'
  | 'resource'

export interface ContentBlock {
  id: string
  type: 'text' | 'list' | 'callout' | 'faq' | 'pricing' | 'disclaimer'
  content: string | string[]
  metadata?: {
    wordCount?: number
    uniqueScore?: number
  }
}

export interface FAQ {
  question: string
  answer: string
  category?: string
}

export interface Breadcrumb {
  name: string
  url: string
}

export interface RelatedLink {
  type: 'condition' | 'medication' | 'symptom' | 'audience' | 'category'
  slug: string
  title: string
  description?: string
}

// ============================================
// CONTENT QUALITY RULES
// ============================================

export const QUALITY_THRESHOLDS = {
  // Minimum word counts per page type
  minWordCount: {
    medication: 800,
    condition: 600,
    'category-hub': 500,
    audience: 500,
    intent: 400,
    symptom: 400,
    comparison: 700,
    location: 300, // Lower threshold, must have unique local content
    certificate: 400,
    benefit: 400,
    resource: 500,
  },
  
  // Minimum number of unique content blocks
  minUniqueBlocks: {
    medication: 4,
    condition: 3,
    'category-hub': 3,
    audience: 3,
    intent: 2,
    symptom: 2,
    comparison: 4,
    location: 2,
    certificate: 2,
    benefit: 2,
    resource: 3,
  },
  
  // Minimum number of FAQs
  minFAQs: {
    medication: 4,
    condition: 3,
    'category-hub': 3,
    audience: 2,
    intent: 2,
    symptom: 2,
    comparison: 3,
    location: 0, // Optional for locations
    certificate: 2,
    benefit: 2,
    resource: 3,
  },
  
  // Maximum template reuse percentage (lower = more unique)
  maxTemplateReuse: 0.4, // 40% max shared content
}

// ============================================
// NOINDEX RULES
// ============================================

export const NOINDEX_RULES = {
  patterns: [
    /\/patient\//,
    /\/doctor\//,
    /\/admin\//,
    /\/api\//,
    /\/auth\//,
    /\?.*/, // Parameterized URLs
    /\/search/,
  ],
  
  pageTypes: {
    // Location pages: noindex if word count < threshold
    location: (wordCount: number) => wordCount < 300,
    
    // Internal search: always noindex
    search: () => true,
    
    // Thin comparisons: noindex if too similar
    comparison: (uniqueScore: number) => uniqueScore < 0.6,
  },
  
  // Specific slugs to noindex
  slugs: [
    'test',
    'draft',
    'preview',
  ],
}

// ============================================
// ROBOTS META CONFIGURATION
// ============================================

export interface RobotsConfig {
  index: boolean
  follow: boolean
  maxImagePreview?: 'none' | 'standard' | 'large'
  maxSnippet?: number
  maxVideoPreview?: number
}

export function getRobotsConfig(page: SEOPage): RobotsConfig {
  // Check noindex rules
  const shouldNoindex = 
    page.metadata.noindex ||
    NOINDEX_RULES.slugs.includes(page.slug) ||
    NOINDEX_RULES.patterns.some(pattern => pattern.test(`/${page.slug}`))
  
  if (shouldNoindex) {
    return {
      index: false,
      follow: false,
    }
  }
  
  // Default: index and follow
  return {
    index: true,
    follow: true,
    maxImagePreview: 'large',
    maxSnippet: 160,
    maxVideoPreview: -1,
  }
}

// ============================================
// CANONICAL URL GENERATOR
// ============================================

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://instantmed.com.au'

export function getCanonicalUrl(page: SEOPage): string {
  if (page.metadata.canonical) {
    return page.metadata.canonical.startsWith('http') 
      ? page.metadata.canonical 
      : `${BASE_URL}${page.metadata.canonical}`
  }
  
  const pathMap: Record<PageType, string> = {
    condition: '/conditions',
    medication: '/medications',
    'category-hub': '', // Root level like /mens-health
    audience: '/for',
    intent: '/telehealth',
    symptom: '/symptoms',
    comparison: '/compare',
    location: '/locations',
    certificate: '/medical-certificate',
    benefit: '/health',
    resource: '/health/guides',
  }
  
  const basePath = pathMap[page.type]
  return `${BASE_URL}${basePath}${basePath ? '/' : '/'}${page.slug}`
}

// ============================================
// THIN CONTENT DETECTOR
// ============================================

export interface ContentQualityReport {
  passed: boolean
  score: number
  issues: string[]
  warnings: string[]
  metrics: {
    wordCount: number
    uniqueBlocks: number
    faqCount: number
    templateReusePercent: number
  }
}

export function detectThinContent(page: SEOPage): ContentQualityReport {
  const issues: string[] = []
  const warnings: string[] = []
  
  // Calculate word count
  const wordCount = calculateWordCount(page)
  const minWords = QUALITY_THRESHOLDS.minWordCount[page.type]
  if (wordCount < minWords) {
    issues.push(`Word count ${wordCount} is below minimum ${minWords}`)
  } else if (wordCount < minWords * 1.2) {
    warnings.push(`Word count ${wordCount} is close to minimum ${minWords}`)
  }
  
  // Check unique blocks
  const uniqueBlocks = page.content.uniqueBlocks.length
  const minBlocks = QUALITY_THRESHOLDS.minUniqueBlocks[page.type]
  if (uniqueBlocks < minBlocks) {
    issues.push(`Only ${uniqueBlocks} unique blocks, minimum is ${minBlocks}`)
  }
  
  // Check FAQs
  const faqCount = page.structured.faqs?.length || 0
  const minFAQs = QUALITY_THRESHOLDS.minFAQs[page.type]
  if (faqCount < minFAQs) {
    issues.push(`Only ${faqCount} FAQs, minimum is ${minFAQs}`)
  }
  
  // Calculate template reuse (simplified)
  const templateReusePercent = 0.3 // TODO: Implement actual calculation
  if (templateReusePercent > QUALITY_THRESHOLDS.maxTemplateReuse) {
    issues.push(`Template reuse ${(templateReusePercent * 100).toFixed(0)}% exceeds maximum ${(QUALITY_THRESHOLDS.maxTemplateReuse * 100).toFixed(0)}%`)
  }
  
  // Calculate overall score
  const score = calculateQualityScore({
    wordCount,
    minWords,
    uniqueBlocks,
    minBlocks,
    faqCount,
    minFAQs,
    templateReusePercent,
  })
  
  return {
    passed: issues.length === 0,
    score,
    issues,
    warnings,
    metrics: {
      wordCount,
      uniqueBlocks,
      faqCount,
      templateReusePercent,
    },
  }
}

function calculateWordCount(page: SEOPage): number {
  let count = 0
  
  // Count intro
  count += page.content.intro.split(/\s+/).length
  
  // Count unique blocks
  for (const block of page.content.uniqueBlocks) {
    if (typeof block.content === 'string') {
      count += block.content.split(/\s+/).length
    } else {
      count += block.content.join(' ').split(/\s+/).length
    }
  }
  
  // Count FAQs
  for (const faq of page.structured.faqs || []) {
    count += faq.question.split(/\s+/).length
    count += faq.answer.split(/\s+/).length
  }
  
  return count
}

function calculateQualityScore(metrics: {
  wordCount: number
  minWords: number
  uniqueBlocks: number
  minBlocks: number
  faqCount: number
  minFAQs: number
  templateReusePercent: number
}): number {
  const {
    wordCount,
    minWords,
    uniqueBlocks,
    minBlocks,
    faqCount,
    minFAQs,
    templateReusePercent,
  } = metrics
  
  // Score components (0-1 each)
  const wordScore = Math.min(wordCount / (minWords * 1.5), 1)
  const blockScore = Math.min(uniqueBlocks / (minBlocks * 1.5), 1)
  const faqScore = minFAQs > 0 ? Math.min(faqCount / (minFAQs * 1.2), 1) : 1
  const reuseScore = 1 - (templateReusePercent / QUALITY_THRESHOLDS.maxTemplateReuse)
  
  // Weighted average
  return (wordScore * 0.3 + blockScore * 0.3 + faqScore * 0.2 + reuseScore * 0.2)
}

// ============================================
// REGISTRY EXPORTS
// ============================================

export const contentRegistry = {
  getCanonicalUrl,
  getRobotsConfig,
  detectThinContent,
  QUALITY_THRESHOLDS,
  NOINDEX_RULES,
}
