"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input as _Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  History, 
  FileText,
  Briefcase,
  GraduationCap,
  Heart,
  Check,
  Loader2,
  RotateCcw,
  Type,
  Stamp,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { 
  CertificateTemplate, 
  TemplateConfig, 
  TemplateType,
  HeaderStyle,
  MarginPreset,
  FontSizePreset,
  AccentColorPreset,
  SignatureStyle,
  CertTextType,
  SealConfig,
} from "@/types/certificate-template"
import { DEFAULT_TEMPLATE_CONFIG } from "@/types/certificate-template"
import {
  templateTypeToCertType,
  getCertificateTextWithDefaults,
  getSealConfigWithDefaults,
  getDefaultCertificateText,
  TEXT_LIMITS,
  type CertificateTextConfig,
} from "@/lib/certificate-defaults"
import { getTemplateTypeName } from "@/lib/data/types/certificate-templates"
// Template editing actions removed — templates are static PDFs in /public/templates/
// import { saveTemplateAction, getTemplateHistoryAction, activateTemplateAction } from "@/app/actions/templates"
import { CertificatePreview } from "./certificate-preview"

interface TemplateStudioClientProps {
  initialTemplates: CertificateTemplate[]
  adminName: string
}

const TEMPLATE_TYPES: { type: TemplateType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "med_cert_work", label: "Work", icon: Briefcase },
  { type: "med_cert_uni", label: "Study", icon: GraduationCap },
  { type: "med_cert_carer", label: "Carer", icon: Heart },
]

const HEADER_STYLES: { value: HeaderStyle; label: string }[] = [
  { value: "logo-left", label: "Logo Left" },
  { value: "logo-center", label: "Logo Center" },
  { value: "no-logo", label: "No Logo" },
]

const MARGIN_PRESETS: { value: MarginPreset; label: string }[] = [
  { value: "S", label: "Small" },
  { value: "M", label: "Medium" },
  { value: "L", label: "Large" },
]

const FONT_SIZE_PRESETS: { value: FontSizePreset; label: string }[] = [
  { value: "S", label: "Small" },
  { value: "M", label: "Medium" },
  { value: "L", label: "Large" },
]

const ACCENT_COLORS: { value: AccentColorPreset; label: string; color: string }[] = [
  { value: "mono", label: "Monochrome", color: "#000000" },
  { value: "slate", label: "Slate", color: "#1e293b" },
  { value: "blue", label: "Blue", color: "#1e40af" },
]

