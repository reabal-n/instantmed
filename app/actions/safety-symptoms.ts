'use server'

import { getSafetyScreeningSymptoms } from '@/lib/feature-flags'

/**
 * Server action to fetch safety screening symptoms from feature flags
 * Used by client components that need dynamic symptom lists
 */
export async function fetchSafetySymptoms(): Promise<string[]> {
  return getSafetyScreeningSymptoms()
}
