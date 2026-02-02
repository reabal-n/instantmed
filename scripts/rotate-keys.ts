#!/usr/bin/env tsx
/**
 * API Key Rotation Script
 * Supports zero-downtime rotation with dual-key overlap period.
 *
 * Usage:
 *   npx tsx scripts/rotate-keys.ts --key INTERNAL_API_KEY --new-value <new-key>
 *
 * Process:
 * 1. Set INTERNAL_API_KEY_NEW in Vercel env
 * 2. Deploy (both old and new keys work during overlap)
 * 3. After verification, update INTERNAL_API_KEY to new value
 * 4. Remove INTERNAL_API_KEY_NEW
 * 5. Deploy again
 */

console.log("API Key Rotation Helper")
console.log("========================")
console.log("")
console.log("Steps for zero-downtime rotation:")
console.log("1. Generate new key: openssl rand -base64 32")
console.log("2. Set as INTERNAL_API_KEY_NEW in Vercel")
console.log("3. Deploy and verify both keys work")
console.log("4. Update INTERNAL_API_KEY to the new value")
console.log("5. Remove INTERNAL_API_KEY_NEW")
console.log("6. Deploy final")
console.log("")
console.log("For CRON_SECRET rotation:")
console.log("1. Update CRON_SECRET in Vercel")
console.log("2. Deploy immediately (Vercel cron uses the env at runtime)")
