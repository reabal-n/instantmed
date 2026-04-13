"use client"

import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Minus,
  Undo2,
} from "lucide-react"

import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { type FormattingType,insertFormatting } from "@/components/doctor/review/utils"
import { Button } from "@/components/ui/button"

export function FormattingToolbar() {
  const { notesRef, setDoctorNotes, setNoteSaved, isPending, isRegenerating, doctorNotes } = useIntakeReview()

  const handleFormat = (type: FormattingType) => {
    if (notesRef.current) {
      insertFormatting(notesRef.current, type, setDoctorNotes, setNoteSaved)
    }
  }

  const handleClear = () => {
    setDoctorNotes("")
    setNoteSaved(false)
    notesRef.current?.focus()
  }

  const disabled = isPending || isRegenerating

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/40 bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleFormat("bold")}
        disabled={disabled}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleFormat("italic")}
        disabled={disabled}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-4 bg-border/60 mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleFormat("h2")}
        disabled={disabled}
        title="Heading"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleFormat("bullet")}
        disabled={disabled}
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleFormat("numbered")}
        disabled={disabled}
        title="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleFormat("divider")}
        disabled={disabled}
        title="Divider"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-4 bg-border/60 mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleClear}
        disabled={disabled || !doctorNotes}
        title="Clear"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
