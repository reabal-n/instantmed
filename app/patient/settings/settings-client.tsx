"use client"

import {
  ArrowRight,
  Bell,
  CheckCircle,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Save,
  User,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { changePassword, deleteAccount } from "@/app/actions/account"
import { type EmailPreferences,updateEmailPreferences } from "@/app/actions/email-preferences"
import { exportPatientData } from "@/app/actions/export-data"
import { setProfileAvatarPresetAction } from "@/app/actions/profile-avatar"
import { updateMedicareAction } from "@/app/actions/profile-todo"
import { GoogleAccountLinkCard } from "@/components/account/google-account-link-card"
import { DashboardCard, DashboardPageHeader } from "@/components/dashboard"
import { MedicareCapture } from "@/components/intake/medicare-capture"
import { ProfileAvatarUpload } from "@/components/settings/profile-avatar-upload"
import { AddressAutocomplete, type AddressComponents } from "@/components/ui/address-autocomplete"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AvatarPicker } from "@/components/ui/avatar-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAvatarPresetId } from "@/lib/account/avatar-presets"
import { AUSTRALIAN_STATES } from "@/lib/constants"
import { buildPatientSettingsHref,PATIENT_HEALTH_PROFILE_HREF } from "@/lib/dashboard/routes"
import { fetchWithCsrf } from "@/lib/security/csrf-client"
import { useAuth } from "@/lib/supabase/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { formatMedicareNumber } from "@/lib/validation/medicare"
import type { Profile } from "@/types/db"

interface PatientSettingsClientProps {
  profile: Profile
  email: string
  avatarUrl?: string | null
  emailPreferences?: EmailPreferences | null
}

type SettingsTab = "personal" | "medical" | "preferences"
const VALID_TABS: readonly SettingsTab[] = ["personal", "medical", "preferences"] as const

function serializeSettingsPart(value: unknown): string {
  return JSON.stringify(value)
}

function expiryToMmYy(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear()).slice(-2)
  return `${month}/${year}`
}

