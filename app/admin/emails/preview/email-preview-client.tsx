"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, Monitor, Smartphone, RefreshCw, Eye, Code } from "lucide-react"
import { toast } from "sonner"

const EMAIL_TEMPLATES = [
  { id: "welcome", name: "Welcome Email", category: "onboarding" },
  { id: "intake-received", name: "Intake Received", category: "transactional" },
  { id: "intake-approved", name: "Intake Approved", category: "transactional" },
  { id: "intake-declined", name: "Intake Declined", category: "transactional" },
  { id: "certificate-ready", name: "Certificate Ready", category: "transactional" },
  { id: "prescription-ready", name: "Prescription Ready", category: "transactional" },
  { id: "payment-receipt", name: "Payment Receipt", category: "transactional" },
  { id: "payment-failed", name: "Payment Failed", category: "transactional" },
  { id: "abandoned-checkout", name: "Abandoned Checkout", category: "marketing" },
  { id: "feedback-request", name: "Feedback Request", category: "marketing" },
]

const SAMPLE_DATA = {
  patientName: "John Smith",
  patientEmail: "john.smith@example.com",
  intakeId: "INT-2026-001234",
  serviceName: "Medical Certificate",
  doctorName: "Dr. Sarah Chen",
  amount: "$24.00",
  certificateUrl: "https://example.com/certificate/abc123",
  trackingUrl: "https://instantmed.com.au/track/abc123",
}

export function EmailPreviewClient() {
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0].id)
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview")
  const [testEmail, setTestEmail] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sampleData, setSampleData] = useState(SAMPLE_DATA)

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }

    setIsSending(true)
    try {
      // In production, call API to send test email
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success(`Test email sent to ${testEmail}`)
    } catch {
      toast.error("Failed to send test email")
    } finally {
      setIsSending(false)
    }
  }

  const currentTemplate = EMAIL_TEMPLATES.find((t) => t.id === selectedTemplate)

  // Generate preview HTML (simplified - in production, render actual template)
  const generatePreviewHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #2563eb; color: white; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 32px 24px; }
            .content h2 { color: #1f2937; margin-top: 0; }
            .content p { color: #4b5563; line-height: 1.6; }
            .button { display: inline-block; background: #2563eb; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; }
            .footer a { color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>InstantMed</h1>
            </div>
            <div class="content">
              <h2>${getTemplateSubject(selectedTemplate)}</h2>
              <p>Hi ${sampleData.patientName},</p>
              <p>${getTemplateBody(selectedTemplate)}</p>
              <p style="margin-top: 24px;">
                <a href="${sampleData.trackingUrl}" class="button">
                  ${getTemplateButtonText(selectedTemplate)}
                </a>
              </p>
              <p style="margin-top: 24px;">
                Best regards,<br>
                The InstantMed Team
              </p>
            </div>
            <div class="footer">
              <p>InstantMed Pty Ltd | ABN 64 694 559 334</p>
              <p>
                <a href="#">Unsubscribe</a> | 
                <a href="#">Privacy Policy</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  const getTemplateSubject = (id: string) => {
    const subjects: Record<string, string> = {
      "welcome": "Welcome to InstantMed",
      "intake-received": "We've received your request",
      "intake-approved": "Great news! Your request has been approved",
      "intake-declined": "Update on your request",
      "certificate-ready": "Your medical certificate is ready",
      "prescription-ready": "Your prescription is ready",
      "payment-receipt": "Payment confirmation",
      "payment-failed": "Payment issue with your request",
      "abandoned-checkout": "You left something behind",
      "feedback-request": "How was your experience?",
    }
    return subjects[id] || "Email from InstantMed"
  }

  const getTemplateBody = (id: string) => {
    const bodies: Record<string, string> = {
      "welcome": `Welcome to InstantMed! We're here to make healthcare simple and accessible. Get started with your first consult today.`,
      "intake-received": `We've received your ${sampleData.serviceName} request (${sampleData.intakeId}). A doctor will review it shortly.`,
      "intake-approved": `${sampleData.doctorName} has approved your ${sampleData.serviceName} request. Your document is being prepared.`,
      "intake-declined": `Unfortunately, we weren't able to approve your request at this time. A full refund of ${sampleData.amount} has been processed.`,
      "certificate-ready": `Your medical certificate is ready for download. You can access it anytime from your patient portal.`,
      "prescription-ready": `Your prescription is ready! An eScript has been sent to your phone via SMS. Take it to any pharmacy.`,
      "payment-receipt": `Thank you for your payment of ${sampleData.amount} for ${sampleData.serviceName}. This email serves as your receipt.`,
      "payment-failed": `We had trouble processing your payment for ${sampleData.serviceName}. Please update your payment method.`,
      "abandoned-checkout": `You started a ${sampleData.serviceName} request but didn't complete it. We've saved your progress.`,
      "feedback-request": `How was your recent experience with InstantMed? We'd love to hear your feedback.`,
    }
    return bodies[id] || "Thank you for using InstantMed."
  }

  const getTemplateButtonText = (id: string) => {
    const buttons: Record<string, string> = {
      "welcome": "Start a Consult",
      "intake-received": "Track Your Request",
      "intake-approved": "View Details",
      "intake-declined": "Contact Support",
      "certificate-ready": "Download Certificate",
      "prescription-ready": "View Prescription",
      "payment-receipt": "View Receipt",
      "payment-failed": "Update Payment",
      "abandoned-checkout": "Complete Request",
      "feedback-request": "Leave Feedback",
    }
    return buttons[id] || "View Details"
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Template</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Category: {currentTemplate?.category}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sample Data</CardTitle>
            <CardDescription className="text-xs">
              Edit to preview with different values
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Patient Name</Label>
              <Input
                value={sampleData.patientName}
                onChange={(e) => setSampleData({ ...sampleData, patientName: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Service Name</Label>
              <Input
                value={sampleData.serviceName}
                onChange={(e) => setSampleData({ ...sampleData, serviceName: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Amount</Label>
              <Input
                value={sampleData.amount}
                onChange={(e) => setSampleData({ ...sampleData, amount: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Send Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Email Address</Label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Button
              onClick={handleSendTest}
              disabled={isSending}
              className="w-full gap-2"
              size="sm"
            >
              {isSending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Test Email
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Preview</CardTitle>
            <CardDescription>{getTemplateSubject(selectedTemplate)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "preview" | "html")}>
              <TabsList className="h-8">
                <TabsTrigger value="preview" className="h-6 px-2 text-xs gap-1">
                  <Eye className="h-3 w-3" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="html" className="h-6 px-2 text-xs gap-1">
                  <Code className="h-3 w-3" />
                  HTML
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex border rounded-md">
              <Button
                variant={previewMode === "desktop" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setPreviewMode("desktop")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewMode === "mobile" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setPreviewMode("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`border rounded-lg overflow-hidden bg-gray-100 mx-auto transition-all ${
              previewMode === "mobile" ? "max-w-[375px]" : "max-w-full"
            }`}
          >
            {viewMode === "preview" ? (
              <iframe
                srcDoc={generatePreviewHTML()}
                className="w-full h-[600px] bg-white"
                title="Email Preview"
              />
            ) : (
              <pre className="p-4 text-xs overflow-auto h-[600px] bg-gray-900 text-gray-100">
                {generatePreviewHTML()}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
