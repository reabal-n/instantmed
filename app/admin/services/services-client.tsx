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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  ArrowLeft,
  Search,
  DollarSign,
  Clock,
  Shield,
  Loader2,
  GripVertical,
  Power,
  PowerOff,
} from "lucide-react"
import { toast } from "sonner"
import {
  createServiceAction,
  updateServiceAction,
  toggleServiceActiveAction,
  deleteServiceAction,
} from "@/app/actions/admin-settings"
import type { Service, ServiceInput } from "@/lib/data/services"
import { getServiceTypes, formatPrice } from "@/lib/data/services"

interface ServicesConfigClientProps {
  initialServices: Service[]
}

const SERVICE_TYPES = getServiceTypes()

const EMPTY_SERVICE: ServiceInput = {
  slug: "",
  name: "",
  short_name: null,
  description: null,
  type: "med_certs",
  category: null,
  price_cents: 0,
  priority_fee_cents: null,
  is_active: false,
  requires_id_verification: false,
  requires_medicare: false,
  requires_photo: false,
  min_age: null,
  max_age: null,
  allowed_states: null,
  sla_standard_minutes: 1440,
  sla_priority_minutes: 240,
  eligibility_rules: {},
  icon_name: null,
  display_order: 0,
  badge_text: null,
  meta_title: null,
  meta_description: null,
}

