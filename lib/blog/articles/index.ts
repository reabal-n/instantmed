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

  const result: Article[] = []
  const seen = new Set<string>([currentSlug])

  // 1. Curated related articles from frontmatter, in the author-specified order.
  //    Lets us concentrate internal-link equity on the pages we want to rank,
  //    including cross-category links. Stale slugs (e.g. merged-away articles)
  //    are skipped automatically.
  for (const slug of current.relatedArticles ?? []) {
    if (seen.has(slug) || result.length >= limit) continue
    const article = getArticleBySlug(slug)
    if (article) {
      result.push(article)
      seen.add(slug)
    }
  }

  // 2. Fill any remaining slots with same-category articles.
  for (const article of allArticles) {
    if (result.length >= limit) break
    if (seen.has(article.slug) || article.category !== current.category) continue
    result.push(article)
    seen.add(article.slug)
  }

  return result
}
