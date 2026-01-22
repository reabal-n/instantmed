'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Menu, X, ArrowRight, FileText, Pill, Stethoscope, ChevronDown } from 'lucide-react'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Button } from '@/components/uix'
import { cn } from '@/lib/utils'
import { AnnouncementBar } from './announcement-bar'
import { motion } from 'framer-motion'

const services = [
  {
    label: 'Medical Certificates',
    href: '/start?service=med-cert',
    description: 'Work, uni & carer\'s leave',
    icon: FileText,
  },
  {
    label: 'Repeat Scripts',
    href: '/start?service=repeat-script',
    description: 'Medications you already take',
    icon: Pill,
  },
  {
    label: 'General Consult',
    href: '/start?service=consult',
    description: 'New prescriptions & dose changes',
    icon: Stethoscope,
  },
]

const navLinks = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'About', href: '/about' },
]

// Doctors online indicator
const OPEN_HOUR = 8
const CLOSE_HOUR = 22

function getAESTTime(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 10 * 3600000)
}

function isWithinHours(): boolean {
  const aest = getAESTTime()
  const hour = aest.getHours()
  return hour >= OPEN_HOUR && hour < CLOSE_HOUR
}

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

function DoctorsOnlineBadge() {
  const [isOnline, setIsOnline] = useState(true)
  const [doctorCount, setDoctorCount] = useState(3)
  const mounted = useHasMounted()

  useEffect(() => {
    const updateStatus = () => setIsOnline(isWithinHours())
    updateStatus()
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setDoctorCount((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1
        return Math.max(2, Math.min(5, prev + change))
      })
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted || !isOnline) return null

  return (
    <div
      className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30"
      role="status"
      aria-label={`${doctorCount} doctors currently online`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
        {doctorCount} doctors online
      </span>
    </div>
  )
}

export function MarketingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showServicesDropdown, setShowServicesDropdown] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Announcement Bar */}
      <AnnouncementBar />

      <nav
        className={cn(
          "fixed left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "top-0 bg-background/95 backdrop-blur-xl shadow-lg border-b border-border/50"
            : "top-[41px] bg-transparent"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <BrandLogo size="md" showGradient />

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {/* Services Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setShowServicesDropdown(true)}
                onMouseLeave={() => setShowServicesDropdown(false)}
              >
                <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/50">
                  Services
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showServicesDropdown && "rotate-180")} />
                </button>

                {showServicesDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 pt-2 w-80"
                  >
                    <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-4 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground px-3 py-1">Core Services</p>
                      {services.map((service) => (
                        <Link
                          key={service.href}
                          href={service.href}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <service.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{service.label}</p>
                            <p className="text-xs text-muted-foreground">{service.description}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Subtle separator */}
              <div className="h-4 w-px bg-border/50 mx-1" />

              {navLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/50"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Doctors Online Badge */}
              <DoctorsOnlineBadge />

              <Button asChild variant="ghost" size="sm" className="rounded-xl">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="relative bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all group"
              >
                <Link href="/start">
                  See a doctor now
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "lg:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-2xl overflow-hidden transition-all duration-300",
            isMobileMenuOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 py-6 space-y-2 max-h-[70vh] overflow-y-auto">
            {/* Services section */}
            <p className="text-xs font-medium text-muted-foreground px-4 pt-2">Services</p>
            {services.map((service) => (
              <Link
                key={service.href}
                href={service.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <service.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{service.label}</p>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </div>
              </Link>
            ))}

            <div className="border-t border-border my-4" />

            {/* Navigation links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-base font-medium text-foreground hover:bg-muted/50 rounded-xl transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-4 border-t border-border space-y-3">
              <Button asChild variant="outline" className="w-full justify-center rounded-xl">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button
                asChild
                className="w-full justify-center bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl"
              >
                <Link href="/start">See a doctor now</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar + announcement bar */}
      <div className="h-[105px]" />
    </>
  )
}
