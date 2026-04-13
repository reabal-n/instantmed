import { loadAllMDXArticles } from '../mdx'
import type { Article, ArticleCategory } from '../types'
import { additionalSeoArticles } from './additional-seo'
import { competitorComparisonArticles } from './competitor-comparisons'
import { conditionArticles } from './conditions'
import { locationArticles } from './locations'
import { medicationGuideArticles } from './medication-guides'
import { medicationArticles } from './medications'
import { seoArticles } from './seo-pages'
import { telehealthArticles } from './telehealth'
import { transactionalSeoArticles } from './transactional-seo'
import { workplaceArticles } from './workplace'

// MDX articles (loaded from content/blog/*.mdx)
// These replace the former TS files: phase4-expansion, medical-certificates,
// high-intent-keywords, trust-building, high-intent-seo
const mdxArticles = loadAllMDXArticles()

// TS-only article collections (not yet converted to MDX)
const tsArticles: Article[] = [
  ...conditionArticles,
  ...telehealthArticles,
  ...medicationArticles,
  ...workplaceArticles,
  ...seoArticles,
  ...locationArticles,
  ...additionalSeoArticles,
  ...competitorComparisonArticles,
  ...transactionalSeoArticles,
  ...medicationGuideArticles,
]

// Combine all article collections. MDX articles take precedence over TS
// if both define the same slug (allows incremental migration).
const slugSet = new Set(mdxArticles.map(a => a.slug))
const deduped = tsArticles.filter(a => !slugSet.has(a.slug))

export const allArticles: Article[] = [
  ...mdxArticles,
  ...deduped,
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
