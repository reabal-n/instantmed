/**
 * @deprecated This file is deprecated as of Clerk migration.
 * Authentication middleware is now handled by Clerk in /workspaces/instantmed/middleware.ts
 * 
 * Keeping for reference only. Do not use.
 */

import { NextResponse, type NextRequest } from "next/server"

/**
 * @deprecated Use Clerk middleware instead - see middleware.ts
 */
export async function updateSession(_request: NextRequest) {
  console.warn("[DEPRECATED] lib/supabase/proxy.ts is deprecated. Use Clerk middleware instead.")
  return NextResponse.next()
}
