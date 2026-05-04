'use client'

import { List } from 'lucide-react'
import { type MouseEvent, useEffect, useMemo, useState } from 'react'

import { slugifyHeading } from '@/lib/blog/heading'
import type { ArticleSection } from '@/lib/blog/types'
import { cn } from '@/lib/utils'

interface TableOfContentsProps {
  content: ArticleSection[]
}

interface TOCItem {
  id: string
  text: string
  level: number
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  
  // Extract headings from content
  const headings: TOCItem[] = useMemo(
    () =>
      content
        .filter(section => section.type === 'heading' && section.level && section.level <= 3)
        .map((section) => ({
          id: slugifyHeading(section.content),
          text: section.content,
          level: section.level || 2,
        })),
    [content],
  )

  const hasEnoughHeadings = headings.length >= 4

  useEffect(() => {
    if (!hasEnoughHeadings) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0px -80% 0px' }
    )

    headings.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [headings, hasEnoughHeadings])

  // Don't render if fewer than 4 headings
  if (!hasEnoughHeadings) return null

  const scrollToHeading = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
      window.history.replaceState(null, '', `#${id}`)
    }
  }

  return (
    <nav className="bg-white dark:bg-card rounded-xl p-5 sticky top-24 border border-border/50 dark:border-white/10">
      <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-foreground">
        <List className="w-4 h-4" />
        On this page
      </div>
      <ul className="space-y-2">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(event) => scrollToHeading(event, heading.id)}
              className={cn(
                'block text-left text-sm transition-colors w-full hover:text-primary',
                heading.level === 3 && 'pl-4',
                activeId === heading.id
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
