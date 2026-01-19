"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  Edit,
  Upload,
  Save,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Stethoscope,
  FileSignature,
} from "lucide-react"
import { toast } from "sonner"
import {
  updateDoctorIdentityAction,
  uploadDoctorSignatureAction,
  getSignatureUrlAction,
} from "@/app/actions/admin-settings"
import type { DoctorIdentityInput } from "@/lib/data/doctor-identity.shared"
import {
  validateProviderNumber,
  validateAhpraNumber,
} from "@/lib/data/doctor-identity.shared"

interface DoctorProfile {
  id: string
  full_name: string
  email: string
  role: string
  nominals: string | null
  provider_number: string | null
  ahpra_number: string | null
  signature_storage_path: string | null
  certificate_identity_complete: boolean
  is_active: boolean
  created_at: string
}

interface DoctorProfilesClientProps {
  initialDoctors: DoctorProfile[]
}

export function DoctorProfilesClient({ initialDoctors }: DoctorProfilesClientProps) {
  const router = useRouter()
  const [doctors, setDoctors] = useState(initialDoctors)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)

  // Form state for editing
  const [formData, setFormData] = useState<DoctorIdentityInput>({
    nominals: null,
    provider_number: null,
    ahpra_number: null,
    signature_storage_path: null,
  })

  const filteredDoctors = doctors.filter(
    (doctor) =>
      doctor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.provider_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditDoctor = useCallback(async (doctor: DoctorProfile) => {
    setSelectedDoctor(doctor)
    setFormData({
      nominals: doctor.nominals,
      provider_number: doctor.provider_number,
      ahpra_number: doctor.ahpra_number,
      signature_storage_path: doctor.signature_storage_path,
    })

    // Load signature URL if exists
    if (doctor.signature_storage_path) {
      const url = await getSignatureUrlAction(doctor.signature_storage_path)
      setSignatureUrl(url)
    } else {
      setSignatureUrl(null)
    }

    setIsDialogOpen(true)
  }, [])

  const handleInputChange = useCallback((field: keyof DoctorIdentityInput, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedDoctor) return

    const allowedTypes = ["image/png", "image/jpeg"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please use PNG or JPG.")
      return
    }

    if (file.size > 1 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 1MB.")
      return
    }

    setIsUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", file)

      const result = await uploadDoctorSignatureAction(selectedDoctor.id, formDataUpload)

      if (result.success && result.path) {
        setFormData(prev => ({ ...prev, signature_storage_path: result.path! }))
        setSignatureUrl(URL.createObjectURL(file))
        toast.success("Signature uploaded successfully")
      } else {
        toast.error(result.error || "Failed to upload signature")
      }
    } catch {
      toast.error("Failed to upload signature")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedDoctor) return

    // Validate provider number
    if (formData.provider_number) {
      const providerValidation = validateProviderNumber(formData.provider_number)
      if (!providerValidation.valid) {
        toast.error(providerValidation.error)
        return
      }
    }

    // Validate AHPRA number
    if (formData.ahpra_number) {
      const ahpraValidation = validateAhpraNumber(formData.ahpra_number)
      if (!ahpraValidation.valid) {
        toast.error(ahpraValidation.error)
        return
      }
    }

    setIsSaving(true)
    try {
      const result = await updateDoctorIdentityAction(selectedDoctor.id, formData)

      if (result.success && result.data) {
        // Update local state
        setDoctors(prev =>
          prev.map(d =>
            d.id === selectedDoctor.id
              ? {
                  ...d,
                  nominals: result.data!.nominals,
                  provider_number: result.data!.provider_number,
                  ahpra_number: result.data!.ahpra_number,
                  signature_storage_path: result.data!.signature_storage_path,
                  certificate_identity_complete: result.data!.certificate_identity_complete,
                }
              : d
          )
        )
        toast.success("Doctor profile updated successfully")
        setIsDialogOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update profile")
      }
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
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
              <Users className="h-6 w-6 text-primary" />
              Doctor Profiles
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage practitioner credentials and certificate identity
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Practitioners</p>
                <p className="text-2xl font-bold">{doctors.length}</p>
              </div>
              <Stethoscope className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Complete Profiles</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {doctors.filter(d => d.certificate_identity_complete).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Incomplete Profiles</p>
                <p className="text-2xl font-bold text-amber-600">
                  {doctors.filter(d => !d.certificate_identity_complete).length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practitioners</CardTitle>
          <CardDescription>
            Click on a practitioner to edit their certificate credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or provider number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Practitioner</TableHead>
                  <TableHead>Provider Number</TableHead>
                  <TableHead>AHPRA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.length > 0 ? (
                  filteredDoctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10">
                              {getInitials(doctor.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{doctor.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doctor.nominals || doctor.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {doctor.provider_number || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {doctor.ahpra_number || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {doctor.certificate_identity_complete ? (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Incomplete
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditDoctor(doctor)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No practitioners found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Edit Practitioner Profile
            </DialogTitle>
            <DialogDescription>
              {selectedDoctor?.full_name} - Certificate identity credentials
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nominals">Nominals / Qualifications</Label>
              <Input
                id="nominals"
                value={formData.nominals || ""}
                onChange={(e) => handleInputChange("nominals", e.target.value || null)}
                placeholder="MBBS, FRACGP"
              />
              <p className="text-xs text-muted-foreground">
                Professional qualifications shown after name on certificates
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider_number">Medicare Provider Number</Label>
              <Input
                id="provider_number"
                value={formData.provider_number || ""}
                onChange={(e) => handleInputChange("provider_number", e.target.value?.toUpperCase() || null)}
                placeholder="2426577L"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                6-7 digits followed by a letter (e.g., 2426577L)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ahpra_number">AHPRA Registration Number</Label>
              <Input
                id="ahpra_number"
                value={formData.ahpra_number || ""}
                onChange={(e) => handleInputChange("ahpra_number", e.target.value?.toUpperCase() || null)}
                placeholder="MED0002576546"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                3 letters + 10 digits (e.g., MED0002576546)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Signature Image</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-40 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden">
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Signature"
                      className="max-h-full max-w-full object-contain p-2"
                    />
                  ) : (
                    <FileSignature className="h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleSignatureUpload}
                    disabled={isUploading}
                    className="hidden"
                    id="signature-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("signature-upload")?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG or JPG, max 1MB
                  </p>
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
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
