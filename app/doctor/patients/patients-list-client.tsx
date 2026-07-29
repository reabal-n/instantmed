"use client"

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  MapPin,
  Phone,
  Search,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { DashboardPageHeader } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserCard } from "@/components/uix"
import { STAFF_DOCTOR_PATIENTS_HREF } from "@/lib/dashboard/routes"
import type {
  PatientDirectoryDegradedSource,
  PatientDirectoryProfile,
} from "@/lib/data/patient-directory"
import {
  buildPatientDirectoryHref,
  createPatientDirectoryNavigationCoordinator,
  type PatientDirectorySort,
} from "@/lib/data/patient-directory-sort"
import { findPotentialDuplicatePatients } from "@/lib/doctor/patient-snapshot"
import { calculateAge, formatDate } from "@/lib/format"
import { formatIntakeStatus } from "@/lib/format/intake"
import { requiresPrescribingIdentityForRequest } from "@/lib/request/prescribing-identity"
import { cn } from "@/lib/utils"

import { AddPatientDialog } from "./add-patient-dialog"

interface PatientsListClientProps {
  patients: PatientDirectoryProfile[]
  currentPage: number
  totalPages: number
  totalPatients: number | null
  collapsedDuplicateProfiles: number
  degradedSources?: PatientDirectoryDegradedSource[]
  initialSearchQuery?: string
  initialSort?: PatientDirectorySort
  baseHref?: string
  patientHrefBase?: string
  mergeAuditHref?: string
  showHeader?: boolean
  showAddPatientAction?: boolean
  title?: string
  description?: string
}

type ExceptionFilter = "all" | "needs_details" | "sync_needed" | "duplicates"

const CLOSED_REQUEST_STATUSES = new Set(["completed", "declined", "cancelled", "expired"])

function normalizeDirectorySearchQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function hasActivePrescribingRequest(patient: PatientDirectoryProfile): boolean {
  const request = patient.lastRequest
  if (!request || CLOSED_REQUEST_STATUSES.has(request.status)) return false

  return requiresPrescribingIdentityForRequest({
    category: request.category,
    serviceType: request.serviceType,
    subtype: request.subtype,
  })
}

function getPrescribingState(patient: PatientDirectoryProfile): {
  label: string
  detail: string
  tone: "neutral" | "success" | "warning"
} {
  if (!hasActivePrescribingRequest(patient)) {
    return { label: "Not needed", detail: "No active prescribing request", tone: "neutral" }
  }
  if (!patient.onboarding_completed) {
    return { label: "Needs details", detail: "Patient identity details block prescribing", tone: "warning" }
  }
  if (!patient.parchment_patient_id) {
    return { label: "Sync needed", detail: "Parchment patient sync is incomplete", tone: "warning" }
  }
  return { label: "Ready", detail: "Parchment synced", tone: "success" }
}

function PrescribingState({
  patient,
  requestHistoryUnavailable = false,
}: {
  patient: PatientDirectoryProfile
  requestHistoryUnavailable?: boolean
}) {
  if (requestHistoryUnavailable && !patient.lastRequest) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-warning" title="Request history could not be loaded">
        <span className="h-2 w-2 rounded-full bg-amber-500 ring-1 ring-inset ring-black/5" aria-hidden />
        Unavailable
      </span>
    )
  }
  const state = getPrescribingState(patient)
  return (
    <span className={cn(
      "inline-flex items-center gap-2 text-sm",
      state.tone === "neutral" ? "text-muted-foreground" : "text-foreground",
    )} title={state.detail}>
      <span className={cn(
        "h-2 w-2 rounded-full ring-1 ring-inset ring-black/5",
        state.tone === "success" && "bg-emerald-500",
        state.tone === "warning" && "bg-amber-500",
        state.tone === "neutral" && "bg-slate-400",
      )} aria-hidden />
      {state.label}
    </span>
  )
}

