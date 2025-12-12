'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  Image,
  Download,
  Eye,
  CheckCircle,
  Shield,
  Loader2,
  Trash2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ATTACHMENT_TYPE_LABELS } from '@/lib/attachments/types'
import type { AttachmentType } from '@/types/database'

interface Attachment {
  id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  attachment_type: AttachmentType
  is_verified: boolean
  created_at: string
}

interface AttachmentListProps {
  attachments: Attachment[]
  canVerify?: boolean
  canDelete?: boolean
  onVerify?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  className?: string
}

export function AttachmentList({
  attachments,
  canVerify = false,
  canDelete = false,
  onVerify,
  onDelete,
  className,
}: AttachmentListProps) {
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [viewingUrl, setViewingUrl] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleView = async (attachment: Attachment) => {
    setLoadingId(attachment.id)

    try {
      const response = await fetch(`/api/attachments/${attachment.id}/signed-url`)
      const data = await response.json()

      if (data.url) {
        setViewingUrl(data.url)
        setViewingId(attachment.id)
      }
    } catch (error) {
      console.error('Failed to get signed URL:', error)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    setLoadingId(attachment.id)

    try {
      const response = await fetch(`/api/attachments/${attachment.id}/signed-url`)
      const data = await response.json()

      if (data.url) {
        const link = document.createElement('a')
        link.href = data.url
        link.download = attachment.file_name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Failed to download:', error)
    } finally {
      setLoadingId(null)
    }
  }

  const handleVerify = async (id: string) => {
    setLoadingId(id)
    try {
      await onVerify?.(id)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    setLoadingId(id)
    try {
      await onDelete?.(id)
    } finally {
      setLoadingId(null)
    }
  }

  const viewingAttachment = attachments.find((a) => a.id === viewingId)
  const isImage = viewingAttachment?.file_type.startsWith('image/')

  if (attachments.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <FileText className="w-10 h-10 mx-auto opacity-50" />
        <p className="mt-2">No attachments</p>
      </div>
    )
  }

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded bg-muted flex items-center justify-center">
              {attachment.file_type.startsWith('image/') ? (
                <Image className="w-5 h-5 text-blue-500" />
              ) : attachment.file_type === 'application/pdf' ? (
                <FileText className="w-5 h-5 text-red-500" />
              ) : (
                <FileText className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.file_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {ATTACHMENT_TYPE_LABELS[attachment.attachment_type]}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {(attachment.file_size_bytes / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>

            {/* Verified Badge */}
            {attachment.is_verified && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Verified
              </Badge>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleView(attachment)}
                disabled={loadingId === attachment.id}
              >
                {loadingId === attachment.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(attachment)}
                disabled={loadingId === attachment.id}
              >
                <Download className="w-4 h-4" />
              </Button>

              {canVerify && !attachment.is_verified && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleVerify(attachment.id)}
                  disabled={loadingId === attachment.id}
                  title="Verify document"
                >
                  <Shield className="w-4 h-4" />
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(attachment.id)}
                  disabled={loadingId === attachment.id}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewingId} onOpenChange={() => setViewingId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingAttachment?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px] bg-muted rounded-lg overflow-hidden">
            {isImage && viewingUrl ? (
              <img
                src={viewingUrl}
                alt={viewingAttachment?.file_name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : viewingUrl ? (
              <iframe
                src={viewingUrl}
                className="w-full h-[70vh]"
                title={viewingAttachment?.file_name}
              />
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
