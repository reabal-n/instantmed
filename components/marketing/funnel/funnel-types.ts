import type React from 'react'
import {
  Shield,
  Clock,
  Lock,
  Check,
  Phone,
  Mail,
  RefreshCw,
  BadgeCheck,
  Building2,
  Users,
  Star,
  FileText,
  Pill,
  Stethoscope,
  ClipboardList,
  FileCheck,
  MessageCircle,
  AlertCircle,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react'

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface ServiceFunnelConfig {
  // Core
  serviceId: 'med-cert' | 'repeat-script' | 'consult'
  serviceName: string
  serviceSlug: string

  // Hero Section
  hero: {
    badge: string
    headline: string
    headlineRotatingWords?: string[]
    subheadline: string
    reassurances: string[]
    ctaText: string
    ctaHref: string
    // Optional hero images
    images?: {
      primary: string
      secondary?: string
    }
    // Subtle highlight badge (e.g., "no phone needed")
    highlightBadge?: {
      text: string
      glow?: boolean
    }
  }

  // Who It's For Section (4 cards)
  whoItsFor: {
    title: string
    subtitle: string
    cards: Array<{
      icon: string
      title: string
      description: string
      type: 'positive' | 'negative' | 'info'
    }>
  }

  // How It Works (3 steps)
  howItWorks: {
    title: string
    subtitle: string
    steps: Array<{
      number: string
      icon: string
      title: string
      description: string
      time?: string
    }>
  }

  // What Happens After
  afterSubmit: {
    title: string
    subtitle: string
    items: Array<{
      icon: string
      title: string
      description: string
    }>
  }

  // Pricing
  pricing: {
    title: string
    subtitle: string
    price: number
    originalPrice?: number | string
    features: string[]
    refundNote: string
    medicareNote: string
  }

  // Trust Section
  trust: {
    title: string
    badges: Array<{
      icon: string
      title: string
      description: string
    }>
  }

  // Testimonials
  testimonials: {
    title: string
    subtitle: string
    reviews: Array<{
      text: string
      author: string
      location: string
      rating: number
    }>
  }

  // FAQ (optional — if provided, rendered as accordion)
  faq?: {
    title: string
    subtitle: string
    items: Array<{
      question: string
      answer: string
    }>
  }

  // Optional daily live stats for hero section
  liveStats?: {
    reviewedToday: number
    avgReviewTime: number
  }

  // Optional mid-page image + text section (rendered between After Submit and Pricing)
  imageSection?: {
    title: string
    highlightWords?: string[]
    description: string
    imageSrc: string
    imageAlt: string
    imagePosition?: 'left' | 'right'
    badges?: Array<{
      icon: string
      text: string
      color?: 'success' | 'primary'
    }>
  }

  // Specialized services (optional — grid of service cards, e.g. consult sub-types)
  specializedServices?: {
    title: string
    subtitle: string
    services: Array<{
      icon: string
      title: string
      description: string
      price: string
      href: string
    }>
  }

  // Final CTA
  finalCta: {
    headline: string
    subheadline: string
    ctaText: string
  }

  // Styling
  accentColor: 'emerald' | 'blue' | 'sky'
}

// ===========================================
// COLOR CLASSES
// ===========================================

export const colorClasses = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    light: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'ring-emerald-500/20',
  },
  blue: {
    gradient: 'from-blue-500 to-sky-600',
    light: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-500/20',
  },
  sky: {
    gradient: 'from-sky-500 to-blue-600',
    light: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800',
    button: 'bg-sky-600 hover:bg-sky-700',
    ring: 'ring-sky-500/20',
  },
}

export type ColorClasses = typeof colorClasses[keyof typeof colorClasses]

// ===========================================
// ICON MAP
// ===========================================

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Clock, Lock, Check, Building2, Users, Star, FileText, Pill,
  Stethoscope, ClipboardList, FileCheck, MessageCircle, AlertCircle,
  Phone, Mail, RefreshCw, BadgeCheck, HelpCircle, Sparkles, CheckCircle2,
}
