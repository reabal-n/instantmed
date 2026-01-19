/**
 * Shared Data Types Index
 * 
 * Re-exports all shared types and helpers that can be safely imported
 * in both client and server components.
 */

// Audit Logs
export type { AuditLog, AuditLogFilters, AuditLogStats } from "./audit-logs"
export { getAuditEventTypes, formatEventType, formatActorType } from "./audit-logs"

// Content Blocks
export type { ContentBlock, ContentBlockInput } from "./content-blocks"
export { getContentCategories, formatCategory } from "./content-blocks"

// Refunds
export type { RefundStatus, PaymentWithRefund, RefundFilters, RefundStats } from "./refunds"
export { getRefundStatuses, formatRefundStatus, formatAmount } from "./refunds"

// Services
export type { Service, ServiceInput } from "./services"
export { getServiceTypes, formatServiceType, formatPrice, formatSLA, getAustralianStates } from "./services"

// Feature Flags
export type { FlagKey, FeatureFlags } from "./feature-flags"
export {
  FLAG_KEYS,
  DEFAULT_FLAGS,
  DEFAULT_SAFETY_SYMPTOMS,
  getFlagInfo,
  isServiceKillSwitch,
  isArrayFlag,
} from "./feature-flags"
