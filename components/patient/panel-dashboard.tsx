"use client"

import { useState } from "react"
import Link from "next/link"
import {
  FileText,
  Pill,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/uix"
import { usePanel, DrawerPanel } from "@/components/panels"
import { FEEDBACK_MESSAGES } from "@/lib/microcopy"
import { cn } from "@/lib/utils"
import { TiltCard } from "@/components/shared/tilt-card"
import { EmptyState } from "@/components/ui/empty-state"

/**
 * Panel-Based Patient Dashboard
 * 
 * Philosophy:
 * - Single scroll, no tabs
 * - Click request → DrawerPanel opens
 * - Calm, spacious layout
 * - Human language throughout
 */

interface Request {
  id: string
  type: string
  status: string
  created_at: string
  updated_at: string
  answers?: Record<string, unknown>
  doctor_notes?: string
}

interface Prescription {
  id: string
  medication_name: string
  dosage: string
  issued_date: string
  renewal_date: string
  status: "active" | "expired"
}

interface PatientDashboardProps {
  fullName: string
  requests?: Request[]
  prescriptions?: Prescription[]
}

const STATUS_CONFIG = {
  approved: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Approved" },
  rejected: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Declined" },
  pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "Pending review" },
  in_review: { color: "bg-blue-100 text-blue-700", icon: Clock, label: "Being reviewed" },
  requires_info: { color: "bg-orange-100 text-orange-700", icon: AlertCircle, label: "More info needed" },
}

export function PanelDashboard({
  fullName,
  requests = [],
  prescriptions = [],
}: PatientDashboardProps) {
  const { openPanel } = usePanel()
  const firstName = fullName.split(" ")[0]

  const pendingRequests = requests.filter((r) => r.status === "pending" || r.status === "in_review")
  const activeRxCount = prescriptions.filter((p) => p.status === "active").length

  const handleViewRequest = (request: Request) => {
    openPanel({
      id: `request-${request.id}`,
      type: 'drawer',
      component: (
        <DrawerPanel title="Request Details" width={450}>
          <RequestDetailDrawer request={request} />
        </DrawerPanel>
      )
    })
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Welcome back, {firstName}
        </h1>
        <p className="text-gray-600">
          {pendingRequests.length > 0 
            ? `${pendingRequests.length} ${pendingRequests.length === 1 ? 'request' : 'requests'} pending review`
            : "All caught up"}
        </p>
      </div>

      {/* Quick Stats - Enhanced with TiltCard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TiltCard tiltAmount={5}>
          <StatCard
            label="Total Requests"
            value={requests.length}
            icon={FileText}
            color="blue"
          />
        </TiltCard>
        <TiltCard tiltAmount={5}>
          <StatCard
            label="Pending Review"
            value={pendingRequests.length}
            icon={Clock}
            color="yellow"
          />
        </TiltCard>
        <TiltCard tiltAmount={5}>
          <StatCard
            label="Active Prescriptions"
            value={activeRxCount}
            icon={Pill}
            color="green"
          />
        </TiltCard>
      </div>

      {/* Recent Requests */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Requests</h2>
          {requests.length > 5 && (
            <Link href="/patient/requests" className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={FEEDBACK_MESSAGES.noRequests}
            description='Use the "New Request" button to get started'
          />
        ) : (
          <div className="space-y-3">
            {requests.slice(0, 5).map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onClick={() => handleViewRequest(request)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Active Prescriptions */}
      {prescriptions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Active Prescriptions</h2>
          </div>

          <div className="space-y-3">
            {prescriptions
              .filter((p) => p.status === "active")
              .slice(0, 3)
              .map((rx) => (
                <div
                  key={rx.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{rx.medication_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{rx.dosage}</p>
                      <div className="flex gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Issued {new Date(rx.issued_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          Renews {new Date(rx.renewal_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Link href="/repeat-prescription/request">
                      <Button variant="outline" size="sm">
                        <Pill className="w-4 h-4 mr-2" />
                        Request renewal
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: "blue" | "yellow" | "green"
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
    green: "bg-green-50 text-green-600",
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover-lift card-shine">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center icon-spin-hover", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function RequestCard({
  request,
  onClick,
}: {
  request: Request
  onClick: () => void
}) {
  const config = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  const Icon = config.icon

  const getRequestTypeName = (type: string) => {
    if (type === "medical_certificate") return "Medical Certificate"
    if (type === "prescription") return "Prescription"
    return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-gray-200 p-5 hover:border-primary hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            {request.type === "medical_certificate" ? (
              <FileText className="w-6 h-6 text-gray-600" />
            ) : (
              <Pill className="w-6 h-6 text-gray-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">
              {getRequestTypeName(request.type)}
            </h3>
            <p className="text-sm text-gray-600">
              {new Date(request.created_at).toLocaleDateString("en-AU", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium", config.color)}>
            <Icon className="w-4 h-4" />
            {config.label}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  )
}

function RequestDetailDrawer({ request }: { request: Request }) {
  const config = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <div className="p-6 space-y-6">
      {/* Status */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Status</p>
        <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium", config.color)}>
          <Icon className="w-4 h-4" />
          {config.label}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Submitted</p>
          <p className="font-medium text-gray-900">
            {new Date(request.created_at).toLocaleDateString("en-AU", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Last updated</p>
          <p className="font-medium text-gray-900">
            {new Date(request.updated_at).toLocaleDateString("en-AU", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Doctor Notes */}
      {request.doctor_notes && (
        <div>
          <p className="text-sm text-gray-600 mb-2">Doctor notes</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-900">
            {request.doctor_notes}
          </div>
        </div>
      )}

      {/* Actions - Enhanced with magnetic-button */}
      {request.status === "approved" && (
        <div className="pt-4 border-t border-gray-200">
          <Button className="w-full magnetic-button">
            Download {request.type === "medical_certificate" ? "certificate" : "prescription"}
          </Button>
        </div>
      )}

      {request.status === "requires_info" && (
        <div className="pt-4 border-t border-gray-200">
          <Button className="w-full magnetic-button">
            Provide information
          </Button>
        </div>
      )}
    </div>
  )
}