export function PatientSettingsClient({ profile, email, avatarUrl, emailPreferences }: PatientSettingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const requestedTab = searchParams?.get("tab")
  const initialTab: SettingsTab =
    requestedTab && (VALID_TABS as readonly string[]).includes(requestedTab)
      ? (requestedTab as SettingsTab)
      : "personal"
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isExportingData, setIsExportingData] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isSavingEmailPrefs, setIsSavingEmailPrefs] = useState(false)
  const [isSavingMedicare, setIsSavingMedicare] = useState(false)
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState(avatarUrl || profile.avatar_url || null)
  const [isSavingAvatarPreset, setIsSavingAvatarPreset] = useState(false)

  const initialMedicareForm = useMemo(() => ({
    number: profile.medicare_number ? formatMedicareNumber(profile.medicare_number.replace(/\s/g, "")) : "",
    irn: profile.medicare_irn as number | null,
    expiry: expiryToMmYy(profile.medicare_expiry),
  }), [profile.medicare_expiry, profile.medicare_irn, profile.medicare_number])

  const initialEmailPrefs = useMemo(() => ({
    marketing_emails: emailPreferences?.marketing_emails ?? true,
    abandoned_checkout_emails: emailPreferences?.abandoned_checkout_emails ?? true,
  }), [emailPreferences?.abandoned_checkout_emails, emailPreferences?.marketing_emails])

  const initialFormData = useMemo(() => ({
    full_name: profile.full_name,
    phone: profile.phone || "",
    date_of_birth: profile.date_of_birth || "",
    address_line1: profile.address_line1 || "",
    suburb: profile.suburb || "",
    state: profile.state || "",
    postcode: profile.postcode || "",
  }), [
    profile.address_line1,
    profile.date_of_birth,
    profile.full_name,
    profile.phone,
    profile.postcode,
    profile.state,
    profile.suburb,
  ])

  const [accountEmail, setAccountEmail] = useState(email)
  const [pendingAccountEmail, setPendingAccountEmail] = useState<string | null>(null)
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [medicareForm, setMedicareForm] = useState(initialMedicareForm)
  const [consentMyhr, setConsentMyhr] = useState(profile.consent_myhr ?? false)

  const [emailPrefs, setEmailPrefs] = useState(initialEmailPrefs)

  const [formData, setFormData] = useState(initialFormData)

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const personalSnapshot = serializeSettingsPart(formData)
  const medicalSnapshot = serializeSettingsPart({ medicareForm, consentMyhr })
  const emailPrefsSnapshot = serializeSettingsPart(emailPrefs)
  const savedPersonalSnapshotRef = useRef(serializeSettingsPart(initialFormData))
  const savedMedicalSnapshotRef = useRef(serializeSettingsPart({
    medicareForm: initialMedicareForm,
    consentMyhr: profile.consent_myhr ?? false,
  }))
  const savedEmailPrefsSnapshotRef = useRef(serializeSettingsPart(initialEmailPrefs))
  const savedAccountEmailRef = useRef(email)
  const patientSettingsDirty =
    personalSnapshot !== savedPersonalSnapshotRef.current ||
    medicalSnapshot !== savedMedicalSnapshotRef.current ||
    emailPrefsSnapshot !== savedEmailPrefsSnapshotRef.current ||
    accountEmail.trim().toLowerCase() !== savedAccountEmailRef.current.toLowerCase()

  useEffect(() => {
    savedPersonalSnapshotRef.current = serializeSettingsPart(initialFormData)
  }, [initialFormData])

  useEffect(() => {
    savedMedicalSnapshotRef.current = serializeSettingsPart({
      medicareForm: initialMedicareForm,
      consentMyhr: profile.consent_myhr ?? false,
    })
  }, [initialMedicareForm, profile.consent_myhr])

  useEffect(() => {
    savedEmailPrefsSnapshotRef.current = serializeSettingsPart(initialEmailPrefs)
  }, [initialEmailPrefs])

  useEffect(() => {
    savedAccountEmailRef.current = email
    setAccountEmail(email)
    setPendingAccountEmail((pendingEmail) =>
      pendingEmail && pendingEmail.toLowerCase() === email.toLowerCase() ? null : pendingEmail
    )
  }, [email])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!patientSettingsDirty) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [patientSettingsDirty])

  const linkedAuthProviders = useMemo(() => {
    const providers = new Set<string>()
    const appProviders = user?.app_metadata?.providers
    if (Array.isArray(appProviders)) {
      appProviders.forEach((provider) => {
        if (typeof provider === "string") providers.add(provider)
      })
    }
    user?.identities?.forEach((identity) => {
      if (identity.provider) providers.add(identity.provider)
    })
    if (providers.size === 0 && email) providers.add("email")
    return Array.from(providers).sort()
  }, [email, user?.app_metadata?.providers, user?.identities])

  const googleLinked = linkedAuthProviders.includes("google")
  // A Google-/OAuth-only account has no email+password identity, so it has no
  // "current password" to confirm. Offer a no-current-password "Set a password"
  // flow so these users can add email/password sign-in alongside Google.
  const hasPasswordLogin = linkedAuthProviders.includes("email")
  const linkedProviderLabels = linkedAuthProviders.map((provider) =>
    provider === "email"
      ? "Email"
      : provider === "google"
        ? "Google"
        : provider.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  )
  const lastSignInLabel = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString("en-AU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not recorded"

  const patientSettingsCompletionItems = [
    { label: "Phone", complete: formData.phone.trim() !== "" },
    { label: "Date of birth", complete: formData.date_of_birth.trim() !== "" },
    {
      label: "Home address",
      complete:
        formData.address_line1.trim() !== "" &&
        formData.suburb.trim() !== "" &&
        formData.state.trim() !== "" &&
        formData.postcode.trim() !== "",
    },
    { label: "Medicare", complete: medicareForm.number.replace(/\s/g, "").length === 10 },
    { label: "Google sign-in", complete: googleLinked },
  ]
  const patientSettingsCompletionCount = patientSettingsCompletionItems.filter((item) => item.complete).length

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetchWithCsrf("/api/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to update")
      toast.success("Profile updated successfully")
      savedPersonalSnapshotRef.current = personalSnapshot
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarPresetSelect = async (avatarId: number) => {
    setIsSavingAvatarPreset(true)
    try {
      const result = await setProfileAvatarPresetAction(avatarId)
      if (!result.success || !result.avatarUrl) {
        toast.error(result.error || "Could not save avatar")
        return
      }
      setAvatarDisplayUrl(result.avatarUrl)
      toast.success("Avatar saved")
      router.refresh()
    } catch {
      toast.error("Could not save avatar")
    } finally {
      setIsSavingAvatarPreset(false)
    }
  }

  const handleEmailChange = async () => {
    const nextEmail = accountEmail.trim().toLowerCase()
    if (!nextEmail || !nextEmail.includes("@")) {
      toast.error("Enter a valid email address")
      return
    }

    if (nextEmail === savedAccountEmailRef.current) return

    setIsUpdatingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: nextEmail })
      if (error) {
        toast.error(error.message || "Failed to update email")
        return
      }

      savedAccountEmailRef.current = nextEmail
      setAccountEmail(nextEmail)
      setPendingAccountEmail(nextEmail)
      toast.success("Email changes need confirmation. Check your inbox to finish the change.")
    } catch {
      toast.error("Failed to update email")
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  const handleSaveMedicare = async () => {
    const rawNumber = medicareForm.number.replace(/\s/g, "")
    const hasNumber = rawNumber.length === 10

    // Convert MM/YY to YYYY-MM-01
    let expiryIso: string | null = null
    if (medicareForm.expiry.length === 5) {
      const [mm, yy] = medicareForm.expiry.split("/")
      if (mm && yy) {
        expiryIso = `20${yy}-${mm}-01`
      }
    }

    setIsSavingMedicare(true)
    try {
      const result = await updateMedicareAction(profile.id, {
        medicareNumber: hasNumber ? rawNumber : null,
        medicareIrn: medicareForm.irn,
        medicareExpiry: expiryIso,
        consentMyhr,
      })
      if (result.success) {
        toast.success("Medicare details saved")
        savedMedicalSnapshotRef.current = medicalSnapshot
        router.refresh()
      } else {
        toast.error(result.error || "Failed to save Medicare details")
      }
    } catch {
      toast.error("Failed to save Medicare details")
    } finally {
      setIsSavingMedicare(false)
    }
  }

  const handleSaveEmailPreferences = async () => {
    setIsSavingEmailPrefs(true)
    try {
      const result = await updateEmailPreferences(emailPrefs)
      if (result.success) {
        toast.success("Email preferences saved")
        savedEmailPrefsSnapshotRef.current = emailPrefsSnapshot
      } else {
        toast.error(result.error || "Failed to save email preferences")
      }
    } catch {
      toast.error("Failed to save email preferences")
    } finally {
      setIsSavingEmailPrefs(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword)
      if (result.success) {
        toast.success("Password changed successfully")
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        toast.error(result.error || "Failed to change password")
      }
    } catch {
      toast.error("Failed to change password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Set a password on an OAuth-only account (no current password to confirm).
  // updateUser adds the email/password identity for the already-authenticated user.
  const handleSetPassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword })
      if (error) {
        toast.error(error.message || "Failed to set password")
      } else {
        toast.success("Password set — you can now sign in with email and password too.")
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      }
    } catch {
      toast.error("Failed to set password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleExportData = async () => {
    setIsExportingData(true)
    try {
      const result = await exportPatientData()
      if (result.success && result.data) {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `instantmed-data-export-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Data exported successfully")
      } else {
        toast.error(result.error || "Failed to export data")
      }
    } catch {
      toast.error("Failed to export data. Please try again.")
    } finally {
      setIsExportingData(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      const result = await deleteAccount()
      if (result.success) {
        toast.success("Account closed successfully")
        router.push("/")
      } else {
        toast.error(result.error || "Failed to close account")
      }
    } catch {
      toast.error("Failed to close account")
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className="space-y-10">
      <DashboardPageHeader
        title="Settings"
        description="Manage your profile and preferences"
      />

      {patientSettingsDirty && (
        <div className="inline-flex items-center gap-2 rounded-full border border-warning-border bg-warning-light px-3 py-1.5 text-xs font-medium text-warning">
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Unsaved settings changes
        </div>
      )}

      <DashboardCard tier="standard" padding="none" className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Account completion</h2>
            <p className="text-xs text-muted-foreground">
              The basics that keep requests, scripts, and account recovery smooth.
            </p>
          </div>
          <Badge
            variant={patientSettingsCompletionCount === patientSettingsCompletionItems.length ? "success" : "warning"}
            shape="pill"
          >
            {patientSettingsCompletionCount}/{patientSettingsCompletionItems.length} ready
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {patientSettingsCompletionItems.map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                item.complete
                  ? "border-success-border bg-success-light text-success"
                  : "border-border bg-muted/50 text-muted-foreground"
              }`}
            >
              {item.complete && <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />}
              {item.label}
            </span>
          ))}
        </div>
      </DashboardCard>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)}>
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="personal" className="flex-1 gap-2">
            <User className="w-4 h-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="medical" className="flex-1 gap-2">
            <CreditCard className="w-4 h-4" />
            Medical
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex-1 gap-2">
            <Bell className="w-4 h-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <ProfileAvatarUpload
                userName={formData.full_name || "Me"}
                avatarUrl={avatarDisplayUrl}
                onUploaded={(avatar) => setAvatarDisplayUrl(avatar.avatarUrl || avatar.avatarValue)}
              />
              <AvatarPicker
                selectedAvatarId={getAvatarPresetId(avatarDisplayUrl)}
                customAvatarUrl={getAvatarPresetId(avatarDisplayUrl) ? null : avatarDisplayUrl}
                userName={formData.full_name || "Me"}
                onSelect={(avatarId) => void handleAvatarPresetSelect(avatarId)}
              />
              {isSavingAvatarPreset && (
                <p className="text-center text-xs text-muted-foreground">Saving avatar...</p>
              )}
            </div>

            {/* Personal Information */}
            <DashboardCard tier="elevated" padding="none" className="p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-5">Personal Information</h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                      className="rounded-xl bg-white dark:bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="email"
                        type="email"
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        className="rounded-xl bg-white dark:bg-card"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleEmailChange}
                        disabled={isUpdatingEmail || accountEmail.trim().toLowerCase() === savedAccountEmailRef.current}
                        className="rounded-xl sm:w-auto"
                      >
                        {isUpdatingEmail ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update email"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email changes need confirmation before sign-in moves across.
                    </p>
                    {pendingAccountEmail && (
                      <div className="rounded-xl border border-info-border bg-info-light/40 px-3 py-2 text-xs text-info">
                        <p className="font-medium">Email change pending</p>
                        <p>Check that inbox to confirm: {pendingAccountEmail}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="04XX XXX XXX"
                      className="rounded-xl bg-white dark:bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.date_of_birth ? formData.date_of_birth.split("T")[0] : ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                      className="rounded-xl bg-white dark:bg-card"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="rounded-xl">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </DashboardCard>

            <DashboardCard tier="elevated" padding="none" className="p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-5">Home Address</h3>
              <p className="text-sm text-muted-foreground mb-5">
                This address is used for sending physical documents if required.
              </p>
              <div className="grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <AddressAutocomplete
                    id="street"
                    value={formData.address_line1}
                    onChange={(value) => setFormData((prev) => ({ ...prev, address_line1: value }))}
                    onAddressSelect={(address: AddressComponents) =>
                      setFormData((prev) => ({
                        ...prev,
                        address_line1: address.addressLine1 || address.fullAddress,
                        suburb: address.suburb || prev.suburb,
                        state: address.state || prev.state,
                        postcode: address.postcode || prev.postcode,
                      }))
                    }
                    className="rounded-xl bg-white dark:bg-card"
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="suburb">Suburb</Label>
                    <Input
                      id="suburb"
                      value={formData.suburb}
                      onChange={(e) => setFormData((prev) => ({ ...prev, suburb: e.target.value }))}
                      className="rounded-xl bg-white dark:bg-card"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, state: value }))}
                    >
                      <SelectTrigger id="state" className="rounded-xl bg-white dark:bg-card">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {AUSTRALIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      value={formData.postcode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, postcode: e.target.value }))}
                      className="rounded-xl bg-white dark:bg-card"
                    />
                  </div>
                </div>
              </div>
            </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="rounded-xl">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </DashboardCard>
          </div>
        </TabsContent>

        <TabsContent value="medical" className="mt-8">
          <div className="space-y-8">
            <DashboardCard tier="elevated" padding="none" className="p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-5">Medicare Details</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Your Medicare information is stored securely and used for prescription and referral services.
              </p>

              <div className="space-y-6">
                <MedicareCapture
                  value={medicareForm}
                  onChange={setMedicareForm}
                />

                <div className="flex items-center justify-between p-5 rounded-xl bg-white dark:bg-card border border-border/40">
                  <div>
                    <p className="font-medium text-foreground">My Health Record</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Opt in to share with My Health Record when relevant</p>
                  </div>
                  <Switch
                    checked={consentMyhr}
                    onCheckedChange={setConsentMyhr}
                    aria-label="My Health Record consent"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSaveMedicare} disabled={isSavingMedicare} className="rounded-xl">
                  {isSavingMedicare ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Medicare Details
                    </>
                  )}
                </Button>
              </div>
            </div>
            </DashboardCard>

            {/* Health Profile deep-link card. The standalone /patient/health-profile
                page lives on for direct linking but is folded into Medical here. */}
            <Link
              href={PATIENT_HEALTH_PROFILE_HREF}
              className="group flex items-center justify-between rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/[0.06] hover:border-primary/40"
            >
              <div className="min-w-0 flex-1 pr-4">
                <p className="font-semibold text-foreground">Health profile</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Allergies, conditions, current medications, and emergency contact. Pre-fills future consultation forms.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-8">
          <div className="space-y-8">
            <DashboardCard tier="elevated" padding="none" className="p-6 sm:p-8 space-y-6">
            {/* Email Subscription Preferences */}
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Email Subscriptions</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Control which marketing emails you receive. Transactional emails about your requests will always be sent.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 rounded-xl bg-white dark:bg-card border border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Marketing emails</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Occasional updates about new services and features</p>
                  </div>
                  <Switch 
                    checked={emailPrefs.marketing_emails}
                    onCheckedChange={(checked) => setEmailPrefs((prev) => ({ ...prev, marketing_emails: checked }))}
                    aria-label="Marketing emails" 
                  />
                </div>

                <div className="flex items-center justify-between p-5 rounded-xl bg-white dark:bg-card border border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Checkout reminders</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Reminders if you have an incomplete request</p>
                  </div>
                  <Switch 
                    checked={emailPrefs.abandoned_checkout_emails}
                    onCheckedChange={(checked) => setEmailPrefs((prev) => ({ ...prev, abandoned_checkout_emails: checked }))}
                    aria-label="Checkout reminder emails" 
                  />
                </div>

                <div className="flex items-center justify-between p-5 rounded-xl bg-white dark:bg-card border border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Transactional emails</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Updates about your requests, certificates, and account</p>
                  </div>
                  <Switch 
                    checked={true}
                    disabled
                    aria-label="Transactional emails (always on)" 
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSaveEmailPreferences} disabled={isSavingEmailPrefs} className="rounded-xl">
                  {isSavingEmailPrefs ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Email Preferences
                    </>
                  )}
                </Button>
              </div>
            </div>
            </DashboardCard>

            <div id="account-security" className="scroll-mt-24">
              <DashboardCard tier="elevated" padding="none" className="p-6 space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-4">Sign-in options</h3>
                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/40 bg-muted/25 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Linked providers
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {linkedProviderLabels.length > 0 ? linkedProviderLabels.join(", ") : "Email"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-muted/25 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Last sign-in
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">{lastSignInLabel}</p>
                    </div>
                  </div>
                  <GoogleAccountLinkCard
                    accountLabel="patient"
                    redirectPath={buildPatientSettingsHref({ tab: "preferences", anchor: "account-security" })}
                    className="rounded-xl border border-border/40 bg-white p-5 dark:bg-card"
                  />
                </div>
              </DashboardCard>
            </div>

            <DashboardCard tier="elevated" padding="none" className="p-6 space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-4">{hasPasswordLogin ? "Change Password" : "Set a password"}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasPasswordLogin
                  ? "Password changes are managed through your secure account portal for added security."
                  : "Your account currently uses Google sign-in only. Set a password to also sign in with your email."}
              </p>

              <div className="space-y-4 max-w-md">
                {hasPasswordLogin ? (
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      endContent={
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    endContent={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>

                <Button
                  onClick={hasPasswordLogin ? handlePasswordChange : handleSetPassword}
                  disabled={
                    isChangingPassword ||
                    (hasPasswordLogin && !passwordData.currentPassword) ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword
                  }
                  className="rounded-xl"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {hasPasswordLogin ? "Changing..." : "Setting..."}
                    </>
                  ) : (
                    hasPasswordLogin ? "Change Password" : "Set Password"
                  )}
                </Button>
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <h3 className="font-medium mb-4">Data & Privacy</h3>
              <div className="p-4 rounded-xl bg-muted/50 border border-border max-w-md mb-4">
                <p className="font-medium">Export Your Data</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Download a copy of all your personal data in JSON format.
                </p>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleExportData}
                  disabled={isExportingData}
                >
                  {isExportingData ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export My Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-destructive mb-4">Danger Zone</h3>
              <div className="p-4 rounded-xl bg-destructive-light border border-destructive-border/50 max-w-md">
                <p className="font-medium text-destructive">Close Account</p>
                <p className="text-sm text-destructive/70 mb-4">
                  Close sign-in access and remove non-essential profile/contact details. Clinical, payment, and audit
                  records required for care, refunds, complaints, and legal retention are retained.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-xl text-destructive border-destructive-border dark:border-destructive-border/30 hover:bg-destructive-light bg-transparent"
                    >
                      Close My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close this account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This closes patient sign-in access and removes non-essential profile/contact details. Clinical,
                        payment, and audit records are retained where required.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="rounded-xl bg-destructive hover:bg-destructive/90"
                      >
                        {isDeletingAccount ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Closing...
                          </>
                        ) : (
                          "Yes, close my account"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            </DashboardCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
