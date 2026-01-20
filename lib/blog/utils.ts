import type { Article, ArticleSection } from './types'

/**
 * Calculate reading time based on word count
 * Average reading speed: 200-250 words per minute
 * We use 200 WPM for more accurate estimates (accounting for technical content)
 */
export function calculateReadingTime(content: ArticleSection[]): number {
  const WORDS_PER_MINUTE = 200
  
  let wordCount = 0
  
  content.forEach(section => {
    // Count words in main content
    if (section.content) {
      wordCount += section.content.split(/\s+/).filter(Boolean).length
    }
    
    // Count words in list items
    if (section.items) {
      section.items.forEach(item => {
        wordCount += item.split(/\s+/).filter(Boolean).length
      })
    }
  })
  
  // Add time for images (12 seconds = 0.2 min each, roughly 40 words equivalent)
  const imageCount = content.filter(s => s.type === 'heading').length > 0 ? 1 : 0
  wordCount += imageCount * 40
  
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE)
  return Math.max(1, minutes) // Minimum 1 minute
}

/**
 * Get word count for an article
 */
export function getArticleWordCount(content: ArticleSection[]): number {
  let wordCount = 0
  
  content.forEach(section => {
    if (section.content) {
      wordCount += section.content.split(/\s+/).filter(Boolean).length
    }
    if (section.items) {
      section.items.forEach(item => {
        wordCount += item.split(/\s+/).filter(Boolean).length
      })
    }
  })
  
  return wordCount
}

/**
 * Get popular articles sorted by view count
 */
export function getPopularArticles(articles: Article[], limit: number = 5): Article[] {
  return [...articles]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit)
}

/**
 * Get articles by tag
 */
export function getArticlesByTag(articles: Article[], tag: string): Article[] {
  return articles.filter(article => 
    article.tags?.includes(tag) || 
    article.seo.keywords.some(k => k.toLowerCase() === tag.toLowerCase())
  )
}

/**
 * Get all unique tags from articles
 */
export function getAllTags(articles: Article[]): string[] {
  const tagSet = new Set<string>()
  
  articles.forEach(article => {
    article.tags?.forEach(tag => tagSet.add(tag))
    // Also include SEO keywords as potential tags
    article.seo.keywords.forEach(keyword => {
      if (keyword.length <= 20) { // Only short keywords
        tagSet.add(keyword.toLowerCase())
      }
    })
  })
  
  return Array.from(tagSet).sort()
}

/**
 * Get articles in the same series
 */
export function getSeriesArticles(articles: Article[], seriesId: string): Article[] {
  return articles
    .filter(article => article.series?.id === seriesId)
    .sort((a, b) => (a.series?.order || 0) - (b.series?.order || 0))
}

/**
 * Search articles with fuzzy matching
 */
export function searchArticles(articles: Article[], query: string): Article[] {
  if (!query.trim()) return []
  
  const lowerQuery = query.toLowerCase()
  const queryWords = lowerQuery.split(/\s+/).filter(Boolean)
  
  return articles
    .map(article => {
      let score = 0
      
      // Title match (highest weight)
      if (article.title.toLowerCase().includes(lowerQuery)) {
        score += 100
      } else {
        queryWords.forEach(word => {
          if (article.title.toLowerCase().includes(word)) score += 20
        })
      }
      
      // Excerpt match
      if (article.excerpt.toLowerCase().includes(lowerQuery)) {
        score += 50
      } else {
        queryWords.forEach(word => {
          if (article.excerpt.toLowerCase().includes(word)) score += 10
        })
      }
      
      // Tag match
      article.tags?.forEach(tag => {
        if (tag.toLowerCase().includes(lowerQuery)) score += 30
        queryWords.forEach(word => {
          if (tag.toLowerCase().includes(word)) score += 15
        })
      })
      
      // Keyword match
      article.seo.keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(lowerQuery)) score += 25
        queryWords.forEach(word => {
          if (keyword.toLowerCase().includes(word)) score += 10
        })
      })
      
      return { article, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article)
}

/**
 * Get search suggestions based on partial query
 */
export function getSearchSuggestions(
  articles: Article[], 
  query: string, 
  limit: number = 5
): { type: 'article' | 'tag' | 'category', text: string, slug?: string }[] {
  if (!query.trim() || query.length < 2) return []
  
  const lowerQuery = query.toLowerCase()
  const suggestions: { type: 'article' | 'tag' | 'category', text: string, slug?: string, score: number }[] = []
  
  // Match article titles
  articles.forEach(article => {
    if (article.title.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        type: 'article',
        text: article.title,
        slug: article.slug,
        score: article.title.toLowerCase().startsWith(lowerQuery) ? 100 : 50
      })
    }
  })
  
  // Match tags
  const allTags = getAllTags(articles)
  allTags.forEach(tag => {
    if (tag.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        type: 'tag',
        text: tag,
        score: tag.toLowerCase().startsWith(lowerQuery) ? 80 : 40
      })
    }
  })
  
  // Sort by score and limit
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ type, text, slug }) => ({ type, text, slug }))
}
