"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserCard } from "@/components/uix"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Users, MapPin, Phone, Calendar, CheckCircle, XCircle, ChevronRight, ChevronLeft } from "lucide-react"
import { formatDate, calculateAge } from "@/lib/format"
import type { Profile } from "@/types/db"

interface PatientsListClientProps {
  patients: Profile[]
  currentPage: number
  totalPages: number
  totalPatients: number
}

export function PatientsListClient({ patients, currentPage, totalPages, totalPatients }: PatientsListClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [onboardingFilter, setOnboardingFilter] = useState<string>("all")

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.suburb?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone?.includes(searchQuery)

      const matchesState = stateFilter === "all" || patient.state === stateFilter
      const matchesOnboarding =
        onboardingFilter === "all" ||
        (onboardingFilter === "complete" && patient.onboarding_completed) ||
        (onboardingFilter === "incomplete" && !patient.onboarding_completed)

      return matchesSearch && matchesState && matchesOnboarding
    })
  }, [patients, searchQuery, stateFilter, onboardingFilter])




  const states = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground font-sans">Patient Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage all registered patients</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Patients</span>
              <Users className="h-5 w-5 text-primary shrink-0" />
            </div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{totalPatients}</div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Onboarded</span>
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            </div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
              {patients.filter((p) => p.onboarding_completed).length}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Incomplete</span>
              <XCircle className="h-5 w-5 text-amber-500 shrink-0" />
            </div>
            <div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
              {patients.filter((p) => !p.onboarding_completed).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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

            <div className="flex gap-3">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-[120px] rounded-xl bg-card/50 border-border/40">
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

              <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
                <SelectTrigger className="w-[150px] rounded-xl bg-card/50 border-border/40">
                  <SelectValue placeholder="Onboarding" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="complete">Onboarded</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredPatients.length} of {patients.length} on this page ({totalPatients} total)
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border-border/50 overflow-hidden">
        <CardContent className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-card/30 hover:bg-card/30">
                <TableHead scope="col">Patient</TableHead>
                <TableHead scope="col">Contact</TableHead>
                <TableHead scope="col">Location</TableHead>
                <TableHead scope="col">Medicare</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Joined</TableHead>
                <TableHead scope="col" className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const age = calculateAge(patient.date_of_birth)

                  return (
                    <TableRow
                      key={patient.id}
                      className="hover:bg-muted/50 transition-colors duration-200 cursor-pointer group"
                    >
                      <TableCell>
                        <Link href={`/doctor/patients/${patient.id}`} className="block">
                          <UserCard
                            name={patient.full_name}
                            description={age !== null ? `${age} years old` : "Age N/A"}
                            size="sm"
                          />
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
                            <span className="text-sm text-muted-foreground/50">Not provided</span>
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
                          <span className="text-sm text-muted-foreground/50">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.medicare_number ? (
                          <span className="text-sm font-mono text-muted-foreground">
                            ****{patient.medicare_number.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.onboarding_completed ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                            <XCircle className="mr-1 h-3 w-3" />
                            Incomplete
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
                        <Link href={`/doctor/patients/${patient.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
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
              onClick={() => router.push(`/doctor/patients?page=${currentPage - 1}`)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => router.push(`/doctor/patients?page=${currentPage + 1}`)}
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
