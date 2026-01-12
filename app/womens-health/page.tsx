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
  Heart,
  Lock,
  ChevronDown,
  PhoneOff,
  Users,
  Sparkles,
} from "lucide-react"
import type { Metadata } from "next"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Women&apos;s Health Online Australia | UTI Treatment & Birth Control | InstantMed",
  description:
    "Discreet women&apos;s health consultations with Australian doctors. UTI treatment, contraception renewals, morning-after pill. Script in 15 minutes. Request a female doctor.",
  keywords: [
    "womens health online australia",
    "UTI treatment online",
    "birth control prescription online",
    "contraception online australia",
    "morning after pill online",
    "female doctor telehealth",
    "womens health telehealth",
  ],
  openGraph: {
    title: "Women&apos;s Health Online | UTI & Birth Control | InstantMed",
    description: "Get discreet women&apos;s health prescriptions from Australian doctors in 15 minutes. Request a female doctor.",
    url: "https://instantmed.com.au/womens-health",
  },
  alternates: {
    canonical: "https://instantmed.com.au/womens-health",
  },
}

const services = [
  {
    id: "uti",
    name: "UTI Treatment",
    description: "Burning, frequent urination, or pelvic discomfort? Get assessed and treated quickly without a clinic visit.",
    symptoms: ["Burning sensation when urinating", "Frequent urge to urinate", "Cloudy or strong-smelling urine", "Pelvic pain or pressure"],
    treatment: "Antibiotics (trimethoprim, nitrofurantoin)",
    time: "~15 min",
    popular: true,
  },
  {
    id: "contraception",
    name: "Contraception / Birth Control",
    description: "Continue your regular contraceptive pill or discuss alternatives. Includes combined pill, mini-pill, and others.",
    options: ["Combined oral contraceptive", "Progestogen-only pill (mini pill)", "Other hormonal options"],
    time: "~15 min",
    popular: true,
  },
  {
    id: "morning-after",
    name: "Morning-After Pill",
    description: "Time-sensitive emergency contraception. We prioritise these requests for fast turnaround.",
    info: "Most effective within 72 hours of unprotected sex. Some options effective up to 5 days.",
    time: "URGENT",
    urgent: true,
  },
]

const platformFeatures = [
  {
    icon: Users,
    title: "Request a Female Doctor",
    description: "Prefer to be seen by a female doctor? Simply indicate your preference and we&apos;ll do our best to accommodate.",
  },
  {
    icon: PhoneOff,
    title: "No Phone Call Required",
    description: "Complete your entire consultation online. Share sensitive details in writing, on your own terms.",
  },
  {
    icon: Clock,
    title: "Script in 15 Minutes",
    description: "Our doctors review requests quickly. Most prescriptions are issued within 15 minutes during business hours.",
  },
  {
    icon: Shield,
    title: "100% Confidential",
    description: "Your consultation is private and encrypted. We never share your details with anyone except your pharmacy.",
  },
]

const faqs = [
  {
    question: "Can I get UTI treatment without seeing a doctor in person?",
    answer:
      "Yes, for uncomplicated UTIs (the most common type), our doctors can assess your symptoms and prescribe appropriate antibiotics online. If your symptoms suggest a complicated UTI or other condition, we may recommend an in-person visit or further testing.",
  },
  {
    question: "What birth control options can you prescribe?",
    answer:
      "Our doctors can prescribe oral contraceptives including combined pills (containing oestrogen and progestogen) and progestogen-only pills (mini pills). For other methods like IUDs, implants, or injections, you&apos;ll need to see a doctor in person for insertion/administration.",
  },
  {
    question: "How quickly can I get the morning-after pill?",
    answer:
      "We prioritise emergency contraception requests. Most prescriptions are issued within 15-30 minutes during business hours. The e-script is sent directly to your phone so you can collect from any pharmacy immediately.",
  },
  {
    question: "Can I request a female doctor?",
    answer:
      "Absolutely. When you start your consultation, you can indicate a preference for a female doctor. While we can&apos;t guarantee availability at all times, we&apos;ll do our best to accommodate your request.",
  },
  {
    question: "Is this service really private?",
    answer:
      "Completely. All consultations are encrypted and confidential. Your pharmacy receives only the prescription — not your consultation details. Your bank statement will show &apos;InstantMed&apos; only, with no indication of the service type.",
  },
  {
    question: "What if I&apos;m not sure what I need?",
    answer:
      "That&apos;s okay! Start a consultation and describe your symptoms or concerns. Our doctors can help determine the best course of action, whether that&apos;s treatment, further testing, or a referral to an appropriate specialist.",
  },
]

