import Image from 'next/image'
import { ClipboardList, Stethoscope, FileCheck } from 'lucide-react'
import { howItWorks } from '@/lib/marketing/homepage'

const iconMap = {
  ClipboardList,
  Stethoscope,
  FileCheck,
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3">
            ✨ How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            From request to done in three steps
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            No phone trees. No video calls. No leaving your couch. Just healthcare that works.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Steps */}
          <div className="space-y-8">
            {howItWorks.map((step, index) => {
              const Icon = iconMap[step.icon as keyof typeof iconMap]
              const isLast = index === howItWorks.length - 1
              
              return (
                <div key={step.step} className="relative flex gap-5">
                  {/* Connector line */}
                  {!isLast && (
                    <div className="absolute left-6 top-14 w-0.5 h-[calc(100%-1rem)] bg-slate-200" />
                  )}
                  
                  {/* Step number */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      {step.step}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="pt-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              {/* Image: doctor reviewing notes on tablet/computer */}
              <Image
                src="/doctor-video-call-telehealth.jpg"
                alt="Doctor reviewing patient request"
                width={600}
                height={450}
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-900/30 via-transparent to-transparent" />
            </div>
            
            {/* Floating stat */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-lg border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">&lt; 1 hr</p>
                  <p className="text-sm text-slate-500">typical review time</p>
                </div>
              </div>
            </div>

            {/* Decorative */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-violet-100 rounded-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  )
}
