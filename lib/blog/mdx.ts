import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

import type { Article, ArticleAuthor, ArticleCategory, ArticleFAQ, ArticleSection, ArticleSeries, RelatedService } from './types'
import { contentAuthors, defaultAuthor } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')

/**
 * Frontmatter shape for MDX blog articles.
 * All metadata lives here; the MDX body is prose content.
 */
interface MDXFrontmatter {
  slug: string
  title: string
  subtitle?: string
  excerpt: string
  category: ArticleCategory
  tags?: string[]
  publishedAt: string
  updatedAt: string
  readingTime: number
  viewCount: number
  author: string // key into author registry, or 'default'
  heroImage: string
  heroImageDark?: string
  heroImageAlt: string
  faqs?: ArticleFAQ[]
  relatedServices: RelatedService[]
  relatedArticles?: string[]
  series?: ArticleSeries
  /** Override canonical URL. When set, blog page metadata uses this instead of the default /blog/[slug]. */
  canonical?: string
  seo: {
    title: string
    description: string
    keywords: string[]
  }
}

/**
 * Author registry -- maps frontmatter author key to ArticleAuthor object.
 * Keeps MDX files DRY (no duplicating full author bios in every file).
 */
const authorRegistry: Record<string, ArticleAuthor> = {
  default: defaultAuthor,
  sarahChen: contentAuthors.sarahChen,
  marcusThompson: contentAuthors.marcusThompson,
  emmaWilson: contentAuthors.emmaWilson,
  jamesPatel: contentAuthors.jamesPatel,
  oliviaNguyen: contentAuthors.oliviaNguyen,
}

function resolveAuthor(key: string): ArticleAuthor {
  return authorRegistry[key] || defaultAuthor
}

/**
 * Parse MDX body into ArticleSection[] to maintain compatibility
 * with the existing ArticleTemplate renderer.
 *
 * Supported syntax in MDX body:
 * - Paragraphs (plain text separated by blank lines)
 * - ## Heading 2 / ### Heading 3
 * - Bullet lists (lines starting with "- ")
 * - <Callout variant="info">text</Callout>
 * - Inline links [text](/href "title") are converted to ArticleLink[]
 */
function parseMDXBodyToSections(body: string): ArticleSection[] {
  const sections: ArticleSection[] = []
  const lines = body.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Callout blocks: <Callout variant="info">...</Callout>
    const calloutMatch = line.match(/^<Callout\s+variant="(info|warning|tip|emergency)">\s*$/)
    if (calloutMatch) {
      const variant = calloutMatch[1] as ArticleSection['variant']
      const contentLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('</Callout>')) {
        contentLines.push(lines[i])
        i++
      }
      i++ // skip </Callout>
      sections.push({
        type: 'callout',
        variant,
        content: contentLines.join('\n').trim(),
      })
      continue
    }

    // Single-line callout: <Callout variant="info">text</Callout>
    const inlineCalloutMatch = line.match(/^<Callout\s+variant="(info|warning|tip|emergency)">(.*?)<\/Callout>\s*$/)
    if (inlineCalloutMatch) {
      sections.push({
        type: 'callout',
        variant: inlineCalloutMatch[1] as ArticleSection['variant'],
        content: inlineCalloutMatch[2].trim(),
      })
      i++
      continue
    }

    // H2
    if (line.startsWith('## ')) {
      sections.push({
        type: 'heading',
        content: line.slice(3).trim(),
        level: 2,
      })
      i++
      continue
    }

    // H3
    if (line.startsWith('### ')) {
      sections.push({
        type: 'heading',
        content: line.slice(4).trim(),
        level: 3,
      })
      i++
      continue
    }

    // Bullet list (consecutive lines starting with "- ")
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim())
        i++
      }
      sections.push({
        type: 'list',
        content: '',
        items,
      })
      continue
    }

    // Paragraph -- collect consecutive non-empty, non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('## ') &&
      !lines[i].startsWith('### ') &&
      !lines[i].startsWith('- ') &&
      !lines[i].startsWith('<Callout')
    ) {
      paraLines.push(lines[i])
      i++
    }

    if (paraLines.length > 0) {
      const text = paraLines.join(' ').trim()
      const links = extractLinks(text)
      const cleanText = stripMarkdownLinks(text)

      sections.push({
        type: 'paragraph',
        content: cleanText,
        ...(links.length > 0 ? { links } : {}),
      })
    }
  }

  return sections
}

/**
 * Extract [text](/href "title") markdown links from a string.
 */
function extractLinks(text: string): ArticleSection['links'] & object {
  const linkRegex = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g
  const links: NonNullable<ArticleSection['links']> = []
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    links.push({
      text: match[1],
      href: match[2],
      ...(match[3] ? { title: match[3] } : {}),
    })
  }

  return links
}

/**
 * Strip markdown link syntax, leaving just the link text.
 * [Taking time off](/blog/how-long-medical-certificate "title") -> Taking time off
 */
function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

/**
 * Get all MDX article file paths.
 */
function getMDXFilePaths(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return []
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => path.join(CONTENT_DIR, f))
}

/**
 * Load a single MDX file and return an Article object.
 */
function loadMDXArticle(filePath: string): Article | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(raw)
    const fm = data as MDXFrontmatter

    if (!fm.slug || !fm.title) return null

    const contentSections = parseMDXBodyToSections(content)

    return {
      slug: fm.slug,
      title: fm.title,
      subtitle: fm.subtitle,
      excerpt: fm.excerpt,
      category: fm.category,
      tags: fm.tags,
      publishedAt: fm.publishedAt,
      updatedAt: fm.updatedAt,
      readingTime: fm.readingTime,
      viewCount: fm.viewCount || 0,
      author: resolveAuthor(fm.author),
      heroImage: fm.heroImage,
      heroImageDark: fm.heroImageDark,
      heroImageAlt: fm.heroImageAlt,
      content: contentSections,
      faqs: fm.faqs,
      relatedServices: fm.relatedServices || [],
      relatedArticles: fm.relatedArticles,
      series: fm.series,
      canonical: fm.canonical,
      seo: fm.seo,
    }
  } catch {
    return null
  }
}

/**
 * Load all MDX blog articles from content/blog/.
 * Returns Article[] compatible with the existing blog system.
 */
export function loadAllMDXArticles(): Article[] {
  const paths = getMDXFilePaths()
  return paths
    .map(loadMDXArticle)
    .filter((a): a is Article => a !== null)
}

/**
 * Load a single MDX article by slug.
 */
export function loadMDXArticleBySlug(slug: string): Article | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  return loadMDXArticle(filePath)
}

/**
 * Get all MDX article slugs (for static generation).
 */
export function getMDXArticleSlugs(): string[] {
  return getMDXFilePaths().map((f) =>
    path.basename(f, '.mdx')
  )
}
