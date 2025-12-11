"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Clock, Shield, Star } from "lucide-react"
import Link from "next/link"
import { SecurityBadgesCompact } from "@/components/security/security-badges"

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#00E2B5]/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute top-40 right-10 w-96 h-96 bg-[#8B5CF6]/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />
      <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-[#06B6D4]/20 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="flex justify-center animate-fade-in-up">
            <Badge
              variant="outline"
              className="px-4 py-2 backdrop-blur-xl bg-white/5 border-white/10 text-foreground hover:bg-white/10 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 mr-2 text-[#00E2B5]" />
              AHPRA-registered doctors • Available 24/7
            </Badge>
          </div>

          {/* Main headline */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight animate-fade-in-up animation-delay-200"
            style={{ fontFamily: "var(--font-display)" }}
          >
            See a doctor{" "}
            <span className="bg-gradient-to-r from-[#00E2B5] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent animate-gradient">
              without the wait
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-400">
            Medical certificates, prescriptions, and referrals from real Australian GPs. Most requests completed within
            an hour.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-600">
            <Button asChild size="lg" className="rounded-full px-8 group">
              <Link href="/start">
                Get started
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 backdrop-blur-xl bg-transparent">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap gap-6 justify-center items-center pt-6 animate-fade-in-up animation-delay-800">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 text-[#00E2B5]" />
              <span>~30 min response</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-[#F59E0B]" />
              <span>4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-[#8B5CF6]" />
              <span>10,000+ Aussies helped</span>
            </div>
          </div>

          <div className="pt-8 animate-fade-in-up animation-delay-1000">
            <SecurityBadgesCompact />
          </div>
        </div>
      </div>
    </section>
  )
}
