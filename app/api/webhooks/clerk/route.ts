/* eslint-disable no-console -- Webhook handlers need console for error logging */
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET')
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
    console.error('Webhook verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle the webhook event
  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    
    const primaryEmail = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address
    
    if (!primaryEmail) {
      console.error('No primary email for user')
      return new Response('No primary email', { status: 400 })
    }

    const fullName = [first_name, last_name].filter(Boolean).join(' ') || primaryEmail.split('@')[0]

    // Upsert profile in Supabase
    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          clerk_user_id: id,
          email: primaryEmail,
          full_name: fullName,
          first_name: first_name || null,
          last_name: last_name || null,
          avatar_url: image_url || null,
          updated_at: new Date().toISOString(),
        },
        { 
          onConflict: 'clerk_user_id',
          ignoreDuplicates: false 
        }
      )

    if (error) {
      console.error('Failed to upsert profile:', error)
      return new Response('Database error', { status: 500 })
    }

    // Profile synced successfully
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    // Soft delete - mark as inactive rather than deleting
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('clerk_user_id', id)

    if (error) {
      console.error('Failed to deactivate profile:', error)
      return new Response('Database error', { status: 500 })
    }

    // Profile deactivated successfully
  }

  return new Response('Webhook processed', { status: 200 })
}
