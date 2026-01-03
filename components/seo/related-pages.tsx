/**
 * Related Pages Component
 * Shows related condition pages and other SEO pages for internal linking
 */

'use client'

import Link from 'next/link'
import { conditionPages } from '@/lib/seo/pages'
import { ChevronRight } from 'lucide-react'

interface RelatedPagesProps {
  slug: string
  pageType: 'condition' | 'certificate'
}

export function RelatedPages({ slug, pageType }: RelatedPagesProps) {
  if (pageType !== 'condition') {
    return null
  }

  const page = conditionPages.find((p) => p.slug === slug)
  if (!page || page.relatedConditions.length === 0) {
    return null
  }

  const related = page.relatedConditions
    .map((relatedSlug) => conditionPages.find((p) => p.slug === relatedSlug))
    .filter((p) => p !== undefined)
  
  if (related.length === 0) {
    return null
  }

  return (
    <div className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-700">
      <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
        Related conditions
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        {related.map((relatedPage) => (
          <Link
            key={relatedPage?.slug}
            href={`/health/conditions/${relatedPage?.slug}`}
            className="group p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {relatedPage?.name}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Learn about {relatedPage?.name.toLowerCase()} symptoms and treatment options
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
