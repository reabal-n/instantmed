"use client"

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  FileSignature,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  Pause,
  Pill,
  Play,
  Save,
  ShieldCheck,
  Smartphone,
  Upload,
  User,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"

import { setDoctorAvailabilityAction } from "@/app/actions/doctor-availability"
import {
  saveDoctorIdentityAction,
  uploadSignatureAction,
} from "@/app/actions/doctor-identity"
import {
  linkParchmentUserAction,
  listParchmentUsersAction,
  validateParchmentIntegrationAction,
} from "@/app/actions/parchment"
import { setProfileAvatarPresetAction } from "@/app/actions/profile-avatar"
import { GoogleAccountLinkCard } from "@/components/account/google-account-link-card"
import { ProfileAvatarUpload } from "@/components/settings/profile-avatar-upload"
import { AvatarPicker } from "@/components/ui/avatar-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { getAvatarPresetId } from "@/lib/account/avatar-presets"
import {
  type DoctorIdentity,
  validateAhpraNumber,
  validateProviderNumber,
} from "@/lib/data/doctor-identity.shared"
import { useAuth } from "@/lib/supabase/auth-provider"
import { createClient } from "@/lib/supabase/client"

interface IdentitySettingsClientProps {
  initialData: DoctorIdentity
  avatarUrl?: string | null
  parchmentUserId?: string | null
  parchmentEnvironment: ParchmentEnvironmentDescriptor
}

type ParchmentEnvironmentDescriptor = {
  environment: "sandbox" | "production" | "unknown"
  label: "Sandbox" | "Production" | "Unknown"
  apiHost: string
  isSandbox: boolean
  isProduction: boolean
}

type MfaFactorSummary = {
  id: string
  factor_type: string
  status: string
  friendly_name?: string | null
}

type MfaEnrollment = {
  factorId: string
  qrCode: string
  secret: string
}

