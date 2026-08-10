import { describe, expect, it } from "vitest"

import { extractClaudeJson } from "../claude-critique"

describe("Claude critique JSON extraction", () => {
  it("keeps plain JSON unchanged", () => {
    expect(extractClaudeJson('{"summary":"plain"}')).toBe(
      '{"summary":"plain"}',
    )
  })

  it("extracts JSON from a complete Markdown fence", () => {
    expect(extractClaudeJson('```json\n{"summary":"fenced"}\n```')).toBe(
      '{"summary":"fenced"}',
    )
  })

  it("recovers complete JSON when Claude omits the closing fence", () => {
    expect(extractClaudeJson('```json\n{"summary":"recoverable"}')).toBe(
      '{"summary":"recoverable"}',
    )
  })
})
