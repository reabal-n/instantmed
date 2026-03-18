/**
 * Audience/occupation page config
 * Used by app/for/[audience]/page.tsx for nurses, teachers, hospitality, etc.
 */

import type { LucideIcon } from "lucide-react"
import {
  Stethoscope,
  GraduationCap,
  Coffee,
  ShoppingBag,
  Briefcase,
  Users,
  Laptop,
  Car,
} from "lucide-react"

export interface AudiencePageConfig {
  slug: string
  badgeLabel: string
  h1: string
  heroSubtext: string
  heroTagline: string
  icon: LucideIcon
  metadata: {
    title: string
    description: string
    keywords: string[]
  }
  faqs: Array<{ q: string; a: string }>
  whyChoose: Array<{ title: string; desc: string }>
  testimonials: Array<{ name: string; role: string; quote: string }>
}

export const audiencePageConfigs: Record<string, AudiencePageConfig> = {
  nurses: {
    slug: "nurses",
    badgeLabel: "For Nurses & Healthcare Workers",
    h1: "Medical Certificates for Nurses",
    heroSubtext:
      "Hospital shifts don't match GP hours. Get your medical certificate in 15 minutes — 8am-10pm, 7 days. Accepted by all healthcare employers.",
    heroTagline: "Works around your roster • Hospitals accept • AHPRA doctors",
    icon: Stethoscope,
    metadata: {
      title: "Medical Certificates for Nurses | Healthcare Workers | InstantMed",
      description:
        "Nurses and healthcare workers: get a medical certificate without leaving home. 15-minute turnaround. Accepted by hospitals and aged care. 8am-10pm, 7 days.",
      keywords: [
        "medical certificate nurses",
        "nurse sick certificate",
        "healthcare worker medical certificate",
        "hospital medical certificate online",
      ],
    },
    faqs: [
      {
        q: "Do hospitals accept online medical certificates?",
        a: "Yes. Our certificates are issued by AHPRA-registered doctors and are valid for all Australian employers, including public and private hospitals, aged care, and healthcare agencies.",
      },
      {
        q: "Can I get a certificate between shifts?",
        a: "Yes. We're available 8am-10pm AEST, 7 days a week. Complete the form during your break or before your next shift.",
      },
      {
        q: "What if I work night shift?",
        a: "Submit your request anytime. If it's after 10pm, we'll process it from 8am. You can also submit in the morning after a night shift.",
      },
    ],
    whyChoose: [
      {
        title: "Healthcare hours, not GP hours",
        desc: "Your shifts don't align with clinic opening times. We're available when you need us.",
      },
      {
        title: "No waiting rooms when you're unwell",
        desc: "The last place you want to be when sick is around more sick people. Get your cert from home.",
      },
      {
        title: "Employers you know accept it",
        desc: "Hospitals, aged care, agencies — they all accept AHPRA-registered doctor certificates.",
      },
    ],
    testimonials: [
      { name: "Sarah M.", role: "RN, Melbourne", quote: "Night shift then sick — got my cert at 7am before I even slept. Lifesaver." },
      { name: "James L.", role: "Aged care, Brisbane", quote: "No way I could get to a GP between shifts. This was so easy." },
    ],
  },
  teachers: {
    slug: "teachers",
    badgeLabel: "For Teachers & Education Staff",
    h1: "Medical Certificates for Teachers",
    heroSubtext:
      "School hours = GP hours. Get your medical certificate in 15 minutes without leaving work. Accepted by DET, Catholic, and independent schools.",
    heroTagline: "No relief needed to see a doctor • All schools accept • 15 min",
    icon: GraduationCap,
    metadata: {
      title: "Medical Certificates for Teachers | Education Staff | InstantMed",
      description:
        "Teachers: get a medical certificate without taking time off. 15-minute turnaround. Accepted by all Australian schools. Complete during lunch or after school.",
      keywords: [
        "medical certificate teachers",
        "teacher sick certificate",
        "DET medical certificate",
        "school staff medical certificate",
      ],
    },
    faqs: [
      {
        q: "Do education departments accept online certificates?",
        a: "Yes. Certificates from AHPRA-registered doctors meet standard requirements across Australian school systems — DET, Catholic, independent.",
      },
      {
        q: "Can I do this during school hours?",
        a: "Yes. The form takes 2 minutes. Complete it during a break or lunch. Certificate arrives via email.",
      },
      {
        q: "What about casual relief teachers?",
        a: "Same process. Get your certificate, forward to your agency or school. Valid for all employers.",
      },
    ],
    whyChoose: [
      {
        title: "No need to arrange relief",
        desc: "Taking time off to see a GP means finding someone to cover your class. We fit into your break.",
      },
      {
        title: "Schools accept it",
        desc: "All Australian education employers accept our certificates. No questions asked.",
      },
      {
        title: "Same-day when you need it",
        desc: "Wake up unwell? Get your cert before school starts or during your first free period.",
      },
    ],
    testimonials: [
      { name: "Emma T.", role: "Primary teacher, Sydney", quote: "Did it during lunch. Had my cert before afternoon class. So much easier than a GP visit." },
      { name: "David K.", role: "High school, Perth", quote: "DET accepted it no problem. Saved me a half-day of leave." },
    ],
  },
  hospitality: {
    slug: "hospitality",
    badgeLabel: "For Hospitality Workers",
    h1: "Medical Certificates for Hospitality",
    heroSubtext:
      "Chefs, waitstaff, hotel workers — your hours don't match GP clinics. Get your certificate in 15 minutes, 8am-10pm, 7 days.",
    heroTagline: "Works around your roster • Restaurants & hotels accept • Fast",
    icon: Coffee,
    metadata: {
      title: "Medical Certificates for Hospitality Workers | InstantMed",
      description:
        "Hospitality workers: get a medical certificate without missing a shift to see a GP. 15-minute turnaround. Accepted by restaurants, hotels, venues.",
      keywords: [
        "medical certificate hospitality",
        "chef sick certificate",
        "waitstaff medical certificate",
        "hotel worker sick leave",
      ],
    },
    faqs: [
      {
        q: "Will my restaurant/hotel accept it?",
        a: "Yes. Our certificates are from AHPRA-registered doctors and are valid for all Australian employers.",
      },
      {
        q: "I work weekends — can I get a cert then?",
        a: "Yes. We're available 8am-10pm, 7 days a week including weekends.",
      },
      {
        q: "What if I need it before my evening shift?",
        a: "Submit in the morning or afternoon. Most certificates are issued within 15 minutes during operating hours.",
      },
    ],
    whyChoose: [
      {
        title: "Your roster, not the clinic's",
        desc: "Hospitality hours rarely overlap with GP opening times. We're here when you need us.",
      },
      {
        title: "No lost shifts",
        desc: "Get your certificate without missing work to queue at a clinic.",
      },
      {
        title: "Venues accept it",
        desc: "Restaurants, hotels, pubs, events — all accept AHPRA-registered certificates.",
      },
    ],
    testimonials: [
      { name: "Marcus P.", role: "Chef, Melbourne", quote: "Hospitality hours make GP visits impossible. This saved me." },
      { name: "Sophie R.", role: "Waitstaff, Brisbane", quote: "Got sick on a Saturday. Had my cert before my Sunday shift. Perfect." },
    ],
  },
  retail: {
    slug: "retail",
    badgeLabel: "For Retail Workers",
    h1: "Medical Certificates for Retail",
    heroSubtext:
      "Supermarkets, shops, warehouses — get your medical certificate in 15 minutes. No need to miss work to see a GP. 8am-10pm, 7 days.",
    heroTagline: "Works around your roster • All retailers accept • 15 min",
    icon: ShoppingBag,
    metadata: {
      title: "Medical Certificates for Retail Workers | InstantMed",
      description:
        "Retail workers: get a medical certificate without a clinic visit. 15-minute turnaround. Accepted by supermarkets, shops, and warehouses.",
      keywords: [
        "medical certificate retail",
        "retail worker sick certificate",
        "supermarket medical certificate",
        "warehouse sick leave",
      ],
    },
    faqs: [
      {
        q: "Will my store accept an online certificate?",
        a: "Yes. Certificates from AHPRA-registered doctors are valid for all Australian employers, including major retailers.",
      },
      {
        q: "I work irregular hours — when can I get one?",
        a: "We're available 8am-10pm AEST, 7 days. Submit when it suits you — before work, on a break, or after your shift.",
      },
    ],
    whyChoose: [
      {
        title: "Retail hours vary",
        desc: "Early starts, late finishes, weekends — we're available when you're not at work.",
      },
      {
        title: "Quick and simple",
        desc: "2-minute form, 15-minute review. Certificate to your email.",
      },
      {
        title: "All employers accept",
        desc: "Coles, Woolworths, independents, warehouses — no exceptions.",
      },
    ],
    testimonials: [
      { name: "Emma T.", role: "Retail manager, Brisbane", quote: "Got sick on a Sunday. Had my cert to HR before Monday. No stress." },
      { name: "Liam S.", role: "Warehouse, Sydney", quote: "Early shift meant I could never see a GP. This fixed that." },
    ],
  },
  "office-workers": {
    slug: "office-workers",
    badgeLabel: "For Office Workers",
    h1: "Medical Certificates for Office Workers",
    heroSubtext:
      "Desk job doesn't mean you have time for a GP visit. Get your medical certificate in 15 minutes from your desk or home. Accepted by all employers.",
    heroTagline: "From your desk or home • 15 min • All employers accept",
    icon: Briefcase,
    metadata: {
      title: "Medical Certificates for Office Workers | InstantMed",
      description:
        "Office workers: get a medical certificate without leaving work or home. 15-minute turnaround. Accepted by corporate and government employers.",
      keywords: [
        "medical certificate office workers",
        "corporate sick certificate",
        "desk job medical certificate",
        "office sick leave",
      ],
    },
    faqs: [
      {
        q: "Will my corporate employer accept it?",
        a: "Yes. AHPRA-registered doctor certificates are valid for all Australian employers, including ASX-listed companies and government.",
      },
      {
        q: "Can I do this from work?",
        a: "Yes. The form takes 2 minutes. Complete it during a break. Your certificate arrives via email — forward to HR.",
      },
    ],
    whyChoose: [
      {
        title: "No need to leave the office",
        desc: "Sick enough to stay home but need a cert? Do it from your couch. Or do it from your desk if you're in.",
      },
      {
        title: "HR accepts it",
        desc: "Corporate and government HR departments accept our certificates. Same as a GP's.",
      },
      {
        title: "Fits your schedule",
        desc: "Lunch break, before work, after work — whenever you have 2 minutes.",
      },
    ],
    testimonials: [
      { name: "Sarah L.", role: "Marketing, Melbourne", quote: "Did it from my desk at lunch. HR accepted it straight away." },
      { name: "Tom W.", role: "Public servant, Canberra", quote: "APS accepted it no questions. Way easier than booking a GP." },
    ],
  },
  parents: {
    slug: "parents",
    badgeLabel: "For Parents",
    h1: "Medical Certificates for Parents",
    heroSubtext:
      "When your child is sick, you need carer's leave — and sometimes a certificate. Get documentation for school or work in 15 minutes. No need to take a sick child to a clinic.",
    heroTagline: "Carer's leave • School absence • No clinic visit needed",
    icon: Users,
    metadata: {
      title: "Medical Certificates for Parents | Carer's Leave | InstantMed",
      description:
        "Parents: get a medical certificate for carer's leave or school absence when your child is sick. No need to take them to a clinic. 15-minute turnaround.",
      keywords: [
        "medical certificate parents",
        "carers leave certificate",
        "sick child medical certificate",
        "school absence certificate",
      ],
    },
    faqs: [
      {
        q: "Can I get a certificate for my child's school absence?",
        a: "Yes. You complete the form on behalf of your child. The doctor assesses and may issue a certificate. Some cases may need a brief call.",
      },
      {
        q: "What about carer's leave for work?",
        a: "Yes. A carer's leave certificate documents that your child needed care. Your employer uses it to approve your leave.",
      },
      {
        q: "Do I need to take my child to a clinic?",
        a: "No. You describe their symptoms. For straightforward cases, we can issue documentation without a clinic visit. If they need urgent care, we'll advise.",
      },
    ],
    whyChoose: [
      {
        title: "Sick kids shouldn't travel",
        desc: "The last thing a sick child needs is a trip to a clinic. Get your certificate from home.",
      },
      {
        title: "School and work sorted",
        desc: "One certificate can cover both — school absence and your carer's leave from work.",
      },
      {
        title: "Quick when you need it",
        desc: "Child woke up sick? Get your cert before you need to call work or the school.",
      },
    ],
    testimonials: [
      { name: "Jessica M.", role: "Parent, Sydney", quote: "Kid was too sick for school. Got the cert without dragging her to a clinic. So much easier." },
      { name: "Chris D.", role: "Parent, Adelaide", quote: "Needed carer's leave for work. Sorted in 15 minutes. HR accepted it." },
    ],
  },
  "remote-workers": {
    slug: "remote-workers",
    badgeLabel: "For Remote Workers",
    h1: "Medical Certificates for Remote Workers",
    heroSubtext:
      "Work from home? Live regionally? Get your medical certificate without leaving the house. 15-minute turnaround. Accepted by all employers.",
    heroTagline: "From anywhere • No commute • All employers accept",
    icon: Laptop,
    metadata: {
      title: "Medical Certificates for Remote Workers | InstantMed",
      description:
        "Remote workers: get a medical certificate from home. No clinic visit, no commute. 15-minute turnaround. Works for WFH and regional workers.",
      keywords: [
        "medical certificate remote workers",
        "work from home sick certificate",
        "regional medical certificate",
        "telehealth medical certificate",
      ],
    },
    faqs: [
      {
        q: "Do I need to see a doctor in person?",
        a: "No. Telehealth consultations are legally equivalent to in-person for medical certificates. Our doctors are AHPRA-registered.",
      },
      {
        q: "I live regionally — can I use this?",
        a: "Yes. Telehealth works anywhere in Australia with internet. Especially useful where GP access is limited.",
      },
      {
        q: "Will my employer accept it?",
        a: "Yes. Certificates from registered doctors are valid for all Australian employers, regardless of where you work from.",
      },
    ],
    whyChoose: [
      {
        title: "You already work from home",
        desc: "Getting a certificate should be just as convenient. No need to leave the house.",
      },
      {
        title: "Regional access",
        desc: "Living outside the city? Telehealth brings healthcare to you.",
      },
      {
        title: "Same validity",
        desc: "Online certificates have the same legal standing as in-person. Employers accept them.",
      },
    ],
    testimonials: [
      { name: "Rachel K.", role: "Remote worker, Byron Bay", quote: "Regional GP wait was 2 weeks. Got my cert in 15 minutes. Game changer." },
      { name: "Alex T.", role: "WFH, Melbourne", quote: "Sick but needed a cert. Did it from bed. So easy." },
    ],
  },
  "gig-workers": {
    slug: "gig-workers",
    badgeLabel: "For Gig & Contract Workers",
    h1: "Medical Certificates for Gig Workers",
    heroSubtext:
      "Uber, Deliveroo, Airtasker — when you're sick you need documentation. Get your medical certificate in 15 minutes. No appointments, no waiting.",
    heroTagline: "No appointments • 15 min • Platforms accept",
    icon: Car,
    metadata: {
      title: "Medical Certificates for Gig Workers | InstantMed",
      description:
        "Gig and contract workers: get a medical certificate when you're sick. Uber, Deliveroo, and other platforms accept our certificates. 15-minute turnaround.",
      keywords: [
        "medical certificate gig workers",
        "uber driver sick certificate",
        "deliveroo medical certificate",
        "contractor sick leave",
      ],
    },
    faqs: [
      {
        q: "Do Uber/Deliveroo accept online certificates?",
        a: "Yes. Our certificates are from AHPRA-registered doctors and meet standard documentation requirements for Australian platforms.",
      },
      {
        q: "I don't get sick leave — do I still need a certificate?",
        a: "Some platforms require documentation for absences. Even without paid leave, a certificate documents your illness if needed.",
      },
      {
        q: "When are you available?",
        a: "8am-10pm AEST, 7 days a week. Submit when it suits you — between gigs or when you're resting.",
      },
    ],
    whyChoose: [
      {
        title: "Your schedule is irregular",
        desc: "No 9-5 means no easy GP visits. We're available when you are.",
      },
      {
        title: "Platforms accept it",
        desc: "Major gig platforms accept AHPRA-registered doctor certificates.",
      },
      {
        title: "Quick when you need it",
        desc: "Sick today? Get your cert today. No waiting for an appointment.",
      },
    ],
    testimonials: [
      { name: "Jake M.", role: "Uber driver, Sydney", quote: "Couldn't work for 2 days. Got my cert, sent to Uber. Sorted." },
      { name: "Mia L.", role: "Deliveroo, Brisbane", quote: "No sick leave but needed to document. This was fast and easy." },
    ],
  },
}

export function getAudiencePageConfig(slug: string): AudiencePageConfig | undefined {
  return audiencePageConfigs[slug]
}

export function getAllAudiencePageSlugs(): string[] {
  return Object.keys(audiencePageConfigs)
}
