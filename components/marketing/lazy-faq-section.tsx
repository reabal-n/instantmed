'use client'

import dynamic from 'next/dynamic'

// Lazy-load FAQSection with ssr: false to avoid HeroUI Accordion SSG crash
// (React Aria collection nodes don't work during static generation)
const FAQSection = dynamic(
  () => import('@/components/marketing/faq-section').then(mod => mod.FAQSection),
  { ssr: false }
)

export function LazyFAQSection() {
  return <FAQSection />
}
