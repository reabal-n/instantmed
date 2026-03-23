import type { AIDraft } from "@/app/actions/draft-approval"

export type FormattingType = "bold" | "italic" | "h2" | "bullet" | "numbered" | "divider"

/**
 * Format clinical note draft JSON into SOAP clinical note text.
 */
export function formatClinicalNoteContent(content: Record<string, unknown>): string | null {
  const c = content as Record<string, string>
  const sections: string[] = []
  const subj = c.presentingComplaint?.trim() || ""
  const obj = c.historyOfPresentIllness?.trim() || ""
  const assess = c.relevantInformation?.trim() || ""
  const plan = c.certificateDetails?.trim() || ""

  if (subj) sections.push(`Subjective:\n${subj}`)
  if (obj) sections.push(`Objective:\n${obj}`)
  if (assess) sections.push(`Assessment:\n${assess}`)
  if (plan) sections.push(`Plan:\n${plan}`)
  return sections.length > 0 ? sections.join("\n\n") : null
}

/**
 * Find a usable clinical_note draft from the AI drafts list.
 * Returns the draft if it's ready and not rejected.
 */
export function findClinicalNoteDraft(drafts: AIDraft[]): AIDraft | null {
  return drafts.find(
    (d) => d.type === "clinical_note" && d.status === "ready" && !d.rejected_at
  ) ?? null
}

/** Insert formatting at cursor position in a textarea */
export function insertFormatting(
  textarea: HTMLTextAreaElement,
  type: FormattingType,
  setValue: (v: string) => void,
  setSaved: (v: boolean) => void,
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea
  const selected = value.substring(start, end)
  let insert = ""
  let cursorOffset = 0

  switch (type) {
    case "bold":
      insert = selected ? `**${selected}**` : "**bold**"
      cursorOffset = selected ? insert.length : 2
      break
    case "italic":
      insert = selected ? `_${selected}_` : "_italic_"
      cursorOffset = selected ? insert.length : 1
      break
    case "h2":
      insert = selected ? `\n## ${selected}` : "\n## Heading"
      cursorOffset = insert.length
      break
    case "bullet":
      insert = selected
        ? selected.split("\n").map(l => `• ${l}`).join("\n")
        : "• "
      cursorOffset = insert.length
      break
    case "numbered":
      insert = selected
        ? selected.split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n")
        : "1. "
      cursorOffset = insert.length
      break
    case "divider":
      insert = "\n---\n"
      cursorOffset = insert.length
      break
  }

  const newValue = value.substring(0, start) + insert + value.substring(end)
  setValue(newValue)
  setSaved(false)

  // Restore cursor position after React re-render
  requestAnimationFrame(() => {
    textarea.focus()
    const pos = start + cursorOffset
    textarea.setSelectionRange(pos, pos)
  })
}

/** Helper: check if a value is actually concerning (not "None", "No", "mild", etc.) */
export function isConcerningValue(val: unknown): boolean {
  if (!val) return false
  const str = String(val).toLowerCase().trim()
  const benign = new Set(["none", "no", "n/a", "nil", "not applicable", "false", "true", "mild", "moderate", "low", "minimal", "minor"])
  return !benign.has(str)
}

export const MIN_CLINICAL_NOTES_LENGTH = 20

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getStatusColor(status: string) {
  switch (status) {
    case "approved":
    case "completed":
      return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
    case "declined":
      return "bg-destructive/10 text-destructive"
    case "pending_info":
      return "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
    case "awaiting_script":
      return "bg-dawn-50 dark:bg-dawn-500/10 text-dawn-700 dark:text-dawn-400 border-dawn-200 dark:border-dawn-500/20"
    default:
      return "bg-primary/10 text-primary"
  }
}
