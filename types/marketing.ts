/**
 * Marketing types shared between lib/marketing/ configs and components/marketing/.
 */

export interface ServiceFunnelConfig {
  // Core
  serviceId: 'med-cert' | 'repeat-script' | 'consult'
  serviceName: string
  serviceSlug: string

  // Hero Section.
  // Note: `headlineGradient`, `headlineRotatingWords`, `reassurances`, and
  // `highlightBadge` were removed in 2026-04-28 when the funnel hero
  // migrated to wrap the canonical <Hero> primitive. The funnel page's
  // dedicated TrustBadgeSlider + StatsStrip surfaces below the hero now
  // carry the trust weight that those fields used to.
  hero: {
    badge: string
    headline: string
    subheadline: string
    ctaText: string
    ctaHref: string
    images?: {
      primary: string
      secondary?: string
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


  // FAQ
  faq?: {
    title: string
    subtitle: string
    items: Array<{
      question: string
      answer: string
    }>
  }

  // Optional mid-page image + text section
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

  // Specialized services (optional)
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
