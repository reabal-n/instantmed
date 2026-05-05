"use client"

import {
  AlertCircle,
  CheckCircle,
  Clipboard,
  Loader2,
  Pill,
  RotateCcw,
  ShieldCheck,
  UserPlus,
} from "lucide-react"
import type { ComponentType, ReactNode } from "react"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  type ParchmentConformanceLifecycle,
  type ParchmentConformanceStep,
  type ParchmentConformanceUserForm,
  type ParchmentConformanceUserStepResult,
  runParchmentConformanceUserStepAction,
} from "@/app/actions/parchment"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface ParchmentConformanceClientProps {
  seed: string
}

type LifecycleState = {
  form: ParchmentConformanceUserForm
  userId: string
  events: ParchmentConformanceUserStepResult[]
  error: string | null
}

type PendingKey = `${ParchmentConformanceLifecycle}:${ParchmentConformanceStep}` | null

const lifecycleCopy = {
  prescriber: {
    title: "Prescriber Management",
    description: "Create, update, disable, and re-enable a sandbox prescriber record.",
    icon: Pill,
  },
  admin: {
    title: "Admin User Management",
    description: "Create, update details and role access, disable, and re-enable a sandbox admin user.",
    icon: ShieldCheck,
  },
} satisfies Record<ParchmentConformanceLifecycle, {
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
}>

const recordingGuidance = [
  {
    title: "Record Prescriber/Admin in Parchment",
    body: "Primary evidence belongs in Parchment user management. Use this helper as supporting evidence only when you need to prove the integration API can execute the same lifecycle.",
  },
  {
    title: "Record iframe in InstantMed",
    body: "Open the doctor prescribing flow, launch Parchment inside the embedded frame, and keep the browser on InstantMed while the prescription is created.",
  },
  {
    title: "Record webhook across both systems",
    body: "Create the prescription in Parchment, then show InstantMed receiving and processing the prescription event without manual status changes.",
  },
] satisfies Array<{ title: string; body: string }>

function defaultForm(lifecycle: ParchmentConformanceLifecycle, seed: string): ParchmentConformanceUserForm {
  const suffix = `${seed}-${lifecycle}`
  const isPrescriber = lifecycle === "prescriber"

  return {
    givenName: "Conformance",
    familyName: isPrescriber ? "Prescriber" : "Admin",
    email: `me+parchment-${suffix}@reabal.ai`,
    partnerUserId: `instantmed-${suffix}`,
    phone: isPrescriber ? "0412345678" : "0412345679",
    accessRoles: isPrescriber ? ["provider"] : ["admin"],
    updateGivenName: "Conformance Updated",
    updateFamilyName: isPrescriber ? "Prescriber" : "Admin",
    updatePhone: isPrescriber ? "0412345680" : "0412345681",
    updateAccessRoles: ["admin", "receptionist"],
    title: "Dr",
    dateOfBirth: "1980-03-15",
    sex: "F",
    hpiiNumber: "8003614900029560",
    prescriberType: "M",
    prescriberNumber: "1234567",
    qualifications: "MBBS",
    providerNumber: "1234567",
    ahpraNumber: "MED0000000001",
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn("h-9", mono && "font-mono text-xs")}
      />
    </div>
  )
}

function StepButton({
  step,
  children,
  disabled,
  pending,
  onClick,
}: {
  step: number
  children: ReactNode
  disabled?: boolean
  pending?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={step === 1 ? "default" : "outline"}
      size="sm"
      disabled={disabled || pending}
      onClick={onClick}
      className="justify-start"
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs">
          {step}
        </span>
      )}
      {children}
    </Button>
  )
}

