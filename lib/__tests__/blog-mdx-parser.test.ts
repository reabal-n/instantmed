import { describe, expect, it } from "vitest"

import {
  findMalformedArticleComponentBlocks,
  findUnknownArticleComponentTags,
  parseMDXBodyToSections,
} from "@/lib/blog/mdx"

describe("blog MDX parser", () => {
  it("parses KeyTakeaway blocks into typed sections", () => {
    const sections = parseMDXBodyToSections(`
<KeyTakeaway title="Short answer">
- Check the policy first.
- Keep the certificate dates clear.
</KeyTakeaway>
`)

    expect(sections).toEqual([
      expect.objectContaining({
        type: "keyTakeaway",
        title: "Short answer",
        items: ["Check the policy first.", "Keep the certificate dates clear."],
      }),
    ])
  })

  it("parses DecisionBox blocks with exact fixed groups", () => {
    const sections = parseMDXBodyToSections(`
<DecisionBox title="Where this fits">
### May fit telehealth
- Routine paperwork question.
### Needs in-person care
- A physical examination is needed.
### Urgent care
- Chest pain or breathing trouble.
</DecisionBox>
`)

    expect(sections[0]).toMatchObject({
      type: "decisionBox",
      title: "Where this fits",
      groups: [
        { title: "May fit telehealth", items: ["Routine paperwork question."] },
        { title: "Needs in-person care", items: ["A physical examination is needed."] },
        { title: "Urgent care", items: ["Chest pain or breathing trouble."] },
      ],
    })
  })

  it("supports inline forms for evidence and policy notes", () => {
    const sections = parseMDXBodyToSections(`
<EvidenceNote title="Source note" source="AHPRA">Use the live register, not a screenshot.</EvidenceNote>
<PolicyNote title="Workplace policy">Employer evidence rules can vary.</PolicyNote>
`)

    expect(sections).toEqual([
      expect.objectContaining({
        type: "evidenceNote",
        title: "Source note",
        source: "AHPRA",
        content: "Use the live register, not a screenshot.",
      }),
      expect.objectContaining({
        type: "policyNote",
        title: "Workplace policy",
        content: "Employer evidence rules can vary.",
      }),
    ])
  })

  it("falls back safely for malformed supported blocks", () => {
    const body = `
<KeyTakeaway title="Broken">
This should have been a bullet.
</KeyTakeaway>
`

    expect(findMalformedArticleComponentBlocks(body)).toEqual([
      "KeyTakeaway block is malformed near line 2",
    ])
    expect(parseMDXBodyToSections(body)[0]).toMatchObject({
      type: "callout",
      variant: "info",
      content: "This should have been a bullet.",
    })
  })

  it("detects unknown capitalized tags and does not render raw tag text", () => {
    const body = `
<UnsupportedWidget>
Keep this prose.
</UnsupportedWidget>
`

    expect(findUnknownArticleComponentTags(body)).toEqual(["UnsupportedWidget"])
    expect(parseMDXBodyToSections(body)).toEqual([
      expect.objectContaining({
        type: "paragraph",
        content: "Keep this prose.",
      }),
    ])
  })

  it("keeps existing Callout and Markdown table parsing behavior", () => {
    const sections = parseMDXBodyToSections(`
<Callout variant="tip">Check the source before relying on it.</Callout>

| Situation | Better next step |
| --- | --- |
| Unclear policy | Ask the employer |
`)

    expect(sections[0]).toMatchObject({
      type: "callout",
      variant: "tip",
      content: "Check the source before relying on it.",
    })
    expect(sections[1]).toMatchObject({
      type: "table",
      headers: ["Situation", "Better next step"],
      rows: [["Unclear policy", "Ask the employer"]],
    })
  })
})
