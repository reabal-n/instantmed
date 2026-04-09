/**
 * ED prevalence rates by age decade.
 *
 * Rates are conservative estimates cross-referenced from:
 * - MATeS (Men in Australia Telephone Survey, Holden et al., 2005) — 5,990 AU men
 * - BEACH (Bettering the Evaluation And Care of Health) study
 * - MMAS (Massachusetts Male Aging Study, Feldman et al., 1994) — international baseline
 *
 * These numbers are illustrative, not diagnostic. Footnoted on the page with source.
 */

export type Decade = "20s" | "30s" | "40s" | "50s" | "60s" | "70s+"

interface PrevalenceEntry {
  rate: number // percentage, 0–100
  source: string
}

export const ED_PREVALENCE_BY_DECADE: Record<Decade, PrevalenceEntry> = {
  "20s": {
    rate: 8,
    source: "Published community surveys; illustrative",
  },
  "30s": {
    rate: 11,
    source: "Published community surveys; illustrative",
  },
  "40s": {
    rate: 21,
    source: "MATeS (Holden et al., 2005); illustrative",
  },
  "50s": {
    rate: 33,
    source: "MATeS (Holden et al., 2005); illustrative",
  },
  "60s": {
    rate: 46,
    source: "MATeS (Holden et al., 2005); illustrative",
  },
  "70s+": {
    rate: 64,
    source: "MATeS (Holden et al., 2005); illustrative",
  },
}

export function getPrevalenceForAge(age: number): { decade: Decade; rate: number; source: string } {
  let decade: Decade
  if (age < 30) decade = "20s"
  else if (age < 40) decade = "30s"
  else if (age < 50) decade = "40s"
  else if (age < 60) decade = "50s"
  else if (age < 70) decade = "60s"
  else decade = "70s+"
  const entry = ED_PREVALENCE_BY_DECADE[decade]
  return { decade, rate: entry.rate, source: entry.source }
}

export function getDecadeLabel(decade: Decade): string {
  switch (decade) {
    case "20s": return "men in their 20s"
    case "30s": return "men in their 30s"
    case "40s": return "men in their 40s"
    case "50s": return "men in their 50s"
    case "60s": return "men in their 60s"
    case "70s+": return "men aged 70 and over"
  }
}
