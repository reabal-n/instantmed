/**
 * Patient-speak to clinical-speak normaliser.
 *
 * Dictionary-based. Cleans up the most common patient phrasings that produce
 * AI-generated-sounding notes when fed verbatim into the Subjective line of
 * a SOAP note. Patterns we don't match pass through unchanged. The doctor
 * still has the final edit in the notes editor.
 *
 * Not a full NLP system. Intentionally small. Add new entries as new
 * patient-speak patterns surface.
 */

const PHRASE_REPLACEMENTS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  // URTI / cold / flu
  { pattern: /\b(?:got|get|getting|having|with)\s+(?:the\s+|a\s+)?cold(?:s)?\b/gi, replacement: "cold symptoms" },
  { pattern: /\bcold\s+symptoms?\b/gi, replacement: "cold symptoms" },
  { pattern: /\b(?:got|get|getting|having|with)\s+(?:the\s+|a\s+)?flu\b/gi, replacement: "flu symptoms" },
  { pattern: /\bnose\s+full\b/gi, replacement: "nasal congestion" },
  { pattern: /\bblocked\s+nose\b/gi, replacement: "nasal congestion" },
  { pattern: /\bstuffy\s+nose\b/gi, replacement: "nasal congestion" },
  { pattern: /\brunny\s+nose\b/gi, replacement: "runny nose" },

  // GI
  { pattern: /\btummy\s+hurts?\b/gi, replacement: "abdominal pain" },
  { pattern: /\bstomach\s+ache\b/gi, replacement: "abdominal pain" },
  { pattern: /\bthrow(?:ing)?\s+up\b/gi, replacement: "vomiting" },
  { pattern: /\bbeing\s+sick\b/gi, replacement: "vomiting" },
  { pattern: /\bthe\s+runs\b/gi, replacement: "diarrhoea" },
  { pattern: /\bloose\s+stools?\b/gi, replacement: "diarrhoea" },

  // Pain / general
  { pattern: /\b(?:got|get|getting|having|with)\s+(?:a\s+)?headaches?\b/gi, replacement: "headache" },
  { pattern: /\b(?:got|get|getting|having|with)\s+(?:a\s+)?migraines?\b/gi, replacement: "migraine" },
  { pattern: /\bcan'?t\s+sleep\b/gi, replacement: "insomnia" },
  { pattern: /\btrouble\s+sleeping\b/gi, replacement: "insomnia" },
  { pattern: /\bfeel(?:ing)?\s+tired\b/gi, replacement: "fatigue" },
  { pattern: /\bworn\s+out\b/gi, replacement: "fatigue" },

  // Cough / chest
  { pattern: /\bchesty\s+cough\b/gi, replacement: "productive cough" },
  { pattern: /\bdry\s+cough\b/gi, replacement: "dry cough" },
  { pattern: /\bshort\s+of\s+breath\b/gi, replacement: "dyspnoea" },
  { pattern: /\bcan'?t\s+breathe(?:\s+properly)?\b/gi, replacement: "dyspnoea" },
]

const FILLER_LEADS = /^(?:i\s+|i'?ve\s+|i\s+have\s+|i'm\s+|i\s+am\s+)/i

function applyPhraseReplacements(text: string): string {
  return PHRASE_REPLACEMENTS.reduce((acc, { pattern, replacement }) => acc.replace(pattern, replacement), text)
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

function stripLeadingFiller(text: string): string {
  return text.replace(FILLER_LEADS, "")
}

/**
 * If the text reads as a space-separated list of symptoms with no existing
 * comma / period / clinical phrasing, join with commas. Preserves the
 * original token order so "fever nose full get cold" becomes
 * "fever, nasal congestion, cold symptoms" not the alphabetical reverse.
 *
 * Multi-word symptoms (eg "nasal congestion", "sore throat") are detected
 * via a small whitelist and folded back in at their original position
 * using placeholder substitution.
 *
 * Detection: we skip this transformation when the text already contains
 * commas / periods, or includes time markers (since, ago, x N days), or
 * is a single token.
 */
const KNOWN_MULTI_WORD = [
  "nasal congestion",
  "cold symptoms",
  "flu symptoms",
  "abdominal pain",
  "productive cough",
  "dry cough",
  "sore throat",
  "sore eyes",
  "runny nose",
] as const

function commaSeparateSymptomList(text: string): string {
  const hasCommaOrPeriod = /[.,]/.test(text)
  const hasTimeMarker = /\b(?:x\s*\d+|since|ago|for\s+\d+|day|week|hour|month|year)s?\b/i.test(text)
  if (hasCommaOrPeriod || hasTimeMarker) return text

  let working = text
  const placeholders: string[] = []
  for (const phrase of KNOWN_MULTI_WORD) {
    let idx = working.toLowerCase().indexOf(phrase)
    while (idx !== -1) {
      const placeholder = `${placeholders.length}`
      placeholders.push(phrase)
      working = working.slice(0, idx) + placeholder + working.slice(idx + phrase.length)
      idx = working.toLowerCase().indexOf(phrase)
    }
  }

  const tokens = working.split(/\s+/).filter(Boolean)
  if (tokens.length < 2 || tokens.length > 8) return text

  return tokens
    .map(token => {
      const match = token.match(/^(\d+)$/)
      return match ? placeholders[Number(match[1])] : token
    })
    .filter(Boolean)
    .join(", ")
}

function capitaliseFirstLetter(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function ensureTrailingPeriod(text: string): string {
  if (!text) return text
  if (/[.!?]$/.test(text)) return text
  return text + "."
}

export function normaliseSymptomText(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return ""

  let text = collapseWhitespace(raw.toLowerCase())
  text = stripLeadingFiller(text)
  text = applyPhraseReplacements(text)
  text = commaSeparateSymptomList(text)
  text = collapseWhitespace(text)
  text = capitaliseFirstLetter(text)
  text = ensureTrailingPeriod(text)
  return text
}
