export interface CommercialInternalLink {
  label: string
  href: `/intent/${string}`
  description?: string
}

export const commercialCertificateLinks: CommercialInternalLink[] = [
  {
    label: "Same day medical certificate",
    href: "/intent/same-day-medical-certificate",
    description: "Short illness or carer leave requests reviewed online.",
  },
  {
    label: "Medical certificate for work",
    href: "/intent/medical-certificate-for-work",
    description: "Workplace evidence, absence dates, and privacy boundaries.",
  },
  {
    label: "Online sick certificate",
    href: "/intent/online-sick-certificate",
    description: "Doctor-reviewed sick certificate request pathway.",
  },
  {
    label: "One day certificate",
    href: "/intent/one-day-medical-certificate",
    description: "For a short absence where telehealth review is suitable.",
  },
  {
    label: "Two day certificate",
    href: "/intent/two-day-medical-certificate",
    description: "For a longer short absence, assessed by a doctor.",
  },
  {
    label: "Cold and flu certificate",
    href: "/intent/medical-certificate-for-cold-and-flu",
    description: "Common short-illness evidence with red-flag boundaries.",
  },
  {
    label: "Mental health day certificate",
    href: "/intent/medical-certificate-for-mental-health-day",
    description: "Service-level information for mental health absence evidence.",
  },
  {
    label: "Carer's leave certificate",
    href: "/intent/carers-leave-certificate-online",
    description: "Evidence pathway for caring for an unwell family member.",
  },
  {
    label: "Student medical certificate",
    href: "/intent/student-medical-certificate-online",
    description: "Study absence evidence and institution-policy boundaries.",
  },
  {
    label: "Shift worker certificate",
    href: "/intent/medical-certificate-for-shift-workers",
    description: "Short absence evidence for rostered and weekend work.",
  },
]

export const commercialPrescriptionLinks: CommercialInternalLink[] = [
  {
    label: "Repeat prescription online",
    href: "/intent/repeat-prescription-online",
    description: "Existing regular medicine details, reviewed before any eScript.",
  },
  {
    label: "After-hours repeat prescription",
    href: "/intent/after-hours-repeat-prescription",
    description: "Submit after hours, with review timing and safety boundaries.",
  },
  {
    label: "Weekend repeat prescription",
    href: "/intent/weekend-repeat-prescription",
    description: "Weekend repeat request pathway for existing regular medicines.",
  },
  {
    label: "Urgent repeat prescription",
    href: "/intent/urgent-repeat-prescription-online",
    description: "Time-sensitive repeat review without treating emergencies as admin.",
  },
]

export const commercialComparisonLinks: CommercialInternalLink[] = [
  {
    label: "Online doctor certificate",
    href: "/intent/online-doctor-certificate-australia",
    description: "What online certificate review can and cannot cover.",
  },
  {
    label: "Telehealth certificate vs GP",
    href: "/intent/telehealth-medical-certificate-vs-gp",
    description: "Choose telehealth, a GP visit, or urgent care based on fit.",
  },
  {
    label: "Online certificate comparison",
    href: "/intent/online-medical-certificate-comparison",
    description: "Compare price clarity, doctor review, and privacy.",
  },
  {
    label: "Instant Scripts alternative",
    href: "/intent/instant-scripts-alternative-medical-certificate",
    description: "Compare focused certificate and repeat-request pathways.",
  },
  {
    label: "Bulk-billed vs private telehealth",
    href: "/intent/bulk-billed-telehealth-vs-instantmed",
    description: "Compare cost, availability, and service fit.",
  },
]
