/**
 * SEO page type definitions.
 */

export interface ConditionPage {
  slug: string
  name: string
  title: string
  description: string
  h1: string
  heroText: string
  symptoms: string[]
  whenToSeeGP: string[] // Red flags: emergency situations
  whenWeCanHelp: string[] // What we can assess online
  howWeHelp: string[] // Our process steps
  disclaimers: string[]
  faqs: Array<{ q: string; a: string }>
  relatedConditions: string[]
  ctaText?: string
}

export interface CertificatePage {
  slug: string
  name: string
  title: string
  description: string
  h1: string
  heroText: string
  useCases: string[]
  howToUse: string[]
  backdatingInfo: string
  disclaimers: string[]
  faqs: Array<{ q: string; a: string }>
}

export interface BenefitPage {
  slug: string
  name: string
  title: string
  description: string
  h1: string
  sections: Array<{
    title: string
    content: string
  }>
  faqs: Array<{ q: string; a: string }>
}

export interface ResourcePage {
  slug: string
  name: string
  title: string
  description: string
  h1: string
  sections: Array<{
    title: string
    content: string
  }>
  faqs: Array<{ q: string; a: string }>
}
