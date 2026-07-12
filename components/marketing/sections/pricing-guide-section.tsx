import { BadgeCheck } from "lucide-react"
import Link from "next/link"

import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"
import { Reveal } from "@/components/ui/reveal"
import { GUARANTEE } from "@/lib/marketing/voice"

// =============================================================================
// DATA
// =============================================================================

interface GuideBullet {
  label: string
  body: string
}

interface GuideBlock {
  id: string
  sticker: StickerIconName
  title: string
  /** Short scannable paragraphs (2-3 sentences each). */
  paragraphs: readonly string[]
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: readonly GuideBullet[]
}

const GUIDE_SECTIONS: GuideBlock[] = [
  {
    id: "telehealth-pricing",
    sticker: "wallet",
    title: "Understanding telehealth pricing in Australia",
    paragraphs: [
      "Most telehealth platforms in Australia sit outside Medicare. That's standard, not a red flag.",
      "Medicare rebates are designed around traditional GP appointments with an ongoing provider relationship. Asynchronous review, where a doctor reads your request without a live consult, doesn't fit those item numbers.",
      "So a telehealth fee is private and out-of-pocket. You're paying for genuine clinical work: a doctor reviews your history, assesses your symptoms, makes a decision, and generates the document. Same clinical steps as a clinic visit, without the waiting room.",
    ],
    bullets: [
      {
        label: "Average GP gap",
        body: "$39 to $80 after Medicare rebates (AMA, 2024).",
      },
      {
        label: "Bulk-billed access",
        body: "Around 35% of metro GP visits, lower in regional areas (AIHW).",
      },
      {
        label: "Our fee",
        body: "Well under the typical private GP gap, no travel time.",
      },
    ],
  },
  {
    id: "whats-included",
    sticker: "medical-history",
    title: "What's included in your consultation fee",
    paragraphs: [
      `When you pay for an InstantMed request, you're paying for a doctor-owned clinical service - not a blank document. AHPRA-registered doctors make prescribing decisions. Eligible low-risk medical certificates may follow the logged protocol and are individually reviewed afterward. If something doesn't add up, the request goes to a doctor for follow-up or decline. ${GUARANTEE}`,
      "Your fee covers the doctor's review time, clinical assessment, document generation (medical certificates with unique verification IDs, or eScript generation for prescriptions), secure digital delivery, and encrypted storage of your records. If the reviewing doctor needs additional information before making a decision, that follow-up is included - no extra charge for the doctor doing their job properly.",
      "You also get access to our certificate verification system, which employers and institutions can use to confirm your certificate was genuinely issued by our practice. This is an additional layer of trust that most traditional paper certificates don't offer.",
    ],
  },
  {
    id: "pbs-medications",
    sticker: "pill-bottle",
    title: "PBS subsidies and medication costs",
    paragraphs: [
      "Our consultation fee covers the doctor's assessment and eScript generation only. The actual cost of your medication is a separate expense, paid at the pharmacy when you collect your prescription. These are two distinct charges - our fee for the clinical service, and the pharmacy's charge for the medication itself.",
      "The good news is that Australia's Pharmaceutical Benefits Scheme (PBS) subsidises many common medications. From 1 January 2026, if you hold a valid Medicare card, most common prescriptions cost up to $25.00 at the pharmacy (down from $31.60). Concession card holders pay up to $7.70 (frozen until 2030). Without Medicare, you'll pay the full retail price, which varies by medication. Source: health.gov.au/cheaper-medicines/pbs-co-payments",
      "We can't tell you exactly what your medication will cost at the pharmacy because prices vary between pharmacies and depend on whether you have Medicare and concession entitlements. Your pharmacist can give you a precise cost before you commit to purchasing. The PBS website (pbs.gov.au) also lists subsidy information for specific medications.",
    ],
  },
  {
    id: "refund-policy",
    sticker: "synchronize",
    title: "Our refund policy",
    paragraphs: [
      `${GUARANTEE} No paperwork, no awkward phone call. The refund is processed automatically and typically lands back in your account within 3-5 business days, depending on your bank.`,
      "We don't offer refunds for change-of-mind after a certificate or prescription has been issued - the clinical work has been done and the document has been generated. That said, we're reasonable people. If something genuinely went wrong with your experience, contact us at support@instantmed.com.au and we'll sort it out.",
      "If you have a complaint about the clinical care you received, email complaints@instantmed.com.au. We respond to all complaints within 48 hours and aim to resolve them within 14 days. If you're not satisfied with our resolution, you can escalate to the Health Care Complaints Commission (HCCC) or AHPRA directly.",
    ],
  },
  {
    id: "no-subscriptions",
    sticker: "checkmark",
    title: "Why we don't do subscriptions",
    paragraphs: [
      "Some telehealth platforms charge monthly memberships - $15 to $30 a month for the privilege of being able to book a consultation that you then also pay for. We don't do that. We don't charge you a monthly fee to have the privilege of paying us for an appointment. That business model is for gyms, not healthcare.",
      "You pay when you need care, and you don't pay when you don't. No lock-in contracts, no minimum commitment, no recurring charges quietly draining your account. If you need a medical certificate once a year, you pay once a year. If you never come back, we don't chase you with \"we miss you\" emails. Actually, we might send one. But we won't charge you for it.",
      "This approach keeps things honest. We only earn revenue when we're actually providing a service - which means our incentive is to do a good job so you come back when you need us, not to make cancellation difficult so you forget to unsubscribe.",
    ],
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - telehealth pricing, PBS, refunds, no subscriptions */
export function PricingGuideSection() {
  return (
    <section
      aria-label="Pricing guide"
      className="py-20 lg:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered doctors
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            A straightforward guide to telehealth pricing
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            What you pay for, what&apos;s included, and why we keep things simple.
          </p>
        </Reveal>

        {/* Content sections */}
        <div className="space-y-12">
          {GUIDE_SECTIONS.map((section, i) => (
            <Reveal key={section.id} delay={i * 0.05}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  <StickerIcon name={section.sticker} size={36} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {section.paragraphs.map((p, j) => (
                      <p
                        key={j}
                        className="text-sm text-muted-foreground leading-relaxed"
                      >
                        {p}
                      </p>
                    ))}
                    {section.bullets && (
                      // Bullet rail. Splits a wall-of-text section into
                      // scannable rows on mobile (Tier 1 review 2026-05-25
                      // /pricing #3). Label is foreground weight so the
                      // eye lands on it first, body trails in muted.
                      <ul className="mt-4 space-y-2 rounded-xl border border-border/40 bg-muted/30 dark:bg-white/[0.03] p-3">
                        {section.bullets.map((bullet) => (
                          <li
                            key={bullet.label}
                            className="flex items-start gap-2 text-sm leading-relaxed"
                          >
                            <span
                              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
                              aria-hidden="true"
                            />
                            <span>
                              <span className="font-semibold text-foreground">
                                {bullet.label}:
                              </span>{" "}
                              <span className="text-muted-foreground">
                                {bullet.body}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Clinical governance link */}
        <div className="mt-12 pt-8 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            All clinical decisions are made by AHPRA-registered doctors following{" "}
            <Link
              href="/clinical-governance"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              our clinical governance framework
            </Link>
            . We never automate clinical decisions.
          </p>
        </div>
      </div>
    </section>
  )
}
