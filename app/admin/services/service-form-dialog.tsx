"use client"

import {
  Clock,
  DollarSign,
  Loader2,
  Save,
  Settings,
  Shield,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { ServiceInput } from "@/lib/data/types/services"
import { getServiceTypes } from "@/lib/data/types/services"

const SERVICE_TYPES = getServiceTypes()

interface ServiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: ServiceInput
  onInputChange: (field: keyof ServiceInput, value: unknown) => void
  onSave: () => void
  isCreating: boolean
  isSaving: boolean
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  formData,
  onInputChange,
  onSave,
  isCreating,
  isSaving,
}: ServiceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  onChange={(e) => onInputChange("name", e.target.value)}
                  placeholder="Medical Certificate"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_name">Short Name</Label>
                <Input
                  id="short_name"
                  value={formData.short_name || ""}
                  onChange={(e) => onInputChange("short_name", e.target.value || null)}
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
                  onChange={(e) => onInputChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
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
                  onValueChange={(value) => onInputChange("type", value)}
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
                onChange={(e) => onInputChange("description", e.target.value || null)}
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
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={String((formData.price_cents / 100).toFixed(2))}
                  onChange={(e) => onInputChange("price_cents", Math.round(parseFloat(e.target.value || "0") * 100))}
                  startContent={<span className="text-muted-foreground">$</span>}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority_fee">Priority Fee (AUD)</Label>
                <Input
                  id="priority_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={String(((formData.priority_fee_cents || 0) / 100).toFixed(2))}
                  onChange={(e) => onInputChange("priority_fee_cents", Math.round(parseFloat(e.target.value || "0") * 100) || null)}
                  startContent={<span className="text-muted-foreground">$</span>}
                />
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
                  onChange={(e) => onInputChange("sla_standard_minutes", parseInt(e.target.value || "24") * 60)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sla_priority">Priority SLA (hours)</Label>
                <Input
                  id="sla_priority"
                  type="number"
                  min="1"
                  value={String(Math.round((formData.sla_priority_minutes || 240) / 60))}
                  onChange={(e) => onInputChange("sla_priority_minutes", parseInt(e.target.value || "4") * 60)}
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
                  onCheckedChange={(checked) => onInputChange("requires_id_verification", checked)}
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
                  onCheckedChange={(checked) => onInputChange("requires_medicare", checked)}
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
                  onCheckedChange={(checked) => onInputChange("requires_photo", checked)}
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
                  onCheckedChange={(checked) => onInputChange("is_active", checked)}
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
                  onChange={(e) => onInputChange("min_age", e.target.value ? parseInt(e.target.value) : null)}
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
                  onChange={(e) => onInputChange("max_age", e.target.value ? parseInt(e.target.value) : null)}
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
                  onChange={(e) => onInputChange("display_order", parseInt(e.target.value || "0"))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge_text">Badge Text</Label>
                <Input
                  id="badge_text"
                  value={formData.badge_text || ""}
                  onChange={(e) => onInputChange("badge_text", e.target.value || null)}
                  placeholder="Most Popular"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
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
  )
}
