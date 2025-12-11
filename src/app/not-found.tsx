'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Stethoscope, Home, Search, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-warm flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">InstantMed</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="text-[120px] md:text-[160px] font-bold text-slate-100 leading-none select-none">
              404
            </div>
            <div className="relative -mt-16 md:-mt-20">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
                <Search className="w-12 h-12 md:w-16 md:h-16 text-teal-600" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            Page not found
          </h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Oops! The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            Let&apos;s get you back on track.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button size="lg" className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-600/20">
                <Home className="w-5 h-5 mr-2" />
                Go home
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-xl border-2 border-slate-200">
                <HelpCircle className="w-5 h-5 mr-2" />
                Get help
              </Button>
            </Link>
          </div>

          {/* Quick Links */}
          <div className="mt-12 pt-8 border-t border-slate-100">
            <p className="text-sm text-slate-400 mb-4">Popular pages</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/start" className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors">
                Get a certificate
              </Link>
              <Link href="/dashboard" className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors">
                My dashboard
              </Link>
              <Link href="/#how-it-works" className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors">
                How it works
              </Link>
              <Link href="/#faq" className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors">
                FAQ
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} InstantMed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
