'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Stethoscope, ArrowLeft, FileText, AlertCircle, CheckCircle2, Ban, Scale, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-warm">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">InstantMed</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-lg text-slate-500">
              Last updated: December 2024
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-8 md:p-12 space-y-10">
              {/* Introduction */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-slate-600 leading-relaxed">
                  By accessing or using InstantMed&apos;s telehealth services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. These terms constitute a legally binding agreement between you and InstantMed Pty Ltd.
                </p>
              </div>

              {/* Services Provided */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">2. Services Provided</h2>
                </div>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>InstantMed provides the following telehealth services:</p>
                  <ul className="space-y-2 pl-4">
                    <li>• Medical certificates for work, university, and carer&apos;s leave</li>
                    <li>• Prescription renewals and new prescriptions (excluding controlled substances)</li>
                    <li>• Pathology and imaging referrals</li>
                    <li>• Specialist referrals</li>
                  </ul>
                  <p>All consultations are conducted by AHPRA-registered medical practitioners qualified to practice in Australia.</p>
                </div>
              </div>

              {/* Eligibility */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Eligibility</h2>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>To use our services, you must:</p>
                  <ul className="space-y-2 pl-4">
                    <li>• Be at least 18 years of age (or have parental/guardian consent)</li>
                    <li>• Be physically located in Australia at the time of consultation</li>
                    <li>• Provide accurate and complete information</li>
                    <li>• Have a valid Australian Medicare card (for some services)</li>
                  </ul>
                </div>
              </div>

              {/* Limitations */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <Ban className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">4. Service Limitations</h2>
                </div>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p><strong className="text-slate-700">Not for emergencies:</strong> InstantMed is not an emergency service. If you are experiencing a medical emergency, call 000 immediately.</p>
                  <p><strong className="text-slate-700">Controlled substances:</strong> We cannot prescribe Schedule 8 (S8) controlled substances, including opioids, benzodiazepines, and stimulants.</p>
                  <p><strong className="text-slate-700">Clinical discretion:</strong> Our doctors reserve the right to decline requests if they determine the service is not appropriate for telehealth or if there are clinical concerns.</p>
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-800 mb-2">Important Medical Disclaimer</h3>
                    <p className="text-amber-700 text-sm leading-relaxed">
                      Telehealth consultations are not a substitute for in-person medical care. If your condition requires physical examination, diagnostic testing, or ongoing management, our doctors may recommend you see a GP in person. Always follow up with your regular healthcare provider for ongoing health concerns.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">5. Payment & Refunds</h2>
                </div>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>Payment is required at the time of service submission. Our fees are displayed clearly before checkout.</p>
                  <p><strong className="text-slate-700">Refund Policy:</strong></p>
                  <ul className="space-y-2 pl-4">
                    <li>• Full refund if your request is declined by our doctor</li>
                    <li>• No refund once a certificate, prescription, or referral has been issued</li>
                    <li>• Backdating fees are non-refundable once approved</li>
                  </ul>
                </div>
              </div>

              {/* Response Times */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">6. Response Times</h2>
                </div>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>We aim to process all requests within 2 hours during business hours (8am - 10pm AEST). Priority review requests are processed within 30 minutes.</p>
                  <p>Response times may be longer during periods of high demand, public holidays, or outside operating hours.</p>
                </div>
              </div>

              {/* User Responsibilities */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Your Responsibilities</h2>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>You agree to:</p>
                  <ul className="space-y-2 pl-4">
                    <li>• Provide accurate and truthful information</li>
                    <li>• Not misrepresent your symptoms or medical history</li>
                    <li>• Use services only for legitimate medical purposes</li>
                    <li>• Keep your account credentials secure</li>
                    <li>• Not share or resell certificates or prescriptions</li>
                  </ul>
                  <p className="text-red-600 font-medium">Providing false information may result in account termination and could be reported to relevant authorities.</p>
                </div>
              </div>

              {/* Governing Law */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Governing Law</h2>
                <p className="text-slate-600 leading-relaxed">
                  These Terms are governed by the laws of New South Wales, Australia. Any disputes arising from these terms will be subject to the exclusive jurisdiction of the courts of New South Wales.
                </p>
              </div>

              {/* Changes to Terms */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Changes to Terms</h2>
                <p className="text-slate-600 leading-relaxed">
                  We may update these Terms of Service from time to time. We will notify you of any material changes by posting the new terms on our website. Your continued use of our services after such changes constitutes acceptance of the new terms.
                </p>
              </div>

              {/* Contact */}
              <div className="bg-slate-50 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Contact Us</h2>
                <p className="text-slate-600 leading-relaxed">
                  If you have questions about these Terms of Service, please contact us at{' '}
                  <a href="mailto:legal@instantmed.com.au" className="text-teal-600 hover:text-teal-700 underline underline-offset-2">
                    legal@instantmed.com.au
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} InstantMed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
