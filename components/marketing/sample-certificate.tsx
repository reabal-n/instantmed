'use client'

import { motion } from 'framer-motion'
import { QrCode, CheckCircle } from 'lucide-react'

interface SampleCertificateProps {
  className?: string
  animate?: boolean
}

/**
 * Sample medical certificate preview for marketing pages.
 * Shows employers what an InstantMed certificate looks like.
 * Uses redacted/sample data - not a real certificate.
 */
export function SampleCertificate({ className = '', animate = true }: SampleCertificateProps) {
  const Wrapper = animate ? motion.div : 'div'
  const wrapperProps = animate ? {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
  } : {}

  return (
    <Wrapper {...wrapperProps} className={className}>
      <div className="relative bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden max-w-md mx-auto">
        {/* Sample badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2 py-1 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-full uppercase tracking-wide">
            Sample
          </span>
        </div>

        {/* Certificate content - A4 aspect ratio preview */}
        <div className="p-6 sm:p-8" style={{ fontFamily: 'Georgia, serif' }}>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-cyan-500 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">IM</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">InstantMed</h3>
                <p className="text-xs text-gray-500">Telehealth Services</p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Level 1/457-459 Elizabeth St</p>
              <p>Surry Hills NSW 2010</p>
              <p>ABN: 12 345 678 901</p>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-xl font-bold text-gray-900 tracking-wide uppercase mb-6">
            Medical Certificate
          </h2>

          {/* Patient Details */}
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">
              Patient Details
            </h4>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="text-gray-500">Full Name:</span>
              <span className="font-medium text-gray-900">Jane Smith</span>
              <span className="text-gray-500">Date of Birth:</span>
              <span className="font-medium text-gray-900">15 March 1990</span>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="mb-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">
              Certificate Details
            </h4>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="text-gray-500">Date Issued:</span>
              <span className="font-medium text-gray-900">19 January 2026</span>
              <span className="text-gray-500">Absence From:</span>
              <span className="font-medium text-gray-900">18 January 2026</span>
              <span className="text-gray-500">Absence To:</span>
              <span className="font-medium text-gray-900">19 January 2026</span>
              <span className="text-gray-500">Duration:</span>
              <span className="font-medium text-gray-900">2 days</span>
            </div>
          </div>

          {/* Medical Statement */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">
              Medical Statement
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              This is to certify that the above-named patient attended a telehealth 
              consultation and, in my professional medical opinion, was unfit for 
              their usual work duties for the period specified above due to a 
              medical condition.
            </p>
          </div>

          {/* Signature */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 italic mb-1">Electronically signed</p>
            <p className="font-semibold text-gray-900">Dr. Sarah Johnson</p>
            <p className="text-xs text-gray-500">AHPRA: MED0002576546</p>
            <p className="text-xs text-gray-500">Provider Number: 2426577L</p>
          </div>

          {/* Footer with verification */}
          <div className="border-t border-gray-200 pt-4 flex items-end justify-between">
            <div className="text-xs text-gray-500">
              <p className="font-medium">Certificate ID: MC-2026-A1B2C3D4</p>
              <p>Verify at: instantmed.com.au/verify</p>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center">
              <QrCode className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[9px] text-gray-400 mt-4 leading-relaxed">
            This medical certificate was issued via InstantMed telehealth services. 
            The issuing doctor is registered with AHPRA and can be verified on the 
            public register.
          </p>
        </div>

        {/* Verification badge overlay */}
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-medium text-emerald-700">Verifiable</span>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="text-center text-xs text-muted-foreground mt-4">
        Sample certificate for illustration purposes only
      </p>
    </Wrapper>
  )
}
