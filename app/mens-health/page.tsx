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
          <section className="px-4 py-12 sm:py-20 bg-linear-to-b from-blue-500/5 to-transparent">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
                <EyeOff className="h-4 w-4" />
                100% Discreet • No Phone Call
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Men&apos;s Health Treatment Online
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-4">
                Get a prescription for ED treatment from an Australian doctor in{" "}
                <strong>15 minutes</strong>. No waiting rooms. No awkward conversations.
                Treatment sent straight to your pharmacy.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                TGA-approved treatments • AHPRA-registered doctors • Discreet service
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link href="/start?service=mens-health">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white text-base px-8 w-full sm:w-auto">
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
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-medium">Script in 15 min</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <PhoneOff className="h-4 w-4 text-primary" />
                  <span className="font-medium">No phone call</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">AHPRA doctors</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="font-medium">Encrypted & secure</span>
                </div>
              </div>
            </div>
          </section>

          {/* Treatment Options */}
          <section id="treatments" className="py-16 px-4 bg-slate-50">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">Available Treatments</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Our doctors can prescribe TGA-approved ED medications based on your health profile
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {treatments.map((treatment) => (
                  <div
                    key={treatment.id}
                    className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{treatment.name}</h3>
                        {treatment.popular && (
                          <Badge className="bg-blue-100 text-primary hover:bg-blue-100 mt-1">
                            Most Popular
                          </Badge>
                        )}
                      </div>
                      <Pill className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">{treatment.description}</p>
                    <div className="space-y-2 text-sm">
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
                        <span className="font-medium text-primary">{treatment.bestFor}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Not sure which is right for you? Our doctors will help you choose.
                </p>
                <Link href="/start?service=mens-health">
                  <Button className="bg-primary hover:bg-primary/90">
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
                    <div className="shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary" />
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
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">Complete Questionnaire</h3>
                  <p className="text-sm text-muted-foreground">
                    Answer confidential health questions online. Takes about 3 minutes.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">Doctor Reviews</h3>
                  <p className="text-sm text-muted-foreground">
                    An AHPRA-registered doctor reviews your request and prescribes if appropriate.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
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

          {/* Important Safety Info */}
          <section className="py-16 px-4">
            <div className="mx-auto max-w-3xl">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex gap-4">
                  <Shield className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">Important Safety Information</h3>
                    <p className="text-sm text-amber-800 mb-3">
                      ED medications are not suitable for everyone. Our doctors will assess your eligibility based on your health history.
                    </p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Not suitable if taking nitrates (e.g., GTN spray)</li>
                      <li>• May not be appropriate for certain heart conditions</li>
                      <li>• Interactions with some medications possible</li>
                      <li>• Requires honest disclosure of health information</li>
                    </ul>
                  </div>
                </div>
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
          <section className="py-16 px-4 bg-primary">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold sm:text-3xl text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-blue-100 mb-8 max-w-xl mx-auto">
                Complete a confidential consultation in minutes. Our doctors are ready to help.
              </p>
              <Link href="/start?service=mens-health">
                <Button size="lg" className="bg-white text-primary hover:bg-blue-50 text-base px-8">
                  Start Consultation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="text-blue-200 text-sm mt-4">
                Takes ~3 minutes • 100% confidential • Script in 15 min
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
