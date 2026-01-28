/**
 * Request Validation Middleware
 * 
 * Validates API inputs at the edge before processing.
 * Provides type-safe request parsing with Zod.
 */

import { NextRequest, NextResponse } from "next/server"
import { z, ZodSchema, ZodError } from "zod"
import * as Sentry from "@sentry/nextjs"

export interface ValidationError {
  field: string
  message: string
}

export interface ValidatedRequest<T> {
  data: T
  raw: Request
}

/**
 * Parse and validate JSON body
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: ValidationError[] }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        success: false,
        errors: formatZodErrors(result.error),
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      errors: [{ field: "body", message: "Invalid JSON body" }],
    }
  }
}

/**
 * Parse and validate query parameters
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const result = schema.safeParse(params)

  if (!result.success) {
    return {
      success: false,
      errors: formatZodErrors(result.error),
    }
  }

  return { success: true, data: result.data }
}

/**
 * Parse and validate route parameters
 */
export function validateParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const result = schema.safeParse(params)

  if (!result.success) {
    return {
      success: false,
      errors: formatZodErrors(result.error),
    }
  }

  return { success: true, data: result.data }
}

/**
 * Format Zod errors into a consistent structure
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "unknown",
    message: issue.message,
  }))
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(errors: ValidationError[]): NextResponse {
  return NextResponse.json(
    {
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: errors,
    },
    { status: 400 }
  )
}

/**
 * Create a validated API handler
 * 
 * @example
 * const bodySchema = z.object({ name: z.string(), email: z.string().email() })
 * 
 * export const POST = withValidation({ body: bodySchema }, async (req, { body }) => {
 *   // body is typed as { name: string; email: string }
 *   return NextResponse.json({ success: true })
 * })
 */
export function withValidation<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
>(
  schemas: {
    body?: ZodSchema<TBody>
    query?: ZodSchema<TQuery>
    params?: ZodSchema<TParams>
  },
  handler: (
    request: NextRequest,
    validated: {
      body: TBody
      query: TQuery
      params: TParams
    },
    context?: { params: Record<string, string | string[]> }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context?: { params: Record<string, string | string[]> }
  ): Promise<NextResponse> => {
    const validated: {
      body: TBody
      query: TQuery
      params: TParams
    } = {
      body: undefined as TBody,
      query: undefined as TQuery,
      params: undefined as TParams,
    }

    // Validate body if schema provided
    if (schemas.body) {
      const result = await validateBody(request, schemas.body)
      if (!result.success) {
        return validationErrorResponse(result.errors)
      }
      validated.body = result.data
    }

    // Validate query if schema provided
    if (schemas.query) {
      const result = validateQuery(request, schemas.query)
      if (!result.success) {
        return validationErrorResponse(result.errors)
      }
      validated.query = result.data
    }

    // Validate params if schema provided
    if (schemas.params && context?.params) {
      const result = validateParams(context.params, schemas.params)
      if (!result.success) {
        return validationErrorResponse(result.errors)
      }
      validated.params = result.data
    }

    try {
      return await handler(request, validated, context)
    } catch (error) {
      Sentry.captureException(error)
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
}
