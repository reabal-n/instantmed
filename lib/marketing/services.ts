// Service Landing Page Configuration
// All content centralized for easy updates - NO SPECIFIC DRUG NAMES ON MARKETING PAGES

import type { LucideIcon as _LucideIcon } from 'lucide-react'

export interface ServiceFAQ {
  question: string
  answer: string
}

export interface ServiceStep {
  step: number
  title: string
  description: string
  icon: string
}

export interface ServiceConfig {
  // Core
  slug: string
  flowSlug: string // The slug used in /start?service=
  name: string
  shortName: string
  tagline: string
  description: string
  
  // Hero
  heroTitle: string
  heroSubtitle: string
  heroImage: string
  heroImageAlt: string
  
  // Proof strip metrics
  proofMetrics: Array<{
    label: string
    value: string
    icon: string
  }>
  
  // How it works
  steps: ServiceStep[]
  
  // Eligibility
  eligibilityTitle: string
  eligibilityDescription: string
  eligibleFor: string[]
  notEligibleFor: string[]
  
  // Pricing
  priceFrom: number
  pricingNote: string
  pricingFeatures: string[]
  
  // FAQ
  faqs: ServiceFAQ[]
  
  // SEO
  metaTitle: string
  metaDescription: string
  
  // Styling
  accentColor: 'emerald' | 'violet' | 'blue' | 'amber' | 'rose'
  icon: string
}

// ============================================
// MEDICAL CERTIFICATES
// ============================================
export const medicalCertificatesConfig: ServiceConfig = {
  slug: 'medical-certificates',
  flowSlug: 'medical-certificate',
  name: 'Medical Certificates',
  shortName: 'Med Certs',
  tagline: 'Sick leave, carer\'s leave, or fitness-to-work certificates',
  description: 'Get a valid medical certificate for work, university, or official purposes. Reviewed by AHPRA-registered doctors, delivered same-day.',
  
  heroTitle: 'Get a medical certificate without the waiting room',
  heroSubtitle: 'Complete a quick questionnaire, and an Australian doctor reviews your request. If approved, your certificate is delivered directly to your email — typically within an hour.',
  heroImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=500&fit=crop&q=80',
  heroImageAlt: 'Healthcare professional reviewing medical documents on tablet',
  
  proofMetrics: [
    { label: 'Typical turnaround', value: '< 1 hour', icon: 'Zap' },
    { label: 'Valid for', value: 'All employers', icon: 'Building2' },
    { label: 'AHPRA doctors', value: 'Always', icon: 'Shield' },
    { label: 'Secure delivery', value: 'Email + portal', icon: 'Lock' },
  ],
  
  steps: [
    {
      step: 1,
      title: 'Tell us about your absence',
      description: 'Select the type of certificate you need and the dates. Answer a few quick health questions — takes about 2 minutes.',
      icon: 'ClipboardList',
    },
    {
      step: 2,
      title: 'Doctor reviews your request',
      description: 'An AHPRA-registered GP reviews your submission. They may message you if they need clarification.',
      icon: 'Stethoscope',
    },
    {
      step: 3,
      title: 'Receive your certificate',
      description: 'If approved, your medical certificate is sent to your email as a secure PDF. It includes the doctor\'s details and is valid for all employers.',
      icon: 'FileCheck',
    },
  ],
  
  eligibilityTitle: 'Who can use this service?',
  eligibilityDescription: 'Medical certificates are suitable for most common illnesses and absences. Our doctors will assess each request individually.',
  eligibleFor: [
    'Cold, flu, or respiratory illness',
    'Gastro or stomach upset',
    'Migraine or headache',
    'Mental health day (stress, anxiety)',
    'Minor injury or pain',
    'Carer\'s leave for a sick family member',
    'Fitness to return to work',
  ],
  notEligibleFor: [
    'Ongoing or chronic conditions requiring in-person care',
    'Workplace injury claims (WorkCover)',
    'Certificates required for legal proceedings',
    'Backdating beyond 48 hours',
  ],
  
  priceFrom: 19.95,
  pricingNote: 'One flat fee. No hidden costs.',
  pricingFeatures: [
    'Same-day certificate',
    'Valid for employers & institutions',
    'Secure PDF delivery',
    'Doctor\'s name & qualifications included',
    'Message your doctor if needed',
  ],
  
  faqs: [
    {
      question: 'Is this certificate valid for my employer?',
      answer: 'Yes. Our medical certificates are issued by AHPRA-registered Australian doctors and are legally valid for all Australian employers, universities, and institutions. Each certificate includes the doctor\'s name, provider number, and digital signature.',
    },
    {
      question: 'Can I get a certificate for yesterday or earlier?',
      answer: 'We can provide certificates for absences up to 48 hours in the past if clinically appropriate. Beyond that, you\'ll need to see a doctor in person. When requesting a backdated certificate, be prepared to explain why you couldn\'t seek care earlier.',
    },
    {
      question: 'How long can the certificate cover?',
      answer: 'Most certificates cover 1-3 days for acute illnesses. Longer periods may be appropriate for some conditions but require more detailed clinical information. The doctor will determine the appropriate duration based on your symptoms.',
    },
    {
      question: 'What if my request is declined?',
      answer: 'If a doctor determines your request isn\'t suitable for online assessment, you\'ll receive a full refund minus a small admin fee ($4.95). We\'ll explain why and suggest alternatives like seeing your local GP.',
    },
    {
      question: 'Is my information kept private?',
      answer: 'Absolutely. We use bank-level encryption and comply with Australian privacy laws. Your certificate will only show a general category (e.g., "medical condition") — not specific diagnosis details — unless you request otherwise.',
    },
  ],
  
  metaTitle: 'Online Medical Certificates | Same-Day Delivery | InstantMed',
  metaDescription: 'Get a valid medical certificate from an Australian doctor in under an hour. Accepted by all employers. Secure, private, and delivered to your email.',
  
  accentColor: 'emerald',
  icon: 'FileText',
}

