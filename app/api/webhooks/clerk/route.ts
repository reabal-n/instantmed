/**
 * Clerk Webhook Handler
 * 
 * Handles Clerk webhook events to sync user data to Supabase.
 * Configure this webhook URL in your Clerk dashboard.
 */

import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Local type definition for Clerk webhook events (avoids @clerk/nextjs dependency)
type WebhookEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted' | string
  data: {
    id?: string
    email_addresses?: Array<{ email_address: string }>
    first_name?: string | null
    last_name?: string | null
    image_url?: string | null
  }
}
import { NextResponse } from 'next/server'
import { logger } from '@/lib/observability/logger'

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase credentials')
  return createClient(url, key)
}

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Get the webhook secret from environment
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.error('Missing CLERK_WEBHOOK_SECRET')
    return new Response('Error: Missing webhook secret', { status: 500 })
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(webhookSecret)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    logger.error('Error verifying webhook', { error: err })
    return new Response('Error: Webhook verification failed', { status: 400 })
  }

  // Handle the webhook
  const eventType = evt.type
  const supabase = getServiceClient()

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data
        const primaryEmail = email_addresses?.[0]?.email_address

        // Create a profile in your database
        const { error } = await supabase.from('profiles').insert({
          clerk_user_id: id,
          email: primaryEmail,
          full_name: [first_name, last_name].filter(Boolean).join(' ') || null,
          avatar_url: image_url || null,
          role: 'patient', // Default role
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (error) {
          logger.error('Error creating profile', { error, clerkUserId: id })
          return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
        }

        logger.info('Created profile for Clerk user', { clerkUserId: id })
        break
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data
        const primaryEmail = email_addresses?.[0]?.email_address

        // Update the profile in your database
        const { error } = await supabase
          .from('profiles')
          .update({
            email: primaryEmail,
            full_name: [first_name, last_name].filter(Boolean).join(' ') || null,
            avatar_url: image_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', id)

        if (error) {
          logger.error('Error updating profile', { error, clerkUserId: id })
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
        }

        logger.info('Updated profile for Clerk user', { clerkUserId: id })
        break
      }

      case 'user.deleted': {
        const { id } = evt.data

        if (!id) {
          return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
        }

        // Soft delete or handle deletion
        logger.info('User deleted in Clerk', { clerkUserId: id })
        
        // Optionally delete the profile
        // await supabase.from('profiles').delete().eq('clerk_user_id', id)
        
        break
      }

      default:
        logger.info('Unhandled webhook event', { eventType })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Webhook handler error', { error })
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
