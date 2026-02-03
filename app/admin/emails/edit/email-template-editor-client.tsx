"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Mail,
  Edit,
  Save,
  ArrowLeft,
  Eye,
  Loader2,
  Code,
  FileText,
  Send,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
  sendAdminTestEmailAction,
  getAdminEmailTemplatesAction,
  getAdminTemplateSampleDataAction,
  previewAdminEmailTemplateAction,
} from "@/app/actions/admin-email-preview"
import { updateEmailTemplateAction, toggleEmailTemplateActiveAction } from "@/app/actions/admin-config"
import type { EmailTemplate } from "@/lib/data/email-templates"

interface EmailTemplateEditorClientProps {
  initialTemplates: EmailTemplate[]
}

export function EmailTemplateEditorClient({ initialTemplates }: EmailTemplateEditorClientProps) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [viewMode, setViewMode] = useState<"preview" | "html" | "react">("react")
  const [reactTemplates, setReactTemplates] = useState<Array<{ slug: string; name: string; availableTags: string[] }>>([])
  const [_sampleData, setSampleData] = useState<Record<string, unknown>>({})
  const [customData, setCustomData] = useState<Record<string, unknown>>({})
  const [reactPreviewHtml, setReactPreviewHtml] = useState("")
  const [reactPreviewSubject, setReactPreviewSubject] = useState("")
  const [isReactPreviewLoading, setIsReactPreviewLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    subject: "",
    body_html: "",
    body_text: "",
  })

  // Load React templates
  useEffect(() => {
    const loadReactTemplates = async () => {
      try {
        const result = await getAdminEmailTemplatesAction()
        if (result.success && result.templates) {
          setReactTemplates(result.templates)
        }
      } catch {
        // Silently fail
      }
    }

    loadReactTemplates()
  }, [])

  // Load sample data when template changes
  useEffect(() => {
    if (!selectedTemplate) return

    const loadSampleData = async () => {
      try {
        const result = await getAdminTemplateSampleDataAction(selectedTemplate.slug)
        if (result.success && result.sampleData) {
          setSampleData(result.sampleData)
          setCustomData(result.sampleData)
        }
      } catch {
        // Silently fail
      }
    }

    loadSampleData()
  }, [selectedTemplate])

  // Generate React preview when template or data changes
  useEffect(() => {
    if (!selectedTemplate || viewMode !== "react") return

    const generatePreview = async () => {
      setIsReactPreviewLoading(true)
      
      try {
        const result = await previewAdminEmailTemplateAction(selectedTemplate.slug, customData as Record<string, string>)
        if (result.success && result.html && result.subject) {
          setReactPreviewHtml(result.html)
          setReactPreviewSubject(result.subject)
        }
      } catch {
        // Silently fail
      } finally {
        setIsReactPreviewLoading(false)
      }
    }

    generatePreview()
  }, [selectedTemplate, customData, viewMode])

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || "",
    })
    setIsEditDialogOpen(true)
  }

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setIsPreviewOpen(true)
  }

  const handleOpenTestEmail = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setTestEmail("")
    setIsTestEmailOpen(true)
  }

  const handleSendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) return

    setIsSendingTest(true)
    try {
      const result = await sendAdminTestEmailAction(selectedTemplate.slug, testEmail, customData as Record<string, string>)
      if (result.success) {
        toast.success(`Test email sent to ${testEmail}`)
        setIsTestEmailOpen(false)
        setTestEmail("")
      } else {
        toast.error(result.error || "Failed to send test email")
      }
    } catch {
      toast.error("Failed to send test email")
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleToggleActive = async (template: EmailTemplate) => {
    const newStatus = !template.is_active
    try {
      const result = await toggleEmailTemplateActiveAction(template.id, newStatus)
      if (result.success) {
        setTemplates(prev =>
          prev.map(t => (t.id === template.id ? { ...t, is_active: newStatus } : t))
        )
        toast.success(`Template ${newStatus ? "enabled" : "disabled"}`)
      } else {
        toast.error(result.error || "Failed to update template")
      }
    } catch {
      toast.error("Failed to update template")
    }
  }

  const handleSave = async () => {
    if (!selectedTemplate) return

    setIsSaving(true)
    try {
      const result = await updateEmailTemplateAction(selectedTemplate.id, formData)
      if (result.success && result.data) {
        setTemplates(prev =>
          prev.map(t => (t.id === selectedTemplate.id ? result.data! : t))
        )
        toast.success("Template saved successfully")
        setIsEditDialogOpen(false)
      } else {
        toast.error(result.error || "Failed to save template")
      }
    } catch {
      toast.error("Failed to save template")
    } finally {
      setIsSaving(false)
    }
  }

  // Replace merge tags with sample data for preview
  const getPreviewHtml = (html: string, tags: string[]) => {
    let preview = html
    const sampleDataRecord: Record<string, string> = {
      patient_name: "John Smith",
      certificate_link: "https://instantmed.com.au/verify/ABC123",
      certificate_id: "CERT-2024-001234",
      service_name: "Medical Certificate",
      doctor_name: "Sarah Johnson",
      next_steps: "Your certificate is ready to download.",
      decline_reason: "Unable to verify identity",
      recommendations: "Please visit your local GP.",
      medication_name: "Amoxicillin 500mg",
      amount: "$29.00",
      refund_reason: "Request declined",
    }
    for (const tag of tags) {
      preview = preview.replace(new RegExp(`{{${tag}}}`, "g"), sampleDataRecord[tag] || `[${tag}]`)
    }
    return preview
  }

  const updateCustomData = (key: string, value: string) => {
    setCustomData(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const isReactTemplate = selectedTemplate ? reactTemplates.some(rt => rt.slug === selectedTemplate.slug) : false

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
              <Mail className="h-6 w-6 text-primary" />
              Email Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Edit and preview email templates
            </p>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates</CardTitle>
          <CardDescription>
            Edit email templates sent to patients. React templates support live preview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No Email Templates Found</h3>
              <p className="text-sm text-muted-foreground/70 mt-2 max-w-md">
                The email_templates table appears to be empty. This may indicate that the database migration 
                hasn&apos;t been applied yet. Please run the migrations to seed the default templates.
              </p>
              <code className="mt-4 px-3 py-2 bg-muted rounded text-xs font-mono">
                npx supabase db push
              </code>
            </div>
          ) : (
          <div className="grid gap-4">
            {templates.map((template) => {
              const hasReactVersion = reactTemplates.some(rt => rt.slug === template.slug)
              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{template.name}</h3>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {template.slug}
                      </Badge>
                      {hasReactVersion && (
                        <Badge variant="outline" className="text-xs">
                          React
                        </Badge>
                      )}
                      {!template.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      Subject: {template.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        Version {template.version}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        Tags: {template.available_tags.join(", ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() => handleToggleActive(template)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewTemplate(template)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenTestEmail(template)}
                      title="Send test email"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Edit Email Template
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} ({selectedTemplate?.slug})
              {isReactTemplate && (
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">React template available</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="html" className="mt-4">
            <TabsList>
              <TabsTrigger value="html" className="gap-2">
                <Code className="h-4 w-4" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2">
                <FileText className="h-4 w-4" />
                Plain Text
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Email subject..."
                />
              </div>

              <TabsContent value="html" className="mt-0">
                <div className="space-y-2">
                  <Label htmlFor="body_html">HTML Body</Label>
                  <Textarea
                    id="body_html"
                    value={formData.body_html}
                    onChange={(e) => setFormData(prev => ({ ...prev, body_html: e.target.value }))}
                    placeholder="<h1>Hello {{patient_name}}</h1>..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="text" className="mt-0">
                <div className="space-y-2">
                  <Label htmlFor="body_text">Plain Text Body (fallback)</Label>
                  <Textarea
                    id="body_text"
                    value={formData.body_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, body_text: e.target.value }))}
                    placeholder="Hello {{patient_name}}..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-0">
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm font-medium">Subject:</p>
                    <p className="text-sm">
                      {getPreviewHtml(formData.subject, selectedTemplate?.available_tags || [])}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 bg-white">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: getPreviewHtml(formData.body_html, selectedTemplate?.available_tags || []),
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Available merge tags:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate?.available_tags.map((tag) => (
                    <code key={tag} className="px-1.5 py-0.5 rounded bg-muted text-xs">
                      {`{{${tag}}}`}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Email Preview</DialogTitle>
                <DialogDescription>{selectedTemplate?.name}</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {isReactTemplate && (
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "preview" | "html" | "react")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="react" className="h-6 px-2 text-xs">
                        React
                      </TabsTrigger>
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
                )}
                <div className="flex border rounded-md">
                  <Button
                    variant={previewMode === "desktop" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setPreviewMode("desktop")}
                  >
                    <Monitor className="h-4 w-4 mr-1" />
                    Desktop
                  </Button>
                  <Button
                    variant={previewMode === "mobile" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setPreviewMode("mobile")}
                  >
                    <Smartphone className="h-4 w-4 mr-1" />
                    Mobile
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          {isReactTemplate && viewMode === "react" && (
            <div className="mt-4 space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="p-3 rounded-lg bg-muted/50 border mb-4">
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="text-base font-medium">{reactPreviewSubject}</p>
              </div>
              
              <div className="flex-1 overflow-auto rounded-xl border shadow-sm bg-linear-to-b from-slate-50 to-white flex justify-center">
                <div className={previewMode === "mobile" ? "w-[375px] border-x" : "max-w-[600px] w-full"}>
                  <div className="p-6">
                    {isReactPreviewLoading ? (
                      <div className="flex items-center justify-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <div
                        className="prose prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-800 [&_h1]:mb-4 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_a]:text-blue-600 [&_a]:no-underline hover:[&_a]:underline"
                        dangerouslySetInnerHTML={{
                          __html: reactPreviewHtml,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">Template Data:</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTemplate?.available_tags.map((tag) => (
                    <div key={tag} className="flex items-center gap-2">
                      <Label className="text-xs">{tag}:</Label>
                      <Input
                        value={(customData[tag] as string) || ""}
                        onChange={(e) => updateCustomData(tag, e.target.value)}
                        className="h-6 text-xs"
                        placeholder={`{{${tag}}}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(viewMode !== "react" || !isReactTemplate) && (
            <div className="mt-4 flex-1 overflow-hidden flex flex-col">
              <div className="p-3 rounded-lg bg-muted/50 border mb-4">
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="text-base font-medium">
                  {selectedTemplate && getPreviewHtml(selectedTemplate.subject, selectedTemplate.available_tags)}
                </p>
              </div>
              <div className="flex-1 overflow-auto rounded-xl border shadow-sm bg-linear-to-b from-slate-50 to-white flex justify-center">
                <div className={previewMode === "mobile" ? "w-[375px] border-x" : "max-w-[600px] w-full"}>
                  <div className="p-6">
                    {selectedTemplate && (
                      <div
                        className="prose prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-800 [&_h1]:mb-4 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_a]:text-blue-600 [&_a]:no-underline hover:[&_a]:underline"
                        dangerouslySetInnerHTML={{
                          __html: getPreviewHtml(selectedTemplate.body_html, selectedTemplate.available_tags),
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground text-center mt-3">
            {previewMode === "mobile" ? "Mobile preview (375px)" : "Desktop preview (600px)"} • 
            {viewMode === "react" ? " React template" : " HTML template"} • Sample data shown
          </p>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={isTestEmailOpen} onOpenChange={setIsTestEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Email
            </DialogTitle>
            <DialogDescription>
              Send a test version of &quot;{selectedTemplate?.name}&quot; with sample data
              {isReactTemplate && " using React template"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {isReactTemplate 
                  ? "The email will be rendered using the React template with sample merge tag values."
                  : "The email will include a test banner and sample merge tag values."
                }
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsTestEmailOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendTestEmail}
                disabled={isSendingTest || !testEmail}
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
