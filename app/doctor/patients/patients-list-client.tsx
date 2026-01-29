"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { UserCard } from "@/components/uix"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Users, MapPin, Phone, Calendar, CheckCircle, XCircle, ChevronRight } from "lucide-react"
import type { Profile } from "@/types/db"

interface PatientsListClientProps {
  patients: Profile[]
}

export function PatientsListClient({ patients }: PatientsListClientProps) {
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

  const calculateAge = (dob: string | null | undefined): number | null => {
    if (!dob) return null
    const birthDate = new Date(dob)
    if (isNaN(birthDate.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }


  const states = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Patient Directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">View and manage all registered patients</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Patients</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{patients.length}</div>
        </div>

        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Onboarded</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {patients.filter((p) => p.onboarding_completed).length}
          </div>
        </div>

        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Incomplete</span>
            <XCircle className="h-4 w-4 text-dawn-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">
            {patients.filter((p) => !p.onboarding_completed).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
      >
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
              <SelectTrigger className="w-[120px] rounded-xl bg-white/50 border-white/40">
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
              <SelectTrigger className="w-[150px] rounded-xl bg-white/50 border-white/40">
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
          Showing {filteredPatients.length} of {patients.length} patients
        </div>
      </div>

      {/* Table */}
      <div
        className="glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.35s", animationFillMode: "forwards" }}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white/30 hover:bg-white/30">
                <TableHead>Patient</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Medicare</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient, index) => {
                  const age = calculateAge(patient.date_of_birth)

                  return (
                    <TableRow
                      key={patient.id}
                      className="animate-fade-in opacity-0 hover:bg-white/40 transition-colors cursor-pointer group"
                      style={{ animationDelay: `${0.05 * index}s`, animationFillMode: "forwards" }}
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
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <XCircle className="mr-1 h-3 w-3" />
                            Incomplete
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(patient.created_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
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
                  <TableCell colSpan={6} className="h-32 text-center">
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
      </div>
    </div>
  )
}
