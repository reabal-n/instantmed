/**
 * Format a request category for display
 */
export function formatCategory(category: string | null | undefined): string {
  if (!category) return "Unknown"

  const categoryMap: Record<string, string> = {
    medical_certificate: "Medical Certificate",
    prescription: "Prescription",
    pathology: "Pathology",
  }

  return categoryMap[category] || category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Format a request subtype for display
 */
export function formatSubtype(subtype: string | null | undefined): string {
  if (!subtype) return "General"

  const subtypeMap: Record<string, string> = {
    // Medical certificates
    work: "Work",
    university: "University/TAFE",
    carer: "Carer's Leave",
    // Prescriptions
    contraceptive: "Contraceptive Pill",
    uti: "UTI Treatment",
    cold_sore: "Cold Sore",
    reflux: "Reflux",
    erectile_dysfunction: "Erectile Dysfunction",
    premature_ejaculation: "Premature Ejaculation",
    hair_loss: "Hair Loss",
    acne: "Acne",
    // Pathology
    imaging: "Imaging",
    bloods: "Blood Tests",
  }

  return subtypeMap[subtype] || subtype.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Format a request type for display (legacy support)
 */
export function formatRequestType(type: string | null | undefined): string {
  if (!type) return "Request"

  const typeMap: Record<string, string> = {
    medical_certificate: "Medical Certificate",
    prescription: "Prescription",
    pathology: "Pathology Request",
  }

  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}
