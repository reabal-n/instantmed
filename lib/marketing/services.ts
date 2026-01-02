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
  heroImage: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=500&fit=crop',
  heroImageAlt: 'Person receiving medical certificate on laptop',
  
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
// WEIGHT LOSS / WEIGHT MANAGEMENT
// ============================================
export const weightLossConfig: ServiceConfig = {
  slug: 'weight-loss',
  flowSlug: 'weight-management',
  name: 'Weight Management',
  shortName: 'Weight',
  tagline: 'Clinician-guided weight loss programs tailored to you',
  description: 'Work with Australian doctors on a medically supervised weight management plan. Includes assessment, ongoing support, and medication if appropriate.',
  
  heroTitle: 'A doctor-guided approach to weight management',
  heroSubtitle: 'Complete a comprehensive health assessment, and a doctor will review your goals. If suitable, you\'ll receive a personalised plan — which may include medication, lifestyle guidance, or both.',
  heroImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=500&fit=crop',
  heroImageAlt: 'Person tracking health goals on phone',
  
  proofMetrics: [
    { label: 'Initial consult', value: '~2 hours', icon: 'Clock' },
    { label: 'Ongoing support', value: 'Included', icon: 'MessageSquare' },
    { label: 'AHPRA doctors', value: 'Always', icon: 'Shield' },
    { label: 'Personalised plan', value: 'For you', icon: 'Target' },
  ],
  
  steps: [
    {
      step: 1,
      title: 'Complete your health assessment',
      description: 'Answer detailed questions about your health history, current weight, goals, and any previous weight loss attempts. This takes about 10 minutes.',
      icon: 'ClipboardList',
    },
    {
      step: 2,
      title: 'Doctor consultation',
      description: 'An AHPRA-registered GP reviews your assessment. They may request additional information or suggest a video consultation to discuss your options.',
      icon: 'Stethoscope',
    },
    {
      step: 3,
      title: 'Receive your plan',
      description: 'If appropriate, you\'ll receive a personalised weight management plan. This may include medication (sent to your pharmacy), dietary guidance, and ongoing check-ins.',
      icon: 'FileCheck',
    },
  ],
  
  eligibilityTitle: 'Is this service right for you?',
  eligibilityDescription: 'Our weight management program is designed for adults looking for medical support with their weight loss journey.',
  eligibleFor: [
    'Adults 18+ with a BMI of 27 or higher',
    'People who have tried diet and exercise without success',
    'Those seeking medically supervised support',
    'People without contraindications to weight management medications',
  ],
  notEligibleFor: [
    'Under 18 years of age',
    'Pregnant or breastfeeding',
    'History of eating disorders (active)',
    'Certain heart conditions or uncontrolled blood pressure',
    'Some medication interactions',
  ],
  
  priceFrom: 49.95,
  pricingNote: 'Initial consultation fee. Medication costs are separate and may be PBS-subsidised.',
  pricingFeatures: [
    'Comprehensive health assessment',
    'Doctor consultation',
    'Personalised treatment plan',
    'Medication prescription (if appropriate)',
    'Ongoing support & check-ins',
  ],
  
  faqs: [
    {
      question: 'What medications might be prescribed?',
      answer: 'Our doctors may prescribe TGA-approved weight management medications if clinically appropriate. The specific medication depends on your health profile, goals, and any contraindications. All options will be discussed with you before prescribing.',
    },
    {
      question: 'Do I need to have tried other weight loss methods first?',
      answer: 'Generally, yes. Weight management medications are most appropriate for people who have tried lifestyle changes (diet and exercise) without achieving their goals. Your doctor will discuss your history as part of the assessment.',
    },
    {
      question: 'How long does the program last?',
      answer: 'Weight management is typically an ongoing journey. After your initial consultation, you\'ll have regular check-ins (usually monthly) to monitor progress, adjust your plan, and renew any prescriptions if needed.',
    },
    {
      question: 'Are the medications covered by PBS?',
      answer: 'Some weight management medications are PBS-subsidised for eligible patients. Your doctor will discuss costs and eligibility during your consultation. Out-of-pocket costs vary depending on the medication and your circumstances.',
    },
    {
      question: 'What if I\'m not eligible?',
      answer: 'If our doctors determine that medication isn\'t right for you, you\'ll receive a full refund of the consultation fee. We\'ll also provide recommendations for alternative approaches or refer you to appropriate services.',
    },
  ],
  
  metaTitle: 'Weight Management Program | Doctor-Guided | InstantMed',
  metaDescription: 'Work with Australian doctors on a personalised weight management plan. Includes assessment, medication if appropriate, and ongoing support.',
  
  accentColor: 'violet',
  icon: 'Scale',
}

