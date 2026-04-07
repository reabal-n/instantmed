/**
 * Symptom Text Quality Validator
 *
 * Detects gibberish or filler in the free-text symptom description before the
 * intake reaches payment, AI draft generation, or the doctor queue.
 *
 * Catches the "my doonis is vibration" class of input — text that satisfies
 * the basic length minimum but contains no actual symptom information.
 *
 * Defense-in-depth: the AI clinical-note generator and the auto-approval
 * eligibility engine still run downstream — this is the first gate, not the
 * last one. A user who appends a real symptom word to gibberish will pass
 * here and be caught (or not) by the AI in the next layer.
 */

const MIN_DISTINCT_WORDS = 3
const MIN_TEXT_LENGTH = 20

/**
 * Curated stems patients use to describe symptoms. Substring match is
 * deliberate so plurals, conjugations, and possessives pass without a stemmer
 * (e.g. "feel" matches "feeling"/"feels"/"felt"; "cough" matches "coughing").
 *
 * Coverage areas: body parts, sensations, time/severity context, functional
 * impact, common conditions. Keep total under ~200 — beyond that, vocabulary
 * noise outweighs precision and false positives creep in.
 *
 * Maintenance: add new stems when patient feedback or PostHog flags real
 * descriptions being incorrectly blocked.
 */
export const SYMPTOM_VOCABULARY: readonly string[] = [
  // Body parts
  "head", "throat", "chest", "stomach", "tummy", "belly", "back", "neck",
  "arm", "leg", "foot", "feet", "hand", "knee", "ankle", "wrist", "shoulder",
  "eye", "ear", "nose", "mouth", "tooth", "teeth", "jaw", "hip", "elbow",
  "skin", "muscle", "joint", "bone", "lung", "heart", "kidney", "bladder",
  "sinus", "rib", "spine", "groin",

  // Symptoms / sensations
  "pain", "ache", "sore", "fever", "feverish",
  "cold", "flu", "cough", "sneeze", "runny", "blocked", "congest",
  "hurt", "sick", "ill", "unwell", "nausea", "nauseous", "vomit", "throw",
  "dizzy", "tired", "fatigue", "exhaust", "weak", "drained",
  "sweat", "chill", "shiver", "rash", "itch",
  "swell", "swollen", "bleed", "bruise", "burn",
  "cramp", "spasm", "tight", "tense", "stiff",
  "discharge", "infect", "inflam", "tender",
  "diarrhoea", "diarrhea", "constipat", "indigest", "bloat", "gas",
  "headache", "migraine", "period", "menstrual",
  "insomnia", "anxious", "anxiety", "stress", "depress", "panic",
  "shortness", "breath", "wheez", "phlegm", "mucus",
  "asthma", "allergy", "allergic",
  "vertigo", "faint", "tremor", "numb",
  "blister", "lump", "swelling",

  // Time / severity / context
  "since", "yesterday", "morning", "night", "today", "day", "week",
  "hour", "ago", "started", "began", "last",
  "severe", "mild", "moderate", "worse", "constant",
  "intermittent", "throbbing", "sharp", "dull", "stab",
  "recurring", "ongoing", "sudden", "gradual",

  // Functional impact / language
  "feel", "felt", "unable", "cannot", "difficult",
  "struggling", "suffer", "experienc", "noticing",
  "concentrate", "sleep", "work", "function", "energy",
  "appetite", "rest", "barely",
] as const

export interface SymptomTextQualityResult {
  valid: boolean
  reason?: string
}

const GENERIC_REASON =
  "Please describe your symptoms in plain English — e.g. \"fever and headache since yesterday\""

/**
 * Validate that a free-text symptom description looks like a real description,
 * not gibberish, filler, or repeated tokens.
 *
 * Checks (in order):
 * 1. Minimum 20 characters (matches existing schema)
 * 2. At least 3 distinct alphabetic tokens (≥2 chars each)
 * 3. At least one symptom-vocabulary stem present
 */
export function validateSymptomTextQuality(
  text: string | undefined | null,
): SymptomTextQualityResult {
  const trimmed = (text ?? "").trim()

  if (trimmed.length < MIN_TEXT_LENGTH) {
    return {
      valid: false,
      reason: `Please describe your symptoms (minimum ${MIN_TEXT_LENGTH} characters)`,
    }
  }

  const tokens = trimmed
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 2)
  const distinctWords = new Set(tokens)

  if (distinctWords.size < MIN_DISTINCT_WORDS) {
    return { valid: false, reason: GENERIC_REASON }
  }

  const lower = trimmed.toLowerCase()
  const hasStem = SYMPTOM_VOCABULARY.some((stem) => lower.includes(stem))
  if (!hasStem) {
    return { valid: false, reason: GENERIC_REASON }
  }

  return { valid: true }
}
