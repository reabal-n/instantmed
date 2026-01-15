import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { ParallaxSection } from "@/components/ui/parallax-section"
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
    "Get a medical certificate or prescription reviewed by an Australian doctor. Submit online, receive a response usually within hours.",
}

const steps = [
  {
    number: "01",
    title: "Tell us what you need",
    subtitle: "Takes about 2 minutes",
    description:
      "Pick your service and answer a few quick questions. We collect the information a doctor needs to properly assess your request.",
    icon: ClipboardList,
    color: "from-blue-500 to-blue-600",
    emoji: "📝",
  },
  {
    number: "02",
    title: "A real doctor reviews it",
    subtitle: "Usually within 2-4 hours",
    description:
      "An Australian GP reviews your request and medical history. If they need more information, they'll reach out to you directly.",
    icon: UserCheck,
    color: "from-blue-600 to-indigo-600",
    emoji: "👨‍⚕️",
  },
  {
    number: "03",
    title: "Get your document",
    subtitle: "Delivered digitally",
    description:
      "If approved: Med cert emailed as PDF. Script sent as e-prescription to any pharmacy. If not approved, you get a full refund.",
    icon: FileCheck,
    color: "from-indigo-600 to-blue-600",
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
]

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 bg-background">
        {/* Hero */}
        <ParallaxSection speed={0.2}>
          <section className="relative pt-20 pb-12 lg:pt-24 lg:pb-16 overflow-hidden">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-4 interactive-pill cursor-default">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground/80">How It Works</span>
              </div>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight text-balance mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Healthcare that fits <span className="text-gradient-mint">your life</span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground text-balance max-w-2xl mx-auto mb-6">
                Submit your request online. A real Australian doctor reviews it and determines the best way to help you.
                Convenient, but still thorough.
              </p>

              {/* Quick stats */}
              <div className="flex flex-wrap justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">
                    Average response: <strong className="text-foreground">2.4 hours</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">
                    Patient satisfaction: <strong className="text-foreground">98%</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
          </section>
        </ParallaxSection>

        {/* Steps */}
        <ParallaxSection speed={0.25}>
          <section className="py-12 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="text-center mb-8">
                <h2
                  className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Three steps. That&apos;s it.
                </h2>
                <p className="text-sm text-muted-foreground">No hidden steps, no surprises, no catch.</p>
              </div>

              <div className="relative">
                {/* Connection line */}
                <div className="absolute left-10 md:left-[39px] top-20 bottom-20 w-0.5 bg-linear-to-b from-indigo-500/50 via-violet-500/20 to-indigo-500/50 hidden md:block" />

                <div className="space-y-6 md:space-y-8">
                  {steps.map((step, index) => (
                    <div
                      key={step.number}
                      className="relative flex flex-col md:flex-row gap-4 items-start animate-fade-in-up opacity-0"
                      style={{ animationDelay: `${0.2 + index * 0.15}s`, animationFillMode: "forwards" }}
                    >
                      {/* Icon */}
                      <div
                        className={`w-16 h-16 rounded-xl bg-linear-to-br ${step.color} flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 relative`}
                      >
                        <step.icon className="w-6 h-6 text-background" />
                        <span className="absolute -top-1 -right-1 text-xl">{step.emoji}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 w-full bg-content1/50 backdrop-blur-sm border border-divider/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                            STEP {step.number}
                          </span>
                          <span className="text-xs text-muted-foreground">{step.subtitle}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </section>
        </ParallaxSection>

        {/* Features Grid */}
        <ParallaxSection speed={0.2}>
          <section className="py-12 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="text-center mb-8">
                <h2
                  className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Why 10,000+ Aussies trust us
                </h2>
                <p className="text-sm text-muted-foreground">Real reasons, not marketing fluff.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                {features.map((feature, index) => (
                  <div
                    key={feature.title}
                    className="bg-content1/50 backdrop-blur-sm border border-divider/50 rounded-xl p-4 text-center animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${0.5 + index * 0.1}s`, animationFillMode: "forwards" }}
                  >
                    <div className="text-2xl mb-2">{feature.emoji}</div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </section>
        </ParallaxSection>

        {/* Use Cases */}
        <ParallaxSection speed={0.25}>
          <section className="py-12 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="text-center mb-8">
                <h2
                  className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Sound familiar?
                </h2>
                <p className="text-sm text-muted-foreground">Here&apos;s how real people use InstantMed</p>
              </div>

              <div className="space-y-3 max-w-4xl mx-auto">
                {useCases.map((useCase, index) => (
                  <div
                    key={index}
                    className="bg-content1/50 backdrop-blur-sm border border-divider/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${0.8 + index * 0.1}s`, animationFillMode: "forwards" }}
                  >
                    <div className="text-3xl">{useCase.emoji}</div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground mb-1">{useCase.title}</h3>
                      <p className="text-xs text-muted-foreground">{useCase.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-primary/10 rounded-full px-3 py-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span className="text-primary font-medium">{useCase.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </section>
        </ParallaxSection>

        {/* CTA */}
        <ParallaxSection speed={0.15}>
          <section className="py-12 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="glass-card rounded-3xl p-6 lg:p-8">
                <h2
                  className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Skip the waiting room
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Choose what you need and we&apos;ll handle the rest. Most requests are done within an hour.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="lg" className="rounded-full btn-premium text-foreground font-semibold px-8">
                    <Link href="/medical-certificate">
                      Get Med Cert
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-full bg-transparent">
                    <Link href="/prescriptions">Get Script</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          </section>
        </ParallaxSection>
      </main>

      <Footer />
    </div>
  )
}
