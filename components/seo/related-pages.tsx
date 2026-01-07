/**
 * Related Pages Component
 * DISABLED: Condition pages have been removed
 * This component is kept for backwards compatibility but returns null
 */

'use client'

interface RelatedPagesProps {
  slug: string
  pageType: 'condition' | 'certificate'
}

export function RelatedPages({ slug, pageType }: RelatedPagesProps) {
  // Condition pages have been removed, so this component returns null
  return null
}
