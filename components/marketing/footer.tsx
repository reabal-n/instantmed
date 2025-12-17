import Link from 'next/link'
import { Zap } from 'lucide-react'
import { siteConfig, footerLinks } from '@/lib/marketing/homepage'

export function MarketingFooter() {
  return (
    <footer className="relative bg-gray-950 text-gray-300 overflow-hidden">
      {/* Gradient orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px] opacity-20" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)' }} />
      
      {/* Main footer */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                {siteConfig.name}
              </span>
            </Link>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Australian online doctor consultations. 
              Fast, secure, and convenient.
            </p>
            <p className="text-sm text-gray-500">
              ABN: {siteConfig.legal.abn}
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
              Services
            </h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-indigo-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-indigo-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-indigo-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer bar */}
      <div className="relative border-t border-gray-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4 text-xs text-gray-500">
            <p>
              <strong className="text-gray-400">Important:</strong> Online assessment is not suitable for medical emergencies. 
              If you are experiencing a medical emergency, call <strong className="text-white">000</strong> immediately.
            </p>
            <p>
              Prescriptions are issued only where clinically appropriate. A doctor may decline a request 
              if they believe it is not in your best interest or if insufficient information is provided.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-800/50">
              <p className="pt-4">
                © {new Date().getFullYear()} {siteConfig.legal.clinicName}. All rights reserved.
              </p>
              <p className="pt-4 text-gray-600">
                {siteConfig.legal.clinicAddress}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
