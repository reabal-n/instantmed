/**
 * Symptom Text Quality Validator
 *
 * Detects gibberish or filler in the free-text symptom description before the
 * intake reaches payment, AI draft generation, or the doctor queue.
 *
 * Catches the "my doonis is vibration" class of input - text that satisfies
 * the basic length minimum but contains no actual symptom information.
 *
 * Defense-in-depth: the AI clinical-note generator and the auto-approval
 * eligibility engine still run downstream - this is the first gate, not the
 * last one. A user who appends a real symptom word to gibberish will pass
 * here and be caught (or not) by the AI in the next layer.
 */

// No length or word-count gate (2026-05-29): patients describe briefly
// ("migraine", "bad back today") and advance. The only floor is the
// anti-gibberish symptom-vocabulary stem check below, plus non-empty. The
// char + distinct-word minimums were removed because they drove the
// symptoms-step drop-off without adding protection the stem check lacks.

/**
 * Curated stems patients use to describe symptoms. Substring match is
 * deliberate so plurals, conjugations, and possessives pass without a stemmer
 * (e.g. "feel" matches "feeling"/"feels"/"felt"; "cough" matches "coughing").
 *
 * Coverage areas: body parts, sensations, time/severity context, functional
 * impact, common conditions. Keep total under ~200 - beyond that, vocabulary
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

  // Common named conditions patients type in plain language. Added 2026-06-14
  // after the growth audit found the stem gate silently rejected real
  // conditions (gout, UTI, covid, reflux, shingles…), adding friction to the
  // symptoms step. "uti" is intentionally a loose substring — erring permissive
  // is correct here; this gate only blocks gibberish, and AI notes + doctor
  // review run downstream.
  "gout", "uti", "urine", "urinary", "covid", "shingl", "reflux",
  "tonsil", "sprain", "strain", "eczema", "psoriasis", "gastro",
  "sciatica", "hernia", "abscess",

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
  "Please describe your symptoms in plain English - e.g. \"fever and headache since yesterday\""

/**
 * Validate that a free-text symptom description is real, not gibberish.
 *
 * Intentionally NOT gated on length or word count (2026-05-29): patients can
 * describe briefly ("migraine", "bad back today") and move on. The only gate
 * is anti-gibberish — the text must be non-empty and mention a recognizable
 * symptom-vocabulary stem, so empty input and keyboard-mash don't reach the
 * doctor or auto-approval. Defense-in-depth: AI notes, auto-approval, and
 * safety screening still run downstream.
 */
export function validateSymptomTextQuality(
  text: string | undefined | null,
): SymptomTextQualityResult {
  const trimmed = (text ?? "").trim()

  if (!trimmed) {
    return { valid: false, reason: "Please describe your symptoms" }
  }

  const lower = trimmed.toLowerCase()
  const hasStem = SYMPTOM_VOCABULARY.some((stem) => lower.includes(stem))
  if (!hasStem) {
    return { valid: false, reason: GENERIC_REASON }
  }

  return { valid: true }
}
