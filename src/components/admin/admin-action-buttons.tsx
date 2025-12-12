'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { AdminInfoRequest } from '@/components/messaging/admin-info-request'
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Phone,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

interface AdminActionButtonsProps {
  intakeId: string
  currentStatus: string
  canApprove: boolean
  isHighRisk: boolean
}

export function AdminActionButtons({
  intakeId,
  currentStatus,
  canApprove,
  isHighRisk,
}: AdminActionButtonsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false)
  const [infoRequestOpen, setInfoRequestOpen] = useState(false)

  // Form states
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [escalationNotes, setEscalationNotes] = useState('')

  const handleAction = async (
    action: 'approve' | 'decline' | 'escalate',
    notes?: string
  ) => {
    setIsLoading(action)
    setError(null)

    try {
      const response = await fetch('/api/admin/intake-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId,
          action,
          notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Action failed')
      }

      // Close dialogs and refresh
      setApproveDialogOpen(false)
      setDeclineDialogOpen(false)
      setEscalateDialogOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(null)
    }
  }

  if (!['paid', 'in_review', 'pending_info'].includes(currentStatus)) {
    return null
  }

  return (
    <>
      {/* Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-50 md:left-64">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {error && (
            <Alert variant="destructive" className="flex-1">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3 ml-auto">
            {/* Request Info */}
            <Button
              variant="outline"
              onClick={() => setInfoRequestOpen(true)}
              disabled={isLoading !== null}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Request Info
            </Button>

            {/* Escalate to Call */}
            <Button
              variant="outline"
              onClick={() => setEscalateDialogOpen(true)}
              disabled={isLoading !== null}
            >
              <Phone className="w-4 h-4 mr-2" />
              Escalate
            </Button>

            {/* Decline */}
            <Button
              variant="destructive"
              onClick={() => setDeclineDialogOpen(true)}
              disabled={isLoading !== null}
            >
              {isLoading === 'decline' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Decline
            </Button>

            {/* Approve */}
            <Button
              onClick={() => setApproveDialogOpen(true)}
              disabled={isLoading !== null || !canApprove}
              className="min-w-[120px]"
            >
              {isLoading === 'approve' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Approve
            </Button>
          </div>
        </div>

        {/* High Risk Warning */}
        {isHighRisk && !canApprove && (
          <div className="max-w-7xl mx-auto mt-2">
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This is a high-risk intake. Senior admin approval required.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Confirm approval and add any clinical notes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Clinical notes (optional)..."
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleAction('approve', clinicalNotes)}
              disabled={isLoading === 'approve'}
            >
              {isLoading === 'approve' && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for declining (required)..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeclineDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction('decline', declineReason)}
              disabled={isLoading === 'decline' || !declineReason.trim()}
            >
              {isLoading === 'decline' && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate to Live Consultation</DialogTitle>
            <DialogDescription>
              This will mark the request as requiring a phone/video consultation.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for escalation..."
            value={escalationNotes}
            onChange={(e) => setEscalationNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEscalateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleAction('escalate', escalationNotes)}
              disabled={isLoading === 'escalate'}
            >
              {isLoading === 'escalate' && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirm Escalation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Request Dialog */}
      <Dialog open={infoRequestOpen} onOpenChange={setInfoRequestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request More Information</DialogTitle>
          </DialogHeader>
          <AdminInfoRequest
            intakeId={intakeId}
            onSuccess={() => {
              setInfoRequestOpen(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
