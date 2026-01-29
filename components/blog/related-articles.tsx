'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import type { Article } from '@/lib/blog/types'

interface RelatedArticlesProps {
  articles: Article[]
  currentSlug: string
}

export function RelatedArticles({ articles, currentSlug }: RelatedArticlesProps) {
  // Filter out current article and limit to 3
  const relatedArticles = articles
    .filter(article => article.slug !== currentSlug)
    .slice(0, 3)

  if (relatedArticles.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t">
      <h2 className="text-xl font-bold mb-6">Related Articles</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {relatedArticles.map((article) => (
          <Link 
            key={article.slug} 
            href={`/blog/${article.slug}`}
            className="group"
          >
            <article className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-xl overflow-hidden h-full border border-white/50 dark:border-white/10 hover:border-primary/50 transition-all hover:shadow-lg">
              <div className="relative h-32 bg-white/40 dark:bg-white/10">
                <Image
                  src={article.heroImage}
                  alt={article.heroImageAlt}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-sm text-primary">
                    {article.readingTime} min read
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
                  {article.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BadgeCheck className="w-3 h-3 text-emerald-600" />
                    <span>{article.author.name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  )
}