// ============================================
// COMMON SCRIPTS / PRESCRIPTIONS
// ============================================
export const commonScriptsConfig: ServiceConfig = {
  slug: 'common-scripts',
  flowSlug: 'common-scripts',
  name: 'Prescription Renewals',
  shortName: 'Repeats',
  tagline: 'Continue your regular medication with a doctor review',
  description: 'Get repeat prescriptions for ongoing medications. Our doctors review your request and send eScripts to your phone via SMS.',
  
  heroTitle: 'Renew your prescription from home',
  heroSubtitle: 'Tell us about your medication, answer a few safety questions, and a doctor reviews your request. If appropriate, your eScript is sent to your phone via SMS.',
  heroImage: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&h=500&fit=crop&q=80',
  heroImageAlt: 'Pharmacist preparing prescription medication',
  
  proofMetrics: [
    { label: 'Turnaround', value: '~1 hour', icon: 'Clock' },
    { label: 'E-script ready', value: 'To your phone', icon: 'Smartphone' },
    { label: 'AHPRA doctors', value: 'Always', icon: 'Shield' },
    { label: 'Any pharmacy', value: 'Australia-wide', icon: 'MapPin' },
  ],
  
  steps: [
    {
      step: 1,
      title: 'Enter your medication',
      description: 'Tell us what medication you need, how long you\'ve been taking it, and answer a few quick safety questions.',
      icon: 'ClipboardList',
    },
    {
      step: 2,
      title: 'Doctor reviews',
      description: 'An AHPRA-registered GP reviews your request. They\'ll check it\'s safe to continue and may ask follow-up questions.',
      icon: 'Stethoscope',
    },
    {
      step: 3,
      title: 'eScript sent to your phone',
      description: 'Your prescription is sent as an eScript via SMS. Take your phone to any pharmacy to collect.',
      icon: 'FileCheck',
    },
  ],
  
  eligibilityTitle: 'Medications we can help with',
  eligibilityDescription: 'We can provide repeat prescriptions for many common, ongoing medications.',
  eligibleFor: [
    'Oral contraceptives',
    'Blood pressure medications',
    'Cholesterol medications',
    'Asthma inhalers (maintenance)',
    'Reflux / heartburn medications',
    'Thyroid medications',
    'Some skin conditions',
    'Diabetes medications (established)',
  ],
  notEligibleFor: [
    'Schedule 8 medications (opioids, stimulants)',
    'Benzodiazepines (Valium, etc.)',
    'Medications requiring regular blood tests (new scripts)',
    'Antibiotics (without infection assessment)',
    'First-time prescriptions for complex conditions',
  ],
  
  priceFrom: 29.95,
  pricingNote: 'Consultation fee only. Medication cost separate at pharmacy.',
  pricingFeatures: [
    'Quick questionnaire',
    'Doctor review',
    'E-script or paper script',
    'Repeats included where appropriate',
    'Medication review',
  ],
  
  faqs: [
    {
      question: 'What information do I need?',
      answer: 'You\'ll need to know the name and strength of your medication, approximately how long you\'ve been taking it, and the name of your usual prescriber (if known). Having your medication box handy helps.',
    },
    {
      question: 'Can I get repeats on my script?',
      answer: 'Where clinically appropriate, yes. The number of repeats depends on the medication and your circumstances. The doctor will determine what\'s suitable based on prescribing guidelines.',
    },
    {
      question: 'What\'s an e-script?',
      answer: 'An e-script (electronic prescription) is a QR code sent to your phone via SMS or email. You show this at any pharmacy to collect your medication — no paper script needed.',
    },
    {
      question: 'Can I send the script to any pharmacy?',
      answer: 'Yes. You can choose to receive an e-script to your phone (valid at any pharmacy) or have us send the script directly to your nominated pharmacy.',
    },
    {
      question: 'What if the doctor needs more information?',
      answer: 'Sometimes the doctor may need to clarify something or check on your last blood tests. They\'ll message you through our secure platform, and most queries are resolved quickly.',
    },
  ],
  
  metaTitle: 'Online Prescription Renewals | E-Scripts Australia | InstantMed',
  metaDescription: 'Renew your regular prescriptions online. Australian doctors review your request and send eScripts to your phone via SMS. Fast and convenient.',
  
  accentColor: 'amber',
  icon: 'Pill',
}

// ============================================
// PRESCRIPTIONS (alias for common-scripts with different slug)
// ============================================
export const prescriptionsConfig: ServiceConfig = {
  ...commonScriptsConfig,
  slug: 'prescriptions',
  flowSlug: 'common-scripts',
  metaTitle: 'Online Prescriptions Australia | Repeat Scripts | InstantMed',
}

// ============================================
// CONFIG REGISTRY
// ============================================
export const serviceConfigs: Record<string, ServiceConfig> = {
  'medical-certificates': medicalCertificatesConfig,
  'common-scripts': commonScriptsConfig,
  'prescriptions': prescriptionsConfig,
}

export function getServiceConfig(slug: string): ServiceConfig | null {
  return serviceConfigs[slug] || null
}

export function getAllServiceSlugs(): string[] {
  return Object.keys(serviceConfigs)
}

// Service categories for navigation/footer
export const serviceNavItems = [
  { slug: 'medical-certificates', label: 'Medical Certificates' },
  { slug: 'prescriptions', label: 'Prescriptions' },
]
