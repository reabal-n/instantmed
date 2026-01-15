import { Clock, MessageCircle, ShieldCheck, Zap, FileCheck, Send } from 'lucide-react'
import { siteConfig, slaPolicy } from '@/lib/marketing/homepage'

export function OneHourPromise() {
  return (
    <section id="sla" className="py-20 lg:py-28 bg-linear-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden scroll-mt-20">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Content */}
          <div className="text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium mb-6">
              <Clock className="h-4 w-4" />
              Our 15-minute promise
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Med certs &amp; repeats in 15 minutes
            </h2>
            
            <p className="text-xl text-indigo-100 mb-8 leading-relaxed">
              No phone calls for med certificates and repeat prescriptions. 
              New scripts just need a quick 2-minute consult.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Operating hours</p>
                  <p className="text-indigo-100 text-sm">
                    Weekdays: {siteConfig.operatingHours.weekdays}<br />
                    Weekends: {siteConfig.operatingHours.weekends}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Need more info?</p>
                  <p className="text-indigo-100 text-sm">
                    {slaPolicy.escalationNote}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Fair refund policy</p>
                  <p className="text-indigo-100 text-sm">
                    {slaPolicy.refundNote}
                  </p>
                </div>
              </div>
            </div>

            {/* Exceptions note */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-sm text-indigo-100">
                <strong className="text-white">Note:</strong> Complex cases, requests requiring additional information, 
                or periods of high demand may take longer. We&apos;ll always keep you updated.
              </p>
            </div>
          </div>

          {/* Right: Visual representation */}
          <div className="relative hidden lg:block">
            <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">15min</p>
                  <p className="text-sm text-indigo-100">typical review</p>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center mx-auto mb-3">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">AHPRA</p>
                  <p className="text-sm text-indigo-100">registered doctors</p>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">7 days</p>
                  <p className="text-sm text-indigo-100">a week</p>
                </div>
                
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center mx-auto mb-3">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">Instant</p>
                  <p className="text-sm text-indigo-100">delivery</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
