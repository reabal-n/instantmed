import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
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

export const metadata: Metadata = {
  title: "Performance Anxiety Consultation Online Australia | InstantMed",
  description:
    "Get doctor-led consultation for performance anxiety, stage fright, and situational anxiety from Australian doctors. Consultation completed in 15 minutes. 100% online. Discreet service.",
  keywords: [
    "performance anxiety consultation",
    "stage fright consultation",
    "situational anxiety treatment",
    "public speaking anxiety",
    "performance anxiety doctor",
    "anxiety consultation online",
    "interview anxiety consultation",
  ],
  openGraph: {
    title: "Performance Anxiety Consultation Online | InstantMed",
    description: "Get doctor-led consultation for stage fright and performance anxiety from Australian doctors in 15 minutes.",
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
    title: "Complete Online",
    description: "Answer questions from your phone. Most consultations don't require a call.",
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
    question: "How does treatment help with performance anxiety?",
    answer:
      "Our doctors can recommend treatment options that reduce the physical symptoms of anxiety — racing heart, trembling hands, sweating, and shaky voice. These treatments don&apos;t sedate you or affect your mental clarity; they address the adrenaline response that causes these symptoms. Many professionals, musicians, and public speakers use these approaches for specific high-pressure situations.",
  },
  {
    question: "When should I take treatment?",
    answer:
      "Treatment is typically taken 30-60 minutes before a stressful event. The effects last 3-4 hours. It's used 'as needed' for specific situations rather than taken daily. Your doctor will advise on the appropriate approach for your circumstances.",
  },
  {
    question: "Is treatment safe?",
    answer:
      "These treatment approaches have been used safely for decades. However, they&apos;re not suitable for everyone — particularly those with asthma, very low blood pressure, or certain heart conditions. Our doctors will review your health history to ensure treatment is appropriate for you.",
  },
  {
    question: "Will treatment make me feel drowsy or 'drugged'?",
    answer:
      "No. Unlike some anti-anxiety treatments, these options don&apos;t sedate you or affect your cognitive function. You'll feel calm and clear-headed, just without the physical symptoms of anxiety. Many people say they feel like their 'normal self' — just without the nerves.",
  },
  {
    question: "Can I use this for everyday anxiety?",
    answer:
      "These treatments are most effective for situational/performance anxiety with specific triggers. For generalised anxiety disorder (GAD) or daily anxiety, other treatment approaches may be more appropriate. If you experience frequent anxiety, please mention this in your consultation.",
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
          <section className="px-4 py-12 sm:px-6 lg:py-16 overflow-hidden">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4 interactive-pill cursor-default">
                    <Heart className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700">Performance Anxiety • Stage Fright</span>
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Calm Your Nerves, Keep Your Edge
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-4">
                    Get doctor-led consultation for performance anxiety from an Australian doctor in{" "}
                    <strong>15 minutes</strong>. Address racing heart, shaky hands, and trembling voice — without feeling sedated.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Used by professionals worldwide • AHPRA-registered doctors • Discreet service
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                    <Link href="/start?service=performance-anxiety">
                      <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-background text-sm px-6 w-full sm:w-auto">
                        Start Consultation
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href="#how-it-works">
                      <Button variant="outline" size="lg" className="text-sm px-6 w-full sm:w-auto">
                        Learn More
                      </Button>
                    </Link>
                  </div>

                  {/* Trust badges */}
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Zap className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-medium text-muted-foreground">Script in 15 min</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <PhoneOff className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-medium text-muted-foreground">From your phone</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Shield className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-medium text-muted-foreground">AHPRA doctors</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Lock className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="font-medium text-muted-foreground">Encrypted & secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What is it */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-3">How We Help</h2>
                    <p className="text-sm text-muted-foreground mb-3">
                      Our doctors can recommend treatment options that have been used safely for decades. These work by addressing the physical effects of adrenaline — the hormone responsible for your fight or flight response.
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      When you feel anxious, adrenaline causes physical symptoms: racing heart, sweating, trembling hands, and a shaky voice. Treatment options can address these effects without sedating you or clouding your thinking.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The result? You feel calm and in control, with full mental clarity. Many professionals — from musicians to executives — use these approaches for high-stakes situations.
                    </p>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-3">Treatment can help with:</h3>
                    <ul className="space-y-2">
                      {[
                        "Racing heart / palpitations",
                        "Trembling hands",
                        "Shaky voice",
                        "Sweating",
                        "Blushing",
                        "Butterflies in stomach",
                      ].map((symptom, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                          <span>{symptom}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                      <p className="text-xs text-indigo-700">
                        <strong>Note:</strong> These treatments do not cause drowsiness or affect your mental sharpness. You will think and speak clearly — just without the physical anxiety symptoms.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Common Use Cases</h2>
                  <p className="text-sm text-muted-foreground">
                    Our treatment approaches can help in many high-pressure situations
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {useCases.map((useCase, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <useCase.icon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold mb-1">{useCase.title}</h3>
                        <p className="text-xs text-muted-foreground">{useCase.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">How It Works</h2>
                  <p className="text-sm text-muted-foreground">Three simple steps to get your treatment</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-background flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      1
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Complete Questionnaire</h3>
                    <p className="text-xs text-muted-foreground">
                      Answer confidential health questions online. Takes about 3 minutes.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-background flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      2
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Doctor Reviews</h3>
                    <p className="text-xs text-muted-foreground">
                      An AHPRA-registered doctor reviews your request and prescribes if appropriate.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-background flex items-center justify-center mx-auto mb-3 text-lg font-bold">
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

          {/* Usage Guide */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">How Treatment Works</h2>
                  <p className="text-sm text-muted-foreground">Simple guidelines for best results</p>
                </div>

                <div className="space-y-3 max-w-3xl mx-auto">
                  {[
                    { time: "30-60 min before", desc: "Take treatment 30-60 minutes before your event for optimal effect." },
                    { time: "Duration", desc: "Effects typically last 3-4 hours — plenty of time for most situations." },
                    { time: "As needed", desc: "Use only when you have a specific anxiety-provoking event. Not for daily use." },
                    { time: "First time?", desc: "Try a test dose at home first to see how it affects you before an important event." },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                      <div className="shrink-0 w-24 text-indigo-600 font-semibold text-xs">{item.time}</div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
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
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-indigo-600" />
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

          {/* Safety Info */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto">
                <div className="glass-card rounded-3xl p-4 lg:p-6 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-dawn-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">Important Safety Information</h3>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
                        These treatments are safe for most people but may not be suitable if you have:
                      </p>
                      <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                        <li>• Asthma or severe respiratory conditions</li>
                        <li>• Very low blood pressure or slow heart rate</li>
                        <li>• Certain heart conditions</li>
                        <li>• Diabetes (may mask symptoms of low blood sugar)</li>
                      </ul>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-2">
                        Our doctors will review your health history to ensure treatment is appropriate for you.
                      </p>
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
                <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                    Ready to Take Control?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                    Complete a confidential consultation in minutes. Be prepared for your next big moment.
                  </p>
                  <Link href="/start?service=performance-anxiety">
                    <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-background text-sm px-8 h-12">
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

        <MarketingFooter />
      </div>
    </>
  )
}
