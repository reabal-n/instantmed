import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Clock,
  Shield,
  Zap,
  EyeOff,
  Lock,
  ChevronDown,
  PhoneOff,
  Heart,
  Mic,
  Users,
  Presentation,
  CheckCircle2,
} from "lucide-react"
import type { Metadata } from "next"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Performance Anxiety Treatment Online | Propranolol Australia | InstantMed",
  description:
    "Get propranolol for performance anxiety, stage fright, and situational anxiety from Australian doctors. Script in 15 minutes, no phone call required. Discreet online consultation.",
  keywords: [
    "propranolol prescription australia",
    "performance anxiety treatment",
    "stage fright medication",
    "situational anxiety treatment",
    "public speaking anxiety",
    "beta blocker anxiety australia",
    "propranolol online",
    "interview anxiety medication",
  ],
  openGraph: {
    title: "Performance Anxiety Treatment | Propranolol | InstantMed",
    description: "Get propranolol for stage fright and performance anxiety from Australian doctors in 15 minutes.",
    url: "https://instantmed.com.au/performance-anxiety",
  },
  alternates: {
    canonical: "https://instantmed.com.au/performance-anxiety",
  },
}

const useCases = [
  {
    icon: Presentation,
    title: "Public Speaking",
    description: "Presentations, speeches, lectures, or addressing large groups",
  },
  {
    icon: Users,
    title: "Job Interviews",
    description: "High-stakes interviews where nerves can hold you back",
  },
  {
    icon: Mic,
    title: "Performances",
    description: "Musicians, actors, or any live performance situation",
  },
  {
    icon: Heart,
    title: "Social Situations",
    description: "Important meetings, networking events, or social anxiety triggers",
  },
]

const platformFeatures = [
  {
    icon: PhoneOff,
    title: "No Phone Call Required",
    description: "Complete your entire consultation online. No awkward conversations about anxiety.",
  },
  {
    icon: Clock,
    title: "Script in 15 Minutes",
    description: "Our doctors review requests quickly. Most prescriptions are issued within 15 minutes during business hours.",
  },
  {
    icon: EyeOff,
    title: "100% Discreet",
    description: "Your consultation is private and encrypted. No one needs to know.",
  },
  {
    icon: Shield,
    title: "AHPRA-Registered Doctors",
    description: "All consultations reviewed by fully qualified Australian doctors.",
  },
]

const faqs = [
  {
    question: "What is propranolol and how does it help with performance anxiety?",
    answer:
      "Propranolol is a beta-blocker that reduces the physical symptoms of anxiety — racing heart, trembling hands, sweating, and shaky voice. It doesn&apos;t sedate you or affect your mental clarity; it simply blocks the adrenaline response that causes these symptoms. Many professionals, musicians, and public speakers use it for specific high-pressure situations.",
  },
  {
    question: "When should I take propranolol?",
    answer:
      "Propranolol is typically taken 30-60 minutes before a stressful event. The effects last 3-4 hours. It's used 'as needed' for specific situations rather than taken daily. Your doctor will advise on the appropriate dose for your circumstances.",
  },
  {
    question: "Is propranolol safe?",
    answer:
      "Propranolol has been used safely for decades. However, it&apos;s not suitable for everyone — particularly those with asthma, very low blood pressure, or certain heart conditions. Our doctors will review your health history to ensure it&apos;s appropriate for you.",
  },
  {
    question: "Will propranolol make me feel drowsy or 'drugged'?",
    answer:
      "No. Unlike anti-anxiety medications like benzodiazepines, propranolol doesn&apos;t sedate you or affect your cognitive function. You'll feel calm and clear-headed, just without the physical symptoms of anxiety. Many people say they feel like their 'normal self' — just without the nerves.",
  },
  {
    question: "Can I use propranolol for everyday anxiety?",
    answer:
      "Propranolol is most effective for situational/performance anxiety with specific triggers. For generalised anxiety disorder (GAD) or daily anxiety, other treatments may be more appropriate. If you experience frequent anxiety, please mention this in your consultation.",
  },
  {
    question: "How quickly can I get my prescription?",
    answer:
      "Most prescriptions are issued within 15 minutes during business hours. Your e-script is sent directly to your phone via SMS, ready to collect at any pharmacy Australia-wide.",
  },
]

