/**
 * AI Utilities - Central Export
 * 
 * All AI-related utilities for the platform.
 */

// Provider and model configuration
export {
  AI_MODEL_CONFIG,
  type AIModelType,
  getAdvancedModel,
  getAIApiKey,
  getConversationalModel,
  getCreativeModel,
  getDefaultModel,
  getModelWithConfig,
  isAIConfigured,
} from './provider'

// Prompts
export {
  CLINICAL_NOTE_PROMPT,
  CONTEXT_PROMPTS,
  DECLINE_REASON_PROMPT,
  FALLBACK_RESPONSES,
  MED_CERT_DRAFT_PROMPT,
  PROMPT_VERSION,
  REVIEW_SUMMARY_PROMPT,
  SYMPTOM_SUGGESTIONS_PROMPT,
} from './prompts'

// Audit logging
export {
  type AIAuditParams,
  logAIAudit,
  logDoctorFeedback,
  trackTokenUsage,
} from './audit'

// Caching
export {
  getCachedResponse,
  getCacheStats,
  invalidateCache,
  setCachedResponse,
} from './cache'

// Confidence scoring
export {
  calculateConfidence,
  type ConfidenceResult,
  type FlaggedSection,
  getConfidenceBadge,
} from './confidence'
