"use client"

/**
 * File Upload Component for Request Flow
 * 
 * Supports uploading previous prescription photos for repeat scripts.
 * - Drag and drop support
 * - Camera capture on mobile
 * - Image preview with remove
 * - File size validation
 */

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, Camera, X, FileImage, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  value?: File | null
  onChange: (file: File | null) => void
  accept?: string
  maxSizeMB?: number
  label?: string
  hint?: string
  className?: string
}

const MAX_FILE_SIZE_MB = 10

export function FileUpload({
  value,
  onChange,
  accept = "image/*",
  maxSizeMB = MAX_FILE_SIZE_MB,
  label = "Upload file",
  hint = "Drag and drop or click to upload",
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): boolean => {
    setError(null)
    
    // Check file type
    if (accept && !file.type.match(accept.replace("*", ".*"))) {
      setError("Please upload an image file (JPG, PNG, or HEIC)")
      return false
    }
    
    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB`)
      return false
    }
    
    return true
  }, [accept, maxSizeMB])

  const handleFile = useCallback((file: File) => {
    if (!validateFile(file)) {
      onChange(null)
      setPreview(null)
      return
    }
    
    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
    
    onChange(file)
  }, [validateFile, onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleRemove = useCallback(() => {
    onChange(null)
    setPreview(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }, [onChange])

  const handleCameraCapture = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute("capture", "environment")
      inputRef.current.click()
    }
  }, [])

  // Show preview if file is selected
  if (value && preview) {
    return (
      <div className={cn("relative", className)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-xl overflow-hidden border bg-muted/30"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview, Next Image doesn't support data URLs */}
          <img
            src={preview}
            alt="Upload preview"
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <FileImage className="w-4 h-4" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {value.name}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          error && "border-destructive/50 bg-destructive/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="sr-only"
        />
        
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          isDragOver ? "bg-primary/10" : "bg-muted"
        )}>
          <Upload className={cn(
            "w-5 h-5",
            isDragOver ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        </div>
        
        {/* Mobile camera button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 gap-2"
          onClick={(e) => {
            e.stopPropagation()
            handleCameraCapture()
          }}
        >
          <Camera className="w-4 h-4" />
          Take photo
        </Button>
      </div>
      
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 mt-2 text-destructive"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Size hint */}
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Max file size: {maxSizeMB}MB • Supported: JPG, PNG, HEIC
      </p>
    </div>
  )
}
