"use client"

import { useState, useCallback, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Save,
  RotateCcw,
  Building2,
  FileText,
  Eye,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import type {
  TemplateStudioData,
} from "@/app/actions/template-studio"
import {
  saveClinicIdentityAction,
  saveTemplateAction,
  uploadClinicLogoAction,
} from "@/app/actions/template-studio"
import type {
  ClinicIdentity,
  ClinicIdentityInput,
  TemplateConfig,
  TemplateType,
  HeaderStyle,
  MarginPreset,
  FontSizePreset,
  AccentColorPreset,
  SignatureStyle,
} from "@/types/certificate-template"
import { DEFAULT_TEMPLATE_CONFIG } from "@/types/certificate-template"
import {
  CertificatePreview,
  generatePreviewData,
} from "@/components/admin/certificate-preview"

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

  // Template Config State (using work template as default)
  const activeTemplate = initialData.activeTemplates.work
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>(
    (activeTemplate?.config as TemplateConfig) || DEFAULT_TEMPLATE_CONFIG
  )
  const [selectedTemplateType, _setSelectedTemplateType] = useState<TemplateType>("med_cert_work")

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

  // Update template config
  const updateLayoutConfig = useCallback(
    <K extends keyof TemplateConfig["layout"]>(
      field: K,
      value: TemplateConfig["layout"][K]
    ) => {
      setTemplateConfig((prev) => ({
        ...prev,
        layout: { ...prev.layout, [field]: value },
      }))
      setHasChanges(true)
    },
    []
  )

  const updateOptionsConfig = useCallback(
    <K extends keyof TemplateConfig["options"]>(
      field: K,
      value: TemplateConfig["options"][K]
    ) => {
      setTemplateConfig((prev) => ({
        ...prev,
        options: { ...prev.options, [field]: value },
      }))
      setHasChanges(true)
    },
    []
  )

  // Toggle scenario
  const toggleScenario = useCallback((id: string) => {
    setScenarios((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // Save all changes
  const handleSave = useCallback(() => {
    startTransition(async () => {
      setMessage(null)

      // Save clinic identity
      const clinicResult = await saveClinicIdentityAction(clinicIdentity)
      if (!clinicResult.success) {
        setMessage({ type: "error", text: `Clinic: ${clinicResult.error}` })
        return
      }

      // Save template (creates new version)
      const templateResult = await saveTemplateAction(
        selectedTemplateType,
        templateConfig
      )
      if (!templateResult.success) {
        setMessage({ type: "error", text: `Template: ${templateResult.error}` })
        return
      }

      setMessage({
        type: "success",
        text: `Saved! Template version ${templateResult.template?.version} is now active.`,
      })
      setHasChanges(false)

      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000)
    })
  }, [clinicIdentity, templateConfig, selectedTemplateType])

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

    // Reset template config
    setTemplateConfig(
      (activeTemplate?.config as TemplateConfig) || DEFAULT_TEMPLATE_CONFIG
    )

    setHasChanges(false)
    setMessage(null)
  }, [initialData, activeTemplate])

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
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Template Studio</h1>
              <p className="text-sm text-muted-foreground">
                Configure medical certificate templates
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeTemplate && (
                <span className="text-sm text-muted-foreground">
                  Active version: v{activeTemplate.version}
                </span>
              )}
              {hasChanges && (
                <span className="text-sm text-amber-600 font-medium">
                  Unsaved changes
                </span>
              )}
              <Button
                variant="outline"
                onClick={handleDiscard}
                disabled={isPending || !hasChanges}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !hasChanges}
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

          {/* Message */}
          {message && (
            <div
              className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
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
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Settings Form */}
          <div className="space-y-6">
            <Tabs defaultValue="clinic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="clinic" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Clinic Identity
                </TabsTrigger>
                <TabsTrigger value="template" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Template Layout
                </TabsTrigger>
              </TabsList>

              {/* Clinic Identity Tab */}
              <TabsContent value="clinic" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Clinic Details</CardTitle>
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
              </TabsContent>

              {/* Template Layout Tab */}
              <TabsContent value="template" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Layout Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Header Style</Label>
                      <Select
                        value={templateConfig.layout.headerStyle}
                        onValueChange={(value) =>
                          updateLayoutConfig("headerStyle", value as HeaderStyle)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="logo-left">Logo Left</SelectItem>
                          <SelectItem value="logo-center">Logo Center</SelectItem>
                          <SelectItem value="no-logo">No Logo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Margins</Label>
                        <Select
                          value={templateConfig.layout.marginPreset}
                          onValueChange={(value) =>
                            updateLayoutConfig(
                              "marginPreset",
                              value as MarginPreset
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="S">Small</SelectItem>
                            <SelectItem value="M">Medium</SelectItem>
                            <SelectItem value="L">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Font Size</Label>
                        <Select
                          value={templateConfig.layout.fontSizePreset}
                          onValueChange={(value) =>
                            updateLayoutConfig(
                              "fontSizePreset",
                              value as FontSizePreset
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="S">Small</SelectItem>
                            <SelectItem value="M">Medium</SelectItem>
                            <SelectItem value="L">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Color Theme</Label>
                        <Select
                          value={templateConfig.layout.accentColorPreset}
                          onValueChange={(value) =>
                            updateLayoutConfig(
                              "accentColorPreset",
                              value as AccentColorPreset
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mono">Mono (Black)</SelectItem>
                            <SelectItem value="slate">Slate</SelectItem>
                            <SelectItem value="blue">Blue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Signature Style</Label>
                      <Select
                        value={templateConfig.options.signatureStyle}
                        onValueChange={(value) =>
                          updateOptionsConfig(
                            "signatureStyle",
                            value as SignatureStyle
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">
                            Signature Image (with fallback)
                          </SelectItem>
                          <SelectItem value="typed">Typed Name Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Display Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Show ABN</Label>
                      <Switch
                        checked={templateConfig.options.showAbn}
                        onCheckedChange={(checked) =>
                          updateOptionsConfig("showAbn", checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Show Address</Label>
                      <Switch
                        checked={templateConfig.options.showAddress}
                        onCheckedChange={(checked) =>
                          updateOptionsConfig("showAddress", checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Show Phone</Label>
                      <Switch
                        checked={templateConfig.options.showPhone}
                        onCheckedChange={(checked) =>
                          updateOptionsConfig("showPhone", checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Show Email</Label>
                      <Switch
                        checked={templateConfig.options.showEmail}
                        onCheckedChange={(checked) =>
                          updateOptionsConfig("showEmail", checked)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
                <div className="border bg-gray-100 p-4 overflow-auto max-h-[800px]">
                  <CertificatePreview
                    clinicIdentity={previewClinicIdentity}
                    config={templateConfig}
                    previewData={previewData}
                    className="mx-auto max-w-[500px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Version History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Version History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {initialData.versionHistory.work.slice(0, 5).map((template) => (
                    <div
                      key={template.id}
                      className={`flex items-center justify-between p-2 rounded border ${
                        template.is_active ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium">
                          v{template.version}
                        </span>
                        {template.is_active && (
                          <span className="ml-2 text-xs text-primary font-medium">
                            Active
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {template.creator?.full_name || "Unknown"} •{" "}
                          {new Date(template.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {initialData.versionHistory.work.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No version history yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