export function IdentitySettingsClient({
  initialData,
  avatarUrl,
  parchmentUserId: initialParchmentUserId,
  parchmentEnvironment: initialParchmentEnvironment,
}: IdentitySettingsClientProps) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState(avatarUrl || null)
  const [avatarSaving, setAvatarSaving] = useState(false)

  // Form state
  const [nominals, setNominals] = useState(initialData.nominals || "")
  const [providerNumber, setProviderNumber] = useState(initialData.provider_number || "")
  const [ahpraNumber, setAhpraNumber] = useState(initialData.ahpra_number || "")
  const [signaturePath, setSignaturePath] = useState(initialData.signature_storage_path || "")

  // Validation errors
  const [providerError, setProviderError] = useState<string | null>(null)
  const [ahpraError, setAhpraError] = useState<string | null>(null)

  const [doctorAvailable, setDoctorAvailable] = useState(initialData.doctor_available !== false)
  const [availabilitySaving, setAvailabilitySaving] = useState(false)

  // Account security state
  const [accountEmail, setAccountEmail] = useState(user?.email || "")
  const [emailSaving, setEmailSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [mfaFactors, setMfaFactors] = useState<MfaFactorSummary[]>([])
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaEnrolling, setMfaEnrolling] = useState(false)
  const [mfaVerifying, setMfaVerifying] = useState(false)
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null)
  const [mfaCode, setMfaCode] = useState("")

  // Parchment linking state
  const [parchmentUserId, setParchmentUserId] = useState(initialParchmentUserId || "")
  const [parchmentUsers, setParchmentUsers] = useState<Array<{ user_id: string; full_name: string }>>([])
  const [parchmentLoading, setParchmentLoading] = useState(false)
  const [parchmentLinking, setParchmentLinking] = useState(false)
  const [parchmentValidating, setParchmentValidating] = useState(false)
  const [parchmentValidated, setParchmentValidated] = useState(false)
  const [selectedParchmentUser, setSelectedParchmentUser] = useState("")
  const [parchmentEnvironment, setParchmentEnvironment] = useState(initialParchmentEnvironment)

  // Track changes
  const hasChanges =
    nominals !== (initialData.nominals || "") ||
    providerNumber !== (initialData.provider_number || "") ||
    ahpraNumber !== (initialData.ahpra_number || "") ||
    signaturePath !== (initialData.signature_storage_path || "")

  // Check if identity is complete
  const isComplete = providerNumber.trim() !== "" && ahpraNumber.trim() !== ""
  const verifiedMfaFactors = mfaFactors.filter((factor) => factor.status === "verified")
  const parchmentEnvironmentLabel =
    parchmentEnvironment.environment === "unknown" ? "configured Parchment" : `${parchmentEnvironment.label} Parchment`
  const parchmentEnvironmentDisplayLabel =
    parchmentEnvironment.environment === "unknown" ? "Configured" : parchmentEnvironment.label
  const parchmentUserIdPlaceholder =
    parchmentEnvironment.environment === "unknown"
      ? "Paste user_id from the configured Parchment environment"
      : `Paste ${parchmentEnvironment.label} Parchment user_id`
  const parchmentEnvironmentInstruction = parchmentEnvironment.isSandbox
    ? "Use only the Sandbox Parchment user_id while this production website is configured for sandbox testing."
    : parchmentEnvironment.isProduction
      ? "Use only the Production Parchment user_id after production credentials are issued and the environment is switched."
      : "Confirm the configured Parchment environment before linking a prescriber user_id."
  const parchmentEnvironmentBadgeVariant: "warning" | "info" | "secondary" =
    parchmentEnvironment.isSandbox ? "warning" : parchmentEnvironment.isProduction ? "info" : "secondary"
  const settingsCompletionItems = [
    { label: "Provider number", complete: providerNumber.trim() !== "" && !providerError },
    { label: "AHPRA", complete: ahpraNumber.trim() !== "" && !ahpraError },
    { label: "Signature", complete: signaturePath.trim() !== "" },
    { label: "Parchment", complete: parchmentUserId.trim() !== "" },
    { label: "MFA", complete: verifiedMfaFactors.length > 0 },
  ]
  const settingsCompletionCount = settingsCompletionItems.filter((item) => item.complete).length

  const getAccountRedirectUrl = useCallback(() => {
    if (typeof window === "undefined") return undefined
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/doctor/settings/identity#account-security")}`
  }, [])

  const loadMfaFactors = useCallback(async (showLoading = true) => {
    if (showLoading) setMfaLoading(true)
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (showLoading) setMfaLoading(false)
    if (error) {
      setMessage({ type: "error", text: error.message || "Could not load MFA factors" })
      return
    }
    setMfaFactors(
      (data?.all || []).map((factor) => ({
        id: factor.id,
        factor_type: factor.factor_type,
        status: factor.status,
        friendly_name: factor.friendly_name,
      })),
    )
  }, [supabase.auth])

  useEffect(() => {
    setAccountEmail(user?.email || "")
  }, [user?.email])

  useEffect(() => {
    if (user?.id) void loadMfaFactors(false)
  }, [loadMfaFactors, user?.id])

  // Validate provider number on blur
  const handleProviderBlur = useCallback(() => {
    if (providerNumber.trim() === "") {
      setProviderError(null)
      return
    }
    const result = validateProviderNumber(providerNumber)
    setProviderError(result.valid ? null : result.error || "Invalid format")
  }, [providerNumber])

  // Validate AHPRA number on blur
  const handleAhpraBlur = useCallback(() => {
    if (ahpraNumber.trim() === "") {
      setAhpraError(null)
      return
    }
    const result = validateAhpraNumber(ahpraNumber)
    setAhpraError(result.valid ? null : result.error || "Invalid format")
  }, [ahpraNumber])

  const handleEmailChange = useCallback(async () => {
    const nextEmail = accountEmail.trim().toLowerCase()
    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setMessage({ type: "error", text: "Enter a valid email address." })
      return
    }
    if (nextEmail === user?.email) {
      setMessage({ type: "success", text: "Email is already up to date." })
      return
    }

    setEmailSaving(true)
    const { error } = await supabase.auth.updateUser(
      { email: nextEmail },
      { emailRedirectTo: getAccountRedirectUrl() },
    )
    setEmailSaving(false)

    if (error) {
      setMessage({ type: "error", text: error.message || "Could not start email change." })
      return
    }

    setMessage({
      type: "success",
      text: "Email change started. Confirm the verification email to finish updating this login.",
    })
  }, [accountEmail, getAccountRedirectUrl, supabase.auth, user?.email])

  const handlePasswordChange = useCallback(async () => {
    if (passwordForm.newPassword.length < 12) {
      setMessage({ type: "error", text: "Use at least 12 characters for doctor account passwords." })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "Password confirmation does not match." })
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
    setPasswordSaving(false)

    if (error) {
      setMessage({ type: "error", text: error.message || "Could not update password." })
      return
    }

    setPasswordForm({ newPassword: "", confirmPassword: "" })
    setMessage({ type: "success", text: "Password updated successfully." })
  }, [passwordForm.confirmPassword, passwordForm.newPassword, supabase.auth])

  const handleStartMfaEnrollment = useCallback(async () => {
    setMfaEnrolling(true)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "InstantMed doctor login",
    })
    setMfaEnrolling(false)

    if (error || !data || data.type !== "totp") {
      setMessage({ type: "error", text: error?.message || "Could not start MFA setup." })
      return
    }

    setMfaEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    })
    setMfaCode("")
    setMessage({ type: "success", text: "Scan the QR code, then enter the 6-digit authenticator code." })
  }, [supabase.auth])

  const handleVerifyMfaEnrollment = useCallback(async () => {
    if (!mfaEnrollment) return
    const code = mfaCode.trim().replace(/\s/g, "")
    if (!/^\d{6}$/.test(code)) {
      setMessage({ type: "error", text: "Enter the 6-digit authenticator code." })
      return
    }

    setMfaVerifying(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaEnrollment.factorId,
      code,
    })
    setMfaVerifying(false)

    if (error) {
      setMessage({ type: "error", text: error.message || "Could not verify MFA code." })
      return
    }

    setMfaEnrollment(null)
    setMfaCode("")
    await loadMfaFactors(false)
    setMessage({ type: "success", text: "Two-factor authentication is enabled." })
  }, [loadMfaFactors, mfaCode, mfaEnrollment, supabase.auth])

  const handleRemoveMfaFactor = useCallback(async (factorId: string) => {
    setMfaLoading(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    setMfaLoading(false)
    if (error) {
      setMessage({
        type: "error",
        text: error.message || "Could not remove MFA. Re-authenticate with MFA and try again.",
      })
      return
    }
    await loadMfaFactors(false)
    setMessage({ type: "success", text: "MFA factor removed." })
  }, [loadMfaFactors, supabase.auth])

  // Save handler
  const handleSave = useCallback(() => {
    // Validate before saving
    if (providerNumber.trim() !== "") {
      const providerResult = validateProviderNumber(providerNumber)
      if (!providerResult.valid) {
        setProviderError(providerResult.error || "Invalid format")
        return
      }
    }

    if (ahpraNumber.trim() !== "") {
      const ahpraResult = validateAhpraNumber(ahpraNumber)
      if (!ahpraResult.valid) {
        setAhpraError(ahpraResult.error || "Invalid format")
        return
      }
    }

    startTransition(async () => {
      setMessage(null)

      const result = await saveDoctorIdentityAction({
        nominals: nominals.trim() || null,
        provider_number: providerNumber.trim() || null,
        ahpra_number: ahpraNumber.trim() || null,
        signature_storage_path: signaturePath || null,
      })

      if (result.success) {
        setMessage({ type: "success", text: "Settings saved successfully" })
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save" })
      }
    })
  }, [nominals, providerNumber, ahpraNumber, signaturePath])

  // Signature upload handler
  const handleSignatureUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append("signature", file)

      startTransition(async () => {
        const result = await uploadSignatureAction(formData)
        if (result.success && result.path) {
          setSignaturePath(result.path)
          setMessage({ type: "success", text: "Signature uploaded" })
          setTimeout(() => setMessage(null), 3000)
        } else {
          setMessage({ type: "error", text: result.error || "Upload failed" })
        }
      })
    },
    []
  )

  // Load Parchment users for linking
  const handleLoadParchmentUsers = useCallback(async () => {
    setParchmentLoading(true)
    const result = await listParchmentUsersAction()
    setParchmentLoading(false)
    if (result.environment) {
      setParchmentEnvironment(result.environment)
    }
    if (result.success && result.users) {
      setParchmentUsers(result.users)
      setMessage({ type: "success", text: `${result.environment?.label || parchmentEnvironment.label} Parchment users loaded` })
    } else {
      setMessage({
        type: "error",
        text: `${result.error || "Failed to load Parchment users"}. Paste the Parchment user ID below instead.`,
      })
    }
  }, [parchmentEnvironment.label])

  // Link Parchment account
  const handleLinkParchment = useCallback(async () => {
    if (!selectedParchmentUser) return
    setParchmentLinking(true)
    const result = await linkParchmentUserAction(selectedParchmentUser)
    setParchmentLinking(false)
    if (result.success) {
      setParchmentUserId(selectedParchmentUser.trim())
      setParchmentValidated(true)
      setMessage({ type: "success", text: `${parchmentEnvironmentLabel} account linked and validation handshake completed` })
      setTimeout(() => setMessage(null), 5000)
    } else {
      setMessage({ type: "error", text: result.error || "Failed to link account" })
    }
  }, [parchmentEnvironmentLabel, selectedParchmentUser])

  const handleValidateParchment = useCallback(async () => {
    setParchmentValidating(true)
    setParchmentValidated(false)
    const result = await validateParchmentIntegrationAction()
    setParchmentValidating(false)
    if (result.success) {
      setParchmentValidated(true)
      setMessage({
        type: "success",
        text: result.requestId
          ? `${parchmentEnvironmentLabel} integration validated (${result.requestId})`
          : result.message || `${parchmentEnvironmentLabel} integration validated`,
      })
      setTimeout(() => setMessage(null), 5000)
    } else {
      setMessage({ type: "error", text: result.error || "Parchment validation failed" })
    }
  }, [parchmentEnvironmentLabel])

  const handleAvailabilityChange = useCallback(async (checked: boolean) => {
    setDoctorAvailable(checked)
    setAvailabilitySaving(true)
    const result = await setDoctorAvailabilityAction(checked)
    setAvailabilitySaving(false)
    if (result.success) {
      setMessage({ type: "success", text: checked ? "Accepting new requests" : "Paused - no new requests" })
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({ type: "error", text: result.error || "Failed to update" })
      setDoctorAvailable(!checked)
    }
  }, [])

  const handleAvatarPresetSelect = useCallback(async (avatarId: number) => {
    setAvatarSaving(true)
    const result = await setProfileAvatarPresetAction(avatarId)
    setAvatarSaving(false)

    if (!result.success || !result.avatarUrl) {
      setMessage({ type: "error", text: result.error || "Could not save avatar." })
      return
    }

    setAvatarDisplayUrl(result.avatarUrl)
    setMessage({ type: "success", text: "Avatar saved." })
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/doctor/dashboard" aria-label="Back to doctor dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Doctor Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage account security, Parchment prescribing, and certificate identity.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="#account-security">Account security</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="#parchment-account">Parchment prescribing</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="#certificate-identity">Certificate identity</Link>
          </Button>
        </div>
      </div>

      {/* Completion strip */}
      <Card className="rounded-xl border-border/50">
        <CardContent className="px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Settings completion</p>
              <p className="text-xs text-muted-foreground">
                The essentials for secure sign-in, certificates, and prescribing.
              </p>
            </div>
            <Badge
              variant={settingsCompletionCount === settingsCompletionItems.length ? "success" : "warning"}
              shape="pill"
            >
              {settingsCompletionCount}/{settingsCompletionItems.length} ready
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {settingsCompletionItems.map((item) => (
              <span
                key={item.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  item.complete
                    ? "border-success-border bg-success-light text-success"
                    : "border-border bg-muted/50 text-muted-foreground"
                }`}
              >
                {item.complete ? (
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {item.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {doctorAvailable ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            Request availability
          </CardTitle>
          <CardDescription>
            When paused, you won&apos;t receive new requests in your queue. Existing claims continue as normal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {doctorAvailable ? "Accepting new requests" : "Paused - no new requests"}
            </span>
            <Switch
              checked={doctorAvailable}
              onCheckedChange={handleAvailabilityChange}
              disabled={availabilitySaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Incomplete Warning */}
      {!isComplete && (
        <Card className="rounded-xl border-warning-border bg-warning-light/40">
          <CardContent className="pt-4 px-4 pb-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">
                  Certificate identity incomplete
                </p>
                <p className="text-sm text-warning mt-1">
                  You must provide your Provider Number and AHPRA Registration Number
                  before you can approve medical certificates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 ${
            message.type === "success"
              ? "bg-success-light/40 text-success border border-success-border"
              : "bg-destructive-light text-destructive border border-destructive-border"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Account Security */}
      <div id="account-security" className="scroll-mt-24">
      <Card className="rounded-xl border-border/50">
        <CardHeader className="py-3 px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Account Security
              </CardTitle>
              <CardDescription>
                Control login, MFA, and connected sign-in methods for this doctor account.
              </CardDescription>
            </div>
            <Badge variant={verifiedMfaFactors.length > 0 ? "success" : "warning"}>
              {verifiedMfaFactors.length > 0 ? "MFA enabled" : "MFA not enabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-3 space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg bg-muted/35 p-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Email login</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor-account-email">Email address</Label>
                <Input
                  id="doctor-account-email"
                  type="email"
                  value={accountEmail}
                  onChange={(event) => setAccountEmail(event.target.value)}
                  placeholder="doctor@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Email changes require confirmation from the new address before the login changes.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleEmailChange}
                disabled={emailSaving || accountEmail.trim().toLowerCase() === (user?.email || "").toLowerCase()}
              >
                {emailSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Update Email
              </Button>
            </div>

            <div className="space-y-3 rounded-lg bg-muted/35 p-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Password</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor-new-password">New password</Label>
                <Input
                  id="doctor-new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  placeholder="At least 12 characters"
                  endContent={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((value) => !value)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor-confirm-password">Confirm password</Label>
                <Input
                  id="doctor-confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePasswordChange}
                disabled={passwordSaving || !passwordForm.newPassword || !passwordForm.confirmPassword}
              >
                {passwordSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                Change Password
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg bg-muted/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                </div>
                <Badge variant={verifiedMfaFactors.length > 0 ? "success" : "warning"} size="sm">
                  {verifiedMfaFactors.length > 0 ? `${verifiedMfaFactors.length} active` : "Off"}
                </Badge>
              </div>

              {mfaFactors.length > 0 && (
                <div className="space-y-2">
                  {mfaFactors.map((factor) => (
                    <div key={factor.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {factor.friendly_name || `${factor.factor_type.toUpperCase()} factor`}
                        </p>
                        <p className="text-xs text-muted-foreground">{factor.status}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleRemoveMfaFactor(factor.id)}
                        disabled={mfaLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {mfaEnrollment ? (
                <div className="space-y-3 rounded-md border border-primary/20 bg-background p-3">
                  <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mfaEnrollment.qrCode}
                      alt="Authenticator QR code"
                      className="h-32 w-32 rounded-md border border-border bg-white p-2"
                    />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Scan this QR code in an authenticator app, or enter the setup key manually.
                      </p>
                      <p className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{mfaEnrollment.secret}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      inputMode="numeric"
                      value={mfaCode}
                      onChange={(event) => setMfaCode(event.target.value)}
                      placeholder="6-digit code"
                      className="sm:max-w-[180px]"
                    />
                    <Button type="button" size="sm" onClick={handleVerifyMfaEnrollment} disabled={mfaVerifying}>
                      {mfaVerifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Verify MFA
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={handleStartMfaEnrollment} disabled={mfaEnrolling}>
                  {mfaEnrolling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Add Authenticator App
                </Button>
              )}
            </div>

            <GoogleAccountLinkCard
              accountLabel="doctor"
              redirectPath="/doctor/settings/identity#account-security"
            />
          </div>
        </CardContent>
      </Card>
      </div>

      <Card className="rounded-xl border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile and avatar
          </CardTitle>
          <CardDescription>
            Choose a preset or upload a photo for your doctor portal identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 py-3">
          <ProfileAvatarUpload
            userName={initialData.full_name}
            avatarUrl={avatarDisplayUrl}
            onUploaded={(avatar) => setAvatarDisplayUrl(avatar.avatarUrl || avatar.avatarValue)}
          />
          <AvatarPicker
            selectedAvatarId={getAvatarPresetId(avatarDisplayUrl)}
            customAvatarUrl={getAvatarPresetId(avatarDisplayUrl) ? null : avatarDisplayUrl}
            userName={initialData.full_name}
            onSelect={(avatarId) => void handleAvatarPresetSelect(avatarId)}
          />
          {avatarSaving && (
            <p className="text-center text-xs text-muted-foreground">Saving avatar...</p>
          )}
        </CardContent>
      </Card>

      {/* Professional Details */}
      <div id="certificate-identity" className="scroll-mt-24">
      <Card className="rounded-xl border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Professional Details
          </CardTitle>
          <CardDescription>
            This information appears on certificates you issue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 py-3">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={initialData.full_name}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Name cannot be changed here. Contact support if needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nominals">
              Qualifications / Nominals{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="nominals"
              value={nominals}
              onChange={(e) => setNominals(e.target.value)}
              placeholder="e.g., MBBS"
            />
            <p className="text-xs text-muted-foreground">
              Professional qualifications displayed after your name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider_number">
              Provider Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="provider_number"
              value={providerNumber}
              onChange={(e) => {
                setProviderNumber(e.target.value.toUpperCase())
                setProviderError(null)
              }}
              onBlur={handleProviderBlur}
              placeholder="e.g., 2426577L"
              className={providerError ? "border-destructive-border" : ""}
            />
            {providerError ? (
              <p className="text-xs text-destructive">{providerError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Medicare provider number (6-7 digits + letter)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ahpra_number">
              AHPRA Registration Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ahpra_number"
              value={ahpraNumber}
              onChange={(e) => {
                setAhpraNumber(e.target.value.toUpperCase())
                setAhpraError(null)
              }}
              onBlur={handleAhpraBlur}
              placeholder="e.g., MED0002576546"
              className={ahpraError ? "border-destructive-border" : ""}
            />
            {ahpraError ? (
              <p className="text-xs text-destructive">{ahpraError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                AHPRA registration (3 letters + 10 digits)
              </p>
            )}
          </div>

          <div className="border-t border-border/50 pt-4">
            <div className="mb-3 flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Signature</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-40 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                {signaturePath ? (
                  <span className="text-success">Signature uploaded</span>
                ) : (
                  "No signature"
                )}
              </div>
              <div>
                <Label
                  htmlFor="signature-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  {signaturePath ? "Replace Signature" : "Upload Signature"}
                </Label>
                <Input
                  id="signature-upload"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleSignatureUpload}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  PNG or JPG, max 1MB. If not provided, certificates show &ldquo;Electronically signed&rdquo;.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Parchment Integration */}
      <div id="parchment-account" className="scroll-mt-24">
      <Card className="rounded-xl border-border/50">
        <CardHeader className="py-3 px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Parchment Prescribing Account
              </CardTitle>
              <CardDescription>
                Link this logged-in doctor once. Patients sync automatically when you prescribe or refresh them.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Badge variant={parchmentEnvironmentBadgeVariant}>
                {parchmentEnvironment.label} environment
              </Badge>
              <Badge variant={parchmentUserId ? "success" : "warning"}>
                {parchmentUserId ? "Prescriber linked" : "Link required"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-3 space-y-4">
          <div className="rounded-lg border border-warning-border bg-warning-light/30 p-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">{parchmentEnvironmentLabel} is active for this production website.</p>
              <span className="font-mono text-xs text-muted-foreground">{parchmentEnvironment.apiHost}</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {parchmentEnvironmentInstruction} Production and Sandbox Parchment user IDs are separate and cannot be swapped.
            </p>
          </div>
          {parchmentUserId ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-success border-success-border bg-success-light/40">
                  <Link2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                {parchmentValidated && (
                  <Badge variant="outline" className="text-success border-success-border bg-success-light/40">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Validated
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Linked {parchmentEnvironmentDisplayLabel} Parchment User ID</Label>
                <p className="text-sm font-mono">{parchmentUserId}</p>
                <p className="text-xs text-muted-foreground">
                  Validation runs automatically when you link this user and before prescribing.
                  Use revalidation when you need a fresh audit request ID.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidateParchment}
                disabled={parchmentValidating}
              >
                {parchmentValidating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Revalidate {parchmentEnvironmentDisplayLabel} Integration
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  Not connected
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Link the {parchmentEnvironmentLabel} prescriber user for this InstantMed doctor account. This is not a per-patient step.
              </p>
              <div className="space-y-2">
                <Label>Parchment User ID</Label>
                <Input
                  value={selectedParchmentUser}
                  onChange={(event) => setSelectedParchmentUser(event.target.value)}
                  placeholder={parchmentUserIdPlaceholder}
                  className="font-mono"
                />
              </div>
              {parchmentUsers.length > 0 && (
                <div className="space-y-2">
                  <Label>Or select a Parchment user</Label>
                  <Select value={selectedParchmentUser} onValueChange={setSelectedParchmentUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parchmentUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleLinkParchment}
                  disabled={!selectedParchmentUser.trim() || parchmentLinking}
                >
                  {parchmentLinking ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Confirm Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadParchmentUsers}
                  disabled={parchmentLoading}
                >
                  {parchmentLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Load Users
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/doctor/dashboard">Cancel</Link>
        </Button>
        <Button
          onClick={handleSave}
          disabled={isPending || !hasChanges || !!providerError || !!ahpraError}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
