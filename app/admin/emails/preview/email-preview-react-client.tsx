"use client"

import { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Monitor,
  Smartphone,
  RefreshCw,
  Eye,
  Code,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import {
  sendAdminTestEmailAction,
  getAdminEmailTemplatesAction,
  getAdminTemplateSampleDataAction,
  previewAdminEmailTemplateAction,
} from "@/app/actions/admin-email-preview"

export function EmailPreviewReactClient() {
  const [templates, setTemplates] = useState<Array<{ slug: string; name: string; availableTags: string[] }>>([])
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview")
  const [testEmail, setTestEmail] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [sampleData, setSampleData] = useState<Record<string, unknown>>({})
  const [customData, setCustomData] = useState<Record<string, unknown>>({})
  const [previewHtml, setPreviewHtml] = useState("")
  const [previewSubject, setPreviewSubject] = useState("")
  const [error, setError] = useState("")

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const result = await getAdminEmailTemplatesAction()
        if (result.success && result.templates) {
          setTemplates(result.templates)
          if (result.templates.length > 0) {
            setSelectedTemplate(result.templates[0].slug)
          }
        } else {
          setError(result.error || "Failed to load templates")
        }
      } catch (err) {
        setError("Failed to load templates")
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplates()
  }, [])

  // Load sample data when template changes
  useEffect(() => {
    if (!selectedTemplate) return

    const loadSampleData = async () => {
      try {
        const result = await getAdminTemplateSampleDataAction(selectedTemplate)
        if (result.success && result.sampleData) {
          setSampleData(result.sampleData)
          setCustomData(result.sampleData)
        } else {
          setError(result.error || "Failed to load sample data")
        }
      } catch (err) {
        setError("Failed to load sample data")
      }
    }

    loadSampleData()
  }, [selectedTemplate])

  // Generate preview when template or data changes
  useEffect(() => {
    if (!selectedTemplate) return

    const generatePreview = async () => {
      setIsPreviewLoading(true)
      setError("")
      
      try {
        const result = await previewAdminEmailTemplateAction(selectedTemplate, customData as Record<string, string>)
        if (result.success && result.html && result.subject) {
          setPreviewHtml(result.html)
          setPreviewSubject(result.subject)
        } else {
          setError(result.error || "Failed to generate preview")
        }
      } catch (err) {
        setError("Failed to generate preview")
      } finally {
        setIsPreviewLoading(false)
      }
    }

    generatePreview()
  }, [selectedTemplate, customData])

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }

    setIsSending(true)
    try {
      const result = await sendAdminTestEmailAction(selectedTemplate, testEmail, customData as Record<string, string>)
      if (result.success) {
        toast.success(`Test email sent to ${testEmail}`)
      } else {
        toast.error(result.error || "Failed to send test email")
      }
    } catch {
      toast.error("Failed to send test email")
    } finally {
      setIsSending(false)
    }
  }

  const currentTemplate = templates.find((t) => t.slug === selectedTemplate)

  const updateCustomData = (key: string, value: string) => {
    setCustomData(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">React Template</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.slug} value={template.slug}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentTemplate && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {currentTemplate.slug}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Template Data</CardTitle>
            <CardDescription className="text-xs">
              Edit to preview with different values
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {currentTemplate?.availableTags.map((tag) => (
              <div key={tag}>
                <Label className="text-xs">{tag}</Label>
                <Input
                  value={(customData[tag] as string) || ""}
                  onChange={(e) => updateCustomData(tag, e.target.value)}
                  className="h-8 text-sm"
                  placeholder={`{{${tag}}}`}
                />
              </div>
            ))}
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
              disabled={isSending || !testEmail}
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
            <CardTitle>React Template Preview</CardTitle>
            <CardDescription>{currentTemplate?.name}</CardDescription>
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
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive mb-4">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          <div className="p-3 rounded-lg bg-muted/50 border mb-4">
            <p className="text-sm text-muted-foreground">Subject</p>
            <p className="text-base font-medium">{previewSubject}</p>
          </div>

          <div
            className={`border rounded-lg overflow-hidden bg-gray-100 mx-auto transition-all ${
              previewMode === "mobile" ? "max-w-[375px]" : "max-w-full"
            }`}
          >
            {isPreviewLoading ? (
              <div className="flex items-center justify-center h-[600px]">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : viewMode === "preview" ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[600px] bg-white"
                title="Email Preview"
              />
            ) : (
              <pre className="p-4 text-xs overflow-auto h-[600px] bg-gray-900 text-gray-100">
                {previewHtml}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