// ============================================
// MEN'S HEALTH
// ============================================
export const mensHealthConfig: ServiceConfig = {
  slug: 'mens-health',
  flowSlug: 'mens-health',
  name: 'Men\'s Health',
  shortName: 'Men\'s',
  tagline: 'Discreet consultations for common men\'s health concerns',
  description: 'Get confidential support for men\'s health issues. From sexual health to hair loss, our doctors provide discreet, judgement-free care.',
  
  heroTitle: 'Discreet men\'s health care, from home',
  heroSubtitle: 'Complete a confidential questionnaire, and a doctor reviews your request. If treatment is appropriate, prescriptions are sent directly to your pharmacy — discreetly packaged.',
  heroImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=500&fit=crop',
  heroImageAlt: 'Man using telehealth on phone',
  
  proofMetrics: [
    { label: 'Turnaround', value: '~1 hour', icon: 'Clock' },
    { label: '100% discreet', value: 'Always', icon: 'EyeOff' },
    { label: 'AHPRA doctors', value: 'Always', icon: 'Shield' },
    { label: 'Direct to pharmacy', value: 'E-script', icon: 'Pill' },
  ],
  
  steps: [
    {
      step: 1,
      title: 'Answer confidential questions',
      description: 'Complete a private health questionnaire about your concerns. All information is kept strictly confidential and encrypted.',
      icon: 'ClipboardList',
    },
    {
      step: 2,
      title: 'Doctor consultation',
      description: 'An AHPRA-registered doctor reviews your submission. They may message you for clarification or recommend a brief phone call.',
      icon: 'Stethoscope',
    },
    {
      step: 3,
      title: 'Receive your treatment',
      description: 'If treatment is appropriate, your prescription is sent directly to your chosen pharmacy as an e-script. Packaging is always discreet.',
      icon: 'FileCheck',
    },
  ],
  
  eligibilityTitle: 'Conditions we can help with',
  eligibilityDescription: 'Our doctors can assess and treat many common men\'s health concerns via telehealth.',
  eligibleFor: [
    'Erectile function concerns',
    'Premature concerns',
    'Hair loss (male pattern)',
    'Low energy or fatigue',
    'STI testing',
    'General men\'s wellness',
  ],
  notEligibleFor: [
    'Chest pain or heart attack symptoms',
    'Severe or sudden onset symptoms',
    'Conditions requiring physical examination',
    'Testosterone therapy (initial prescription)',
  ],
  
  priceFrom: 29.95,
  pricingNote: 'Consultation fee. Medication costs are separate at your pharmacy.',
  pricingFeatures: [
    'Confidential consultation',
    'AHPRA-registered doctor',
    'Prescription (if appropriate)',
    'E-script to any pharmacy',
    'Discreet packaging',
    'Ongoing support available',
  ],
  
  faqs: [
    {
      question: 'Is this service really private?',
      answer: 'Absolutely. All consultations are confidential and encrypted. Your pharmacy receives only the prescription — not your consultation details. Medications are dispensed with discreet labelling.',
    },
    {
      question: 'What medications can be prescribed?',
      answer: 'Our doctors can prescribe TGA-approved medications for common men\'s health conditions. The specific treatment depends on your health assessment and will be discussed before prescribing.',
    },
    {
      question: 'Do I need to have a video call?',
      answer: 'Most requests can be completed via questionnaire and messaging. However, for some conditions or if the doctor needs more information, they may request a brief phone or video call at no extra charge.',
    },
    {
      question: 'Can I get ongoing prescriptions?',
      answer: 'Yes. Once you\'ve had an initial consultation, follow-up prescriptions are often simpler. You\'ll have regular check-ins to ensure your treatment is working well.',
    },
    {
      question: 'What if the doctor can\'t help me?',
      answer: 'If your condition requires in-person care or isn\'t suitable for telehealth, we\'ll let you know and provide a full refund minus a small admin fee. We\'ll also recommend appropriate next steps.',
    },
  ],
  
  metaTitle: 'Men\'s Health Online | Discreet & Confidential | InstantMed',
  metaDescription: 'Discreet men\'s health consultations with Australian doctors. ED, hair loss, and more. Prescriptions sent directly to your pharmacy.',
  
  accentColor: 'blue',
  icon: 'User',
}

// ============================================
// COMMON SCRIPTS / PRESCRIPTIONS
// ============================================
export const commonScriptsConfig: ServiceConfig = {
  slug: 'common-scripts',
  flowSlug: 'common-scripts',
  name: 'Prescription Renewals',
  shortName: 'Scripts',
  tagline: 'Continue your regular medication without the GP wait',
  description: 'Get repeat prescriptions for ongoing medications. Our doctors review your request and send scripts directly to your pharmacy.',
  
  heroTitle: 'Renew your prescription from home',
  heroSubtitle: 'Tell us about your medication, answer a few safety questions, and a doctor reviews your request. If appropriate, your script is sent straight to your pharmacy.',
  heroImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=500&fit=crop',
  heroImageAlt: 'Prescription being sent to pharmacy',
  
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
      title: 'Script sent to pharmacy',
      description: 'Your prescription is sent as an e-script to your phone, or directly to your chosen pharmacy. Ready to collect same-day.',
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
  metaDescription: 'Renew your regular prescriptions online. Australian doctors review your request and send e-scripts directly to your pharmacy. Fast and convenient.',
  
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
  'weight-loss': weightLossConfig,
  'mens-health': mensHealthConfig,
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
  { slug: 'weight-loss', label: 'Weight Management' },
  { slug: 'mens-health', label: 'Men\'s Health' },
]
