import { z } from "zod"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const submitFollowupSchema = z
  .object({
    followupId: z.string().regex(UUID_REGEX, "Invalid followup ID"),
    effectivenessRating: z.number().int().min(1).max(5),
    sideEffectsReported: z.boolean(),
    sideEffectsNotes: z.string().max(2000),
    adherenceDaysPerWeek: z.number().int().min(0).max(7),
    patientNotes: z.string().max(2000),
  })
  .superRefine((data, ctx) => {
    if (data.sideEffectsReported && data.sideEffectsNotes.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sideEffectsNotes"],
        message: "Please describe the side effects.",
      })
    }
  })

export type SubmitFollowupInput = z.infer<typeof submitFollowupSchema>
