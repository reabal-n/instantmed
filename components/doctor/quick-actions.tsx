"use client"

import { useState } from "react"
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Keyboard,
  ChevronRight,
  Zap,
  MessageSquare,
  FileDown,
  Pill
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface QuickAction {
  id: string
  label: string
  description: string
  icon: typeof FileText
  shortcut?: string
  color: string
  action: () => void | Promise<void>
}

interface QuickActionsProps {
  requestId: string
  requestType: string
  onApprove: () => Promise<void>
  onDecline: () => Promise<void>
  onRequestInfo: () => Promise<void>
  onGenerateDocument?: () => Promise<void>
  onSendScript?: () => Promise<void>
  isPrescription?: boolean
  isLoading?: boolean
}

export function QuickActions({
  requestId: _requestId,
  requestType: _requestType,
  onApprove,
  onDecline,
  onRequestInfo,
  onGenerateDocument,
  onSendScript,
  isPrescription = false,
  isLoading = false,
}: QuickActionsProps) {
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAction = async (actionId: string, actionFn: () => void | Promise<void>) => {
    setActionLoading(actionId)
    try {
      await actionFn()
    } finally {
      setActionLoading(null)
    }
  }

  const actions: QuickAction[] = [
    {
      id: "approve",
      label: "Approve",
      description: "Approve this request and notify patient",
      icon: CheckCircle,
      shortcut: "⌘ A",
      color: "text-green-600 bg-green-100 hover:bg-green-200",
      action: onApprove,
    },
    {
      id: "decline",
      label: "Decline",
      description: "Decline with reason (email sent)",
      icon: XCircle,
      shortcut: "⌘ D",
      color: "text-red-600 bg-red-100 hover:bg-red-200",
      action: onDecline,
    },
    {
      id: "request-info",
      label: "Need More Info",
      description: "Request additional information",
      icon: MessageSquare,
      shortcut: "⌘ I",
      color: "text-amber-600 bg-amber-100 hover:bg-amber-200",
      action: onRequestInfo,
    },
  ]

  // Add document generation for non-prescriptions
  if (onGenerateDocument && !isPrescription) {
    actions.push({
      id: "generate-doc",
      label: "Generate Document",
      description: "Create PDF document for patient",
      icon: FileDown,
      shortcut: "⌘ G",
      color: "text-primary bg-blue-100 hover:bg-blue-200",
      action: onGenerateDocument,
    })
  }

  // Add send script for prescriptions
  if (onSendScript && isPrescription) {
    actions.push({
      id: "send-script",
      label: "Send eScript",
      description: "Send prescription to patient",
      icon: Pill,
      shortcut: "⌘ S",
      color: "text-purple-600 bg-purple-100 hover:bg-purple-200",
      action: onSendScript,
    })
  }

  return (
    <>
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </h3>
          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Keyboard className="h-3 w-3" />
            Shortcuts
          </button>
        </div>

        <div className="grid gap-2">
          {actions.map((action) => {
            const Icon = action.icon
            const loading = actionLoading === action.id || isLoading

            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id, action.action)}
                disabled={loading}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all text-left w-full",
                  "border border-transparent hover:border-border/50",
                  loading && "opacity-50 cursor-not-allowed",
                  action.color
                )}
              >
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                  action.color.split(" ")[1]
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                </div>
                {action.shortcut && (
                  <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-mono bg-muted rounded shrink-0">
                    {action.shortcut}
                  </kbd>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to work faster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {actions.map((action) => (
              <div key={action.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{action.label}</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">
                  {action.shortcut}
                </kbd>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">View patient history</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">⌘ H</kbd>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">Copy patient details</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">⌘ C</kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Next request</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded">⌘ →</kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Stats bar showing today's workload
 */
interface WorkloadStatsProps {
  pending: number
  reviewed: number
  priorityCount: number
}

export function WorkloadStats({ pending, reviewed, priorityCount }: WorkloadStatsProps) {
  const total = pending + reviewed
  const progress = total > 0 ? (reviewed / total) * 100 : 0

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        Today&apos;s Workload
      </h3>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-linear-to-r from-primary to-emerald-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-foreground">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">{reviewed}</p>
          <p className="text-xs text-muted-foreground">Reviewed</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-600">{priorityCount}</p>
          <p className="text-xs text-muted-foreground">Priority</p>
        </div>
      </div>

      {priorityCount > 0 && (
        <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" />
          {priorityCount} priority {priorityCount === 1 ? "request" : "requests"} waiting
        </div>
      )}
    </div>
  )
}

/**
 * Common clinical notes templates
 */
interface ClinicalNotesTemplatesProps {
  onSelect: (template: string) => void
}

export function ClinicalNotesTemplates({ onSelect }: ClinicalNotesTemplatesProps) {
  const templates = [
    {
      label: "Approved - Standard",
      text: "Reviewed patient history and consultation answers. Request approved based on clinical assessment. No contraindications identified.",
    },
    {
      label: "Approved - With Advice",
      text: "Request approved. Patient advised to seek in-person consultation if symptoms persist beyond 7 days or worsen.",
    },
    {
      label: "Need More Info",
      text: "Additional information required to complete assessment. Please provide: ",
    },
    {
      label: "Declined - In-person Required",
      text: "This request requires an in-person consultation for proper assessment. Please visit your local GP or clinic.",
    },
    {
      label: "Declined - Outside Scope",
      text: "Unfortunately, this medication/request is outside the scope of telehealth services. Please consult with your regular GP.",
    },
  ]

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        Note Templates
      </h3>
      <div className="space-y-2">
        {templates.map((template, i) => (
          <button
            key={i}
            onClick={() => onSelect(template.text)}
            className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm"
          >
            <p className="font-medium text-foreground">{template.label}</p>
            <p className="text-xs text-muted-foreground truncate">{template.text}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
