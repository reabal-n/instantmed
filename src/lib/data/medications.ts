export interface Medication {
  id: string
  name: string
  category: string
  slug?: string
  [key: string]: unknown
}

export const medications: Medication[] = []

export function getAllCategories(): string[] {
  return []
}

export function getPopularMedications(): Medication[] {
  return []
}

export function searchMedications(query: string): Medication[] {
  return []
}

export function getMedicationBySlug(slug: string): Medication | null {
  return null
}

export function getMedicationsByCategory(category: string): Medication[] {
  return []
}

export const CATEGORY_LABELS: Record<string, string> = {}

export const CATEGORY_ICONS: Record<string, React.ComponentType> = {}
