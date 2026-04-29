import { colors } from "./email-primitives"

interface NameFirstGreetingProps {
  /**
   * Patient first name. When provided, renders "Reabal," on its own line.
   * When omitted (e.g. guest checkout, partial intake without account),
   * falls back to "Hello,".
   */
  name?: string | null
}

/**
 * Name-first email greeting — signature brand device #4 (docs/BRAND.md §6.4).
 *
 * Replaces the legacy "Hi Reabal," opening with a name-only line ("Reabal,")
 * on its own. Reads more like a real doctor's secretary than a SaaS product.
 *
 * Falls back to "Hello," when no name is provided so transactional emails
 * for guest accounts still get a clean opening line.
 *
 * Drop-in replacement for `<Text>Hi {firstName},</Text>`. Renders an inline
 * `<p>` styled to match the other email primitives in `base-email.tsx`.
 */
export function NameFirstGreeting({ name }: NameFirstGreetingProps) {
  const trimmed = name?.trim()
  const greeting = trimmed ? `${trimmed},` : "Hello,"
  return (
    <p
      style={{
        margin: "0 0 12px 0",
        fontSize: "15px",
        color: colors.textBody,
        lineHeight: "1.6",
      }}
    >
      {greeting}
    </p>
  )
}
