"use client"

import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type CaseAction = {
  label: string
  onSelect: () => void
  disabled?: boolean
}

/** The caller supplies only permitted actions; this menu owns no authorization. */
export function CaseActionsMenu({ requestRef, actions }: { requestRef: string; actions: CaseAction[] }) {
  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="min-h-11" aria-label={`Actions for request ${requestRef}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" /> Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        {actions.map((action) => (
          <DropdownMenuItem key={action.label} className="min-h-11" disabled={action.disabled} onSelect={action.onSelect}>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
