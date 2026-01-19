/**
 * AI Utilities - Central Export
 * 
 * All AI-related utilities for the platform.
 */

// Provider and model configuration
export {
  getDefaultModel,
  getAdvancedModel,
  getConversationalModel,
  getCreativeModel,
  getModelWithConfig,
  getAIApiKey,
  isAIConfigured,
  AI_MODEL_CONFIG,
  type AIModelType,
} from './provider'

// Prompts
export {
  PROMPT_VERSION,
  CLINICAL_NOTE_PROMPT,
  MED_CERT_DRAFT_PROMPT,
  REVIEW_SUMMARY_PROMPT,
  SYMPTOM_SUGGESTIONS_PROMPT,
  DECLINE_REASON_PROMPT,
  FALLBACK_RESPONSES,
  CONTEXT_PROMPTS,
} from './prompts'

// Audit logging
export {
  logAIAudit,
  trackTokenUsage,
  logDoctorFeedback,
  type AIAuditParams,
} from './audit'

// Caching
export {
  getCachedResponse,
  setCachedResponse,
  invalidateCache,
  getCacheStats,
} from './cache'

// Confidence scoring
export {
  calculateConfidence,
  getConfidenceBadge,
  type ConfidenceResult,
  type FlaggedSection,
} from './confidence'
