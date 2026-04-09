export type TickerFormat = "named" | "anonymous"

export interface TickerEntry {
  name: string
  city: string
  minutesAgo: number
}

// Keep these generic so they can be used across services — no clinical
// content, no drug names, no identifying details beyond first name + city.
const SAMPLE_ENTRIES: TickerEntry[] = [
  { name: "Sarah", city: "Melbourne", minutesAgo: 23 },
  { name: "James", city: "Sydney", minutesAgo: 41 },
  { name: "Priya", city: "Brisbane", minutesAgo: 12 },
  { name: "Tom", city: "Perth", minutesAgo: 56 },
  { name: "Lauren", city: "Adelaide", minutesAgo: 8 },
  { name: "Daniel", city: "Canberra", minutesAgo: 34 },
  { name: "Aisha", city: "Hobart", minutesAgo: 19 },
  { name: "Matt", city: "Gold Coast", minutesAgo: 47 },
]

export function getTickerEntries(): TickerEntry[] {
  return SAMPLE_ENTRIES
}

/**
 * Format a ticker entry as a display string.
 *
 * named: "Sarah from Melbourne received her certificate 23 min ago."
 * anonymous: "A patient from Melbourne received their treatment 23 min ago."
 *
 * The `artifact` param is the noun shown to the user — "certificate",
 * "treatment", "prescription", etc. Keep it generic for ED to avoid
 * the drug-name cliff.
 */
export function formatTickerEntry(
  entry: TickerEntry,
  format: TickerFormat,
  artifact: string
): string {
  const timeStr = `${entry.minutesAgo} min ago`
  if (format === "named") {
    return `${entry.name} from ${entry.city} received their ${artifact} ${timeStr}.`
  }
  return `A patient from ${entry.city} received their ${artifact} ${timeStr}.`
}
