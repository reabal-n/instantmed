export interface CheckoutReminderIdentity {
  category: string | null
  createdAt: string
  email: string | null
  id: string
  subtype: string | null
}

function reminderKey(row: CheckoutReminderIdentity): string | null {
  const email = row.email?.trim().toLowerCase()
  if (!email) return null
  return `${email}\u0000${row.category ?? ""}\u0000${row.subtype ?? ""}`
}

function isNewer(candidate: CheckoutReminderIdentity, current: CheckoutReminderIdentity): boolean {
  const candidateTime = new Date(candidate.createdAt).getTime()
  const currentTime = new Date(current.createdAt).getTime()
  if (candidateTime !== currentTime) return candidateTime > currentTime
  return candidate.id > current.id
}

/**
 * A person should receive recovery for only their newest request in a service
 * lane. A newer paid/active sibling suppresses the stale unpaid reminder too.
 */
export function keepCanonicalCheckoutReminderCandidates<T extends CheckoutReminderIdentity>(
  candidates: T[],
  recentSiblings: CheckoutReminderIdentity[],
): T[] {
  const latestByKey = new Map<string, CheckoutReminderIdentity>()

  for (const row of [...candidates, ...recentSiblings]) {
    const key = reminderKey(row)
    if (!key) continue
    const current = latestByKey.get(key)
    if (!current || isNewer(row, current)) {
      latestByKey.set(key, row)
    }
  }

  return candidates.filter((candidate) => {
    const key = reminderKey(candidate)
    if (!key) return true
    return latestByKey.get(key)?.id === candidate.id
  })
}
