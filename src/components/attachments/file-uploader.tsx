'use client'

import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  X,
  FileText,
  Image,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { DEFAULT_UPLOAD_CONFIG, ATTACHMENT_TYPE_LABELS } from '@/lib/attachments/types'
import type { AttachmentType } from '@/types/database'

interface FileUploaderProps {
  intakeId: string
  onUploadComplete?: (attachment: unknown) => void
  allowedTypes?: AttachmentType[]
  maxFiles?: number
  className?: string
}

interface FileWithPreview {
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
  attachmentType: AttachmentType
}

export function FileUploader({
  intakeId,
  onUploadComplete,
  allowedTypes = ['id_document', 'medical_record', 'photo', 'other'],
  maxFiles = 5,
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const config = DEFAULT_UPLOAD_CONFIG

    if (file.size > config.maxSizeBytes) {
      return `File too large. Maximum size is ${config.maxSizeBytes / (1024 * 1024)}MB`
    }

    if (!config.allowedTypes.includes(file.type)) {
      return 'File type not allowed'
    }

    return null
  }

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null)

      if (files.length + newFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      const validFiles: FileWithPreview[] = []

      Array.from(newFiles).forEach((file) => {
        const validationError = validateFile(file)

        if (validationError) {
          setError(validationError)
          return
        }

        const preview = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined

        validFiles.push({
          file,
          preview,
          progress: 0,
          status: 'pending',
          attachmentType: 'other',
        })
      })

      setFiles((prev) => [...prev, ...validFiles])
    },
    [files.length, maxFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const file = prev[index]
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const updateFileType = (index: number, type: AttachmentType) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, attachmentType: type } : f))
    )
  }

  const uploadFile = async (index: number) => {
    const fileData = files[index]
    if (fileData.status === 'uploading' || fileData.status === 'complete') {
      return
    }

    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status: 'uploading', progress: 0 } : f
      )
    )

    const formData = new FormData()
    formData.append('file', fileData.file)
    formData.append('intakeId', intakeId)
    formData.append('attachmentType', fileData.attachmentType)

    try {
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'complete', progress: 100 } : f
        )
      )

      onUploadComplete?.(data.attachment)
    } catch (err) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'error',
                error: err instanceof Error ? err.message : 'Upload failed',
              }
            : f
        )
      )
    }
  }

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending')
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(i)
      }
    }
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={DEFAULT_UPLOAD_CONFIG.allowedTypes.join(',')}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="mt-2 font-medium">Drop files here or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">
          JPG, PNG, PDF, DOC up to 10MB
        </p>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((fileData, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg bg-card"
            >
              {/* Preview/Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                {fileData.preview ? (
                  <img
                    src={fileData.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : fileData.file.type === 'application/pdf' ? (
                  <FileText className="w-5 h-5 text-red-500" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {fileData.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(fileData.file.size / 1024).toFixed(1)} KB
                </p>

                {/* Progress */}
                {fileData.status === 'uploading' && (
                  <Progress value={fileData.progress} className="h-1 mt-2" />
                )}

                {/* Error */}
                {fileData.status === 'error' && (
                  <p className="text-xs text-destructive mt-1">
                    {fileData.error}
                  </p>
                )}
              </div>

              {/* Type Selector */}
              {fileData.status === 'pending' && (
                <Select
                  value={fileData.attachmentType}
                  onValueChange={(v) => updateFileType(index, v as AttachmentType)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ATTACHMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {fileData.status === 'complete' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {fileData.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
                {fileData.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
              </div>

              {/* Remove Button */}
              {fileData.status !== 'uploading' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          {/* Upload Button */}
          {pendingCount > 0 && (
            <Button onClick={uploadAllFiles} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload {pendingCount} File{pendingCount > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
