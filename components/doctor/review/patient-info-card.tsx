"use client"

import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  ExternalLink,
  History,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildPatientSnapshot,
  getPatientSnapshotOptionsForCase,
  requiresPrescribingIdentityForCase,
} from "@/lib/doctor/patient-snapshot"
import { cn } from "@/lib/utils"

export function PatientInfoCard() {
  const { intake, data, answers, service } = useIntakeReview()
  const [open, setOpen] = useState(true)
  const [medicarecopied, setMedicareCopied] = useState(false)
  const snapshotContext = {
    answers,
    category: intake.category,
    serviceType: service?.type,
    subtype: intake.subtype,
  }
  const snapshot = buildPatientSnapshot(intake.patient, {
    ...getPatientSnapshotOptionsForCase(snapshotContext),
    answers,
  })
  const requiresPrescribingIdentity = requiresPrescribingIdentityForCase(snapshotContext)
  const previousCount = data.previousIntakeCount ?? data.previousIntakes?.length ?? 0

  const copyMedicare = () => {
    const num = snapshot.medicare.value
    if (!num) return
    navigator.clipboard.writeText(num).then(() => {
      setMedicareCopied(true)
      setTimeout(() => setMedicareCopied(false), 2000)
    }).catch(() => { /* clipboard unavailable */ })
  }

  return (
    <Card>
      <CardHeader
        className="py-4 px-5 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <CardTitle className="flex items-center gap-3 text-sm">
          <User className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">Patient snapshot</span>
          <Badge
            variant={snapshot.completenessTone === "complete" ? "success" : snapshot.completenessTone === "partial" ? "warning" : "destructive"}
            size="sm"
            className="hidden sm:inline-flex"
          >
            {snapshot.completenessTone === "complete" ? "Details complete" : snapshot.completenessLabel}
          </Badge>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
        </CardTitle>
      </CardHeader>
      {open && <CardContent className="px-5 pb-5 pt-0">
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-base font-semibold text-foreground">{snapshot.name}</p>
              <span className="text-sm text-muted-foreground">{snapshot.ageDobLabel}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant={snapshot.completenessTone === "complete" ? "success" : snapshot.completenessTone === "partial" ? "warning" : "destructive"}
                size="sm"
                className="sm:hidden"
              >
                {snapshot.completenessTone === "complete" ? "Details complete" : snapshot.completenessLabel}
              </Badge>
              <Badge variant="outline" size="sm">
                <History className="h-3 w-3" />
                {previousCount === 0 ? "First request" : `${previousCount} previous`}
              </Badge>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 self-start">
            <Link href={snapshot.profileHref}>
              <ExternalLink className="h-3.5 w-3.5" />
              Open profile
            </Link>
          </Button>
        </div>

        {snapshot.missingCriticalFields.length > 0 && (
          <div className="mt-4 rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-sm text-warning">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{snapshot.completenessLabel}. Confirm before approving if clinically required.</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Age / DOB</p>
              <p className={cn("font-medium", !intake.patient.date_of_birth && "text-warning")}>{snapshot.ageDobLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Medicare</p>
              <div className="flex items-center gap-1.5">
                <p className={cn("font-medium text-xs", snapshot.medicare.present ? "font-mono" : "text-warning")}>
                  {snapshot.medicare.label}
                </p>
                {snapshot.medicare.value && (
                  <button
                    type="button"
                    onClick={copyMedicare}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    aria-label="Copy Medicare number"
                    title="Copy Medicare number"
                  >
                    {medicarecopied
                      ? <Check className="h-3 w-3 text-success" />
                      : <Copy className="h-3 w-3" />}
                  </button>
                )}
              </div>
              {snapshot.medicare.error && (
                <p className="mt-1 text-xs text-warning">{snapshot.medicare.error}</p>
              )}
              {snapshot.medicare.detailsLabel && (
                <p className="mt-1 text-xs text-muted-foreground">{snapshot.medicare.detailsLabel}</p>
              )}
            </div>
          </div>
          {requiresPrescribingIdentity && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
              <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Sex</p>
                <p className={cn("font-medium", !snapshot.sex.present && "text-warning")}>{snapshot.sex.label}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
            <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className={cn("font-medium", !snapshot.phone.present && "text-warning")}>{snapshot.phone.label}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
            <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className={cn("font-medium text-xs", !snapshot.email.present && "text-warning")}>{snapshot.email.label}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 sm:col-span-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className={cn("font-medium", !snapshot.address.present && "text-warning")}>{snapshot.address.label}</p>
            </div>
          </div>
        </div>
      </CardContent>}
    </Card>
  )
}
