"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Eye, CreditCard, Loader2, Search } from "lucide-react"
import { retryPaymentForRequestAction } from "@/lib/stripe/checkout"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { useToast } from "@/components/ui/toast-provider"

interface RequestItem {
  id: string
  type: string
  typeLabel: string
  status: string
  createdAt: string
  paymentStatus?: string
}

interface RequestsListClientProps {
  requests: RequestItem[]
}

type FilterStatus = "all" | "pending" | "approved" | "declined" | "needs_follow_up" | "awaiting_payment"

export function RequestsListClient({ requests }: RequestsListClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [filter, setFilter] = useState<FilterStatus>("all")
  const [retryingPayment, setRetryingPayment] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 300)

  const handleRetryPayment = useCallback(async (requestId: string) => {
    setRetryingPayment(requestId)
    try {
      const result = await retryPaymentForRequestAction(requestId)
      if (result.success && result.checkoutUrl) {
        router.push(result.checkoutUrl)
      } else {
        toast.error("Payment Error", result.error || "Failed to initiate payment. Please try again.")
        setRetryingPayment(null)
      }
    } catch {
      toast.error("Error", "An error occurred. Please try again.")
      setRetryingPayment(null)
    }
  }, [router, toast])

  const filteredRequests = requests
    .filter((r) => {
      // Status filter
      if (filter === "all") return true
      if (filter === "awaiting_payment") return r.paymentStatus === "pending_payment"
      return r.status === filter && r.paymentStatus !== "pending_payment"
    })
    .filter((r) => {
      // Search filter
      if (!debouncedSearch) return true
      return r.typeLabel.toLowerCase().includes(debouncedSearch.toLowerCase())
    })

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "pending_payment") {
      return <Badge className="bg-orange-100/80 text-orange-700 border-0 font-medium">Payment needed</Badge>
    }
    if (paymentStatus === "refunded") {
      return (
        <div className="flex gap-1.5">
          <Badge className="bg-red-100/80 text-red-700 border-0 font-medium">Declined</Badge>
          <Badge className="bg-purple-100/80 text-purple-700 border-0 font-medium">Refunded</Badge>
        </div>
      )
    }
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100/80 text-amber-700 border-0 font-medium">In review</Badge>
      case "approved":
        return <Badge className="bg-emerald-100/80 text-emerald-700 border-0 font-medium">Completed</Badge>
      case "declined":
        return <Badge className="bg-red-100/80 text-red-700 border-0 font-medium">See notes</Badge>
      case "needs_follow_up":
        return <Badge className="bg-blue-100/80 text-blue-700 border-0 font-medium">More info needed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const awaitingPaymentCount = requests.filter((r) => r.paymentStatus === "pending_payment").length

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    ...(awaitingPaymentCount > 0 ? [{ label: "Payment needed", value: "awaiting_payment" as FilterStatus }] : []),
    { label: "In review", value: "pending" },
    { label: "Completed", value: "approved" },
    { label: "Unable to approve", value: "declined" },
  ]

  return (
    <div className="space-y-4">
      {requests.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl bg-white/50 border-white/40"
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              filter === btn.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-white/50 text-muted-foreground hover:bg-white/80 hover:text-foreground"
            }`}
          >
            {btn.label}
            {btn.value === "awaiting_payment" && awaitingPaymentCount > 0 && (
              <span className="ml-1.5 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                {awaitingPaymentCount}
              </span>
            )}
            {btn.value !== "all" && btn.value !== "awaiting_payment" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({requests.filter((r) => r.status === btn.value && r.paymentStatus !== "pending_payment").length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {filteredRequests.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {debouncedSearch
            ? `No requests matching "${debouncedSearch}"`
            : filter === "all"
              ? "Your documents will appear here once reviewed by a doctor"
              : `No ${filter === "awaiting_payment" ? "requests awaiting payment" : filter.replace("_", " ") + " requests"}`}
        </div>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/30 text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Submitted</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {filteredRequests.map((request, index) => (
                  <tr
                    key={request.id}
                    className="animate-fade-in opacity-0"
                    style={{ animationDelay: `${0.05 * index}s`, animationFillMode: "forwards" }}
                  >
                    <td className="py-4 font-medium text-foreground">{request.typeLabel}</td>
                    <td className="py-4">{getStatusBadge(request.status, request.paymentStatus)}</td>
                    <td className="py-4 text-sm text-muted-foreground">{formatDate(request.createdAt)}</td>
                    <td className="py-4 text-right">
                      {request.paymentStatus === "pending_payment" ? (
                        <Button
                          size="sm"
                          onClick={() => handleRetryPayment(request.id)}
                          disabled={retryingPayment === request.id}
                          className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          {retryingPayment === request.id ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="mr-2 h-3.5 w-3.5" />
                          )}
                          Complete payment
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="rounded-xl bg-white/50 hover:bg-white/80 border-white/40"
                        >
                          <Link href={`/patient/requests/${request.id}`}>
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            Open
                          </Link>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {filteredRequests.map((request, index) => (
              <div
                key={request.id}
                className="bg-white/40 rounded-xl p-4 border border-white/30 animate-fade-in opacity-0"
                style={{ animationDelay: `${0.05 * index}s`, animationFillMode: "forwards" }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-medium text-foreground">{request.typeLabel}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(request.createdAt)}</p>
                  </div>
                  {getStatusBadge(request.status, request.paymentStatus)}
                </div>
                {request.paymentStatus === "pending_payment" ? (
                  <Button
                    size="sm"
                    onClick={() => handleRetryPayment(request.id)}
                    disabled={retryingPayment === request.id}
                    className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {retryingPayment === request.id ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-3.5 w-3.5" />
                    )}
                    Complete payment
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full rounded-xl bg-white/50 hover:bg-white/80 border-white/40"
                  >
                    <Link href={`/patient/requests/${request.id}`}>
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      Open request
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
