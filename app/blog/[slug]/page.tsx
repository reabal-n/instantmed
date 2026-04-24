import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ContentPageTracker } from "@/components/analytics/content-page-tracker"
import { ArticleTemplate } from "@/components/blog/article-template"
import { ReadingProgress } from "@/components/blog/reading-progress"
import { MarketingFooter } from "@/components/marketing"
import { BreadcrumbSchema, FAQSchema, HowToSchema } from "@/components/seo"
import { Navbar } from "@/components/shared"
import { PageBreadcrumbs } from "@/components/uix"
import { allArticles, getAllArticleSlugs, getArticleBySlug, getRelatedArticles } from "@/lib/blog/articles"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

  const article = getArticleBySlug(slug)
  if (!article) return {}

  const ogImage = article.heroImage.startsWith("http")
    ? article.heroImage
    : `${baseUrl}${article.heroImage.startsWith("/") ? "" : "/"}${article.heroImage}`

  return {
    title: { absolute: article.seo.title },
    description: article.seo.description,
    keywords: article.seo.keywords,
    robots: { index: true, follow: true },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      url: `${baseUrl}/blog/${slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author.name],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: article.heroImageAlt || article.title,
        },
      ],
    },
    alternates: {
      canonical: article.canonical ?? `${baseUrl}/blog/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }))
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params

  const article = getArticleBySlug(slug)
  if (!article) notFound()

  // Build FAQ schema data if FAQs exist
  const faqSchemaData = article.faqs?.map(faq => ({
    question: faq.question,
    answer: faq.answer
  })) || []

  // Calculate word count from content
  const wordCount = article.content.reduce((count, section) => {
    const text = section.content + (section.items?.join(' ') || '')
    return count + text.split(/\s+/).filter(Boolean).length
  }, 0)

  // Check if this is a "how to" article that should have HowToSchema
  const howToSlugs = [
    'medical-certificate-online-australia',
    'online-prescription-australia',
    'repeat-prescription-online',
    'same-day-medical-certificate',
    'same-day-medical-certificate-fast',
    'sick-leave-certificate-online-australia',
    'repeat-prescription-online-australia',
    'online-doctor-certificate-for-work',
    'how-escripts-work-australia',
    'antibiotic-prescription-online-australia'
  ]
  const isHowToArticle = howToSlugs.includes(slug)

  const heroImageUrl = article.heroImage.startsWith('http')
    ? article.heroImage
    : `https://instantmed.com.au${article.heroImage}`
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": ["MedicalWebPage", "BlogPosting"],
    headline: article.title,
    description: article.excerpt,
    image: [heroImageUrl],
    wordCount,
    author: {
      "@type": "MedicalOrganization",
      "@id": "https://instantmed.com.au/#organization",
      name: "InstantMed",
      url: "https://instantmed.com.au",
    },
    reviewedBy: {
      "@type": "MedicalOrganization",
      "@id": "https://instantmed.com.au/#organization",
      name: "InstantMed",
    },
    lastReviewed: article.updatedAt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    publisher: {
      "@type": "MedicalOrganization",
      "@id": "https://instantmed.com.au/#organization",
      name: "InstantMed",
      url: "https://instantmed.com.au",
      logo: {
        "@type": "ImageObject",
        url: "https://instantmed.com.au/branding/logo.png"
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://instantmed.com.au/blog/${slug}`
    },
    inLanguage: "en-AU",
    isAccessibleForFree: true
  }

  return (
    <>
      <ReadingProgress />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Health Guides", url: "https://instantmed.com.au/blog" },
          { name: article.title, url: `https://instantmed.com.au/blog/${slug}` }
        ]}
      />
      {faqSchemaData.length > 0 && <FAQSchema faqs={faqSchemaData} />}
      {isHowToArticle && (
        <HowToSchema
          name={article.title}
          description={article.excerpt}
          totalTime="PT120M"
          estimatedCost={slug.includes('prescription') ? String(PRICING.REPEAT_SCRIPT) : String(PRICING.MED_CERT)}
          steps={[
            { name: 'Complete a brief questionnaire', text: 'Tell us about your situation and what you need. Takes about 2 minutes.' },
            { name: 'Verify your identity', text: 'Provide your details including name and date of birth. Medicare is optional for certificates.' },
            { name: 'Make payment', text: `Pay securely online. Certificates from ${PRICING_DISPLAY.MED_CERT}, prescriptions ${PRICING_DISPLAY.REPEAT_SCRIPT}.` },
            { name: 'Doctor reviews your request', text: 'An AHPRA-registered doctor reviews your request. Most reviewed within 1-2 hours.' },
            { name: 'Receive your document', text: slug.includes('prescription')
              ? 'If approved, your eScript is sent via SMS to your phone. Take it to any pharmacy.'
              : 'Your medical certificate is emailed as a PDF, valid for work and institutions.'
            }
          ]}
        />
      )}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }}
      />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />
        <ContentPageTracker pageType="blog" slug={slug} />

        <main className="flex-1 pt-24 pb-16">
          <div className="px-4">
            <div className="max-w-4xl mx-auto mb-6">
              <PageBreadcrumbs
                links={[
                  { label: "Health Guides", href: "/blog" },
                  { label: article.title }
                ]}
                showHome
              />
            </div>
            <ArticleTemplate article={article} relatedArticles={getRelatedArticles(slug, 3)} allArticles={allArticles} />
          </div>
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
