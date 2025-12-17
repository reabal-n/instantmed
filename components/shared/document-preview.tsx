"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Printer, X, Maximize2, FileText, Loader2 } from "lucide-react"

interface DocumentPreviewProps {
  url: string
  title?: string
  trigger?: React.ReactNode
  onDownload?: () => void
}

export function DocumentPreview({ url, title = "Document Preview", trigger, onDownload }: DocumentPreviewProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const handlePrint = () => {
    const printWindow = window.open(url, "_blank")
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = url
    link.download = title.replace(/\s+/g, "_") + ".pdf"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    onDownload?.()
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="rounded-xl bg-white/50 hover:bg-white/80"
        >
          <FileText className="mr-2 h-4 w-4" />
          Preview
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="rounded-lg"
              >
                <Printer className="h-4 w-4" />
                <span className="sr-only">Print</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="rounded-lg"
              >
                <Download className="h-4 w-4" />
                <span className="sr-only">Download</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, "_blank")}
                className="rounded-lg"
              >
                <Maximize2 className="h-4 w-4" />
                <span className="sr-only">Open in new tab</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="rounded-lg"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 relative bg-muted/30">
            {isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading document...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Unable to preview document</p>
                  <Button onClick={handleDownload} className="rounded-xl">
                    <Download className="mr-2 h-4 w-4" />
                    Download Instead
                  </Button>
                </div>
              </div>
            )}

            <iframe
              src={`${url}#toolbar=0&navpanes=0`}
              className="w-full h-full border-0"
              title={title}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setError(true)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Simple preview button for use in lists
export function DocumentPreviewButton({ url, title }: { url: string; title?: string }) {
  return (
    <DocumentPreview
      url={url}
      title={title}
      trigger={
        <Button variant="ghost" size="sm" className="rounded-lg h-8 px-2">
          <FileText className="h-4 w-4" />
          <span className="sr-only">Preview document</span>
        </Button>
      }
    />
  )
}
