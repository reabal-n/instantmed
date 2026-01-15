"use client"

import Link from "next/link"
import Image from "next/image"
import { FileText, Pill, ArrowRight, Check, Clock, Star, Sparkles, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/shared/navbar"
import { BlurFade } from "@/components/ui/blur-fade"
import { SectionPill } from "@/components/ui/section-pill"
import { GlowingBorder } from "@/components/ui/glowing-effect"
import { PRICING_DISPLAY } from "@/lib/constants"

const services = [
  {
    id: "medcert",
    title: "Medical Certificate",
    description: "Sick and need proof for work or uni? Get a valid certificate emailed to you.",
    icon: FileText,
    href: "/medical-certificate",
    price: PRICING_DISPLAY.MED_CERT,
    estimatedTime: "~1 hour",
    popular: true,
    features: ["Valid for all employers", "Same-day delivery", "Backdating if appropriate"],
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop",
    color: "hsl(var(--primary))",
    gradient: "from-primary/20 to-emerald-500/20",
  },
  {
    id: "prescription",
    title: "Prescription",
    description: "Need your regular medications? We'll send a script to your pharmacy.",
    icon: Pill,
    href: "/prescriptions",
    price: PRICING_DISPLAY.REPEAT_SCRIPT,
    estimatedTime: "~1 hour",
    popular: false,
    features: ["Works with any chemist", "Repeat scripts", "Common medications"],
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop",
    color: "hsl(var(--primary))",
    gradient: "from-indigo-600/20 to-pink-500/20",
  },
]

export function ServiceSelector({ isAuthenticated: _isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="marketing" />
      
      {/* Hero Header */}
      <section className="relative pt-28 pb-12 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-emerald-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
        
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-linear-to-r from-primary/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-linear-to-r from-indigo-600/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <BlurFade delay={0.1}>
            <div className="flex justify-center mb-4">
              <SectionPill emoji="⚡" text="Get started" hoverText="Choose your service" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
              What do you{" "}
              <span className="bg-linear-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
                need?
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Pick what you need. A real doctor reviews it — usually done in about an hour.
            </p>
            
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <span className="text-muted-foreground">4.9/5 rating</span>
              </div>
              <span className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>AHPRA registered</span>
              </div>
              <span className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-indigo-600" />
                <span>45 min average</span>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Services Grid */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service, i) => (
              <BlurFade key={service.id} delay={0.1 + i * 0.1}>
                <Link href={service.href} className="group block h-full">
                  <GlowingBorder>
                    <div className={`relative h-full rounded-3xl overflow-hidden bg-linear-to-br ${service.gradient} p-1 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
                      <div className="h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[22px] overflow-hidden">
                        {/* Image section */}
                        <div className="relative h-40 overflow-hidden">
                          <Image
                            src={service.image}
                            alt={service.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                          
                          {/* Popular badge */}
                          {service.popular && (
                            <div className="absolute top-4 left-4 flex items-center gap-1 bg-linear-to-r from-primary to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                              <Sparkles className="h-3 w-3" />
                              Most Popular
                            </div>
                          )}

                          {/* Price tag */}
                          <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-full px-3 py-1 shadow-lg">
                            <span className="text-sm font-bold" style={{ color: service.color }}>From {service.price}</span>
                          </div>

                          {/* Icon */}
                          <div
                            className="absolute bottom-4 left-4 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-xl shadow-lg"
                            style={{
                              background: `linear-gradient(135deg, ${service.color}, ${service.color}cc)`,
                            }}
                          >
                            <service.icon className="h-6 w-6 text-white" />
                          </div>
                          
                          {/* Time badge */}
                          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-full px-2 py-1 text-xs">
                            <Clock className="h-3 w-3" style={{ color: service.color }} />
                            <span className="font-medium">{service.estimatedTime}</span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-foreground">{service.title}</h2>
                            <ArrowRight 
                              className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" 
                              style={{ color: service.color }} 
                            />
                          </div>
                          <p className="text-muted-foreground mb-4">{service.description}</p>
                          
                          {/* Features */}
                          <div className="flex flex-wrap gap-2">
                            {service.features.map((feature) => (
                              <span 
                                key={feature} 
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-muted-foreground"
                              >
                                <Check className="h-3 w-3" style={{ color: service.color }} />
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlowingBorder>
                </Link>
              </BlurFade>
            ))}
          </div>

          {/* Help Text */}
          <BlurFade delay={0.5}>
            <div className="mt-12 relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-emerald-500/10 to-indigo-600/10" />
              <div className="relative z-10 p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Not sure which service you need?
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button variant="outline" asChild className="rounded-full">
                    <Link href="/how-it-works">
                      Learn how it works
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="rounded-full">
                    <Link href="/faq">
                      Browse our FAQ
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>
    </div>
  )
}
