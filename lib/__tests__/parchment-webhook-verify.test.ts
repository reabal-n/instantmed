/**
 * Parchment Webhook Signature Verification Tests
 *
 * Covers `verifyWebhookSignature` — the only layer between Parchment and our
 * patient DB. Any false positive here lets an attacker mark scripts as sent.
 */

import { createHmac } from "crypto"
import { describe, expect, it } from "vitest"

import { verifyWebhookSignature } from "../parchment/client"

const SECRET = "whsec_test_abcdef0123456789abcdef0123456789"

function sign(body: string, secret: string, timestamp?: number): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000)
  const sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")
  return `t=${ts},v1=${sig}`
}

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event_type: "prescription.created", scid: "SCID-1" })

  describe("happy path", () => {
    it("accepts a valid signature within the replay window", () => {
      const header = sign(body, SECRET)
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(true)
    })

    it("accepts timestamps at the boundary (4m 59s old)", () => {
      const ts = Math.floor(Date.now() / 1000) - 299
      const header = sign(body, SECRET, ts)
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(true)
    })
  })

  describe("replay protection", () => {
    it("rejects timestamps > 5 minutes in the past", () => {
      const ts = Math.floor(Date.now() / 1000) - 301
      const header = sign(body, SECRET, ts)
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/5-minute/i)
    })

    it("rejects timestamps > 5 minutes in the future (clock skew attack)", () => {
      const ts = Math.floor(Date.now() / 1000) + 301
      const header = sign(body, SECRET, ts)
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/5-minute/i)
    })

    it("rejects non-numeric timestamps (e.g. t=abc) without falling through to HMAC", () => {
      // Without this guard, `parseInt("abc") → NaN`, `NaN > 300 → false`, and
      // the HMAC check would run with a bogus timestamp.
      const fakeSig = createHmac("sha256", SECRET).update(`abc.${body}`).digest("hex")
      const header = `t=abc,v1=${fakeSig}`
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/unix integer/i)
    })

    it("rejects empty timestamp", () => {
      const fakeSig = createHmac("sha256", SECRET).update(`.${body}`).digest("hex")
      const header = `t=,v1=${fakeSig}`
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
    })
  })

  describe("signature validation", () => {
    it("rejects a signature signed with the wrong secret", () => {
      const header = sign(body, "wrong-secret")
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/mismatch/i)
    })

    it("rejects a signature for a different body (tamper detection)", () => {
      const header = sign(body, SECRET)
      const tampered = body.replace("SCID-1", "SCID-2")
      const result = verifyWebhookSignature(tampered, header, SECRET)
      expect(result.valid).toBe(false)
    })

    it("rejects non-hex signature characters", () => {
      const ts = Math.floor(Date.now() / 1000)
      const header = `t=${ts},v1=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz`
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/hex/i)
    })

    it("rejects odd-length hex signatures", () => {
      const ts = Math.floor(Date.now() / 1000)
      const header = `t=${ts},v1=abc`
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
    })

    it("rejects a signature with correct hex but wrong length", () => {
      const ts = Math.floor(Date.now() / 1000)
      // 64 hex chars is HMAC-SHA256; give it 32
      const header = `t=${ts},v1=deadbeefdeadbeefdeadbeefdeadbeef`
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/length/i)
    })
  })

  describe("header format", () => {
    it("rejects missing t= component", () => {
      const ts = Math.floor(Date.now() / 1000)
      const sig = createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex")
      const header = `v1=${sig}`
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/format/i)
    })

    it("rejects missing v1= component", () => {
      const ts = Math.floor(Date.now() / 1000)
      const header = `t=${ts}`
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/format/i)
    })

    it("rejects empty header string", () => {
      const result = verifyWebhookSignature(body, "", SECRET)
      expect(result.valid).toBe(false)
    })

    it("accepts components in either order", () => {
      const ts = Math.floor(Date.now() / 1000)
      const sig = createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex")
      const header = `v1=${sig},t=${ts}`
      const result = verifyWebhookSignature(body, header, SECRET)
      expect(result.valid).toBe(true)
    })
  })
})
