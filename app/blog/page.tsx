import { ArrowRight, Clock, Eye, Link2,Linkedin, Share2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ArticlesPage } from "@/components/blog/articles-page";
import { CenteredHero } from "@/components/heroes";
import { MarketingFooter } from "@/components/marketing";
import { CTABanner } from "@/components/sections";
import { BreadcrumbSchema } from "@/components/seo";
import { Navbar } from "@/components/shared";
import { SectionPill } from "@/components/ui/section-pill";
import { allArticles } from "@/lib/blog/articles";
import { categories } from "@/lib/blog/types";
import { PRICING_DISPLAY } from "@/lib/constants";

// Revalidate every 12 hours - blog index updates occasionally
export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Telehealth Health Guides & Medical Articles",
  description:
    "Doctor-reviewed guides on medical certificates, telehealth and prescriptions. Written by AHPRA-registered Australian GPs.",
  openGraph: {
    title: "InstantMed Health Guides",
    description:
      "Doctor-reviewed health guides from Australian medical professionals.",
    url: "https://instantmed.com.au/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantMed Health Guides",
    description:
      "Doctor-reviewed health guides from Australian medical professionals.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/blog",
  },
};

function formatViewCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return count.toString();
}

export default function BlogPage() {
  // Sort by views for trending / featured
  const sortedByViews = [...allArticles].sort((a, b) => b.viewCount - a.viewCount);
  const featured = sortedByViews[0];
  const trending = sortedByViews.slice(1, 5);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Health Guides", url: "https://instantmed.com.au/blog" },
        ]}
      />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <CenteredHero
            pill="Doctor-Reviewed Content"
            title="Health Guides"
            highlightWords={["Guides"]}
            subtitle="Practical health information reviewed by AHPRA-registered doctors. Clear, accurate guidance for Australians."
          />

          {/* Featured Article Hero */}
          {featured && (
            <section className="px-4 py-8 sm:px-6">
              <div className="mx-auto max-w-6xl">
                <div className="mb-6">
                  <SectionPill>Featured</SectionPill>
                </div>
                <Link href={`/blog/${featured.slug}`} className="group block">
                  <div className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none overflow-hidden hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300">
                    <div className="grid md:grid-cols-2">
                      <div className="relative h-48 md:h-full min-h-[240px]">
                        <Image
                          src={featured.heroImage}
                          alt={featured.heroImageAlt}
                          fill
                          className="object-cover"
                          priority
                        />
                      </div>
                      <div className="p-6 sm:p-8 flex flex-col justify-center">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary w-fit mb-3">
                          {categories[featured.category]?.name || featured.category}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors mb-3">
                          {featured.title}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                          {featured.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{featured.readingTime} min read</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{formatViewCount(featured.viewCount)} views</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1 mt-3 md:justify-end">
                  <span className="text-xs text-muted-foreground mr-1">Share</span>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://instantmed.com.au/blog/${featured.slug}`)}&text=${encodeURIComponent(featured.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors"
                    aria-label="Share on X"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://instantmed.com.au/blog/${featured.slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors"
                    aria-label="Share on LinkedIn"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`https://instantmed.com.au/blog/${featured.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors"
                    aria-label="Copy link"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Trending Articles */}
          {trending.length > 0 && (
            <div className="bg-muted/30 dark:bg-white/[0.02]">
              <section className="px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-6xl">
                  <div className="mb-6">
                    <SectionPill>Trending</SectionPill>
                    <h2 className="text-lg sm:text-xl font-semibold tracking-tight mt-3">
                      Most read this month
                    </h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {trending.map((article, i) => (
                      <Link key={article.slug} href={`/blog/${article.slug}`} className="group">
                        <div className="rounded-xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none p-4 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/[0.06] transition-all duration-300 h-full">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center shrink-0">
                              <span className="text-2xl font-semibold text-primary/30 tabular-nums leading-none">
                                {i + 2}
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                                {formatViewCount(article.viewCount)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2 mb-1">
                                {article.title}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{article.readingTime} min</span>
                                <span className="text-border">|</span>
                                <span>{formatViewCount(article.viewCount)} views</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* All Articles with Search, Filter, Pagination */}
          <section className="px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-6">
                <SectionPill>All guides</SectionPill>
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight mt-3">
                  Browse all health guides
                </h2>
              </div>
              <ArticlesPage articles={allArticles} />
            </div>
          </section>

          {/* Newsletter CTA */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <section className="py-12 px-4 sm:px-6">
              <div className="mx-auto max-w-xl text-center">
                <div className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-6 sm:p-8">
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Stay informed
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Weekly health tips for Australians. No spam, unsubscribe anytime.
                  </p>
                  <div className="flex gap-2 max-w-sm mx-auto">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-muted/50 dark:bg-white/5 border border-border/50 dark:border-white/10 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                    />
                    <button className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all inline-flex items-center gap-1.5">
                      Subscribe
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <CTABanner
            title="Need a Medical Certificate?"
            subtitle="Get assessed by an AHPRA-registered doctor. Most requests reviewed within an hour."
            ctaText="Start a request"
            ctaHref="/request"
            secondaryText={`${PRICING_DISPLAY.FROM_MED_CERT} - No Medicare card required`}
            secondaryHref="/pricing"
          />
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
