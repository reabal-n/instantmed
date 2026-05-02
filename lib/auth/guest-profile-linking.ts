export interface GuestProfileAuthLinkCandidate {
  id: string
  auth_user_id: string | null
  created_at: string | null
  has_paid_intake: boolean
}

function createdAtMs(candidate: GuestProfileAuthLinkCandidate): number {
  if (!candidate.created_at) return 0
  const time = new Date(candidate.created_at).getTime()
  return Number.isFinite(time) ? time : 0
}

export function selectGuestProfileForAuthLink(
  candidates: GuestProfileAuthLinkCandidate[],
  preferredProfileId?: string | null,
): GuestProfileAuthLinkCandidate | null {
  const linkable = candidates.filter((candidate) => !candidate.auth_user_id)
  if (linkable.length === 0) return null

  if (preferredProfileId) {
    const preferred = linkable.find((candidate) => candidate.id === preferredProfileId)
    if (preferred) return preferred
  }

  return [...linkable].sort((a, b) => {
    if (a.has_paid_intake !== b.has_paid_intake) {
      return a.has_paid_intake ? -1 : 1
    }
    return createdAtMs(b) - createdAtMs(a)
  })[0] ?? null
}
