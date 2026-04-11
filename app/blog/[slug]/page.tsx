import { Navbar } from "@/components/shared/navbar"
import { ContentPageTracker } from "@/components/analytics/content-page-tracker"
import { MarketingFooter } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { ArrowLeft, User, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ArticleTemplate } from "@/components/blog/article-template"
import { getArticleBySlug, getAllArticleSlugs, getRelatedArticles, allArticles } from "@/lib/blog/articles"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import { BreadcrumbSchema, FAQSchema, HowToSchema } from "@/components/seo/healthcare-schema"
import { PageBreadcrumbs } from "@/components/uix"
import { ReadingProgress } from "@/components/blog/reading-progress"
import { legacyPosts } from "@/lib/blog/articles/legacy-posts"
import { PRICING_DISPLAY } from "@/lib/constants"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

  // Check new article system first
  const article = getArticleBySlug(slug)
  if (article) {
    const ogImage = article.heroImage.startsWith("http")
      ? article.heroImage
      : `${baseUrl}${article.heroImage.startsWith("/") ? "" : "/"}${article.heroImage}`
    return {
      title: article.seo.title,
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
        canonical: `${baseUrl}/blog/${slug}`,
      },
    }
  }
  
  // Fall back to legacy posts
  const post = legacyPosts[slug]
  if (!post) return {}

  const legacyOgImage = post.image.startsWith("http")
    ? post.image
    : `${baseUrl}${post.image.startsWith("/") ? "" : "/"}${post.image}`

  return {
    title: post.title,
    description: post.excerpt,
    robots: { index: true, follow: true },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `${baseUrl}/blog/${slug}`,
      publishedTime: post.date,
      authors: [post.author],
      images: [
        {
          url: legacyOgImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  // Combine legacy posts and new articles
  const legacySlugs = Object.keys(legacyPosts)
  const newSlugs = getAllArticleSlugs()
  const allSlugs = [...new Set([...legacySlugs, ...newSlugs])]
  return allSlugs.map((slug) => ({ slug }))
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  
  // Check new article system first
  const article = getArticleBySlug(slug)
  if (article) {
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
      'how-escripts-work-australia'
    ]
    const isHowToArticle = howToSlugs.includes(slug)

    // Article schema for SEO - enhanced with image, wordCount, reviewedBy, lastReviewed
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      headline: article.title,
      description: article.excerpt,
      image: {
        "@type": "ImageObject",
        url: article.heroImage.startsWith('http') 
          ? article.heroImage 
          : `https://instantmed.com.au${article.heroImage}`,
        width: 1200,
        height: 630
      },
      wordCount,
      author: {
        "@type": "Person",
        name: article.author.name,
        jobTitle: "Medical Doctor",
        identifier: {
          "@type": "PropertyValue",
          propertyID: "AHPRA",
          value: article.author.ahpraNumber
        }
      },
      reviewedBy: {
        "@type": "Person",
        name: article.author.name,
        jobTitle: "Medical Doctor",
        identifier: {
          "@type": "PropertyValue",
          propertyID: "AHPRA",
          value: article.author.ahpraNumber
        }
      },
      lastReviewed: article.updatedAt,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      publisher: {
        "@type": "MedicalOrganization",
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
      about: {
        "@type": "MedicalCondition",
        name: article.title
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
            totalTime="PT30M"
            estimatedCost={slug.includes('prescription') ? '29.95' : '19.95'}
            steps={[
              { name: 'Complete a brief questionnaire', text: 'Tell us about your situation and what you need. Takes about 2 minutes.' },
              { name: 'Verify your identity', text: 'Provide your details including name and date of birth. Medicare is optional for certificates.' },
              { name: 'Make payment', text: `Pay securely online. Certificates from ${PRICING_DISPLAY.MED_CERT}, prescriptions ${PRICING_DISPLAY.REPEAT_SCRIPT}.` },
              { name: 'Doctor reviews your request', text: 'An AHPRA-registered doctor reviews your request. Most completed within an hour.' },
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
  
  // Fall back to legacy posts
  const post = legacyPosts[slug]
  if (!post) {
    notFound()
  }

  // Legacy article schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: "InstantMed",
    },
  }

  return (
    <>
      <script id="article-schema" type="application/ld+json"
        suppressHydrationWarning dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />
        <ContentPageTracker pageType="blog" slug={slug} />

        <main className="flex-1 pt-24">
          <article className="px-4 py-12">
            <div className="mx-auto max-w-2xl">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Health Guides
              </Link>

              <div className="mb-4">
                <SectionPill>{post.category}</SectionPill>
              </div>

              <h1 className="text-2xl font-semibold sm:text-3xl mb-4">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(post.date).toLocaleDateString("en-AU", { dateStyle: "medium" })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{post.readTime} read</span>
                </div>
              </div>

              <div className="relative h-64 rounded-2xl overflow-hidden mb-8">
                <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
              </div>

              <div className="prose prose-sm max-w-none">
                {post.content.map((paragraph, index) => {
                  if (paragraph.startsWith("## ")) {
                    return (
                      <h2 key={index} className="text-lg font-semibold mt-8 mb-3">
                        {paragraph.replace("## ", "")}
                      </h2>
                    )
                  }
                  if (paragraph.includes("\n-")) {
                    const items = paragraph.split("\n").filter((item) => item.startsWith("-"))
                    return (
                      <ul key={index} className="list-disc pl-5 space-y-1 text-muted-foreground">
                        {items.map((item, i) => (
                          <li key={i}>{item.replace("- ", "")}</li>
                        ))}
                      </ul>
                    )
                  }
                  return (
                    <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  )
                })}
              </div>

              <div className="mt-10 pt-8 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary/60" />
                  </div>
                  <div>
                    <p className="font-semibold">{post.author}</p>
                    <p className="text-sm text-muted-foreground">{post.authorBio}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border/50">
                <h3 className="font-semibold mb-4">Related</h3>
                <div className="flex flex-wrap gap-3">
                  {post.relatedLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Button variant="outline" size="sm">
                        {link.text}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
