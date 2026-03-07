/**
 * Flow Config Registry
 *
 * Central lookup for per-service FlowConfig objects.
 * Import `getFlowConfig` in the flow orchestrator or page route
 * to resolve a service slug into its questionnaire definition.
 */

import type { FlowConfig } from "@/lib/flow"
import { medCertConfig } from "./med-cert.config"
import { prescriptionConfig } from "./prescription.config"
import { consultConfig } from "./consult.config"
import { weightManagementConfig } from "./weight-management.config"
import { mensHealthConfig } from "./mens-health.config"

// ---------------------------------------------------------------------------
// Config map — keyed by service slug (matches `serviceCategories[].slug`)
// ---------------------------------------------------------------------------

const configMap: Record<string, FlowConfig> = {
  "medical-certificate": medCertConfig,
  "med-cert": medCertConfig, // alias
  "repeat-prescription": prescriptionConfig,
  prescription: prescriptionConfig, // alias
  "general-consult": consultConfig,
  consult: consultConfig, // alias
  "weight-loss": weightManagementConfig,
  "weight-management": weightManagementConfig, // alias
  "mens-health": mensHealthConfig,
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve a service slug to its FlowConfig, or `null` if unknown.
 *
 * Accepts canonical slugs (e.g. `"medical-certificate"`) and common
 * short aliases (e.g. `"med-cert"`, `"prescription"`).
 */
export function getFlowConfig(serviceSlug: string): FlowConfig | null {
  return configMap[serviceSlug] ?? null
}

/** All registered service slugs (canonical + aliases). */
export const registeredSlugs = Object.keys(configMap)

// Re-export individual configs for direct import if needed
export { medCertConfig } from "./med-cert.config"
export { prescriptionConfig } from "./prescription.config"
export { consultConfig } from "./consult.config"
export { weightManagementConfig } from "./weight-management.config"
export { mensHealthConfig } from "./mens-health.config"
