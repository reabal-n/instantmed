'use client'

import * as React from 'react'

export function Accordion({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function AccordionItem({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function AccordionTrigger({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>
}

export function AccordionContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
