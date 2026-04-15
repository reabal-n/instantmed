import { loadAllMDXArticles } from '../mdx'
import type { Article, ArticleCategory } from '../types'

export const allArticles: Article[] = loadAllMDXArticles()

export function getArticleBySlug(slug: string): Article | undefined {
  return allArticles.find(article => article.slug === slug)
}

export function getArticlesByCategory(category: ArticleCategory): Article[] {
  return allArticles.filter(article => article.category === category)
}

export function getAllArticleSlugs(): string[] {
  return allArticles.map(article => article.slug)
}

export function getRecentArticles(limit: number = 6): Article[] {
  return [...allArticles]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
}

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
