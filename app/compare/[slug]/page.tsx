import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, X } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Comparison Pages
const comparisons: Record<
  string,
  {
    title: string
    h1: string
    description: string
    intro: string
    instantMed: { pros: string[]; cons: string[]; bestFor: string[] }
    alternative: { name: string; pros: string[]; cons: string[]; bestFor: string[] }
    comparisonTable: { feature: string; instantMed: string; alternative: string }[]
    verdict: string
    faqs: { q: string; a: string }[]
  }
> = {
  "vs-gp": {
    title: "InstantMed vs Going to the GP | Which is Right for You?",
    h1: "InstantMed vs Seeing Your GP",
    description:
      "Honest comparison of telehealth vs traditional GP visits. When to use InstantMed and when to see someone in person.",
    intro:
      "We're not trying to replace your GP — we're here for the simple stuff when you need it fast. Here's an honest comparison to help you decide.",
    instantMed: {
      pros: [
        "No appointments needed",
        "Results usually within 1 hour",
        "Available 8am-10pm, 7 days",
        "No travel or waiting rooms",
        "Fixed, upfront pricing",
        "Great for simple, straightforward requests",
      ],
      cons: [
        "Can't do physical examinations",
        "Not suitable for complex conditions",
        "No ongoing relationship with same doctor",
        "Out of pocket cost (not bulk-billed)",
      ],
      bestFor: [
        "Medical certificates for cold/flu",
        "Repeat prescriptions for stable conditions",
        "Referrals when you know what you need",
        "UTI treatment (straightforward cases)",
        "When you can't get a same-day GP appointment",
      ],
    },
    alternative: {
      name: "Traditional GP",
      pros: [
        "Physical examination possible",
        "Ongoing relationship with your doctor",
        "Can handle complex conditions",
        "Bulk billing often available",
        "Comprehensive health management",
      ],
      cons: [
        "Often need to book days in advance",
        "Travel and waiting room time",
        "Limited after-hours availability",
        "Variable consultation lengths",
      ],
      bestFor: [
        "New or complex symptoms",
        "Conditions requiring examination",
        "Mental health support",
        "Chronic disease management",
        "Health checks and screenings",
        "When you need continuity of care",
      ],
    },
    comparisonTable: [
      { feature: "Wait time", instantMed: "Usually < 1 hour", alternative: "Often 1-7 days" },
      { feature: "Physical exam", instantMed: "No", alternative: "Yes" },
      { feature: "Cost", instantMed: "$19.95-$49.95", alternative: "Free (bulk-billed) to $80+" },
      { feature: "Hours", instantMed: "8am-10pm, 7 days", alternative: "Varies, often M-F only" },
      { feature: "Location", instantMed: "Anywhere with internet", alternative: "In clinic" },
      { feature: "Med certs", instantMed: "✓", alternative: "✓" },
      { feature: "Prescriptions", instantMed: "Simple/repeats only", alternative: "All types" },
      { feature: "Referrals", instantMed: "✓", alternative: "✓" },
    ],
    verdict:
      "Use InstantMed for quick, simple stuff when you need it fast. See your GP for anything complex, new, or requiring examination. Both have their place — we're not competing, we're complementing.",
    faqs: [
      {
        q: "Is InstantMed trying to replace GPs?",
        a: "No — we handle the simple stuff so GPs can focus on what they do best: complex care, examinations, and ongoing health management. Think of us as the express lane.",
      },
      {
        q: "Why would I pay when I can get bulk-billed?",
        a: "Time is money. If you're missing work waiting for an appointment, or sitting in a waiting room for an hour, InstantMed might actually be cheaper in the long run.",
      },
      {
        q: "How do I know if my issue is suitable for telehealth?",
        a: "If it's something you could describe over the phone without being examined, it's probably suitable. If you're unsure, start a request and we'll tell you if we can help.",
      },
    ],
  },
  "vs-emergency": {
    title: "InstantMed vs Emergency Department | When to Go to ED",
    h1: "InstantMed vs the Emergency Department",
    description:
      "Know when to use telehealth and when to go to emergency. Clear guidance on what constitutes an emergency.",
    intro: "Let's be very clear: InstantMed is NOT for emergencies. Here's how to know the difference.",
    instantMed: {
      pros: ["Fast for non-urgent issues", "No ED waiting times", "Comfortable from home", "Affordable fixed pricing"],
      cons: ["NOT for emergencies", "No urgent medications", "No physical examination", "No diagnostic equipment"],
      bestFor: [
        "Non-urgent illnesses",
        "Medical certificates",
        "Repeat prescriptions",
        "Referral letters",
        "Conditions that can wait",
      ],
    },
    alternative: {
      name: "Emergency Department",
      pros: [
        "Life-saving care available",
        "Full diagnostic equipment",
        "Specialists on call",
        "24/7 availability",
        "Can handle anything",
      ],
      cons: [
        "Long waits for non-urgent issues",
        "Expensive if not urgent",
        "Stressful environment",
        "Takes resources from true emergencies",
      ],
      bestFor: [
        "Chest pain or difficulty breathing",
        "Severe bleeding or injuries",
        "Signs of stroke",
        "Severe allergic reactions",
        "Loss of consciousness",
        "Anything life-threatening",
      ],
    },
    comparisonTable: [
      { feature: "For emergencies", instantMed: "✗ No", alternative: "✓ Yes" },
      { feature: "Wait time", instantMed: "< 1 hour", alternative: "2-12+ hours (triage-based)" },
      { feature: "Cost", instantMed: "$19.95-$49.95", alternative: "Free (public) / $$$$ (private)" },
      { feature: "Diagnostic tests", instantMed: "Referrals only", alternative: "On-site" },
      { feature: "Urgent meds", instantMed: "No", alternative: "Yes" },
    ],
    verdict:
      "If you're ever unsure whether something is an emergency, go to ED or call 000. It's always better to be safe. InstantMed is for when you know you're not dying but still need medical help.",
    faqs: [
      {
        q: "What counts as an emergency?",
        a: "Chest pain, difficulty breathing, severe bleeding, stroke symptoms (FAST), severe allergic reactions, loss of consciousness, serious injuries. When in doubt, call 000.",
      },
      {
        q: "Can InstantMed refer me to emergency?",
        a: "If we identify something urgent during your consultation, we'll advise you to seek emergency care immediately. But don't wait for us if you think it's an emergency.",
      },
      {
        q: "What about after-hours urgent care?",
        a: "For urgent but not emergency issues after hours, consider calling healthdirect (1800 022 222) or finding an after-hours GP clinic. InstantMed is available until 10pm.",
      },
    ],
  },
  "is-telehealth-right": {
    title: "Is Telehealth Right for Me? | Telehealth Guide | InstantMed",
    h1: "Is Telehealth Right for You?",
    description:
      "Comprehensive guide to understanding when telehealth is appropriate and when you should see a doctor in person.",
    intro:
      "Telehealth isn't for everything, but it's perfect for a lot of common health needs. Here's how to figure out if it's right for your situation.",
    instantMed: {
      pros: [
        "Convenient and fast",
        "No travel or waiting",
        "Works anywhere with internet",
        "Good for busy lifestyles",
        "Privacy and discretion",
      ],
      cons: ["No physical examination", "Limited for new diagnoses", "Relies on your description", "Internet required"],
      bestFor: [
        "You know what's wrong (common conditions)",
        "You need paperwork (certs, referrals)",
        "Repeat prescriptions",
        "You can't easily get to a GP",
        "Privacy matters (sensitive conditions)",
        "Time is critical",
      ],
    },
    alternative: {
      name: "In-Person Care",
      pros: [
        "Full physical examination",
        "Direct diagnostic tests",
        "Better for complex cases",
        "Face-to-face relationship",
      ],
      cons: ["Requires travel", "Appointment availability", "Waiting room time", "Less flexible hours"],
      bestFor: [
        "New or unexplained symptoms",
        "Anything requiring examination",
        "Mental health concerns",
        "Chronic disease management",
        "Children and elderly",
        "When you're not sure what's wrong",
      ],
    },
    comparisonTable: [
      { feature: "Simple UTI", instantMed: "✓ Ideal", alternative: "Also fine" },
      { feature: "Med cert for cold", instantMed: "✓ Ideal", alternative: "Also fine" },
      { feature: "Repeat BP medication", instantMed: "✓ Ideal", alternative: "Also fine" },
      { feature: "New chest pain", instantMed: "✗ See someone", alternative: "✓ Yes (or ED)" },
      { feature: "Skin rash (new)", instantMed: "Maybe (with photos)", alternative: "✓ Better" },
      { feature: "Mental health", instantMed: "Initial support only", alternative: "✓ Better" },
      { feature: "Lump you've found", instantMed: "✗ See someone", alternative: "✓ Yes" },
    ],
    verdict:
      "Telehealth is brilliant for straightforward, common conditions where you know what you need. It's not a replacement for comprehensive medical care, but it fills a genuine gap for busy Australians who need quick help for simple things.",
    faqs: [
      {
        q: "How do I know if my condition is suitable?",
        a: "Ask yourself: Could I describe this accurately over the phone? Does it need to be touched or listened to? If it's something you've had before and recognise, or it's clearly a common condition, telehealth is probably fine.",
      },
      {
        q: "What if the doctor can't help me online?",
        a: "We'll tell you, and we won't charge you. If we identify that you need in-person care, we'll advise accordingly and you can request a refund.",
      },
      {
        q: "Is telehealth legitimate?",
        a: "Absolutely. Telehealth is endorsed by the Australian government and medical associations. Our doctors are all AHPRA-registered and practicing in Australia.",
      },
    ],
  },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const comparison = comparisons[slug]
  if (!comparison) return {}

  return {
    title: comparison.title,
    description: comparison.description,
    openGraph: {
      title: comparison.title,
      description: comparison.description,
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

  // FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: comparison.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">{comparison.h1}</h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">{comparison.intro}</p>
            </div>
          </section>

          {/* Comparison Table */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">Quick Comparison</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Feature</th>
                      <th className="text-center py-3 px-4 font-semibold text-[#00E2B5]">InstantMed</th>
                      <th className="text-center py-3 px-4 font-semibold">{comparison.alternative.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.comparisonTable.map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-3 px-4">{row.feature}</td>
                        <td className="py-3 px-4 text-center">{row.instantMed}</td>
                        <td className="py-3 px-4 text-center">{row.alternative}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Pros/Cons */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-4xl grid gap-8 md:grid-cols-2">
              {/* InstantMed */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-[#00E2B5]">InstantMed</h2>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" /> Pros
                  </h3>
                  <ul className="space-y-2">
                    {comparison.instantMed.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <X className="h-5 w-5 text-red-500" /> Cons
                  </h3>
                  <ul className="space-y-2">
                    {comparison.instantMed.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Best for:</h3>
                  <ul className="space-y-2">
                    {comparison.instantMed.bestFor.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Alternative */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold">{comparison.alternative.name}</h2>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" /> Pros
                  </h3>
                  <ul className="space-y-2">
                    {comparison.alternative.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <X className="h-5 w-5 text-red-500" /> Cons
                  </h3>
                  <ul className="space-y-2">
                    {comparison.alternative.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <X className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Best for:</h3>
                  <ul className="space-y-2">
                    {comparison.alternative.bestFor.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Verdict */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-xl font-bold mb-4">The Verdict</h2>
              <p className="text-muted-foreground">{comparison.verdict}</p>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {comparison.faqs.map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl border bg-card">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Try InstantMed?</h2>
              <p className="text-muted-foreground mb-6">
                For quick, simple health needs — we&apos;re here when you need us.
              </p>
              <Link href="/request">
                <Button size="lg" className="bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C]">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </section>

          {/* Other Comparisons */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm text-muted-foreground text-center">
                More comparisons:{" "}
                {Object.entries(comparisons)
                  .filter(([s]) => s !== slug)
                  .map(([s, c], i, arr) => (
                    <span key={s}>
                      <Link href={`/compare/${s}`} className="text-[#00E2B5] hover:underline">
                        {c.h1}
                      </Link>
                      {i < arr.length - 1 && " • "}
                    </span>
                  ))}
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
