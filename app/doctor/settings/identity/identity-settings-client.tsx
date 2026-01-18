"use client"

import { useState, useCallback, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Save,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  User,
  FileSignature,
} from "lucide-react"
import {
  saveDoctorIdentityAction,
  uploadSignatureAction,
} from "@/app/actions/doctor-identity"
import {
  validateProviderNumber,
  validateAhpraNumber,
  type DoctorIdentity,
} from "@/lib/data/doctor-identity.shared"

interface IdentitySettingsClientProps {
  initialData: DoctorIdentity
}

export function IdentitySettingsClient({ initialData }: IdentitySettingsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Form state
  const [nominals, setNominals] = useState(initialData.nominals || "")
  const [providerNumber, setProviderNumber] = useState(initialData.provider_number || "")
  const [ahpraNumber, setAhpraNumber] = useState(initialData.ahpra_number || "")
  const [signaturePath, setSignaturePath] = useState(initialData.signature_storage_path || "")

  // Validation errors
  const [providerError, setProviderError] = useState<string | null>(null)
  const [ahpraError, setAhpraError] = useState<string | null>(null)

  // Track changes
  const hasChanges =
    nominals !== (initialData.nominals || "") ||
    providerNumber !== (initialData.provider_number || "") ||
    ahpraNumber !== (initialData.ahpra_number || "") ||
    signaturePath !== (initialData.signature_storage_path || "")

  // Check if identity is complete
  const isComplete = providerNumber.trim() !== "" && ahpraNumber.trim() !== ""

  // Validate provider number on blur
  const handleProviderBlur = useCallback(() => {
    if (providerNumber.trim() === "") {
      setProviderError(null)
      return
    }
    const result = validateProviderNumber(providerNumber)
    setProviderError(result.valid ? null : result.error || "Invalid format")
  }, [providerNumber])

  // Validate AHPRA number on blur
  const handleAhpraBlur = useCallback(() => {
    if (ahpraNumber.trim() === "") {
      setAhpraError(null)
      return
    }
    const result = validateAhpraNumber(ahpraNumber)
    setAhpraError(result.valid ? null : result.error || "Invalid format")
  }, [ahpraNumber])

  // Save handler
  const handleSave = useCallback(() => {
    // Validate before saving
    if (providerNumber.trim() !== "") {
      const providerResult = validateProviderNumber(providerNumber)
      if (!providerResult.valid) {
        setProviderError(providerResult.error || "Invalid format")
        return
      }
    }

    if (ahpraNumber.trim() !== "") {
      const ahpraResult = validateAhpraNumber(ahpraNumber)
      if (!ahpraResult.valid) {
        setAhpraError(ahpraResult.error || "Invalid format")
        return
      }
    }

    startTransition(async () => {
      setMessage(null)

      const result = await saveDoctorIdentityAction({
        nominals: nominals.trim() || null,
        provider_number: providerNumber.trim() || null,
        ahpra_number: ahpraNumber.trim() || null,
        signature_storage_path: signaturePath || null,
      })

      if (result.success) {
        setMessage({ type: "success", text: "Settings saved successfully" })
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save" })
      }
    })
  }, [nominals, providerNumber, ahpraNumber, signaturePath])

  // Signature upload handler
  const handleSignatureUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append("signature", file)

      startTransition(async () => {
        const result = await uploadSignatureAction(formData)
        if (result.success && result.path) {
          setSignaturePath(result.path)
          setMessage({ type: "success", text: "Signature uploaded" })
          setTimeout(() => setMessage(null), 3000)
        } else {
          setMessage({ type: "error", text: result.error || "Upload failed" })
        }
      })
    },
    []
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/doctor/queue">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Certificate Identity</h1>
          <p className="text-sm text-muted-foreground">
            Configure your details for medical certificates
          </p>
        </div>
      </div>

      {/* Incomplete Warning */}
      {!isComplete && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">
                  Certificate identity incomplete
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  You must provide your Provider Number and AHPRA Registration Number
                  before you can approve medical certificates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Professional Details
          </CardTitle>
          <CardDescription>
            This information appears on certificates you issue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={initialData.full_name}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Name cannot be changed here. Contact support if needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nominals">
              Qualifications / Nominals{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="nominals"
              value={nominals}
              onChange={(e) => setNominals(e.target.value)}
              placeholder="e.g., MBBS, FRACGP"
            />
            <p className="text-xs text-muted-foreground">
              Professional qualifications displayed after your name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider_number">
              Provider Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="provider_number"
              value={providerNumber}
              onChange={(e) => {
                setProviderNumber(e.target.value.toUpperCase())
                setProviderError(null)
              }}
              onBlur={handleProviderBlur}
              placeholder="e.g., 2426577L"
              className={providerError ? "border-red-500" : ""}
            />
            {providerError ? (
              <p className="text-xs text-red-600">{providerError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Medicare provider number (6-7 digits + letter)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ahpra_number">
              AHPRA Registration Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ahpra_number"
              value={ahpraNumber}
              onChange={(e) => {
                setAhpraNumber(e.target.value.toUpperCase())
                setAhpraError(null)
              }}
              onBlur={handleAhpraBlur}
              placeholder="e.g., MED0002576546"
              className={ahpraError ? "border-red-500" : ""}
            />
            {ahpraError ? (
              <p className="text-xs text-red-600">{ahpraError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                AHPRA registration (3 letters + 10 digits)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Signature
          </CardTitle>
          <CardDescription>
            Upload your signature image for certificates (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-40 h-16 bg-muted flex items-center justify-center text-xs text-muted-foreground border rounded">
              {signaturePath ? (
                <span className="text-emerald-600">Signature uploaded</span>
              ) : (
                "No signature"
              )}
            </div>
            <div>
              <Label
                htmlFor="signature-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted"
              >
                <Upload className="h-4 w-4" />
                {signaturePath ? "Replace Signature" : "Upload Signature"}
              </Label>
              <Input
                id="signature-upload"
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleSignatureUpload}
              />
              <p className="text-xs text-muted-foreground mt-2">
                PNG or JPG, max 1MB. If not provided, certificates will show
                &ldquo;Electronically signed&rdquo;.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/doctor/queue">Cancel</Link>
        </Button>
        <Button
          onClick={handleSave}
          disabled={isPending || !hasChanges || !!providerError || !!ahpraError}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
