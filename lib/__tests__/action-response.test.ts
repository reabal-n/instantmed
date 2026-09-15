import { describe, expect, it } from "vitest"

import { readActionResult } from "@/scripts/e2e/action-response"

describe("compiled action response decoder", () => {
  it("extracts a promised action result without decoding page contents", () => {
    expect(readActionResult('0:{"a":"$@1","f":""}\n1:{"success":false}\n')).toEqual({ success: false })
  })
  it("skips byte-counted Flight text with no newline before the root", () => {
    const text = "Synthetic text é\nwith newline"
    const prefix = `2:T${Buffer.byteLength(text).toString(16)},${text}`
    expect(readActionResult(`${prefix}0:{"a":"$@1","f":[]}\n1:{"success":true}\n`)).toEqual({ success: true })
  })
  it("rejects a page-only or rejected action response", () => {
    expect(() => readActionResult('0:{"f":[]}\n')).toThrow("Direct action did not return")
    expect(() => readActionResult('0:{"a":"$@1"}\n1:E{"digest":"synthetic"}\n')).toThrow("missing or rejected")
  })
})
