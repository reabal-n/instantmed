import { medicalCertificateArticles } from './medical-certificates'
import { conditionArticles } from './conditions'
import { telehealthArticles } from './telehealth'
import { medicationArticles } from './medications'
import { workplaceArticles } from './workplace'
import { seoArticles } from './seo-pages'
import { highIntentSeoArticles } from './high-intent-seo'
import { trustBuildingArticles } from './trust-building'
import { locationArticles } from './locations'
import { additionalSeoArticles } from './additional-seo'
import { highIntentKeywordArticles } from './high-intent-keywords'
import type { Article, ArticleCategory } from '../types'

// Combine all article collections
export const allArticles: Article[] = [
  ...medicalCertificateArticles,
  ...conditionArticles,
  ...telehealthArticles,
  ...medicationArticles,
  ...workplaceArticles,
  ...seoArticles,
  ...highIntentSeoArticles,
  ...trustBuildingArticles,
  ...locationArticles,
  ...additionalSeoArticles,
  ...highIntentKeywordArticles,
]

// Get article by slug
export function getArticleBySlug(slug: string): Article | undefined {
  return allArticles.find(article => article.slug === slug)
}

// Get articles by category
export function getArticlesByCategory(category: ArticleCategory): Article[] {
  return allArticles.filter(article => article.category === category)
}

// Get all article slugs for static generation
export function getAllArticleSlugs(): string[] {
  return allArticles.map(article => article.slug)
}

// Get featured/recent articles
export function getRecentArticles(limit: number = 6): Article[] {
  return [...allArticles]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
}

// Get related articles
export function getRelatedArticles(currentSlug: string, limit: number = 3): Article[] {
  const current = getArticleBySlug(currentSlug)
  if (!current) return []
  
  return allArticles
    .filter(article => 
      article.slug !== currentSlug && 
      article.category === current.category
    )
    .slice(0, limit)
}
