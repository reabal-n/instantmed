'use client'

import Link from 'next/link'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Image from 'next/image'
import { TrendingUp, Eye, Clock } from 'lucide-react'
import type { Article } from '@/lib/blog/types'

interface PopularArticlesProps {
  articles: Article[]
  limit?: number
  title?: string
  className?: string
}

function formatViewCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return count.toString()
}

export function PopularArticles({ 
  articles, 
  limit = 5,
  title = "Trending Articles",
  className 
}: PopularArticlesProps) {
  // Sort by view count and take top articles
  const popularArticles = [...articles]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit)

  if (popularArticles.length === 0) return null

  return (
    <aside className={className}>
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-white/50 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {popularArticles.map((article, index) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="flex gap-3 p-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group"
            >
              {/* Rank number */}
              <div className="shrink-0 w-6 h-6 rounded-full bg-white/60 dark:bg-white/5 flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">
                  {index + 1}
                </span>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h4>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViewCount(article.viewCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {article.readingTime} min
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}

// Compact version for sidebars
export function PopularArticlesCompact({ 
  articles, 
  limit = 3,
  className 
}: Omit<PopularArticlesProps, 'title'>) {
  const popularArticles = [...articles]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit)

  if (popularArticles.length === 0) return null

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Popular</span>
      </div>
      <div className="space-y-3">
        {popularArticles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="block group"
          >
            <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatViewCount(article.viewCount)} views
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
