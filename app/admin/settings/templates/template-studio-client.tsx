"use client"

import {
  AlertCircle,
  Building2,
  CheckCircle,
  Eye,
  Loader2,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react"
import { useCallback, useState, useTransition } from "react"

import type {
  TemplateStudioData,
} from "@/app/actions/template-studio"
import {
  saveClinicIdentityAction,
  uploadClinicLogoAction,
} from "@/app/actions/template-studio"
import {
  CertificatePreview,
  generatePreviewData,
} from "@/components/admin/certificate-preview"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { STAFF_SETTINGS_HREF } from "@/lib/dashboard/routes"
import type {
  ClinicIdentity,
  ClinicIdentityInput,
  TemplateConfig,
} from "@/types/certificate-template"
import { DEFAULT_TEMPLATE_CONFIG } from "@/types/certificate-template"

interface TemplateStudioClientProps {
  initialData: TemplateStudioData
}

export function TemplateStudioClient({ initialData }: TemplateStudioClientProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Clinic Identity State
  const [clinicIdentity, setClinicIdentity] = useState<ClinicIdentityInput>({
    clinic_name: initialData.clinicIdentity?.clinic_name || "InstantMed Pty Ltd",
    trading_name: initialData.clinicIdentity?.trading_name || "InstantMed",
    address_line_1: initialData.clinicIdentity?.address_line_1 || "",
    address_line_2: initialData.clinicIdentity?.address_line_2 || null,
    suburb: initialData.clinicIdentity?.suburb || "",
    state: initialData.clinicIdentity?.state || "VIC",
    postcode: initialData.clinicIdentity?.postcode || "",
    abn: initialData.clinicIdentity?.abn || "",
    phone: initialData.clinicIdentity?.phone || null,
    email: initialData.clinicIdentity?.email || null,
    logo_storage_path: initialData.clinicIdentity?.logo_storage_path || null,
    footer_disclaimer: initialData.clinicIdentity?.footer_disclaimer || "",
  })

  const activeTemplate = initialData.activeTemplate
  const templateConfig = (activeTemplate?.config as TemplateConfig) || DEFAULT_TEMPLATE_CONFIG

  // Preview Scenarios
  const [scenarios, setScenarios] = useState<Record<string, boolean>>({
    "long-patient-name": false,
    "long-address": false,
    "no-signature": false,
    "multi-day": false,
    "employer-present": false,
  })

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false)

  // Update clinic identity field
  const updateClinicField = useCallback(
    <K extends keyof ClinicIdentityInput>(field: K, value: ClinicIdentityInput[K]) => {
      setClinicIdentity((prev) => ({ ...prev, [field]: value }))
      setHasChanges(true)
    },
    []
  )

  // Toggle scenario
  const toggleScenario = useCallback((id: string) => {
    setScenarios((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // Save clinic identity (template editing removed - templates are static PDFs)
  const handleSave = useCallback(() => {
    startTransition(async () => {
      setMessage(null)

      // Save clinic identity
      const clinicResult = await saveClinicIdentityAction(clinicIdentity)
      if (!clinicResult.success) {
        setMessage({ type: "error", text: `Clinic: ${clinicResult.error}` })
        return
      }

      setMessage({
        type: "success",
        text: "Clinic identity saved successfully.",
      })
      setHasChanges(false)

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000)
    })
  }, [clinicIdentity])

  // Discard changes
  const handleDiscard = useCallback(() => {
    // Reset clinic identity
    setClinicIdentity({
      clinic_name: initialData.clinicIdentity?.clinic_name || "InstantMed Pty Ltd",
      trading_name: initialData.clinicIdentity?.trading_name || "InstantMed",
      address_line_1: initialData.clinicIdentity?.address_line_1 || "",
      address_line_2: initialData.clinicIdentity?.address_line_2 || null,
      suburb: initialData.clinicIdentity?.suburb || "",
      state: initialData.clinicIdentity?.state || "VIC",
      postcode: initialData.clinicIdentity?.postcode || "",
      abn: initialData.clinicIdentity?.abn || "",
      phone: initialData.clinicIdentity?.phone || null,
      email: initialData.clinicIdentity?.email || null,
      logo_storage_path: initialData.clinicIdentity?.logo_storage_path || null,
      footer_disclaimer: initialData.clinicIdentity?.footer_disclaimer || "",
    })

    setHasChanges(false)
    setMessage(null)
  }, [initialData])

  // Handle logo upload
  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append("logo", file)

      startTransition(async () => {
        const result = await uploadClinicLogoAction(formData)
        if (result.success && result.path) {
          updateClinicField("logo_storage_path", result.path)
          setMessage({ type: "success", text: "Logo uploaded" })
          setTimeout(() => setMessage(null), 3000)
        } else {
          setMessage({ type: "error", text: result.error || "Upload failed" })
        }
      })
    },
    [updateClinicField]
  )

  // Generate preview data based on scenarios
  const previewData = generatePreviewData(scenarios)

  // Build clinic identity object for preview
  const previewClinicIdentity: ClinicIdentity = {
    id: initialData.clinicIdentity?.id || "preview",
    ...clinicIdentity,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
  }

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Certificate identity"
        description="Clinic identity and certificate preview. Static certificate layout uses the checked-in PDF template."
        backHref={STAFF_SETTINGS_HREF}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeTemplate && (
              <span className="text-sm text-muted-foreground">
                Active version: v{activeTemplate.version}
              </span>
            )}
            {hasChanges && (
              <span className="text-sm font-medium text-warning">
                Unsaved changes
              </span>
            )}
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={isPending || !hasChanges}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Discard
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !hasChanges}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        }
      />

      <OperatorScrollArea>
        {message && (
          <div
            className={`rounded-lg p-3 flex items-center gap-2 ${
              message.type === "success"
                ? "bg-success-light text-success"
                : "bg-destructive-light text-destructive"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Settings Form */}
          <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4" />
                      Clinic details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clinic_name">Clinic Name</Label>
                        <Input
                          id="clinic_name"
                          value={clinicIdentity.clinic_name}
                          onChange={(e) =>
                            updateClinicField("clinic_name", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trading_name">
                          Trading Name{" "}
                          <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                          id="trading_name"
                          value={clinicIdentity.trading_name || ""}
                          onChange={(e) =>
                            updateClinicField(
                              "trading_name",
                              e.target.value || null
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_line_1">Address Line 1</Label>
                      <Input
                        id="address_line_1"
                        value={clinicIdentity.address_line_1}
                        onChange={(e) =>
                          updateClinicField("address_line_1", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_line_2">
                        Address Line 2{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="address_line_2"
                        value={clinicIdentity.address_line_2 || ""}
                        onChange={(e) =>
                          updateClinicField(
                            "address_line_2",
                            e.target.value || null
                          )
                        }
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="suburb">Suburb</Label>
                        <Input
                          id="suburb"
                          value={clinicIdentity.suburb}
                          onChange={(e) =>
                            updateClinicField("suburb", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Select
                          value={clinicIdentity.state}
                          onValueChange={(value) =>
                            updateClinicField(
                              "state",
                              value as ClinicIdentityInput["state"]
                            )
                          }
                        >
                          <SelectTrigger id="state">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postcode">Postcode</Label>
                        <Input
                          id="postcode"
                          value={clinicIdentity.postcode}
                          onChange={(e) =>
                            updateClinicField("postcode", e.target.value)
                          }
                          maxLength={4}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="abn">ABN</Label>
                      <Input
                        id="abn"
                        value={clinicIdentity.abn}
                        onChange={(e) => updateClinicField("abn", e.target.value)}
                        placeholder="00 000 000 000"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">
                          Phone{" "}
                          <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                          id="phone"
                          value={clinicIdentity.phone || ""}
                          onChange={(e) =>
                            updateClinicField("phone", e.target.value || null)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email{" "}
                          <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={clinicIdentity.email || ""}
                          onChange={(e) =>
                            updateClinicField("email", e.target.value || null)
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Logo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-12 bg-muted flex items-center justify-center text-xs text-muted-foreground border">
                        {clinicIdentity.logo_storage_path ? "[LOGO]" : "No logo"}
                      </div>
                      <div>
                        <Label
                          htmlFor="logo-upload"
                          className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Logo
                        </Label>
                        <Input
                          id="logo-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, or SVG. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Footer Disclaimer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={clinicIdentity.footer_disclaimer || ""}
                      onChange={(e) =>
                        updateClinicField("footer_disclaimer", e.target.value)
                      }
                      placeholder="Legal disclaimer text for certificate footer..."
                      className="min-h-[80px]"
                    />
                  </CardContent>
                </Card>
          </div>

          {/* Right Column: Live Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Preview Scenario Toggles */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Test Scenarios
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "long-patient-name", label: "Long name" },
                      { id: "long-address", label: "Long address" },
                      { id: "no-signature", label: "No signature" },
                      { id: "multi-day", label: "5+ days" },
                      { id: "employer-present", label: "Employer" },
                    ].map((scenario) => (
                      <button
                        key={scenario.id}
                        onClick={() => toggleScenario(scenario.id)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          scenarios[scenario.id]
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-muted"
                        }`}
                      >
                        {scenario.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Certificate Preview */}
                <div className="border bg-muted p-4 overflow-auto max-h-[800px]">
                  <CertificatePreview
                    clinicIdentity={previewClinicIdentity}
                    config={templateConfig}
                    previewData={previewData}
                    className="mx-auto max-w-[500px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Version history removed - templates are static PDFs */}
          </div>
        </div>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
