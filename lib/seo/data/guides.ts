/**
 * Guide page data - single source of truth for sitemap, routing, and index
 */

export interface GuideIndexEntry {
  slug: string
  title: string
  description: string
  readTime: string
  category: string
}

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
    description: "Everything you need to know about telehealth — what it is, how it works, what can be treated, and how to choose a service.",
    readTime: "8 min read",
    category: "Telehealth",
  },
  {
    slug: "medical-certificate-centrelink",
    title: "How to Get a Medical Certificate for Centrelink",
    description: "Need a medical certificate for Centrelink or a government agency? Learn what's required, how to get one, and what doctors can certify.",
    readTime: "5 min read",
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
    description: "Need to document carer's leave for work? Learn how to get a medical certificate when caring for a sick family member.",
    readTime: "4 min read",
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
    title: "eScript vs Paper Prescription: What's the Difference?",
    description: "eScripts are replacing paper prescriptions in Australia. Learn how they work and why they're often more convenient.",
    readTime: "4 min read",
    category: "Prescriptions",
  },
]

export const GUIDE_SLUGS = GUIDE_INDEX.map((g) => g.slug) as readonly string[]

export function getAllGuideSlugs(): string[] {
  return GUIDE_INDEX.map((g) => g.slug)
}

export function getGuideIndex(): GuideIndexEntry[] {
  return [...GUIDE_INDEX]
}