export function PatientsListClient({
  patients,
  currentPage,
  totalPages,
  totalPatients,
  collapsedDuplicateProfiles,
  degradedSources = [],
  initialSearchQuery = "",
  initialSort = "newest",
  baseHref = STAFF_DOCTOR_PATIENTS_HREF,
  patientHrefBase = STAFF_DOCTOR_PATIENTS_HREF,
  mergeAuditHref,
  showHeader = true,
  showAddPatientAction = true,
  title = "Patients",
  description = "Find a patient and continue their care.",
}: PatientsListClientProps) {
  const router = useRouter()
  const initialSearch = normalizeDirectorySearchQuery(initialSearchQuery)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [currentSort, setCurrentSort] = useState(initialSort)
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFilter>("all")
  const directoryUnavailable = degradedSources.includes("access") || degradedSources.includes("profiles")
  const requestHistoryUnavailable = degradedSources.includes("requests")
  const scriptHistoryUnavailable = degradedSources.includes("scripts")
  const countUnavailable = totalPatients === null || degradedSources.includes("count")
  const directoryNavigation = useMemo(
    () => createPatientDirectoryNavigationCoordinator({
      initialSort,
      navigate: (href) => router.replace(href, { scroll: false }),
    }),
    [initialSort, router],
  )

  useEffect(() => {
    setSearchQuery(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    setCurrentSort(initialSort)
    directoryNavigation.setSort(initialSort)
  }, [directoryNavigation, initialSort])

  useEffect(() => (
    () => directoryNavigation.cancelPendingSearch()
  ), [directoryNavigation])

  useEffect(() => {
    const normalizedSearch = normalizeDirectorySearchQuery(searchQuery)
    if (normalizedSearch === initialSearch) {
      directoryNavigation.cancelPendingSearch()
      return
    }

    directoryNavigation.scheduleSearch({
      baseHref,
      search: normalizedSearch,
    })

    return () => directoryNavigation.cancelPendingSearch()
  }, [baseHref, directoryNavigation, initialSearch, searchQuery])

  const duplicateGroups = useMemo(
    () => findPotentialDuplicatePatients(patients),
    [patients],
  )
  const duplicatePatientIds = useMemo(() => {
    const ids = new Set<string>()
    for (const patient of patients) {
      if ((patient.duplicate_profile_ids?.length ?? 0) > 0) ids.add(patient.id)
    }
    duplicateGroups.forEach((group) => group.patientIds.forEach((id) => ids.add(id)))
    return ids
  }, [duplicateGroups, patients])

  const needsDetailsCount = requestHistoryUnavailable ? 0 : patients.filter((patient) => (
    hasActivePrescribingRequest(patient) && !patient.onboarding_completed
  )).length
  const syncNeededCount = requestHistoryUnavailable ? 0 : patients.filter((patient) => (
    hasActivePrescribingRequest(patient) && patient.onboarding_completed && !patient.parchment_patient_id
  )).length

  const filteredPatients = useMemo(() => patients.filter((patient) => {
    if (exceptionFilter === "needs_details") {
      return hasActivePrescribingRequest(patient) && !patient.onboarding_completed
    }
    if (exceptionFilter === "sync_needed") {
      return hasActivePrescribingRequest(patient) && patient.onboarding_completed && !patient.parchment_patient_id
    }
    if (exceptionFilter === "duplicates") return duplicatePatientIds.has(patient.id)
    return true
  }), [duplicatePatientIds, exceptionFilter, patients])

  const firstDuplicatePatient = patients.find((patient) => duplicatePatientIds.has(patient.id)) ?? null
  const firstDuplicateHref = firstDuplicatePatient
    ? `${patientHrefBase}/${firstDuplicatePatient.id}`
    : null
  const hasExceptions = needsDetailsCount > 0 || syncNeededCount > 0 || duplicatePatientIds.size > 0

  const goToPage = (page: number) => {
    router.push(buildPatientDirectoryHref({
      baseHref,
      page,
      search: searchQuery,
      sort: currentSort,
    }))
  }

  const handleSortChange = (sort: PatientDirectorySort) => {
    setCurrentSort(sort)
    directoryNavigation.changeSort({
      baseHref,
      search: searchQuery,
      sort,
    })
  }

  return (
    <div className="space-y-4">
      {showHeader ? (
        <DashboardPageHeader
          title={title}
          description={description}
          actions={showAddPatientAction ? <AddPatientDialog /> : undefined}
        />
      ) : null}

      {degradedSources.length > 0 ? (
        <div
          className="rounded-xl border border-warning-border bg-warning-light px-4 py-3 text-sm text-warning"
          role="status"
        >
          <p className="font-medium">
            {directoryUnavailable ? "Patient directory unavailable" : "Some patient evidence is unavailable"}
          </p>
          <p>
            {directoryUnavailable
              ? "The patient source or clinical access scope could not be verified. Refresh before relying on an empty result."
              : "Visible profiles are preserved, but counts or recent request and script history may be incomplete. Refresh before relying on missing evidence."}
          </p>
        </div>
      ) : null}

      <Card className="rounded-xl border-border/50">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex w-full max-w-2xl flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  placeholder="Search name, email, or suburb…"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  startContent={<Search className="h-4 w-4 text-muted-foreground" />}
                  aria-label="Search patients"
                />
              </div>
              <div className="w-full sm:w-44">
                <Select
                  value={currentSort}
                  onValueChange={(value) => handleSortChange(value as PatientDirectorySort)}
                >
                  <SelectTrigger
                    aria-label="Sort patients"
                    className="min-h-11 bg-card"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {countUnavailable
                ? "Patient count unavailable"
                : `${totalPatients.toLocaleString("en-AU")} ${totalPatients === 1 ? "patient" : "patients"}`}
            </p>
          </div>

          {hasExceptions ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3" aria-label="Active patient exceptions on this page">
              <span className="mr-1 text-xs text-muted-foreground">On this page</span>
              <Button
                type="button"
                size="sm"
                variant={exceptionFilter === "all" ? "secondary" : "outline"}
                className="min-h-9"
                onClick={() => setExceptionFilter("all")}
              >
                All {patients.length}
              </Button>
              {needsDetailsCount > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant={exceptionFilter === "needs_details" ? "secondary" : "outline"}
                  className="min-h-9"
                  onClick={() => setExceptionFilter("needs_details")}
                >
                  {needsDetailsCount} need details
                </Button>
              ) : null}
              {syncNeededCount > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant={exceptionFilter === "sync_needed" ? "secondary" : "outline"}
                  className="min-h-9"
                  onClick={() => setExceptionFilter("sync_needed")}
                >
                  {syncNeededCount} sync needed
                </Button>
              ) : null}
              {duplicatePatientIds.size > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant={exceptionFilter === "duplicates" ? "secondary" : "outline"}
                  className="min-h-9"
                  onClick={() => setExceptionFilter("duplicates")}
                >
                  {duplicatePatientIds.size} duplicate review
                </Button>
              ) : null}
            </div>
          ) : null}

          {collapsedDuplicateProfiles > 0 ? (
            <p className="text-xs text-muted-foreground">
              {collapsedDuplicateProfiles} linked duplicate {collapsedDuplicateProfiles === 1 ? "profile" : "profiles"} collapsed on this page.
            </p>
          ) : null}

          {exceptionFilter === "duplicates" && firstDuplicateHref ? (
            <div className="flex flex-col gap-2 rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Confirm linked records inside the patient file before merging.
              </span>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="min-h-9 bg-white">
                  <Link href={firstDuplicateHref} prefetch={false}>Open flagged patient</Link>
                </Button>
                {mergeAuditHref ? (
                  <Button asChild variant="outline" size="sm" className="min-h-9 bg-white">
                    <Link href={mergeAuditHref} prefetch={false}>Merge audit</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-xl border-border/50">
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead scope="col">Patient</TableHead>
                  <TableHead scope="col">Contact</TableHead>
                  <TableHead scope="col">Recent work</TableHead>
                  <TableHead scope="col">Parchment sync</TableHead>
                  <TableHead scope="col" className="w-12"><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directoryUnavailable ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-warning">
                      Patient directory unavailable. Refresh to retry.
                    </TableCell>
                  </TableRow>
                ) : filteredPatients.length > 0 ? filteredPatients.map((patient) => {
                  const age = calculateAge(patient.date_of_birth)
                  const patientHref = `${patientHrefBase}/${patient.id}`
                  const isDuplicate = duplicatePatientIds.has(patient.id)
                  return (
                    <TableRow key={patient.id} className={cn(isDuplicate && "bg-warning-light/20")}>
                      <TableCell>
                        <Link href={patientHref} prefetch={false} className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <UserCard
                            name={patient.full_name}
                            description={age !== null ? `${age} years old` : "Age not recorded"}
                            size="sm"
                          />
                          {isDuplicate ? (
                            <Badge variant="warning" size="sm" className="mt-1">Duplicate review</Badge>
                          ) : null}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" aria-hidden />
                            {patient.phone || "Not provided"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" aria-hidden />
                            {[patient.suburb, patient.state].filter(Boolean).join(", ") || "Not provided"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          {patient.lastRequest ? (
                            <div className="flex items-start gap-1.5 text-sm">
                              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                              <span>
                                <span className="font-medium text-foreground">{patient.lastRequest.serviceShortLabel}</span>
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  {formatIntakeStatus(patient.lastRequest.status)} · {formatDate(patient.lastRequest.createdAt)}
                                </span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {requestHistoryUnavailable ? "Request history unavailable" : "No requests"}
                            </span>
                          )}
                          {patient.lastScript ? (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="max-w-[260px] truncate">{patient.lastScript.label} · {formatDate(patient.lastScript.sentAt ?? patient.lastScript.createdAt)}</span>
                            </div>
                          ) : scriptHistoryUnavailable ? (
                            <span className="text-xs text-muted-foreground">Script history unavailable</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PrescribingState
                          patient={patient}
                          requestHistoryUnavailable={requestHistoryUnavailable}
                        />
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon" className="h-11 w-11">
                          <Link href={patientHref} prefetch={false} aria-label={`Open ${patient.full_name}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No patients match this view.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y divide-border/60 md:hidden">
            {directoryUnavailable ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-warning">
                <AlertTriangle className="h-6 w-6" />
                Patient directory unavailable. Refresh to retry.
              </div>
            ) : filteredPatients.length > 0 ? filteredPatients.map((patient) => {
              const age = calculateAge(patient.date_of_birth)
              const patientHref = `${patientHrefBase}/${patient.id}`
              const isDuplicate = duplicatePatientIds.has(patient.id)
              return (
                <Link
                  key={patient.id}
                  href={patientHref}
                  prefetch={false}
                  className={cn(
                    "block min-h-11 space-y-2 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                    isDuplicate && "bg-warning-light/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{patient.full_name}</p>
                      <p className="text-xs text-muted-foreground">{age !== null ? `${age} years old` : "Age not recorded"}</p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {patient.lastRequest ? (
                      <span className="text-sm text-foreground">
                        {patient.lastRequest.serviceShortLabel}
                        <span className="ml-1 text-xs text-muted-foreground">{formatIntakeStatus(patient.lastRequest.status)}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {requestHistoryUnavailable ? "Request history unavailable" : "No requests"}
                      </span>
                    )}
                    <PrescribingState
                      patient={patient}
                      requestHistoryUnavailable={requestHistoryUnavailable}
                    />
                    {isDuplicate ? <Badge variant="warning" size="sm">Duplicate review</Badge> : null}
                  </div>
                </Link>
              )
            }) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="h-6 w-6 opacity-60" />
                No patients match this view.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
          <p className="text-sm tabular-nums text-muted-foreground">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
