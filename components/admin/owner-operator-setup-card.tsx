import { CheckCircle2, CircleAlert, ExternalLink, FileSignature, KeyRound, Pill, Power, UserCheck } from "lucide-react"
import Link from "next/link"
import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ADMIN_DOCTOR_IDENTITY_HREF, ADMIN_PARCHMENT_OPS_HREF } from "@/lib/dashboard/routes"
import type { DoctorIdentity } from "@/lib/data/doctor-identity"
import { cn } from "@/lib/utils"

interface OwnerOperatorSetupCardProps {
  doctorIdentity: DoctorIdentity | null
  doctorAvailable: boolean
  parchmentUserId: string | null
}

interface SetupItem {
  label: string
  detail: string
  complete: boolean | null
  icon: React.ComponentType<{ className?: string }>
}

function SetupChip({ item }: { item: SetupItem }) {
  const Icon = item.icon
  const complete = item.complete === true
  const needsAction = item.complete === false

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2",
        complete && "border-success-border bg-success-light/35",
        needsAction && "border-warning-border bg-warning-light/35",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
          complete && "bg-success-light text-success",
          needsAction && "bg-warning-light text-warning",
        )}
      >
        {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground">{item.label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{item.detail}</p>
      </div>
    </div>
  )
}

export function OwnerOperatorSetupCard({
  doctorIdentity,
  doctorAvailable,
  parchmentUserId,
}: OwnerOperatorSetupCardProps) {
  const setupItems: SetupItem[] = [
    {
      label: "Availability",
      detail: doctorAvailable ? "Available for review" : "Paused",
      complete: doctorAvailable,
      icon: Power,
    },
    {
      label: "Provider number",
      detail: doctorIdentity?.provider_number ? "Set" : "Required for certificates",
      complete: Boolean(doctorIdentity?.provider_number),
      icon: UserCheck,
    },
    {
      label: "AHPRA",
      detail: doctorIdentity?.ahpra_number ? "Set" : "Required",
      complete: Boolean(doctorIdentity?.ahpra_number),
      icon: UserCheck,
    },
    {
      label: "Signature",
      detail: doctorIdentity?.signature_storage_path ? "Uploaded" : "Needed for certificates",
      complete: Boolean(doctorIdentity?.signature_storage_path),
      icon: FileSignature,
    },
    {
      label: "Parchment",
      detail: parchmentUserId ? "Prescriber linked" : "Link before eScripts",
      complete: Boolean(parchmentUserId),
      icon: Pill,
    },
    {
      label: "MFA",
      detail: "Check in identity settings",
      complete: null,
      icon: KeyRound,
    },
  ]
  const blockingItems = setupItems.filter((item) => item.complete === false)

  return (
    <Card className="shrink-0 border-border/60 bg-card px-4 py-3 shadow-sm shadow-primary/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Owner setup</p>
            {blockingItems.length > 0 ? (
              <Badge variant="secondary" className="border-warning-border bg-warning-light text-warning">
                {blockingItems.length} to finish
              </Badge>
            ) : (
              <Badge className="border-success-border bg-success-light text-success">
                Ready
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Admin controls and doctor identity stay in this cockpit. No admin controls are exposed to future doctors.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {blockingItems.some((item) => item.label === "Parchment") && (
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href={ADMIN_PARCHMENT_OPS_HREF}>
                Link Parchment
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <Button asChild size="sm" className="h-8 text-xs">
            <Link href={ADMIN_DOCTOR_IDENTITY_HREF}>
              Finish setup
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {setupItems.map((item) => (
          <SetupChip key={item.label} item={item} />
        ))}
      </div>

      {!doctorAvailable && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-warning-border bg-warning-light/45 px-3 py-2 text-xs text-warning">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Availability is paused, so the embedded queue may look clear even while paid cases exist.
        </div>
      )}
    </Card>
  )
}
