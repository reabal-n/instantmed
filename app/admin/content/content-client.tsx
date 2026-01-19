"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Edit,
  Plus,
  Save,
  ArrowLeft,
  Search,
  Trash2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  createContentBlockAction,
  updateContentBlockAction,
  deleteContentBlockAction,
} from "@/app/actions/admin-config"
import type { ContentBlock, ContentBlockInput } from "@/lib/data/types/content-blocks"
import { getContentCategories } from "@/lib/data/types/content-blocks"

interface ContentBlocksClientProps {
  initialBlocks: ContentBlock[]
}

const CATEGORIES = getContentCategories()

export function ContentBlocksClient({ initialBlocks }: ContentBlocksClientProps) {
  const router = useRouter()
  const [blocks, setBlocks] = useState(initialBlocks)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedBlock, setSelectedBlock] = useState<ContentBlock | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState<ContentBlockInput>({
    key: "",
    name: "",
    description: "",
    category: "general",
    content: "",
    content_type: "text",
    context: "",
  })

  const filteredBlocks = blocks.filter((block) => {
    const matchesSearch =
      block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || block.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Group by category
  const groupedBlocks = filteredBlocks.reduce((acc, block) => {
    const category = block.category || "general"
    if (!acc[category]) acc[category] = []
    acc[category].push(block)
    return acc
  }, {} as Record<string, ContentBlock[]>)

  const handleCreateNew = useCallback(() => {
    setFormData({
      key: "",
      name: "",
      description: "",
      category: "general",
      content: "",
      content_type: "text",
      context: "",
    })
    setSelectedBlock(null)
    setIsCreating(true)
    setIsDialogOpen(true)
  }, [])

  const handleEditBlock = useCallback((block: ContentBlock) => {
    setSelectedBlock(block)
    setFormData({
      key: block.key,
      name: block.name,
      description: block.description || "",
      category: block.category,
      content: block.content,
      content_type: block.content_type,
      context: block.context || "",
    })
    setIsCreating(false)
    setIsDialogOpen(true)
  }, [])

  const handleDelete = async (block: ContentBlock) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${block.name}"? This cannot be undone.`)) return

    try {
      const result = await deleteContentBlockAction(block.id)
      if (result.success) {
        setBlocks(prev => prev.filter(b => b.id !== block.id))
        toast.success("Content block deleted")
      } else {
        toast.error(result.error || "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    }
  }

  const handleSave = async () => {
    if (!formData.key || !formData.name || !formData.content) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!/^[a-z0-9_]+$/.test(formData.key)) {
      toast.error("Key must be lowercase letters, numbers, and underscores only")
      return
    }

    setIsSaving(true)
    try {
      if (isCreating) {
        const result = await createContentBlockAction(formData)
        if (result.success && result.data) {
          setBlocks(prev => [...prev, result.data!])
          toast.success("Content block created")
          setIsDialogOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || "Failed to create")
        }
      } else if (selectedBlock) {
        const result = await updateContentBlockAction(selectedBlock.id, formData)
        if (result.success && result.data) {
          setBlocks(prev => prev.map(b => (b.id === selectedBlock.id ? result.data! : b)))
          toast.success("Content block updated")
          setIsDialogOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || "Failed to update")
        }
      }
    } catch {
      toast.error("Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value
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
              <FileText className="h-6 w-6 text-primary" />
              Content Editor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage microcopy and content snippets
            </p>
          </div>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Content
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Blocks</CardTitle>
          <CardDescription>
            Edit text content used across the platform without code changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {Object.entries(groupedBlocks).map(([category, categoryBlocks]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {getCategoryLabel(category)}
              </h3>
              <div className="space-y-3">
                {categoryBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{block.name}</h4>
                          <Badge variant="outline" className="font-mono text-xs">
                            {block.key}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {block.content}
                        </p>
                        {block.context && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Used in: {block.context}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBlock(block)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(block)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredBlocks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No content blocks found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isCreating ? "Create Content Block" : "Edit Content Block"}
            </DialogTitle>
            <DialogDescription>
              {isCreating ? "Add new content to the platform" : `Editing: ${selectedBlock?.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Safety Warning"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">
                  Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                  placeholder="safety_warning"
                  className="font-mono"
                  disabled={!isCreating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the content text..."
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Context (where this is used)</Label>
              <Input
                id="context"
                value={formData.context || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value }))}
                placeholder="e.g., Safety screening page header"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isCreating ? "Create" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
