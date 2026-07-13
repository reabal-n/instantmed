'use client'

import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Info,
  Shield,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import {
  CalloutBox,
  CareBoundaryBox,
  DecisionBox,
  EvidencePolicyNote,
  KeyTakeawayBox,
} from "@/components/blog/article-primitives"
import { ArticleSeriesNav, SeriesBadge } from "@/components/blog/article-series"
import { ArticleTags } from "@/components/blog/article-tags"
import { ArticleVisuals } from "@/components/blog/article-visuals"
import { PopularArticlesCompact } from "@/components/blog/popular-articles"
import { RelatedArticles } from "@/components/blog/related-articles"
import { SocialShare } from "@/components/blog/social-share"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { Badge } from "@/components/ui/badge"
import { slugifyHeading } from "@/lib/blog/heading"
import { getReviewer } from "@/lib/blog/medical-reviewer"
import type {
  Article,
  ArticleFAQ,
  ArticleIndexItem,
  ArticleLink,
  ArticleSection,
} from "@/lib/blog/types"
import type { RenderableArticleVisual } from "@/lib/blog/visuals"
import { cn } from "@/lib/utils"

interface ArticleTemplateProps {
  article: Article
  relatedArticles?: ArticleIndexItem[]
  seriesArticles?: ArticleIndexItem[]
  popularArticles?: ArticleIndexItem[]
  articleVisuals?: RenderableArticleVisual[]
}

function getBodyArticleVisuals(article: Article, articleVisuals: RenderableArticleVisual[]) {
  return articleVisuals.filter((visual) => visual.assetPath !== article.heroImage)
}

function getHeroImageFit(article: Article) {
  return article.heroImageFit ?? (article.heroImage.startsWith("/images/blog/") ? "contain" : "cover")
}

function getSourcesHeading(content: ArticleSection[]) {
  const sourceHeading = content.find(
    (section) =>
      section.type === "heading" &&
      section.level === 2 &&
      /^(Sources|References|Further reading)\b/i.test(section.content),
  )
  if (!sourceHeading) return null
  return {
    label: sourceHeading.content,
    id: slugifyHeading(sourceHeading.content),
  }
}

function formatArticleDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function getVisualPlacements(content: ArticleSection[], visualCount: number) {
  if (visualCount === 0) return new Map<number, number[]>()

  const headingIndexes = content
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => section.type === "heading" && section.level === 2)
    .map(({ index }) => index)

  const placements = new Map<number, number[]>()
  const fallbackIndexes = content.map((_, index) => index)
  const anchors = headingIndexes.length > 0 ? headingIndexes : fallbackIndexes

  for (let visualIndex = 0; visualIndex < visualCount; visualIndex += 1) {
    const anchorPosition = Math.min(
      anchors.length - 1,
      Math.max(0, Math.round(((visualIndex + 1) * anchors.length) / (visualCount + 1))),
    )
    const anchorIndex = anchors[anchorPosition]
    const nextHeadingIndex = content.findIndex(
      (section, index) => index > anchorIndex && section.type === "heading" && section.level === 2,
    )
    const maxIndex = nextHeadingIndex === -1 ? content.length - 1 : Math.max(anchorIndex, nextHeadingIndex - 1)
    const contentIndex = Math.min(anchorIndex + 2, maxIndex)
    placements.set(contentIndex, [...(placements.get(contentIndex) ?? []), visualIndex])
  }

  return placements
}

