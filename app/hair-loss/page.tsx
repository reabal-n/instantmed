import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Clock,
  Shield,
  Zap,
  EyeOff,
  Pill,
  Lock,
  ChevronDown,
  PhoneOff,
} from "lucide-react"
import type { Metadata } from "next"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Hair Loss Consultation Online Australia | InstantMed",
  description:
    "Get hair loss consultations online from Australian doctors. Doctor-led assessment and treatment planning. Consultation completed in 15 minutes, no awkward conversations, discreet service.",
  keywords: [
    "hair loss consultation australia",
    "hair loss doctor online",
    "male pattern baldness consultation",
    "hair loss telehealth",
    "hair regrowth consultation",
    "online hair loss doctor",
  ],
  openGraph: {
    title: "Hair Loss Consultation Online | InstantMed",
    description: "Get hair loss consultations from Australian doctors in 15 minutes. Discreet, no phone call required.",
    url: "https://instantmed.com.au/hair-loss",
  },
  alternates: {
    canonical: "https://instantmed.com.au/hair-loss",
  },
}

const treatments = [
  {
    id: "oral",
    name: "Oral Treatment Option",
    brand: "Daily oral option",
    description: "Doctor-prescribed oral treatment taken once daily. Works by addressing hormonal factors that contribute to hair follicle changes.",
    type: "Oral treatment",
    frequency: "Once daily",
    results: "Results typically visible in 3-6 months",
    bestFor: "Hair loss at the crown and mid-scalp",
    popular: true,
  },
  {
    id: "topical",
    name: "Topical Treatment Option",
    brand: "Applied treatment option",
    description: "Doctor-prescribed topical solution or foam applied to the scalp. Stimulates hair follicles and increases blood flow to support hair growth.",
    type: "Topical solution/foam",
    frequency: "Twice daily",
    results: "Results typically visible in 2-4 months",
    bestFor: "Thinning hair, receding hairline",
    popular: true,
  },
  {
    id: "combination",
    name: "Combination Approach",
    brand: "Dual treatment approach",
    description: "Using both treatment approaches together for maximum effectiveness. Addresses hair loss through multiple mechanisms.",
    type: "Oral + Topical",
    frequency: "As directed",
    results: "Often more effective than either alone",
    bestFor: "Moderate to advanced hair loss",
    popular: false,
  },
]

const platformFeatures = [
  {
    icon: PhoneOff,
    title: "No Phone Call Required",
    description: "Complete your entire consultation online. No awkward conversations about hair loss.",
  },
  {
    icon: Clock,
    title: "Script in 15 Minutes",
    description: "Our doctors review requests quickly. Most prescriptions are issued within 15 minutes during business hours.",
  },
  {
    icon: EyeOff,
    title: "100% Discreet",
    description: "Your consultation is private. Medications come in standard pharmacy packaging.",
  },
  {
    icon: Shield,
    title: "AHPRA-Registered Doctors",
    description: "All consultations reviewed by fully qualified Australian doctors.",
  },
]

const faqs = [
  {
    question: "What treatment options are available?",
    answer:
      "Our doctors can recommend different treatment approaches based on your assessment. One option is an oral treatment that addresses hormonal factors contributing to hair loss — it's most effective for hair loss at the crown and mid-scalp. Another option is a topical treatment applied directly to the scalp that stimulates hair follicles and increases blood flow. Many men use both approaches together for best results.",
  },
  {
    question: "How long until I see results?",
    answer:
      "Hair growth takes time. With topical treatments, some improvement may be visible in 2-4 months. With oral treatments, most men see results in 3-6 months. It can take up to 12 months to see the full effect. Consistency is key — stopping treatment typically leads to reversal of gains.",
  },
  {
    question: "Are there side effects?",
    answer:
      "Topical treatments may cause scalp irritation or unwanted facial hair growth (rare). Oral treatments may cause decreased libido or erectile changes in a small percentage of men (1-2%), which typically resolve after stopping treatment. Our doctors will discuss potential side effects with you.",
  },
  {
    question: "Do I need a doctor consultation for these treatments?",
    answer:
      "Oral treatments always require a doctor consultation in Australia. Topical treatments at higher strengths are also prescription-only, though lower strengths are available over the counter. Our doctors can recommend both approaches after assessment.",
  },
  {
    question: "Is the service really discreet?",
    answer:
      "Completely. No phone calls required. Your pharmacy receives only the prescription — not your consultation details. Medications come in standard pharmacy packaging with no indication of contents. Your bank statement shows &apos;InstantMed&apos; only.",
  },
  {
    question: "Can women use these treatments?",
    answer:
      "Topical treatments can be used by women for hair loss (at lower concentrations). Oral treatments are NOT suitable for women, especially those who are or may become pregnant. If you&apos;re a woman experiencing hair loss, please indicate this in your consultation.",
  },
]

