"use client"

import {
  ArrowRight,
  Bell,
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
import { useState } from "react"
import { toast } from "sonner"

import { changePassword, deleteAccount } from "@/app/actions/account"
import { type EmailPreferences,updateEmailPreferences } from "@/app/actions/email-preferences"
import { exportPatientData } from "@/app/actions/export-data"
import { updateMedicareAction } from "@/app/actions/profile-todo"
import { DashboardCard, DashboardPageHeader } from "@/components/dashboard"
import { MedicareCapture } from "@/components/intake/medicare-capture"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AUSTRALIAN_STATES } from "@/lib/constants"
import { formatMedicareNumber } from "@/lib/validation/medicare"
import type { Profile } from "@/types/db"

interface PatientSettingsClientProps {
  profile: Profile
  email: string
  emailPreferences?: EmailPreferences | null
}

type SettingsTab = "personal" | "medical" | "preferences"
const VALID_TABS: readonly SettingsTab[] = ["personal", "medical", "preferences"] as const

export function PatientSettingsClient({ profile, email, emailPreferences }: PatientSettingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // Convert ISO date (YYYY-MM-DD) to MM/YY for form display
  const expiryToMmYy = (iso: string | null) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ""
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = String(d.getFullYear()).slice(-2)
    return `${month}/${year}`
  }

  const [medicareForm, setMedicareForm] = useState({
    number: profile.medicare_number ? formatMedicareNumber(profile.medicare_number.replace(/\s/g, "")) : "",
    irn: profile.medicare_irn as number | null,
    expiry: expiryToMmYy(profile.medicare_expiry),
  })
  const [consentMyhr, setConsentMyhr] = useState(profile.consent_myhr ?? false)

  const [emailPrefs, setEmailPrefs] = useState({
    marketing_emails: emailPreferences?.marketing_emails ?? true,
    abandoned_checkout_emails: emailPreferences?.abandoned_checkout_emails ?? true,
  })

  const [formData, setFormData] = useState({
    full_name: profile.full_name,
    phone: profile.phone || "",
    date_of_birth: profile.date_of_birth || "",
    address_line1: profile.address_line1 || "",
    suburb: profile.suburb || "",
    state: profile.state || "",
    postcode: profile.postcode || "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to update")
      toast.success("Profile updated successfully")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
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
        toast.success("Account deleted successfully")
        router.push("/")
      } else {
        toast.error(result.error || "Failed to delete account")
      }
    } catch {
      toast.error("Failed to delete account")
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
            {/* Avatar Picker */}
            <AvatarPicker
              selectedAvatarId={1}
              userName={formData.full_name || "Me"}
              onSelect={(avatarId) => {
                toast.success(`Avatar ${avatarId} selected`)
              }}
            />

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
                    <Input id="email" value={email} disabled className="rounded-xl bg-muted/50" />
                    <p className="text-xs text-muted-foreground">Contact support to change your email</p>
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
                  <Input
                    id="street"
                    value={formData.address_line1}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address_line1: e.target.value }))}
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
              href="/patient/health-profile"
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

            <DashboardCard tier="elevated" padding="none" className="p-6 space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-4">Change Password</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Password changes are managed through your secure account portal for added security.
              </p>

              <div className="space-y-4 max-w-md">
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
                  onClick={handlePasswordChange}
                  disabled={
                    isChangingPassword ||
                    !passwordData.currentPassword ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword
                  }
                  className="rounded-xl"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
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
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-sm text-destructive/70 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-xl text-destructive border-destructive-border dark:border-destructive-border/30 hover:bg-destructive-light bg-transparent"
                    >
                      Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove your data
                        from our servers.
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
                            Deleting...
                          </>
                        ) : (
                          "Yes, delete my account"
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
