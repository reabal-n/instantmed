/**
 * Services Data Layer
 * CRUD operations for telehealth service configuration
 */

import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("services-data")

// ============================================================================
// TYPES
// ============================================================================

export interface Service {
  id: string
  slug: string
  name: string
  short_name: string | null
  description: string | null
  type: string
  category: string | null
  price_cents: number
  priority_fee_cents: number | null
  is_active: boolean
  requires_id_verification: boolean
  requires_medicare: boolean
  requires_photo: boolean
  min_age: number | null
  max_age: number | null
  allowed_states: string[] | null
  sla_standard_minutes: number
  sla_priority_minutes: number
  questionnaire_id: string | null
  eligibility_rules: Record<string, unknown>
  icon_name: string | null
  display_order: number
  badge_text: string | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export interface ServiceInput {
  slug: string
  name: string
  short_name?: string | null
  description?: string | null
  type: string
  category?: string | null
  price_cents: number
  priority_fee_cents?: number | null
  is_active?: boolean
  requires_id_verification?: boolean
  requires_medicare?: boolean
  requires_photo?: boolean
  min_age?: number | null
  max_age?: number | null
  allowed_states?: string[] | null
  sla_standard_minutes?: number
  sla_priority_minutes?: number
  eligibility_rules?: Record<string, unknown>
  icon_name?: string | null
  display_order?: number
  badge_text?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all services (admin view - includes inactive)
 */
export async function getAllServices(): Promise<Service[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("display_order", { ascending: true })

  if (error) {
    log.error("Failed to fetch all services", {}, error)
    return []
  }

  return data as Service[]
}

/**
 * Get active services only (public view)
 */
export async function getActiveServices(): Promise<Service[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  if (error) {
    log.error("Failed to fetch active services", {}, error)
    return []
  }

  return data as Service[]
}

/**
 * Get service by ID
 */
export async function getServiceById(id: string): Promise<Service | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    log.error("Failed to fetch service by ID", { id }, error)
    return null
  }

  return data as Service
}

/**
 * Get service by slug
 */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("slug", slug)
    .single()

  if (error) {
    log.error("Failed to fetch service by slug", { slug }, error)
    return null
  }

  return data as Service
}

// ============================================================================
// WRITE OPERATIONS (Admin only)
// ============================================================================

/**
 * Create a new service
 */
export async function createService(
  input: ServiceInput
): Promise<{ success: boolean; data?: Service; error?: string }> {
  const supabase = createServiceRoleClient()

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(input.slug)) {
    return { success: false, error: "Slug must contain only lowercase letters, numbers, and hyphens" }
  }

  const { data, error } = await supabase
    .from("services")
    .insert({
      ...input,
      is_active: input.is_active ?? false,
      requires_id_verification: input.requires_id_verification ?? false,
      requires_medicare: input.requires_medicare ?? false,
      requires_photo: input.requires_photo ?? false,
      sla_standard_minutes: input.sla_standard_minutes ?? 1440,
      sla_priority_minutes: input.sla_priority_minutes ?? 240,
      eligibility_rules: input.eligibility_rules ?? {},
      display_order: input.display_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    log.error("Failed to create service", { slug: input.slug }, error)
    return { success: false, error: error.message }
  }

  log.info("Service created", { id: data.id, slug: input.slug })
  return { success: true, data: data as Service }
}

/**
 * Update an existing service
 */
export async function updateService(
  id: string,
  input: Partial<ServiceInput>
): Promise<{ success: boolean; data?: Service; error?: string }> {
  const supabase = createServiceRoleClient()

  // Validate slug format if provided
  if (input.slug && !/^[a-z0-9-]+$/.test(input.slug)) {
    return { success: false, error: "Slug must contain only lowercase letters, numbers, and hyphens" }
  }

  const { data, error } = await supabase
    .from("services")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    log.error("Failed to update service", { id }, error)
    return { success: false, error: error.message }
  }

  log.info("Service updated", { id, slug: data.slug })
  return { success: true, data: data as Service }
}

/**
 * Toggle service active status
 */
export async function toggleServiceActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    log.error("Failed to toggle service status", { id, isActive }, error)
    return { success: false, error: error.message }
  }

  log.info("Service status toggled", { id, isActive })
  return { success: true }
}

/**
 * Update service display order (for drag-and-drop reordering)
 */
export async function updateServiceOrder(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("services")
        .update({ display_order: i, updated_at: new Date().toISOString() })
        .eq("id", orderedIds[i])

      if (error) throw error
    }

    log.info("Service order updated", { count: orderedIds.length })
    return { success: true }
  } catch (error) {
    log.error("Failed to update service order", {}, error)
    return { success: false, error: "Failed to update display order" }
  }
}

/**
 * Delete a service (soft delete by deactivating, or hard delete if no references)
 */
export async function deleteService(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  // Check if service has any intakes
  const { count } = await supabase
    .from("intakes")
    .select("*", { count: "exact", head: true })
    .eq("service_id", id)

  if (count && count > 0) {
    // Soft delete - just deactivate
    return toggleServiceActive(id, false)
  }

  // Hard delete if no references
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)

  if (error) {
    log.error("Failed to delete service", { id }, error)
    return { success: false, error: error.message }
  }

  log.info("Service deleted", { id })
  return { success: true }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get service types for dropdown
 */
export function getServiceTypes(): { value: string; label: string }[] {
  return [
    { value: "med_certs", label: "Medical Certificates" },
    { value: "repeat_rx", label: "Repeat Prescriptions" },
    { value: "weight_loss", label: "Weight Loss" },
    { value: "mens_health", label: "Men's Health" },
    { value: "womens_health", label: "Women's Health" },
    { value: "common_scripts", label: "Common Scripts" },
    { value: "referrals", label: "Referrals" },
    { value: "pathology", label: "Pathology" },
    { value: "consults", label: "Consultations" },
  ]
}

/**
 * Get Australian states for dropdown
 */
export function getAustralianStates(): { value: string; label: string }[] {
  return [
    { value: "ACT", label: "Australian Capital Territory" },
    { value: "NSW", label: "New South Wales" },
    { value: "NT", label: "Northern Territory" },
    { value: "QLD", label: "Queensland" },
    { value: "SA", label: "South Australia" },
    { value: "TAS", label: "Tasmania" },
    { value: "VIC", label: "Victoria" },
    { value: "WA", label: "Western Australia" },
  ]
}

/**
 * Format price from cents to display string
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
