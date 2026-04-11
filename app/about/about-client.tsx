'use client'

import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter, StatsStrip } from "@/components/marketing"
import { MediaMentions } from "@/components/marketing/media-mentions"
import { DoctorCredibility } from "@/components/marketing/doctor-credibility"
import { ComplianceBar } from "@/components/shared/compliance-marquee"
import { CenteredHero } from "@/components/heroes"
import {
  ImageTextSplit,
  FAQSection,
  CTABanner,
} from "@/components/sections"
import { FAQSchema } from "@/components/seo/healthcare-schema"
import { AboutGuideSection } from "@/components/marketing/sections/about-guide-section"

// =============================================================================
// FAQ DATA
// =============================================================================

const ABOUT_FAQS = [
  {
    q: "What is InstantMed?",
    a: "InstantMed is an Australian telehealth platform that connects patients with AHPRA-registered doctors for medical certificates, repeat prescriptions, and consultations. Everything is handled online through structured clinical forms — no phone calls or video chats required for most requests.",
  },
  {
    q: "Is InstantMed a real medical practice?",
    a: "Yes. InstantMed is operated by registered medical practitioners with AHPRA oversight and Medical Director governance. Certificates and prescriptions issued through InstantMed carry the same legal standing as those from any other medical practice in Australia.",
  },
  {
    q: "Where is InstantMed based?",
    a: "InstantMed is based at Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010. All doctors on the platform are Australian-based and AHPRA-registered.",
  },
  {
    q: "Is InstantMed covered by Medicare?",
    a: "InstantMed service fees are not Medicare rebateable as we are a private telehealth service. However, any medications prescribed through our platform may be eligible for PBS (Pharmaceutical Benefits Scheme) subsidies at your pharmacy.",
  },
  {
    q: "What services does InstantMed offer?",
    a: "We offer medical certificates (for work, university, and carer's leave), repeat prescriptions for stable medications, general consultations, and specialised pathways for hair loss, weight management, and men's and women's health.",
  },
  {
    q: "How does InstantMed protect my privacy?",
    a: "All personal health information is encrypted using AES-256-GCM encryption and stored on Australian servers. We comply with the Privacy Act 1988 and all 13 Australian Privacy Principles. We don't sell or share your data with third parties.",
  },
] as const

export function AboutClient() {
  const faqSchemaItems = ABOUT_FAQS.map((f) => ({
    question: f.q,
    answer: f.a,
  }))

  const faqItems = ABOUT_FAQS.map((f) => ({ question: f.q, answer: f.a }))

  return (
    <div className="flex min-h-screen flex-col">
      <FAQSchema faqs={faqSchemaItems} />
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <CenteredHero
          pill="About InstantMed"
          title="Healthcare shouldn't be hard"
          subtitle="We connect Australians with AHPRA-registered doctors for medical certificates, prescriptions, and consultations. Fast, simple, legitimate."
        />

        {/* Our Story */}
        <ImageTextSplit
          title="Our Story"
          description="InstantMed was built to make everyday healthcare simpler. We believe getting a medical certificate or renewing a prescription shouldn't require taking half a day off work or sitting in a waiting room when you're already unwell."
          imageSrc="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80"
          imageAlt="Modern telehealth consultation"
          imagePosition="left"
        >
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              We asked ourselves: why can&apos;t straightforward healthcare be more accessible? For
              things like medical certificates and repeat prescriptions, there&apos;s a better way — one
              that respects your time without compromising on care.
            </p>
            <p>
              So we built InstantMed. A platform that connects you with real, AHPRA-registered Australian doctors
              who can review your requests quickly and professionally — all without the hassle of phone calls, video
              chats, or waiting rooms.
            </p>
          </div>
        </ImageTextSplit>

        {/* Long-form narrative — who we are, how we work, clinical standards, privacy */}
        <AboutGuideSection />

        {/* Doctor quote */}
        <section className="px-4 pb-12">
          <div className="mx-auto max-w-2xl">
            <blockquote className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
              <p className="text-muted-foreground italic mb-4">
                &ldquo;I review every request as if the patient were sitting in front of me. Just because it&apos;s online doesn&apos;t mean the standard of care is any different. If I have concerns or questions, I follow up. Patient safety always comes first.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-success/20 bg-muted">
                  <Image
                    src="https://api.dicebear.com/7.x/notionists/svg?seed=MedDirector"
                    alt="Our Medical Director"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Our Medical Director</p>
                  <p className="text-xs text-muted-foreground">MBBS FRACGP, AHPRA Registered</p>
                </div>
              </div>
            </blockquote>
          </div>
        </section>

        {/* Doctor Stats */}
        <DoctorCredibility
          variant="inline"
          stats={["experience", "approval", "sameDay", "reviews"]}
          className="max-w-3xl mx-auto px-4 sm:px-6 pb-8"
        />

        {/* Compliance Bar */}
        <ComplianceBar />

        {/* Stats */}
        <StatsStrip className="bg-muted/20 border-y border-border/30" />

        {/* Regulatory logos */}
        <MediaMentions variant="strip" className="bg-muted/30" />

        {/* FAQs */}
        <FAQSection
          pill="FAQs"
          title="Frequently asked questions"
          subtitle="Common questions about InstantMed, our doctors, and how the service works."
          items={faqItems}
        />

        {/* CTA */}
        <CTABanner
          title="Ready to experience better healthcare?"
          subtitle="Join the Australians who have made the switch to InstantMed."
          ctaText="Start a request"
          ctaHref="/request"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
