"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  User,
  MapPin,
  CreditCard,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Bell,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react"
import type { Profile } from "@/types/db"
import { toast } from "sonner"
import { changePassword, deleteAccount } from "@/app/actions/account"

interface PatientSettingsClientProps {
  profile: Profile
  email: string
}

export function PatientSettingsClient({ profile, email }: PatientSettingsClientProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [formData, setFormData] = useState({
    full_name: profile.full_name,
    phone: profile.phone || "",
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
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
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
    } catch (error) {
      toast.error("Failed to change password")
    } finally {
      setIsChangingPassword(false)
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
    } catch (error) {
      toast.error("Failed to delete account")
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const maskMedicare = (medicare: string | null) => {
    if (!medicare) return "Not provided"
    return `${medicare.slice(0, 4)} •••• ••••`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences</p>
      </div>

      <Tabs
        defaultValue="profile"
        className="animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
      >
        <TabsList className="glass-card rounded-xl p-1 h-auto flex-wrap">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white/60">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="address" className="rounded-lg data-[state=active]:bg-white/60">
            <MapPin className="w-4 h-4 mr-2" />
            Address
          </TabsTrigger>
          <TabsTrigger value="medicare" className="rounded-lg data-[state=active]:bg-white/60">
            <CreditCard className="w-4 h-4 mr-2" />
            Medicare
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white/60">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white/60">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-4">Personal Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="rounded-xl bg-white/50"
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
                    className="rounded-xl bg-white/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    value={
                      profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString("en-AU") : "Not set"
                    }
                    disabled
                    className="rounded-xl bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">Contact support to correct your DOB</p>
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
          </div>
        </TabsContent>

        <TabsContent value="address" className="mt-6">
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-4">Delivery Address</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This address is used for sending physical documents if required.
              </p>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.address_line1}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address_line1: e.target.value }))}
                    className="rounded-xl bg-white/50"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="suburb">Suburb</Label>
                    <Input
                      id="suburb"
                      value={formData.suburb}
                      onChange={(e) => setFormData((prev) => ({ ...prev, suburb: e.target.value }))}
                      className="rounded-xl bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                      className="rounded-xl bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      value={formData.postcode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, postcode: e.target.value }))}
                      className="rounded-xl bg-white/50"
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
          </div>
        </TabsContent>

        <TabsContent value="medicare" className="mt-6">
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-4">Medicare Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your Medicare information is stored securely and used for prescription and referral services.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-xl bg-white/50 border border-white/40">
                  <Label className="text-xs text-muted-foreground">Medicare Number</Label>
                  <p className="font-mono text-foreground mt-1">{maskMedicare(profile.medicare_number)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/50 border border-white/40">
                  <Label className="text-xs text-muted-foreground">IRN</Label>
                  <p className="font-mono text-foreground mt-1">{profile.medicare_irn || "Not provided"}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/50 border border-white/40">
                  <Label className="text-xs text-muted-foreground">Expiry</Label>
                  <p className="font-mono text-foreground mt-1">
                    {profile.medicare_expiry
                      ? new Date(profile.medicare_expiry).toLocaleDateString("en-AU", {
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "Not provided"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/50 border border-white/40">
                  <Label className="text-xs text-muted-foreground">My Health Record</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {profile.consent_myhr ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-foreground">Opted in</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Not opted in</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                To update your Medicare details, please contact support.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-4">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose how you want to be notified about your requests.
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-white/40">
                  <div>
                    <p className="font-medium text-foreground">Email notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates about your requests via email</p>
                  </div>
                  <Switch defaultChecked aria-label="Email notifications" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-white/40">
                  <div>
                    <p className="font-medium text-foreground">SMS notifications</p>
                    <p className="text-sm text-muted-foreground">Receive urgent updates via SMS</p>
                  </div>
                  <Switch aria-label="SMS notifications" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-white/40">
                  <div>
                    <p className="font-medium text-foreground">Marketing communications</p>
                    <p className="text-sm text-muted-foreground">Receive tips and updates from InstantMed</p>
                  </div>
                  <Switch aria-label="Marketing communications" />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-4">Change Password</h3>

              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      className="rounded-xl bg-white/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className="rounded-xl bg-white/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="rounded-xl bg-white/50"
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

            <hr className="border-white/20" />

            <div>
              <h3 className="font-medium text-foreground mb-4">Two-Factor Authentication</h3>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-white/40 max-w-md">
                <div>
                  <p className="font-medium text-foreground">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Coming Soon
                </Badge>
              </div>
            </div>

            <hr className="border-white/20" />

            <div>
              <h3 className="font-medium text-red-700 mb-4">Danger Zone</h3>
              <div className="p-4 rounded-xl bg-red-50/50 border border-red-200/50 max-w-md">
                <p className="font-medium text-red-700">Delete Account</p>
                <p className="text-sm text-red-600/70 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
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
                        className="rounded-xl bg-red-600 hover:bg-red-700"
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