export function TemplateStudioClient({ initialTemplates, adminName: _adminName }: TemplateStudioClientProps) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [selectedType, setSelectedType] = useState<TemplateType>("med_cert_work")
  const [config, setConfig] = useState<TemplateConfig>(() => {
    const active = initialTemplates.find(t => t.template_type === "med_cert_work")
    return active?.config || DEFAULT_TEMPLATE_CONFIG
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [versionHistory, setVersionHistory] = useState<CertificateTemplate[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Certificate text state (per type)
  const [certificateText, setCertificateText] = useState<
    Partial<Record<CertTextType, Partial<CertificateTextConfig>>>
  >(() => {
    const active = initialTemplates.find(t => t.template_type === "med_cert_work")
    return active?.config?.certificateText || {}
  })

  // Seal config state
  const [sealConfig, setSealConfig] = useState<SealConfig>(() => {
    const active = initialTemplates.find(t => t.template_type === "med_cert_work")
    return getSealConfigWithDefaults(active?.config?.seal)
  })

  // Get current active template for selected type
  const activeTemplate = templates.find(t => t.template_type === selectedType)

  // Handle template type selection
  const handleTypeSelect = useCallback((type: TemplateType) => {
    if (hasChanges) {
      // eslint-disable-next-line no-alert
      if (!window.confirm("You have unsaved changes. Discard them?")) {
        return
      }
    }
    setSelectedType(type)
    const template = templates.find(t => t.template_type === type)
    setConfig(template?.config || DEFAULT_TEMPLATE_CONFIG)
    setHasChanges(false)
    setShowHistory(false)
  }, [templates, hasChanges])

  // Update config
  const updateLayout = useCallback(<K extends keyof TemplateConfig["layout"]>(
    key: K,
    value: TemplateConfig["layout"][K]
  ) => {
    setConfig(prev => ({
      ...prev,
      layout: { ...prev.layout, [key]: value },
    }))
    setHasChanges(true)
  }, [])

  const updateOptions = useCallback(<K extends keyof TemplateConfig["options"]>(
    key: K,
    value: TemplateConfig["options"][K]
  ) => {
    setConfig(prev => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }))
    setHasChanges(true)
  }, [])

  // Get current certificate text type based on selected template
  const currentCertType = templateTypeToCertType(selectedType)
  const currentText = getCertificateTextWithDefaults(currentCertType, certificateText[currentCertType])

  // Update certificate text for current type
  const updateCertificateText = useCallback(<K extends keyof CertificateTextConfig>(
    key: K,
    value: CertificateTextConfig[K]
  ) => {
    setCertificateText(prev => ({
      ...prev,
      [currentCertType]: {
        ...prev[currentCertType],
        [key]: value,
      },
    }))
    setHasChanges(true)
  }, [currentCertType])

  // Reset certificate text field to default
  const resetCertificateTextField = useCallback((field: keyof CertificateTextConfig) => {
    const defaults = getDefaultCertificateText(currentCertType)
    setCertificateText(prev => ({
      ...prev,
      [currentCertType]: {
        ...prev[currentCertType],
        [field]: defaults[field],
      },
    }))
    setHasChanges(true)
  }, [currentCertType])

  // Update seal config
  const updateSealConfig = useCallback(<K extends keyof SealConfig>(
    key: K,
    value: SealConfig[K]
  ) => {
    setSealConfig(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }, [])

  // Template editing disabled — templates are static PDFs in /public/templates/
  const handleSave = async () => {
    toast.info("Template editing is disabled. Templates are now static PDFs.")
  }

  // Version history disabled — templates are static PDFs
  const loadHistory = async () => {
    setIsLoadingHistory(true)
    setVersionHistory([])
    setShowHistory(true)
    setIsLoadingHistory(false)
    toast.info("Version history is disabled. Templates are now static PDFs.")
  }

  // Rollback disabled — templates are static PDFs
  const handleRollback = async (_templateId: string, _version: number) => {
    toast.info("Rollback is disabled. Templates are now static PDFs.")
  }

  return (
    <div className="min-h-screen bg-white/50 dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-white/10 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold">Template Studio</h1>
                <p className="text-sm text-muted-foreground">Configure certificate templates</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  Unsaved changes
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={isLoadingHistory}
              >
                {isLoadingHistory ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <History className="w-4 h-4 mr-2" />
                )}
                History
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                data-testid="save-template-button"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Version
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Template Type Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Certificate Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {TEMPLATE_TYPES.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                      selectedType === type
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      selectedType === type
                        ? "bg-primary text-white"
                        : "bg-slate-100 dark:bg-white/10"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        v{templates.find(t => t.template_type === type)?.version || 1}
                      </p>
                    </div>
                    {selectedType === type && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Layout Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Layout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Header Style */}
                <div className="space-y-2">
                  <Label className="text-sm">Header Style</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {HEADER_STYLES.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => updateLayout("headerStyle", value)}
                        className={cn(
                          "px-3 py-2 text-xs font-medium rounded-lg border transition-all",
                          config.layout.headerStyle === value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margin Preset */}
                <div className="space-y-2">
                  <Label className="text-sm">Margins</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {MARGIN_PRESETS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => updateLayout("marginPreset", value)}
                        className={cn(
                          "px-3 py-2 text-xs font-medium rounded-lg border transition-all",
                          config.layout.marginPreset === value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size Preset */}
                <div className="space-y-2">
                  <Label className="text-sm">Font Size</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_SIZE_PRESETS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => updateLayout("fontSizePreset", value)}
                        className={cn(
                          "px-3 py-2 text-xs font-medium rounded-lg border transition-all",
                          config.layout.fontSizePreset === value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <Label className="text-sm">Accent Color</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ACCENT_COLORS.map(({ value, label, color }) => (
                      <button
                        key={value}
                        onClick={() => updateLayout("accentColorPreset", value)}
                        className={cn(
                          "px-3 py-2 text-xs font-medium rounded-lg border transition-all flex items-center gap-2",
                          config.layout.accentColorPreset === value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                        )}
                      >
                        <div 
                          className="w-3 h-3 rounded-full border border-white/20" 
                          style={{ backgroundColor: color }}
                        />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Signature Style</Label>
                  <div className="flex gap-1">
                    {(["image", "typed"] as SignatureStyle[]).map((style) => (
                      <button
                        key={style}
                        onClick={() => updateOptions("signatureStyle", style)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize",
                          config.options.signatureStyle === style
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                        )}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show ABN</Label>
                  <Switch
                    checked={config.options.showAbn}
                    onCheckedChange={(checked) => updateOptions("showAbn", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Phone</Label>
                  <Switch
                    checked={config.options.showPhone}
                    onCheckedChange={(checked) => updateOptions("showPhone", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Email</Label>
                  <Switch
                    checked={config.options.showEmail}
                    onCheckedChange={(checked) => updateOptions("showEmail", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Address</Label>
                  <Switch
                    checked={config.options.showAddress}
                    onCheckedChange={(checked) => updateOptions("showAddress", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Certificate Text */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Certificate Text
                </CardTitle>
                <CardDescription>
                  Customize text for {TEMPLATE_TYPES.find(t => t.type === selectedType)?.label || "this"} certificates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Title</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {currentText.title.length}/{TEXT_LIMITS.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => resetCertificateTextField("title")}
                        className="text-xs text-primary hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <Textarea
                    value={currentText.title}
                    onChange={(e) => updateCertificateText("title", e.target.value)}
                    placeholder="Certificate title..."
                    className="min-h-[40px] resize-none"
                    maxLength={TEXT_LIMITS.title}
                  />
                </div>

                {/* Attestation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Attestation Text</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {currentText.attestation.length}/{TEXT_LIMITS.attestation}
                      </span>
                      <button
                        type="button"
                        onClick={() => resetCertificateTextField("attestation")}
                        className="text-xs text-primary hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <Textarea
                    value={currentText.attestation}
                    onChange={(e) => updateCertificateText("attestation", e.target.value)}
                    placeholder="Main certificate attestation text..."
                    className="min-h-[120px]"
                    maxLength={TEXT_LIMITS.attestation}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use line breaks to create paragraphs
                  </p>
                </div>

                {/* Notes (optional) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">
                      Additional Notes <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {(currentText.notes || "").length}/{TEXT_LIMITS.notes}
                    </span>
                  </div>
                  <Textarea
                    value={currentText.notes || ""}
                    onChange={(e) => updateCertificateText("notes", e.target.value || null)}
                    placeholder="Optional notes..."
                    className="min-h-[60px]"
                    maxLength={TEXT_LIMITS.notes}
                  />
                </div>

                {/* Restrictions (optional) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">
                      Restrictions <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {(currentText.restrictions || "").length}/{TEXT_LIMITS.restrictions}
                    </span>
                  </div>
                  <Textarea
                    value={currentText.restrictions || ""}
                    onChange={(e) => updateCertificateText("restrictions", e.target.value || null)}
                    placeholder="Optional restrictions or conditions..."
                    className="min-h-[60px]"
                    maxLength={TEXT_LIMITS.restrictions}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Seal Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stamp className="w-4 h-4" />
                  Seal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Seal</Label>
                  <Switch
                    checked={sealConfig.show}
                    onCheckedChange={(checked) => updateSealConfig("show", checked)}
                  />
                </div>

                {sealConfig.show && (
                  <div className="space-y-2">
                    <Label className="text-sm">Seal Size</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["sm", "md", "lg"] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => updateSealConfig("size", size)}
                          className={cn(
                            "px-3 py-2 text-xs font-medium rounded-lg border transition-all capitalize",
                            sealConfig.size === size
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                          )}
                        >
                          {size === "sm" ? "Small" : size === "md" ? "Medium" : "Large"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview & History */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="preview" value={showHistory ? "history" : "preview"}>
              <TabsList className="mb-4">
                <TabsTrigger value="preview" onClick={() => setShowHistory(false)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="history" onClick={() => loadHistory()}>
                  <History className="w-4 h-4 mr-2" />
                  Version History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Live Preview
                    </CardTitle>
                    <CardDescription>
                      Preview how your certificate will look
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CertificatePreview 
                      config={config}
                      templateType={selectedType}
                      certificateText={currentText}
                      sealConfig={sealConfig}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Version History</CardTitle>
                    <CardDescription>
                      Previous versions of this template
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : versionHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No version history available
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {versionHistory.map((version) => (
                          <div
                            key={version.id}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border",
                              version.is_active
                                ? "border-primary bg-primary/5"
                                : "border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                                version.is_active
                                  ? "bg-primary text-white"
                                  : "bg-slate-100 text-slate-600"
                              )}>
                                v{version.version}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{version.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(version.created_at).toLocaleDateString("en-AU", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {version.is_active ? (
                                <Badge>Active</Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRollback(version.id, version.version)}
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  Rollback
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
