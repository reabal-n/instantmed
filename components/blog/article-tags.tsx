'use client'

import Link from 'next/link'
import { Tag } from '@/lib/icons'
import { cn } from '@/lib/utils'

interface ArticleTagsProps {
  tags: string[]
  className?: string
  variant?: 'default' | 'compact'
  linkable?: boolean
}

function formatTag(tag: string): string {
  return tag
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function ArticleTags({ 
  tags, 
  className, 
  variant = 'default',
  linkable = true 
}: ArticleTagsProps) {
  if (!tags || tags.length === 0) return null

  const tagClass = cn(
    "inline-flex items-center text-xs font-medium rounded-full transition-colors",
    variant === 'default' 
      ? "px-3 py-1 bg-card/60 dark:bg-white/5 text-foreground hover:bg-primary/10 hover:text-primary"
      : "px-2 py-0.5 bg-card/60 dark:bg-white/5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
  )

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {variant === 'default' && (
        <span className="text-sm text-muted-foreground flex items-center gap-1.5 mr-1">
          <Tag className="w-3.5 h-3.5" />
          Topics:
        </span>
      )}
      {tags.slice(0, 8).map((tag) => (
        linkable ? (
          <Link
            key={tag}
            href={`/blog?tag=${encodeURIComponent(tag)}`}
            className={tagClass}
          >
            {formatTag(tag)}
          </Link>
        ) : (
          <span key={tag} className={tagClass}>
            {formatTag(tag)}
          </span>
        )
      ))}
      {tags.length > 8 && (
        <span className="text-xs text-muted-foreground">
          +{tags.length - 8} more
        </span>
      )}
    </div>
  )
}

// Sidebar version with all tags from multiple articles
interface AllTagsProps {
  tags: string[]
  currentTag?: string
  className?: string
}

export function AllTags({ tags, currentTag, className }: AllTagsProps) {
  if (!tags || tags.length === 0) return null

  const uniqueTags = Array.from(new Set(tags)).slice(0, 20)

  return (
    <div className={cn("bg-card/80 dark:bg-white/5 backdrop-blur-xl rounded-xl border border-border/50 dark:border-white/10 p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Browse by Topic</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {uniqueTags.map((tag) => (
          <Link
            key={tag}
            href={`/blog?tag=${encodeURIComponent(tag)}`}
            className={cn(
              "inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
              currentTag === tag
                ? "bg-primary text-primary-foreground"
                : "bg-card/60 dark:bg-white/5 text-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            {formatTag(tag)}
          </Link>
        ))}
      </div>
    </div>
  )
}
