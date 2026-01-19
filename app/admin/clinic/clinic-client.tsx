"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Upload,
  Save,
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import type { ClinicIdentity, ClinicIdentityInput } from "@/types/certificate-template"
import {
  saveClinicIdentityAction,
  uploadClinicLogoAction,
} from "@/app/actions/admin-settings"
import Link from "next/link"

interface ClinicIdentityClientProps {
  initialData: ClinicIdentity | null
  logoUrl: string | null
}

const AUSTRALIAN_STATES = [
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NSW", label: "New South Wales" },
  { value: "NT", label: "Northern Territory" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "VIC", label: "Victoria" },
  { value: "WA", label: "Western Australia" },
]

export function ClinicIdentityClient({ initialData, logoUrl }: ClinicIdentityClientProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl)
  const [logoPath, setLogoPath] = useState(initialData?.logo_storage_path || "")

  // Form state
  const [formData, setFormData] = useState<ClinicIdentityInput>({
    clinic_name: initialData?.clinic_name || "",
    trading_name: initialData?.trading_name || null,
    address_line_1: initialData?.address_line_1 || "",
    address_line_2: initialData?.address_line_2 || null,
    suburb: initialData?.suburb || "",
    state: initialData?.state || "VIC",
    postcode: initialData?.postcode || "",
    abn: initialData?.abn || "",
    phone: initialData?.phone || null,
    email: initialData?.email || null,
    logo_storage_path: initialData?.logo_storage_path || null,
    footer_disclaimer: initialData?.footer_disclaimer || null,
  })

  const handleInputChange = useCallback((field: keyof ClinicIdentityInput, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please use PNG, JPG, or SVG.")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 2MB.")
      return
    }

    setIsUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", file)

      const result = await uploadClinicLogoAction(formDataUpload)

      if (result.success && result.path) {
        setLogoPath(result.path)
        setFormData(prev => ({ ...prev, logo_storage_path: result.path! }))
        // Create a local preview
        setCurrentLogoUrl(URL.createObjectURL(file))
        toast.success("Logo uploaded successfully")
      } else {
        toast.error(result.error || "Failed to upload logo")
      }
    } catch {
      toast.error("Failed to upload logo")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    // Validate required fields
    if (!formData.clinic_name || !formData.address_line_1 || !formData.suburb || !formData.state || !formData.postcode || !formData.abn) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSaving(true)
    try {
      const result = await saveClinicIdentityAction({
        ...formData,
        logo_storage_path: logoPath || null,
      })

      if (result.success) {
        toast.success("Clinic identity saved successfully")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to save clinic identity")
      }
    } catch {
      toast.error("Failed to save clinic identity")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Clinic Identity
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure clinic branding for certificates and documents
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic Logo</CardTitle>
            <CardDescription>
              Upload your clinic logo for certificates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden">
              {currentLogoUrl ? (
                <img
                  src={currentLogoUrl}
                  alt="Clinic logo"
                  className="max-h-full max-w-full object-contain p-4"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No logo uploaded</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                disabled={isUploading}
                className="hidden"
                id="logo-upload"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("logo-upload")?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isUploading ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, or SVG. Max 2MB. Recommended: 400x200px
            </p>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Business Details</CardTitle>
            <CardDescription>
              Legal business information shown on certificates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinic_name">
                  Legal Business Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clinic_name"
                  value={formData.clinic_name}
                  onChange={(e) => handleInputChange("clinic_name", e.target.value)}
                  placeholder="InstantMed Pty Ltd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trading_name">Trading Name</Label>
                <Input
                  id="trading_name"
                  value={formData.trading_name || ""}
                  onChange={(e) => handleInputChange("trading_name", e.target.value || null)}
                  placeholder="InstantMed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="abn">
                ABN <span className="text-destructive">*</span>
              </Label>
              <Input
                id="abn"
                value={formData.abn}
                onChange={(e) => handleInputChange("abn", e.target.value)}
                placeholder="00 000 000 000"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value || null)}
                  placeholder="1300 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value || null)}
                  placeholder="support@instantmed.com.au"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Business Address</CardTitle>
            <CardDescription>
              Physical address shown on certificates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address_line_1">
                Address Line 1 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address_line_1"
                value={formData.address_line_1}
                onChange={(e) => handleInputChange("address_line_1", e.target.value)}
                placeholder="Level 1, 123 Collins Street"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_2">Address Line 2</Label>
              <Input
                id="address_line_2"
                value={formData.address_line_2 || ""}
                onChange={(e) => handleInputChange("address_line_2", e.target.value || null)}
                placeholder="Suite 100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="suburb">
                  Suburb <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="suburb"
                  value={formData.suburb}
                  onChange={(e) => handleInputChange("suburb", e.target.value)}
                  placeholder="Melbourne"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleInputChange("state", value)}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">
                  Postcode <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => handleInputChange("postcode", e.target.value)}
                  placeholder="3000"
                  maxLength={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Disclaimer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certificate Footer</CardTitle>
            <CardDescription>
              Disclaimer text shown at the bottom of certificates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={formData.footer_disclaimer || ""}
              onChange={(e) => handleInputChange("footer_disclaimer", e.target.value || null)}
              placeholder="This medical certificate was issued via InstantMed telehealth services..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              This text will appear in the footer of all generated certificates.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status */}
      {initialData && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Last updated: {new Date(initialData.updated_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
