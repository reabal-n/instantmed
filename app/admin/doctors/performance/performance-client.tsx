"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserCard } from "@/components/uix"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Trophy,
  CheckCircle,
  TrendingUp,
  Users,
  Award,
  Zap,
} from "lucide-react"
import {
  LazyBarChart as BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "@/components/charts/lazy-charts"
import { cn } from "@/lib/utils"

interface DoctorMetrics {
  id: string
  name: string
  email: string
  role: string
  totalReviewed: number
  approved: number
  declined: number
  approvalRate: number
  avgResponseMinutes: number
  pending: number
}

interface DoctorPerformanceClientProps {
  doctors: DoctorMetrics[]
}


function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}


export function DoctorPerformanceClient({ doctors }: DoctorPerformanceClientProps) {
  // Calculate team averages
  const totalReviewed = doctors.reduce((sum, d) => sum + d.totalReviewed, 0)
  const teamApprovalRate = doctors.length > 0
    ? doctors.reduce((sum, d) => sum + d.approvalRate, 0) / doctors.length
    : 0
  const teamAvgResponse = doctors.length > 0
    ? doctors.filter(d => d.avgResponseMinutes > 0).reduce((sum, d) => sum + d.avgResponseMinutes, 0) / 
      doctors.filter(d => d.avgResponseMinutes > 0).length || 0
    : 0

  // Chart data
  const chartData = doctors.slice(0, 5).map((d) => ({
    name: d.name.split(" ")[0],
    Approved: d.approved,
    Declined: d.declined,
  }))

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/50 to-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/doctors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Doctor Performance</h1>
            <p className="text-sm text-muted-foreground">Review metrics and workload distribution</p>
          </div>
        </div>

        {/* Team Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Doctors</p>
                  <p className="text-2xl font-semibold">{doctors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Reviewed</p>
                  <p className="text-2xl font-semibold">{totalReviewed}</p>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-50">
                  <TrendingUp className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Approval Rate</p>
                  <p className="text-2xl font-semibold">{teamApprovalRate.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-semibold">{formatResponseTime(teamAvgResponse)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Review Volume by Doctor</CardTitle>
              <CardDescription>Approved vs Declined (Top 5)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="Approved" fill="#10b981" stackId="a" />
                    <Bar dataKey="Declined" fill="#ef4444" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Leaderboard</CardTitle>
              </div>
              <CardDescription>By total reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {doctors.slice(0, 5).map((doctor, index) => (
                  <div key={doctor.id} className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-amber-100 text-amber-700" :
                      index === 1 ? "bg-slate-100 text-slate-700" :
                      index === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <UserCard
                      name={doctor.name}
                      description={`${doctor.totalReviewed} reviews`}
                      size="sm"
                      className="flex-1 min-w-0"
                    />
                    {index === 0 && <Award className="w-5 h-5 text-amber-500" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Doctors</CardTitle>
            <CardDescription>Detailed performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-center">Reviewed</TableHead>
                  <TableHead className="text-center">Approved</TableHead>
                  <TableHead className="text-center">Declined</TableHead>
                  <TableHead className="text-center">Approval Rate</TableHead>
                  <TableHead className="text-center">Avg Response</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCard
                          name={doctor.name}
                          description={doctor.email}
                          size="sm"
                        />
                        {doctor.role === "admin" && (
                          <Badge variant="outline" className="text-xs">Admin</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{doctor.totalReviewed}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-emerald-600">{doctor.approved}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-red-600">{doctor.declined}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          doctor.approvalRate >= 90
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : doctor.approvalRate >= 70
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {doctor.approvalRate.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {doctor.avgResponseMinutes > 0 ? (
                        <span className={cn(
                          doctor.avgResponseMinutes < 60 ? "text-emerald-600" :
                          doctor.avgResponseMinutes < 180 ? "text-amber-600" :
                          "text-red-600"
                        )}>
                          {formatResponseTime(doctor.avgResponseMinutes)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {doctor.pending > 0 ? (
                        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                          {doctor.pending}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
