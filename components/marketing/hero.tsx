import Link from 'next/link'
import Image from 'next/image'
import { Shield, Lock, DollarSign, Clock, ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RotatingText } from './rotating-text'
import { heroRotatingTexts, trustSignals } from '@/lib/marketing/homepage'

const iconMap = {
  Shield,
  Lock,
  DollarSign,
  Clock,
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-premium-mesh min-h-[90vh] flex items-center">
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Premium gradient orbs with glow */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" style={{ background: 'radial-gradient(circle, rgba(0,226,181,0.15) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full blur-[60px] -translate-x-1/2 -translate-y-1/2" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Badge - glass style */}
            <div className="inline-flex items-center gap-2.5 rounded-full glass px-5 py-2 text-sm font-medium mb-8 animate-slide-up">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-foreground/80">⚡ Australia&apos;s fastest online GP</span>
            </div>

            {/* Headline - Lora font */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground mb-6 animate-slide-up-delay-1">
              Your{' '}
              <span className="text-gradient">
                <RotatingText texts={heroRotatingTexts} className="inline" />
              </span>
              <br className="hidden sm:block" />
              <span className="text-foreground/90"> — sorted in under an hour.</span>
            </h1>

            {/* Subtext */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed animate-slide-up-delay-2">
              Tell us what you need, a real GP reviews it, and you&apos;re done. 
              No appointments. No waiting rooms. No phone queues.
            </p>

            {/* CTAs - Premium liquid buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-slide-up-delay-3">
              <Button 
                asChild 
                size="lg"
                className="btn-liquid px-10 h-14 text-base"
              >
                <Link href="/start">
                  Start in 60 seconds
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg"
                className="btn-liquid-secondary h-14 text-base px-8"
              >
                <Link href="#how-it-works">
                  <Play className="mr-2 h-4 w-4" />
                  How it works
                </Link>
              </Button>
            </div>

            {/* Trust row - glass pills */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              {trustSignals.map((signal) => {
                const Icon = iconMap[signal.icon as keyof typeof iconMap]
                return (
                  <div key={signal.text} className="glass-card flex items-center gap-2 text-sm px-4 py-2 rounded-full">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-foreground/80">{signal.text}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right side - Hero image with glass frame */}
          <div className="relative hidden lg:block">
            <div className="relative glass-card rounded-3xl overflow-hidden p-2">
              {/* Main image: person on laptop at home, feeling unwell but hopeful */}
              <Image
                src="/woman-sick-at-home-laptop.jpg"
                alt="Person getting medical help from home"
                width={600}
                height={500}
                className="w-full h-auto object-cover rounded-2xl"
                priority
              />
              {/* Gradient overlay at bottom */}
              <div className="absolute inset-2 rounded-2xl bg-linear-to-t from-foreground/30 via-transparent to-transparent pointer-events-none" />
              
              {/* Floating notification card - glass style */}
              <div className="absolute bottom-8 left-4 right-4 glass-card rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Image
                      src="/female-doctor-headshot-professional.jpg"
                      alt="Doctor"
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-xl border-2 border-white/50 object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-white flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Dr. Sarah reviewed your request</p>
                    <p className="text-xs text-muted-foreground">Your certificate is ready • 42 min ago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative glow elements */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-3xl -z-10" style={{ background: 'linear-gradient(135deg, rgba(0,226,181,0.2), rgba(6,182,212,0.1))', filter: 'blur(20px)' }} />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-3xl -z-10" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))', filter: 'blur(24px)' }} />
          </div>
        </div>
      </div>
    </section>
  )
}
