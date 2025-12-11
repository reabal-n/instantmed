'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export function Avatar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}>{children}</div>
}

export function AvatarFallback({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function AvatarImage({ src, alt }: { src: string; alt?: string }) {
  return <img src={src} alt={alt} />
}
