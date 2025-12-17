'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { faqItems } from '@/lib/marketing/homepage'

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 lg:py-28 bg-slate-50 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Common questions
          </h2>
          <p className="text-lg text-slate-600">
            Everything you need to know about our service.
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-900 pr-4">
                  {item.question}
                </span>
                <ChevronDown 
                  className={cn(
                    "h-5 w-5 text-slate-400 flex-shrink-0 transition-transform duration-200",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              
              <div 
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  openIndex === index ? "max-h-96" : "max-h-0"
                )}
              >
                <div className="px-6 pb-4 text-slate-600 leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact support */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-2">Still have questions?</p>
          <a 
            href="mailto:support@instantmed.com.au" 
            className="text-emerald-600 font-medium hover:text-emerald-700"
          >
            Contact our support team →
          </a>
        </div>
      </div>
    </section>
  )
}
