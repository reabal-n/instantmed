'use client'

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Info,
  Lightbulb,
  Pill,
  Shield,
  Stethoscope} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { ArticleSeriesNav, SeriesBadge } from "@/components/blog/article-series"
import { ArticleTags } from "@/components/blog/article-tags"
import { HeroImage as _HeroImage } from "@/components/blog/hero-image"
import { PopularArticlesCompact } from "@/components/blog/popular-articles"
import { RelatedArticles } from "@/components/blog/related-articles"
import { SocialShare } from "@/components/blog/social-share"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { BlogCTACard } from "@/components/marketing/blog-cta-card"
import { Badge } from "@/components/ui/badge"
import type { Article, ArticleFAQ, ArticleLink,ArticleSection, RelatedService } from "@/lib/blog/types"
import { cn } from "@/lib/utils"

interface ArticleTemplateProps {
  article: Article
  relatedArticles?: Article[]
  allArticles?: Article[]
}

function ServiceIcon({ icon }: { icon: RelatedService['icon'] }) {
  switch (icon) {
    case 'certificate':
      return <FileText className="w-5 h-5" />
    case 'prescription':
      return <Pill className="w-5 h-5" />
    case 'consult':
      return <Stethoscope className="w-5 h-5" />
    case 'referral':
      return <Building2 className="w-5 h-5" />
    default:
      return <FileText className="w-5 h-5" />
  }
}

const calloutConfig = {
  info: {
    icon: Info,
    label: 'Key Information',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    accent: 'bg-blue-500',
    iconColor: 'text-blue-600 dark:text-blue-400',
    labelColor: 'text-blue-700 dark:text-blue-300',
    textColor: 'text-blue-800 dark:text-blue-200',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Important Warning',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    accent: 'bg-amber-500',
    iconColor: 'text-amber-600 dark:text-amber-400',
    labelColor: 'text-amber-700 dark:text-amber-300',
    textColor: 'text-amber-800 dark:text-amber-200',
  },
  tip: {
    icon: Lightbulb,
    label: 'Helpful Tip',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    accent: 'bg-emerald-500',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    labelColor: 'text-emerald-700 dark:text-emerald-300',
    textColor: 'text-emerald-800 dark:text-emerald-200',
  },
  emergency: {
    icon: AlertTriangle,
    label: 'Emergency Information',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    accent: 'bg-red-500',
    iconColor: 'text-red-600 dark:text-red-400',
    labelColor: 'text-red-700 dark:text-red-300',
    textColor: 'text-red-800 dark:text-red-200',
  },
}

