"use client"

import { StickerIcon } from "@/components/icons/stickers"
import { AboutGuideSection } from "@/components/marketing/sections"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { AnimatedDonutChart, ComparisonBar, EditorialStoryBlock, InformationalPageShell, ScrollingLogoMarquee } from "@/components/marketing/shared"
import { CTABanner, FAQSection, FeatureGrid } from "@/components/sections"
import { FAQSchema } from "@/components/seo"
import { TrustBadgeRow } from "@/components/shared"
import { Heading } from "@/components/ui/heading"
import { usePatientCount } from "@/lib/hooks/use-patient-count"
import { SOCIAL_PROOF } from "@/lib/social-proof"

// =============================================================================
// DATA
// =============================================================================

const ABOUT_CONFIG = {
  analyticsId: "about" as const,
  sticky: false as const,
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
      "Yes. InstantMed is operated by registered medical practitioners with AHPRA oversight and Medical Director governance. Certificates and prescriptions issued through InstantMed carry the same legal standing as those from any other medical practice in Australia.",
  },
  {
    question: "Where is InstantMed based?",
    answer:
      "InstantMed is based at Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010. All doctors on the platform are Australian-based and AHPRA-registered.",
  },
  {
    question: "Is InstantMed covered by Medicare?",
    answer:
      "InstantMed service fees are not Medicare rebateable as we are a private telehealth service. However, any medications prescribed through our platform may be eligible for PBS (Pharmaceutical Benefits Scheme) subsidies at your pharmacy.",
  },
  {
    question: "What services does InstantMed offer?",
    answer:
      "We offer medical certificates (for work, university, and carer's leave), repeat prescriptions for stable medications, general consultations, and specialised pathways for hair loss, weight management, and men's and women's health.",
  },
  {
    question: "How does InstantMed protect my privacy?",
    answer:
      "All personal health information is encrypted using AES-256-GCM encryption and stored on Australian servers. We comply with the Privacy Act 1988 and all 13 Australian Privacy Principles. We don't sell or share your data with third parties.",
  },
]

const VALUES = [
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Clinical rigour",
    description:
      "Every request is reviewed by an AHPRA-registered GP following evidence-based protocols. We never automate clinical decisions.",
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
      "24/7 medical certificates, plus form-first specialty services where a doctor contacts you only if clinically needed.",
  },
  {
    icon: <StickerIcon name="eye" size={48} />,
    title: "Full transparency",
    description:
      "Flat fees, no hidden costs. Full refund if we can't help. You'll always know exactly what you're paying for.",
  },
]

const REGULATORY_LOGOS = [
  { name: "AHPRA", src: "/logos/ahpra.svg" },
  { name: "RACGP", src: "/logos/racgp.svg" },
  { name: "TGA", src: "/logos/tga.svg" },
  { name: "LegitScript", src: "/logos/legitscript.svg" },
]

// =============================================================================
// COMPONENT
// =============================================================================

export function AboutClient() {
  const patientCount = usePatientCount()
  const faqSchemaItems = ABOUT_FAQS.map((f) => ({
    question: f.question,
    answer: f.answer,
  }))

  return (
    <InformationalPageShell config={ABOUT_CONFIG}>
      {() => (
        <>
          <FAQSchema faqs={faqSchemaItems} />

          {/* Hero - clean mission statement.
              Lede uses BRAND_THESIS phrasing per docs/BRAND.md §1: "Telehealth
              without the small talk. A real doctor, ready in the time it
              takes to make a coffee." Split across H1/sub for visual rhythm. */}
          <section className="pt-16 sm:pt-24 pb-8 sm:pb-12 px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p className="inline-flex items-center rounded-full border border-border/60 bg-background px-4 py-1.5 text-xs font-medium text-foreground/70 shadow-sm shadow-primary/[0.04] mb-6">
                About InstantMed
              </p>
              <Heading level="display" className="mb-4">
                Telehealth without the small talk.
              </Heading>
              <p className="text-muted-foreground text-balance max-w-lg mx-auto">
                A real Australian doctor, ready in the time it takes to make
                a coffee. AHPRA-registered, no waiting room, no appointment.
                We handle medical certificates, repeat medication, and online
                doctor consults.
              </p>
            </div>
          </section>

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
                value: `${patientCount.toLocaleString()}+`,
                label: "Australians have used InstantMed",
              },
              {
                type: "paragraph",
                content:
                  "We built InstantMed to address a specific, well-defined problem: common healthcare tasks that don't require a physical examination. Medical certificates for a cold. Repeat prescriptions for stable medications. Straightforward consultations where a structured online form captures the clinical information just as effectively as a rushed five-minute appointment.",
              },
              {
                type: "stat-callout",
                value: `${SOCIAL_PROOF.certApprovalPercent}%`,
                label: "Request approval rate",
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

          {/* Data viz section */}
          <div className="bg-muted/30 dark:bg-white/[0.02]">
            <section className="py-12 lg:py-16">
              <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="grid sm:grid-cols-2 gap-8 items-center">
                  <div className="flex justify-center">
                    <AnimatedDonutChart
                      value={SOCIAL_PROOF.certApprovalPercent}
                      label="Request approval rate"
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
            title="Ready to experience better healthcare?"
            subtitle={`Join ${patientCount.toLocaleString()}+ Australians who trust InstantMed for their healthcare.`}
            ctaText="Start a request"
            ctaHref="/request"
          />
        </>
      )}
    </InformationalPageShell>
  )
}
