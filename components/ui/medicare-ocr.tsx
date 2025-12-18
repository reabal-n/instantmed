"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Camera, Upload, Loader2, Check, X, AlertCircle } from "lucide-react"
import Tesseract from "tesseract.js"

interface MedicareOCRResult {
  medicareNumber: string | null
  irn: string | null
  expiryMonth: string | null
  expiryYear: string | null
  confidence: number
}

interface MedicareOCRProps {
  onResult: (result: MedicareOCRResult) => void
  onError?: (error: string) => void
  className?: string
}

// Regex patterns for Medicare card parsing
const MEDICARE_NUMBER_PATTERN = /\b(\d{4}\s?\d{5}\s?\d)\b/
const EXPIRY_PATTERN = /(\d{2})[\s/.-]?(\d{2,4})/
const IRN_PATTERN = /\b([1-5])\b/

function parseMedicareFromText(text: string): MedicareOCRResult {
  const result: MedicareOCRResult = {
    medicareNumber: null,
    irn: null,
    expiryMonth: null,
    expiryYear: null,
    confidence: 0,
  }

  // Clean up the text
  const cleanText = text.replace(/[^\d\s/.-]/g, " ").replace(/\s+/g, " ")

  // Find Medicare number (10 digits, often formatted as XXXX XXXXX X)
  const medicareMatch = cleanText.match(MEDICARE_NUMBER_PATTERN)
  if (medicareMatch) {
    result.medicareNumber = medicareMatch[1].replace(/\s/g, "")
    result.confidence += 40
  }

  // Find expiry date (MM/YY or MM/YYYY)
  const expiryMatches = cleanText.match(new RegExp(EXPIRY_PATTERN, "g"))
  if (expiryMatches) {
    for (const match of expiryMatches) {
      const parts = match.match(EXPIRY_PATTERN)
      if (parts) {
        const month = parseInt(parts[1], 10)
        let year = parseInt(parts[2], 10)
        
        // Validate month
        if (month >= 1 && month <= 12) {
          // Convert 2-digit year to 4-digit
          if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year
          }
          
          // Only accept future dates or recent past (Medicare cards)
          const currentYear = new Date().getFullYear()
          if (year >= currentYear - 1 && year <= currentYear + 10) {
            result.expiryMonth = parts[1]
            result.expiryYear = year.toString()
            result.confidence += 30
            break
          }
        }
      }
    }
  }

  // Find IRN (single digit 1-5, usually at end of Medicare number area)
  if (result.medicareNumber) {
    // IRN is often right after the Medicare number
    const afterMedicareText = cleanText.split(result.medicareNumber.slice(-4))[1] || ""
    const irnMatch = afterMedicareText.match(IRN_PATTERN)
    if (irnMatch) {
      result.irn = irnMatch[1]
      result.confidence += 30
    }
  }

  return result
}

export function MedicareOCR({ onResult, onError, className }: MedicareOCRProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<MedicareOCRResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true)
    setProgress(0)
    setOcrResult(null)

    // Create preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      const parsed = parseMedicareFromText(result.data.text)
      setOcrResult(parsed)
      
      if (parsed.medicareNumber) {
        onResult(parsed)
      } else {
        onError?.("Could not detect Medicare card details. Please enter manually.")
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to process image")
    } finally {
      setIsProcessing(false)
    }
  }, [onResult, onError])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*"
      fileInputRef.current.capture = "environment"
      fileInputRef.current.click()
    }
  }

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture")
      fileInputRef.current.accept = "image/*"
      fileInputRef.current.click()
    }
  }

  const reset = () => {
    setPreviewUrl(null)
    setOcrResult(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!previewUrl ? (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Scan your Medicare card</p>
              <p className="text-xs text-muted-foreground mt-1">
                Take a photo or upload an image to auto-fill your details
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCameraCapture}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUpload}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from user upload cannot use Next.js Image */}
            <img
              src={previewUrl}
              alt="Medicare card preview"
              className="w-full h-auto max-h-48 object-contain bg-muted/30"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                <p className="text-white text-sm">Processing... {progress}%</p>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {ocrResult && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {ocrResult.confidence >= 50 ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                <span className="font-medium">
                  {ocrResult.confidence >= 50 ? "Details detected" : "Partial detection"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Medicare:</span>{" "}
                  <span className="font-mono">{ocrResult.medicareNumber || "Not found"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">IRN:</span>{" "}
                  <span>{ocrResult.irn || "Not found"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expiry:</span>{" "}
                  <span>
                    {ocrResult.expiryMonth && ocrResult.expiryYear
                      ? `${ocrResult.expiryMonth}/${ocrResult.expiryYear}`
                      : "Not found"}
                  </span>
                </div>
              </div>
              {ocrResult.confidence < 50 && (
                <p className="text-xs text-amber-600">
                  Some details couldn&apos;t be detected. Please verify and enter manually.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
