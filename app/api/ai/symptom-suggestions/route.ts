import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getDefaultModel } from "@/lib/ai/provider"
import { applyRateLimit, getClientIdentifier } from "@/lib/rate-limit/redis"

export const runtime = "edge"

interface SuggestionRequest {
  input: string
  context: "med_cert" | "repeat_rx" | "consult"
  isCarer?: boolean
}

export async function POST(req: NextRequest) {
  try {
    // P1 FIX: Add rate limiting for Edge endpoint (IP-based for unauthenticated)
    const clientId = getClientIdentifier(req)
    const rateLimitResponse = await applyRateLimit(req, "standard", clientId)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body: SuggestionRequest = await req.json()
    const { input, context, isCarer } = body

    if (!input || input.length < 3) {
      return NextResponse.json({ suggestions: [] })
    }

    // Build context-aware prompt
    const contextPrompts = {
      med_cert: isCarer
        ? "The user is describing symptoms for someone they care for (carer's leave medical certificate)."
        : "The user is describing their symptoms for a medical certificate request.",
      repeat_rx:
        "The user is explaining why they need a repeat prescription renewed.",
      consult:
        "The user is describing what they want to discuss in a GP consultation.",
    }

    const prompt = `You are a medical intake assistant helping patients describe their symptoms clearly.

Context: ${contextPrompts[context]}

The patient has started typing: "${input}"

Based on this partial input, suggest 2-3 SHORT phrases (5-10 words each) that could help them complete their description. Focus on:
- Common symptom progressions
- Timing details (e.g., "since yesterday", "for 3 days")
- Severity indicators (e.g., "mild", "moderate")
- Impact on daily activities

Rules:
- Keep suggestions brief and natural
- Don't suggest anything that sounds alarming or requires emergency care
- Match the tone of what they've already written
- Suggestions should ADD to what they wrote, not replace it

Return ONLY a JSON array of strings, nothing else. Example: ["mild fever since yesterday", "affecting my sleep", "gradually improving"]`

    const { text } = await generateText({
      model: getDefaultModel(),
      prompt,
    })

    // Parse the response
    let suggestions: string[] = []
    try {
      // Clean the response - remove markdown code blocks if present
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
      suggestions = JSON.parse(cleaned)
      
      // Validate it's an array of strings
      if (!Array.isArray(suggestions)) {
        suggestions = []
      }
      suggestions = suggestions
        .filter((s): s is string => typeof s === "string")
        .slice(0, 3)
    } catch {
      // If parsing fails, return empty
      suggestions = []
    }

    return NextResponse.json({ suggestions })
  } catch (_error) {
    // Return empty suggestions on error - this is a non-critical feature
    return NextResponse.json({ suggestions: [] })
  }
}
