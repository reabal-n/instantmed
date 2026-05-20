"use client"

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  MapPin,
  Phone,
  Pill,
  Search,
  Users,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { DashboardPageHeader } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserCard } from "@/components/uix"
import { STAFF_DOCTOR_PATIENTS_HREF } from "@/lib/dashboard/routes"
import type { PatientDirectoryProfile, PatientDirectorySort } from "@/lib/data/patient-directory"
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
  totalPatients: number
  collapsedDuplicateProfiles: number
  currentSort?: PatientDirectorySort
  initialSearchQuery?: string
  baseHref?: string
  patientHrefBase?: string
  mergeAuditHref?: string
  showHeader?: boolean
  showAddPatientAction?: boolean
  title?: string
  description?: string
}

type ProfileFilter = "all" | "complete" | "incomplete" | "duplicates"
type ServiceFilter = "all" | "medical_certificate" | "repeat_script" | "consult" | "ed" | "hair_loss" | "no_request"
type SyncFilter = "all" | "synced" | "not_synced"

const CLOSED_REQUEST_STATUSES = new Set(["completed", "declined", "cancelled", "expired"])

function normalizeDirectorySearchQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function buildPatientDirectoryHref(
  baseHref: string,
  page: number,
  sort: PatientDirectorySort,
  searchQuery: string,
): string {
  const params = new URLSearchParams()
  const normalizedSearch = normalizeDirectorySearchQuery(searchQuery)
  if (page > 1) params.set("page", String(page))
  if (sort !== "recent_request") params.set("sort", sort)
  if (normalizedSearch) params.set("q", normalizedSearch)
  const query = params.toString()
  return query ? `${baseHref}?${query}` : baseHref
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

function getPatientServiceFilter(patient: PatientDirectoryProfile): ServiceFilter {
  const request = patient.lastRequest
  if (!request) return "no_request"

  const markers = [
    request.category,
    request.subtype,
    request.serviceType,
    request.serviceLabel,
    request.serviceShortLabel,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase())

  if (markers.some((value) => value.includes("hair"))) return "hair_loss"
  if (markers.some((value) => value === "ed" || value.includes("erectile"))) return "ed"
  if (markers.some((value) => value.includes("medical_certificate") || (value.includes("med") && value.includes("cert")))) {
    return "medical_certificate"
  }
  if (markers.some((value) => value.includes("repeat") || value.includes("prescription") || value.includes("script") || value.includes("rx"))) {
    return "repeat_script"
  }
  return "consult"
}

export function PatientsListClient({
  patients,
  currentPage,
  totalPages,
  totalPatients,
  collapsedDuplicateProfiles,
  currentSort = "recent_request",
  initialSearchQuery = "",
  baseHref = STAFF_DOCTOR_PATIENTS_HREF,
  patientHrefBase = STAFF_DOCTOR_PATIENTS_HREF,
  mergeAuditHref,
  showHeader = true,
  showAddPatientAction = true,
  title = "Patient Directory",
  description = "View and manage all registered patients",
}: PatientsListClientProps) {
  const router = useRouter()
  const initialSearch = normalizeDirectorySearchQuery(initialSearchQuery)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all")
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all")
  const [syncFilter, setSyncFilter] = useState<SyncFilter>("all")

  const buildDirectoryHref = (page: number, sort: PatientDirectorySort = currentSort) => {
    return buildPatientDirectoryHref(baseHref, page, sort, searchQuery)
  }

  useEffect(() => {
    setSearchQuery(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    const normalizedSearch = normalizeDirectorySearchQuery(searchQuery)
    if (normalizedSearch === initialSearch) return

    const handle = window.setTimeout(() => {
      router.replace(buildPatientDirectoryHref(baseHref, 1, currentSort, normalizedSearch), { scroll: false })
    }, 350)

    return () => window.clearTimeout(handle)
  }, [baseHref, currentSort, initialSearch, router, searchQuery])

  const visibleBasePatients = useMemo(() => {
    const normalizedSearch = normalizeDirectorySearchQuery(searchQuery).toLowerCase()
    const phoneSearch = normalizedSearch.replace(/\D/g, "")

    return patients.filter((patient) => {
      const matchesSearch =
        !normalizedSearch ||
        patient.full_name.toLowerCase().includes(normalizedSearch) ||
        patient.email?.toLowerCase().includes(normalizedSearch) ||
        patient.suburb?.toLowerCase().includes(normalizedSearch) ||
        (phoneSearch.length >= 3 && patient.phone?.replace(/\D/g, "").includes(phoneSearch))

      const matchesState = stateFilter === "all" || patient.state === stateFilter
      const matchesService = serviceFilter === "all" || getPatientServiceFilter(patient) === serviceFilter
      const matchesSync = syncFilter === "all"
        || (syncFilter === "synced"
          ? Boolean(patient.parchment_patient_id)
          : hasActivePrescribingRequest(patient) && !patient.parchment_patient_id)

      return matchesSearch && matchesState && matchesService && matchesSync
    })
  }, [patients, searchQuery, stateFilter, serviceFilter, syncFilter])

  const states = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]
  const activePrescribingPatients = patients.filter(hasActivePrescribingRequest)
  const activePrescribingCount = activePrescribingPatients.length
  const activeNeedsDetails = activePrescribingPatients.filter((p) => !p.onboarding_completed).length
  const activeSyncedPatients = activePrescribingPatients.filter((p) => p.parchment_patient_id).length
  const activeNotSynced = activePrescribingCount - activeSyncedPatients
  const duplicateGroups = useMemo(() => findPotentialDuplicatePatients(visibleBasePatients), [visibleBasePatients])
  const duplicatePatientIds = useMemo(() => {
    const ids = new Set<string>()
    duplicateGroups.forEach((group) => group.patientIds.forEach((id) => ids.add(id)))
    return ids
  }, [duplicateGroups])
  const filteredPatients = useMemo(() => {
    return visibleBasePatients.filter((patient) => {
      if (profileFilter === "complete") return patient.onboarding_completed
      if (profileFilter === "incomplete") return hasActivePrescribingRequest(patient) && !patient.onboarding_completed
      if (profileFilter === "duplicates") return duplicatePatientIds.has(patient.id)
      return true
    })
  }, [visibleBasePatients, profileFilter, duplicatePatientIds])
  const firstDuplicatePatient = useMemo(
    () => filteredPatients.find((patient) => duplicatePatientIds.has(patient.id)) ?? null,
    [filteredPatients, duplicatePatientIds],
  )
  const firstDuplicateHref = firstDuplicatePatient ? `${patientHrefBase}/${firstDuplicatePatient.id}` : null
  const summaryItems = [
    {
      label: "Patients",
      value: totalPatients,
      detail: collapsedDuplicateProfiles > 0 ? `${patients.length} shown after merge view` : `${patients.length} on this page`,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "Prescribing",
      value: activePrescribingCount,
      detail: "Needs prescribing identity",
      icon: CheckCircle,
      tone: "text-success",
    },
    {
      label: "Needs details",
      value: activeNeedsDetails,
      detail: activeNeedsDetails > 0 ? "Blocks active prescribing" : "No active blocker",
      icon: XCircle,
      tone: "text-warning",
    },
    {
      label: "Parchment sync",
      value: activeSyncedPatients,
      detail: activeNotSynced > 0 ? `${activeNotSynced} active not synced` : "No active sync blocker",
      icon: Pill,
      tone: "text-success",
    },
  ]

  return (
    <div className="space-y-6">
      {showHeader && (
        <DashboardPageHeader
          title={title}
          description={description}
          actions={showAddPatientAction ? <AddPatientDialog /> : undefined}
        />
      )}

      {/* Directory controls */}
      <Card className="rounded-xl border-border/50">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search by name, suburb, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger
                  className="w-[132px] rounded-xl bg-white dark:bg-card border-border/50"
                  aria-label="Filter patients by state"
                >
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={profileFilter} onValueChange={(value) => setProfileFilter(value as ProfileFilter)}>
                <SelectTrigger
                  className="w-[156px] rounded-xl bg-white dark:bg-card border-border/50"
                  aria-label="Filter patients by status"
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="complete">Ready</SelectItem>
                  <SelectItem value="incomplete">Needs details</SelectItem>
                  <SelectItem value="duplicates">Duplicates</SelectItem>
                </SelectContent>
              </Select>

              <Select value={serviceFilter} onValueChange={(value) => setServiceFilter(value as ServiceFilter)}>
                <SelectTrigger
                  className="w-[156px] rounded-xl bg-white dark:bg-card border-border/50"
                  aria-label="Filter patients by service"
                >
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  <SelectItem value="medical_certificate">Med cert</SelectItem>
                  <SelectItem value="repeat_script">Repeat Rx</SelectItem>
                  <SelectItem value="consult">Consult</SelectItem>
                  <SelectItem value="ed">ED</SelectItem>
                  <SelectItem value="hair_loss">Hair loss</SelectItem>
                  <SelectItem value="no_request">No request</SelectItem>
                </SelectContent>
              </Select>

              <Select value={syncFilter} onValueChange={(value) => setSyncFilter(value as SyncFilter)}>
                <SelectTrigger
                  className="w-[156px] rounded-xl bg-white dark:bg-card border-border/50"
                  aria-label="Filter patients by Parchment sync"
                >
                  <SelectValue placeholder="Sync" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any sync</SelectItem>
                  <SelectItem value="synced">Synced</SelectItem>
                  <SelectItem value="not_synced">Sync needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Compact stat strip (2026-05-21). Four-card 2x2 grid replaced
              with a single horizontal row of metric+value pairs. Saves
              ~80px vertical above the table; the detail copy now lives
              in title attributes so the strip stays scannable. */}
          <div
            className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/50 bg-muted/25 px-3 py-2"
            aria-label="Directory summary"
          >
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 min-w-0"
                title={item.detail}
              >
                <item.icon className={`h-3.5 w-3.5 shrink-0 ${item.tone}`} aria-hidden />
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredPatients.length} of {patients.length} on this page ({totalPatients} total profiles)
            {collapsedDuplicateProfiles > 0 && (
              <span> · {collapsedDuplicateProfiles} duplicate profile {collapsedDuplicateProfiles === 1 ? "record" : "records"} collapsed on this page</span>
            )}
          </div>

          {duplicateGroups.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/25 px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                <div>
                  <p>
                    {duplicateGroups.length} duplicate {duplicateGroups.length === 1 ? "group" : "groups"} available for review.
                  </p>
                  {profileFilter === "duplicates" ? (
                    <p className="mt-0.5">Open the flagged patient. Merge only when the patient file shows linked profiles.</p>
                  ) : null}
                </div>
              </div>
              {firstDuplicateHref ? (
                <div className="flex flex-wrap gap-2">
                  {profileFilter !== "duplicates" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-border/50 bg-white text-muted-foreground hover:border-warning-border hover:bg-warning-light hover:text-warning"
                      onClick={() => setProfileFilter("duplicates")}
                    >
                      Show duplicate rows
                    </Button>
                  ) : null}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 border-border/50 bg-white text-muted-foreground hover:border-warning-border hover:bg-warning-light hover:text-warning"
                  >
                    <Link href={firstDuplicateHref} prefetch={false}>
                      Open flagged patient
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  {mergeAuditHref && profileFilter === "duplicates" ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 border-border/50 bg-white text-muted-foreground hover:border-warning-border hover:bg-warning-light hover:text-warning"
                    >
                      <Link href={mergeAuditHref} prefetch={false}>
                        Merge audit
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border-border/50 overflow-hidden">
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead scope="col">Patient</TableHead>
                  <TableHead scope="col">Contact</TableHead>
                  <TableHead scope="col">Location</TableHead>
                  <TableHead scope="col">Last request</TableHead>
                  <TableHead scope="col">Last script</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Parchment</TableHead>
                  <TableHead scope="col">Joined</TableHead>
                  <TableHead scope="col" className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => {
                    const age = calculateAge(patient.date_of_birth)
                    const linkedProfileCount = patient.duplicate_profile_ids?.length ?? 0
                    const patientHref = `${patientHrefBase}/${patient.id}`
                    const isDuplicateCandidate = duplicatePatientIds.has(patient.id)
                    const isFirstDuplicateCandidate = firstDuplicatePatient?.id === patient.id
                    const hasPrescribingWork = hasActivePrescribingRequest(patient)

                    return (
                      <TableRow
                        key={patient.id}
                        id={isFirstDuplicateCandidate ? "patient-duplicate-row" : undefined}
                        className={cn(
                          "cursor-pointer group transition-colors duration-200 hover:bg-muted/50",
                          isDuplicateCandidate && "bg-warning-light/25",
                        )}
                      >
                        <TableCell>
                          <Link href={patientHref} className="block">
                            <UserCard
                              name={patient.full_name}
                              description={age !== null ? `${age} years old` : "Age N/A"}
                              size="sm"
                            />
                            {(isDuplicateCandidate || linkedProfileCount > 0) && (
                              <Badge
                                variant={isDuplicateCandidate ? "warning" : "secondary"}
                                size="sm"
                                className="mt-1"
                              >
                                {isDuplicateCandidate ? <AlertTriangle className="h-3 w-3" /> : null}
                                {isDuplicateCandidate
                                  ? `Duplicate review${linkedProfileCount > 0 ? ` · ${linkedProfileCount} linked` : ""}`
                                  : `${linkedProfileCount} linked profile${linkedProfileCount === 1 ? "" : "s"}`}
                              </Badge>
                            )}
                            {patient.parchment_patient_id && (
                              <Badge
                                variant="outline"
                                size="sm"
                                className="mt-1 bg-info-light text-info border-info-border"
                              >
                                Parchment synced
                              </Badge>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {patient.phone ? (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not provided</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {patient.suburb && patient.state ? (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {patient.suburb}, {patient.state}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not provided</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {patient.lastRequest ? (
                            <div className="min-w-[150px] space-y-1">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                {patient.lastRequest.serviceShortLabel}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{formatIntakeStatus(patient.lastRequest.status)}</span>
                                <span>·</span>
                                <span>{formatDate(patient.lastRequest.createdAt)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No requests</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {patient.lastScript ? (
                            <div className="min-w-[145px] space-y-1">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="max-w-[130px] truncate">{patient.lastScript.label}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{patient.lastScript.status.replace("_", " ")}</span>
                                <span>·</span>
                                <span>{formatDate(patient.lastScript.sentAt ?? patient.lastScript.createdAt)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No script</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {patient.onboarding_completed ? (
                            <span className="inline-flex items-center gap-2 text-sm text-foreground">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-inset ring-black/5" aria-hidden />
                              Complete
                            </span>
                          ) : hasPrescribingWork ? (
                            <span className="inline-flex items-center gap-2 text-sm text-foreground">
                              <span className="h-2 w-2 rounded-full bg-amber-500 ring-1 ring-inset ring-black/5" aria-hidden />
                              Needs details
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="h-2 w-2 rounded-full bg-slate-400 ring-1 ring-inset ring-black/5" aria-hidden />
                              Partial
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {patient.parchment_patient_id ? (
                            <span className="inline-flex items-center gap-2 text-sm text-foreground">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-inset ring-black/5" aria-hidden />
                              Synced
                            </span>
                          ) : hasPrescribingWork ? (
                            <span className="inline-flex items-center gap-2 text-sm text-foreground">
                              <span className="h-2 w-2 rounded-full bg-amber-500 ring-1 ring-inset ring-black/5" aria-hidden />
                              Sync needed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="h-2 w-2 rounded-full bg-slate-400 ring-1 ring-inset ring-black/5" aria-hidden />
                              Not needed
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(patient.created_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link href={patientHref}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8 opacity-50" />
                        <p>No patients found matching your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => router.push(buildDirectoryHref(currentPage - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => router.push(buildDirectoryHref(currentPage + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
