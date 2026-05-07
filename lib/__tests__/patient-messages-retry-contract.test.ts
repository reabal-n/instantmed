import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const messagesClientSource = readFileSync(
  join(process.cwd(), "app/patient/messages/messages-client.tsx"),
  "utf8",
)
const patientMessagesRouteSource = readFileSync(
  join(process.cwd(), "app/api/patient/messages/route.ts"),
  "utf8",
)

describe("patient messages retry contract", () => {
  it("keeps failed patient replies recoverable instead of swallowed", () => {
    expect(messagesClientSource).toContain("failedMessage")
    expect(messagesClientSource).toContain("retryFailedMessage")
    expect(messagesClientSource).toContain("Reply not sent")
    expect(messagesClientSource).toContain("Try again")
    expect(messagesClientSource).toContain("Retry sent")
    expect(messagesClientSource).not.toContain('toast.error("Failed to send message. Please try again.")')
  })

  it("confirms when a reply returns a pending-info case to the doctor", () => {
    expect(messagesClientSource).toContain("replyReceived")
    expect(messagesClientSource).toContain("Reply received")
    expect(messagesClientSource).toContain("back with the doctor")
    expect(messagesClientSource).toContain("restored_status")
    expect(patientMessagesRouteSource).toContain("restored_status")
    expect(patientMessagesRouteSource).toContain("respond_to_info_request_atomic")
  })

  it("keeps the mobile message thread focused after selecting a conversation", () => {
    expect(messagesClientSource).toContain("ArrowLeft")
    expect(messagesClientSource).toContain("setSelectedIntake(null)")
    expect(messagesClientSource).toContain("Conversations")
    expect(messagesClientSource).toContain('selectedIntake && "hidden md:block"')
    expect(messagesClientSource).toContain('!selectedIntake && "hidden md:block"')
  })
})
