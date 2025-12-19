'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Stethoscope, ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacyPage() {
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
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Privacy Policy
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
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Introduction</h2>
                <p className="text-slate-600 leading-relaxed">
                  InstantMed (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy and ensuring the security of your personal and health information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our telehealth services.
                </p>
              </div>

              {/* Information We Collect */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">Information We Collect</h2>
                </div>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p><strong className="text-slate-700">Personal Information:</strong> Name, date of birth, contact details, Medicare number, and other identifying information.</p>
                  <p><strong className="text-slate-700">Health Information:</strong> Medical history, symptoms, current medications, allergies, and consultation notes.</p>
                  <p><strong className="text-slate-700">Payment Information:</strong> Billing details processed securely through our payment provider (Stripe).</p>
                  <p><strong className="text-slate-700">Technical Information:</strong> Device information, IP address, and browser type for security purposes.</p>
                </div>
              </div>

              {/* How We Use Your Information */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-teal-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">How We Use Your Information</h2>
                </div>
                <ul className="space-y-3 text-slate-600 leading-relaxed">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2.5 flex-shrink-0" />
                    To provide telehealth consultations and medical services
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2.5 flex-shrink-0" />
                    To generate medical certificates, prescriptions, and referrals
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2.5 flex-shrink-0" />
                    To communicate with you about your healthcare
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2.5 flex-shrink-0" />
                    To process payments for services
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2.5 flex-shrink-0" />
                    To comply with legal and regulatory requirements
                  </li>
                </ul>
              </div>

              {/* Data Security */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">Data Security</h2>
                </div>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>We implement industry-standard security measures to protect your information:</p>
                  <ul className="space-y-2 pl-4">
                    <li>• AES-256 encryption for data at rest and in transit</li>
                    <li>• Secure, HTTPS-only connections</li>
                    <li>• Regular security audits and penetration testing</li>
                    <li>• Access controls and authentication requirements</li>
                    <li>• Compliance with Australian Privacy Principles (APPs)</li>
                  </ul>
                </div>
              </div>

              {/* Your Rights */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">Your Rights</h2>
                </div>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>Under Australian privacy law, you have the right to:</p>
                  <ul className="space-y-2 pl-4">
                    <li>• Access your personal and health information</li>
                    <li>• Request correction of inaccurate information</li>
                    <li>• Request deletion of your data (where legally permitted)</li>
                    <li>• Opt out of marketing communications</li>
                    <li>• Lodge a complaint with the OAIC if you believe your privacy has been breached</li>
                  </ul>
                </div>
              </div>

              {/* Data Retention */}
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Data Retention</h2>
                <p className="text-slate-600 leading-relaxed">
                  We retain health records for a minimum of 7 years from your last consultation, as required by Australian healthcare regulations. After this period, records are securely destroyed unless a longer retention period is required by law.
                </p>
              </div>

              {/* Contact Us */}
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-slate-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">Contact Us</h2>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact our Privacy Officer at{' '}
                  <a href="mailto:privacy@instantmed.com.au" className="text-teal-600 hover:text-teal-700 underline underline-offset-2">
                    privacy@instantmed.com.au
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
