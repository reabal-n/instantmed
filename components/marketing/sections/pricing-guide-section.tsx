import { BadgeCheck, Banknote, CalendarOff, FileText, Pill, RotateCcw } from "lucide-react"
import Link from "next/link"

import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "telehealth-pricing",
    icon: Banknote,
    title: "Understanding telehealth pricing in Australia",
    paragraphs: [
      "Most telehealth platforms in Australia operate outside of Medicare. This isn't unusual - it's standard across the industry. Medicare rebates are designed around traditional GP consultations where a provider-patient relationship is established through ongoing care. Asynchronous telehealth services, where a doctor reviews your request without a real-time appointment, don't fit neatly into existing Medicare item numbers.",
      "The result is that telehealth consultations are typically a private, out-of-pocket expense. Our pricing reflects the genuine clinical work involved: a doctor reviews your medical history, assesses your symptoms, makes a clinical decision, and generates your documentation. That's the same clinical process you'd get at a GP clinic - minus the waiting room, the commute, and the two hours you didn't budget for on a Tuesday morning.",
      "For context, the average out-of-pocket cost for a standard GP visit in Australia is between $39 and $80 after Medicare rebates (AMA data, 2024). Bulk-billed GP visits are becoming harder to find - the AIHW reports that only around 35% of GP visits are fully bulk-billed in some metropolitan areas, and rural access is even tighter. Our pricing sits well below the average gap payment for a private GP visit, and you don't need to leave the house.",
    ],
  },
  {
    id: "whats-included",
    icon: FileText,
    title: "What's included in your consultation fee",
    paragraphs: [
      "When you pay for a consultation through InstantMed, you're paying for a genuine clinical service - not a rubber stamp. Every request is reviewed by an AHPRA-registered doctor who assesses your symptoms, medical history, and the clinical appropriateness of your request. If something doesn't add up, the doctor will ask follow-up questions or decline the request entirely (with a full refund).",
      "Your fee covers the doctor's review time, clinical assessment, document generation (medical certificates with unique verification IDs, or eScript generation for prescriptions), secure digital delivery, and encrypted storage of your records. If the reviewing doctor needs additional information before making a decision, that follow-up is included - no extra charge for the doctor doing their job properly.",
      "You also get access to our certificate verification system, which employers and institutions can use to confirm your certificate was genuinely issued by our practice. This is an additional layer of trust that most traditional paper certificates don't offer.",
    ],
  },
  {
    id: "pbs-medications",
    icon: Pill,
    title: "PBS subsidies and medication costs",
    paragraphs: [
      "Our consultation fee covers the doctor's assessment and eScript generation only. The actual cost of your medication is a separate expense, paid at the pharmacy when you collect your prescription. These are two distinct charges - our fee for the clinical service, and the pharmacy's charge for the medication itself.",
      "The good news is that Australia's Pharmaceutical Benefits Scheme (PBS) subsidises many common medications. From 1 January 2026, if you hold a valid Medicare card, most common prescriptions cost up to $25.00 at the pharmacy (down from $31.60). Concession card holders pay up to $7.70 (frozen until 2030). Without Medicare, you'll pay the full retail price, which varies by medication. Source: health.gov.au/cheaper-medicines/pbs-co-payments",
      "We can't tell you exactly what your medication will cost at the pharmacy because prices vary between pharmacies and depend on whether you have Medicare and concession entitlements. Your pharmacist can give you a precise cost before you commit to purchasing. The PBS website (pbs.gov.au) also lists subsidy information for specific medications.",
    ],
  },
  {
    id: "refund-policy",
    icon: RotateCcw,
    title: "Our refund policy",
    paragraphs: [
      "If a doctor reviews your request and determines that a certificate or prescription isn't clinically appropriate, you get a full refund. No questions, no paperwork, no awkward phone call. The refund is processed automatically and typically lands back in your account within 3-5 business days, depending on your bank.",
      "We don't offer refunds for change-of-mind after a certificate or prescription has been issued - the clinical work has been done and the document has been generated. That said, we're reasonable people. If something genuinely went wrong with your experience, contact us at support@instantmed.com.au and we'll sort it out.",
      "If you have a complaint about the clinical care you received, email complaints@instantmed.com.au. We respond to all complaints within 48 hours and aim to resolve them within 14 days. If you're not satisfied with our resolution, you can escalate to the Health Care Complaints Commission (HCCC) or AHPRA directly.",
    ],
  },
  {
    id: "no-subscriptions",
    icon: CalendarOff,
    title: "Why we don't do subscriptions",
    paragraphs: [
      "Some telehealth platforms charge monthly memberships - $15 to $30 a month for the privilege of being able to book a consultation that you then also pay for. We don't do that. We don't charge you a monthly fee to have the privilege of paying us for an appointment. That business model is for gyms, not healthcare.",
      "You pay when you need care, and you don't pay when you don't. No lock-in contracts, no minimum commitment, no recurring charges quietly draining your account. If you need a medical certificate once a year, you pay once a year. If you never come back, we don't chase you with \"we miss you\" emails. Actually, we might send one. But we won't charge you for it.",
      "This approach keeps things honest. We only earn revenue when we're actually providing a service - which means our incentive is to do a good job so you come back when you need us, not to make cancellation difficult so you forget to unsubscribe.",
    ],
  },
] as const

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
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered GPs
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
                <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <section.icon className="w-4.5 h-4.5 text-primary" />
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
              className="text-primary hover:underline"
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
