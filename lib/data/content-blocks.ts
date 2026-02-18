/**
 * Content Blocks Data Layer
 * CRUD operations for editable microcopy and content
 */

import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

// Re-export types and helpers from shared module (for backward compatibility)
export type { ContentBlock, ContentBlockInput } from "@/lib/data/types/content-blocks"
export { getContentCategories, formatCategory } from "@/lib/data/types/content-blocks"

import type { ContentBlock, ContentBlockInput } from "@/lib/data/types/content-blocks"

const log = createLogger("content-blocks")

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all content blocks
 */
export async function getAllContentBlocks(): Promise<ContentBlock[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("content_blocks")
    .select("id, key, name, description, category, content, content_type, context, max_length, created_at, updated_at, updated_by")
    .is("deleted_at", null) // Exclude soft-deleted records
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    log.error("Failed to fetch content blocks", {}, error)
    return []
  }

  return data as ContentBlock[]
}

/**
 * Get content block by key
 */
export async function getContentBlockByKey(key: string): Promise<ContentBlock | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("content_blocks")
    .select("id, key, name, description, category, content, content_type, context, max_length, created_at, updated_at, updated_by")
    .eq("key", key)
    .is("deleted_at", null) // Exclude soft-deleted records
    .single()

  if (error) {
    log.error("Failed to fetch content block", { key }, error)
    return null
  }

  return data as ContentBlock
}

/**
 * Get content blocks by category
 */
export async function getContentBlocksByCategory(category: string): Promise<ContentBlock[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("content_blocks")
    .select("id, key, name, description, category, content, content_type, context, max_length, created_at, updated_at, updated_by")
    .eq("category", category)
    .is("deleted_at", null) // Exclude soft-deleted records
    .order("name", { ascending: true })

  if (error) {
    log.error("Failed to fetch content blocks by category", { category }, error)
    return []
  }

  return data as ContentBlock[]
}

/**
 * Get content value by key (convenience function)
 */
export async function getContent(key: string, fallback: string = ""): Promise<string> {
  const block = await getContentBlockByKey(key)
  return block?.content || fallback
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new content block
 */
export async function createContentBlock(
  input: ContentBlockInput,
  actorId: string
): Promise<{ success: boolean; data?: ContentBlock; error?: string }> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("content_blocks")
    .insert({
      ...input,
      content_type: input.content_type || "text",
      updated_by: actorId,
    })
    .select("id, key, created_at, updated_at")
    .single()

  if (error) {
    log.error("Failed to create content block", { key: input.key }, error)
    return { success: false, error: error.message }
  }

  log.info("Content block created", { id: data.id, key: input.key })
  return { success: true, data: data as ContentBlock }
}

/**
 * Update a content block
 */
export async function updateContentBlock(
  id: string,
  input: Partial<ContentBlockInput>,
  actorId: string
): Promise<{ success: boolean; data?: ContentBlock; error?: string }> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("content_blocks")
    .update({
      ...input,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, key, created_at, updated_at")
    .single()

  if (error) {
    log.error("Failed to update content block", { id }, error)
    return { success: false, error: error.message }
  }

  log.info("Content block updated", { id })
  return { success: true, data: data as ContentBlock }
}

/**
 * Delete a content block (soft delete only - never hard delete to preserve audit trail)
 * Sets deleted_at timestamp instead of removing the row
 */
export async function deleteContentBlock(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  // Always soft delete - never hard delete content blocks to preserve audit trail
  const { error } = await supabase
    .from("content_blocks")
    .update({ 
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq("id", id)

  if (error) {
    log.error("Failed to soft delete content block", { id }, error)
    return { success: false, error: error.message }
  }

  log.info("Content block soft deleted", { id })
  return { success: true }
}

// Helpers are now exported from @/lib/data/types/content-blocks
