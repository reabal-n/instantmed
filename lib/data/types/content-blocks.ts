/**
 * Content Blocks - Shared Types & Helpers (Client-Safe)
 * 
 * These types and helpers can be imported in both client and server components.
 * Server-only database operations remain in lib/data/content-blocks.ts
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ContentBlock {
  id: string
  key: string
  name: string
  description: string | null
  category: string
  content: string
  content_type: "text" | "html" | "markdown"
  context: string | null
  max_length: number | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface ContentBlockInput {
  key: string
  name: string
  description?: string | null
  category: string
  content: string
  content_type?: "text" | "html" | "markdown"
  context?: string | null
  max_length?: number | null
}

// ============================================================================
// HELPERS (Client-Safe)
// ============================================================================

/**
 * Get content categories for filtering
 */
export function getContentCategories(): { value: string; label: string }[] {
  return [
    { value: "general", label: "General" },
    { value: "med_cert", label: "Medical Certificates" },
    { value: "repeat_rx", label: "Repeat Prescriptions" },
    { value: "safety", label: "Safety" },
    { value: "payment", label: "Payment" },
    { value: "certificate", label: "Certificates" },
    { value: "help", label: "Help Text" },
    { value: "legal", label: "Legal" },
    { value: "error", label: "Error Messages" },
  ]
}

/**
 * Format category for display
 */
export function formatCategory(category: string): string {
  const categories = getContentCategories()
  return categories.find(c => c.value === category)?.label || category
}
