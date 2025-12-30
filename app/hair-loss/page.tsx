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

export const metadata: Metadata = {
  title: "Hair Loss Treatment Online Australia | Minoxidil & Finasteride | InstantMed",
  description:
    "Get hair loss prescriptions online from Australian doctors. Minoxidil, finasteride for male pattern baldness. Script in 15 minutes, no awkward conversations, discreet delivery.",
  keywords: [
    "hair loss treatment australia",
    "minoxidil prescription online",
    "finasteride prescription australia",
    "male pattern baldness treatment",
    "hair loss telehealth",
    "propecia alternative australia",
    "regaine prescription",
  ],
  openGraph: {
    title: "Hair Loss Treatment Online | Minoxidil & Finasteride | InstantMed",
    description: "Get hair loss prescriptions from Australian doctors in 15 minutes. Discreet, no phone call required.",
    url: "https://instantmed.com.au/hair-loss",
  },
  alternates: {
    canonical: "https://instantmed.com.au/hair-loss",
  },
}

const treatments = [
  {
    id: "finasteride",
    name: "Finasteride",
    brand: "Generic / Propecia®",
    description: "Oral tablet taken once daily. Blocks DHT, the hormone responsible for hair follicle miniaturisation in male pattern baldness.",
    type: "Oral tablet",
    frequency: "Once daily",
    results: "Results typically visible in 3-6 months",
    bestFor: "Hair loss at the crown and mid-scalp",
    popular: true,
  },
  {
    id: "minoxidil",
    name: "Minoxidil",
    brand: "Generic / Regaine®",
    description: "Topical solution or foam applied to the scalp. Stimulates hair follicles and increases blood flow to promote hair growth.",
    type: "Topical solution/foam",
    frequency: "Twice daily",
    results: "Results typically visible in 2-4 months",
    bestFor: "Thinning hair, receding hairline",
    popular: true,
  },
  {
    id: "combination",
    name: "Combination Therapy",
    brand: "Finasteride + Minoxidil",
    description: "Using both treatments together for maximum effectiveness. Addresses hair loss through multiple mechanisms.",
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
    question: "What&apos;s the difference between Finasteride and Minoxidil?",
    answer:
      "Finasteride is an oral tablet that blocks DHT (the hormone causing hair loss) from within. It&apos;s most effective for hair loss at the crown and mid-scalp. Minoxidil is a topical treatment applied directly to the scalp that stimulates hair follicles and increases blood flow. Many men use both together for best results.",
  },
  {
    question: "How long until I see results?",
    answer:
      "Hair growth takes time. With Minoxidil, some improvement may be visible in 2-4 months. With Finasteride, most men see results in 3-6 months. It can take up to 12 months to see the full effect. Consistency is key — stopping treatment typically leads to reversal of gains.",
  },
  {
    question: "Are there side effects?",
    answer:
      "Minoxidil may cause scalp irritation or unwanted facial hair growth (rare). Finasteride may cause decreased libido or erectile changes in a small percentage of men (1-2%), which typically resolve after stopping the medication. Our doctors will discuss these with you.",
  },
  {
    question: "Do I need a prescription for these treatments?",
    answer:
      "Finasteride always requires a prescription in Australia. Minoxidil 5% (the most effective strength) is also prescription-only, though lower strengths are available over the counter. Our doctors can prescribe both.",
  },
  {
    question: "Is the service really discreet?",
    answer:
      "Completely. No phone calls required. Your pharmacy receives only the prescription — not your consultation details. Medications come in standard pharmacy packaging with no indication of contents. Your bank statement shows &apos;InstantMed&apos; only.",
  },
  {
    question: "Can women use these treatments?",
    answer:
      "Minoxidil can be used by women for hair loss (at lower concentrations). Finasteride is NOT suitable for women, especially those who are or may become pregnant. If you&apos;re a woman experiencing hair loss, please indicate this in your consultation.",
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
          <section className="px-4 py-12 sm:py-20 bg-linear-to-b from-teal-500/5 to-transparent">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-600 text-sm mb-6">
                <EyeOff className="h-4 w-4" />
                100% Discreet • No Phone Call
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Hair Loss Treatment Online
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-4">
                Get a prescription for clinically-proven hair loss treatment from an Australian doctor in{" "}
                <strong>15 minutes</strong>. No waiting rooms. No awkward conversations.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                TGA-approved treatments • AHPRA-registered doctors • Discreet service
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link href="/start?service=hair-loss">
                  <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white text-base px-8 w-full sm:w-auto">
                    Start Consultation
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="#treatments">
                  <Button variant="outline" size="lg" className="text-base px-8 w-full sm:w-auto">
                    View Treatments
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Zap className="h-4 w-4 text-teal-600" />
                  <span className="font-medium">Script in 15 min</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <PhoneOff className="h-4 w-4 text-teal-600" />
                  <span className="font-medium">No phone call</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Shield className="h-4 w-4 text-teal-600" />
                  <span className="font-medium">AHPRA doctors</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Lock className="h-4 w-4 text-teal-600" />
                  <span className="font-medium">Encrypted & secure</span>
                </div>
              </div>
            </div>
          </section>

          {/* Treatment Options */}
          <section id="treatments" className="py-16 px-4 bg-slate-50">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">Treatment Options</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Our doctors can prescribe TGA-approved hair loss treatments based on your needs
                </p>
              </div>

              <div className="space-y-6">
                {treatments.map((treatment) => (
                  <div
                    key={treatment.id}
                    className="bg-white rounded-2xl p-6 border shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold">{treatment.name}</h3>
                          {treatment.popular && (
                            <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{treatment.brand}</p>
                      </div>
                      <Pill className="h-6 w-6 text-teal-600" />
                    </div>

                    <p className="text-muted-foreground mb-4">{treatment.description}</p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-muted-foreground text-xs">Type</p>
                        <p className="font-medium">{treatment.type}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-muted-foreground text-xs">Frequency</p>
                        <p className="font-medium">{treatment.frequency}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-muted-foreground text-xs">Results</p>
                        <p className="font-medium">{treatment.results}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-muted-foreground text-xs">Best for</p>
                        <p className="font-medium">{treatment.bestFor}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Not sure which is right for you? Our doctors will recommend the best option.
                </p>
                <Link href="/start?service=hair-loss">
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    Start Consultation
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Platform Features */}
          <section className="py-16 px-4">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">Why Choose InstantMed?</h2>
                <p className="text-muted-foreground">
                  Fast, discreet, and professional healthcare from home
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {platformFeatures.map((feature, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-50">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16 px-4 bg-slate-50">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">How It Works</h2>
                <p className="text-muted-foreground">Three simple steps to get your treatment</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">Complete Questionnaire</h3>
                  <p className="text-sm text-muted-foreground">
                    Answer questions about your hair loss online. Takes about 3 minutes.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">Doctor Reviews</h3>
                  <p className="text-sm text-muted-foreground">
                    An AHPRA-registered doctor reviews your request and prescribes if appropriate.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    3
                  </div>
                  <h3 className="font-semibold mb-2">Collect Your Script</h3>
                  <p className="text-sm text-muted-foreground">
                    E-script sent to your phone. Collect from any pharmacy Australia-wide.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Results Timeline */}
          <section className="py-16 px-4">
            <div className="mx-auto max-w-3xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">What to Expect</h2>
                <p className="text-muted-foreground">Hair regrowth takes time — here&apos;s a typical timeline</p>
              </div>

              <div className="space-y-4">
                {[
                  { month: "Month 1-2", desc: "Treatment begins. Some initial shedding is normal as weaker hairs make way for stronger growth." },
                  { month: "Month 3-4", desc: "Early signs of improvement. Shedding slows, and you may notice fine new hairs appearing." },
                  { month: "Month 6", desc: "Visible improvement for most men. Hair appears thicker and fuller." },
                  { month: "Month 12+", desc: "Full results visible. Continued use maintains and often improves results." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="shrink-0 w-20 text-teal-600 font-semibold">{item.month}</div>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="py-16 px-4 bg-slate-50">
            <div className="mx-auto max-w-3xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">Frequently Asked Questions</h2>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <details key={i} className="group bg-white rounded-xl border">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                      <span className="font-medium pr-4">{faq.question}</span>
                      <ChevronDown className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="px-5 pb-5">
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 px-4 bg-teal-600">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold sm:text-3xl text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-teal-100 mb-8 max-w-xl mx-auto">
                Complete a confidential consultation in minutes. Our doctors are ready to help.
              </p>
              <Link href="/start?service=hair-loss">
                <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50 text-base px-8">
                  Start Consultation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="text-teal-200 text-sm mt-4">
                Takes ~3 minutes • 100% discreet • Script in 15 min
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
