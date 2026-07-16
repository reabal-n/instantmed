"use client"

import { ArrowRight, ShieldOff } from "lucide-react"
import Link from "next/link"

import { StickerIcon } from "@/components/icons/stickers"
import { CitationFacts } from "@/components/marketing/citation-facts"
import { AboutGuideSection } from "@/components/marketing/sections/about-guide-section"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { AnimatedDonutChart, ComparisonBar } from "@/components/marketing/shared/data-viz"
import { EditorialStoryBlock } from "@/components/marketing/shared/editorial-story-block"
import { InformationalPageShell } from "@/components/marketing/shared/informational-page-shell"
import { ScrollingLogoMarquee } from "@/components/marketing/shared/scrolling-logo-marquee"
import { CTABanner } from "@/components/sections/cta-banner"
import { FAQSection } from "@/components/sections/faq-section"
import { FeatureGrid } from "@/components/sections/feature-grid"
import { FAQSchema } from "@/components/seo"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { GUARANTEE, GUARANTEE_LABEL } from "@/lib/marketing/voice"
import { SOCIAL_PROOF } from "@/lib/social-proof"

// =============================================================================
// DATA
// =============================================================================

const ABOUT_CONFIG = {
  analyticsId: "about" as const,
  // Sticky mobile CTA appears after the hero scrolls out of view so the
  // primary action is always one tap away. Per 2026-05-25 video review:
  // patients were scrolling 30s before finding a way to start a request.
  sticky: {
    ctaText: "Start a request",
    ctaHref: "/request",
    mobileSummary: "AHPRA-registered doctors, ~44 min average",
  },
}

const ABOUT_FAQS = [
  {
    question: "What is InstantMed?",
    answer:
      "InstantMed is an Australian telehealth platform that connects patients with AHPRA-registered doctors for medical certificates, repeat prescriptions, and consultations. Everything is handled online through structured clinical forms.",
  },
  {
    question: "Is InstantMed a real medical practice?",
    answer:
      "Yes. InstantMed is operated under AHPRA-registered clinical governance. Certificates include the reviewing doctor's details and a secure verification ID; prescriptions are handled through Australia's eScript infrastructure.",
  },
  {
    question: "Where is InstantMed based?",
    answer:
      "InstantMed is based at Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010. Clinical reviews are handled by Australian-based AHPRA-registered doctors.",
  },
  {
    question: "Is InstantMed covered by Medicare?",
    answer:
      "InstantMed service fees are not Medicare rebateable as we are a private telehealth service. However, any medications prescribed through our platform may be eligible for PBS (Pharmaceutical Benefits Scheme) subsidies at your pharmacy.",
  },
  {
    question: "What services does InstantMed offer?",
    answer:
      "We offer medical certificates, repeat prescriptions, and specialised pathways for ED, hair loss, UTI assessment, and starting or switching the contraceptive pill. Weight management is not taking requests yet. We keep our scope deliberately narrow, so anything outside these services is best handled by your regular GP or in-person care.",
  },
  {
    question: "How does InstantMed protect my privacy?",
    answer:
      "Personal health information is protected with AES-256-GCM field-level encryption at rest and TLS in transit, with primary health records on Australian-hosted infrastructure. We comply with the Privacy Act 1988 and all 13 Australian Privacy Principles. We don't sell personal information or share it with marketers; trusted service providers process only what is needed to deliver care and meet legal obligations.",
  },
]

const VALUES = [
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Clinical rigour",
    description:
      "AHPRA-registered doctor review, documented protocols, and hard safety boundaries. We never automate clinical decisions.",
  },
  {
    icon: <StickerIcon name="lock" size={48} />,
    title: "Privacy first",
    description:
      "AES-256-GCM encryption, Australian-hosted servers, full compliance with the Privacy Act and all 13 APPs.",
  },
  {
    icon: <StickerIcon name="accessibility" size={48} />,
    title: "Accessible care",
    description:
      "Requests and doctor review are available 24/7 across launched pathways. Timing varies, and a doctor may call briefly before deciding.",
  },
  {
    icon: <StickerIcon name="eye" size={48} />,
    title: "Full transparency",
    description: `Flat fees, no hidden costs. ${GUARANTEE} You'll always know exactly what you're paying for.`,
  },
]

const REGULATORY_LOGOS = [
  { name: "AHPRA", src: "/logos/AHPRA.png" },
  { name: "TGA", src: "/logos/TGA.png" },
  { name: "LegitScript", src: "/logos/legitscript.png" },
]

// =============================================================================
// COMPONENT
// =============================================================================