function SourceReviewPanel({ article }: { article: Article }) {
  const reviewer = getReviewer(article.slug)
  const updated = formatArticleDate(article.updatedAt)
  const sourcesHeading = getSourcesHeading(article.content)

  return (
    <section
      aria-label="Review and source information"
      className="mb-6 rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800">
            <BadgeCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
              Review
            </p>
            {reviewer.kind === "person" ? (
              <>
                <a
                  href={reviewer.registerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  {reviewer.name}
                </a>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {reviewer.title} · AHPRA {reviewer.ahpraNumber}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">{reviewer.name}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Clinical governance review for guide content
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700 dark:text-blue-300">
              Sources
            </p>
            {sourcesHeading ? (
              <a
                href={`#${sourcesHeading.id}`}
                className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
              >
                {sourcesHeading.label}
              </a>
            ) : (
              <p className="text-sm font-semibold text-foreground">References listed where relevant</p>
            )}
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Official and clinical sources are cited in the guide body.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
              Updated
            </p>
            <p className="text-sm font-semibold text-foreground">{updated}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              General information only, not personal medical advice.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function renderContentWithLinks(content: string, links?: ArticleLink[]): React.ReactNode {
  if (!links || links.length === 0) {
    return content
  }
  
  // Sort links by position in text (longest match first to avoid partial replacements)
  const sortedLinks = [...links].sort((a, b) => b.text.length - a.text.length)
  
  let result: React.ReactNode[] = [content]
  
  sortedLinks.forEach((link, linkIndex) => {
    result = result.flatMap((part, partIndex) => {
      if (typeof part !== 'string') return part
      
      const regex = new RegExp(`(${link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i')
      const parts = part.split(regex)
      
      return parts.map((segment, segIndex) => {
        if (segment.toLowerCase() === link.text.toLowerCase()) {
          return (
            <Link 
              key={`link-${linkIndex}-${partIndex}-${segIndex}`}
              href={link.href}
              className="text-primary hover:underline"
              title={link.title}
            >
              {segment}
            </Link>
          )
        }
        return segment
      })
    })
  })
  
  return result
}

function MobileTOC({ content }: { content: ArticleSection[] }) {
  const headings = content.filter(s => s.type === 'heading' && s.level === 2)
  if (headings.length < 3) return null
  return (
    <div className="lg:hidden mb-6">
      <details className="group border border-border rounded-xl overflow-hidden bg-white dark:bg-card">
        <summary className="flex items-center justify-between cursor-pointer px-4 py-3 list-none select-none">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Jump to section</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="border-t border-border px-4 py-3 space-y-1">
          {headings.map((h, i) => (
            <a
              key={i}
              href={`#${slugifyHeading(h.content)}`}
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary transition-colors py-1"
            >
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">{i + 1}</span>
              <span>{h.content}</span>
            </a>
          ))}
        </div>
      </details>
    </div>
  )
}

function ContentSection({ section }: { section: ArticleSection }) {
  switch (section.type) {
    case 'heading':
      if (section.level === 3) {
        return (
          <h3
            id={slugifyHeading(section.content)}
            className="flex items-center gap-2 text-base font-semibold text-foreground mt-8 mb-3 scroll-mt-24"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            {section.content}
          </h3>
        )
      }
      return (
        <div className="mt-12 mb-5">
          <h2
            id={slugifyHeading(section.content)}
            className="text-2xl font-semibold text-foreground leading-snug scroll-mt-24 tracking-tight"
          >
            {section.content}
          </h2>
        </div>
      )

    case 'paragraph':
      return (
        <p className="text-[15px] text-muted-foreground leading-[1.75] mb-5">
          {renderContentWithLinks(section.content, section.links)}
        </p>
      )

    case 'list':
      return (
        <ul className="space-y-2.5 mb-6 ml-1">
          {section.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg px-3 py-2 bg-muted/40 text-[14.5px] text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'steps':
      return (
        <ol className="my-6 ml-1">
          {section.items?.map((item, i, arr) => (
            <li key={i} className="flex gap-4">
              {/* Step indicator with connecting line */}
              <div className="flex flex-col items-center">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-white shadow-sm">
                  {i + 1}
                </div>
                {i < arr.length - 1 && (
                  <div className="w-0.5 flex-1 bg-primary/20 my-1" />
                )}
              </div>
              <div className={cn("flex-1", i < arr.length - 1 ? "pb-5" : "")}>
                <p className="text-[14.5px] text-muted-foreground leading-relaxed pt-1.5">{item}</p>
              </div>
            </li>
          ))}
        </ol>
      )

    case 'table':
      return (
        <div className="my-8 overflow-x-auto rounded-2xl border border-border/50 bg-white shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            {section.headers && section.headers.length > 0 && (
              <thead>
                <tr className="border-b border-border/70 bg-muted/60 dark:bg-white/[0.06]">
                  {section.headers.map((h, i) => (
                    <th key={i} scope="col" className="px-4 py-3.5 text-left font-semibold text-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {section.rows?.map((row, ri) => (
                <tr
                  key={ri}
                  className={cn(
                    "border-b border-border/40 transition-colors last:border-b-0 hover:bg-primary/[0.035] dark:hover:bg-white/[0.04]",
                    ri % 2 === 1 && "bg-muted/20 dark:bg-white/[0.025]",
                  )}
                >
                  {row.map((cell, ci) => (
                    ci === 0 ? (
                      <th key={ci} scope="row" className="px-4 py-3.5 text-left font-medium text-foreground">
                        {cell}
                      </th>
                    ) : (
                      <td key={ci} className="px-4 py-3.5 leading-relaxed text-muted-foreground">
                        {cell}
                      </td>
                    )
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'callout':
      return <CalloutBox variant={section.variant} content={section.content} />

    case 'keyTakeaway':
      return <KeyTakeawayBox section={section} />

    case 'decisionBox':
      return <DecisionBox section={section} />

    case 'evidenceNote':
    case 'policyNote':
      return <EvidencePolicyNote section={section} />

    case 'careBoundary':
      return <CareBoundaryBox section={section} />

    default:
      return null
  }
}

function generateFaqId(question: string, index: number): string {
  return `faq-${index + 1}-${question.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`
}

function FAQSection({ faqs }: { faqs: ArticleFAQ[] }) {
  return (
    <div className="mt-12 pt-8 border-t border-border">
      <div className="flex items-center gap-3 mb-6" id="faq">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Info className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
      </div>
      <div className="space-y-2">
        {faqs.map((faq, i) => {
          const faqId = generateFaqId(faq.question, i)
          return (
            <details
              key={i}
              id={faqId}
              className="group border border-border rounded-xl overflow-hidden scroll-mt-24 bg-white dark:bg-card hover:border-primary/30 transition-colors"
            >
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-medium text-[15px] text-foreground hover:bg-muted/30 list-none gap-4">
                <span>{faq.question}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 shrink-0" />
              </summary>
              <div className="px-5 pb-4 pt-1 border-t border-border/50">
                <p className="text-[14.5px] text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}

export function ArticleTemplate({
  article,
  relatedArticles,
  seriesArticles = [],
  popularArticles = [],
  articleVisuals = [],
}: ArticleTemplateProps) {
  const [readingProgress, setReadingProgress] = useState(0)
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const el = articleRef.current
      if (!el) return
      const { top, height } = el.getBoundingClientRect()
      const viewH = window.innerHeight
      const scrolled = Math.max(0, -top)
      const total = height - viewH
      setReadingProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Check if we have enough headings for TOC
  const hasEnoughHeadings = article.content.filter(
    section => section.type === 'heading' && section.level && section.level <= 3
  ).length >= 4

  const bodyArticleVisuals = getBodyArticleVisuals(article, articleVisuals)
  const visualPlacements = getVisualPlacements(article.content, bodyArticleVisuals.length)
  const heroImageFit = getHeroImageFit(article)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-border/30">
        <div
          className="h-full bg-primary transition-[width] duration-100 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Health Guides
      </Link>

      <div className={hasEnoughHeadings || article.series ? "lg:grid lg:grid-cols-[1fr_280px] lg:gap-10" : ""}>
        {/* Main content */}
        <article ref={articleRef}>

      {/* Series badge */}
      {article.series && (
        <div className="mb-4">
          <SeriesBadge 
            series={article.series} 
            totalArticles={seriesArticles.length}
            currentOrder={article.series.order}
          />
        </div>
      )}

      {/* Category badge */}
      <Badge 
        variant="secondary" 
        className="mb-4 bg-primary/10 text-primary border-0"
      >
        {article.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
      </Badge>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight mb-4">
        {article.title}
      </h1>

      {/* Subtitle */}
      {article.subtitle && (
        <p className="text-lg text-muted-foreground mb-6">
          {article.subtitle}
        </p>
      )}

      {/* Meta bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{article.readingTime} min read</span>
        </div>
        <span className="text-border">·</span>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>Updated {new Date(article.updatedAt).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}</span>
        </div>
        <span className="text-border">·</span>
        <div className="flex items-center gap-1.5">
          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Doctor Reviewed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">AHPRA Verified</span>
        </div>
      </div>

      {/* Hero image */}
      <div className="relative aspect-video rounded-2xl overflow-hidden mb-8 bg-card/40 dark:bg-white/10">
        <Image
          src={article.heroImage}
          alt={article.heroImageAlt}
          fill
          className={heroImageFit === "contain" ? "object-contain" : "object-cover"}
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 672px, 750px"
        />
      </div>

      {/* What you'll learn (derived from H2 headings) */}
      {(() => {
        const h2s = article.content.filter(s => s.type === 'heading' && s.level === 2).slice(0, 5)
        if (h2s.length < 2) return null
        return (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">In this article</p>
            <ul className="space-y-2">
              {h2s.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0 mt-0.5">{i + 1}</span>
                  <span>{s.content}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })()}

      {/* Medical disclaimer — compact inline style */}
      <div className="flex gap-2.5 items-start bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-6">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          <span className="font-semibold">Medical information only.</span> This article is for general information and does not constitute medical advice. Treatment decisions are made by an AHPRA-registered doctor after reviewing your circumstances.
        </p>
      </div>

      <SourceReviewPanel article={article} />

      {/* Mobile jump-to-section */}
      <MobileTOC content={article.content} />

      {/* Content */}
      <div className="prose-content">
        {article.content.map((section, i) => (
          <div key={i}>
            <ContentSection section={section} />
            {visualPlacements.get(i)?.map((visualIndex) => (
              <ArticleVisuals
                key={bodyArticleVisuals[visualIndex].id}
                visuals={[bodyArticleVisuals[visualIndex]]}
              />
            ))}
          </div>
        ))}
      </div>

      {/* FAQs */}
      {article.faqs && article.faqs.length > 0 && (
        <FAQSection faqs={article.faqs} />
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <ArticleTags tags={article.tags} />
        </div>
      )}

      {/* Author card - at end of article */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="bg-white dark:bg-card rounded-xl p-4 border border-border/50 dark:border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-foreground">{article.author.name}</p>
              <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
            </div>
            {article.author.credentials && (
              <span className="text-sm text-muted-foreground">{article.author.credentials}</span>
            )}
          </div>
          {article.author.ahpraNumber && (
            <p className="text-sm text-muted-foreground mt-1">
              AHPRA: {article.author.ahpraNumber}
            </p>
          )}
        </div>
      </div>

      {/* Social sharing */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground">Share this guide</p>
          <SocialShare 
            url={`https://instantmed.com.au/blog/${article.slug}`}
            title={article.title}
          />
        </div>
      </div>

      {/* Related articles */}
      {relatedArticles && relatedArticles.length > 0 && (
        <RelatedArticles
          articles={relatedArticles}
          currentSlug={article.slug}
        />
      )}
        </article>

        {/* Sidebar */}
        {(hasEnoughHeadings || seriesArticles.length > 0 || popularArticles.length > 0) && (
          <aside className="hidden lg:block space-y-6">
            {/* Table of Contents */}
            {hasEnoughHeadings && (
              <TableOfContents content={article.content} />
            )}
            
            {/* Series Navigation */}
            {article.series && seriesArticles.length > 0 && (
              <ArticleSeriesNav 
                series={article.series}
                articles={seriesArticles}
                currentSlug={article.slug}
              />
            )}
            
            {/* Popular Articles */}
            {popularArticles.length > 0 && (
              <div className="bg-white dark:bg-card rounded-xl p-5 border border-border/50 dark:border-white/10">
                <PopularArticlesCompact articles={popularArticles} limit={3} />
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
