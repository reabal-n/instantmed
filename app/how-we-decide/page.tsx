import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { ParallaxSection } from "@/components/ui/parallax-section"
import {
  Eye,
  ShieldCheck,
  XCircle,
  Heart,
  MessageCircle,
  ClipboardCheck,
  Stethoscope,
  AlertCircle,
  UserCheck,
  ArrowRight,
} from "lucide-react"

export const metadata: Metadata = {
  title: "How Doctors Review Your Request",
  description:
    "Learn how our doctors assess requests, why some are declined, and how we prioritise your safety. No algorithms — just real medical judgment.",
  openGraph: {
    title: "How We Make Decisions | InstantMed",
    description:
      "Every request is reviewed by a real Australian doctor. Here's what they look at and how they decide.",
  },
}

const reviewFactors = [
  {
    icon: ClipboardCheck,
    title: "What you've told us",
    description:
      "Your symptoms, how long you've been unwell, and anything else that helps paint the picture.",
  },
  {
    icon: Stethoscope,
    title: "Your medical background",
    description:
      "Conditions you've mentioned, medications you're on, and anything that might affect what's safe for you.",
  },
  {
    icon: Eye,
    title: "What you're asking for",
    description:
      "Whether it's a certificate, a script renewal, or something else — and whether that makes sense given everything above.",
  },
  {
    icon: ShieldCheck,
    title: "Clinical guidelines",
    description:
      "The same rules any doctor follows. Some things just need to be done in person. We don&apos;t bend on that.",
  },
]

const declineReasons = [
  {
    title: "You might need to be seen in person",
    description:
      "Some things really do need a physical exam. It&apos;s not us being difficult — it&apos;s just the nature of medicine.",
  },
  {
    title: "The medication needs monitoring",
    description:
      "Certain scripts require blood tests or regular check-ins. We can&apos;t skip those steps.",
  },
  {
    title: "Something sounds more serious",
    description:
      "If your symptoms suggest you should see someone urgently, we&apos;ll tell you. That&apos;s not a decline — that&apos;s looking out for you.",
  },
  {
    title: "We need more information",
    description:
      "Sometimes the answer is just &apos;tell us more.&apos; The doctor might reach out before making a final call.",
  },
  {
    title: "It&apos;s outside what telehealth can do",
    description:
      "There are limits to what any doctor can safely do without seeing you. We work within them.",
  },
]

const safetyPoints = [
  {
    icon: UserCheck,
    title: "Real doctors, real accountability",
    description:
      "Every reviewer is an AHPRA-registered doctor. They put their name on every decision.",
  },
  {
    icon: Heart,
    title: "No pressure to approve",
    description:
      "Our doctors aren&apos;t paid to say yes. They&apos;re paid to get it right. Big difference.",
  },
  {
    icon: MessageCircle,
    title: "We reach out when it matters",
    description:
      "If something&apos;s unclear, the doctor will contact you. We&apos;d rather ask than assume.",
  },
  {
    icon: AlertCircle,
    title: "Honest about our limits",
    description:
      "If you need in-person care, we&apos;ll say so. We&apos;re not trying to handle everything — just the things we can do well.",
  },
]

export default function HowWeDecidePage() {
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
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground/80">Our Process</span>
                </div>
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight text-balance mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Every request gets a{" "}
                  <span className="text-gradient-mint">real review</span>
                </h1>
                <p className="text-sm md:text-base text-muted-foreground text-balance max-w-2xl mx-auto">
                  No algorithms deciding your health. No rubber stamps. Just a doctor looking at your request 
                  and making a call — the same way they would if you were sitting across from them.
                </p>
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* What Doctors Review */}
        <ParallaxSection speed={0.25}>
          <section className="py-12 lg:py-16">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2
                    className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    What the doctor looks at
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    The same stuff they&apos;d consider if you walked into a clinic. Nothing more, nothing less.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {reviewFactors.map((factor, index) => (
                    <div
                      key={factor.title}
                      className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4 animate-fade-in-up opacity-0 hover-lift card-warm-hover"
                      style={{
                        animationDelay: `${0.2 + index * 0.1}s`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <factor.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-1">
                            {factor.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {factor.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* Why Requests Are Declined */}
        <ParallaxSection speed={0.2}>
          <section className="py-12 lg:py-16">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2
                    className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Why some requests aren&apos;t approved
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    It&apos;s not personal. It&apos;s a doctor doing their job properly. Here are the usual reasons.
                  </p>
                </div>

                <div className="space-y-3 max-w-3xl mx-auto">
                  {declineReasons.map((reason, index) => (
                    <div
                      key={reason.title}
                      className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex items-start gap-3 animate-fade-in-up opacity-0 hover-lift card-warm-hover"
                      style={{
                        animationDelay: `${0.3 + index * 0.08}s`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <div className="shrink-0 w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center mt-0.5">
                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-0.5">
                          {reason.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {reason.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    If your request is declined, you get a{" "}
                    <span className="font-medium text-foreground">full refund</span>. No hassle.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* Safety First */}
        <ParallaxSection speed={0.25}>
          <section className="py-12 lg:py-16">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2
                    className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Your safety comes first
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    We&apos;d rather lose a sale than cut corners on care. That&apos;s not marketing — it&apos;s just how we work.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {safetyPoints.map((point, index) => (
                    <div
                      key={point.title}
                      className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4 animate-fade-in-up opacity-0 hover-lift card-warm-hover"
                      style={{
                        animationDelay: `${0.4 + index * 0.1}s`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <point.icon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-1">
                            {point.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {point.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* What to Expect */}
        <ParallaxSection speed={0.2}>
          <section className="py-12 lg:py-16">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2
                    className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    What happens after you submit
                  </h2>
                  <p className="text-sm text-muted-foreground">No surprises. Here&apos;s exactly what to expect.</p>
                </div>

                <div className="max-w-2xl mx-auto space-y-4">
                  {[
                    {
                      step: "1",
                      title: "A doctor reviews your request",
                      description: "Usually within a few hours. They look at everything you've shared and make a decision.",
                    },
                    {
                      step: "2",
                      title: "You hear back",
                      description: "Approved? Your certificate or script is on its way. Declined? Full refund, no drama.",
                    },
                    {
                      step: "3",
                      title: "Questions? They'll ask",
                      description: "If anything's unclear, the doctor reaches out before deciding. We don&apos;t guess.",
                    },
                  ].map((item, index) => (
                    <div
                      key={item.step}
                      className="flex items-start gap-4 bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border/50 rounded-xl p-4 animate-fade-in-up opacity-0"
                      style={{
                        animationDelay: `${0.5 + index * 0.1}s`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{item.step}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-0.5">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
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
                    Still have questions?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    We&apos;re happy to explain more. Our support team is real people who actually reply.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg" className="rounded-full btn-premium text-foreground font-semibold px-8">
                      <Link href="/contact">
                        <MessageCircle className="mr-2 w-4 h-4" />
                        Get in touch
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-full bg-transparent">
                      <Link href="/faq">
                        Read FAQs
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ParallaxSection>
      </main>

      <MarketingFooter />
    </div>
  )
}
