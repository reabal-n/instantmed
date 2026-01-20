'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ArticleCategory } from '@/lib/blog/types'

interface CategoryNavProps {
  currentCategory?: ArticleCategory | 'all'
}

const categories: { value: ArticleCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Guides' },
  { value: 'medical-certificates', label: 'Medical Certificates' },
  { value: 'conditions', label: 'Health Conditions' },
  { value: 'telehealth', label: 'Telehealth' },
  { value: 'medications', label: 'Medications' },
  { value: 'workplace-health', label: 'Workplace & Study' },
]

export function CategoryNav({ currentCategory = 'all' }: CategoryNavProps) {
  return (
    <nav className="flex flex-wrap gap-2 justify-center">
      {categories.map((category) => (
        <Link
          key={category.value}
          href={category.value === 'all' ? '/blog' : `/blog?category=${category.value}`}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all',
            currentCategory === category.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          {category.label}
        </Link>
      ))}
    </nav>
  )
}
