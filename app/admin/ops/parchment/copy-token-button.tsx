"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function CopyTokenButton({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
      <Copy className="h-3 w-3" />
      Copy {label}
    </Button>
  )
}
