'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, Shield, ArrowRight, Percent } from 'lucide-react'
import { Button } from '@heroui/react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type ServiceType = 'med-cert' | 'repeat-prescription' | 'general-consult'

interface ServiceConfig {
  title: string
  subtitle: string
  discount?: string
  discountCode?: string
  urgencyText: string
  ctaText: string
  ctaHref: string
  benefits: string[]
  color: string
  bgGradient: string
}

const SERVICE_CONFIGS: Record<ServiceType, ServiceConfig> = {
  'med-cert': {
    title: "Still need that medical certificate?",
    subtitle: "Don't let your sick day go undocumented",
    discount: "10% OFF",
    discountCode: "GETWELL10",
    urgencyText: "Most certificates approved in under 45 minutes",
    ctaText: "Get my certificate",
    ctaHref: "/start?service=med-cert",
    benefits: [
      "Valid for all employers",
      "Same-day delivery",
      "Full refund if declined",
    ],
    color: "emerald",
    bgGradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  'repeat-prescription': {
    title: "Running low on medication?",
    subtitle: "Don't wait until you run out",
    discount: "10% OFF",
    discountCode: "REFILL10",
    urgencyText: "E-script sent to any pharmacy, same day",
    ctaText: "Request my script",
    ctaHref: "/start?service=repeat-script",
    benefits: [
      "Works with any pharmacy",
      "PBS subsidies apply",
      "Repeats included",
    ],
    color: "blue",
    bgGradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
  },
  'general-consult': {
    title: "Still have that health concern?",
    subtitle: "A doctor can help — today",
    discount: "10% OFF",
    discountCode: "CONSULT10",
    urgencyText: "Most consultations completed within 2 hours",
    ctaText: "Start my consult",
    ctaHref: "/start?service=consult",
    benefits: [
      "Real clinical assessment",
      "Prescriptions if appropriate",
      "Full refund if we can't help",
    ],
    color: "violet",
    bgGradient: "from-violet-500/20 via-purple-500/10 to-transparent",
  },
}

interface ServiceExitPopupProps {
  service: ServiceType
  delayMs?: number
  showOnScroll?: boolean
  scrollThreshold?: number
}

export function ServiceExitPopup({
  service,
  delayMs = 0,
  showOnScroll = false,
  scrollThreshold = 50,
}: ServiceExitPopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(() => {
    // Check if already dismissed in this session (initialized lazily)
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(`exit-popup-${service}-dismissed`) === 'true'
    }
    return false
  })
  
  const config = SERVICE_CONFIGS[service]
  
  // Exit intent detection
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (hasTriggered) return
    
    // Only trigger when mouse leaves from top of viewport
    if (e.clientY <= 0) {
      setTimeout(() => {
        setIsVisible(true)
        setHasTriggered(true)
      }, delayMs)
    }
  }, [hasTriggered, delayMs])
  
  // Scroll-based trigger (mobile fallback)
  useEffect(() => {
    if (!showOnScroll || hasTriggered) return
    
    let lastScrollY = window.scrollY
    let scrollUpDistance = 0
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < lastScrollY) {
        scrollUpDistance += lastScrollY - currentScrollY
        
        if (scrollUpDistance > scrollThreshold) {
          setIsVisible(true)
          setHasTriggered(true)
        }
      } else {
        scrollUpDistance = 0
      }
      
      lastScrollY = currentScrollY
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showOnScroll, scrollThreshold, hasTriggered])
  
  // Mouse leave detection
  useEffect(() => {
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [handleMouseLeave])
  
  const handleClose = () => {
    setIsVisible(false)
    sessionStorage.setItem(`exit-popup-${service}-dismissed`, 'true')
  }
  
  const handleClaim = () => {
    // Store discount code in session
    if (config.discountCode) {
      sessionStorage.setItem('discount-code', config.discountCode)
    }
    handleClose()
  }
  
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          
          {/* Popup */}
          <motion.div
            className="fixed inset-x-4 top-1/2 z-50 max-w-lg mx-auto"
            initial={{ opacity: 0, y: '-40%', scale: 0.95 }}
            animate={{ opacity: 1, y: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: '-40%', scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className={cn(
              "relative overflow-hidden rounded-2xl",
              "bg-card border border-border shadow-2xl"
            )}>
              {/* Background gradient */}
              <div className={cn(
                "absolute inset-0 bg-linear-to-br opacity-50",
                config.bgGradient
              )} />
              
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted/50 transition-colors"
                aria-label="Close popup"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <div className="relative p-6 sm:p-8">
                {/* Discount badge */}
                {config.discount && (
                  <motion.div
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4",
                      "bg-linear-to-r from-amber-500 to-orange-500",
                      "text-white font-bold text-sm shadow-lg shadow-amber-500/30"
                    )}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    <Percent className="w-4 h-4" />
                    {config.discount} — Use code {config.discountCode}
                  </motion.div>
                )}
                
                {/* Title */}
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {config.title}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {config.subtitle}
                </p>
                
                {/* Benefits */}
                <ul className="space-y-2 mb-6">
                  {config.benefits.map((benefit, idx) => (
                    <motion.li
                      key={idx}
                      className="flex items-center gap-2 text-sm text-foreground"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                    >
                      <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                      {benefit}
                    </motion.li>
                  ))}
                </ul>
                
                {/* Urgency text */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                  <Clock className="w-4 h-4 text-primary" />
                  {config.urgencyText}
                </div>
                
                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    as={Link}
                    href={config.ctaHref}
                    color="primary"
                    size="lg"
                    className="flex-1 font-semibold shadow-lg shadow-primary/25"
                    onClick={handleClaim}
                    endContent={<ArrowRight className="w-4 h-4" />}
                  >
                    {config.ctaText}
                  </Button>
                  <Button
                    variant="bordered"
                    size="lg"
                    onClick={handleClose}
                    className="sm:w-auto"
                  >
                    Maybe later
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
