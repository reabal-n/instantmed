import type { Article, ArticleIndexItem } from "@/lib/blog/types"

export function toArticleIndexItem(article: Article): ArticleIndexItem {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    tags: article.tags ? [...article.tags] : undefined,
    keywords: [...article.seo.keywords],
    updatedAt: article.updatedAt,
    readingTime: article.readingTime,
    viewCount: article.viewCount,
    authorName: article.author.name,
    heroImage: article.heroImage,
    heroImageAlt: article.heroImageAlt,
    series: article.series
      ? {
          id: article.series.id,
          order: article.series.order,
        }
      : undefined,
  }
}

export function toArticleIndexItems(articles: Article[]): ArticleIndexItem[] {
  return articles.map(toArticleIndexItem)
}