export default function PerformanceAnxietyPage() {
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
          <section className="px-4 py-12 sm:py-20 bg-linear-to-b from-indigo-500/5 to-transparent">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 text-sm mb-6">
                <Heart className="h-4 w-4" />
                Performance Anxiety • Stage Fright
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Calm Your Nerves, Keep Your Edge
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-4">
                Get propranolol for performance anxiety from an Australian doctor in{" "}
                <strong>15 minutes</strong>. Stop the racing heart, shaky hands, and trembling voice — without feeling sedated.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Used by professionals worldwide • AHPRA-registered doctors • Discreet service
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link href="/start?service=performance-anxiety">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white text-base px-8 w-full sm:w-auto">
                    Start Consultation
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button variant="outline" size="lg" className="text-base px-8 w-full sm:w-auto">
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Zap className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium">Script in 15 min</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <PhoneOff className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium">No phone call</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium">AHPRA doctors</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Lock className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium">Encrypted & secure</span>
                </div>
              </div>
            </div>
          </section>

          {/* What is it */}
          <section className="py-16 px-4 bg-slate-50">
            <div className="mx-auto max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl font-bold sm:text-3xl mb-4">What is Propranolol?</h2>
                  <p className="text-muted-foreground mb-4">
                    Propranolol is a beta-blocker that has been used safely for decades. It works by blocking the effects of adrenaline — the hormone responsible for your fight or flight response.
                  </p>
                  <p className="text-muted-foreground mb-4">
                    When you feel anxious, adrenaline causes physical symptoms: racing heart, sweating, trembling hands, and a shaky voice. Propranolol blocks these effects without sedating you or clouding your thinking.
                  </p>
                  <p className="text-muted-foreground">
                    The result? You feel calm and in control, with full mental clarity. Many professionals — from musicians to executives — use it for high-stakes situations.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 border">
                  <h3 className="font-semibold mb-4">Propranolol blocks:</h3>
                  <ul className="space-y-3">
                    {[
                      "Racing heart / palpitations",
                      "Trembling hands",
                      "Shaky voice",
                      "Sweating",
                      "Blushing",
                      "Butterflies in stomach",
                    ].map((symptom, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 p-3 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-indigo-700">
                      <strong>Note:</strong> Propranolol does not cause drowsiness or affect your mental sharpness. You will think and speak clearly — just without the physical anxiety symptoms.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-16 px-4">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">Common Use Cases</h2>
                <p className="text-muted-foreground">
                  Propranolol can help in many high-pressure situations
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {useCases.map((useCase, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-50">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <useCase.icon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{useCase.title}</h3>
                      <p className="text-sm text-muted-foreground">{useCase.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="py-16 px-4 bg-slate-50">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">How It Works</h2>
                <p className="text-muted-foreground">Three simple steps to get your treatment</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">Complete Questionnaire</h3>
                  <p className="text-sm text-muted-foreground">
                    Answer confidential health questions online. Takes about 3 minutes.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">Doctor Reviews</h3>
                  <p className="text-sm text-muted-foreground">
                    An AHPRA-registered doctor reviews your request and prescribes if appropriate.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
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

          {/* Usage Guide */}
          <section className="py-16 px-4">
            <div className="mx-auto max-w-3xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">How to Use Propranolol</h2>
                <p className="text-muted-foreground">Simple guidelines for best results</p>
              </div>

              <div className="space-y-4">
                {[
                  { time: "30-60 min before", desc: "Take propranolol 30-60 minutes before your event for optimal effect." },
                  { time: "Duration", desc: "Effects typically last 3-4 hours — plenty of time for most situations." },
                  { time: "As needed", desc: "Use only when you have a specific anxiety-provoking event. Not for daily use." },
                  { time: "First time?", desc: "Try a test dose at home first to see how it affects you before an important event." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="shrink-0 w-28 text-indigo-600 font-semibold text-sm">{item.time}</div>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Platform Features */}
          <section className="py-16 px-4 bg-slate-50">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold sm:text-3xl mb-3">Why Choose InstantMed?</h2>
                <p className="text-muted-foreground">
                  Fast, discreet, and professional healthcare from home
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {platformFeatures.map((feature, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-white border">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-indigo-600" />
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

          {/* Safety Info */}
          <section className="py-16 px-4">
            <div className="mx-auto max-w-3xl">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex gap-4">
                  <Shield className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">Important Safety Information</h3>
                    <p className="text-sm text-amber-800 mb-3">
                      Propranolol is safe for most people but may not be suitable if you have:
                    </p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Asthma or severe respiratory conditions</li>
                      <li>• Very low blood pressure or slow heart rate</li>
                      <li>• Certain heart conditions</li>
                      <li>• Diabetes (may mask symptoms of low blood sugar)</li>
                    </ul>
                    <p className="text-sm text-amber-800 mt-3">
                      Our doctors will review your health history to ensure propranolol is appropriate for you.
                    </p>
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
          <section className="py-16 px-4 bg-indigo-600">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold sm:text-3xl text-white mb-4">
                Ready to Take Control?
              </h2>
              <p className="text-indigo-100 mb-8 max-w-xl mx-auto">
                Complete a confidential consultation in minutes. Be prepared for your next big moment.
              </p>
              <Link href="/start?service=performance-anxiety">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 text-base px-8">
                  Start Consultation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="text-indigo-200 text-sm mt-4">
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
