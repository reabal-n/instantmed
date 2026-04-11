/**
 * Contextual messages shown on landing pages based on day of week + time.
 * Service-indexed so each landing page has its own voice.
 *
 * TGA-compliant: no drug names anywhere in the ED or hair-loss sets.
 */

export type ContextualMessageService = "med-cert" | "ed" | "hair-loss"

type MessageSet = {
  mondayMorning?: string
  sundayEvening?: string
  weeknightLate?: string
  weekendDay?: string
  januaryAny?: string
  fallback: string
}

const CONTEXTUAL_MESSAGES: Record<ContextualMessageService, MessageSet> = {
  "med-cert": {
    mondayMorning: "Monday morning? Most patients get their certificate before their first meeting.",
    sundayEvening: "Sunday night - sort tomorrow's sick day now and relax.",
    weeknightLate: "Too late for the GP? We run 24/7 for certificates.",
    weekendDay: "Weekend and your GP is closed? We're always open.",
    fallback: "Quick, discreet, and reviewed by an Australian-registered doctor.",
  },
  "ed": {
    mondayMorning: "Sorting this before the day starts? Most assessments are reviewed before lunch.",
    sundayEvening: "Get it sorted tonight - reviewed before Monday.",
    weeknightLate: "Too late for a GP? We're reviewing now.",
    weekendDay: "Weekend and your GP is closed? We're open right now.",
    fallback: "No calls, no waiting rooms - just a structured form reviewed by an Australian doctor.",
  },
  "hair-loss": {
    januaryAny: "Starting fresh this year? Month 3 is usually when patients notice the difference.",
    weekendDay: "Taking care of this on the weekend? Reviewed within a few hours.",
    weeknightLate: "Starting treatment sooner means more follicles to work with.",
    fallback: "A quick structured assessment, reviewed by an Australian-registered doctor.",
  },
}

function getAESTDate(date: Date = new Date()): { dayOfWeek: number; hour: number; month: number } {
  // Convert to AEST (UTC+10) - simple offset, does not handle DST
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  const aest = new Date(utc + 10 * 3600000)
  return {
    dayOfWeek: aest.getDay(),
    hour: aest.getHours(),
    month: aest.getMonth(),
  }
}

export function selectContextualMessage(
  service: ContextualMessageService,
  now: Date = new Date()
): string | null {
  const set = CONTEXTUAL_MESSAGES[service]
  const { dayOfWeek, hour, month } = getAESTDate(now)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const isMondayMorning = dayOfWeek === 1 && hour >= 7 && hour < 11
  const isSundayEvening = dayOfWeek === 0 && hour >= 17 && hour < 23
  const isWeeknightLate = !isWeekend && (hour >= 20 || hour < 6)
  const isWeekendDay = isWeekend && hour >= 8 && hour < 20
  const isJanuary = month === 0

  if (isMondayMorning && set.mondayMorning) return set.mondayMorning
  if (isSundayEvening && set.sundayEvening) return set.sundayEvening
  if (isWeeknightLate && set.weeknightLate) return set.weeknightLate
  if (isWeekendDay && set.weekendDay) return set.weekendDay
  if (isJanuary && set.januaryAny) return set.januaryAny
  return set.fallback
}
