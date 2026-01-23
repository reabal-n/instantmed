"use client"

import { motion } from "framer-motion"
import { Clock, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DraftIntake, getDraftSummary, clearDraft } from "@/lib/chat/draft-intake"

interface DraftResumeProps {
  draft: DraftIntake
  onResume: (draft: DraftIntake) => void
  onStartNew: () => void
}

export function DraftResume({ draft, onResume, onStartNew }: DraftResumeProps) {
  const summary = getDraftSummary(draft)
  
  const handleDiscard = () => {
    clearDraft()
    onStartNew()
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-4"
    >
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm">Continue where you left off?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You have an unfinished {summary.serviceLabel.toLowerCase()} request from {summary.lastActivity}.
            </p>
            
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>{summary.messageCount} messages</span>
              <span>•</span>
              <span>{summary.progress}% complete</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => onResume(draft)}
            className="flex-1"
            size="sm"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            onClick={handleDiscard}
            variant="outline"
            size="sm"
className="shrink-0"
          >
            <X className="w-4 h-4 mr-1" />
            Start fresh
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
