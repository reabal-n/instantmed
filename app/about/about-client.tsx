'use client'

import Link from "next/link"
import { ArrowRight, Heart, Shield, Zap, Users, CheckCircle2 } from "lucide-react"
import { Button } from "@heroui/react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"

export function AboutClient() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="relative px-4 py-12 sm:py-16 lg:py-20 overflow-hidden">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-4 interactive-pill cursor-default">
                <Heart className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground/80">About InstantMed</span>
              </div>
              <h1
                className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Healthcare shouldn&apos;t be hard
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                We&apos;re on a mission to make healthcare accessible, fast, and hassle-free for all Australians.
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">Our Story</h2>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    InstantMed was born from frustration. We were tired of waiting weeks for GP appointments, taking
                    half-days off work for simple script renewals, and dealing with the endless paperwork that comes
                    with traditional healthcare.
                  </p>
                  <p>
                    We asked ourselves: why can&apos;t getting a medical certificate or prescription be as simple as
                    ordering food online? Why do you need to sit in a waiting room for 45 minutes when a doctor can
                    review your request in minutes?
                  </p>
                  <p>
                    So we built InstantMed. A platform that connects you with real, AHPRA-registered Australian doctors
                    who can review your requests quickly and professionally—all without the hassle of phone calls, video
                    chats, or waiting rooms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="text-center mb-8">
                <h2
                  className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  What we stand for
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: Zap,
                    title: "Speed",
                    description: "We believe healthcare should be fast. Most requests are reviewed within an hour.",
                    color: "#2563EB",
                  },
                  {
                    icon: Shield,
                    title: "Trust",
                    description: "All our doctors are AHPRA-registered and fully licensed to practice in Australia.",
                    color: "#4f46e5",
                  },
                  {
                    icon: Heart,
                    title: "Accessibility",
                    description: "Healthcare should be accessible to everyone, regardless of location or schedule.",
                    color: "#EC4899",
                  },
                ].map((value) => {
                  const Icon = value.icon
                  return (
                    <div key={value.title} className="bg-content1/50 backdrop-blur-sm border border-divider/50 rounded-xl p-4">
                      <div
                        className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center mb-3"
                        style={{
                          background: `linear-gradient(135deg, ${value.color}20, ${value.color}10)`,
                          border: `1px solid ${value.color}30`,
                        }}
                      >
                        <Icon className="h-5 w-5" style={{ color: value.color }} />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">{value.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{value.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-3 interactive-pill cursor-default">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground/80">Our team</span>
                </div>
                <h2
                  className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Built by Aussies, for Aussies
                </h2>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                  We&apos;re a team of healthcare professionals, technologists, and patient advocates who are passionate
                  about making healthcare better.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto">
                <div className="bg-content1/50 backdrop-blur-sm border border-divider/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    AHPRA-Registered Doctors
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    All our doctors are fully registered with AHPRA and hold valid medical licenses to practice in
                    Australia.
                  </p>
                </div>
                <div className="bg-content1/50 backdrop-blur-sm border border-divider/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Australian-Based
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Our team and servers are based in Australia, ensuring your data stays local and secure.
                  </p>
                </div>
                <div className="bg-content1/50 backdrop-blur-sm border border-divider/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Privacy-First
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    We use bank-level encryption and comply with all Australian privacy laws and regulations.
                  </p>
                </div>
                <div className="bg-content1/50 backdrop-blur-sm border border-divider/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Patient-Focused
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Every decision we make is guided by what&apos;s best for patients, not profits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="glass-card rounded-3xl p-6 lg:p-8">
                <h2
                  className="text-2xl font-bold tracking-tight sm:text-3xl mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Ready to experience better healthcare?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Join thousands of Australians who have made the switch to InstantMed.
                </p>
                <Button 
                  as={Link}
                  href="/start"
                  color="primary"
                  size="lg"
                  className="px-8"
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Get started
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
