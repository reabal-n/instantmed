"use client"

import { ChevronDown,Search, X } from "lucide-react"
import Link from "next/link"
import { useCallback,useMemo, useRef, useState } from "react"

import { LiveWaitTime } from "@/components/marketing"
import { InformationalPageShell, RelatedArticles } from "@/components/marketing/shared"
import { AccordionSection, CTABanner } from "@/components/sections"
import { FAQSchema } from "@/components/seo"
import { GENERAL_FAQ } from "@/lib/data/general-faq"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CATEGORIES = GENERAL_FAQ.map((g) => g.category).filter((c): c is string => !!c)
const TOTAL_QUESTIONS = GENERAL_FAQ.reduce((sum, g) => sum + g.items.length, 0)

const POPULAR_QUESTION_STRINGS = [
  "How long does it take?",
  "Is this actually legitimate?",
  "Will my employer actually accept this?",
  "What\u2019s your refund policy?",
]

const POPULAR_QUESTIONS = GENERAL_FAQ.flatMap((g) => g.items).filter((item) =>
  POPULAR_QUESTION_STRINGS.includes(item.question)
)

const RELATED_ARTICLES = [
  { title: "How InstantMed Works", href: "/how-it-works" },
  { title: "Medical Certificates Guide", href: "/medical-certificate" },
  { title: "Understanding eScripts", href: "/blog/understanding-escripts-australia" },
]

const FAQ_CONFIG = {
  analyticsId: "faq" as const,
  sticky: false as const,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [expandedPopular, setExpandedPopular] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const togglePopular = useCallback((index: number) => {
    setExpandedPopular((prev) => (prev === index ? null : index))
  }, [])

  // Filter FAQ groups by search query and active category
  const filteredGroups = useMemo(() => {
    let groups = GENERAL_FAQ

    // Filter by category
    if (activeCategory) {
      groups = groups.filter((g) => g.category === activeCategory)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      groups = groups
        .map((g) => ({
          ...g,
          items: g.items.filter(
            (item) =>
              item.question.toLowerCase().includes(q) ||
              item.answer.toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.items.length > 0)
    }

    return groups
  }, [searchQuery, activeCategory])

  const totalFiltered = filteredGroups.reduce(
    (sum, g) => sum + g.items.length,
    0
  )

  // Flat list for schema
  const allFaqs = GENERAL_FAQ.flatMap((group) => group.items)

  return (
    <InformationalPageShell
      config={FAQ_CONFIG}
      afterFooter={<RelatedArticles articles={RELATED_ARTICLES} />}
    >
      {({ handleFAQOpen: _handleFAQOpen }) => (
        <>
          <FAQSchema faqs={allFaqs} />

          {/* Hero with search */}
          <section className="pt-16 sm:pt-24 pb-8 sm:pb-12 px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p className="inline-flex items-center rounded-full border border-border/60 bg-background px-4 py-1.5 text-xs font-medium text-foreground/70 shadow-sm shadow-primary/[0.04] mb-6">
                Help Centre
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4">
                Got questions? We&apos;ve got answers.
              </h1>
              <p className="text-muted-foreground mb-2">
                Everything you need to know about InstantMed.
              </p>
              <p className="text-xs text-muted-foreground/70 mb-8">
                {TOTAL_QUESTIONS} questions across {CATEGORIES.length} topics
              </p>

              {/* Search input */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions..."
                  className={cn(
                    "w-full pl-10 pr-10 py-3 rounded-xl text-sm",
                    "bg-white dark:bg-card border border-border/50 dark:border-white/15",
                    "shadow-sm shadow-primary/[0.04] dark:shadow-none",
                    "placeholder:text-muted-foreground/40",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                    "transition-shadow"
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("")
                      searchRef.current?.focus()
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Category pill navigation */}
          <div className="overflow-x-auto px-4 pb-6 -mt-2">
            <div className="flex items-center justify-center gap-2 min-w-max mx-auto">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap",
                  !activeCategory
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                )}
              >
                All topics
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setActiveCategory(activeCategory === cat ? null : cat)
                  }
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Most popular questions - default view only */}
          {!searchQuery && !activeCategory && POPULAR_QUESTIONS.length > 0 && (
            <section className="mx-auto max-w-2xl px-4 pb-8">
              <p className="inline-flex items-center rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-medium text-foreground/70 shadow-sm shadow-primary/[0.04] mb-4">
                Most popular
              </p>
              <div className="space-y-2">
                {POPULAR_QUESTIONS.map((item, index) => (
                  <div
                    key={item.question}
                    className={cn(
                      "bg-white dark:bg-card border border-border/50 rounded-xl",
                      "shadow-sm shadow-primary/[0.04] dark:shadow-none",
                      "transition-shadow hover:shadow-md hover:shadow-primary/[0.06]"
                    )}
                  >
                    <button
                      onClick={() => togglePopular(index)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {item.question}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200",
                          expandedPopular === index && "rotate-180"
                        )}
                      />
                    </button>
                    {expandedPopular === index && (
                      <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                        {item.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Search results count */}
          {(searchQuery || activeCategory) && (
            <p className="text-center text-xs text-muted-foreground mb-4 px-4">
              {totalFiltered === 0
                ? "No questions match your search."
                : `Showing ${totalFiltered} question${totalFiltered === 1 ? "" : "s"}`}
              {activeCategory && (
                <>
                  {" "}
                  in <span className="font-medium">{activeCategory}</span>
                </>
              )}
            </p>
          )}

          {/* FAQ Sections */}
          {filteredGroups.length > 0 ? (
            <AccordionSection
              groups={filteredGroups}
              hideHeader
            />
          ) : (
            <div className="py-16 text-center px-4">
              <p className="text-muted-foreground mb-4">
                No results for &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-sm text-muted-foreground">
                Try a different search, or{" "}
                <Link
                  href="/contact"
                  className="text-primary hover:underline font-medium"
                >
                  contact us directly
                </Link>
              </p>
            </div>
          )}

          {/* Need live help? */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <LiveWaitTime variant="strip" />
          </div>

          {/* CTA */}
          <CTABanner
            title="Still have questions?"
            subtitle="Trusted by 3,000+ Australians for online healthcare. Our support team is here to help."
            ctaText="Contact Support"
            ctaHref="/contact"
          />
        </>
      )}
    </InformationalPageShell>
  )
}
