import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Maps common health terms to internal pages.
 * Only terms that actually appear in deep city content are included.
 * Order matters: longer phrases must come before their substrings.
 */
const LINK_MAP: Array<{ terms: string[]; href: string }> = [
  // Conditions (multi-word first)
  { terms: ["cold and flu", "cold & flu"], href: "/conditions/cold-and-flu" },
  { terms: ["back pain"], href: "/conditions/back-pain" },
  { terms: ["hay fever"], href: "/conditions/hay-fever" },
  { terms: ["food poisoning"], href: "/conditions/food-poisoning" },
  { terms: ["acid reflux"], href: "/conditions/acid-reflux" },
  { terms: ["period pain"], href: "/conditions/period-pain" },
  { terms: ["ear infection", "ear infections"], href: "/conditions/ear-infection" },
  { terms: ["chest infection", "chest infections"], href: "/conditions/chest-infection" },
  { terms: ["sore throat"], href: "/symptoms/sore-throat" },
  { terms: ["mental health day"], href: "/conditions/mental-health-day" },
  { terms: ["skin rash", "skin rashes"], href: "/conditions/skin-rash" },
  // Single-word conditions
  { terms: ["gastro", "gastroenteritis"], href: "/conditions/gastro" },
  { terms: ["migraine", "migraines"], href: "/conditions/migraine" },
  { terms: ["anxiety"], href: "/conditions/anxiety" },
  { terms: ["insomnia"], href: "/conditions/insomnia" },
  { terms: ["eczema"], href: "/conditions/eczema" },
  { terms: ["vertigo"], href: "/conditions/vertigo" },
  { terms: ["shingles"], href: "/conditions/shingles" },
  { terms: ["gout"], href: "/conditions/gout" },
  { terms: ["tonsillitis"], href: "/conditions/tonsillitis" },
  { terms: ["sinusitis"], href: "/conditions/sinusitis" },
  { terms: ["conjunctivitis"], href: "/conditions/conjunctivitis" },
  { terms: ["burnout"], href: "/conditions/burnout" },
  { terms: ["depression"], href: "/conditions/depression" },
  // Key service pages
  { terms: ["medical certificate", "medical certificates", "med cert"], href: "/medical-certificate" },
  { terms: ["repeat prescription", "repeat prescriptions"], href: "/prescriptions" },
  { terms: ["eScript", "eScripts", "e-script", "e-scripts"], href: "/prescriptions" },
]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Build a single regex that matches any term, longest first
const PATTERN = new RegExp(
  `\\b(${LINK_MAP.flatMap(e => e.terms).sort((a, b) => b.length - a.length).map(escapeRegex).join("|")})\\b`,
  "gi"
)

const TERM_TO_HREF = new Map<string, string>()
for (const entry of LINK_MAP) {
  for (const term of entry.terms) {
    TERM_TO_HREF.set(term.toLowerCase(), entry.href)
  }
}

/**
 * Takes a plain-text paragraph and returns JSX with the first occurrence
 * of known health terms wrapped in <Link> components.
 */
export function autoLinkParagraph(text: string): ReactNode {
  const usedHrefs = new Set<string>()
  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(new RegExp(PATTERN.source, "gi"))) {
    const matched = match[0]
    const href = TERM_TO_HREF.get(matched.toLowerCase())
    if (!href || usedHrefs.has(href)) continue

    usedHrefs.add(href)
    const idx = match.index!

    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx))
    }
    parts.push(
      <Link key={key++} href={href} className="text-primary hover:underline font-medium">
        {matched}
      </Link>
    )
    lastIndex = idx + matched.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 1 ? parts : text
}
