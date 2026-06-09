import { z } from "zod"

/**
 * Self-reported attribution ("How did you hear about us?") — single source of
 * truth for the option set, shared by the in-app survey card, the review-request
 * email one-click links, the API write path, and any future /admin/ops strip.
 *
 * Values are short, stable enum tokens stored in `intakes.heard_about_us`.
 * AU-tuned to the dark channels that referrer capture cannot see (LLM apps,
 * word-of-mouth, forums). Do NOT rename a value once shipped — historical rows
 * keep the old token. Add new options at the end; keep `other` last.
 */
export const HEARD_ABOUT_US_OPTIONS = [
  { value: "ai", label: "ChatGPT or other AI", emoji: "🤖" },
  { value: "search", label: "Google or web search", emoji: "🔍" },
  { value: "friend", label: "Friend or family", emoji: "💬" },
  { value: "forum", label: "Reddit or a forum", emoji: "📣" },
  { value: "ad", label: "Saw an ad", emoji: "📺" },
  { value: "other", label: "Something else", emoji: "✨" },
] as const

export type HeardAboutUsValue = (typeof HEARD_ABOUT_US_OPTIONS)[number]["value"]

export const HEARD_ABOUT_US_VALUES = HEARD_ABOUT_US_OPTIONS.map((o) => o.value) as [
  HeardAboutUsValue,
  ...HeardAboutUsValue[],
]

/** Zod enum for server-side validation of the submitted value. */
export const heardAboutUsSchema = z.enum(HEARD_ABOUT_US_VALUES)

export function isHeardAboutUsValue(value: unknown): value is HeardAboutUsValue {
  return typeof value === "string" && HEARD_ABOUT_US_OPTIONS.some((o) => o.value === value)
}

export function heardAboutUsLabel(value: string): string {
  return HEARD_ABOUT_US_OPTIONS.find((o) => o.value === value)?.label ?? value
}
