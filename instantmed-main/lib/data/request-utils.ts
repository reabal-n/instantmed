// Client-safe utility functions for formatting request data
// This file has NO server dependencies and can be imported in client components

export function formatRequestType(type: string): string {
  const typeLabels: Record<string, string> = {
    script: "Prescription",
    med_cert: "Medical Certificate",
    referral: "Referral",
    hair_loss: "Hair Loss Treatment",
    acne: "Acne Treatment",
    ed: "ED Treatment",
    hsv: "HSV Treatment",
    bv_partner: "BV Partner Treatment",
    medical_certificate: "Medical Certificate",
    prescription: "Prescription",
    pathology: "Pathology Request",
  }
  return typeLabels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export function formatCategory(category: string | null | undefined): string {
  if (!category) return "Other"
  const labels: Record<string, string> = {
    medical_certificate: "Medical Certificate",
    prescription: "Prescription",
    referral: "Referral",
    pathology: "Pathology",
    other: "Other",
  }
  return labels[category] || category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export function formatSubtype(subtype: string | null | undefined): string {
  if (!subtype) return ""
  const labels: Record<string, string> = {
    work: "Work Certificate",
    university: "University/TAFE Certificate",
    uni: "Uni/School Certificate",
    carer: "Carer's Leave Certificate",
    repeat: "Repeat Prescription",
    chronic_review: "Chronic Medication Review",
    specialist: "Specialist Referral",
    imaging: "Imaging Request",
    bloods: "Blood Tests",
    contraceptive: "Contraceptive Pill",
    uti: "UTI Treatment",
    cold_sore: "Cold Sore",
    reflux: "Reflux",
    erectile_dysfunction: "Erectile Dysfunction",
    premature_ejaculation: "Premature Ejaculation",
    hair_loss: "Hair Loss",
    acne: "Acne",
  }
  return labels[subtype] || subtype.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending Review",
    approved: "Approved",
    declined: "Declined",
    needs_follow_up: "Needs Follow Up",
  }
  return labels[status] || status
}
