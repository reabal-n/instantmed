"use client"

import { ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback,useState } from "react"
import { toast } from "sonner"

import {
  toggleServiceActiveAction,
  updateServiceAction,
} from "@/app/actions/admin-settings"
import { ServiceFormDialog } from "@/app/admin/services/service-form-dialog"
import { ServicesStats, ServicesTableCard, ToggleConfirmDialog } from "@/app/admin/services/services-table"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { STAFF_SETTINGS_HREF } from "@/lib/dashboard/routes"
import type { Service, ServiceInput } from "@/lib/data/types/services"

interface ServicesConfigClientProps {
  initialServices: Service[]
}

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
  const [isSaving, setIsSaving] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)

  // Confirmation dialog state for kill switch toggle
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false)
  const [serviceToToggle, setServiceToToggle] = useState<Service | null>(null)
  const [isToggling, setIsToggling] = useState(false)

  const [formData, setFormData] = useState<ServiceInput>(EMPTY_SERVICE)

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || service.type === typeFilter
    return matchesSearch && matchesType
  })

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
    setIsDialogOpen(true)
  }, [])

  const handleInputChange = useCallback((field: keyof ServiceInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Show confirmation dialog before toggling kill switch
  const handleToggleActive = (service: Service) => {
    setServiceToToggle(service)
    setToggleConfirmOpen(true)
  }

  // Confirmed toggle action
  const confirmToggleActive = async () => {
    if (!serviceToToggle) return

    const newStatus = !serviceToToggle.is_active
    setIsToggling(true)
    try {
      const result = await toggleServiceActiveAction(serviceToToggle.id, newStatus)
      if (result.success) {
        setServices(prev =>
          prev.map(s => (s.id === serviceToToggle.id ? { ...s, is_active: newStatus } : s))
        )
        toast.success(`Service ${newStatus ? "enabled" : "disabled"}`)
        setToggleConfirmOpen(false)
        setServiceToToggle(null)
      } else {
        toast.error(result.error || "Failed to update service")
      }
    } catch {
      toast.error("Failed to update service")
    } finally {
      setIsToggling(false)
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
      if (editingServiceId) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={STAFF_SETTINGS_HREF}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <Heading level="h1" className="!text-2xl flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Service Configuration
            </Heading>
            <p className="text-sm text-muted-foreground mt-1">
              Manage services, pricing, and eligibility rules
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <ServicesStats services={services} />

      {/* Search and Table */}
      <ServicesTableCard
        services={services}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        filteredServices={filteredServices}
        onEditService={handleEditService}
        onToggleActive={handleToggleActive}
        isToggling={isToggling}
      />

      {/* Edit Dialog */}
      <ServiceFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        formData={formData}
        onInputChange={handleInputChange}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Kill Switch Confirmation Dialog */}
      <ToggleConfirmDialog
        open={toggleConfirmOpen}
        onOpenChange={setToggleConfirmOpen}
        service={serviceToToggle}
        isToggling={isToggling}
        onConfirm={confirmToggleActive}
      />
    </div>
  )
}
