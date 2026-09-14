import { readFileSync } from "node:fs"
import { join } from "node:path"

import * as React from "react"
import ts from "typescript"
import { describe, expect, it, vi } from "vitest"

import { getStaffNavHrefPath, getStaffNavHrefStatus } from "@/lib/dashboard/staff-navigation-active"

// Run the actual component function and its rendered button callbacks. Hook
// values are supplied without a DOM; browser tests own full-record integration.
const source = ts.createSourceFile("mobile-nav.tsx", readFileSync(join(process.cwd(), "components/ui/mobile-nav.tsx"), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "MobileNav")!
const compiled = ts.transpileModule(`${component.getText(source).replace("export function", "function")}; return MobileNav`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText

function harness(patient = false, pathname = "/doctor/intakes/synthetic") {
  const icon = () => null
  const items = [{ label: "Queue", href: "/dashboard", icon }, { label: "More", href: "__more__", icon }]
  const moreMenuItems = [{ label: "Requests", href: "/admin/intakes", icon }]
  let allowed = false
  let moreOpen = true
  const push = vi.fn()
  const permit = vi.fn(async () => allowed)
  let hook = 0
  const scope = {
    React, usePathname: () => pathname, useRouter: () => ({ push }),
    useSearchParams: () => new URLSearchParams(), useAuth: () => ({ signOut: vi.fn() }),
    useStaffNavigation: () => ({ permit }),
    useState: (initial: unknown) => ++hook === 1 ? [moreOpen, (value: boolean) => { moreOpen = value }] : [initial, vi.fn()],
    usePatientNavCounts: () => ({}), defaultItems: patient ? items : [], moreItems: patient ? moreMenuItems : [],
    getStaffNavHrefPath, getStaffNavHrefStatus, PATIENT_DASHBOARD_HREF: "/patient", PATIENT_MESSAGES_HREF: "/patient/messages",
    ACTIVE_MOBILE_NAV: "active", cn: (...values: unknown[]) => values.filter(Boolean).join(" "), X: icon, LogOut: icon,
  }
  const MobileNav = new Function(...Object.keys(scope), compiled)(...Object.values(scope))
  const tree = MobileNav({ items, moreMenuItems })
  const buttons: React.ReactElement<{ onClick: () => Promise<void> }>[] = []
  function walk(node: React.ReactNode) {
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (!React.isValidElement<{ children?: React.ReactNode; onClick: () => Promise<void> }>(node)) return
    if (node.type === "button") buttons.push(node)
    walk(node.props.children)
  }
  walk(tree)
  return {
    push, permit, moreOpen: () => moreOpen, allow: () => { allowed = true },
    click: async (href: string) => { await buttons.find(button => button.key === href)!.props.onClick() },
  }
}

describe("mobile staff navigation", () => {
  it.each(["/dashboard", "/admin/intakes"])("retains the full record on denied %s navigation and resumes after save", async href => {
    const h = harness()
    await h.click(href)
    expect(h.permit).toHaveBeenCalledOnce()
    expect(h.push).not.toHaveBeenCalled()
    expect(h.moreOpen()).toBe(true)
    h.allow()
    await h.click(href)
    expect(h.push).toHaveBeenCalledWith(href)
    expect(h.moreOpen()).toBe(false)
  })
  it("preserves patient navigation without staff leave permission", async () => {
    const h = harness(true)
    await h.click("/dashboard")
    expect(h.push).toHaveBeenCalledWith("/dashboard")
    expect(h.permit).not.toHaveBeenCalled()
  })
  it("keeps the active tab in place without attempting to leave", async () => {
    const h = harness(false, "/dashboard")
    await h.click("/dashboard")
    expect(h.push).not.toHaveBeenCalled()
    expect(h.permit).not.toHaveBeenCalled()
    expect(h.moreOpen()).toBe(false)
  })
})
