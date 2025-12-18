"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Maximize2, Minimize2, Download, ExternalLink, X } from "lucide-react"

interface PDFPreviewProps {
  url: string
  title?: string
  className?: string
  defaultExpanded?: boolean
}

export function PDFPreview({ url, title = "Document Preview", className, defaultExpanded = false }: PDFPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isFullscreen, setIsFullscreen] = useState(false)

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="gap-2 text-xs"
      >
        <Maximize2 className="h-3 w-3" />
        Preview PDF
      </Button>
    )
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-black/50">
          <h3 className="text-white font-medium">{title}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(url, "_blank")}
              className="text-white hover:bg-white/20"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white hover:bg-white/20"
            >
              <a href={url} download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 p-4">
          <iframe
            src={`${url}#toolbar=0&navpanes=0`}
            className="w-full h-full rounded-lg bg-white"
            title={title}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("border rounded-xl overflow-hidden bg-muted/30", className)}>
      <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(true)}
            className="h-7 w-7 p-0"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="h-7 w-7 p-0"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="aspect-[8.5/11] max-h-[400px]">
        <iframe
          src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
          className="w-full h-full"
          title={title}
        />
      </div>
    </div>
  )
}

// Inline preview that shows in a card
export function PDFPreviewInline({ url, className }: { url: string; className?: string }) {
  return (
    <div className={cn("rounded-xl overflow-hidden border bg-white shadow-sm", className)}>
      <iframe
        src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        className="w-full aspect-[8.5/11] max-h-[300px]"
        title="Document preview"
      />
    </div>
  )
}
