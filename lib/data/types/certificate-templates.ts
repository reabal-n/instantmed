/**
 * Certificate Templates - Shared Types & Helpers (Client-Safe)
 * 
 * These types and helpers can be imported in both client and server components.
 * Server-only database operations remain in lib/data/certificate-templates.ts
 */

import type { TemplateType } from "@/types/certificate-template"

// Re-export types from the main certificate-template types file
export type {
  AccentColorPreset,
  CertificateTemplate,
  CertificateTemplateWithCreator,
  FontSizePreset,
  HeaderStyle,
  MarginPreset,
  SignatureStyle,
  TemplateConfig,
  TemplateType,
} from "@/types/certificate-template"
export { DEFAULT_TEMPLATE_CONFIG } from "@/types/certificate-template"

// ============================================================================
// HELPERS (Client-Safe)
// ============================================================================

/**
 * Get template type display name
 */
export function getTemplateTypeName(_type: TemplateType): string {
  return "Medical Certificate"
}
