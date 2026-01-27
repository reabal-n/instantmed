"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CheckCircle, XCircle, MoreHorizontal, Loader2, X } from "lucide-react"
import { toast } from "sonner"

interface BulkActionsProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onBulkApprove: (ids: string[]) => Promise<{ success: number; failed: number }>
  onBulkDecline: (ids: string[], reason: string) => Promise<{ success: number; failed: number }>
  totalItems: number
}

/**
 * Bulk Actions Component for Doctor Queue
 * 
 * Enables doctors to:
 * - Select multiple intakes
 * - Bulk approve eligible requests
 * - Bulk decline with reason
 */
export function BulkActions({
  selectedIds,
  onSelectionChange,
  onBulkApprove,
  onBulkDecline,
  totalItems,
}: BulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState("")

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.length === 0) return

    setIsProcessing(true)
    try {
      const result = await onBulkApprove(selectedIds)
      
      if (result.success > 0) {
        toast.success(`Approved ${result.success} request${result.success > 1 ? "s" : ""}`)
      }
      if (result.failed > 0) {
        toast.error(`Failed to approve ${result.failed} request${result.failed > 1 ? "s" : ""}`)
      }
      
      onSelectionChange([])
    } catch {
      toast.error("Bulk approval failed")
    } finally {
      setIsProcessing(false)
      setShowApproveDialog(false)
    }
  }, [selectedIds, onBulkApprove, onSelectionChange])

  const handleBulkDecline = useCallback(async () => {
    if (selectedIds.length === 0 || !declineReason.trim()) return

    setIsProcessing(true)
    try {
      const result = await onBulkDecline(selectedIds, declineReason)
      
      if (result.success > 0) {
        toast.success(`Declined ${result.success} request${result.success > 1 ? "s" : ""}`)
      }
      if (result.failed > 0) {
        toast.error(`Failed to decline ${result.failed} request${result.failed > 1 ? "s" : ""}`)
      }
      
      onSelectionChange([])
      setDeclineReason("")
    } catch {
      toast.error("Bulk decline failed")
    } finally {
      setIsProcessing(false)
      setShowDeclineDialog(false)
    }
  }, [selectedIds, declineReason, onBulkDecline, onSelectionChange])

  const clearSelection = useCallback(() => {
    onSelectionChange([])
  }, [onSelectionChange])

  if (selectedIds.length === 0) return null

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-card border shadow-xl rounded-full px-4 py-2 flex items-center gap-3">
            <div className="flex items-center gap-2 pr-3 border-r">
              <Checkbox
                checked={selectedIds.length === totalItems}
                onCheckedChange={(_checked) => {
                  // This would need to be connected to select all functionality
                }}
              />
              <span className="text-sm font-medium">
                {selectedIds.length} selected
              </span>
              <button
                onClick={clearSelection}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowApproveDialog(true)}
                disabled={isProcessing}
                className="gap-1.5"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
                Approve all
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={isProcessing}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDeclineDialog(true)}>
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                    Decline selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearSelection}>
                    Clear selection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isProcessing && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk approve requests?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve {selectedIds.length} selected request{selectedIds.length > 1 ? "s" : ""}.
              Make sure you have reviewed each request before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve {selectedIds.length} request{selectedIds.length > 1 ? "s" : ""}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline selected requests?</AlertDialogTitle>
            <AlertDialogDescription>
              This will decline {selectedIds.length} selected request{selectedIds.length > 1 ? "s" : ""}.
              Please provide a reason for declining.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter decline reason..."
              className="w-full min-h-[100px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDecline}
              disabled={isProcessing || !declineReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline {selectedIds.length} request{selectedIds.length > 1 ? "s" : ""}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Hook for managing bulk selection state
 */
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(items.map((item) => item.id))
  }, [items])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  )

  return {
    selectedIds,
    setSelectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    hasSelection: selectedIds.length > 0,
    allSelected: selectedIds.length === items.length && items.length > 0,
  }
}
