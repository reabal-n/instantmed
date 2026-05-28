import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { getEnv, parseEnvValue, readLocalEnvValue } from "../local-env"
import { selectLatestAnthropicOpusModel } from "../claude-model"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("video-review local env hydration", () => {
  it("uses .env.local when the shell value is empty", () => {
    const cwd = mkdtempSync(join(tmpdir(), "instantmed-video-env-"))
    writeFileSync(join(cwd, ".env.local"), "ANTHROPIC_API_KEY=local-anthropic-test-key\n")

    process.env.ANTHROPIC_API_KEY = ""

    expect(readLocalEnvValue("ANTHROPIC_API_KEY", cwd)).toBe("local-anthropic-test-key")
  })

  it("keeps an explicit shell value ahead of local files", () => {
    const cwd = mkdtempSync(join(tmpdir(), "instantmed-video-env-"))
    writeFileSync(join(cwd, ".env.local"), "ANTHROPIC_API_KEY=local-anthropic-test-key\n")

    process.env.ANTHROPIC_API_KEY = "shell-anthropic-test-key"

    expect(getEnv("ANTHROPIC_API_KEY")).toBe("shell-anthropic-test-key")
  })

  it("parses quoted values and strips inline comments", () => {
    expect(parseEnvValue("'quoted value'")).toBe("quoted value")
    expect(parseEnvValue("abc123 # comment")).toBe("abc123")
  })

  it("selects the latest available Claude Opus model from Anthropic model metadata", () => {
    expect(
      selectLatestAnthropicOpusModel([
        { id: "claude-sonnet-4-6", created_at: "2026-01-01T00:00:00Z" },
        { id: "claude-opus-4-6", created_at: "2026-02-01T00:00:00Z" },
        { id: "claude-opus-4-7", created_at: "2026-03-01T00:00:00Z" },
      ]),
    ).toBe("claude-opus-4-7")
  })
})
