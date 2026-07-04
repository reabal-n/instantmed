export interface ArticleAuthor {
  name: string
  credentials: string
  ahpraNumber: string
  bio: string
  image?: string
}

export interface ArticleLink {
  text: string
  href: string
  title?: string
}

export type ArticleHeroImageFit = 'contain' | 'cover'

export interface ArticleDecisionGroup {
  title: 'May fit telehealth' | 'Needs in-person care' | 'Urgent care'
  items: string[]
}

export interface ArticleSection {
  type:
    | 'paragraph'
    | 'heading'
    | 'list'
    | 'callout'
    | 'faq'
    | 'table'
    | 'steps'
    | 'keyTakeaway'
    | 'decisionBox'
    | 'evidenceNote'
    | 'policyNote'
  content: string
  title?: string
  source?: string
  items?: string[]
  groups?: ArticleDecisionGroup[]
  headers?: string[] // table column headers
  rows?: string[][] // table body rows
  variant?: 'info' | 'warning' | 'tip' | 'emergency'
  level?: 2 | 3
  links?: ArticleLink[]
}

export interface ArticleFAQ {
  question: string
  answer: string
}

export interface ArticleSeries {
  id: string
  name: string
  description: string
  order: number
}

export interface Article {
  slug: string
  title: string
  subtitle?: string
  excerpt: string
  category: ArticleCategory
  tags?: string[]
  publishedAt: string
  updatedAt: string
  readingTime: number
  viewCount: number
  author: ArticleAuthor
  heroImage: string
  heroImageDark?: string
  heroImageFit?: ArticleHeroImageFit
  heroImageAlt: string
  content: ArticleSection[]
  faqs?: ArticleFAQ[]
  relatedArticles?: string[]
  series?: ArticleSeries
  /** Override canonical URL. When set, the blog page metadata points here instead of the default /blog/[slug]. */
  canonical?: string
  seo: {
    title: string
    description: string
    keywords: string[]
  }
}

// Pre-defined article series
export const articleSeries = {
  'medical-certificates-101': {
    id: 'medical-certificates-101',
    name: 'Medical Certificates 101',
    description: 'A complete guide to understanding medical certificates in Australia'
  },
  'telehealth-guide': {
    id: 'telehealth-guide',
    name: 'Telehealth Guide',
    description: 'Everything you need to know about online healthcare'
  },
  'medication-essentials': {
    id: 'medication-essentials',
    name: 'Medication Essentials',
    description: 'Understanding prescriptions and medications in Australia'
  }
} as const

// Common tags used across articles
export const articleTags = [
  'medical-certificate', 'sick-leave', 'work', 'employer', 
  'telehealth', 'online-doctor', 'video-consult',
  'prescription', 'medication', 'pharmacy', 'escript',
  'mental-health', 'stress', 'anxiety', 'sleep',
  'cold', 'flu', 'infection', 'allergy',
  'skin', 'eczema', 'rash',
  'digestive', 'stomach', 'nausea',
  'university', 'student', 'exam',
  'carer', 'family', 'children',
  'pregnancy', 'womens-health',
  'chronic', 'ongoing', 'management'
] as const

export type ArticleTag = typeof articleTags[number]

export type ArticleCategory = 
  | 'medical-certificates'
  | 'conditions'
  | 'telehealth'
  | 'medications'
  | 'workplace-health'

export interface CategoryInfo {
  slug: ArticleCategory
  name: string
  description: string
  icon: string
}

export const categories: Record<ArticleCategory, CategoryInfo> = {
  'medical-certificates': {
    slug: 'medical-certificates',
    name: 'Medical Certificates',
    description: 'Guides on getting medical certificates for various situations',
    icon: 'FileText'
  },
  'conditions': {
    slug: 'conditions',
    name: 'Health Conditions',
    description: 'Information about common health conditions',
    icon: 'Heart'
  },
  'telehealth': {
    slug: 'telehealth',
    name: 'Telehealth',
    description: 'Understanding telehealth in Australia',
    icon: 'Video'
  },
  'medications': {
    slug: 'medications',
    name: 'Medications',
    description: 'Guidance on prescriptions and medications',
    icon: 'Pill'
  },
  'workplace-health': {
    slug: 'workplace-health',
    name: 'Workplace Health',
    description: 'Health and work in Australia',
    icon: 'Briefcase'
  }
}

export const defaultAuthor: ArticleAuthor = {
  name: 'InstantMed Medical Team',
  credentials: '',
  ahpraNumber: '',
  bio: 'Practical, plain-English health guides from the InstantMed editorial team, medically reviewed by an AHPRA-registered doctor.',
  image: 'https://api.dicebear.com/7.x/notionists/svg?seed=InstantMedTeam'
}
