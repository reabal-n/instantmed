"use client"

import Image from "next/image"
import { SectionPill } from "@/components/ui/section-pill"
import { BlurFade } from "@/components/ui/blur-fade"
import { CheckCircle2, Clock, PhoneOff, Shield, Zap, Heart, Smartphone, Star } from "lucide-react"
import { motion } from "framer-motion"

const benefits = [
  {
    icon: Clock,
    title: "Done in under an hour",
    description: "Most requests approved within 45 minutes.",
    color: "#2563EB",
  },
  {
    icon: PhoneOff,
    title: "No awkward calls",
    description: "Text-based. No video. No phone calls.",
    color: "#4f46e5",
  },
  {
    icon: Shield,
    title: "Real Aussie doctors",
    description: "100% AHPRA registered GPs.",
    color: "#4f46e5",
  },
  {
    icon: Smartphone,
    title: "From anywhere",
    description: "Your couch, office, or beach.",
    color: "#F59E0B",
  },
  {
    icon: Heart,
    title: "Your data stays private",
    description: "Bank-level encryption on everything.",
    color: "#EC4899",
  },
  {
    icon: CheckCircle2,
    title: "Accepted everywhere",
    description: "Legally valid across Australia.",
    color: "#10B981",
  },
]

export function BenefitsSection() {
  return (
    <section id="benefits" className="px-4 py-20 sm:py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-linear-to-b from-background via-[#f0fdf4]/30 dark:via-slate-900/30 to-background" />
      
      <div className="mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Content */}
          <div>
            <BlurFade delay={0.1}>
              <div className="mb-6">
                <SectionPill emoji="✅" text="Why choose us" hoverText="Benefits at a glance" />
              </div>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Healthcare that{" "}
                <span className="bg-linear-to-r from-[#2563EB] to-[#4f46e5] bg-clip-text text-transparent">
                  fits your life
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                We built Lumen Health because waiting 3 weeks for a GP appointment is insane. 
                Get the care you need, when you need it.
              </p>
            </BlurFade>

            {/* Benefits grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon
                return (
                  <BlurFade key={benefit.title} delay={0.2 + i * 0.05}>
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/40 dark:border-slate-700/40 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors">
                      <div
                        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${benefit.color}20, ${benefit.color}10)` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: benefit.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm mb-0.5">{benefit.title}</h3>
                        <p className="text-xs text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  </BlurFade>
                )
              })}
            </div>
          </div>

          {/* Right side - Phone mockup with app */}
          <BlurFade delay={0.3}>
            <div className="relative flex justify-center">
              {/* Phone frame */}
              <div className="relative">
                <div className="relative w-[280px] h-[580px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  {/* Screen */}
                  <div className="relative w-full h-full bg-white dark:bg-slate-800 rounded-[2.5rem] overflow-hidden">
                    {/* Status bar */}
                    <div className="absolute top-0 left-0 right-0 h-12 bg-linear-to-b from-black/10 to-transparent z-10 flex items-center justify-center">
                      <div className="w-20 h-5 bg-black rounded-full" />
                    </div>
                    
                    {/* App content */}
                    <div className="pt-14 px-4 pb-4 h-full overflow-hidden">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center">
                          <Zap className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Lumen Health</p>
                          <p className="text-xs text-muted-foreground">Your health, simplified</p>
                        </div>
                      </div>

                      {/* Mock notification */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                        className="bg-green-50 dark:bg-green-900/30 rounded-2xl p-4 mb-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                            <Image
                              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face"
                              alt="Doctor"
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-green-800 dark:text-green-200">Request Approved!</p>
                            <p className="text-xs text-green-600 dark:text-green-300">Dr. Sarah has approved your prescription</p>
                            <p className="text-xs text-green-500 dark:text-green-400 mt-1">Just now</p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Mock service cards */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                            <Smartphone className="h-4 w-4 text-[#2563EB]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Prescription</p>
                            <p className="text-xs text-muted-foreground">From $39</p>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-[#4f46e5]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Med Certificate</p>
                            <p className="text-xs text-muted-foreground">From $29</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-8 bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#2563EB]" />
                    <span className="text-sm font-semibold">45 min avg</span>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -bottom-4 -left-8 bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">4.9</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}
