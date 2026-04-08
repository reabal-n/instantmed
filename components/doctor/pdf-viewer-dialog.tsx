"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, Download, Loader2 } from "lucide-react"

interface PdfViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Blob URL or signed URL pointing at the PDF. */
  pdfUrl: string | null
  /** Dialog title. Defaults to "Certificate". */
  title?: string
  /** Subtitle/description line under the title. */
  description?: string
  /** Shows a loading spinner in the body when truthy. */
  isLoading?: boolean
  /** Optional filename for the download button. When omitted, the download button is hidden. */
  downloadFilename?: string
}

/**
 * Shared PDF viewer dialog. Replaces the ad-hoc iframe modal that previously
 * lived inside intake-detail-header.tsx and the preview dialog's inline
 * iframe. One component means one set of a11y + layout fixes.
 */
export function PdfViewerDialog({
  open,
  onOpenChange,
  pdfUrl,
  title = "Certificate",
  description,
  isLoading = false,
  downloadFilename,
}: PdfViewerDialogProps) {
  const handleDownload = () => {
    if (!pdfUrl || !downloadFilename) return
    const a = document.createElement("a")
    a.href = pdfUrl
    a.download = downloadFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-[760px]">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm">{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="h-[70vh] bg-muted/30">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading PDF...</span>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title={title}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No PDF to display
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border">
          {downloadFilename && pdfUrl && (
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
