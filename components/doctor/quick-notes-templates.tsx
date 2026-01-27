"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FileText, ChevronDown } from "lucide-react"

interface QuickNotesTemplatesProps {
  onSelect: (template: string) => void
  serviceType?: string
}

interface NoteTemplate {
  id: string
  label: string
  content: string
  category: "general" | "med_cert" | "prescription"
}

const TEMPLATES: NoteTemplate[] = [
  // General templates
  {
    id: "reviewed_approved",
    label: "Reviewed & Approved",
    content: "Reviewed patient information. Clinical criteria met. Approved as requested.",
    category: "general",
  },
  {
    id: "identity_verified",
    label: "Identity Verified",
    content: "Patient identity verified via provided documentation. Medicare details confirmed.",
    category: "general",
  },
  {
    id: "follow_up_recommended",
    label: "Follow-up Recommended",
    content: "Approved this request. Recommend patient follows up with regular GP if symptoms persist beyond the specified duration.",
    category: "general",
  },
  {
    id: "previous_history_noted",
    label: "Previous History Noted",
    content: "Patient has prior requests on file. Current request is consistent with previous clinical picture.",
    category: "general",
  },
  
  // Med cert specific
  {
    id: "mc_standard",
    label: "Standard Med Cert",
    content: "Symptoms reported are consistent with acute illness requiring rest. Certificate issued for requested duration.",
    category: "med_cert",
  },
  {
    id: "mc_extended",
    label: "Extended Duration",
    content: "Extended duration approved based on severity of symptoms described. Patient advised to seek in-person care if not improving.",
    category: "med_cert",
  },
  {
    id: "mc_backdated",
    label: "Backdated Cert",
    content: "Backdated certificate approved. Patient explanation for delay in seeking medical attention is reasonable.",
    category: "med_cert",
  },
  
  // Prescription specific
  {
    id: "rx_continuation",
    label: "Continuation Script",
    content: "Continuing existing medication as per patient history. No change to dosage or frequency.",
    category: "prescription",
  },
  {
    id: "rx_first_time",
    label: "First Time via Platform",
    content: "Patient reports previous prescription from other provider. Continuing same medication via eScript.",
    category: "prescription",
  },
  {
    id: "rx_quantity_note",
    label: "Quantity/Repeats",
    content: "Standard quantity and repeats issued as per PBS guidelines.",
    category: "prescription",
  },
]

export function QuickNotesTemplates({ onSelect, serviceType }: QuickNotesTemplatesProps) {
  const [open, setOpen] = useState(false)

  // Filter templates based on service type
  const relevantTemplates = TEMPLATES.filter(t => {
    if (t.category === "general") return true
    if (serviceType?.includes("cert") && t.category === "med_cert") return true
    if ((serviceType?.includes("script") || serviceType?.includes("prescription")) && t.category === "prescription") return true
    return false
  })

  const handleSelect = (template: NoteTemplate) => {
    onSelect(template.content)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Templates
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Quick note templates
          </p>
          {relevantTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{template.label}</span>
                {template.category !== "general" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {template.category === "med_cert" ? "Cert" : "Rx"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {template.content}
              </p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
