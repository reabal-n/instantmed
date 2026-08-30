import "server-only"

import twilio from "twilio"

const MAX_FORM_BYTES = 32 * 1024

export type ValidatedTwilioVoiceRequest = {
  ok: true
  params: URLSearchParams
}

export type RejectedTwilioVoiceRequest = {
  ok: false
  response: Response
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

function getTwilioVoicePublicBaseUrl(): string {
  const configured = process.env.TWILIO_VOICE_PUBLIC_BASE_URL?.trim()
  if (!configured) {
    throw new Error("TWILIO_VOICE_PUBLIC_BASE_URL is not configured")
  }

  const url = new URL(configured)
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("TWILIO_VOICE_PUBLIC_BASE_URL must use HTTPS in production")
  }

  return url.toString().replace(/\/$/, "")
}

export function getTwilioVoiceUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`
  return `${getTwilioVoicePublicBaseUrl()}${normalizedPath}`
}

export function getTwilioVoiceWebSocketUrl(pathname: string): string {
  const url = new URL(getTwilioVoiceUrl(pathname))
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:"
  return url.toString()
}

function toTwilioParams(params: URLSearchParams): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {}

  for (const key of new Set(params.keys())) {
    const all = params.getAll(key)
    values[key] = all.length === 1 ? all[0] : all
  }

  return values
}

export async function validateTwilioVoiceForm(
  request: Request,
  pathname: string,
): Promise<ValidatedTwilioVoiceRequest | RejectedTwilioVoiceRequest> {
  const contentLength = request.headers.get("content-length")
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_FORM_BYTES) {
    return { ok: false, response: errorResponse("Payload too large", 413) }
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return { ok: false, response: errorResponse("Unsupported content type", 415) }
  }

  const body = await request.text()
  if (Buffer.byteLength(body, "utf8") > MAX_FORM_BYTES) {
    return { ok: false, response: errorResponse("Payload too large", 413) }
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  if (!authToken) {
    return { ok: false, response: errorResponse("Voice webhook is not configured", 503) }
  }

  const signature = request.headers.get("x-twilio-signature")
  if (!signature) {
    return { ok: false, response: errorResponse("Missing signature", 401) }
  }

  let publicUrl: string
  try {
    publicUrl = getTwilioVoiceUrl(pathname)
  } catch {
    return { ok: false, response: errorResponse("Voice webhook is not configured", 503) }
  }

  const params = new URLSearchParams(body)
  const valid = twilio.validateRequest(authToken, signature, publicUrl, toTwilioParams(params))
  if (!valid) {
    return { ok: false, response: errorResponse("Invalid signature", 401) }
  }

  return { ok: true, params }
}

export function validateTwilioVoiceWebSocketSignature(
  request: Request,
  pathname: string,
): { ok: true } | RejectedTwilioVoiceRequest {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  if (!authToken) {
    return { ok: false, response: errorResponse("Voice webhook is not configured", 503) }
  }

  const signature = request.headers.get("x-twilio-signature")
  if (!signature) {
    return { ok: false, response: errorResponse("Missing signature", 401) }
  }

  let publicUrl: string
  try {
    publicUrl = getTwilioVoiceWebSocketUrl(pathname)
  } catch {
    return { ok: false, response: errorResponse("Voice webhook is not configured", 503) }
  }

  // Twilio documents a trailing-slash retry specifically for Voice WSS
  // handshakes because infrastructure can canonicalise the upgrade URL.
  const candidates = [publicUrl, publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : `${publicUrl}/`]
  const valid = candidates.some((candidate) =>
    twilio.validateRequest(authToken, signature, candidate, {}),
  )

  return valid
    ? { ok: true }
    : { ok: false, response: errorResponse("Invalid signature", 401) }
}

export function twimlResponse(twiml: string): Response {
  return new Response(twiml, {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/xml; charset=utf-8",
    },
  })
}
