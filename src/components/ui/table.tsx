import * as React from 'react'
import { cn } from '@/lib/utils'

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <table className={cn('w-full caption-bottom text-sm', className)}>{children}</table>
}

export function TableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <thead className={cn('[&_tr]:border-b', className)}>{children}</thead>
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('border-b transition-colors', className)}>{children}</tr>
}

export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('h-12 px-4 text-left align-middle font-medium', className)}>{children}</th>
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('p-4 align-middle', className)}>{children}</td>
}
