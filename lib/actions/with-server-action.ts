/**
 * withServerAction - Standardized wrapper for authenticated server actions.
 *
 * NOTE: No "use server" here. This is a factory function, not a server action.
 * The consuming files (app/actions/*.ts) have "use server" at module level,
 * which makes the async functions returned by withServerAction into server actions.
 *
 * Eliminates boilerplate:
 *   createServiceRoleClient() -> requireRoleOrNull() -> Sentry.setTag() -> try/catch -> error formatting
 *
 * Usage:
 *   export const myAction = withServerAction(
 *     { roles: ["doctor", "admin"], name: "my-action" },
 *     async (input, { supabase, profile, log }) => {
 *       // ... business logic
 *       return { success: true, data: result }
 *     }
 *   )
 *
 * Auth modes:
 *   - roles: [...] -- uses requireRoleOrNull (non-throwing, returns Unauthorized)
 *   - auth: "public" -- no auth check, profile/supabase still provided
 *   - auth: "apiAuth" -- uses getApiAuth (for patient self-service actions)
 */

import * as Sentry from "@sentry/nextjs"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { AuthenticatedUser } from "@/lib/auth/helpers"
import { getApiAuth, requireRoleOrNull } from "@/lib/auth/helpers"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { Profile } from "@/types/db"
import type { ActionResult } from "@/types/shared"

type UserRole = "patient" | "doctor" | "admin"

export interface ActionContext {
  supabase: SupabaseClient
  profile: Profile
  userId: string
  log: ReturnType<typeof createLogger>
}

interface RoleAuthOptions {
  /** Allowed roles for the action. Uses requireRoleOrNull (non-throwing). */
  roles: UserRole[]
  /** Action name for logging and Sentry tags. */
  name: string
}

interface ApiAuthOptions {
  /** Uses getApiAuth -- for patient self-service actions that use auth_user_id. */
  auth: "apiAuth"
  /** Action name for logging and Sentry tags. */
  name: string
}

type ServerActionOptions = RoleAuthOptions | ApiAuthOptions

function isRoleAuth(opts: ServerActionOptions): opts is RoleAuthOptions {
  return "roles" in opts
}

/**
 * Wrap an authenticated server action with standard boilerplate:
 * auth check, Sentry tagging, service-role client, structured error handling.
 */
export function withServerAction<TInput, TOutput = unknown>(
  options: ServerActionOptions,
  handler: (input: TInput, ctx: ActionContext) => Promise<ActionResult<TOutput>>
) {
  const log = createLogger(options.name)

  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    try {
      let profile: Profile
      let userId: string

      if (isRoleAuth(options)) {
        const authResult: AuthenticatedUser | null = await requireRoleOrNull(options.roles)
        if (!authResult) {
          return { success: false, error: "Unauthorized" }
        }
        profile = authResult.profile
        userId = authResult.user.id
      } else {
        // apiAuth mode
        const authResult = await getApiAuth()
        if (!authResult) {
          return { success: false, error: "Please sign in to continue" }
        }
        profile = authResult.profile
        userId = authResult.userId
      }

      Sentry.setTag("action", options.name)
      Sentry.setUser({ id: profile.id })

      const supabase = createServiceRoleClient()
      return await handler(input, { supabase, profile, userId, log })
    } catch (error) {
      log.error(`${options.name} failed`, {
        error: error instanceof Error ? error.message : String(error),
      })
      Sentry.captureException(error, {
        tags: { action: options.name },
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }
}
