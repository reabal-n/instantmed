'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, ArrowRight, FileText, Pill, Zap, Heart, Shield, Scale, ChevronDown } from 'lucide-react'
import { Button } from '@/components/uix'
import { cn } from '@/lib/utils'
import { siteConfig } from '@/lib/marketing/homepage'

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
    icon: Zap,
  },
]

const healthPrograms = [
  {
    label: 'Women\'s Health',
    href: '/womens-health',
    description: 'UTI, contraception & more',
    icon: Heart,
    color: 'text-pink-500',
  },
  {
    label: 'Men\'s Health',
    href: '/mens-health',
    description: 'ED, hair loss & testing',
    icon: Shield,
    color: 'text-blue-500',
  },
  {
    label: 'Weight Loss',
    href: '/weight-loss',
    description: 'Weight management consultation',
    icon: Scale,
    color: 'text-indigo-500',
  },
]

const navLinks = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'About', href: '/about' },
]

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
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled 
            ? "bg-background/95 backdrop-blur-xl shadow-lg border-b border-border/50" 
            : "bg-transparent"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                {siteConfig.name}
              </span>
            </Link>

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
                  <div className="absolute top-full left-0 pt-2 w-80">
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
                      <div className="border-t border-border my-2" />
                      <p className="text-xs font-medium text-muted-foreground px-3 py-1">Health Programs</p>
                      {healthPrograms.map((program) => (
                        <Link
                          key={program.href}
                          href={program.href}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                            <program.icon className={cn("h-4 w-4", program.color)} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{program.label}</p>
                            <p className="text-xs text-muted-foreground">{program.description}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {navLinks.map((link) => (
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
              <Button asChild variant="ghost" size="sm" className="rounded-xl">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button 
                asChild 
                size="sm"
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                <Link href="/start">
                  Get started
                  <ArrowRight className="ml-1.5 h-4 w-4" />
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

            {/* Health Programs */}
            <p className="text-xs font-medium text-muted-foreground px-4">Health Programs</p>
            {healthPrograms.map((program) => (
              <Link
                key={program.href}
                href={program.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <program.icon className={cn("h-5 w-5", program.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{program.label}</p>
                  <p className="text-xs text-muted-foreground">{program.description}</p>
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
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button 
                asChild 
                className="w-full justify-center bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl"
              >
                <Link href="/start">Get started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  )
}