function EventLog({ events }: { events: ParchmentConformanceUserStepResult[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
        Results will appear here while recording.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div
          key={`${event.label}-${event.requestId || index}`}
          className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                <p className="text-sm font-medium text-foreground">{event.label}</p>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {event.message || "Parchment accepted the request"}
              </p>
              {event.warning && (
                <p className="mt-1 text-xs text-warning">{event.warning}</p>
              )}
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              {event.statusCode && <p>{event.statusCode}</p>}
              {event.requestId && <p className="font-mono">{event.requestId}</p>}
            </div>
          </div>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            user_id: {event.userId}
          </p>
          {event.accessRoles && event.accessRoles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {event.accessRoles.map((role) => (
                <Badge key={role} variant="outline" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function ParchmentConformanceClient({ seed }: ParchmentConformanceClientProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingKey, setPendingKey] = useState<PendingKey>(null)
  const [state, setState] = useState<Record<ParchmentConformanceLifecycle, LifecycleState>>({
    prescriber: {
      form: defaultForm("prescriber", seed),
      userId: "",
      events: [],
      error: null,
    },
    admin: {
      form: defaultForm("admin", seed),
      userId: "",
      events: [],
      error: null,
    },
  })

  const startedAt = useMemo(() => new Date().toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }), [])

  const updateForm = (
    lifecycle: ParchmentConformanceLifecycle,
    key: keyof ParchmentConformanceUserForm,
    value: string,
  ) => {
    setState((current) => ({
      ...current,
      [lifecycle]: {
        ...current[lifecycle],
        form: {
          ...current[lifecycle].form,
          [key]: value,
        },
      },
    }))
  }

  const resetLifecycle = (lifecycle: ParchmentConformanceLifecycle) => {
    const nextSeed = Date.now().toString(36)
    setState((current) => ({
      ...current,
      [lifecycle]: {
        form: defaultForm(lifecycle, nextSeed),
        userId: "",
        events: [],
        error: null,
      },
    }))
  }

  const copyUserId = async (userId: string) => {
    if (!userId) return
    try {
      await navigator.clipboard.writeText(userId)
      toast.success("Parchment user_id copied")
    } catch {
      toast.error("Could not copy user_id")
    }
  }

  const runStep = (lifecycle: ParchmentConformanceLifecycle, step: ParchmentConformanceStep) => {
    const key: PendingKey = `${lifecycle}:${step}`
    setPendingKey(key)

    startTransition(async () => {
      const current = state[lifecycle]
      const result = await runParchmentConformanceUserStepAction({
        lifecycle,
        step,
        userId: current.userId,
        user: current.form,
      })

      setState((latest) => {
        const previous = latest[lifecycle]
        if (!result.success) {
          return {
            ...latest,
            [lifecycle]: {
              ...previous,
              error: result.error || "Parchment step failed",
            },
          }
        }

        return {
          ...latest,
          [lifecycle]: {
            ...previous,
            userId: result.userId || previous.userId,
            events: [...previous.events, ...(result.steps || [])],
            error: null,
          },
        }
      })

      if (result.success) {
        toast.success("Parchment step completed")
      } else {
        toast.error(result.error || "Parchment step failed")
      }
      setPendingKey(null)
    })
  }

  const renderLifecycle = (lifecycle: ParchmentConformanceLifecycle) => {
    const item = state[lifecycle]
    const copy = lifecycleCopy[lifecycle]
    const Icon = copy.icon
    const isPrescriber = lifecycle === "prescriber"

    return (
      <Card className="rounded-xl border-border/50">
        <CardHeader className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{copy.title}</CardTitle>
                <CardDescription className="mt-1">{copy.description}</CardDescription>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => resetLifecycle(lifecycle)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-5 pb-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Given name"
              value={item.form.givenName}
              onChange={(value) => updateForm(lifecycle, "givenName", value)}
            />
            <Field
              label="Family name"
              value={item.form.familyName}
              onChange={(value) => updateForm(lifecycle, "familyName", value)}
            />
            <Field
              label="Email"
              value={item.form.email}
              onChange={(value) => updateForm(lifecycle, "email", value)}
            />
            <Field
              label="Partner user ID"
              value={item.form.partnerUserId}
              onChange={(value) => updateForm(lifecycle, "partnerUserId", value)}
              mono
            />
            <Field
              label="Updated given name"
              value={item.form.updateGivenName || ""}
              onChange={(value) => updateForm(lifecycle, "updateGivenName", value)}
            />
            <Field
              label="Updated phone"
              value={item.form.updatePhone || ""}
              onChange={(value) => updateForm(lifecycle, "updatePhone", value)}
            />
          </div>

          {isPrescriber && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Prescriber test data</p>
                <Badge variant="outline">provider</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Date of birth"
                  value={item.form.dateOfBirth || ""}
                  onChange={(value) => updateForm(lifecycle, "dateOfBirth", value)}
                />
                <Field
                  label="Sex"
                  value={item.form.sex || ""}
                  onChange={(value) => updateForm(lifecycle, "sex", value)}
                />
                <Field
                  label="HPII number"
                  value={item.form.hpiiNumber || ""}
                  onChange={(value) => updateForm(lifecycle, "hpiiNumber", value)}
                  mono
                />
                <Field
                  label="Prescriber number"
                  value={item.form.prescriberNumber || ""}
                  onChange={(value) => updateForm(lifecycle, "prescriberNumber", value)}
                  mono
                />
                <Field
                  label="Prescriber type"
                  value={item.form.prescriberType || ""}
                  onChange={(value) => updateForm(lifecycle, "prescriberType", value)}
                />
                <Field
                  label="Qualifications"
                  value={item.form.qualifications || ""}
                  onChange={(value) => updateForm(lifecycle, "qualifications", value)}
                />
                <Field
                  label="Provider number"
                  value={item.form.providerNumber || ""}
                  onChange={(value) => updateForm(lifecycle, "providerNumber", value)}
                  mono
                />
                <Field
                  label="AHPRA number"
                  value={item.form.ahpraNumber || ""}
                  onChange={(value) => updateForm(lifecycle, "ahpraNumber", value)}
                  mono
                />
              </div>
            </div>
          )}

          {!isPrescriber && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">Role access sequence</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">Create: admin</Badge>
                <Badge variant="outline">Update: admin + receptionist</Badge>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border/50 bg-background px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Current Parchment user_id</p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">
                  {item.userId || "Not created yet"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!item.userId}
                onClick={() => copyUserId(item.userId)}
                aria-label="Copy user ID"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {item.error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive-border bg-destructive-light px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{item.error}</p>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <StepButton
              step={1}
              pending={isPending && pendingKey === `${lifecycle}:create`}
              onClick={() => runStep(lifecycle, "create")}
            >
              Create
            </StepButton>
            <StepButton
              step={2}
              disabled={!item.userId}
              pending={isPending && pendingKey === `${lifecycle}:update`}
              onClick={() => runStep(lifecycle, "update")}
            >
              Update
            </StepButton>
            <StepButton
              step={3}
              disabled={!item.userId}
              pending={isPending && pendingKey === `${lifecycle}:disable`}
              onClick={() => runStep(lifecycle, "disable")}
            >
              Disable
            </StepButton>
            <StepButton
              step={4}
              disabled={!item.userId}
              pending={isPending && pendingKey === `${lifecycle}:enable`}
              onClick={() => runStep(lifecycle, "enable")}
            >
              Re-enable
            </StepButton>
          </div>

          <EventLog events={item.events} />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary">
              Sandbox evidence
            </Badge>
            <span className="text-xs text-muted-foreground">{startedAt}</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Parchment conformance recording
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            User-management uploads should be recorded in Parchment. This page is for sandbox lifecycle support and request evidence if Parchment asks for integration-side proof.
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <span>Each reset creates a fresh sandbox email and partner user ID.</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {recordingGuidance.map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-border/50 bg-background px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {renderLifecycle("prescriber")}
        {renderLifecycle("admin")}
      </div>
    </div>
  )
}
