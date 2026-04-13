/**
 * Convert TS blog article objects to MDX files.
 *
 * Usage: npx tsx scripts/convert-articles-to-mdx.ts
 *
 * Converts the 5 largest article files to MDX in content/blog/.
 * Each Article object becomes its own .mdx file named {slug}.mdx.
 */

import fs from 'fs'
import path from 'path'

import type { Article, ArticleLink, ArticleSection } from '../lib/blog/types'

// Import the 5 target article collections
import { highIntentKeywordArticles } from '../lib/blog/articles/high-intent-keywords'
import { highIntentSeoArticles } from '../lib/blog/articles/high-intent-seo'
import { medicalCertificateArticles } from '../lib/blog/articles/medical-certificates'
import { phase4ExpansionArticles } from '../lib/blog/articles/phase4-expansion'
import { trustBuildingArticles } from '../lib/blog/articles/trust-building'

// Also import images so we can resolve the actual URLs
import { blogImages } from '../lib/blog/images'
import { contentAuthors, defaultAuthor } from '../lib/blog/types'

const OUTPUT_DIR = path.join(process.cwd(), 'content', 'blog')

// Reverse-map author objects to registry keys
function resolveAuthorKey(author: Article['author']): string {
  if (author.name === defaultAuthor.name) return 'default'
  for (const [key, value] of Object.entries(contentAuthors)) {
    if (value.name === author.name) return key
  }
  // For non-registry authors (like drSarahChen in high-intent-keywords),
  // use 'default' since that maps to the medical team
  return 'default'
}

// Resolve image reference to actual URL
function resolveImage(heroImage: string): string {
  // If it's already a URL, return as-is
  if (heroImage.startsWith('http') || heroImage.startsWith('/')) return heroImage
  // Otherwise it might be a blogImages reference that was already resolved
  return heroImage
}

/**
 * Escape YAML string value -- wrap in quotes if needed.
 */
function yamlString(s: string): string {
  // If contains special chars, wrap in double quotes with escaping
  if (s.includes('"') || s.includes("'") || s.includes(':') || s.includes('#') || s.includes('\n') || s.includes('{') || s.includes('}') || s.includes('[') || s.includes(']') || s.includes('&') || s.includes('*') || s.includes('!') || s.includes('|') || s.includes('>') || s.includes('%') || s.includes('@') || s.includes('`')) {
    // Use double quotes with escaped double quotes
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  }
  // Simple strings can be unquoted if they don't start with special chars
  if (/^[a-zA-Z0-9]/.test(s) && !s.includes(': ')) {
    return '"' + s + '"'
  }
  return '"' + s + '"'
}

/**
 * Convert inline links in a paragraph to markdown link syntax.
 */
function applyLinks(content: string, links?: ArticleLink[]): string {
  if (!links || links.length === 0) return content

  let result = content
  // Sort by length descending to replace longest matches first
  const sorted = [...links].sort((a, b) => b.text.length - a.text.length)

  for (const link of sorted) {
    const escaped = link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'i')
    const titlePart = link.title ? ` "${link.title}"` : ''
    result = result.replace(regex, `[$1](${link.href}${titlePart})`)
  }

  return result
}

/**
 * Convert ArticleSection[] to MDX body text.
 */
function sectionsToMDX(sections: ArticleSection[]): string {
  const parts: string[] = []

  for (const section of sections) {
    switch (section.type) {
      case 'heading':
        if (section.level === 3) {
          parts.push(`### ${section.content}`)
        } else {
          parts.push(`## ${section.content}`)
        }
        break

      case 'paragraph': {
        const text = applyLinks(section.content, section.links)
        parts.push(text)
        break
      }

      case 'list':
        if (section.items) {
          parts.push(section.items.map(item => `- ${item}`).join('\n'))
        }
        break

      case 'callout':
        parts.push(`<Callout variant="${section.variant || 'info'}">`)
        parts.push(section.content)
        parts.push('</Callout>')
        break

      default:
        break
    }
  }

  return parts.join('\n\n')
}

/**
 * Convert a single Article to MDX file content.
 */
