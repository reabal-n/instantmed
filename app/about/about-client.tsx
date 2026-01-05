'use client'

import Link from "next/link"
import { ArrowRight, Heart, Shield, Zap, Users, CheckCircle2 } from "lucide-react"
import { Button, Chip } from "@heroui/react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { HolographicCard } from "@/components/effects/holographic-card"

export function AboutClient() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="relative px-4 py-16 sm:py-24 overflow-hidden">
          <div className="mx-auto max-w-4xl text-center relative z-10">
            <div className="flex justify-center mb-4">
              <Chip color="primary" variant="flat" startContent={<Heart className="h-3.5 w-3.5" />}>About InstantMed</Chip>
            </div>
            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Healthcare shouldn&apos;t be hard
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We&apos;re on a mission to make healthcare accessible, fast, and hassle-free for all Australians.
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <HolographicCard hover intensity="medium" className="p-8 sm:p-12">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <h2 className="text-2xl font-bold mb-4">Our Story</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  InstantMed was born from frustration. We were tired of waiting weeks for GP appointments, taking
                  half-days off work for simple script renewals, and dealing with the endless paperwork that comes
                  with traditional healthcare.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We asked ourselves: why can&apos;t getting a medical certificate or prescription be as simple as
                  ordering food online? Why do you need to sit in a waiting room for 45 minutes when a doctor can
                  review your request in minutes?
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  So we built InstantMed. A platform that connects you with real, AHPRA-registered Australian doctors
                  who can review your requests quickly and professionally—all without the hassle of phone calls, video
                  chats, or waiting rooms.
                </p>
              </div>
            </HolographicCard>
          </div>
        </section>

        {/* Values */}
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                What we stand for
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Zap,
                  title: "Speed",
                  description: "We believe healthcare should be fast. Most requests are reviewed within an hour.",
                  color: "#00E2B5",
                },
                {
                  icon: Shield,
                  title: "Trust",
                  description: "All our doctors are AHPRA-registered and fully licensed to practice in Australia.",
                  color: "#06B6D4",
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
                  <HolographicCard key={value.title} hover intensity="medium" className="p-6">
                    <div className="flex flex-col gap-4">
                      <div
                        className="shrink-0 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-xl"
                        style={{
                          background: `linear-gradient(135deg, ${value.color}20, ${value.color}10)`,
                          border: `1px solid ${value.color}30`,
                        }}
                      >
                        <Icon className="h-6 w-6" style={{ color: value.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                      </div>
                    </div>
                  </HolographicCard>
                )
              })}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="px-4 py-12 sm:py-16 bg-muted/30">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-4">
                <Chip color="primary" variant="flat" startContent={<Users className="h-3.5 w-3.5" />}>Our team</Chip>
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

            <HolographicCard hover intensity="medium" className="p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                    AHPRA-Registered Doctors
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    All our doctors are fully registered with AHPRA and hold valid medical licenses to practice in
                    Australia.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                    Australian-Based
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Our team and servers are based in Australia, ensuring your data stays local and secure.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                    Privacy-First
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We use bank-level encryption and comply with all Australian privacy laws and regulations.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                    Patient-Focused
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Every decision we make is guided by what&apos;s best for patients, not profits.
                  </p>
                </div>
              </div>
            </HolographicCard>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <HolographicCard hover intensity="high" className="text-center p-12">
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ready to experience better healthcare?
              </h2>
              <p className="text-muted-foreground mb-8">
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
            </HolographicCard>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