export function ServicesConfigClient({ initialServices }: ServicesConfigClientProps) {
  const router = useRouter()
  const [services, setServices] = useState(initialServices)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)

  const [formData, setFormData] = useState<ServiceInput>(EMPTY_SERVICE)

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || service.type === typeFilter
    return matchesSearch && matchesType
  })

  const handleCreateNew = useCallback(() => {
    setFormData({
      ...EMPTY_SERVICE,
      display_order: services.length,
    })
    setEditingServiceId(null)
    setIsCreating(true)
    setIsDialogOpen(true)
  }, [services.length])

  const handleEditService = useCallback((service: Service) => {
    setFormData({
      slug: service.slug,
      name: service.name,
      short_name: service.short_name,
      description: service.description,
      type: service.type,
      category: service.category,
      price_cents: service.price_cents,
      priority_fee_cents: service.priority_fee_cents,
      is_active: service.is_active,
      requires_id_verification: service.requires_id_verification,
      requires_medicare: service.requires_medicare,
      requires_photo: service.requires_photo,
      min_age: service.min_age,
      max_age: service.max_age,
      allowed_states: service.allowed_states,
      sla_standard_minutes: service.sla_standard_minutes,
      sla_priority_minutes: service.sla_priority_minutes,
      eligibility_rules: service.eligibility_rules,
      icon_name: service.icon_name,
      display_order: service.display_order,
      badge_text: service.badge_text,
      meta_title: service.meta_title,
      meta_description: service.meta_description,
    })
    setEditingServiceId(service.id)
    setIsCreating(false)
    setIsDialogOpen(true)
  }, [])

  const handleInputChange = useCallback((field: keyof ServiceInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleToggleActive = async (service: Service) => {
    const newStatus = !service.is_active
    try {
      const result = await toggleServiceActiveAction(service.id, newStatus)
      if (result.success) {
        setServices(prev =>
          prev.map(s => (s.id === service.id ? { ...s, is_active: newStatus } : s))
        )
        toast.success(`Service ${newStatus ? "enabled" : "disabled"}`)
      } else {
        toast.error(result.error || "Failed to update service")
      }
    } catch {
      toast.error("Failed to update service")
    }
  }

  const handleDelete = async (service: Service) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Are you sure you want to delete "${service.name}"? This cannot be undone.`)) {
      return
    }

    try {
      const result = await deleteServiceAction(service.id)
      if (result.success) {
        setServices(prev => prev.filter(s => s.id !== service.id))
        toast.success("Service deleted")
      } else {
        toast.error(result.error || "Failed to delete service")
      }
    } catch {
      toast.error("Failed to delete service")
    }
  }

  const handleSave = async () => {
    // Validate required fields
    if (!formData.slug || !formData.name || !formData.type) {
      toast.error("Please fill in all required fields")
      return
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error("Slug must contain only lowercase letters, numbers, and hyphens")
      return
    }

    setIsSaving(true)
    try {
      if (isCreating) {
        const result = await createServiceAction(formData)
        if (result.success && result.data) {
          setServices(prev => [...prev, result.data!])
          toast.success("Service created successfully")
          setIsDialogOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || "Failed to create service")
        }
      } else if (editingServiceId) {
        const result = await updateServiceAction(editingServiceId, formData)
        if (result.success && result.data) {
          setServices(prev =>
            prev.map(s => (s.id === editingServiceId ? result.data! : s))
          )
          toast.success("Service updated successfully")
          setIsDialogOpen(false)
          router.refresh()
        } else {
          toast.error(result.error || "Failed to update service")
        }
      }
    } catch {
      toast.error("Failed to save service")
    } finally {
      setIsSaving(false)
    }
  }

  const getTypeLabel = (type: string) => {
    return SERVICE_TYPES.find(t => t.value === type)?.label || type
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
              <Settings className="h-6 w-6 text-primary" />
              Service Configuration
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage services, pricing, and eligibility rules
            </p>
          </div>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">{services.length}</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {services.filter(s => s.is_active).length}
                </p>
              </div>
              <Power className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {services.filter(s => !s.is_active).length}
                </p>
              </div>
              <PowerOff className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Price</p>
                <p className="text-2xl font-bold">
                  {formatPrice(
                    Math.round(
                      services.reduce((sum, s) => sum + s.price_cents, 0) / services.length || 0
                    )
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Services</CardTitle>
          <CardDescription>
            Configure available telehealth services and their settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {SERVICE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length > 0 ? (
                  filteredServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {service.slug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getTypeLabel(service.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatPrice(service.price_cents)}</p>
                          {service.priority_fee_cents && service.priority_fee_cents > 0 && (
                            <p className="text-xs text-muted-foreground">
                              +{formatPrice(service.priority_fee_cents)} priority
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {service.requires_id_verification && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              ID
                            </Badge>
                          )}
                          {service.requires_medicare && (
                            <Badge variant="outline" className="text-xs">Medicare</Badge>
                          )}
                          {service.min_age && (
                            <Badge variant="outline" className="text-xs">
                              {service.min_age}+ years
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={() => handleToggleActive(service)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditService(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(service)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No services found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {isCreating ? "Create New Service" : "Edit Service"}
            </DialogTitle>
            <DialogDescription>
              {isCreating
                ? "Add a new telehealth service to the platform"
                : `Editing: ${formData.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Basic Information
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Service Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Medical Certificate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short_name">Short Name</Label>
                  <Input
                    id="short_name"
                    value={formData.short_name || ""}
                    onChange={(e) => handleInputChange("short_name", e.target.value || null)}
                    placeholder="Med Cert"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="slug">
                    URL Slug <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    placeholder="medical-certificate"
                    className="font-mono"
                    disabled={!isCreating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in URLs: /services/{formData.slug || "slug"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">
                    Service Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange("type", value)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value || null)}
                  placeholder="Brief description of the service..."
                  className="min-h-[80px]"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Standard Price (AUD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={String((formData.price_cents / 100).toFixed(2))}
                      onChange={(e) => handleInputChange("price_cents", Math.round(parseFloat(e.target.value || "0") * 100))}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority_fee">Priority Fee (AUD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="priority_fee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(((formData.priority_fee_cents || 0) / 100).toFixed(2))}
                      onChange={(e) => handleInputChange("priority_fee_cents", Math.round(parseFloat(e.target.value || "0") * 100) || null)}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SLA */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Service Level Agreement
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sla_standard">Standard SLA (hours)</Label>
                  <Input
                    id="sla_standard"
                    type="number"
                    min="1"
                    value={String(Math.round((formData.sla_standard_minutes || 1440) / 60))}
                    onChange={(e) => handleInputChange("sla_standard_minutes", parseInt(e.target.value || "24") * 60)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sla_priority">Priority SLA (hours)</Label>
                  <Input
                    id="sla_priority"
                    type="number"
                    min="1"
                    value={String(Math.round((formData.sla_priority_minutes || 240) / 60))}
                    onChange={(e) => handleInputChange("sla_priority_minutes", parseInt(e.target.value || "4") * 60)}
                  />
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Requirements & Eligibility
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label htmlFor="requires_id" className="cursor-pointer">
                      Requires ID Verification
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Patient must verify identity
                    </p>
                  </div>
                  <Switch
                    id="requires_id"
                    checked={formData.requires_id_verification}
                    onCheckedChange={(checked) => handleInputChange("requires_id_verification", checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label htmlFor="requires_medicare" className="cursor-pointer">
                      Requires Medicare
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Patient must have Medicare
                    </p>
                  </div>
                  <Switch
                    id="requires_medicare"
                    checked={formData.requires_medicare}
                    onCheckedChange={(checked) => handleInputChange("requires_medicare", checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label htmlFor="requires_photo" className="cursor-pointer">
                      Requires Photo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Patient must upload photo
                    </p>
                  </div>
                  <Switch
                    id="requires_photo"
                    checked={formData.requires_photo}
                    onCheckedChange={(checked) => handleInputChange("requires_photo", checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Service Active
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Available to patients
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min_age">Minimum Age</Label>
                  <Input
                    id="min_age"
                    type="number"
                    min="0"
                    max="120"
                    value={formData.min_age !== null ? String(formData.min_age) : ""}
                    onChange={(e) => handleInputChange("min_age", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="No minimum"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_age">Maximum Age</Label>
                  <Input
                    id="max_age"
                    type="number"
                    min="0"
                    max="120"
                    value={formData.max_age !== null ? String(formData.max_age) : ""}
                    onChange={(e) => handleInputChange("max_age", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="No maximum"
                  />
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                Display Options
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    value={String(formData.display_order || 0)}
                    onChange={(e) => handleInputChange("display_order", parseInt(e.target.value || "0"))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_text">Badge Text</Label>
                  <Input
                    id="badge_text"
                    value={formData.badge_text || ""}
                    onChange={(e) => handleInputChange("badge_text", e.target.value || null)}
                    placeholder="Most Popular"
                  />
                </div>
              </div>
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
              {isCreating ? "Create Service" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
