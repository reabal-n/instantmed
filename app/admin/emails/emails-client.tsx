"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Mail,
  Edit,
  Save,
  ArrowLeft,
  Search,
  Eye,
  Loader2,
  Code,
  FileText,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import {
  updateEmailTemplateAction,
  toggleEmailTemplateActiveAction,
} from "@/app/actions/admin-config"
import { sendTestEmailAction } from "@/app/actions/send-test-email"
import type { EmailTemplate } from "@/lib/data/email-templates"

interface EmailTemplatesClientProps {
  initialTemplates: EmailTemplate[]
}

export function EmailTemplatesClient({ initialTemplates }: EmailTemplatesClientProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testEmail, setTestEmail] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    subject: "",
    body_html: "",
    body_text: "",
  })

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditTemplate = useCallback((template: EmailTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || "",
    })
    setIsDialogOpen(true)
  }, [])

  const handlePreviewTemplate = useCallback((template: EmailTemplate) => {
    setSelectedTemplate(template)
    setIsPreviewOpen(true)
  }, [])

  const handleOpenTestEmail = useCallback((template: EmailTemplate) => {
    setSelectedTemplate(template)
    setTestEmail("")
    setIsTestEmailOpen(true)
  }, [])

  const handleSendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) return

    setIsSendingTest(true)
    try {
      const result = await sendTestEmailAction(selectedTemplate.slug, testEmail)
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
        setIsDialogOpen(false)
        router.refresh()
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
    const sampleData: Record<string, string> = {
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
      preview = preview.replace(new RegExp(`{{${tag}}}`, "g"), sampleData[tag] || `[${tag}]`)
    }
    return preview
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
              <Mail className="h-6 w-6 text-primary" />
              Email Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customize transactional email content
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates</CardTitle>
          <CardDescription>
            Edit email templates sent to patients. Use merge tags like {"{{patient_name}}"} for dynamic content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<Search className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <div className="grid gap-4">
            {filteredTemplates.map((template) => (
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
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Edit Email Template
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} ({selectedTemplate?.slug})
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>{selectedTemplate?.name}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="p-3 rounded-lg bg-muted mb-4">
              <p className="text-sm">
                <strong>Subject:</strong>{" "}
                {selectedTemplate && getPreviewHtml(selectedTemplate.subject, selectedTemplate.available_tags)}
              </p>
            </div>
            <div className="rounded-lg border p-4 bg-white max-h-[400px] overflow-y-auto">
              {selectedTemplate && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: getPreviewHtml(selectedTemplate.body_html, selectedTemplate.available_tags),
                  }}
                />
              )}
            </div>
          </div>
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
                The email will include a test banner and sample merge tag values.
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
