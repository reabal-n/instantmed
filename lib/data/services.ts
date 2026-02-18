/**
 * Services Data Layer
 * CRUD operations for telehealth service configuration
 */

import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

// Re-export types and helpers from shared module (for backward compatibility)
export type { Service, ServiceInput } from "@/lib/data/types/services"
export { getServiceTypes, formatServiceType, formatPrice, formatSLA, getAustralianStates } from "@/lib/data/types/services"

import type { Service, ServiceInput } from "@/lib/data/types/services"

const log = createLogger("services-data")

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all services (admin view - includes inactive)
 * Note: services table may not exist in production - returns empty array gracefully
 */
export async function getAllServices(): Promise<Service[]> {
  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase
      .from("services")
      .select("id, slug, name, short_name, description, type, category, price_cents, priority_fee_cents, is_active, requires_id_verification, requires_medicare, requires_photo, min_age, max_age, allowed_states, sla_standard_minutes, sla_priority_minutes, questionnaire_id, eligibility_rules, icon_name, display_order, badge_text, meta_title, meta_description, created_at, updated_at")
      .order("display_order", { ascending: true })

    if (error) {
      // Table may not exist - return empty array instead of failing
      log.warn("Services table query failed (may not exist)", {}, error)
      return []
    }

    return data as Service[]
  } catch (err) {
    log.warn("Services table not available", {}, err)
    return []
  }
}

/**
 * Get active services only (public view)
 * Note: services table may not exist in production - returns empty array gracefully
 */
export async function getActiveServices(): Promise<Service[]> {
  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase
      .from("services")
      .select("id, slug, name, short_name, description, type, category, price_cents, priority_fee_cents, is_active, requires_id_verification, requires_medicare, requires_photo, min_age, max_age, allowed_states, sla_standard_minutes, sla_priority_minutes, questionnaire_id, eligibility_rules, icon_name, display_order, badge_text, meta_title, meta_description, created_at, updated_at")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      log.warn("Services table query failed (may not exist)", {}, error)
      return []
    }

    return data as Service[]
  } catch (err) {
    log.warn("Services table not available", {}, err)
    return []
  }
}

/**
 * Get service by ID
 * Note: services table may not exist in production - returns null gracefully
 */
export async function getServiceById(id: string): Promise<Service | null> {
  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase
      .from("services")
      .select("id, slug, name, short_name, description, type, category, price_cents, priority_fee_cents, is_active, requires_id_verification, requires_medicare, requires_photo, min_age, max_age, allowed_states, sla_standard_minutes, sla_priority_minutes, questionnaire_id, eligibility_rules, icon_name, display_order, badge_text, meta_title, meta_description, created_at, updated_at")
      .eq("id", id)
      .single()

    if (error) {
      log.warn("Service by ID query failed (may not exist)", { id }, error)
      return null
    }

    return data as Service
  } catch (err) {
    log.warn("Services table not available", { id }, err)
    return null
  }
}

/**
 * Get service by slug
 * Note: services table may not exist in production - returns null gracefully
 */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase
      .from("services")
      .select("id, slug, name, short_name, description, type, category, price_cents, priority_fee_cents, is_active, requires_id_verification, requires_medicare, requires_photo, min_age, max_age, allowed_states, sla_standard_minutes, sla_priority_minutes, questionnaire_id, eligibility_rules, icon_name, display_order, badge_text, meta_title, meta_description, created_at, updated_at")
      .eq("slug", slug)
      .single()

    if (error) {
      log.warn("Service by slug query failed (may not exist)", { slug }, error)
      return null
    }

    return data as Service
  } catch (err) {
    log.warn("Services table not available", { slug }, err)
    return null
  }
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

  // Validate price_cents >= 0
  if (input.price_cents < 0) {
    return { success: false, error: "Price cannot be negative" }
  }

  // Validate SLA: priority must be less than standard
  const slaStandard = input.sla_standard_minutes ?? 1440
  const slaPriority = input.sla_priority_minutes ?? 240
  if (slaPriority >= slaStandard) {
    return { success: false, error: "Priority SLA must be faster (fewer minutes) than standard SLA" }
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
    .select("id, slug, created_at, updated_at")
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

  // Validate price_cents >= 0 if provided
  if (input.price_cents !== undefined && input.price_cents < 0) {
    return { success: false, error: "Price cannot be negative" }
  }

  // Validate SLA if both are provided, or fetch current values to compare
  if (input.sla_priority_minutes !== undefined || input.sla_standard_minutes !== undefined) {
    // If updating SLA values, we need to check the constraint
    // First get current service to compare
    const { data: currentService } = await supabase
      .from("services")
      .select("sla_standard_minutes, sla_priority_minutes")
      .eq("id", id)
      .single()

    const slaStandard = input.sla_standard_minutes ?? currentService?.sla_standard_minutes ?? 1440
    const slaPriority = input.sla_priority_minutes ?? currentService?.sla_priority_minutes ?? 240

    if (slaPriority >= slaStandard) {
      return { success: false, error: "Priority SLA must be faster (fewer minutes) than standard SLA" }
    }
  }

  const { data, error } = await supabase
    .from("services")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, slug, created_at, updated_at")
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
 * Delete a service (soft delete only - never hard delete to preserve audit trail)
 * Sets is_active=false and deleted_at timestamp
 */
export async function deleteService(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  // Always soft delete - never hard delete services to preserve audit trail
  const { error } = await supabase
    .from("services")
    .update({ 
      is_active: false, 
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq("id", id)

  if (error) {
    log.error("Failed to soft delete service", { id }, error)
    return { success: false, error: error.message }
  }

  log.info("Service soft deleted", { id })
  return { success: true }
}

// Helpers are now exported from @/lib/data/types/services