function CalloutBox({ variant, content }: { variant: ArticleSection['variant'], content: string }) {
  const cfg = calloutConfig[variant || 'info']
  const Icon = cfg.icon

  return (
    <div className={cn("relative rounded-xl border overflow-hidden my-6", cfg.bg, cfg.border)}>
      {/* Left accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", cfg.accent)} />
      <div className="pl-5 pr-4 py-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className={cn("w-4 h-4 shrink-0", cfg.iconColor)} />
          <span className={cn("text-xs font-semibold uppercase tracking-wide", cfg.labelColor)}>{cfg.label}</span>
        </div>
        <p className={cn("text-sm leading-relaxed", cfg.textColor)}>{content}</p>
      </div>
    </div>
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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
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
              href={`#${slugify(h.content)}`}
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

function MidArticleCTA({ service }: { service: 'med-cert' | 'prescription' | 'consult' }) {
  const config = {
    'med-cert': {
      text: 'Need a medical certificate?',
      sub: 'Assessed by an AHPRA-registered doctor. No appointment, 24/7.',
      href: '/medical-certificate',
      label: 'Get your certificate',
    },
    'prescription': {
      text: 'Need a repeat prescription?',
      sub: 'A doctor reviews your request — typically within 2 hours.',
      href: '/prescriptions',
      label: 'Request your script',
    },
    'consult': {
      text: 'Speak with a doctor online',
      sub: 'AHPRA-registered doctors. Requests accepted 24/7.',
      href: '/consult',
      label: 'Start a consultation',
    },
  }
  const { text, sub, href, label } = config[service]
  return (
    <div className="my-8 flex items-center justify-between gap-4 flex-wrap rounded-xl border border-primary/25 bg-primary/5 px-5 py-4">
      <div className="min-w-0">
        <p className="font-medium text-foreground text-sm">{text}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline whitespace-nowrap shrink-0"
      >
        {label}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

function ContentSection({ section }: { section: ArticleSection }) {
  switch (section.type) {
    case 'heading':
      if (section.level === 3) {
        return (
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mt-8 mb-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            {section.content}
          </h3>
        )
      }
      return (
        <div className="mt-12 mb-5">
          <h2
            id={slugify(section.content)}
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
        <div className="overflow-x-auto my-6 rounded-xl border border-border">
          <table className="w-full text-sm border-collapse">
            {section.headers && section.headers.length > 0 && (
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {section.headers.map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {section.rows?.map((row, ri) => (
                <tr key={ri} className={cn("border-b border-border/50", ri % 2 === 1 && "bg-muted/20")}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={cn("px-4 py-3 text-muted-foreground", ci === 0 && "font-medium text-foreground")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'callout':
      return <CalloutBox variant={section.variant} content={section.content} />

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

function deriveArticleService(article: Article): 'med-cert' | 'prescription' | 'consult' {
  const firstService = article.relatedServices[0]
  if (!firstService) return 'med-cert'
  if (firstService.icon === 'prescription') return 'prescription'
  if (firstService.icon === 'consult') return 'consult'
  return 'med-cert'
}

export function ArticleTemplate({ article, relatedArticles, allArticles = [] }: ArticleTemplateProps) {
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

  // Get series articles count if in a series
  const seriesArticles = article.series
    ? allArticles.filter(a => a.series?.id === article.series?.id)
    : []

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
          className="object-cover"
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

      {/* Mobile jump-to-section */}
      <MobileTOC content={article.content} />

      {/* Content — inject mid-article CTA after every 3rd H2 */}
      <div className="prose-content">
        {(() => {
          const service = deriveArticleService(article)
          let h2Count = 0
          return article.content.flatMap((section, i) => {
            const el = <ContentSection key={i} section={section} />
            if (section.type === 'heading' && section.level === 2) {
              h2Count++
              if (h2Count % 3 === 0) {
                return [el, <MidArticleCTA key={`cta-${i}`} service={service} />]
              }
            }
            return [el]
          })
        })()}
      </div>

      {/* FAQs */}
      {article.faqs && article.faqs.length > 0 && (
        <FAQSection faqs={article.faqs} />
      )}

      {/* Blog CTA Card — service derived from article's first relatedService */}
      <BlogCTACard service={deriveArticleService(article)} />

      {/* Related services */}
      {article.relatedServices.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            How InstantMed Can Help
          </h2>
          <p className="text-muted-foreground mb-6">
            Our AHPRA-registered doctors are available to assess your situation and provide appropriate care.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {article.relatedServices.map((service, i) => (
              <Link
                key={i}
                href={service.href}
                className="group flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/10 hover:border-primary/30 dark:hover:border-primary/40 transition-[box-shadow,border-color]"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ServiceIcon icon={service.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {service.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {service.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform shrink-0 mt-3" />
              </Link>
            ))}
          </div>
        </div>
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
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Last medically reviewed:</span>{' '}
            {new Date(article.updatedAt).toLocaleDateString('en-AU', { 
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
            {' '}by <span className="inline-flex items-center gap-1">{article.author.name}<BadgeCheck className="w-3.5 h-3.5 text-primary inline-block" /></span>
          </p>
          <SocialShare 
            url={`https://instantmed.com.au/blog/${article.slug}`}
            title={article.title}
            description={article.excerpt}
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

      {/* Service & guide cross-links */}
      <div className="mt-8 py-5 border-t">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
          {article.category === "medical-certificates" && (
            <>
              <Link href="/medical-certificate" className="text-primary hover:underline">Medical certificates</Link>
              <Link href="/conditions/cold-and-flu" className="text-primary hover:underline">Cold & flu</Link>
              <Link href="/conditions/sore-throat" className="text-primary hover:underline">Sore throat</Link>
            </>
          )}
          {article.category === "medications" && (
            <>
              <Link href="/prescriptions" className="text-primary hover:underline">Prescription service</Link>
              <Link href="/conditions/chest-infection" className="text-primary hover:underline">Chest infection</Link>
              <Link href="/conditions/sore-throat" className="text-primary hover:underline">Sore throat</Link>
            </>
          )}
          {article.category === "telehealth" && (
            <>
              <Link href="/consult" className="text-primary hover:underline">Online consultations</Link>
              <Link href="/how-it-works" className="text-primary hover:underline">How it works</Link>
              <Link href="/conditions/cold-and-flu" className="text-primary hover:underline">Cold & flu</Link>
            </>
          )}
          {article.category === "conditions" && (
            <>
              <Link href="/consult" className="text-primary hover:underline">Online consultations</Link>
              <Link href="/medical-certificate" className="text-primary hover:underline">Medical certificates</Link>
              <Link href="/prescriptions" className="text-primary hover:underline">Prescriptions</Link>
            </>
          )}
          {article.category === "workplace-health" && (
            <>
              <Link href="/medical-certificate" className="text-primary hover:underline">Medical certificates</Link>
              <Link href="/consult" className="text-primary hover:underline">Online consultations</Link>
              <Link href="/conditions/mental-health-day" className="text-primary hover:underline">Mental health day</Link>
            </>
          )}
        </div>
      </div>

      {/* Location cross-links for local SEO */}
      <div className="mt-4 py-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Available in{" "}
          {["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"].map((city, i, arr) => (
            <span key={city}>
              <Link href={`/locations/${city.toLowerCase()}`} className="text-primary hover:underline">
                {city}
              </Link>
              {i < arr.length - 1 && ", "}
            </span>
          ))}
          {" "}and{" "}
          <Link href="/locations" className="text-primary hover:underline font-medium">
            20+ more cities
          </Link>
        </p>
      </div>
        </article>

        {/* Sidebar */}
        {(hasEnoughHeadings || article.series || allArticles.length > 0) && (
          <aside className="hidden lg:block space-y-6">
            {/* Table of Contents */}
            {hasEnoughHeadings && (
              <TableOfContents content={article.content} />
            )}
            
            {/* Series Navigation */}
            {article.series && allArticles.length > 0 && (
              <ArticleSeriesNav 
                series={article.series}
                articles={allArticles}
                currentSlug={article.slug}
              />
            )}
            
            {/* Popular Articles */}
            {allArticles.length > 0 && (
              <div className="bg-white dark:bg-card rounded-xl p-5 border border-border/50 dark:border-white/10">
                <PopularArticlesCompact articles={allArticles} limit={3} />
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
