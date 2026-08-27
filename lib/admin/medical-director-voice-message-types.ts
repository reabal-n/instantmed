export const VOICE_MESSAGE_STATUSES = ["new", "in_review", "resolved"] as const
export type VoiceMessageStatus = (typeof VOICE_MESSAGE_STATUSES)[number]

export const VOICE_MESSAGE_RESOLUTION_REASONS = [
  "actioned",
  "callback_completed",
  "unable_to_match",
  "duplicate",
  "no_action_required",
  "spam_test",
] as const
export type VoiceMessageResolutionReason =
  (typeof VOICE_MESSAGE_RESOLUTION_REASONS)[number]

export const VOICE_MESSAGE_RESOLUTION_LABELS:
  Record<VoiceMessageResolutionReason, string> = {
    actioned: "Actioned",
    callback_completed: "Callback completed",
    unable_to_match: "Unable to match",
    duplicate: "Duplicate",
    no_action_required: "No action required",
    spam_test: "Spam or test",
  }
