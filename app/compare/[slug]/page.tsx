import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { 
  ArrowRight, 
  Clock, 
  Shield, 
  CheckCircle2, 
  X,
  Star,
  Zap,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/healthcare-schema"
import { PageBreadcrumbs } from "@/components/uix"

// Comparison pages for competitive SEO
const comparisons: Record<string, {
  title: string
  slug: string
  description: string
  competitor: {
    name: string
    type: "gp" | "competitor" | "alternative"
  }
  heroText: string
  comparisonTable: Array<{
    feature: string
    instantmed: string | boolean
    competitor: string | boolean
    winner?: "instantmed" | "competitor" | "tie"
  }>
  whenInstantMedBetter: string[]
  whenCompetitorBetter: string[]
  verdict: string
  faqs: Array<{ q: string; a: string }>
}> = {
  "telehealth-vs-gp": {
    title: "Telehealth vs In-Person GP: Which Should You Choose?",
    slug: "telehealth-vs-gp",
    description: "Compare telehealth services like InstantMed with traditional GP visits. Understand when each option is best for your healthcare needs.",
    competitor: {
      name: "In-Person GP",
      type: "gp"
    },
    heroText: "Both telehealth and in-person GP visits have their place in modern healthcare. Here's an honest comparison to help you choose the right option for your situation.",
    comparisonTable: [
      { feature: "Wait time for appointment", instantmed: "No wait - start immediately", competitor: "Often days to weeks", winner: "instantmed" },
      { feature: "Time to see doctor", instantmed: "Usually under 1 hour", competitor: "15-60 min in waiting room + consult", winner: "instantmed" },
      { feature: "Available after hours", instantmed: "Yes, extended hours", competitor: "Limited (after-hours clinics)", winner: "instantmed" },
      { feature: "Physical examination", instantmed: "Not available", competitor: "Full examination possible", winner: "competitor" },
      { feature: "Blood tests & procedures", instantmed: "Referrals only", competitor: "On-site or nearby", winner: "competitor" },
      { feature: "Medical certificates", instantmed: "Yes - legally valid", competitor: "Yes", winner: "tie" },
      { feature: "Prescriptions", instantmed: "E-prescriptions for suitable conditions", competitor: "Full prescribing", winner: "competitor" },
      { feature: "Cost with Medicare", instantmed: "From $19.95 (no Medicare rebate)", competitor: "Free if bulk-billed", winner: "competitor" },
      { feature: "Continuity of care", instantmed: "Records available, different doctors", competitor: "Same GP can follow your history", winner: "competitor" },
      { feature: "Convenience", instantmed: "From anywhere, no travel", competitor: "Need to travel to clinic", winner: "instantmed" },
      { feature: "Privacy", instantmed: "Completely private", competitor: "Waiting room, shared space", winner: "instantmed" },
      { feature: "Complex conditions", instantmed: "Better suited for simple issues", competitor: "Can handle complexity", winner: "competitor" },
    ],
    whenInstantMedBetter: [
      "You need a medical certificate quickly and don't want to wait for a GP appointment",
      "You have a straightforward issue like cold/flu symptoms",
      "You need a repeat prescription for a medication you're already taking",
      "You're in a remote area or can't easily get to a clinic",
      "You need care outside normal GP hours",
      "You prefer the privacy of a remote consultation",
      "You're too unwell to travel to a clinic"
    ],
    whenCompetitorBetter: [
      "You need a physical examination",
      "You're starting a new medication that needs monitoring",
      "You have a complex or ongoing health condition",
      "You need blood tests, vaccinations, or procedures",
      "You want to build a relationship with a regular GP",
      "You're eligible for bulk billing and cost is a concern",
      "You have symptoms that need to be physically assessed"
    ],
    verdict: "Telehealth and in-person GPs complement each other. Use telehealth for convenience and straightforward issues. See your GP for complex conditions, physical examinations, and ongoing care. Many people use both — telehealth when they need something quick, GP visits for comprehensive care.",
    faqs: [
      {
        q: "Is telehealth as good as seeing a GP in person?",
        a: "For appropriate conditions, telehealth can be just as effective. Many health issues don't require physical examination. The key is knowing which option suits your needs — telehealth is great for convenience and simple issues, while GPs are better for complex or ongoing care."
      },
      {
        q: "Will my regular GP know about my telehealth consultations?",
        a: "Telehealth consultations create medical records, but they're not automatically shared with your GP. You can request a summary to share with your GP, or inform them about any diagnoses or prescriptions you received."
      },
      {
        q: "Can telehealth doctors prescribe the same medications as GPs?",
        a: "Telehealth doctors can prescribe most common medications, including repeat scripts. However, some medications (controlled substances, those needing monitoring) may require an in-person assessment."
      },
      {
        q: "Should I still have a regular GP if I use telehealth?",
        a: "Yes, we recommend it. A regular GP provides continuity of care, knows your full history, and can manage complex or chronic conditions. Telehealth is best used as a complement to, not replacement for, ongoing GP care."
      }
    ]
  },
  "online-medical-certificate-options": {
    title: "Online Medical Certificate Services in Australia Compared",
    slug: "online-medical-certificate-options",
    description: "Compare online medical certificate services in Australia. See how different telehealth providers stack up for getting a sick note.",
    competitor: {
      name: "Other Online Services",
      type: "alternative"
    },
    heroText: "Several telehealth services in Australia offer online medical certificates. Here's what to look for and how the options compare.",
    comparisonTable: [
      { feature: "AHPRA registered doctors", instantmed: true, competitor: "Varies - always check", winner: "tie" },
      { feature: "Average response time", instantmed: "Under 1 hour", competitor: "1-24 hours", winner: "instantmed" },
      { feature: "Price for med cert", instantmed: "From $19.95", competitor: "$15-50", winner: "tie" },
      { feature: "Backdating available", instantmed: "If clinically appropriate", competitor: "Varies by service", winner: "tie" },
      { feature: "Carer's leave certificates", instantmed: true, competitor: "Most services", winner: "tie" },
      { feature: "Mental health certificates", instantmed: true, competitor: "Most services", winner: "tie" },
      { feature: "Follow-up if declined", instantmed: "Full refund + guidance", competitor: "Varies", winner: "instantmed" },
      { feature: "Doctor messaging", instantmed: "Yes - can clarify", competitor: "Some services", winner: "instantmed" },
      { feature: "Available 7 days", instantmed: true, competitor: "Most services", winner: "tie" },
      { feature: "Prescription services", instantmed: true, competitor: "Some services", winner: "instantmed" },
    ],
    whenInstantMedBetter: [
      "You need your certificate quickly (under 1 hour)",
      "You want to be able to message the doctor if they have questions",
      "You also need a prescription or other medical service",
      "You value a refund guarantee if your request can't be fulfilled",
      "You want a service with transparent, upfront pricing"
    ],
    whenCompetitorBetter: [
      "You're looking for the absolute lowest price",
      "You're eligible for a bulk-billed telehealth service",
      "You have a specific service you've used before and trust",
      "You want video consultation rather than asynchronous"
    ],
    verdict: "When choosing an online medical certificate service, prioritise: (1) AHPRA-registered doctors, (2) clear pricing, (3) reasonable response times, and (4) a proper clinical assessment. Avoid services that seem to guarantee approval or don't involve a real doctor reviewing your case.",
    faqs: [
      {
        q: "Are all online medical certificates legitimate?",
        a: "Certificates from AHPRA-registered doctors are legitimate. Always verify the service uses registered Australian doctors. Avoid services that guarantee approval without assessment — that's a red flag."
      },
      {
        q: "Why do prices vary so much between services?",
        a: "Prices reflect different business models. Some services use very brief assessments, others more thorough. Cheaper isn't always better — look for services that do a proper clinical assessment."
      },
      {
        q: "What should I look for in an online certificate service?",
        a: "Key factors: AHPRA-registered doctors, transparent pricing, reasonable response times, proper assessment process, and clear communication. Avoid services promising instant approval."
      },
      {
        q: "Can my employer tell if my certificate is from a telehealth service?",
        a: "Certificates will show the doctor's details. Some employers can tell it's from a telehealth service, but this doesn't affect validity. Telehealth certificates are legally equivalent to in-person ones."
      }
    ]
  },
  "waiting-room-vs-telehealth": {
    title: "Skip the Waiting Room: Is Telehealth Worth It?",
    slug: "waiting-room-vs-telehealth",
    description: "Tired of waiting rooms? Compare the telehealth experience with traditional clinic visits and see if online healthcare is right for you.",
    competitor: {
      name: "Traditional Clinic Visit",
      type: "alternative"
    },
    heroText: "The average Australian spends 20 minutes in a GP waiting room — and that's after waiting days for an appointment. Here's how telehealth changes the equation.",
    comparisonTable: [
      { feature: "Booking an appointment", instantmed: "Instant - start now", competitor: "Often 2-7 days wait", winner: "instantmed" },
      { feature: "Time in waiting room", instantmed: "0 minutes", competitor: "15-45 minutes average", winner: "instantmed" },
      { feature: "Travel time", instantmed: "None", competitor: "15-30 minutes each way", winner: "instantmed" },
      { feature: "Total time investment", instantmed: "~10 min form + wait for response", competitor: "Often 1-2+ hours total", winner: "instantmed" },
      { feature: "Can do while sick in bed", instantmed: true, competitor: false, winner: "instantmed" },
      { feature: "Exposure to other sick people", instantmed: "None", competitor: "Waiting room exposure", winner: "instantmed" },
      { feature: "Need to take time off work", instantmed: "Usually no", competitor: "Often yes", winner: "instantmed" },
      { feature: "Available on weekends", instantmed: true, competitor: "Limited options", winner: "instantmed" },
      { feature: "Physical examination", instantmed: false, competitor: true, winner: "competitor" },
      { feature: "Same-day procedures", instantmed: false, competitor: true, winner: "competitor" },
    ],
    whenInstantMedBetter: [
      "You're unwell and don't want to leave the house",
      "You can't get a GP appointment for days",
      "You just need a medical certificate or simple script",
      "You don't want to sit in a waiting room with other sick people",
      "You can't take time off work for a GP visit",
      "It's after hours or the weekend",
      "You value convenience and speed"
    ],
    whenCompetitorBetter: [
      "You need a physical examination",
      "You need blood tests or vaccinations",
      "You have a complex condition needing discussion",
      "You're eligible for bulk billing",
      "You want to see your regular GP who knows your history"
    ],
    verdict: "For straightforward needs like medical certificates, simple illnesses, and repeat prescriptions, telehealth saves significant time and hassle. For complex issues or when you need physical assessment, a clinic visit is still the better choice. The good news: you don't have to choose one or the other.",
    faqs: [
      {
        q: "How much time does telehealth actually save?",
        a: "For a typical medical certificate, telehealth takes about 10 minutes to complete the form, then you wait for the doctor's response (usually under an hour). Compare this to days waiting for a GP appointment, plus travel and waiting room time."
      },
      {
        q: "Is it worth paying for telehealth when GPs can bulk bill?",
        a: "That depends on your situation. If your time is valuable and you need care quickly, paying $20-30 for telehealth can be worth it. If cost is your main concern and you can wait, a bulk-billed GP is the cheaper option."
      },
      {
        q: "What if I start with telehealth but need to see someone in person?",
        a: "That's fine — telehealth doctors will tell you if they think you need in-person care. You're not locked in. Many people use telehealth for triage — if it's simple, sorted. If not, they'll guide you to the right care."
      },
      {
        q: "Do I still need a regular GP if I use telehealth?",
        a: "We recommend having a regular GP for ongoing care, chronic conditions, and comprehensive health management. Telehealth is best for convenience and acute issues, not as a replacement for regular preventive care."
      }
    ]
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const comparison = comparisons[slug]
  if (!comparison) return {}

  return {
    title: `${comparison.title} | InstantMed`,
    description: comparison.description,
    keywords: [
      'telehealth vs gp',
      'online doctor comparison',
      'telehealth australia',
      'medical certificate online vs gp',
    ],
    openGraph: {
      title: comparison.title,
      description: comparison.description,
      url: `https://instantmed.com.au/compare/${slug}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/compare/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(comparisons).map((slug) => ({ slug }))
}

export default async function ComparisonPage({ params }: PageProps) {
  const { slug } = await params
  const comparison = comparisons[slug]

  if (!comparison) {
    notFound()
  }

  const faqSchemaData = comparison.faqs.map(faq => ({
    question: faq.q,
    answer: faq.a
  }))

  return (
    <>
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Compare", url: "https://instantmed.com.au/compare" },
          { name: comparison.title, url: `https://instantmed.com.au/compare/${slug}` }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="px-4 pt-6 bg-white dark:bg-slate-900">
            <div className="mx-auto max-w-4xl">
              <PageBreadcrumbs
                links={[
                  { label: "Compare", href: "/compare" },
                  { label: comparison.title }
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero */}
          <section className="px-4 py-8 sm:py-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {comparison.title}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {comparison.heroText}
              </p>
            </div>
          </section>

          {/* Comparison Table */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Head-to-Head Comparison
              </h2>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="font-medium text-muted-foreground">Feature</div>
                  <div className="font-semibold text-primary text-center">InstantMed</div>
                  <div className="font-medium text-foreground text-center">{comparison.competitor.name}</div>
                </div>

                {/* Rows */}
                {comparison.comparisonTable.map((row, i) => (
                  <div 
                    key={i}
                    className={`grid grid-cols-3 p-4 ${i !== comparison.comparisonTable.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                  >
                    <div className="text-foreground font-medium">{row.feature}</div>
                    <div className="text-center">
                      {typeof row.instantmed === 'boolean' ? (
                        row.instantmed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-slate-400 mx-auto" />
                        )
                      ) : (
                        <span className={`text-sm ${row.winner === 'instantmed' ? 'text-emerald-600 font-medium' : 'text-foreground'}`}>
                          {row.instantmed}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof row.competitor === 'boolean' ? (
                        row.competitor ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-slate-400 mx-auto" />
                        )
                      ) : (
                        <span className={`text-sm ${row.winner === 'competitor' ? 'text-emerald-600 font-medium' : 'text-foreground'}`}>
                          {row.competitor}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* When to Choose Each */}
          <section className="px-4 py-12 bg-white dark:bg-slate-900">
            <div className="mx-auto max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Choose InstantMed */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Choose InstantMed When
                  </h3>
                  <ul className="space-y-3">
                    {comparison.whenInstantMedBetter.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6 w-full rounded-full">
                    <Link href="/request">
                      Try InstantMed
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {/* Choose Competitor */}
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-slate-600" />
                    Choose {comparison.competitor.name} When
                  </h3>
                  <ul className="space-y-3">
                    {comparison.whenCompetitorBetter.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-slate-600 mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Verdict */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4">
                  The Bottom Line
                </h2>
                <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                  {comparison.verdict}
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="px-4 py-12 bg-white dark:bg-slate-900">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {comparison.faqs.map((faq, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Ready to try telehealth?
              </h2>
              <p className="text-muted-foreground mb-8">
                See why thousands of Australians choose InstantMed for their healthcare needs.
              </p>
              <Button asChild size="lg" className="h-14 px-10 rounded-full">
                <Link href="/request">
                  Get started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Under 1 hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
