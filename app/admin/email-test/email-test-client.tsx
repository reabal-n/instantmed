"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mail,
  Send,
  Eye,
  Smartphone,
  Monitor,
  Code,
  Settings,
  RefreshCw,
  Layers,
  Copy,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { renderTestEmailAction } from "@/app/actions/render-test-email"

// Template definitions with sample data matching REAL React component props
const emailTemplates = [
  {
    id: "med_cert_patient",
    name: "Medical Certificate - Patient",
    description: "Sent to patients when their certificate is ready",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Sarah Johnson" },
      { key: "dashboardUrl", label: "Dashboard URL", default: "https://instantmed.com.au/patient/intakes/test-123" },
      { key: "verificationCode", label: "Verification Code", default: "MC-ABC123-XYZ" },
      { key: "certType", label: "Certificate Type", default: "work" },
    ],
  },
  {
    id: "med_cert_employer",
    name: "Medical Certificate - Employer",
    description: "Forwarded to employers on patient request",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Sarah Johnson" },
      { key: "employerName", label: "Employer Name", default: "John Smith" },
      { key: "companyName", label: "Company Name", default: "Acme Corporation" },
      { key: "downloadUrl", label: "Download URL", default: "https://instantmed.com.au/download/test-cert" },
      { key: "verificationCode", label: "Verification Code", default: "MC-ABC123-XYZ" },
      { key: "certStartDate", label: "Start Date", default: "2026-02-10" },
      { key: "certEndDate", label: "End Date", default: "2026-02-12" },
    ],
  },
  {
    id: "welcome",
    name: "Welcome Email",
    description: "Sent to new users after registration",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Sarah Johnson" },
    ],
  },
  {
    id: "script_sent",
    name: "eScript Sent",
    description: "Notifies patients when eScript is sent via SMS",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Sarah Johnson" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
      { key: "escriptReference", label: "eScript Reference", default: "ES-789456-ABC" },
    ],
  },
  {
    id: "request_declined",
    name: "Request Declined",
    description: "Sent when a medical request cannot be approved",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Sarah Johnson" },
      { key: "requestType", label: "Request Type", default: "Medical Certificate" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
      { key: "reason", label: "Decline Reason", default: "We need additional information to process your request." },
    ],
  },
  {
    id: "prescription_approved",
    name: "Prescription Approved",
    description: "Sent when a general prescription is approved",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Sarah Johnson" },
      { key: "medicationName", label: "Medication Name", default: "Amoxicillin 500mg" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
    ],
  },
  {
    id: "consult_approved",
    name: "Consultation Approved",
    description: "Sent when a general consultation is reviewed",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Sarah Johnson" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
      { key: "doctorNotes", label: "Doctor Notes", default: "Your results look normal. Continue current treatment and follow up in 4 weeks." },
    ],
  },
  {
    id: "ed_approved",
    name: "ED Treatment Approved",
    description: "Sent when ED consultation is approved",
    fields: [
      { key: "patientName", label: "Patient Name", default: "James Mitchell" },
      { key: "medicationName", label: "Medication Name", default: "Sildenafil 50mg" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
    ],
  },
  {
    id: "hair_loss_approved",
    name: "Hair Loss Treatment Approved",
    description: "Sent when hair loss treatment is approved",
    fields: [
      { key: "patientName", label: "Patient Name", default: "David Chen" },
      { key: "medicationName", label: "Medication Name", default: "Finasteride 1mg" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
    ],
  },
  {
    id: "weight_loss_approved",
    name: "Weight Loss Treatment Approved",
    description: "Sent when weight loss treatment is approved",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Emily Roberts" },
      { key: "medicationName", label: "Medication Name", default: "Ozempic 0.25mg" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
    ],
  },
  {
    id: "womens_health_approved",
    name: "Women's Health Treatment Approved",
    description: "Sent when women's health treatment is approved",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Lisa Park" },
      { key: "medicationName", label: "Medication Name", default: "Levlen ED" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
      { key: "treatmentType", label: "Treatment Type", default: "contraception" },
    ],
  },
  {
    id: "payment_receipt",
    name: "Payment Receipt",
    description: "Sent after successful payment",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Sarah Johnson" },
      { key: "serviceName", label: "Service Name", default: "Medical Certificate" },
      { key: "amount", label: "Amount", default: "$24.99" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
    ],
  },
  {
    id: "repeat_rx_reminder",
    name: "Repeat Rx Reminder",
    description: "Sent when a repeat prescription is due for renewal",
    fields: [
      { key: "patientName", label: "Patient Name", default: "Sarah Johnson" },
      { key: "medicationName", label: "Medication Name", default: "Sildenafil 50mg" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
      { key: "appUrl", label: "App URL", default: "https://instantmed.com.au" },
    ],
  },
  {
    id: "payment_confirmed",
    name: "Payment Confirmed",
    description: "Sent after successful Stripe checkout for all service types",
    fields: [
      { key: "patientName", label: "Patient Name", default: "John Smith" },
      { key: "requestType", label: "Request Type", default: "Medical Certificate" },
      { key: "amount", label: "Amount", default: "$39.99" },
      { key: "requestId", label: "Request ID", default: "test-intake-123" },
    ],
  },
]

export function EmailTestClient() {
  const [selectedTemplate, setSelectedTemplate] = useState(emailTemplates[0])
  const [testEmail, setTestEmail] = useState("")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview")
  const [customData, setCustomData] = useState<Record<string, string>>({})
  const [isSending, setIsSending] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [renderedHtml, setRenderedHtml] = useState("")
  const [renderError, setRenderError] = useState("")

  // Build props from defaults + custom overrides
  const buildProps = useCallback(() => {
    const props: Record<string, string> = {}
    for (const field of selectedTemplate.fields) {
      props[field.key] = customData[field.key] || field.default
    }
    // Always include appUrl for templates that need it
    props.appUrl = props.appUrl || "https://instantmed.com.au"
    return props
  }, [selectedTemplate, customData])

  // Render the REAL template via server action
  const renderTemplate = useCallback(async () => {
    setIsRendering(true)
    setRenderError("")
    try {
      const result = await renderTestEmailAction(selectedTemplate.id, buildProps())
      if (result.success && result.html) {
        setRenderedHtml(result.html)
      } else {
        setRenderError(result.error || "Unknown render error")
        setRenderedHtml("")
      }
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "Failed to render template")
      setRenderedHtml("")
    } finally {
      setIsRendering(false)
    }
  }, [selectedTemplate.id, buildProps])

  // Auto-render on mount and when template changes
  useEffect(() => {
    renderTemplate()
  }, [renderTemplate])

  // Send test email
  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }
    if (!renderedHtml) {
      toast.error("No rendered email to send")
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          subject: `[TEST] ${selectedTemplate.name}`,
          html: renderedHtml,
        }),
      })

      if (response.ok) {
        toast.success(`Test email sent to ${testEmail}`)
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send email")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test email")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2 font-sans">
            <Mail className="h-5 w-5 text-primary" />
            Email Template Tester
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Preview and send real production email templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={renderTemplate} disabled={isRendering}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRendering ? "animate-spin" : ""}`} />
            {isRendering ? "Rendering..." : "Re-render"}
          </Button>
          <Button size="sm" className="h-8 text-[12px]" onClick={sendTestEmail} disabled={isSending || !renderedHtml}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {isSending ? "Sending..." : "Send Test"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Template Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Template
              </CardTitle>
              <CardDescription className="text-[12px]">Select which production email to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={selectedTemplate.id}
                onValueChange={(value) => {
                  const template = emailTemplates.find((t) => t.id === value)
                  if (template) {
                    setSelectedTemplate(template)
                    setCustomData({})
                  }
                }}
              >
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-[13px]">
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[12px] text-muted-foreground">{selectedTemplate.description}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span>Uses real production template</span>
              </div>
            </CardContent>
          </Card>

          {/* Template Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Sample Data
              </CardTitle>
              <CardDescription className="text-[12px]">Customize template variables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedTemplate.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-[12px] text-muted-foreground">{field.label}</Label>
                  <Input
                    className="h-8 text-[13px]"
                    placeholder={field.default}
                    value={customData[field.key] || ""}
                    onChange={(e) => {
                      setCustomData((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[12px] mt-2"
                onClick={renderTemplate}
                disabled={isRendering}
              >
                <RefreshCw className={`h-3 w-3 mr-1.5 ${isRendering ? "animate-spin" : ""}`} />
                Apply Changes
              </Button>
            </CardContent>
          </Card>

          {/* Send Test */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send Test Email
              </CardTitle>
              <CardDescription className="text-[12px]">Send current template to your inbox</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[12px] text-muted-foreground">Email Address</Label>
                <Input
                  type="email"
                  className="h-8 text-[13px]"
                  placeholder="your@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={sendTestEmail}
                disabled={isSending || !renderedHtml}
                className="w-full h-8 text-[12px]"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send Test Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[14px] flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </CardTitle>
                  <CardDescription className="text-[12px]">{selectedTemplate.name}</CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center border border-border/60 rounded-md">
                    <Button
                      variant={viewMode === "preview" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-[11px] rounded-r-none px-2.5"
                      onClick={() => setViewMode("preview")}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant={viewMode === "code" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-[11px] rounded-l-none px-2.5"
                      onClick={() => setViewMode("code")}
                    >
                      <Code className="h-3 w-3 mr-1" />
                      HTML
                    </Button>
                  </div>
                  {viewMode === "preview" && (
                    <div className="flex items-center border border-border/60 rounded-md">
                      <Button
                        variant={previewMode === "desktop" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 text-[11px] rounded-r-none px-2.5"
                        onClick={() => setPreviewMode("desktop")}
                      >
                        <Monitor className="h-3 w-3 mr-1" />
                        Desktop
                      </Button>
                      <Button
                        variant={previewMode === "mobile" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 text-[11px] rounded-l-none px-2.5"
                        onClick={() => setPreviewMode("mobile")}
                      >
                        <Smartphone className="h-3 w-3 mr-1" />
                        Mobile
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive mb-3" />
                  <p className="text-[13px] font-medium text-destructive">Render Error</p>
                  <p className="text-[12px] text-muted-foreground mt-1 max-w-md">{renderError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 h-7 text-[12px]"
                    onClick={renderTemplate}
                  >
                    Retry
                  </Button>
                </div>
              ) : isRendering ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : viewMode === "preview" ? (
                <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/30">
                  <div
                    className="transition-all duration-200 mx-auto"
                    style={{
                      maxWidth: previewMode === "mobile" ? "375px" : "100%",
                    }}
                  >
                    <iframe
                      srcDoc={renderedHtml}
                      className="w-full border-0 bg-background"
                      style={{
                        height: previewMode === "mobile" ? "667px" : "700px",
                      }}
                      sandbox="allow-same-origin"
                      title="Email preview"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 z-10 h-7 text-[11px]"
                    onClick={() => {
                      navigator.clipboard.writeText(renderedHtml)
                      toast.success("HTML copied to clipboard")
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-[11px] font-mono max-h-[700px] leading-relaxed">
                    {renderedHtml}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
