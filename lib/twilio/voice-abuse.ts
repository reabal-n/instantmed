import "server-only"

import { createHmac } from "node:crypto"

import { Redis } from "@upstash/redis"

const ACTIVE_CALLS_KEY = "twilio:voice:active"
const ACTIVE_CALL_LEASE_MS = 15 * 60 * 1000
const MAX_CONCURRENT_CALLS = 4

function hmac(value: string, purpose: string): string {
  const secret = process.env.TWILIO_VOICE_SESSION_SECRET?.trim()
  if (!secret) throw new Error("TWILIO_VOICE_SESSION_SECRET is not configured")
  return createHmac("sha256", secret).update(`${purpose}:${value}`).digest("hex")
}

export function fingerprintVoiceCaller(caller: string): string {
  return hmac(caller.trim() || "anonymous", "voice-caller")
}

function fingerprintVoiceCall(callSid: string): string {
  return hmac(callSid, "voice-concurrency")
}

export function isVoiceCallerBlocked(callerFingerprint: string): boolean {
  const blocked = process.env.TWILIO_VOICE_BLOCKED_CALLER_HASHES
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? []
  return blocked.includes(callerFingerprint)
}

function hasRedis(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN,
  )
}

export async function claimVoiceCallSlot(callSid: string): Promise<boolean> {
  if (!hasRedis()) return process.env.NODE_ENV !== "production"

  const redis = Redis.fromEnv()
  const now = Date.now()
  const member = fingerprintVoiceCall(callSid)
  const result = await redis.eval(
    `
      redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", ARGV[1])
      if redis.call("ZSCORE", KEYS[1], ARGV[3]) then
        return 1
      end
      if redis.call("ZCARD", KEYS[1]) >= tonumber(ARGV[4]) then
        return 0
      end
      redis.call("ZADD", KEYS[1], ARGV[2], ARGV[3])
      redis.call("PEXPIRE", KEYS[1], ARGV[5])
      return 1
    `,
    [ACTIVE_CALLS_KEY],
    [
      now,
      now + ACTIVE_CALL_LEASE_MS,
      member,
      MAX_CONCURRENT_CALLS,
      ACTIVE_CALL_LEASE_MS,
    ],
  )
  return Number(result) === 1
}

export async function releaseVoiceCallSlot(callSid: string): Promise<void> {
  if (!hasRedis()) return
  const redis = Redis.fromEnv()
  await redis.zrem(ACTIVE_CALLS_KEY, fingerprintVoiceCall(callSid))
}
