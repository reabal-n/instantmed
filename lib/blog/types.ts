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

export interface ArticleSection {
  type: 'paragraph' | 'heading' | 'list' | 'callout' | 'faq'
  content: string
  items?: string[]
  variant?: 'info' | 'warning' | 'tip' | 'emergency'
  level?: 2 | 3
  links?: ArticleLink[]
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

// Content team authors (non-medical, for informational articles)
export const contentAuthors = {
  sarahChen: {
    name: 'Sarah Chen',
    credentials: '',
    ahpraNumber: '',
    bio: 'Sarah writes about healthcare access and patient rights. She believes everyone deserves clear, straightforward health information.',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&q=80'
  },
  marcusThompson: {
    name: 'Marcus Thompson',
    credentials: '',
    ahpraNumber: '',
    bio: 'Marcus covers telehealth and digital health trends. He\'s passionate about technology that makes healthcare more convenient.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80'
  },
  emmaWilson: {
    name: 'Emma Wilson',
    credentials: '',
    ahpraNumber: '',
    bio: 'Emma focuses on workplace health and employee rights. She helps readers navigate the intersection of health and work.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&q=80'
  },
  jamesPatel: {
    name: 'James Patel',
    credentials: '',
    ahpraNumber: '',
    bio: 'James writes about the Australian healthcare system and how to access services. He makes complex topics simple.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&q=80'
  },
  oliviaNguyen: {
    name: 'Olivia Nguyen',
    credentials: '',
    ahpraNumber: '',
    bio: 'Olivia covers student health and university life. She understands the unique challenges students face accessing healthcare.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80'
  }
} as const
