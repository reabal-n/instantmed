/**
 * PHI Encryption Tests
 * 
 * Tests the envelope encryption implementation for PHI data.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

// Mock environment before importing the module
const TEST_MASTER_KEY = Buffer.from("0".repeat(64), "hex").toString("base64") // 32 bytes

beforeAll(() => {
  vi.stubEnv("PHI_ENCRYPTION_ENABLED", "true")
  vi.stubEnv("PHI_ENCRYPTION_WRITE_ENABLED", "true")
  vi.stubEnv("PHI_ENCRYPTION_READ_ENABLED", "true")
  vi.stubEnv("PHI_MASTER_KEY", TEST_MASTER_KEY)
})

afterAll(() => {
  vi.unstubAllEnvs()
})

describe("PHI Encryption", () => {
  describe("encryptPHI and decryptPHI", () => {
    it("should encrypt and decrypt a string successfully", async () => {
      const { encryptPHI, decryptPHI } = await import("../security/phi-encryption")
      
      const plaintext = "Patient has mild symptoms of headache and fatigue."
      const encrypted = await encryptPHI(plaintext)
      
      // Verify encrypted structure
      expect(encrypted).toHaveProperty("ciphertext")
      expect(encrypted).toHaveProperty("encryptedDataKey")
      expect(encrypted).toHaveProperty("iv")
      expect(encrypted).toHaveProperty("authTag")
      expect(encrypted).toHaveProperty("keyId")
      expect(encrypted).toHaveProperty("version")
      expect(encrypted.version).toBe(1)
      
      // Verify ciphertext is different from plaintext
      expect(encrypted.ciphertext).not.toBe(plaintext)
      
      // Decrypt and verify
      const decrypted = await decryptPHI(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it("should generate unique keys for each encryption", async () => {
      const { encryptPHI } = await import("../security/phi-encryption")
      
      const plaintext = "Same text encrypted twice"
      const encrypted1 = await encryptPHI(plaintext)
      const encrypted2 = await encryptPHI(plaintext)
      
      // Key IDs should be different
      expect(encrypted1.keyId).not.toBe(encrypted2.keyId)
      
      // Ciphertexts should be different (different IVs)
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
    })

    it("should handle empty strings", async () => {
      const { encryptPHI, decryptPHI } = await import("../security/phi-encryption")
      
      const plaintext = ""
      const encrypted = await encryptPHI(plaintext)
      const decrypted = await decryptPHI(encrypted)
      
      expect(decrypted).toBe(plaintext)
    })

    it("should handle unicode characters", async () => {
      const { encryptPHI, decryptPHI } = await import("../security/phi-encryption")
      
      const plaintext = "Patient name: 田中太郎 🏥 Allergies: none"
      const encrypted = await encryptPHI(plaintext)
      const decrypted = await decryptPHI(encrypted)
      
      expect(decrypted).toBe(plaintext)
    })

    it("should handle large text", async () => {
      const { encryptPHI, decryptPHI } = await import("../security/phi-encryption")
      
      const plaintext = "A".repeat(100000) // 100KB of text
      const encrypted = await encryptPHI(plaintext)
      const decrypted = await decryptPHI(encrypted)
      
      expect(decrypted).toBe(plaintext)
    })
  })

  describe("encryptJSONB and decryptJSONB", () => {
    it("should encrypt and decrypt JSONB objects", async () => {
      const { encryptJSONB, decryptJSONB } = await import("../security/phi-encryption")
      
      const data = {
        symptoms: ["headache", "fatigue"],
        severity: "mild",
        duration: "2 days",
        medications: [
          { name: "Paracetamol", dosage: "500mg" }
        ]
      }
      
      const encrypted = await encryptJSONB(data)
      const decrypted = await decryptJSONB<typeof data>(encrypted)
      
      expect(decrypted).toEqual(data)
    })

    it("should handle nested objects", async () => {
      const { encryptJSONB, decryptJSONB } = await import("../security/phi-encryption")
      
      const data = {
        patient: {
          name: "John Doe",
          history: {
            allergies: ["penicillin"],
            conditions: {
              chronic: ["asthma"],
              acute: []
            }
          }
        }
      }
      
      const encrypted = await encryptJSONB(data)
      const decrypted = await decryptJSONB<typeof data>(encrypted)
      
      expect(decrypted).toEqual(data)
    })
  })

  describe("isEncryptedPHI", () => {
    it("should correctly identify encrypted PHI objects", async () => {
      const { encryptPHI, isEncryptedPHI } = await import("../security/phi-encryption")
      
      const encrypted = await encryptPHI("test")
      expect(isEncryptedPHI(encrypted)).toBe(true)
    })

    it("should reject non-encrypted objects", async () => {
      const { isEncryptedPHI } = await import("../security/phi-encryption")
      
      expect(isEncryptedPHI(null)).toBe(false)
      expect(isEncryptedPHI(undefined)).toBe(false)
      expect(isEncryptedPHI("string")).toBe(false)
      expect(isEncryptedPHI(123)).toBe(false)
      expect(isEncryptedPHI({ foo: "bar" })).toBe(false)
      expect(isEncryptedPHI({ ciphertext: "abc" })).toBe(false) // Missing fields
    })
  })

  describe("generateMasterKey", () => {
    it("should generate a valid 32-byte base64 key", async () => {
      const { generateMasterKey } = await import("../security/phi-encryption")
      
      const key = generateMasterKey()
      const decoded = Buffer.from(key, "base64")
      
      expect(decoded.length).toBe(32)
    })
  })
})
