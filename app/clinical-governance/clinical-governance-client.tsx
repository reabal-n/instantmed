"use client"

import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { StatsHero } from "@/components/heroes"
import {
  IconChecklist,
  FeatureGrid,
  Timeline,
  CTABanner,
} from "@/components/sections"
import type { StatItem, ChecklistItem, FeatureItem, TimelineStep } from "@/components/sections/types"
import {
  UserCheck,
  BookOpen,
  Scale,
  ClipboardCheck,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"

/* ────────────────────────────── Data ────────────────────────────── */

const heroStats: StatItem[] = [
  { value: 100, suffix: "%", label: "AHPRA-registered doctors" },
  { value: 5, suffix: "th ed.", label: "RACGP Standards aligned" },
  { value: 0, prefix: "S", suffix: " substances", label: "Controlled drugs prescribed" },
]

const standardsChecklist: ChecklistItem[] = [
  { text: "RACGP Standards for General Practices (5th edition)" },
  { text: "Therapeutic Goods Administration (TGA) prescribing regulations" },
  { text: "Pharmaceutical Benefits Scheme (PBS) guidelines" },
  { text: "Australian Privacy Principles (APP)" },
  { text: "AHPRA Telehealth Guidelines" },
]

const reviewProcess: TimelineStep[] = [
  {
    title: "Clinical Leadership",
    description:
      "Medical Director holds FRACGP fellowship and reviews all clinical protocols. Senior GP oversight on complex cases with direct escalation pathways.",
  },
  {
    title: "Quality Assurance",
    description:
      "Regular peer review of clinical decisions, random audits of certificates and prescriptions, incident reporting framework, and patient feedback integration.",
  },
  {
    title: "Continuous Improvement",
    description:
      "Quarterly protocol reviews by Medical Director, post-incident reviews and process updates, integration of new clinical guidelines, and regular training for consulting doctors.",
  },
]

const safeguards: FeatureItem[] = [
  {
    icon: <UserCheck className="h-6 w-6" />,
    title: "Clinical Leadership",
    description:
      "Medical Director reviews all clinical protocols. Senior GP oversight on complex cases with direct escalation pathway.",
  },
  {
    icon: <Scale className="h-6 w-6" />,
    title: "Scope of Practice",
    description:
      "Focused on low-complexity, high-frequency presentations. Complex or high-risk cases referred to in-person care.",
  },
  {
    icon: <ClipboardCheck className="h-6 w-6" />,
    title: "Quality Assurance",
    description:
      "Regular peer review, random audits, incident reporting framework, and patient feedback integration into protocols.",
  },
  {
    icon: <AlertTriangle className="h-6 w-6" />,
    title: "Safety Boundaries",
    description:
      "No controlled substances (S8). No treatments requiring physical examination. Automatic escalation for red-flag symptoms.",
  },
  {
    icon: <RefreshCw className="h-6 w-6" />,
    title: "Continuous Improvement",
    description:
      "Quarterly protocol reviews, post-incident reviews, integration of new clinical guidelines, and regular team training.",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Evidence-Based Protocols",
    description:
      "Clinical processes align with RACGP Standards, TGA regulations, PBS guidelines, and AHPRA Telehealth Guidelines.",
  },
]

/* ────────────────────────────── Component ────────────────────────────── */

export default function ClinicalGovernanceClient() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero — compliance stats */}
        <StatsHero
          pill="Clinical Governance"
          title="Good medicine starts with good governance"
          highlightWords={["governance"]}
          subtitle="Our clinical processes are designed by practising GPs and reviewed regularly to ensure every patient interaction meets Australian standards."
          stats={heroStats}
        />

        {/* Standards we follow */}
        <IconChecklist
          pill="Standards"
          title="Guidelines we follow"
          highlightWords={["follow"]}
          subtitle="Our clinical processes align with established Australian medical standards and regulations."
          items={standardsChecklist}
        />

        {/* Review process timeline */}
        <Timeline
          pill="Process"
          title="How we maintain clinical quality"
          highlightWords={["quality"]}
          subtitle="Systematic review and continuous improvement at every level."
          steps={reviewProcess}
        />

        {/* Safeguards grid */}
        <FeatureGrid
          pill="Safeguards"
          title="Built-in safety at every step"
          highlightWords={["safety"]}
          subtitle="Clear boundaries and structured oversight protect every patient interaction."
          features={safeguards}
          columns={3}
        />

        {/* External verification — keep as custom since it has external links */}
        <section className="py-16 px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Independent verification
            </h2>
            <p className="text-muted-foreground mb-6">
              Our doctors&apos; registration can be independently verified on
              the AHPRA public register. Our clinical standards align with RACGP
              guidelines for general practice.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                variant="outline"
                className="rounded-full bg-transparent"
              >
                <Link
                  href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  AHPRA Register
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full bg-transparent"
              >
                <Link
                  href="https://www.racgp.org.au/running-a-practice/practice-standards"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  RACGP Standards
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <CTABanner
          title="Questions about our clinical standards?"
          subtitle="We're happy to explain how we maintain quality and safety across all consultations."
          ctaText="Contact us"
          ctaHref="/contact"
          secondaryText="Meet our doctors"
          secondaryHref="/our-doctors"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
