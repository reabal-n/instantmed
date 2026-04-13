import { describe, expect,it } from "vitest"

import { type ContextualMessageService,selectContextualMessage } from "@/lib/marketing/contextual-messages"

function at(isoDay: string, hour: number): Date {
  return new Date(`${isoDay}T${String(hour).padStart(2, "0")}:30:00+10:00`)
}

describe("selectContextualMessage", () => {
  const services: ContextualMessageService[] = ["med-cert", "ed", "hair-loss"]

  it.each(services)("returns a non-empty string for %s on Monday morning", (service) => {
    const msg = selectContextualMessage(service, at("2026-04-13", 8)) // Mon 8:30am AEST
    expect(msg).toBeTruthy()
    expect(msg?.length).toBeGreaterThan(10)
  })

  it.each(services)("returns a non-empty string for %s on Sunday evening", (service) => {
    const msg = selectContextualMessage(service, at("2026-04-12", 19)) // Sun 7:30pm AEST
    expect(msg).toBeTruthy()
  })

  it("returns a different message for each service at the same time", () => {
    const clock = at("2026-04-13", 8)
    const medCert = selectContextualMessage("med-cert", clock)
    const ed = selectContextualMessage("ed", clock)
    const hairLoss = selectContextualMessage("hair-loss", clock)
    expect(medCert).not.toEqual(ed)
    expect(medCert).not.toEqual(hairLoss)
    expect(ed).not.toEqual(hairLoss)
  })

  it("never returns a string containing drug names for ED or hair loss", () => {
    const drugRe = /viagra|cialis|sildenafil|tadalafil|pde5|finasteride|minoxidil|propecia|rogaine/i
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const clock = new Date(`2026-04-${13 + day}T${String(hour).padStart(2, "0")}:00:00+10:00`)
        const ed = selectContextualMessage("ed", clock) ?? ""
        const hl = selectContextualMessage("hair-loss", clock) ?? ""
        expect(ed).not.toMatch(drugRe)
        expect(hl).not.toMatch(drugRe)
      }
    }
  })
})
