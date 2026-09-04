const PROVIDER_TERMINAL_DELIVERY_STATUS_VALUES = [
  "bounced",
  "complained",
  "failed",
  "suppressed",
] as const

const PROVIDER_UNDELIVERED_STATUS_VALUES = [
  "bounced",
  "failed",
  "suppressed",
] as const

export type ProviderTerminalDeliveryStatus =
  typeof PROVIDER_TERMINAL_DELIVERY_STATUS_VALUES[number]

export const PROVIDER_TERMINAL_DELIVERY_STATUSES: ReadonlySet<string> = new Set(
  PROVIDER_TERMINAL_DELIVERY_STATUS_VALUES,
)

export function isProviderTerminalDeliveryStatus(
  value: string | null | undefined,
): value is ProviderTerminalDeliveryStatus {
  return PROVIDER_TERMINAL_DELIVERY_STATUSES.has(value?.trim().toLowerCase() ?? "")
}

/**
 * Provider evidence that the message did not reach the recipient.
 *
 * A complaint is terminal for this provider attempt and for consent, but it
 * proves the message was delivered. Keep that distinction out of fulfilment
 * and certificate-rescue state.
 */
export function isProviderUndeliveredStatus(
  value: string | null | undefined,
): boolean {
  const normalized = value?.trim().toLowerCase() ?? ""
  return PROVIDER_UNDELIVERED_STATUS_VALUES.some((status) => status === normalized)
}
