/**
 * Certificate Templates - Shared Types & Helpers (Client-Safe)
 * 
 * These types and helpers can be imported in both client and server components.
 * Server-only database operations remain in lib/data/certificate-templates.ts
 */

import type { TemplateType } from "@/types/certificate-template"

// Re-export types from the main certificate-template types file
export type {
  CertificateTemplate,
  CertificateTemplateWithCreator,
  TemplateConfig,
  TemplateType,
  HeaderStyle,
  MarginPreset,
  FontSizePreset,
  AccentColorPreset,
  SignatureStyle,
} from "@/types/certificate-template"

export { DEFAULT_TEMPLATE_CONFIG } from "@/types/certificate-template"

// ============================================================================
// HELPERS (Client-Safe)
// ============================================================================

/**
 * Get template type display name
 */
export function getTemplateTypeName(type: TemplateType): string {
  return "Medical Certificate"
}
