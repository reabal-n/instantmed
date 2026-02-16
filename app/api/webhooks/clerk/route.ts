import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('clerk-webhook')

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    log.error('Missing CLERK_WEBHOOK_SECRET')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  // Get body - wrap in try-catch for malformed JSON
  let payload
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON payload', { status: 400 })
  }
  const body = JSON.stringify(payload)

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    log.error('Webhook verification failed', {}, err instanceof Error ? err : new Error(String(err)))
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle the webhook event
  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    
    const rawEmail = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address

    if (!rawEmail) {
      log.error('No primary email for user')
      return new Response('No primary email', { status: 400 })
    }

    // Normalize email to lowercase for consistent storage and lookups
    const primaryEmail = rawEmail.toLowerCase()
    const fullName = [first_name, last_name].filter(Boolean).join(' ') || primaryEmail.split('@')[0]
    const supabase = createServiceRoleClient()

    // First check if profile already exists by clerk_user_id
    const { data: existingByClerkId } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', id)
      .maybeSingle()

    if (existingByClerkId) {
      // Profile already linked - just update it
      const { error } = await supabase
        .from('profiles')
        .update({
          email: primaryEmail,
          full_name: fullName,
          first_name: first_name || null,
          last_name: last_name || null,
          avatar_url: image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', id)

      if (error) {
        log.error('Failed to update profile', { errorCode: error.code, errorMessage: error.message })
        return new Response('Database error', { status: 500 })
      }
    } else {
      // No profile by clerk_user_id - check for guest profile by email (case-insensitive)
      // Check for profiles where clerk_user_id is NULL or empty string
      const { data: guestProfile } = await supabase
        .from('profiles')
        .select('id, clerk_user_id, role')
        .ilike('email', primaryEmail)
        .or('clerk_user_id.is.null,clerk_user_id.eq.')
        .maybeSingle()

      if (guestProfile && (!guestProfile.clerk_user_id || guestProfile.clerk_user_id === '') && (!guestProfile.role || guestProfile.role === 'patient')) {
        // Link existing guest/patient profile to Clerk user (never link doctor/admin profiles)
        const { error } = await supabase
          .from('profiles')
          .update({
            clerk_user_id: id,
            email: primaryEmail, // Update to normalized email
            full_name: fullName,
            first_name: first_name || null,
            last_name: last_name || null,
            avatar_url: image_url || null,
            email_verified: true, // Clerk has verified the email
            email_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', guestProfile.id)

        if (error) {
          log.error('Failed to link guest profile', { errorCode: error.code, errorMessage: error.message })
          return new Response('Database error', { status: 500 })
        }
        log.info('Linked guest profile to Clerk user', { clerkUserId: id, profileId: guestProfile.id })
      } else {
        // No existing profile - create new one
        const { error } = await supabase
          .from('profiles')
          .insert({
            clerk_user_id: id,
            email: primaryEmail,
            full_name: fullName,
            first_name: first_name || null,
            last_name: last_name || null,
            avatar_url: image_url || null,
            role: 'patient',
            onboarding_completed: false,
            email_verified: true, // Clerk has verified the email
            email_verified_at: new Date().toISOString(),
          })

        if (error) {
          // Handle race condition - profile might have been created by auth callback
          if (error.code === '23505') { // Unique constraint violation
            log.info('Profile already exists (race condition), skipping insert')
          } else {
            log.error('Failed to create profile', { errorCode: error.code, errorMessage: error.message })
            return new Response('Database error', { status: 500 })
          }
        }
      }
    }

    // Profile synced successfully
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    // Soft delete - mark as inactive rather than deleting
    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('clerk_user_id', id)

    if (error) {
      log.error('Failed to deactivate profile', { errorCode: error.code, errorMessage: error.message })
      return new Response('Database error', { status: 500 })
    }

    // Profile deactivated successfully
  }

  return new Response('Webhook processed', { status: 200 })
}
