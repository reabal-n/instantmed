export const SOAP_SECTIONS = [
  { key: "S", label: "Subjective" },
  { key: "O", label: "Objective" },
  { key: "A", label: "Assessment" },
  { key: "P", label: "Plan" },
] as const

type SectionSpan = { start: number; end: number; value: string }
type SoapSections = Record<typeof SOAP_SECTIONS[number]["key"], SectionSpan>

/** Interpret only an unambiguous, ordered SOAP note. All other text stays plain. */
export function parseSoapDraft(note: string): SoapSections | null {
  const matches = Array.from(note.matchAll(/(?:^|\n)[ \t]*([SOAP]):[ \t]?/g))
  if (matches.length !== SOAP_SECTIONS.length || matches[0].index !== 0) return null
  const sections = {} as SoapSections
  for (let index = 0; index < SOAP_SECTIONS.length; index++) {
    const key = SOAP_SECTIONS[index].key
    const match = matches[index]
    if (match[1] !== key) return null
    const start = match.index! + match[0].length
    const end = matches[index + 1]?.index ?? note.length
    sections[key] = { start, end, value: note.slice(start, end) }
  }
  return sections
}

/** Replace only the edited span; retain original headers, whitespace and all other text. */
function replaceSoapSection(note: string, section: SectionSpan, value: string): string {
  return note.slice(0, section.start) + value + note.slice(section.end)
}

/** Keep the mounted editor's boundaries stable when a clinician types marker-like lines. */
export function editSoapSection(
  note: string,
  sections: SoapSections,
  key: keyof SoapSections,
  value: string,
): { note: string; sections: SoapSections } {
  const edited = sections[key]
  const delta = value.length - edited.value.length
  const next = { ...sections }
  for (const section of SOAP_SECTIONS) {
    const span = sections[section.key]
    if (section.key === key) next[key] = { ...span, value, end: span.end + delta }
    else if (span.start > edited.start) next[section.key] = { ...span, start: span.start + delta, end: span.end + delta }
  }
  return { note: replaceSoapSection(note, edited, value), sections: next }
}
