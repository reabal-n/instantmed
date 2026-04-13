/**
 * Marketing types shared between lib/marketing/ configs and components/marketing/.
 */

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
    images?: {
      primary: string
      secondary?: string
    }
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

  // FAQ
  faq?: {
    title: string
    subtitle: string
    items: Array<{
      question: string
      answer: string
    }>
  }

  // Optional daily live stats
  liveStats?: {
    reviewedToday: number
    avgReviewTime: number
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