export default function WomensHealthPage() {
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
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 mb-4 interactive-pill cursor-default">
                    <Heart className="w-3.5 h-3.5 text-pink-600" />
                    <span className="text-xs font-medium text-pink-700">Women&apos;s Health • Request Female Doctor</span>
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Women&apos;s Healthcare That Understands You
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-4">
                    Discreet, judgement-free consultations for UTIs, contraception, and more.
                    Get a prescription from an Australian doctor in <strong>15 minutes</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    TGA-approved treatments • AHPRA-registered doctors • Request a female doctor
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                    <Link href="/start?service=womens-health">
                      <Button size="lg" className="bg-pink-600 hover:bg-pink-700 text-white text-sm px-6 w-full sm:w-auto">
                        Start Consultation
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Link href="#services">
                      <Button variant="outline" size="lg" className="text-sm px-6 w-full sm:w-auto">
                        View Services
                      </Button>
                    </Link>
                  </div>

                  {/* Trust badges */}
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Zap className="h-3.5 w-3.5 text-pink-600" />
                      <span className="font-medium text-muted-foreground">Script in 15 min</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Users className="h-3.5 w-3.5 text-pink-600" />
                      <span className="font-medium text-muted-foreground">Female doctors available</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Shield className="h-3.5 w-3.5 text-pink-600" />
                      <span className="font-medium text-muted-foreground">100% confidential</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Lock className="h-3.5 w-3.5 text-pink-600" />
                      <span className="font-medium text-muted-foreground">Encrypted & secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Services */}
          <section id="services" className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">How Can We Help?</h2>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    Select a service below or start a general consultation to discuss your needs
                  </p>
                </div>

                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="bg-content1/50 backdrop-blur-sm rounded-xl p-4 border border-divider/50 hover:border-pink-500/30 transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center shrink-0">
                          {service.urgent ? (
                            <Sparkles className="h-5 w-5 text-pink-600" />
                          ) : (
                            <Heart className="h-5 w-5 text-pink-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold mb-1">{service.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {service.popular && (
                              <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100 text-xs">Popular</Badge>
                            )}
                            {service.urgent && (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">Priority</Badge>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {service.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>

                      {service.symptoms && (
                        <div className="mb-3">
                          <p className="text-xs font-medium mb-1.5">Common symptoms:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {service.symptoms.map((symptom, i) => (
                              <span key={i} className="text-xs bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full text-pink-700">
                                {symptom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {service.options && (
                        <div className="mb-3">
                          <p className="text-xs font-medium mb-1.5">Options include:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {service.options.map((option, i) => (
                              <span key={i} className="text-xs bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full text-pink-700">
                                {option}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {service.info && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-3">
                          ⏰ {service.info}
                        </p>
                      )}

                      <Link href={`/start?service=womens-health&condition=${service.id}`}>
                        <Button className="bg-pink-600 hover:bg-pink-700 w-full sm:w-auto text-xs h-9">
                          Start Consultation
                          <ArrowRight className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      </Link>
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
                    Healthcare designed with women in mind
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {platformFeatures.map((feature, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-pink-600" />
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
                  <p className="text-sm text-muted-foreground">Three simple steps to get the care you need</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-pink-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      1
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Complete Questionnaire</h3>
                    <p className="text-xs text-muted-foreground">
                      Answer health questions privately online. Request a female doctor if preferred.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-pink-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                      2
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Doctor Reviews</h3>
                    <p className="text-xs text-muted-foreground">
                      An AHPRA-registered doctor reviews your request and prescribes if appropriate.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-pink-600 text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
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

          {/* Reassurance */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl mx-auto text-center">
                <div className="glass-card rounded-3xl p-6 lg:p-8">
                  <h2 className="text-2xl font-bold mb-3">We Get It</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Some things are easier to discuss without eye contact. Our online process lets you share what&apos;s happening
                    in your own words, at your own pace. A real doctor reads everything and responds thoughtfully — no judgement, just care.
                  </p>
                  <Link href="/start?service=womens-health">
                    <Button className="bg-pink-600 hover:bg-pink-700 text-sm h-10 px-6">
                      Start Your Consultation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
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
                <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden border-pink-500/20 bg-pink-50/30 dark:bg-pink-950/10">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                    Ready to Get Started?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                    Complete a confidential consultation in minutes. Request a female doctor if you prefer.
                  </p>
                  <Link href="/start?service=womens-health">
                    <Button size="lg" className="bg-pink-600 hover:bg-pink-700 text-white text-sm px-8 h-12">
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
