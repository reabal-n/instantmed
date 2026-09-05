export interface MutableEmailPreferences {
  marketing_emails?: boolean
  abandoned_checkout_emails?: boolean
}

/**
 * Build one explicit patient preference-centre write.
 *
 * A deliberate change stamps preferences_changed_at; default row creation never does.
 * A deliberate opt-in is the only application action that clears prior
 * unsubscribe metadata. False-only/partial updates retain it, and provider
 * delivery callbacks never call this helper.
 */
export function buildExplicitEmailPreferenceUpdate(
  preferences: MutableEmailPreferences,
  updatedAt: string,
): Record<string, boolean | string | null> {
  const changes = Object.fromEntries(
    (["marketing_emails", "abandoned_checkout_emails"] as const)
      .filter((key) => typeof preferences[key] === "boolean")
      .map((key) => [key, preferences[key] as boolean]),
  )
  if (Object.keys(changes).length === 0) return {}

  const explicitlyOptsIn = preferences.marketing_emails === true
    || preferences.abandoned_checkout_emails === true

  return {
    ...changes,
    ...(explicitlyOptsIn
      ? {
          unsubscribed_at: null,
          unsubscribe_reason: null,
        }
      : {}),
    preferences_changed_at: updatedAt,
    updated_at: updatedAt,
  }
}
