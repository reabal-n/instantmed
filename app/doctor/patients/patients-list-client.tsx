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
import { useMemo, useState } from "react"

import { DashboardPageHeader } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserCard } from "@/components/uix"
import type { PatientDirectoryProfile, PatientDirectorySort } from "@/lib/data/patient-directory"
import { findPotentialDuplicatePatients } from "@/lib/doctor/patient-snapshot"
import { calculateAge, formatDate } from "@/lib/format"
import { formatIntakeStatus } from "@/lib/format/intake"
import { cn } from "@/lib/utils"

import { AddPatientDialog } from "./add-patient-dialog"

interface PatientsListClientProps {
  patients: PatientDirectoryProfile[]
  currentPage: number
  totalPages: number
  totalPatients: number
  rawPatientProfiles: number
  collapsedDuplicateProfiles: number
  currentSort?: PatientDirectorySort
  baseHref?: string
  patientHrefBase?: string
  showHeader?: boolean
  showAddPatientAction?: boolean
  title?: string
  description?: string
}

type ProfileFilter = "all" | "complete" | "incomplete" | "duplicates"

export function PatientsListClient({
  patients,
  currentPage,
  totalPages,
  totalPatients,
  rawPatientProfiles,
  collapsedDuplicateProfiles,
  currentSort = "recent_request",
  baseHref = "/doctor/patients",
  patientHrefBase = "/doctor/patients",
  showHeader = true,
  showAddPatientAction = true,
  title = "Patient Directory",
  description = "View and manage all registered patients",
}: PatientsListClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all")

  const buildDirectoryHref = (page: number, sort: PatientDirectorySort = currentSort) => {
    const params = new URLSearchParams()
    if (page > 1) params.set("page", String(page))
    if (sort !== "recent_request") params.set("sort", sort)
    const query = params.toString()
    return query ? `${baseHref}?${query}` : baseHref
  }

  const handleSortChange = (value: PatientDirectorySort) => {
    router.push(buildDirectoryHref(1, value))
  }

  const searchablePatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.suburb?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone?.includes(searchQuery)

      const matchesState = stateFilter === "all" || patient.state === stateFilter

      return matchesSearch && matchesState
    })
  }, [patients, searchQuery, stateFilter])

  const states = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]
  const sortOptions: Array<{ value: PatientDirectorySort; label: string }> = [
    { value: "recent_request", label: "Most recent request" },
    { value: "request_type", label: "Request type" },
    { value: "recent_script", label: "Last script" },
    { value: "name", label: "Name" },
    { value: "joined", label: "Joined" },
  ]
  const parchmentSyncedPatients = patients.filter((p) => p.parchment_patient_id).length
  const onboardedPatients = patients.filter((p) => p.onboarding_completed).length
  const incompletePatients = patients.length - onboardedPatients
  const notSyncedOnPage = patients.length - parchmentSyncedPatients
  const duplicateGroups = useMemo(() => findPotentialDuplicatePatients(searchablePatients), [searchablePatients])
  const duplicatePatientIds = useMemo(() => {
    const ids = new Set<string>()
    duplicateGroups.forEach((group) => group.patientIds.forEach((id) => ids.add(id)))
    return ids
  }, [duplicateGroups])
  const filteredPatients = useMemo(() => {
    return searchablePatients.filter((patient) => {
      if (profileFilter === "complete") return patient.onboarding_completed
      if (profileFilter === "incomplete") return !patient.onboarding_completed
      if (profileFilter === "duplicates") return duplicatePatientIds.has(patient.id)
      return true
    })
  }, [searchablePatients, profileFilter, duplicatePatientIds])
  const firstDuplicatePatient = useMemo(
    () => filteredPatients.find((patient) => duplicatePatientIds.has(patient.id)) ?? null,
    [filteredPatients, duplicatePatientIds],
  )
  const firstDuplicateHref = firstDuplicatePatient ? `${patientHrefBase}/${firstDuplicatePatient.id}` : null
  const summaryItems = [
    {
      label: "Patients",
      value: totalPatients,
      detail: collapsedDuplicateProfiles > 0 ? `${rawPatientProfiles} raw profiles` : `${patients.length} on this page`,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "Onboarded",
      value: onboardedPatients,
      detail: "Ready for clinical workflow",
      icon: CheckCircle,
      tone: "text-success",
    },
    {
      label: "Incomplete",
      value: incompletePatients,
      detail: "Needs patient details",
      icon: XCircle,
      tone: "text-warning",
    },
    {
      label: "Parchment sync",
      value: parchmentSyncedPatients,
      detail: notSyncedOnPage > 0 ? `${notSyncedOnPage} not synced on this page` : "All visible patients synced",
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
              <Select value={currentSort} onValueChange={(value) => handleSortChange(value as PatientDirectorySort)}>
                <SelectTrigger
                  className="w-[190px] rounded-xl bg-white dark:bg-card border-border/50"
                  aria-label="Sort patients"
                >
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger
                  className="w-[120px] rounded-xl bg-white dark:bg-card border-border/50"
                  aria-label="Filter patients by state"
                >
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={profileFilter} onValueChange={(value) => setProfileFilter(value as ProfileFilter)}>
                <SelectTrigger
                  className="w-[160px] rounded-xl bg-white dark:bg-card border-border/50"
                  aria-label="Filter patients by profile state"
                >
                  <SelectValue placeholder="Profile state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="complete">Ready</SelectItem>
                  <SelectItem value="incomplete">Needs details</SelectItem>
                  <SelectItem value="duplicates">Duplicates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Directory summary">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-border/50 bg-muted/25 px-3 py-2">
                <div className="flex items-center gap-2">
                  <item.icon className={`h-4 w-4 ${item.tone}`} />
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                </div>
                <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredPatients.length} of {patients.length} on this page ({totalPatients} unique total)
            {collapsedDuplicateProfiles > 0 && (
              <span> · {collapsedDuplicateProfiles} duplicate profile {collapsedDuplicateProfiles === 1 ? "record" : "records"} collapsed</span>
            )}
          </div>

          {duplicateGroups.length > 0 && (
            <div className="mt-4 rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-sm text-warning">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {duplicateGroups.length} duplicate {duplicateGroups.length === 1 ? "group needs" : "groups need"} review
                    </p>
                    <p className="mt-0.5 text-xs">
                      Open the flagged patient. Merge only when the patient file shows linked profiles; signed-in duplicates stay as manual review.
                    </p>
                    <p className="mt-0.5 text-xs">
                      Match source: {duplicateGroups.map((group) => group.reason.replace("_", " + ")).join(", ")}
                    </p>
                  </div>
                </div>
                {firstDuplicateHref ? (
                  <div className="flex flex-wrap gap-2">
                    {profileFilter !== "duplicates" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-warning-border bg-white text-warning hover:bg-warning-light"
                        onClick={() => setProfileFilter("duplicates")}
                      >
                        Show duplicate rows
                      </Button>
                    ) : null}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-warning-border bg-white text-warning hover:bg-warning-light"
                    >
                      <Link href={firstDuplicateHref} prefetch={false}>
                        Open flagged patient
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
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
                            {isDuplicateCandidate && (
                              <Badge variant="warning" size="sm" className="mt-1">
                                <AlertTriangle className="h-3 w-3" />
                                Review duplicate
                              </Badge>
                            )}
                            {linkedProfileCount > 0 && (
                              <Badge variant="secondary" size="sm" className="mt-1">
                                {linkedProfileCount} linked profile{linkedProfileCount === 1 ? "" : "s"}
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
                            <Badge variant="outline" className="bg-success-light text-success border-success-border">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-warning-light text-warning border-warning-border">
                              <XCircle className="mr-1 h-3 w-3" />
                              Incomplete
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {patient.parchment_patient_id ? (
                            <Badge variant="success" size="sm">
                              <CheckCircle className="h-3 w-3" />
                              Ready in Parchment
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              <XCircle className="h-3 w-3" />
                              Not synced
                            </Badge>
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