export function AboutClient() {
  const faqSchemaItems = ABOUT_FAQS.map((f) => ({
    question: f.question,
    answer: f.answer,
  }))

  return (
    <InformationalPageShell config={ABOUT_CONFIG}>
      {({ analytics, heroCTARef }) => (
        <>
          <FAQSchema faqs={faqSchemaItems} />

          {/* Hero - clean mission statement.
              Lede uses BRAND_THESIS phrasing per docs/BRAND.md §1: "Telehealth
              without the small talk. A real doctor, ready in the time it
              takes to make a coffee." Split across H1/sub for visual rhythm.
              Primary CTA inline below the lede so the patient is never more
              than one tap from starting a request. */}
          <section className="pt-16 sm:pt-24 pb-8 sm:pb-12 px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p className="inline-flex items-center rounded-full border border-border/60 bg-background px-4 py-1.5 text-xs font-medium text-foreground/70 shadow-sm shadow-primary/[0.04] mb-6">
                About InstantMed
              </p>
              <Heading level="display" className="mb-4">
                Telehealth without the small talk.
              </Heading>
              <p className="text-muted-foreground text-balance max-w-lg mx-auto mb-7">
                A real Australian doctor, ready in the time it takes to make
                a coffee. AHPRA-registered, no waiting room, no appointment.
                We handle medical certificates, repeat medication, and online
                doctor consults.
              </p>
              <div ref={heroCTARef} className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto h-11 text-base font-semibold shadow-md shadow-primary/20"
                  onClick={() => analytics.trackCTAClick("about_hero")}
                >
                  <Link href="/request">
                    Start a request
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Takes about 3 minutes. {GUARANTEE}
                </p>
              </div>
            </div>
          </section>

          <CitationFacts variant="muted" />

          {/* Origin story with stat callouts */}
          <EditorialStoryBlock
            pill="Our story"
            title="Why we built InstantMed"
            blocks={[
              {
                type: "paragraph",
                content:
                  "Average wait times for a non-urgent GP appointment sit at two to three weeks in most Australian capital cities. For a straightforward medical certificate or repeat prescription, that means taking a sick day to prove you need a sick day.",
              },
              {
                type: "stat-callout",
                value: "24/7",
                label: "Request and review availability",
              },
              {
                type: "paragraph",
                content:
                  "We built InstantMed to address a specific, well-defined problem: common healthcare tasks that don't require a physical examination. Medical certificates for a cold. Repeat prescriptions for stable medications. Straightforward consultations where a structured online form captures the clinical information just as effectively as a rushed five-minute appointment.",
              },
              {
                type: "stat-callout",
                value: `${SOCIAL_PROOF.refundPercent}%`,
                label: "Refund if a request is declined",
              },
              {
                type: "stat-callout",
                value: `~${SOCIAL_PROOF.averageResponseMinutes} min`,
                label: "Average response time",
              },
              {
                type: "pull-quote",
                quote:
                  "We're not trying to reinvent healthcare. We're just pointing out that you shouldn't need to take a sick day to prove you need a sick day.",
              },
            ]}
          />

          {/* Page superpower — the platform mission anchored in one sentence */}
          <ServiceClaimSection
            eyebrow="What we actually are"
            headline={
              <>
                Faster than your <span className="text-primary">GP</span>.
              </>
            }
            body="Not a wellness brand. Not an app. A real Australian medical practice that operates online. AHPRA-registered doctors, real prescriptions, real medical certificates, real clinical accountability. Telehealth without the small talk."
          />

          {/* Data viz section.
              Stack vertically below md (768px) so the ComparisonBar has
              enough width to keep label and value inline at narrow breakpoints
              (sm 640px squeezed it into two cramped columns). */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <section className="py-12 lg:py-16">
              <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-10 md:gap-8 items-center">
                  <div className="flex justify-center">
                    <AnimatedDonutChart
                      value={SOCIAL_PROOF.refundPercent}
                      label={GUARANTEE_LABEL}
                      size={140}
                      strokeWidth={12}
                    />
                  </div>
                  <ComparisonBar
                    us={{
                      label: "InstantMed",
                      value: `~${SOCIAL_PROOF.certTurnaroundMinutes} min`,
                      subtext: "Average certificate delivery",
                    }}
                    them={{
                      label: "GP clinic visit",
                      value: "2+ hours",
                      subtext: "Travel + wait + consult + admin",
                    }}
                    ratio={0.25}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Values grid */}
          <FeatureGrid
            pill="Our values"
            title="What we stand for"
            subtitle="Four principles that guide every clinical decision we make."
            features={VALUES}
            columns={2}
          />

          {/* "What we won't do" promotion: one of the signature brand
              devices (docs/BRAND.md). Surfaces the limits the brand leads
              with, alongside the values grid rather than buried in the
              footer. Same calm chrome as the values cards. */}
          <section className="px-4 pb-16 lg:pb-24">
            <div className="mx-auto max-w-3xl">
              <Link
                href="/what-we-wont-do"
                className="group block rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-6 sm:p-8 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.1] transition-[transform,box-shadow] duration-300"
                onClick={() => analytics.trackCTAClick("about_what_we_wont_do")}
              >
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="shrink-0 inline-flex rounded-xl bg-primary/5 p-3 text-primary">
                    <ShieldOff className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary mb-2 tracking-wide uppercase">
                      The limits we lead with
                    </p>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                      What we won&apos;t do
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      Trust is built on what a service refuses to do, not
                      just what it offers. Schedule 8 prescriptions,
                      high-stakes certificates, AI-only decisions: the
                      things we deliberately don&apos;t do, written down
                      where you can find them.
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2 transition-[gap]">
                      Read the list
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* Regulatory logos */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <ScrollingLogoMarquee
              logos={REGULATORY_LOGOS}
              heading="Regulated and certified"
              speed="slow"
              analyticsEvent="about_regulatory_marquee"
              className="py-10"
            />
            <div className="pb-8">
              <TrustBadgeRow
                badges={[
                  { id: "ahpra", variant: "styled" },
                  { id: "legitscript", variant: "styled" },
                  { id: "google_pharmacy", variant: "styled" },
                ]}
                className="justify-center gap-3"
              />
            </div>
          </div>

          {/* Deep E-E-A-T guide content - kept for SEO value */}
          <AboutGuideSection />

          {/* FAQs */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <FAQSection
              pill="FAQs"
              title="Frequently asked questions"
              subtitle="Common questions about InstantMed and how we work."
              items={ABOUT_FAQS}
            />
          </div>

          {/* CTA */}
          <CTABanner
            title="Ready to start?"
            subtitle="Secure form first. No appointment, no waiting room, and a doctor reviews before anything is issued."
            ctaText="Start a request"
            ctaHref="/request"
          />
        </>
      )}
    </InformationalPageShell>
  )
}