function articleToMDX(article: Article): string {
  const authorKey = resolveAuthorKey(article.author)
  const heroImage = resolveImage(article.heroImage)

  // Build frontmatter
  const fm: string[] = ['---']

  fm.push(`slug: ${article.slug}`)
  fm.push(`title: ${yamlString(article.title)}`)
  if (article.subtitle) fm.push(`subtitle: ${yamlString(article.subtitle)}`)
  fm.push(`excerpt: ${yamlString(article.excerpt)}`)
  fm.push(`category: ${article.category}`)

  if (article.tags && article.tags.length > 0) {
    fm.push('tags:')
    for (const tag of article.tags) {
      fm.push(`  - ${tag}`)
    }
  }

  fm.push(`publishedAt: "${article.publishedAt}"`)
  fm.push(`updatedAt: "${article.updatedAt}"`)
  fm.push(`readingTime: ${article.readingTime}`)
  fm.push(`viewCount: ${article.viewCount}`)
  fm.push(`author: ${authorKey}`)
  fm.push(`heroImage: ${yamlString(heroImage)}`)
  if (article.heroImageDark) fm.push(`heroImageDark: ${yamlString(article.heroImageDark)}`)
  fm.push(`heroImageAlt: ${yamlString(article.heroImageAlt)}`)

  // Series
  if (article.series) {
    fm.push('series:')
    fm.push(`  id: ${article.series.id}`)
    fm.push(`  name: ${yamlString(article.series.name)}`)
    fm.push(`  description: ${yamlString(article.series.description)}`)
    fm.push(`  order: ${article.series.order}`)
  }

  // FAQs
  if (article.faqs && article.faqs.length > 0) {
    fm.push('faqs:')
    for (const faq of article.faqs) {
      fm.push(`  - question: ${yamlString(faq.question)}`)
      fm.push(`    answer: ${yamlString(faq.answer)}`)
    }
  }

  // Related services
  if (article.relatedServices && article.relatedServices.length > 0) {
    fm.push('relatedServices:')
    for (const svc of article.relatedServices) {
      fm.push(`  - title: ${yamlString(svc.title)}`)
      fm.push(`    description: ${yamlString(svc.description)}`)
      fm.push(`    href: "${svc.href}"`)
      fm.push(`    icon: ${svc.icon}`)
    }
  }

  // Related articles
  if (article.relatedArticles && article.relatedArticles.length > 0) {
    fm.push('relatedArticles:')
    for (const slug of article.relatedArticles) {
      fm.push(`  - ${slug}`)
    }
  }

  // SEO
  if (article.seo) {
    fm.push('seo:')
    fm.push(`  title: ${yamlString(article.seo.title)}`)
    fm.push(`  description: ${yamlString(article.seo.description)}`)
    fm.push('  keywords:')
    for (const kw of article.seo.keywords) {
      fm.push(`    - ${yamlString(kw)}`)
    }
  }

  fm.push('---')

  // Build body
  const body = sectionsToMDX(article.content)

  return fm.join('\n') + '\n\n' + body + '\n'
}

// Main
function main() {
  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const collections: { name: string; articles: Article[] }[] = [
    { name: 'phase4-expansion', articles: phase4ExpansionArticles },
    { name: 'medical-certificates', articles: medicalCertificateArticles },
    { name: 'high-intent-keywords', articles: highIntentKeywordArticles },
    { name: 'trust-building', articles: trustBuildingArticles },
    { name: 'high-intent-seo', articles: highIntentSeoArticles },
  ]

  let totalConverted = 0
  let totalSkipped = 0

  for (const { name, articles } of collections) {
    let converted = 0
    for (const article of articles) {
      const outPath = path.join(OUTPUT_DIR, `${article.slug}.mdx`)

      // Skip if MDX already exists (don't overwrite manual edits)
      if (fs.existsSync(outPath)) {
        totalSkipped++
        continue
      }

      const mdxContent = articleToMDX(article)
      fs.writeFileSync(outPath, mdxContent, 'utf-8')
      converted++
      totalConverted++
    }
    // eslint-disable-next-line no-console
    console.log(`${name}: ${converted} articles converted (${articles.length} total)`)
  }

  // eslint-disable-next-line no-console
  console.log(`\nDone. ${totalConverted} MDX files written to content/blog/. ${totalSkipped} skipped (already exist).`)
}

main()
