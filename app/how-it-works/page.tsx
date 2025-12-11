import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import {
  ClipboardList,
  UserCheck,
  FileCheck,
  Clock,
  Shield,
  CreditCard,
  Send,
  ArrowRight,
  Sparkles,
  Zap,
  Heart,
} from "lucide-react"

export const metadata = {
  title: "How It Works | InstantMed",
  description:
    "Get a medical certificate, prescription, or referral reviewed by an Australian doctor. Submit online, receive a response usually within hours.",
}

const steps = [
  {
    number: "01",
    title: "Tell us what you need",
    subtitle: "Takes about 2 minutes",
    description:
      "Pick your service and answer a few quick questions. We collect the information a doctor needs to properly assess your request.",
    icon: ClipboardList,
    color: "from-blue-500 to-cyan-500",
    emoji: "📝",
  },
  {
    number: "02",
    title: "A real doctor reviews it",
    subtitle: "Usually within 2-4 hours",
    description:
      "An Australian GP reviews your request and medical history. If they need more information, they'll reach out to you directly.",
    icon: UserCheck,
    color: "from-purple-500 to-pink-500",
    emoji: "👨‍⚕️",
  },
  {
    number: "03",
    title: "Get your document",
    subtitle: "Delivered digitally",
    description:
      "If approved: Med cert emailed as PDF. Script sent as e-prescription to any pharmacy. Referral sent to your specialist. If not approved, you get a full refund.",
    icon: FileCheck,
    color: "from-emerald-500 to-teal-500",
    emoji: "✅",
  },
]

const features = [
  {
    icon: Clock,
    title: "24hr guarantee",
    description: "Response within 24 hours or your money back. No exceptions.",
    emoji: "⏱️",
  },
  {
    icon: Shield,
    title: "AHPRA registered",
    description: "All our doctors are registered with AHPRA. We checked.",
    emoji: "🛡️",
  },
  {
    icon: CreditCard,
    title: "No subscriptions",
    description: "Pay per consult. No monthly fees, no hidden charges.",
    emoji: "💳",
  },
  {
    icon: Send,
    title: "Digital delivery",
    description: "Everything sent via email or SMS. Welcome to 2024.",
    emoji: "📲",
  },
]

const useCases = [
  {
    title: "Woke up sick, need a cert for work",
    description:
      "Submit your request and a doctor reviews it. Most certificates are ready within hours during business hours.",
    time: "2-4 hours",
    emoji: "🤒",
  },
  {
    title: "Running low on my regular meds",
    description:
      "Already on a stable medication? A doctor reviews your history and can send a repeat script to your pharmacy if appropriate.",
    time: "Same day",
    emoji: "💊",
  },
  {
    title: "GP said I need a specialist",
    description:
      "Request a referral online. A doctor reviews your situation and prepares a referral letter valid for Medicare.",
    time: "24 hours",
    emoji: "🏥",
  },
]

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute top-20 right-1/4 w-72 h-72 bg-[#00E2B5]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-[#00E2B5]/5 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-[#00E2B5]/10 text-[#00E2B5] border-0 px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                How It Works
              </Badge>
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-balance"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Healthcare that fits <span className="text-gradient-mint">your life</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
                Submit your request online. A real Australian doctor reviews it and determines the best way to help you.
                Convenient, but still thorough.
              </p>

              {/* Quick stats */}
              <div className="mt-10 flex flex-wrap justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00E2B5]" />
                  <span className="text-muted-foreground">
                    Average response: <strong className="text-foreground">2.4 hours</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#00E2B5]" />
                  <span className="text-muted-foreground">
                    Patient satisfaction: <strong className="text-foreground">98%</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-20 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2
                  className="text-2xl md:text-3xl font-bold text-foreground mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Three steps. That&apos;s it.
                </h2>
                <p className="text-muted-foreground">No hidden steps, no surprises, no catch.</p>
              </div>

              <div className="relative">
                {/* Connection line */}
                <div className="absolute left-10 md:left-[39px] top-24 bottom-24 w-0.5 bg-gradient-to-b from-[#00E2B5]/50 via-[#00E2B5]/20 to-[#00E2B5]/50 hidden md:block" />

                <div className="space-y-8 md:space-y-12">
                  {steps.map((step, index) => (
                    <div
                      key={step.number}
                      className="relative flex flex-col md:flex-row gap-6 items-start animate-fade-in-up opacity-0"
                      style={{ animationDelay: `${0.2 + index * 0.15}s`, animationFillMode: "forwards" }}
                    >
                      {/* Icon */}
                      <div
                        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0 relative`}
                      >
                        <step.icon className="w-8 h-8 text-white" />
                        <span className="absolute -top-2 -right-2 text-2xl">{step.emoji}</span>
                      </div>

                      {/* Content */}
                      <TiltCard className="flex-1 w-full">
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-mono text-[#00E2B5] bg-[#00E2B5]/10 px-2 py-1 rounded">
                              STEP {step.number}
                            </span>
                            <span className="text-xs text-muted-foreground">{step.subtitle}</span>
                          </div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                          <p className="text-muted-foreground">{step.description}</p>
                        </div>
                      </TiltCard>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2
                className="text-2xl md:text-3xl font-bold text-foreground mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Why 10,000+ Aussies trust us
              </h2>
              <p className="text-muted-foreground">Real reasons, not marketing fluff.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <TiltCard
                  key={feature.title}
                  className="animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.5 + index * 0.1}s`, animationFillMode: "forwards" }}
                >
                  <div className="p-6 text-center">
                    <div className="text-3xl mb-3">{feature.emoji}</div>
                    <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 bg-gradient-subtle">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2
                  className="text-2xl md:text-3xl font-bold text-foreground mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Sound familiar?
                </h2>
                <p className="text-muted-foreground">Here&apos;s how real people use InstantMed</p>
              </div>

              <div className="space-y-4">
                {useCases.map((useCase, index) => (
                  <TiltCard
                    key={index}
                    className="animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${0.8 + index * 0.1}s`, animationFillMode: "forwards" }}
                  >
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="text-4xl">{useCase.emoji}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{useCase.title}</h3>
                        <p className="text-sm text-muted-foreground">{useCase.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm bg-[#00E2B5]/10 rounded-full px-4 py-2">
                        <Clock className="w-4 h-4 text-[#00E2B5]" />
                        <span className="text-[#00E2B5] font-medium">{useCase.time}</span>
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <TiltCard className="p-10 md:p-12">
                <div className="text-5xl mb-4">🚀</div>
                <h2
                  className="text-2xl md:text-3xl font-bold text-foreground mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Ready to skip the waiting room?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Choose what you need and we&apos;ll take care of the rest. Most requests are done within a few hours.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="lg" className="rounded-full btn-premium text-[#0A0F1C] font-semibold px-8">
                    <Link href="/medical-certificate">
                      Get Med Cert
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-full bg-transparent">
                    <Link href="/prescriptions">Get Script</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-full bg-transparent">
                    <Link href="/referrals">Get Referral</Link>
                  </Button>
                </div>
              </TiltCard>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
