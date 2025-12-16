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
    <section className="relative overflow-hidden bg-gradient-to-b from-stone-50 via-white to-emerald-50/30">
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Gradient orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-200/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/60 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              ⚡ Australia's fastest online GP
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              Your{' '}
              <span className="text-emerald-600">
                <RotatingText texts={heroRotatingTexts} className="inline" />
              </span>
              <br className="hidden sm:block" />
              {' '}— sorted in under an hour.
            </h1>

            {/* Subtext */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Tell us what you need, a real GP reviews it, and you're done. 
              No appointments. No waiting rooms. No phone queues.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Button 
                asChild 
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 text-base font-semibold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all"
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
                className="h-12 text-base rounded-xl border-slate-200 hover:bg-slate-50"
              >
                <Link href="#how-it-works">
                  <Play className="mr-2 h-4 w-4" />
                  How it works
                </Link>
              </Button>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3">
              {trustSignals.map((signal) => {
                const Icon = iconMap[signal.icon as keyof typeof iconMap]
                return (
                  <div key={signal.text} className="flex items-center gap-2 text-sm text-slate-600">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    <span>{signal.text}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right side - Hero image */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/10">
              {/* Main image: person on laptop at home, feeling unwell but hopeful */}
              <Image
                src="/woman-sick-at-home-laptop.jpg"
                alt="Person getting medical help from home"
                width={600}
                height={500}
                className="w-full h-auto object-cover"
                priority
              />
              {/* Gradient overlay at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
              
              {/* Floating card */}
              <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <Image
                      src="/female-doctor-headshot-professional.jpg"
                      alt="Doctor"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full border-2 border-white object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Dr. Sarah reviewed your request</p>
                    <p className="text-xs text-slate-500">Your certificate is ready • 42 min ago</p>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-100 rounded-2xl -z-10" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-emerald-100 rounded-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  )
}
