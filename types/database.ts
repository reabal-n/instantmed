export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["ai_audit_action"]
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["ai_actor_type"]
          completion_tokens: number | null
          created_at: string
          draft_id: string | null
          draft_type: Database["public"]["Enums"]["draft_type"] | null
          generation_duration_ms: number | null
          ground_truth_errors: Json | null
          ground_truth_passed: boolean | null
          id: string
          input_hash: string | null
          intake_id: string | null
          metadata: Json | null
          model: string | null
          output_hash: string | null
          prompt_tokens: number | null
          reason: string | null
          validation_errors: Json | null
          validation_passed: boolean | null
        }
        Insert: {
          action: Database["public"]["Enums"]["ai_audit_action"]
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["ai_actor_type"]
          completion_tokens?: number | null
          created_at?: string
          draft_id?: string | null
          draft_type?: Database["public"]["Enums"]["draft_type"] | null
          generation_duration_ms?: number | null
          ground_truth_errors?: Json | null
          ground_truth_passed?: boolean | null
          id?: string
          input_hash?: string | null
          intake_id?: string | null
          metadata?: Json | null
          model?: string | null
          output_hash?: string | null
          prompt_tokens?: number | null
          reason?: string | null
          validation_errors?: Json | null
          validation_passed?: boolean | null
        }
        Update: {
          action?: Database["public"]["Enums"]["ai_audit_action"]
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["ai_actor_type"]
          completion_tokens?: number | null
          created_at?: string
          draft_id?: string | null
          draft_type?: Database["public"]["Enums"]["draft_type"] | null
          generation_duration_ms?: number | null
          ground_truth_errors?: Json | null
          ground_truth_passed?: boolean | null
          id?: string
          input_hash?: string | null
          intake_id?: string | null
          metadata?: Json | null
          model?: string | null
          output_hash?: string | null
          prompt_tokens?: number | null
          reason?: string | null
          validation_errors?: Json | null
          validation_passed?: boolean | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          action: string
          request_id: string | null
          actor_id: string | null
          metadata: Json | null
          created_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          action: string
          request_id?: string | null
          actor_id?: string | null
          metadata?: Json | null
          created_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          action?: string
          request_id?: string | null
          actor_id?: string | null
          metadata?: Json | null
          created_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      intakes: {
        Row: {
          id: string
          patient_id: string
          service_id: string
          status: Database["public"]["Enums"]["intake_status"]
          payment_status: string | null
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          amount_paid: number | null
          paid_at: string | null
          is_priority: boolean
          sla_deadline: string | null
          flagged_for_followup: boolean
          risk_tier: Database["public"]["Enums"]["risk_tier"] | null
          risk_flags: string[] | null
          risk_score: number | null
          requires_live_consult: boolean
          reviewed_by: string | null
          reviewed_at: string | null
          outcome: string | null
          outcome_notes: string | null
          certificate_data: Json | null
          created_at: string
          updated_at: string
          claimed_by: string | null
          claimed_at: string | null
          assigned_admin_id: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          service_id: string
          status?: Database["public"]["Enums"]["intake_status"]
          payment_status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          amount_paid?: number | null
          paid_at?: string | null
          is_priority?: boolean
          sla_deadline?: string | null
          flagged_for_followup?: boolean
          risk_tier?: Database["public"]["Enums"]["risk_tier"] | null
          risk_flags?: string[] | null
          risk_score?: number | null
          requires_live_consult?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          certificate_data?: Json | null
          created_at?: string
          updated_at?: string
          claimed_by?: string | null
          claimed_at?: string | null
          assigned_admin_id?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          service_id?: string
          status?: Database["public"]["Enums"]["intake_status"]
          payment_status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          amount_paid?: number | null
          paid_at?: string | null
          is_priority?: boolean
          sla_deadline?: string | null
          flagged_for_followup?: boolean
          risk_tier?: Database["public"]["Enums"]["risk_tier"] | null
          risk_flags?: string[] | null
          risk_score?: number | null
          requires_live_consult?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          certificate_data?: Json | null
          created_at?: string
          updated_at?: string
          claimed_by?: string | null
          claimed_at?: string | null
          assigned_admin_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          auth_user_id: string | null
          clerk_user_id: string | null
          full_name: string
          date_of_birth: string
          role: string
          created_at: string | null
          updated_at: string | null
          phone: string | null
          address_line1: string | null
          suburb: string | null
          state: string | null
          postcode: string | null
          medicare_number: string | null
          medicare_irn: number | null
          medicare_expiry: string | null
          consent_myhr: boolean | null
          onboarding_completed: boolean | null
          stripe_customer_id: string | null
          email: string | null
          ahpra_number: string | null
          provider_number: string | null
          nominals: string | null
          signature_storage_path: string | null
          certificate_identity_complete: boolean | null
          medicare_number_encrypted: string | null
          date_of_birth_encrypted: string | null
          phone_encrypted: string | null
          phi_encrypted_at: string | null
          email_verified: boolean
          email_verified_at: string | null
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          clerk_user_id?: string | null
          full_name: string
          date_of_birth: string
          role?: string
          created_at?: string | null
          updated_at?: string | null
          phone?: string | null
          address_line1?: string | null
          suburb?: string | null
          state?: string | null
          postcode?: string | null
          medicare_number?: string | null
          medicare_irn?: number | null
          medicare_expiry?: string | null
          consent_myhr?: boolean | null
          onboarding_completed?: boolean | null
          stripe_customer_id?: string | null
          email?: string | null
          ahpra_number?: string | null
          provider_number?: string | null
          nominals?: string | null
          signature_storage_path?: string | null
          certificate_identity_complete?: boolean | null
          medicare_number_encrypted?: string | null
          date_of_birth_encrypted?: string | null
          phone_encrypted?: string | null
          phi_encrypted_at?: string | null
          email_verified?: boolean
          email_verified_at?: string | null
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          clerk_user_id?: string | null
          full_name?: string
          date_of_birth?: string
          role?: string
          created_at?: string | null
          updated_at?: string | null
          phone?: string | null
          address_line1?: string | null
          suburb?: string | null
          state?: string | null
          postcode?: string | null
          medicare_number?: string | null
          medicare_irn?: number | null
          medicare_expiry?: string | null
          consent_myhr?: boolean | null
          onboarding_completed?: boolean | null
          stripe_customer_id?: string | null
          email?: string | null
          ahpra_number?: string | null
          provider_number?: string | null
          nominals?: string | null
          signature_storage_path?: string | null
          certificate_identity_complete?: boolean | null
          medicare_number_encrypted?: string | null
          date_of_birth_encrypted?: string | null
          phone_encrypted?: string | null
          phi_encrypted_at?: string | null
          email_verified?: boolean
          email_verified_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          slug: string
          name: string
          short_name: string | null
          description: string | null
          type: Database["public"]["Enums"]["service_type"]
          price_cents: number
          priority_price_cents: number | null
          stripe_price_id: string | null
          stripe_priority_price_id: string | null
          is_active: boolean
          requires_id_verification: boolean
          max_days_certificate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          short_name?: string | null
          description?: string | null
          type: Database["public"]["Enums"]["service_type"]
          price_cents: number
          priority_price_cents?: number | null
          stripe_price_id?: string | null
          stripe_priority_price_id?: string | null
          is_active?: boolean
          requires_id_verification?: boolean
          max_days_certificate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          short_name?: string | null
          description?: string | null
          type?: Database["public"]["Enums"]["service_type"]
          price_cents?: number
          priority_price_cents?: number | null
          stripe_price_id?: string | null
          stripe_priority_price_id?: string | null
          is_active?: boolean
          requires_id_verification?: boolean
          max_days_certificate?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      issued_certificates: {
        Row: {
          id: string
          intake_id: string
          patient_id: string
          doctor_id: string
          certificate_number: string
          verification_code: string
          certificate_type: string
          status: Database["public"]["Enums"]["certificate_status"]
          issued_at: string
          valid_from: string
          valid_to: string | null
          storage_path: string
          pdf_hash: string | null
          metadata: Json | null
          revoked_at: string | null
          revoked_by: string | null
          revocation_reason: string | null
          superseded_by: string | null
          edit_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          intake_id: string
          patient_id: string
          doctor_id: string
          certificate_number: string
          verification_code: string
          certificate_type: string
          status?: Database["public"]["Enums"]["certificate_status"]
          issued_at?: string
          valid_from: string
          valid_to?: string | null
          storage_path: string
          pdf_hash?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          revocation_reason?: string | null
          superseded_by?: string | null
          edit_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          intake_id?: string
          patient_id?: string
          doctor_id?: string
          certificate_number?: string
          verification_code?: string
          certificate_type?: string
          status?: Database["public"]["Enums"]["certificate_status"]
          issued_at?: string
          valid_from?: string
          valid_to?: string | null
          storage_path?: string
          pdf_hash?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          revocation_reason?: string | null
          superseded_by?: string | null
          edit_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_tracking: {
        Row: {
          id: string
          intake_id: string | null
          recipient_id: string | null
          channel: string
          message_type: string
          status: string
          provider_message_id: string | null
          sent_at: string | null
          delivered_at: string | null
          failed_at: string | null
          failure_reason: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          intake_id?: string | null
          recipient_id?: string | null
          channel: string
          message_type: string
          status?: string
          provider_message_id?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          intake_id?: string | null
          recipient_id?: string | null
          channel?: string
          message_type?: string
          status?: string
          provider_message_id?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_concurrent_claims: {
        Row: {
          intake_id: string | null
          status: Database["public"]["Enums"]["intake_status"] | null
          claimed_by: string | null
          claimed_by_name: string | null
          claimed_at: string | null
          minutes_claimed: number | null
          claim_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_intake_for_review: {
        Args: { p_intake_id: string; p_doctor_id: string }
        Returns: boolean
      }
      release_intake_claim: {
        Args: { p_intake_id: string; p_doctor_id: string }
        Returns: boolean
      }
      release_stale_intake_claims: {
        Args: { p_timeout_minutes: number }
        Returns: number
      }
    }
    Enums: {
      ai_actor_type: "system" | "doctor" | "patient"
      ai_audit_action: "generate" | "approve" | "reject" | "regenerate" | "edit"
      certificate_status: "valid" | "revoked" | "superseded" | "expired"
      draft_type: "clinical_note" | "med_cert"
      email_status: "pending" | "sent" | "failed" | "bounced" | "retrying"
      intake_status:
        | "draft"
        | "pending_payment"
        | "paid"
        | "in_review"
        | "pending_info"
        | "approved"
        | "declined"
        | "escalated"
        | "completed"
        | "cancelled"
        | "expired"
      risk_tier: "low" | "moderate" | "high" | "critical"
      service_type:
        | "weight_loss"
        | "mens_health"
        | "womens_health"
        | "common_scripts"
        | "med_certs"
        | "referrals"
        | "pathology"
        | "consult"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

// Commonly used types
export type Profile = Tables<"profiles">
export type Intake = Tables<"intakes">
export type Service = Tables<"services">
export type IssuedCertificate = Tables<"issued_certificates">
export type AuditLog = Tables<"audit_logs">
export type DeliveryTracking = Tables<"delivery_tracking">
