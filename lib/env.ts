/**
 * Re-export from canonical location.
 * All imports should use "@/lib/config/env" directly.
 * This file exists only to prevent broken imports.
 */
export {
  env,
  getAdminEmails,
  getAppUrl,
  getInternalApiSecret,
  getResendApiKey,
  getResendFromEmail,
  getResendWebhookSecret,
  getStripeSecretKey,
  getStripeWebhookSecret,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  getVercelAIGatewayApiKey,
  isAdminEmail,
} from "@/lib/config/env"
