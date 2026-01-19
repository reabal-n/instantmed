/**
 * Option Randomization for Anti-Gaming
 * 
 * ADVERSARIAL_SECURITY_AUDIT EXPLOIT MC-4: Prevents users from learning
 * what options trigger flags by randomizing presentation order.
 * 
 * Also implements progressive disclosure to hide full option set.
 */

/**
 * Shuffle array using Fisher-Yates algorithm
 * Uses a seeded random for consistent randomization per session
 */
export function shuffleOptions<T>(options: T[], sessionSeed?: string): T[] {
  const result = [...options]
  
  // Create a simple seeded random if session seed provided
  // This ensures same user sees same order within a session
  let seedValue = sessionSeed 
    ? sessionSeed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : Date.now()
  
  const seededRandom = () => {
    seedValue = (seedValue * 9301 + 49297) % 233280
    return seedValue / 233280
  }
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  
  return result
}

/**
 * Symptom options with randomization
 */
export const SYMPTOM_OPTIONS = [
  { id: "respiratory", label: "Cold, flu, or respiratory symptoms" },
  { id: "gastro", label: "Stomach or digestive issues" },
  { id: "headache", label: "Headache or migraine" },
  { id: "fatigue", label: "Fatigue or tiredness" },
  { id: "menstrual", label: "Menstrual symptoms" },
  { id: "mental_health", label: "Stress or mental health" },
  { id: "pain", label: "Pain or discomfort" },
  { id: "other", label: "Other symptoms" },
]

/**
 * Get randomized symptom options for a session
 */
export function getRandomizedSymptomOptions(sessionId: string): typeof SYMPTOM_OPTIONS {
  // Keep "other" at the end, randomize the rest
  const mainOptions = SYMPTOM_OPTIONS.filter(o => o.id !== "other")
  const otherOption = SYMPTOM_OPTIONS.find(o => o.id === "other")!
  
  return [...shuffleOptions(mainOptions, sessionId), otherOption]
}

/**
 * Duration options - DON'T reveal exact thresholds
 * ADVERSARIAL_SECURITY_AUDIT: Hide that 5+ days triggers review
 */
export const DURATION_OPTIONS = [
  { id: "1", label: "1 day", value: 1 },
  { id: "2", label: "2 days", value: 2 },
  { id: "3", label: "3 days", value: 3 },
  { id: "4_plus", label: "4 or more days", value: 4 }, // Don't reveal 5-day threshold
]

/**
 * Severity options - use relative terms, not clinical thresholds
 */
export const SEVERITY_OPTIONS = [
  { id: "mild", label: "I can manage but need rest" },
  { id: "moderate", label: "It's affecting my daily activities" },
  { id: "significant", label: "I'm having difficulty functioning" },
]

/**
 * Get randomized severity options
 * Note: We don't randomize severity as order matters for user understanding
 */
export function getSeverityOptions() {
  return SEVERITY_OPTIONS
}

/**
 * Progressive disclosure - don't show all options at once
 * Returns initial options, then more based on context
 */
export function getProgressiveSymptomOptions(
  sessionId: string,
  previousAnswer?: string
): { options: typeof SYMPTOM_OPTIONS; showMore: boolean } {
  const allOptions = getRandomizedSymptomOptions(sessionId)
  
  // Initially show only first 4 options
  if (!previousAnswer) {
    return {
      options: allOptions.slice(0, 4) as typeof SYMPTOM_OPTIONS,
      showMore: true,
    }
  }
  
  // If user clicked "show more" or selected "other", show all
  return {
    options: allOptions,
    showMore: false,
  }
}

/**
 * Treatment duration options for repeat Rx
 * ADVERSARIAL_SECURITY_AUDIT EXPLOIT RX-2: Don't reveal 6-month threshold
 */
export const TREATMENT_DURATION_OPTIONS = [
  { id: "new", label: "Just started (less than 3 months)" },
  { id: "established", label: "Been taking for a while (3+ months)" },
  { id: "long_term", label: "Long-term medication (1+ years)" },
]

/**
 * Get randomized treatment duration options
 * Note: Order matters conceptually, so we don't fully randomize
 * but we do use vague language to hide thresholds
 */
export function getTreatmentDurationOptions() {
  return TREATMENT_DURATION_OPTIONS
}
