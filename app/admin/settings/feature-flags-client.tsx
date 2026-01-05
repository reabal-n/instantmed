"use client"

import { useState, useTransition } from "react"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Shield, Pill, FileText, Stethoscope, Save, Loader2, CheckCircle } from "lucide-react"
import { updateFeatureFlagAction, FLAG_KEYS } from "./actions"
import type { FeatureFlags } from "@/lib/feature-flags"

interface FeatureFlagsClientProps {
  initialFlags: FeatureFlags
}

export function FeatureFlagsClient({ initialFlags }: FeatureFlagsClientProps) {
  const [flags, setFlags] = useState(initialFlags)
  const [isPending, startTransition] = useTransition()
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [blockedTermsText, setBlockedTermsText] = useState(
    flags.blocked_medication_terms.join("\n")
  )

  const handleToggle = (key: keyof typeof FLAG_KEYS, currentValue: boolean) => {
    const flagKey = FLAG_KEYS[key]
    const newValue = !currentValue

    startTransition(async () => {
      setError(null)
      const result = await updateFeatureFlagAction(flagKey, newValue)
      
      if (result.success) {
        setFlags((prev) => ({ ...prev, [flagKey]: newValue }))
        setSavedKey(flagKey)
        setTimeout(() => setSavedKey(null), 2000)
      } else {
        setError(result.error || "Failed to update")
      }
    })
  }

  const handleSaveBlockedTerms = () => {
    const terms = blockedTermsText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    startTransition(async () => {
      setError(null)
      const result = await updateFeatureFlagAction(
        FLAG_KEYS.BLOCKED_MEDICATION_TERMS,
        terms
      )

      if (result.success) {
        setFlags((prev) => ({ ...prev, blocked_medication_terms: terms }))
        setSavedKey(FLAG_KEYS.BLOCKED_MEDICATION_TERMS)
        setTimeout(() => setSavedKey(null), 2000)
      } else {
        setError(result.error || "Failed to update")
      }
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Service Kill Switches
          </CardTitle>
          <CardDescription>
            Disable services instantly. Changes block new submissions and checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between py-4 border-b">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <Label htmlFor="disable_med_cert" className="text-base font-medium">
                  Disable Medical Certificates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Block new medical certificate requests
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {savedKey === FLAG_KEYS.DISABLE_MED_CERT && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <Switch
                id="disable_med_cert"
                isSelected={flags.disable_med_cert}
                onValueChange={() => handleToggle("DISABLE_MED_CERT", flags.disable_med_cert)}
                isDisabled={isPending}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-4 border-b">
            <div className="flex items-center gap-3">
              <Pill className="h-5 w-5 text-green-500" />
              <div>
                <Label htmlFor="disable_repeat_scripts" className="text-base font-medium">
                  Disable Repeat Scripts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Block new repeat prescription requests
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {savedKey === FLAG_KEYS.DISABLE_REPEAT_SCRIPTS && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <Switch
                id="disable_repeat_scripts"
                isSelected={flags.disable_repeat_scripts}
                onValueChange={() => handleToggle("DISABLE_REPEAT_SCRIPTS", flags.disable_repeat_scripts)}
                isDisabled={isPending}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-5 w-5 text-purple-500" />
              <div>
                <Label htmlFor="disable_consults" className="text-base font-medium">
                  Disable Consults
                </Label>
                <p className="text-sm text-muted-foreground">
                  Block new consultation requests
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {savedKey === FLAG_KEYS.DISABLE_CONSULTS && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <Switch
                id="disable_consults"
                isSelected={flags.disable_consults}
                onValueChange={() => handleToggle("DISABLE_CONSULTS", flags.disable_consults)}
                isDisabled={isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Blocked Medications
          </CardTitle>
          <CardDescription>
            Medications matching these terms will be rejected for compliance. One term per line.
            Matching is case-insensitive and checks if the term appears anywhere in the medication name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter blocked medication terms, one per line...&#10;Example:&#10;oxycodone&#10;fentanyl&#10;alprazolam"
            value={blockedTermsText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBlockedTermsText(e.target.value)}
            minRows={8}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {blockedTermsText.split("\n").filter((t) => t.trim()).length} term(s) configured
            </p>
            <Button
              onClick={handleSaveBlockedTerms}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedKey === FLAG_KEYS.BLOCKED_MEDICATION_TERMS ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Blocked Terms
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
