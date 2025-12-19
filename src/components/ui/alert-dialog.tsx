'use client'

import * as React from 'react'

export function AlertDialog({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function AlertDialogTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <h2>{children}</h2>
}

export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function AlertDialogAction({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick}>{children}</button>
}

export function AlertDialogCancel({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick}>{children}</button>
}
