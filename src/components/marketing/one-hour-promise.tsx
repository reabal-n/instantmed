import Image from 'next/image'
import { Clock, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import { siteConfig, slaPolicy } from '@/lib/marketing/homepage'

export function OneHourPromise() {
  return (
    <section id="sla" className="py-20 lg:py-28 bg-emerald-600 relative overflow-hidden scroll-mt-20">
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
              ⏱️ Our promise
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Done in about an hour
            </h2>
            
            <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
              Most requests are reviewed within {slaPolicy.standardTurnaround}. 
              We respect your time — that's the whole point.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Operating hours</p>
                  <p className="text-emerald-100 text-sm">
                    Weekdays: {siteConfig.operatingHours.weekdays}<br />
                    Weekends: {siteConfig.operatingHours.weekends}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Need more info?</p>
                  <p className="text-emerald-100 text-sm">
                    {slaPolicy.escalationNote}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Fair refund policy</p>
                  <p className="text-emerald-100 text-sm">
                    {slaPolicy.refundNote}
                  </p>
                </div>
              </div>
            </div>

            {/* Exceptions note */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-sm text-emerald-100">
                <strong className="text-white">Note:</strong> Complex cases, requests requiring additional information, 
                or periods of high demand may take longer. We'll always keep you updated.
              </p>
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              {/* Image: pharmacist/healthcare professional with medications */}
              <Image
                src="/prescription-medication-pharmacy.jpg"
                alt="Healthcare professional"
                width={500}
                height={600}
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 via-transparent to-transparent" />
            </div>
            
            {/* Stats card */}
            <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-5 shadow-xl">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-600 mb-1">&lt;1hr</p>
                <p className="text-sm text-slate-600">typical turnaround</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
