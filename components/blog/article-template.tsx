'use client'

import Link from "next/link"
import Image from "next/image"
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Lightbulb,
  FileText,
  Stethoscope,
  Pill,
  ArrowRight,
  ExternalLink,
  BadgeCheck,
  Building2,
  ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SocialShare } from "@/components/blog/social-share"
import { RelatedArticles } from "@/components/blog/related-articles"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { ArticleTags } from "@/components/blog/article-tags"
import { ArticleSeriesNav, SeriesBadge } from "@/components/blog/article-series"
import { HeroImage } from "@/components/blog/hero-image"
import { PopularArticlesCompact } from "@/components/blog/popular-articles"
import type { Article, ArticleSection, RelatedService, ArticleFAQ } from "@/lib/blog/types"

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

function CalloutBox({ variant, content }: { variant: ArticleSection['variant'], content: string }) {
  const config = {
    info: {
      icon: Info,
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-800 dark:text-blue-200'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-800 dark:text-amber-200'
    },
    tip: {
      icon: Lightbulb,
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      textColor: 'text-emerald-800 dark:text-emerald-200'
    },
    emergency: {
      icon: AlertTriangle,
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-800 dark:text-red-200'
    }
  }

  const { icon: Icon, bg, border, iconColor, textColor } = config[variant || 'info']

  return (
    <div className={`${bg} ${border} border rounded-xl p-4 my-6`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
        <p className={`${textColor} text-sm leading-relaxed`}>{content}</p>
      </div>
    </div>
  )
}

function ContentSection({ section }: { section: ArticleSection }) {
  switch (section.type) {
    case 'heading':
      if (section.level === 3) {
        return (
          <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
            {section.content}
          </h3>
        )
      }
      return (
        <h2 className="text-xl font-bold text-foreground mt-10 mb-4">
          {section.content}
        </h2>
      )
    
    case 'paragraph':
      return (
        <p className="text-muted-foreground leading-relaxed mb-4">
          {section.content}
        </p>
      )
    
    case 'list':
      return (
        <ul className="space-y-2 mb-6">
          {section.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    
    case 'callout':
      return <CalloutBox variant={section.variant} content={section.content} />
    
    default:
      return null
  }
}

function FAQSection({ faqs }: { faqs: ArticleFAQ[] }) {
  return (
    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
      <h2 className="text-xl font-bold text-foreground mb-6">
        Frequently Asked Questions
      </h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <details 
            key={i}
            className="group border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            <summary className="flex items-center justify-between cursor-pointer px-4 py-4 font-medium text-foreground hover:bg-slate-50 dark:hover:bg-slate-900/50 list-none">
              <span>{faq.question}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 text-muted-foreground">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

export function ArticleTemplate({ article, relatedArticles, allArticles = [] }: ArticleTemplateProps) {
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
        <article>

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
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
        {article.title}
      </h1>

      {/* Subtitle */}
      {article.subtitle && (
        <p className="text-lg text-muted-foreground mb-6">
          {article.subtitle}
        </p>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{article.readingTime} min read</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>Updated {new Date(article.updatedAt).toLocaleDateString('en-AU', { 
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}</span>
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <BadgeCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Doctor Reviewed</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">AHPRA Verified</span>
        </div>
      </div>

      {/* Hero image */}
      <div className="relative aspect-video rounded-2xl overflow-hidden mb-10 bg-slate-100 dark:bg-slate-800">
        <Image
          src={article.heroImage}
          alt={article.heroImageAlt}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Author card */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-10 border border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {article.author.image ? (
              <Image 
                src={article.author.image} 
                alt={article.author.name}
                width={56}
                height={56}
                className="object-cover"
              />
            ) : (
              <Stethoscope className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">{article.author.name}</p>
              <span className="text-sm text-muted-foreground">{article.author.credentials}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              AHPRA: {article.author.ahpraNumber}
            </p>
            <Link 
              href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              Verify registration
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Medical disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-10">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
              Medical Information Disclaimer
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This article is for general information only and does not constitute medical advice. 
              All treatment decisions are made by an AHPRA-registered doctor after reviewing your individual circumstances.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="prose-content">
        {article.content.map((section, i) => (
          <ContentSection key={i} section={section} />
        ))}
      </div>

      {/* FAQs */}
      {article.faqs && article.faqs.length > 0 && (
        <FAQSection faqs={article.faqs} />
      )}

      {/* Related services CTA */}
      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-foreground mb-2">
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
              className="group flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all"
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
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-3" />
            </Link>
          ))}
        </div>
      </div>

      {/* Primary CTA */}
      <div className="mt-10 p-6 sm:p-8 bg-linear-to-br from-primary/5 via-primary/10 to-blue-500/5 rounded-2xl border border-primary/20 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Need a Medical Certificate?
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Get assessed by an Australian-registered doctor. Most requests reviewed within an hour.
        </p>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/start">
            Get started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          From $19.95 · AHPRA-registered doctors
        </p>
      </div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <ArticleTags tags={article.tags} />
        </div>
      )}

      {/* Social sharing */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Last medically reviewed:</span>{' '}
            {new Date(article.updatedAt).toLocaleDateString('en-AU', { 
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
            {' '}by {article.author.name}
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
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
                <PopularArticlesCompact articles={allArticles} limit={3} />
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
