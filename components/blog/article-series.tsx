'use client'

import Link from 'next/link'
import { BookOpen, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Article, ArticleSeries } from '@/lib/blog/types'

interface ArticleSeriesNavProps {
  series: ArticleSeries
  articles: Article[]
  currentSlug: string
  className?: string
}

export function ArticleSeriesNav({ 
  series, 
  articles, 
  currentSlug,
  className 
}: ArticleSeriesNavProps) {
  // Filter and sort articles in this series
  const seriesArticles = articles
    .filter(a => a.series?.id === series.id)
    .sort((a, b) => (a.series?.order || 0) - (b.series?.order || 0))

  if (seriesArticles.length < 2) return null

  const currentIndex = seriesArticles.findIndex(a => a.slug === currentSlug)

  return (
    <div className={cn(
      "bg-linear-to-br from-primary/5 via-primary/10 to-primary/5 rounded-xl p-5 border border-primary/20",
      className
    )}>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-primary uppercase tracking-wide">
          Part of a Series
        </span>
      </div>
      
      <h3 className="font-semibold mb-1">{series.name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{series.description}</p>
      
      <div className="space-y-1">
        {seriesArticles.map((article, index) => {
          const isCurrent = article.slug === currentSlug
          const isCompleted = index < currentIndex
          
          return (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                isCurrent 
                  ? "bg-white/80 dark:bg-white/10 shadow-sm" 
                  : "hover:bg-white/60 dark:hover:bg-white/5"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                isCurrent 
                  ? "bg-primary text-primary-foreground" 
                  : isCompleted
                    ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400"
                    : "bg-white/60 dark:bg-white/10 text-muted-foreground"
              )}>
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </div>
              
              <span className={cn(
                "flex-1 text-sm truncate",
                isCurrent ? "font-medium" : "text-muted-foreground"
              )}>
                {article.title}
              </span>
              
              {isCurrent && (
                <span className="text-[10px] font-medium text-primary px-2 py-0.5 rounded bg-primary/10">
                  Current
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Next in series */}
      {currentIndex < seriesArticles.length - 1 && (
        <Link
          href={`/blog/${seriesArticles[currentIndex + 1].slug}`}
          className="mt-4 flex items-center justify-between p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <div>
            <p className="text-xs opacity-80">Next in series</p>
            <p className="text-sm font-medium truncate">
              {seriesArticles[currentIndex + 1].title}
            </p>
          </div>
          <ChevronRight className="w-5 h-5" />
        </Link>
      )}
    </div>
  )
}

// Compact inline version for article headers
interface SeriesBadgeProps {
  series: ArticleSeries
  totalArticles: number
  currentOrder: number
}

export function SeriesBadge({ series, totalArticles, currentOrder }: SeriesBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
      <BookOpen className="w-3.5 h-3.5" />
      <span>{series.name}</span>
      <span className="opacity-60">•</span>
      <span>Part {currentOrder} of {totalArticles}</span>
    </div>
  )
}
