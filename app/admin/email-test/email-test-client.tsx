"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mail,
  Send,
  Eye,
  Smartphone,
  Monitor,
  Code,
  Settings,
  Palette,
  Download,
  RefreshCw,
  Brush,
  Layers,
} from "lucide-react"
import { toast } from "sonner"

// Email themes
const emailThemes = {
  modern: {
    name: "Modern",
    colors: {
      primary: "#6366f1",
      secondary: "#8b5cf6",
      accent: "#ec4899",
      background: "#ffffff",
      text: "#1f2937",
      muted: "#6b7280",
      border: "#e5e7eb",
    },
    fonts: {
      heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    borderRadius: "12px",
    shadows: true,
    gradients: true,
  },
  sleek: {
    name: "Sleek",
    colors: {
      primary: "#000000",
      secondary: "#374151",
      accent: "#ef4444",
      background: "#ffffff",
      text: "#111827",
      muted: "#6b7280",
      border: "#d1d5db",
    },
    fonts: {
      heading: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
      body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    borderRadius: "4px",
    shadows: false,
    gradients: false,
  },
  premium: {
    name: "Premium",
    colors: {
      primary: "#d97706",
      secondary: "#92400e",
      accent: "#f59e0b",
      background: "#fef3c7",
      text: "#78350f",
      muted: "#92400e",
      border: "#fbbf24",
    },
    fonts: {
      heading: "'Playfair Display', Georgia, serif",
      body: "'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    borderRadius: "8px",
    shadows: true,
    gradients: true,
  },
  minimal: {
    name: "Minimal",
    colors: {
      primary: "#059669",
      secondary: "#047857",
      accent: "#10b981",
      background: "#ffffff",
      text: "#064e3b",
      muted: "#6b7280",
      border: "#d1fae5",
    },
    fonts: {
      heading: "'System UI', -apple-system, BlinkMacSystemFont, sans-serif",
      body: "'System UI', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    borderRadius: "0px",
    shadows: false,
    gradients: false,
  },
}

// Email templates
const emailTemplates = [
  {
    id: "med_cert_patient",
    name: "Medical Certificate - Patient",
    description: "Sent to patients when their certificate is ready",
    tags: ["patientName", "dashboardUrl", "verificationCode", "certType", "appUrl"],
    sampleData: {
      patientName: "Sarah Johnson",
      dashboardUrl: "https://instantmed.com.au/dashboard",
      verificationCode: "MC-ABC123-XYZ",
      certType: "Work Absence",
      appUrl: "https://instantmed.com.au",
      employerName: "",
      companyName: "",
      downloadUrl: "",
      medicationName: "",
      serviceName: "",
      declineReason: "",
      recommendations: "",
    },
  },
  {
    id: "med_cert_employer",
    name: "Medical Certificate - Employer",
    description: "Forwarded to employers upon patient request",
    tags: ["employerName", "companyName", "patientName", "downloadUrl", "verificationCode"],
    sampleData: {
      employerName: "John Smith",
      companyName: "Acme Corporation",
      patientName: "Sarah Johnson",
      downloadUrl: "https://instantmed.com.au/download/ABC123",
      verificationCode: "MC-ABC123-XYZ",
      dashboardUrl: "",
      certType: "",
      appUrl: "https://instantmed.com.au",
      medicationName: "",
      serviceName: "",
      declineReason: "",
      recommendations: "",
    },
  },
  {
    id: "welcome",
    name: "Welcome Email",
    description: "Sent to new users after registration",
    tags: ["patientName", "dashboardUrl", "appUrl"],
    sampleData: {
      patientName: "Sarah Johnson",
      dashboardUrl: "https://instantmed.com.au/dashboard",
      appUrl: "https://instantmed.com.au",
      verificationCode: "",
      certType: "",
      employerName: "",
      companyName: "",
      downloadUrl: "",
      medicationName: "",
      serviceName: "",
      declineReason: "",
      recommendations: "",
    },
  },
  {
    id: "script_sent",
    name: "eScript Sent",
    description: "Notifies patients when eScript is sent via SMS",
    tags: ["patientName", "medicationName", "appUrl"],
    sampleData: {
      patientName: "Sarah Johnson",
      medicationName: "Amoxicillin 500mg",
      appUrl: "https://instantmed.com.au",
      dashboardUrl: "",
      verificationCode: "",
      certType: "",
      employerName: "",
      companyName: "",
      downloadUrl: "",
      serviceName: "",
      declineReason: "",
      recommendations: "",
    },
  },
  {
    id: "request_declined",
    name: "Request Declined",
    description: "Sent when a medical request cannot be approved",
    tags: ["patientName", "serviceName", "declineReason", "recommendations"],
    sampleData: {
      patientName: "Sarah Johnson",
      serviceName: "Medical Certificate",
      declineReason: "Insufficient medical documentation provided",
      recommendations: "Please consult with your regular GP for a comprehensive assessment",
      appUrl: "https://instantmed.com.au",
      dashboardUrl: "",
      verificationCode: "",
      certType: "",
      employerName: "",
      companyName: "",
      downloadUrl: "",
      medicationName: "",
    },
  },
]

export function EmailTestClient() {
  const [selectedTemplate, setSelectedTemplate] = useState(emailTemplates[0])
  const [selectedTheme, setSelectedTheme] = useState("modern")
  const [testEmail, setTestEmail] = useState("")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview")
  const [customData, setCustomData] = useState<Record<string, string>>({})
  const [isSending, setIsSending] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedHtml, setGeneratedHtml] = useState("")
  const [customStyles, setCustomStyles] = useState("")

  const theme = emailThemes[selectedTheme as keyof typeof emailThemes]

  // Generate email HTML with theme
  const generateEmailHtml = async () => {
    setIsGenerating(true)
    try {
      const data = { ...selectedTemplate.sampleData, ...customData }
      
      // Generate themed HTML
      const html = generateThemedEmail(selectedTemplate.id, data, theme, customStyles)
      setGeneratedHtml(html)
    } catch (_error) {
      toast.error("Failed to generate email preview")
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate themed email HTML
  const generateThemedEmail = (templateId: string, data: Record<string, string>, theme: typeof emailThemes["modern"], customStyles: string) => {
    const { colors, fonts, borderRadius, shadows, gradients } = theme
    
    const baseStyles = `
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: ${fonts.body}; 
          margin: 0; 
          padding: 20px; 
          background: ${colors.background}; 
          color: ${colors.text};
          line-height: 1.6;
        }
        .email-container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: ${colors.background}; 
          border-radius: ${borderRadius};
          ${shadows ? 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);' : ''}
          border: 1px solid ${colors.border};
          overflow: hidden;
        }
        .header { 
          padding: 32px 24px; 
          text-align: center; 
          ${gradients ? `background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});` : `background: ${colors.primary};`}
          color: white;
        }
        .header h1 { 
          font-family: ${fonts.heading}; 
          font-size: 28px; 
          font-weight: 700; 
          margin: 0;
          letter-spacing: -0.025em;
        }
        .content { 
          padding: 32px 24px; 
        }
        .content h2 { 
          font-family: ${fonts.heading}; 
          font-size: 24px; 
          font-weight: 600; 
          margin: 0 0 16px 0;
          color: ${colors.text};
        }
        .content h3 { 
          font-family: ${fonts.heading}; 
          font-size: 18px; 
          font-weight: 600; 
          margin: 24px 0 12px 0;
          color: ${colors.text};
        }
        .content p { 
          margin: 0 0 16px 0; 
          color: ${colors.text};
        }
        .button { 
          display: inline-block; 
          background: ${colors.primary}; 
          color: white !important; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: ${borderRadius}; 
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .button:hover { 
          background: ${colors.secondary}; 
        }
        .verification-box { 
          background: ${colors.background === '#ffffff' ? '#f8fafc' : colors.background}; 
          border: 2px solid ${colors.border}; 
          border-radius: ${borderRadius}; 
          padding: 24px; 
          margin: 24px 0; 
          text-align: center;
        }
        .verification-code { 
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace; 
          font-size: 24px; 
          font-weight: bold; 
          color: ${colors.primary}; 
          letter-spacing: 2px; 
          margin: 8px 0;
        }
        .footer { 
          background: ${colors.background === '#ffffff' ? '#f8fafc' : colors.background}; 
          padding: 24px; 
          text-align: center; 
          color: ${colors.muted}; 
          font-size: 14px;
          border-top: 1px solid ${colors.border};
        }
        .footer a { 
          color: ${colors.primary}; 
          text-decoration: none; 
        }
        .footer a:hover { 
          text-decoration: underline; 
        }
        .test-banner {
          background: #ef4444;
          color: white;
          padding: 12px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
        }
        ${customStyles}
      </style>
    `

    // Template-specific content
    const templateContent = getTemplateContent(templateId, data, colors)

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InstantMed - ${selectedTemplate.name}</title>
  ${baseStyles}
</head>
<body>
  <div class="email-container">
    <div class="test-banner">
      🧪 TEST EMAIL - ${selectedTemplate.name} - Theme: ${theme.name}
    </div>
    <div class="header">
      <h1>InstantMed</h1>
    </div>
    <div class="content">
      ${templateContent}
    </div>
    <div class="footer">
      <p>InstantMed Pty Ltd | ABN 64 694 559 334</p>
      <p>
        <a href="${data.appUrl}/privacy">Privacy Policy</a> | 
        <a href="${data.appUrl}/contact">Contact</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  // Get template content based on ID
  const getTemplateContent = (templateId: string, data: Record<string, string>, colors: Record<string, string>) => {
    switch (templateId) {
      case "med_cert_patient":
        return `
          <h2>Your medical certificate is ready</h2>
          <p>Hi ${data.patientName},</p>
          <p>Your <strong>Medical Certificate — ${data.certType}</strong> has been reviewed and approved by one of our doctors. You can download it from your dashboard.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${data.dashboardUrl}" class="button">View Dashboard</a>
          </p>
          ${data.verificationCode ? `
            <div class="verification-box">
              <h3 style="margin-top: 0;">Verification Code</h3>
              <div class="verification-code">${data.verificationCode}</div>
              <p style="margin-bottom: 0; font-size: 14px; color: ${colors.muted};">
                You can verify this certificate at ${data.appUrl}/verify
              </p>
            </div>
          ` : ''}
          <h3>What happens next?</h3>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;">Download your certificate from your dashboard</li>
            <li style="margin-bottom: 8px;">Forward it to your employer, university, or relevant institution</li>
            <li style="margin-bottom: 0;">Keep a copy for your records</li>
          </ul>
          <p style="margin-top: 32px;">Best regards,<br>The InstantMed Team</p>
        `
      
      case "med_cert_employer":
        return `
          <h2>Medical Certificate for ${data.patientName}</h2>
          <p>Dear ${data.employerName},</p>
          <p><strong>${data.patientName}</strong> has requested that we forward their medical certificate to you. This certificate was issued by a registered Australian doctor through InstantMed's telehealth service.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${data.downloadUrl}" class="button">Download Certificate (PDF)</a>
          </p>
          <p style="text-align: center; font-size: 14px; color: ${colors.muted}; margin-top: 16px;">
            This link expires in 7 days for security.
          </p>
          ${data.verificationCode ? `
            <div class="verification-box">
              <h3 style="margin-top: 0;">Certificate Verification</h3>
              <div class="verification-code">${data.verificationCode}</div>
              <p style="margin-bottom: 0; font-size: 14px; color: ${colors.muted};">
                You can verify the authenticity of this certificate at ${data.appUrl}/verify
              </p>
            </div>
          ` : ''}
          <h3>About InstantMed</h3>
          <p style="font-size: 14px; color: ${colors.muted}; margin: 0;">
            InstantMed is an Australian telehealth service. All medical certificates are issued by AHPRA-registered doctors and include verification codes for authenticity checks.
          </p>
        `
      
      case "welcome":
        return `
          <h2>Welcome to InstantMed!</h2>
          <p>Hi ${data.patientName},</p>
          <p>Welcome to InstantMed! We're here to make healthcare simple and accessible. Get started with your first consult today.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${data.dashboardUrl}" class="button">Get Started</a>
          </p>
          <h3>What we offer:</h3>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;">Quick online consultations with Australian doctors</li>
            <li style="margin-bottom: 8px;">Medical certificates and eScripts</li>
            <li style="margin-bottom: 8px;">No appointment needed - consult on your schedule</li>
            <li style="margin-bottom: 0;">Secure and confidential service</li>
          </ul>
          <p style="margin-top: 32px;">We look forward to helping you with your healthcare needs.</p>
          <p>Best regards,<br>The InstantMed Team</p>
        `
      
      case "script_sent":
        return `
          <h2>Your eScript is on its way</h2>
          <p>Hi ${data.patientName},</p>
          <p>Your prescription for <strong>${data.medicationName}</strong> has been sent to your phone via SMS.</p>
          <div class="verification-box">
            <h3 style="margin-top: 0;">How to collect your medication:</h3>
            <ol style="padding-left: 20px; text-align: left;">
              <li style="margin-bottom: 8px;">Check your phone for the SMS with the eScript QR code</li>
              <li style="margin-bottom: 8px;">Take your phone to any pharmacy</li>
              <li style="margin-bottom: 0;">The pharmacist will scan the QR code and dispense your medication</li>
            </ol>
          </div>
          <p style="text-align: center; font-size: 14px; color: ${colors.muted}; margin: 32px 0;">
            <strong>Important:</strong> The eScript QR code is sent directly to your phone, not to the pharmacy.
          </p>
          <p>If you don't receive the SMS within 5 minutes, please check your spam folder or contact us.</p>
          <p>Best regards,<br>The InstantMed Team</p>
        `
      
      case "request_declined":
        return `
          <h2>Regarding your ${data.serviceName} request</h2>
          <p>Hi ${data.patientName},</p>
          <p>Thank you for choosing InstantMed. After careful review by our medical team, we're unable to approve your request for a <strong>${data.serviceName}</strong>.</p>
          <div class="verification-box">
            <h3 style="margin-top: 0;">Reason for decline:</h3>
            <p style="margin: 0;">${data.declineReason}</p>
          </div>
          <h3>What we recommend:</h3>
          <p>${data.recommendations}</p>
          <p>If you believe this decision was made in error or have additional medical documentation to provide, please contact our support team.</p>
          <p style="margin-top: 32px;">Best regards,<br>The InstantMed Team</p>
        `
      
      default:
        return `<p>Template content not available</p>`
    }
  }

  // Send test email
  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          subject: `[TEST] ${selectedTemplate.name} - ${theme.name} Theme`,
          html: generatedHtml,
        }),
      })

      if (response.ok) {
        toast.success(`Test email sent to ${testEmail}`)
      } else {
        throw new Error("Failed to send email")
      }
    } catch (_error) {
      toast.error("Failed to send test email")
    } finally {
      setIsSending(false)
    }
  }

  // Initialize with first template
  useState(() => {
    generateEmailHtml()
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Test Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design, customize, and test premium email templates with extensive styling options
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={generateEmailHtml} disabled={isGenerating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? "Generating..." : "Regenerate"}
          </Button>
          <Button size="sm" onClick={sendTestEmail} disabled={isSending || !generatedHtml}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Test"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Email Template
              </CardTitle>
              <CardDescription>Choose which email to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedTemplate.id} onValueChange={(value) => {
                const template = emailTemplates.find(t => t.id === value)
                if (template) {
                  setSelectedTemplate(template)
                  setCustomData({})
                  setTimeout(generateEmailHtml, 100)
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {selectedTemplate.description}
              </p>
            </CardContent>
          </Card>

          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Design Theme
              </CardTitle>
              <CardDescription>Choose a premium design style</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(emailThemes).map(([key, theme]) => (
                  <Button
                    key={key}
                    variant={selectedTheme === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedTheme(key)
                      setTimeout(generateEmailHtml, 100)
                    }}
                    className="justify-start"
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    {theme.name}
                  </Button>
                ))}
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Theme Colors</Label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(theme.colors).slice(0, 6).map(([key, color]) => (
                    <div key={key} className="text-center">
                      <div
                        className="w-full h-8 rounded border"
                        style={{ backgroundColor: color }}
                      />
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Template Data
              </CardTitle>
              <CardDescription>Customize merge tag values</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTemplate.tags.map((tag) => (
                <div key={tag} className="space-y-2">
                  <Label className="text-sm">{tag}</Label>
                  <Input
                    placeholder={selectedTemplate.sampleData[tag as keyof typeof selectedTemplate.sampleData] || `Enter ${tag}`}
                    value={customData[tag] || ""}
                    onChange={(e) => {
                      setCustomData(prev => ({ ...prev, [tag]: e.target.value }))
                      setTimeout(generateEmailHtml, 500)
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brush className="h-5 w-5" />
                Custom Styles
              </CardTitle>
              <CardDescription>Add custom CSS for advanced styling</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter custom CSS..."
                value={customStyles}
                onChange={(e) => {
                  setCustomStyles(e.target.value)
                  setTimeout(generateEmailHtml, 500)
                }}
                className="font-mono text-xs min-h-[150px]"
              />
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Test Email
              </CardTitle>
              <CardDescription>Send the current design to your inbox</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Test Email Address</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button 
                onClick={sendTestEmail} 
                disabled={isSending || !generatedHtml}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Email Preview
                  </CardTitle>
                  <CardDescription>
                    {selectedTemplate.name} - {theme.name} Theme
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant={viewMode === "preview" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("preview")}
                      className="rounded-r-none"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant={viewMode === "code" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("code")}
                      className="rounded-l-none"
                    >
                      <Code className="h-4 w-4 mr-1" />
                      Code
                    </Button>
                  </div>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant={previewMode === "desktop" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPreviewMode("desktop")}
                      className="rounded-r-none"
                    >
                      <Monitor className="h-4 w-4 mr-1" />
                      Desktop
                    </Button>
                    <Button
                      variant={previewMode === "mobile" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPreviewMode("mobile")}
                      className="rounded-l-none"
                    >
                      <Smartphone className="h-4 w-4 mr-1" />
                      Mobile
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : viewMode === "preview" ? (
                <div className="border rounded-lg overflow-hidden">
                  <div
                    className="transition-all duration-200"
                    style={{
                      maxWidth: previewMode === "mobile" ? "375px" : "100%",
                      margin: previewMode === "mobile" ? "0 auto" : "0",
                    }}
                  >
                    <iframe
                      srcDoc={generatedHtml}
                      className="w-full border-0"
                      style={{
                        height: previewMode === "mobile" ? "667px" : "600px",
                      }}
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedHtml)
                        toast.success("HTML copied to clipboard")
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Copy HTML
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs font-mono max-h-[600px]">
                    {generatedHtml}
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
