export function resolveInitialPatientConversation(
  conversationIds: string[],
  requestedIntakeId?: string | null,
): string | null {
  if (requestedIntakeId && conversationIds.includes(requestedIntakeId)) {
    return requestedIntakeId
  }

  return conversationIds[0] ?? null
}
