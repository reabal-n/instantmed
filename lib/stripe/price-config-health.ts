type StripePriceIssueCode = "missing" | "has_whitespace" | "invalid_format"

export interface StripePriceConfigIssue {
  key: string
  issue: StripePriceIssueCode
}

export const STRIPE_PRICE_ENV_KEYS = [
  "STRIPE_PRICE_MEDCERT",
  "STRIPE_PRICE_MEDCERT_2DAY",
  "STRIPE_PRICE_MEDCERT_3DAY",
  "STRIPE_PRICE_REPEAT_SCRIPT",
  "STRIPE_PRICE_CONSULT",
  "STRIPE_PRICE_CONSULT_ED",
  "STRIPE_PRICE_CONSULT_HAIR_LOSS",
  "STRIPE_PRICE_CONSULT_WOMENS_HEALTH",
  "STRIPE_PRICE_CONSULT_WEIGHT_LOSS",
  "STRIPE_PRICE_PRIORITY_FEE",
] as const

export function getStripePriceConfigIssues(
  env: NodeJS.ProcessEnv = process.env,
): StripePriceConfigIssue[] {
  const issues: StripePriceConfigIssue[] = []

  for (const key of STRIPE_PRICE_ENV_KEYS) {
    const raw = env[key]
    if (!raw) {
      issues.push({ key, issue: "missing" })
      continue
    }

    const trimmed = raw.trim()
    if (trimmed.length === 0) {
      issues.push({ key, issue: "missing" })
      continue
    }

    if (trimmed !== raw) {
      issues.push({ key, issue: "has_whitespace" })
    }

    if (!trimmed.startsWith("price_")) {
      issues.push({ key, issue: "invalid_format" })
    }
  }

  return issues
}

export function countStripePriceConfigIssues(env: NodeJS.ProcessEnv = process.env): number {
  return getStripePriceConfigIssues(env).length
}
