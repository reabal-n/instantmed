import { NextResponse } from "next/server"

import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit, getClientIdentifier } from "@/lib/rate-limit/redis"
import { normalizeVerificationCode } from "@/lib/utils/code-normalization"
import {
  isValidVerificationCodeFormat,
  verifyCertificateCode,
} from "@/lib/verify/public-verification"

const log = createLogger("employer-verify-bulk")
const MAX_BULK_CODES = 25

function parseCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => normalizeVerificationCode(item))
        .filter(Boolean),
    ),
  )
}

export async function POST(request: Request) {
  const clientIp = getClientIdentifier(request)
  const rateLimitResponse = await applyRateLimit(
    request,
    "standard",
    `employer-verify-bulk:${clientIp}`,
  )
  if (rateLimitResponse) return rateLimitResponse

  let body: { codes?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    )
  }

  const codes = parseCodes(body.codes)
  if (codes.length === 0) {
    return NextResponse.json(
      { error: "At least one verification code is required" },
      { status: 400 },
    )
  }

  if (codes.length > MAX_BULK_CODES) {
    return NextResponse.json(
      { error: `Bulk verification accepts up to ${MAX_BULK_CODES} codes at a time` },
      { status: 400 },
    )
  }

  const userAgent = request.headers.get("user-agent")
  const results = await Promise.all(
    codes.map(async (code) => {
      if (!isValidVerificationCodeFormat(code)) {
        return {
          code,
          error: "Invalid verification code format",
          valid: false,
        }
      }

      try {
        const result = await verifyCertificateCode(code, {
          clientIp,
          logSuccess: true,
          userAgent,
        })
        return { code, ...result }
      } catch (error) {
        log.warn("Bulk verification lookup failed", {
          codePrefix: code.slice(0, 4),
          error: error instanceof Error ? error.message : "unknown",
        })
        return {
          code,
          error: "Verification service temporarily unavailable",
          valid: false,
        }
      }
    }),
  )

  const validCount = results.filter((result) => result.valid).length

  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      valid: validCount,
      invalid: results.length - validCount,
    },
  })
}
