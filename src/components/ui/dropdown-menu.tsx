'use client'

import * as React from 'react'

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function DropdownMenuTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function DropdownMenuContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function DropdownMenuItem({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick}>{children}</button>
}

export function DropdownMenuSeparator() {
  return <hr />
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
