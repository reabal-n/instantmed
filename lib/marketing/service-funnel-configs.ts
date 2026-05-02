import { PRICING_DISPLAY } from "@/lib/constants"
import type { ServiceFunnelConfig } from '@/types/marketing'

// repeatScriptFunnelConfig was retired 2026-04-28: /repeat-prescriptions
// route now 301s to /prescriptions (which has the richer bespoke landing
// with TimeComparisonViz, PBSCalloutStrip, ServiceComparisonSection, and
// the canonical Hero migration). One canonical repeat-Rx page, one
// canonical pattern.

// ===========================================
// GENERAL CONSULT LANDING PAGE
// ===========================================
export const generalConsultFunnelConfig: ServiceFunnelConfig = {
  serviceId: 'consult',
  serviceName: 'General Consult',
  serviceSlug: 'consult',

  hero: {
    badge: 'Australian GP consultations',
    headline: 'See a doctor today. From your phone.',
    subheadline: `Talk to an AHPRA-registered GP about health concerns, treatment options, or anything you'd normally see a doctor for. Medication may be prescribed by your doctor if clinically appropriate.`,
    ctaText: `Start your consult · ${PRICING_DISPLAY.CONSULT}`,
    ctaHref: '/request?service=consult',
  },

  specializedServices: {
    title: 'Specialised consultations',
    subtitle: 'Looking for something specific? We offer dedicated pathways with doctors experienced in these areas.',
    services: [
      {
        icon: 'Shield',
        title: 'Erectile Dysfunction',
        description: 'Discreet assessment and treatment for ED. Clinically proven medications prescribed if appropriate.',
        price: PRICING_DISPLAY.MENS_HEALTH,
        href: '/erectile-dysfunction',
      },
      {
        icon: 'Sparkles',
        title: 'Hair Loss',
        description: 'Medical assessment for hair loss. Evidence-based treatments prescribed by an Australian GP.',
        price: PRICING_DISPLAY.HAIR_LOSS,
        href: '/hair-loss',
      },
      {
        icon: 'Stethoscope',
        title: 'Women\'s Health',
        description: 'Contraception, hormonal concerns, and general women\'s health. Compassionate, confidential care.',
        price: PRICING_DISPLAY.WOMENS_HEALTH,
        href: '/request?service=consult',
      },
      {
        icon: 'ClipboardList',
        title: 'Weight Management',
        description: 'Doctor-guided weight management plans. Medication options discussed if clinically appropriate.',
        price: PRICING_DISPLAY.WEIGHT_LOSS,
        href: '/request?service=consult',
      },
    ],
  },

  whoItsFor: {
    title: 'Is this right for you?',
    subtitle: 'General consults are suitable for many common health concerns. Here\'s what to know.',
    cards: [
      {
        icon: 'Check',
        title: 'New health concerns',
        description: 'Skin conditions, minor infections, cold/flu symptoms, allergies, or other non-urgent health issues you want assessed.',
        type: 'positive',
      },
      {
        icon: 'Check',
        title: 'Treatment advice',
        description: 'Not sure if you need medication? Want a second opinion? A doctor can assess and advise on appropriate treatment.',
        type: 'positive',
      },
      {
        icon: 'AlertCircle',
        title: 'Call may be required',
        description: 'Unlike med certs, general consults often require a brief phone or video call so the doctor can properly assess you.',
        type: 'info',
      },
      {
        icon: 'AlertCircle',
        title: 'Not for emergencies',
        description: 'Chest pain, difficulty breathing, severe symptoms? Call 000 or go to emergency. This service is not for urgent care.',
        type: 'negative',
      },
    ],
  },

  howItWorks: {
    title: 'Three steps. A real doctor.',
    subtitle: 'Start with a questionnaire, then a doctor assesses your situation, often with a brief call.',
    steps: [
      {
        number: '1',
        icon: 'ClipboardList',
        title: 'Describe your concern',
        description: 'Tell us what\'s going on and answer health questions. This helps the doctor prepare for your consult.',
        time: '3-5 min',
      },
      {
        number: '2',
        icon: 'Stethoscope',
        title: 'Doctor assessment',
        description: 'A doctor reviews your information and will often call you to discuss further. This ensures a proper clinical assessment.',
        time: 'Within 2 hours',
      },
      {
        number: '3',
        icon: 'FileCheck',
        title: 'Treatment plan',
        description: 'The doctor provides advice, prescriptions if appropriate, or referrals if you need further care.',
        time: 'Doctor review',
      },
    ],
  },

  afterSubmit: {
    title: 'What happens after you submit?',
    subtitle: 'General consults involve more assessment than our other services. Here\'s what to expect.',
    items: [
      {
        icon: 'Clock',
        title: 'Review within 2 hours',
        description: 'A doctor will review your submission and prepare for your consultation. Response times may be longer for complex cases.',
      },
      {
        icon: 'Phone',
        title: 'Expect a call',
        description: 'For most general consults, the doctor will call you to discuss your symptoms. Please keep your phone nearby.',
      },
      {
        icon: 'MessageCircle',
        title: 'Follow-up via messaging',
        description: 'After your consult, you can message the doctor with follow-up questions through our secure platform.',
      },
      {
        icon: 'RefreshCw',
        title: 'If we can\'t help',
        description: 'If your concern requires in-person examination, we\'ll advise you and provide a full refund.',
      },
    ],
  },

  pricing: {
    title: 'One flat fee. Save $30 to $70 vs a clinic.',
    subtitle: `${PRICING_DISPLAY.CONSULT} flat fee. No gap fees, no surprises. Same quality of care as in-person.`,
    price: 49.95,
    originalPrice: 120,
    features: [
      'Full clinical assessment by an AHPRA-registered GP',
      'Phone or video consultation',
      'Medication if clinically appropriate',
      'Referral letters if needed',
      'Follow-up messaging with your doctor',
      'Written summary of your consultation',
    ],
    refundNote: 'Full refund if we can\'t help with your concern',
    medicareNote: 'Medicare rebates do not apply to telehealth consultations',
  },

  trust: {
    title: 'Quality care you can trust',
    badges: [
      {
        icon: 'BadgeCheck',
        title: 'AHPRA Registered',
        description: 'All doctors are registered with the Australian Health Practitioner Regulation Agency',
      },
      {
        icon: 'Building2',
        title: 'Australian-based',
        description: 'Our doctors and team are 100% based in Australia',
      },
      {
        icon: 'Lock',
        title: 'Secure & Private',
        description: 'Bank-level encryption. Doctor-patient confidentiality maintained.',
      },
      {
        icon: 'Shield',
        title: 'Clinical Standards',
        description: 'Same standard of care as in-person doctor visits',
      },
    ],
  },

  faq: {
    title: 'Common questions',
    subtitle: 'Everything you need to know about online consultations.',
    items: [
      {
        question: 'Will the doctor call me?',
        answer: 'For most general consults, yes. The doctor will review your questionnaire first, then call to discuss your symptoms. Keep your phone nearby after submitting.',
      },
      {
        question: 'Can I get a prescription from a consult?',
        answer: 'Yes. If the doctor determines medication is clinically appropriate, they\'ll send an eScript to your phone. You can collect it at any pharmacy.',
      },
      {
        question: 'What about referrals and pathology?',
        answer: 'The doctor can provide referral letters and pathology requests if they believe further investigation is needed. These are included in your consultation fee.',
      },
      {
        question: 'How is this different from a GP visit?',
        answer: 'You get the same quality of care from an AHPRA-registered GP, just without the waiting room. The main limitation is the doctor can\'t physically examine you, so some conditions may still need an in-person visit.',
      },
      {
        question: 'What if my issue needs in-person care?',
        answer: 'If the doctor determines your concern requires a physical examination, they\'ll let you know and recommend seeing a GP in person. You\'ll receive a full refund.',
      },
    ],
  },

  finalCta: {
    headline: 'Talk to a doctor from home',
    subheadline: 'Start with a quick questionnaire. A doctor reviews and typically calls within 2 hours.',
    ctaText: 'Talk to a doctor today',
  },

  accentColor: 'sky',
}