export default function HairLossPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-12 sm:px-6 lg:py-16 overflow-hidden">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-4 interactive-pill cursor-default">
                    <EyeOff className="w-3.5 h-3.5 text-teal-600" />
                    <span className="text-xs font-medium text-teal-700">100% Discreet • No Phone Call</span>
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Hair Loss Treatment Online
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-4">
                    Get a doctor-led consultation for clinically-proven hair loss treatment from an Australian doctor in{" "}
                    <strong>15 minutes</strong>. No waiting rooms. No awkward conversations.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    TGA-approved treatments • AHPRA-registered doctors • Discreet service
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                    <Link href="/start?service=hair-loss">
                      <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-6 w-full sm:w-auto">
                        Start Consultation
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href="#treatments">
                      <Button variant="outline" size="lg" className="text-sm px-6 w-full sm:w-auto">
                        View Treatments
                      </Button>
                    </Link>
                  </div>

                  {/* Trust badges */}
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Zap className="h-3.5 w-3.5 text-teal-600" />
                      <span className="font-medium text-muted-foreground">Script in 15 min</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <PhoneOff className="h-3.5 w-3.5 text-teal-600" />
                      <span className="font-medium text-muted-foreground">No phone call</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Shield className="h-3.5 w-3.5 text-teal-600" />
                      <span className="font-medium text-muted-foreground">AHPRA doctors</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Lock className="h-3.5 w-3.5 text-teal-600" />
                      <span className="font-medium text-muted-foreground">Encrypted & secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Treatment Options */}
          <section id="treatments" className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Treatment Options</h2>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    Our doctors can recommend TGA-approved hair loss treatment options based on your assessment
                  </p>
                </div>

                <div className="space-y-4">
                  {treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="bg-content1/50 backdrop-blur-sm rounded-xl p-4 border border-divider/50 hover:border-teal-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-lg font-bold">{treatment.name}</h3>
                            {treatment.popular && (
                              <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 text-xs">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{treatment.brand}</p>
                        </div>
                        <Pill className="h-5 w-5 text-teal-600 shrink-0" />
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{treatment.description}</p>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-3">
                          <p className="text-muted-foreground text-xs">Type</p>
                          <p className="font-medium">{treatment.type}</p>
                        </div>
                        <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-3">
                          <p className="text-muted-foreground text-xs">Frequency</p>
                          <p className="font-medium">{treatment.frequency}</p>
                        </div>
                        <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-3">
                          <p className="text-muted-foreground text-xs">Results</p>
                          <p className="font-medium">{treatment.results}</p>
                        </div>
                        <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-3">
                          <p className="text-muted-foreground text-xs">Best for</p>
                          <p className="font-medium">{treatment.bestFor}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground mb-4">
                    Not sure which is right for you? Our doctors will recommend the best option.
                  </p>
                  <Link href="/start?service=hair-loss">
                    <Button className="bg-teal-600 hover:bg-teal-700 text-xs h-9">
                      Start Consultation
                      <ArrowRight className="h-3.5 w-3.5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Platform Features */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Why Choose InstantMed?</h2>
                  <p className="text-sm text-muted-foreground">
                    Fast, discreet, and professional healthcare from home
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {platformFeatures.map((feature, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">How It Works</h2>
                  <p className="text-sm text-muted-foreground">Three simple steps to get your treatment</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      1
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Complete Questionnaire</h3>
                    <p className="text-xs text-muted-foreground">
                      Answer questions about your hair loss online. Takes about 3 minutes.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      2
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Doctor Reviews</h3>
                    <p className="text-xs text-muted-foreground">
                      An AHPRA-registered doctor reviews your request and prescribes if appropriate.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      3
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Receive Treatment Plan</h3>
                    <p className="text-xs text-muted-foreground">
                      Treatment plan sent to your phone. Collect from any pharmacy Australia-wide.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Results Timeline */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">What to Expect</h2>
                  <p className="text-sm text-muted-foreground">Hair regrowth takes time — here&apos;s a typical timeline</p>
                </div>

                <div className="space-y-3 max-w-3xl mx-auto">
                  {[
                    { month: "Month 1-2", desc: "Treatment begins. Some initial shedding is normal as weaker hairs make way for stronger growth." },
                    { month: "Month 3-4", desc: "Early signs of improvement. Shedding slows, and you may notice fine new hairs appearing." },
                    { month: "Month 6", desc: "Visible improvement for most men. Hair appears thicker and fuller." },
                    { month: "Month 12+", desc: "Full results visible. Continued use maintains and often improves results." },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 p-4 bg-teal-50/50 border border-teal-100 rounded-xl">
                      <div className="shrink-0 w-16 text-teal-600 font-semibold text-xs">{item.month}</div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-3 max-w-3xl mx-auto">
                  {faqs.map((faq, i) => (
                    <details key={i} className="group bg-content1/50 backdrop-blur-sm rounded-xl border border-divider/50">
                      <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                        <span className="text-sm font-medium pr-4">{faq.question}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform shrink-0" />
                      </summary>
                      <div className="px-4 pb-4">
                        <p className="text-xs text-muted-foreground">{faq.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden border-teal-500/20 bg-teal-50/30 dark:bg-teal-950/10">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                    Ready to Get Started?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                    Complete a confidential consultation in minutes. Our doctors are ready to help.
                  </p>
                  <Link href="/start?service=hair-loss">
                    <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-8 h-12">
                      Start Consultation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-4">
                    Takes ~3 minutes • 100% discreet • Script in 15 min
                  </p>
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
