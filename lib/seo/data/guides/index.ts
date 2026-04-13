/**
 * Barrel file for guide category modules.
 * Re-exports everything and constructs the combined guides object
 * so existing consumers don't need to change.
 */

import type { GuideData, GuideIndexEntry } from "../guides"
import { medCertGuides } from "./medical-certificates"
import { prescriptionGuides } from "./prescriptions"
import { telehealthGuides } from "./telehealth"

export {
  medCertGuides,
  prescriptionGuides,
  telehealthGuides,
}

/** Combined guides record -- identical shape to the original monolith */
export const guides: Record<string, GuideData> = {
  ...medCertGuides,
  ...telehealthGuides,
  ...prescriptionGuides,
}

/** Lightweight index for sitemap / listing pages */
export const GUIDE_INDEX: GuideIndexEntry[] = [
  {
    slug: "how-to-get-medical-certificate-for-work",
    title: "How to Get a Medical Certificate for Work",
    description: "A complete guide to getting a valid medical certificate for work in Australia. Learn your options, what employers accept, and the fastest ways to get one.",
    readTime: "6 min read",
    category: "Medical Certificates",
  },
  {
    slug: "how-to-get-sick-note-for-uni",
    title: "How to Get a Sick Note for University",
    description: "Need a medical certificate for a missed exam, assignment extension, or university absence? Here's how to get one quickly.",
    readTime: "5 min read",
    category: "Medical Certificates",
  },
  {
    slug: "telehealth-guide-australia",
    title: "Complete Guide to Telehealth in Australia",
    description: "Everything you need to know about telehealth - what it is, how it works, what can be treated, and how to choose a service.",
    readTime: "8 min read",
    category: "Telehealth",
  },
  {
    slug: "medical-certificate-centrelink",
    title: "How to Get a Medical Certificate for Centrelink",
    description: "Need a medical certificate for Centrelink? Learn what each payment type requires, avoid common mistakes, and get compliant documentation fast.",
    readTime: "7 min read",
    category: "Medical Certificates",
  },
  {
    slug: "when-to-use-telehealth",
    title: "When to Use Telehealth vs See a Doctor In Person",
    description: "Not sure if telehealth is right for your situation? Learn when online consultations work well and when you need to see a doctor in person.",
    readTime: "6 min read",
    category: "Telehealth",
  },
  {
    slug: "how-to-get-repeat-prescription-online",
    title: "How to Get a Repeat Prescription Online in Australia",
    description: "Need a repeat prescription but can't get to your GP? Learn how to get prescriptions renewed online in Australia.",
    readTime: "5 min read",
    category: "Prescriptions",
  },
  {
    slug: "medical-certificate-for-carers-leave",
    title: "How to Get a Medical Certificate for Carer's Leave",
    description: "Need time off to care for a sick family member? Learn your entitlements, how to get a certificate, and what your employer can and can't ask.",
    readTime: "6 min read",
    category: "Medical Certificates",
  },
  {
    slug: "telehealth-first-time-guide",
    title: "Telehealth First Time: A Complete Guide for Australians",
    description: "Never used telehealth before? This guide walks you through your first online doctor consultation step by step.",
    readTime: "5 min read",
    category: "Telehealth",
  },
  {
    slug: "how-to-claim-medicare-rebate-telehealth",
    title: "How to Claim a Medicare Rebate for Telehealth",
    description: "Can you claim Medicare for telehealth? Learn how rebates work for online doctor consultations in Australia.",
    readTime: "4 min read",
    category: "Telehealth",
  },
  {
    slug: "medical-certificate-employer-requirements",
    title: "What Employers Can and Can't Ask For in a Medical Certificate",
    description: "Understanding your rights: what employers can request in a medical certificate and what they cannot demand.",
    readTime: "5 min read",
    category: "Medical Certificates",
  },
  {
    slug: "escript-vs-paper-prescription",
    title: "eScript vs Paper Prescription in Australia",
    description: "Everything about electronic prescriptions (eScripts) - how they work, where they're accepted, how repeats work, and common questions.",
    readTime: "6 min read",
    category: "Prescriptions",
  },
  {
    slug: "mental-health-certificate-australia",
    title: "How to Get a Medical Certificate for a Mental Health Day",
    description: "Mental health days are legitimate sick leave in Australia. Learn how to get a medical certificate for mental health without an in-person visit.",
    readTime: "5 min read",
    category: "Medical Certificates",
  },
  {
    slug: "medical-certificate-for-surgery-recovery",
    title: "How to Get a Medical Certificate for Surgery Recovery",
    description: "Need time off work after surgery? Learn how to get a medical certificate covering your recovery period in Australia.",
    readTime: "4 min read",
    category: "Medical Certificates",
  },
  {
    slug: "telehealth-for-prescriptions-australia",
    title: "Getting Prescriptions Through Telehealth in Australia",
    description: "Can you get a prescription through telehealth? Learn what medications can be prescribed online and how the process works.",
    readTime: "6 min read",
    category: "Prescriptions",
  },
  {
    slug: "what-employers-can-ask-medical-certificate",
    title: "What Can Employers Ask About Your Medical Certificate?",
    description: "Know your rights. Learn what information employers can and cannot request regarding your medical certificate in Australia.",
    readTime: "5 min read",
    category: "Medical Certificates",
  },
  {
    slug: "medical-certificate-casual-workers",
    title: "Do Casual Workers Need Medical Certificates?",
    description: "Guide for casual employees on when medical certificates are required and your entitlements under Australian workplace law.",
    readTime: "4 min read",
    category: "Medical Certificates",
  },
]

export const GUIDE_SLUGS = GUIDE_INDEX.map((g) => g.slug) as readonly string[]

export function getAllGuideSlugs(): string[] {
  return GUIDE_INDEX.map((g) => g.slug)
}

export function getGuideIndex(): GuideIndexEntry[] {
  return [...GUIDE_INDEX]
}
