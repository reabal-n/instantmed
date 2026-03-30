"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  Edit,
  Trash2,
  Search,
  DollarSign,
  Shield,
  Loader2,
  GripVertical,
  Power,
  PowerOff,
} from "lucide-react"
import type { Service } from "@/lib/data/types/services"
import { getServiceTypes, formatPrice } from "@/lib/data/types/services"

const SERVICE_TYPES = getServiceTypes()

function getTypeLabel(type: string) {
  return SERVICE_TYPES.find(t => t.value === type)?.label || type
}

interface ServicesStatsProps {
  services: Service[]
}

export function ServicesStats({ services }: ServicesStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Services</p>
              <p className="text-2xl font-semibold">{services.length}</p>
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
              <p className="text-2xl font-semibold text-success">
                {services.filter(s => s.is_active).length}
              </p>
            </div>
            <Power className="h-8 w-8 text-success/50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-semibold text-muted-foreground">
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
              <p className="text-2xl font-semibold">
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
  )
}

interface ServicesTableCardProps {
  services: Service[]
  searchQuery: string
  onSearchChange: (query: string) => void
  typeFilter: string
  onTypeFilterChange: (type: string) => void
  filteredServices: Service[]
  onEditService: (service: Service) => void
  onToggleActive: (service: Service) => void
  onDelete: (service: Service) => void
}

export function ServicesTableCard({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  filteredServices,
  onEditService,
  onToggleActive,
  onDelete,
}: ServicesTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Services</CardTitle>
        <CardDescription>
          Configure available telehealth services and their settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              startContent={<Search className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
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
                        onCheckedChange={() => onToggleActive(service)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditService(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(service)}
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
  )
}

interface ToggleConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  isToggling: boolean
  onConfirm: () => void
}

export function ToggleConfirmDialog({
  open,
  onOpenChange,
  service,
  isToggling,
  onConfirm,
}: ToggleConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {service?.is_active ? (
              <PowerOff className="h-5 w-5 text-destructive" />
            ) : (
              <Power className="h-5 w-5 text-success" />
            )}
            {service?.is_active ? "Disable Service" : "Enable Service"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {service?.is_active ? (
              <>
                This will <strong>immediately disable</strong> &quot;{service?.name}&quot; for all patients.
                No new requests can be submitted until re-enabled.
              </>
            ) : (
              <>
                This will <strong>enable</strong> &quot;{service?.name}&quot; and make it available to patients immediately.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isToggling}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isToggling}
            className={service?.is_active ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {isToggling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : service?.is_active ? (
              <PowerOff className="h-4 w-4 mr-2" />
            ) : (
              <Power className="h-4 w-4 mr-2" />
            )}
            {service?.is_active ? "Disable Service" : "Enable Service"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
