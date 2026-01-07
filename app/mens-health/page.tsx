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

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Men&apos;s Health Online Australia | ED Treatment | Sildenafil & Tadalafil | InstantMed",
  description:
    "Discreet men&apos;s health consultations with Australian doctors. Get prescriptions for erectile dysfunction treatments including sildenafil and tadalafil. Script in 15 minutes, no awkward conversations.",
  keywords: [
    "mens health online australia",
    "erectile dysfunction treatment australia",
    "sildenafil prescription online",
    "tadalafil prescription australia",
    "viagra alternative australia",
    "cialis alternative australia",
    "ED treatment telehealth",
    "discreet mens health",
  ],
  openGraph: {
    title: "Men&apos;s Health Online | Discreet ED Treatment | InstantMed",
    description: "Get discreet men&apos;s health prescriptions from Australian doctors in 15 minutes. No phone calls required for most requests.",
    url: "https://instantmed.com.au/mens-health",
  },
  alternates: {
    canonical: "https://instantmed.com.au/mens-health",
  },
}

const treatments = [
  {
    id: "sildenafil",
    name: "Sildenafil",
    description: "The active ingredient in Viagra®. Works in 30-60 minutes, lasts 4-6 hours.",
    duration: "4-6 hours",
    onset: "30-60 min",
    bestFor: "Planned intimacy",
    popular: true,
  },
  {
    id: "tadalafil",
    name: "Tadalafil",
    description: "The active ingredient in Cialis®. Works in 30-60 minutes, lasts up to 36 hours.",
    duration: "Up to 36 hours",
    onset: "30-60 min",
    bestFor: "Flexibility & spontaneity",
    popular: false,
  },
]

const platformFeatures = [
  {
    icon: PhoneOff,
    title: "No Phone Call Required",
    description: "Complete your entire consultation online. No awkward conversations, no video calls.",
  },
  {
    icon: Clock,
    title: "Script in 15 Minutes",
    description: "Our doctors review requests quickly. Most prescriptions are issued within 15 minutes during business hours.",
  },
  {
    icon: EyeOff,
    title: "100% Discreet",
    description: "Your consultation is private and encrypted. Pharmacy receives only the prescription.",
  },
  {
    icon: Shield,
    title: "AHPRA-Registered Doctors",
    description: "All consultations reviewed by fully qualified Australian doctors.",
  },
]

const faqs = [
  {
    question: "What&apos;s the difference between Sildenafil and Tadalafil?",
    answer:
      "Sildenafil (Viagra®) works quickly (30-60 min) and lasts 4-6 hours — ideal for planned intimacy. Tadalafil (Cialis®) also works in 30-60 minutes but lasts up to 36 hours, offering more flexibility and spontaneity. Both are equally effective; the choice depends on your lifestyle and preferences.",
  },
  {
    question: "Do I need a prescription in Australia?",
    answer:
      "Yes, both sildenafil and tadalafil are prescription-only medications in Australia. Our AHPRA-registered doctors can prescribe these medications after reviewing your health information through our secure online consultation.",
  },
  {
    question: "Is this service actually private?",
    answer:
      "Absolutely. All consultations are encrypted and confidential. Your pharmacy receives only the prescription — not your consultation details. Medications are dispensed with standard labelling. Your bank statement will show &apos;InstantMed&apos; only.",
  },
  {
    question: "How quickly can I get my prescription?",
    answer:
      "Most prescriptions are issued within 15 minutes during business hours. Your e-script is sent directly to your phone via SMS, ready to collect at any pharmacy Australia-wide.",
  },
  {
    question: "What if the medication doesn&apos;t work for me?",
    answer:
      "Response varies between individuals. If the initial treatment isn&apos;t effective, our doctors can adjust dosage or recommend an alternative. Some men find one medication works better than the other.",
  },
  {
    question: "Are there any side effects?",
    answer:
      "Common side effects include headache, flushing, and nasal congestion. These are usually mild and temporary. Our doctors will review your health history to ensure the medication is safe for you, particularly regarding heart conditions and nitrate medications.",
  },
]

export default function MensHealthPage() {
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
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4 interactive-pill cursor-default">
                    <EyeOff className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">100% Discreet • No Phone Call</span>
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Men&apos;s Health Treatment Online
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-4">
                    Get a prescription for ED treatment from an Australian doctor in{" "}
                    <strong>15 minutes</strong>. No waiting rooms. No awkward conversations.
                    Treatment sent straight to your pharmacy.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    TGA-approved treatments • AHPRA-registered doctors • Discreet service
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                    <Link href="/start?service=mens-health">
                      <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-6 w-full sm:w-auto">
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
                      <Zap className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-medium text-muted-foreground">Script in 15 min</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <PhoneOff className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-medium text-muted-foreground">No phone call</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Shield className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-medium text-muted-foreground">AHPRA doctors</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Lock className="h-3.5 w-3.5 text-blue-600" />
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
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Available Treatments</h2>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    Our doctors can prescribe TGA-approved ED medications based on your health profile
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="bg-content1/50 backdrop-blur-sm rounded-xl p-4 border border-divider/50 hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold">{treatment.name}</h3>
                          {treatment.popular && (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 mt-1 text-xs">
                              Most Popular
                            </Badge>
                          )}
                        </div>
                        <Pill className="h-5 w-5 text-blue-600 shrink-0" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{treatment.description}</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{treatment.duration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Takes effect:</span>
                          <span className="font-medium">{treatment.onset}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Best for:</span>
                          <span className="font-medium text-blue-600">{treatment.bestFor}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground mb-4">
                    Not sure which is right for you? Our doctors will help you choose.
                  </p>
                  <Link href="/start?service=mens-health">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-xs h-9">
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
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-blue-600" />
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
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      1
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Complete Questionnaire</h3>
                    <p className="text-xs text-muted-foreground">
                      Answer confidential health questions online. Takes about 3 minutes.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      2
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Doctor Reviews</h3>
                    <p className="text-xs text-muted-foreground">
                      An AHPRA-registered doctor reviews your request and prescribes if appropriate.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      3
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Collect Your Script</h3>
                    <p className="text-xs text-muted-foreground">
                      E-script sent to your phone. Collect from any pharmacy Australia-wide.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Important Safety Info */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <div className="glass-card rounded-3xl p-4 lg:p-6 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">Important Safety Information</h3>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
                        ED medications are not suitable for everyone. Our doctors will assess your eligibility based on your health history.
                      </p>
                      <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                        <li>• Not suitable if taking nitrates (e.g., GTN spray)</li>
                        <li>• May not be appropriate for certain heart conditions</li>
                        <li>• Interactions with some medications possible</li>
                        <li>• Requires honest disclosure of health information</li>
                      </ul>
                    </div>
                  </div>
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
                <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/10">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                    Ready to Get Started?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                    Complete a confidential consultation in minutes. Our doctors are ready to help.
                  </p>
                  <Link href="/start?service=mens-health">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-8 h-12">
                      Start Consultation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-4">
                    Takes ~3 minutes • 100% confidential • Script in 15 min
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
