export interface ArticleAuthor {
  name: string
  credentials: string
  ahpraNumber: string
  bio: string
  image?: string
}

export interface ArticleSection {
  type: 'paragraph' | 'heading' | 'list' | 'callout' | 'faq'
  content: string
  items?: string[]
  variant?: 'info' | 'warning' | 'tip' | 'emergency'
  level?: 2 | 3
}

export interface ArticleFAQ {
  question: string
  answer: string
}

export interface RelatedService {
  title: string
  description: string
  href: string
  icon: 'certificate' | 'prescription' | 'consult' | 'referral'
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
  heroImageAlt: string
  content: ArticleSection[]
  faqs?: ArticleFAQ[]
  relatedServices: RelatedService[]
  relatedArticles?: string[]
  series?: ArticleSeries
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
  name: 'Dr. Reabal Najjar',
  credentials: 'BHSc, MD, AFHEA',
  ahpraNumber: 'MED0002576546',
  bio: 'Dr. Reabal Najjar is an AHPRA-registered medical practitioner and the Medical Director at InstantMed. He is committed to making quality healthcare more accessible through responsible telehealth.',
  image: '/doctors/dr-reabal-najjar.jpg'
}
