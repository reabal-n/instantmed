export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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
        Relationships: [
          {
            foreignKeyName: "ai_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_log_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "document_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_log_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_log_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_audit_log: {
        Row: {
          ai_output_length: number | null
          ai_output_preview: string | null
          block_reason: string | null
          created_at: string
          had_flags: boolean | null
          id: string
          input_tokens: number | null
          metadata: Json | null
          model_version: string
          output_tokens: number | null
          patient_id: string | null
          prompt_version: string
          response_time_ms: number | null
          safety_flags: string[] | null
          service_type: string | null
          session_id: string
          turn_number: number
          user_input_length: number | null
          user_input_preview: string | null
          was_blocked: boolean | null
        }
        Insert: {
          ai_output_length?: number | null
          ai_output_preview?: string | null
          block_reason?: string | null
          created_at?: string
          had_flags?: boolean | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_version: string
          output_tokens?: number | null
          patient_id?: string | null
          prompt_version: string
          response_time_ms?: number | null
          safety_flags?: string[] | null
          service_type?: string | null
          session_id: string
          turn_number?: number
          user_input_length?: number | null
          user_input_preview?: string | null
          was_blocked?: boolean | null
        }
        Update: {
          ai_output_length?: number | null
          ai_output_preview?: string | null
          block_reason?: string | null
          created_at?: string
          had_flags?: boolean | null
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_version?: string
          output_tokens?: number | null
          patient_id?: string | null
          prompt_version?: string
          response_time_ms?: number | null
          safety_flags?: string[] | null
          service_type?: string | null
          session_id?: string
          turn_number?: number
          user_input_length?: number | null
          user_input_preview?: string | null
          was_blocked?: boolean | null
        }
        Relationships: []
      }
      ai_doctor_feedback: {
        Row: {
          created_at: string
          doctor_id: string | null
          draft_id: string | null
          draft_type: string
          edit_ratio: number
          edited_length: number
          id: string
          original_length: number
          was_significant_edit: boolean
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          draft_id?: string | null
          draft_type: string
          edit_ratio: number
          edited_length: number
          id?: string
          original_length: number
          was_significant_edit?: boolean
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          draft_id?: string | null
          draft_type?: string
          edit_ratio?: number
          edited_length?: number
          id?: string
          original_length?: number
          was_significant_edit?: boolean
        }
        Relationships: []
      }
      ai_draft_retry_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          intake_id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          intake_id: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          intake_id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_draft_retry_queue_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_draft_retry_queue_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_intake_completions: {
        Row: {
          collected_fields: string[] | null
          created_at: string
          flags: string[] | null
          had_flags: boolean | null
          id: string
          patient_id: string | null
          service_type: string
          session_id: string
          total_time_ms: number | null
          total_turns: number
        }
        Insert: {
          collected_fields?: string[] | null
          created_at?: string
          flags?: string[] | null
          had_flags?: boolean | null
          id?: string
          patient_id?: string | null
          service_type: string
          session_id: string
          total_time_ms?: number | null
          total_turns: number
        }
        Update: {
          collected_fields?: string[] | null
          created_at?: string
          flags?: string[] | null
          had_flags?: boolean | null
          id?: string
          patient_id?: string | null
          service_type?: string
          session_id?: string
          total_time_ms?: number | null
          total_turns?: number
        }
        Relationships: []
      }
      ai_safety_blocks: {
        Row: {
          block_type: string
          created_at: string
          id: string
          model_version: string | null
          patient_id: string | null
          session_id: string
          trigger_preview: string | null
        }
        Insert: {
          block_type: string
          created_at?: string
          id?: string
          model_version?: string | null
          patient_id?: string | null
          session_id: string
          trigger_preview?: string | null
        }
        Update: {
          block_type?: string
          created_at?: string
          id?: string
          model_version?: string | null
          patient_id?: string | null
          session_id?: string
          trigger_preview?: string | null
        }
        Relationships: []
      }
      ai_token_usage: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          input_tokens: number
          model_version: string
          output_tokens: number
          response_time_ms: number | null
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          input_tokens?: number
          model_version: string
          output_tokens?: number
          response_time_ms?: number | null
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          input_tokens?: number
          model_version?: string
          output_tokens?: number
          response_time_ms?: number | null
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      amt_search_cache: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          query_norm: string
          results: Json
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          query_norm: string
          results: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          query_norm?: string
          results?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          admin_action_id: string | null
          archived_at: string | null
          client_ip: string | null
          client_user_agent: string | null
          created_at: string | null
          description: string | null
          from_state: string | null
          id: string
          intake_id: string | null
          ip_address: string | null
          metadata: Json | null
          new_state: Json | null
          previous_state: Json | null
          profile_id: string | null
          request_id: string | null
          retention_tier: string | null
          to_state: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string
          admin_action_id?: string | null
          archived_at?: string | null
          client_ip?: string | null
          client_user_agent?: string | null
          created_at?: string | null
          description?: string | null
          from_state?: string | null
          id?: string
          intake_id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          profile_id?: string | null
          request_id?: string | null
          retention_tier?: string | null
          to_state?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          admin_action_id?: string | null
          archived_at?: string | null
          client_ip?: string | null
          client_user_agent?: string | null
          created_at?: string | null
          description?: string | null
          from_state?: string | null
          id?: string
          intake_id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          profile_id?: string | null
          request_id?: string | null
          retention_tier?: string | null
          to_state?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_archive: {
        Row: {
          action: string
          actor_id: string | null
          archived_at: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          original_retention_tier: string | null
          request_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          archived_at?: string
          created_at: string
          id: string
          ip_address?: string | null
          metadata?: Json | null
          original_retention_tier?: string | null
          request_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          archived_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          original_retention_tier?: string | null
          request_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      certificate_audit_log: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          certificate_id: string
          created_at: string
          event_data: Json
          event_type: Database["public"]["Enums"]["certificate_event_type"]
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          certificate_id: string
          created_at?: string
          event_data?: Json
          event_type: Database["public"]["Enums"]["certificate_event_type"]
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          certificate_id?: string
          created_at?: string
          event_data?: Json
          event_type?: Database["public"]["Enums"]["certificate_event_type"]
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_audit_log_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "issued_certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_edit_history: {
        Row: {
          certificate_id: string | null
          change_summary: string | null
          created_at: string
          doctor_id: string
          edit_reason: string | null
          edit_timestamp: string
          field_name: string
          id: string
          intake_id: string
          new_value: string | null
          original_value: string | null
        }
        Insert: {
          certificate_id?: string | null
          change_summary?: string | null
          created_at?: string
          doctor_id: string
          edit_reason?: string | null
          edit_timestamp?: string
          field_name: string
          id?: string
          intake_id: string
          new_value?: string | null
          original_value?: string | null
        }
        Update: {
          certificate_id?: string | null
          change_summary?: string | null
          created_at?: string
          doctor_id?: string
          edit_reason?: string | null
          edit_timestamp?: string
          field_name?: string
          id?: string
          intake_id?: string
          new_value?: string | null
          original_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_edit_history_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "issued_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_edit_history_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_edit_history_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_edit_history_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          template_type: string
          version: number
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          config: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          template_type: string
          version: number
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_type?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_identity: {
        Row: {
          abn: string
          address_line_1: string
          address_line_2: string | null
          clinic_name: string
          created_at: string
          created_by: string | null
          email: string | null
          footer_disclaimer: string | null
          id: string
          is_active: boolean
          logo_storage_path: string | null
          phone: string | null
          postcode: string
          state: string
          suburb: string
          trading_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abn: string
          address_line_1: string
          address_line_2?: string | null
          clinic_name: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          footer_disclaimer?: string | null
          id?: string
          is_active?: boolean
          logo_storage_path?: string | null
          phone?: string | null
          postcode: string
          state: string
          suburb: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abn?: string
          address_line_1?: string
          address_line_2?: string | null
          clinic_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          footer_disclaimer?: string | null
          id?: string
          is_active?: boolean
          logo_storage_path?: string | null
          phone?: string | null
          postcode?: string
          state?: string
          suburb?: string
          trading_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_identity_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_identity_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_audit_log: {
        Row: {
          actor_id: string | null
          actor_role: string
          call_completed_before_decision: boolean | null
          call_occurred: boolean | null
          call_required: boolean | null
          created_at: string
          event_data: Json
          event_type: Database["public"]["Enums"]["compliance_event_type"]
          external_prescribing_reference: string | null
          id: string
          ip_address: unknown
          is_human_action: boolean
          outcome: string | null
          prescribing_occurred_in_platform: boolean | null
          previous_outcome: string | null
          request_id: string
          request_type: string
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role: string
          call_completed_before_decision?: boolean | null
          call_occurred?: boolean | null
          call_required?: boolean | null
          created_at?: string
          event_data?: Json
          event_type: Database["public"]["Enums"]["compliance_event_type"]
          external_prescribing_reference?: string | null
          id?: string
          ip_address?: unknown
          is_human_action?: boolean
          outcome?: string | null
          prescribing_occurred_in_platform?: boolean | null
          previous_outcome?: string | null
          request_id: string
          request_type: string
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          call_completed_before_decision?: boolean | null
          call_occurred?: boolean | null
          call_required?: boolean | null
          created_at?: string
          event_data?: Json
          event_type?: Database["public"]["Enums"]["compliance_event_type"]
          external_prescribing_reference?: string | null
          id?: string
          ip_address?: unknown
          is_human_action?: boolean
          outcome?: string | null
          prescribing_occurred_in_platform?: boolean | null
          previous_outcome?: string | null
          request_id?: string
          request_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blocks: {
        Row: {
          category: string
          content: string
          content_type: string
          context: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          key: string
          max_length: number | null
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          content: string
          content_type?: string
          context?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          key: string
          max_length?: number | null
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          content?: string
          content_type?: string
          context?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          key?: string
          max_length?: number | null
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_runs: {
        Row: {
          created_at: string | null
          id: string
          job_name: string
          last_result: Json | null
          last_run_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_name: string
          last_result?: Json | null
          last_run_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_name?: string
          last_result?: Json | null
          last_run_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      decline_reason_templates: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          email_template: string | null
          id: string
          is_active: boolean | null
          label: string
          requires_note: boolean | null
          service_types: string[] | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          requires_note?: boolean | null
          service_types?: string[] | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          requires_note?: boolean | null
          service_types?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_tracking: {
        Row: {
          channel: string
          created_at: string
          delivered_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          intake_id: string | null
          message_type: string
          metadata: Json | null
          provider_message_id: string | null
          recipient_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          intake_id?: string | null
          message_type: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          intake_id?: string | null
          message_type?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      distributed_locks: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          key: string
          lock_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          key: string
          lock_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          key?: string
          lock_id?: string
        }
        Relationships: []
      }
      document_drafts: {
        Row: {
          alert_sent: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          data: Json
          data_encrypted: Json | null
          edited_content: Json | null
          encryption_metadata: Json | null
          id: string
          input_hash: string | null
          intake_id: string | null
          is_ai_generated: boolean | null
          last_retry_at: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          request_id: string
          retry_count: number | null
          subtype: string
          type: string
          updated_at: string | null
          version: number
        }
        Insert: {
          alert_sent?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          data?: Json
          data_encrypted?: Json | null
          edited_content?: Json | null
          encryption_metadata?: Json | null
          id?: string
          input_hash?: string | null
          intake_id?: string | null
          is_ai_generated?: boolean | null
          last_retry_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_id: string
          retry_count?: number | null
          subtype: string
          type: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          alert_sent?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          data?: Json
          data_encrypted?: Json | null
          edited_content?: Json | null
          encryption_metadata?: Json | null
          id?: string
          input_hash?: string | null
          intake_id?: string | null
          is_ai_generated?: boolean | null
          last_retry_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_id?: string
          retry_count?: number | null
          subtype?: string
          type?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_drafts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_drafts_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_drafts_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_drafts_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_drafts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      document_generation_retries: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          document_type: string
          id: string
          last_error: string | null
          next_retry_at: string | null
          request_id: string
          status: string
          subtype: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          document_type: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          request_id: string
          status?: string
          subtype?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          document_type?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          request_id?: string
          status?: string
          subtype?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      document_verifications: {
        Row: {
          created_at: string | null
          document_id: string | null
          document_type: string
          expires_at: string | null
          id: string
          is_valid: boolean | null
          issued_at: string | null
          request_id: string
          verification_code: string
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          document_type: string
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          issued_at?: string | null
          request_id: string
          verification_code: string
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          document_type?: string
          expires_at?: string | null
          id?: string
          is_valid?: boolean | null
          issued_at?: string | null
          request_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_verifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_verifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          id: string
          pdf_url: string
          request_id: string
          subtype: string
          type: string
          updated_at: string | null
          verification_code: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pdf_url: string
          request_id: string
          subtype: string
          type: string
          updated_at?: string | null
          verification_code?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pdf_url?: string
          request_id?: string
          subtype?: string
          type?: string
          updated_at?: string | null
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_log: {
        Row: {
          certificate_id: string | null
          created_at: string
          email_type: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          intake_id: string | null
          last_retry_at: string | null
          max_retries: number | null
          next_retry_at: string | null
          recipient_email: string
          recipient_id: string | null
          resend_message_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string
        }
        Insert: {
          certificate_id?: string | null
          created_at?: string
          email_type: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          intake_id?: string | null
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          recipient_email: string
          recipient_id?: string | null
          resend_message_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
        }
        Update: {
          certificate_id?: string | null
          created_at?: string
          email_type?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          intake_id?: string | null
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          recipient_email?: string
          recipient_id?: string | null
          resend_message_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_log_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "issued_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_delivery_log_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_delivery_log_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_delivery_log_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          id: string
          metadata: Json | null
          recipient_email: string
          request_id: string | null
          sent_at: string | null
          subject: string
          template_type: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          recipient_email: string
          request_id?: string | null
          sent_at?: string | null
          subject: string
          template_type: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          recipient_email?: string
          request_id?: string | null
          sent_at?: string | null
          subject?: string
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          certificate_id: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          intake_id: string | null
          metadata: Json | null
          patient_id: string | null
          provider: string
          provider_message_id: string | null
          retry_count: number
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          certificate_id?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          intake_id?: string | null
          metadata?: Json | null
          patient_id?: string | null
          provider?: string
          provider_message_id?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          certificate_id?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          intake_id?: string | null
          metadata?: Json | null
          patient_id?: string | null
          provider?: string
          provider_message_id?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "issued_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          abandoned_checkout_emails: boolean
          created_at: string
          id: string
          marketing_emails: boolean
          profile_id: string
          transactional_emails: boolean
          unsubscribe_reason: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          abandoned_checkout_emails?: boolean
          created_at?: string
          id?: string
          marketing_emails?: boolean
          profile_id: string
          transactional_emails?: boolean
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          abandoned_checkout_emails?: boolean
          created_at?: string
          id?: string
          marketing_emails?: boolean
          profile_id?: string
          transactional_emails?: boolean
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_retry_queue: {
        Row: {
          created_at: string
          email_type: string
          html: string
          id: string
          intake_id: string | null
          last_error: string | null
          next_retry_at: string | null
          recipient: string
          retry_count: number
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_type: string
          html: string
          id?: string
          intake_id?: string | null
          last_error?: string | null
          next_retry_at?: string | null
          recipient: string
          retry_count?: number
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_type?: string
          html?: string
          id?: string
          intake_id?: string | null
          last_error?: string | null
          next_retry_at?: string | null
          recipient?: string
          retry_count?: number
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_retry_queue_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_retry_queue_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          available_tags: Json | null
          body_html: string
          body_text: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          subject: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          available_tags?: Json | null
          body_html: string
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          subject: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          available_tags?: Json | null
          body_html?: string
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_migration_status: {
        Row: {
          completed_at: string | null
          created_at: string | null
          encrypted_records: number
          error_count: number | null
          id: string
          last_error: string | null
          started_at: string | null
          table_name: string
          total_records: number
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          encrypted_records?: number
          error_count?: number | null
          id?: string
          last_error?: string | null
          started_at?: string | null
          table_name: string
          total_records?: number
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          encrypted_records?: number
          error_count?: number | null
          id?: string
          last_error?: string | null
          started_at?: string | null
          table_name?: string
          total_records?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      failed_profile_merges: {
        Row: {
          created_at: string | null
          error_message: string | null
          guest_profile_id: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
          target_profile_id: string
          updated_at: string | null
          user_email: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          guest_profile_id: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          target_profile_id: string
          updated_at?: string | null
          user_email?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          guest_profile_id?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          target_profile_id?: string
          updated_at?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "failed_profile_merges_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      fraud_flags: {
        Row: {
          created_at: string | null
          details: Json | null
          flag_type: string
          id: string
          patient_id: string | null
          request_id: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          flag_type: string
          id?: string
          patient_id?: string | null
          request_id?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          flag_type?: string
          id?: string
          patient_id?: string | null
          request_id?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_flags_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      info_request_templates: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          message_template: string | null
          service_types: string[] | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          message_template?: string | null
          service_types?: string[] | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          message_template?: string | null
          service_types?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      intake_answers: {
        Row: {
          absence_days: number | null
          absence_end_date: string | null
          absence_start_date: string | null
          allergy_details: string | null
          answers: Json
          answers_enc: Json | null
          answers_encrypted: Json | null
          bmi: number | null
          cardiovascular_risk_factors: string[] | null
          created_at: string | null
          current_medications: string[] | null
          current_weight_kg: number | null
          ed_duration: string | null
          ed_frequency: string | null
          employer_name: string | null
          encryption_metadata: Json | null
          has_allergies: boolean | null
          has_current_medications: boolean | null
          has_medical_conditions: boolean | null
          height_cm: number | null
          id: string
          intake_id: string
          medical_conditions: string[] | null
          pregnancy_status: string | null
          previous_weight_loss_attempts: string[] | null
          questionnaire_version: string | null
          reason_category: string | null
          red_flags: string[] | null
          symptom_duration: string | null
          symptom_severity: string | null
          target_weight_kg: number | null
          updated_at: string | null
          yellow_flags: string[] | null
        }
        Insert: {
          absence_days?: number | null
          absence_end_date?: string | null
          absence_start_date?: string | null
          allergy_details?: string | null
          answers?: Json
          answers_enc?: Json | null
          answers_encrypted?: Json | null
          bmi?: number | null
          cardiovascular_risk_factors?: string[] | null
          created_at?: string | null
          current_medications?: string[] | null
          current_weight_kg?: number | null
          ed_duration?: string | null
          ed_frequency?: string | null
          employer_name?: string | null
          encryption_metadata?: Json | null
          has_allergies?: boolean | null
          has_current_medications?: boolean | null
          has_medical_conditions?: boolean | null
          height_cm?: number | null
          id?: string
          intake_id: string
          medical_conditions?: string[] | null
          pregnancy_status?: string | null
          previous_weight_loss_attempts?: string[] | null
          questionnaire_version?: string | null
          reason_category?: string | null
          red_flags?: string[] | null
          symptom_duration?: string | null
          symptom_severity?: string | null
          target_weight_kg?: number | null
          updated_at?: string | null
          yellow_flags?: string[] | null
        }
        Update: {
          absence_days?: number | null
          absence_end_date?: string | null
          absence_start_date?: string | null
          allergy_details?: string | null
          answers?: Json
          answers_enc?: Json | null
          answers_encrypted?: Json | null
          bmi?: number | null
          cardiovascular_risk_factors?: string[] | null
          created_at?: string | null
          current_medications?: string[] | null
          current_weight_kg?: number | null
          ed_duration?: string | null
          ed_frequency?: string | null
          employer_name?: string | null
          encryption_metadata?: Json | null
          has_allergies?: boolean | null
          has_current_medications?: boolean | null
          has_medical_conditions?: boolean | null
          height_cm?: number | null
          id?: string
          intake_id?: string
          medical_conditions?: string[] | null
          pregnancy_status?: string | null
          previous_weight_loss_attempts?: string[] | null
          questionnaire_version?: string | null
          reason_category?: string | null
          red_flags?: string[] | null
          symptom_duration?: string | null
          symptom_severity?: string | null
          target_weight_kg?: number | null
          updated_at?: string | null
          yellow_flags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_answers_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_answers_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_documents: {
        Row: {
          certificate_number: string | null
          created_at: string | null
          created_by: string | null
          document_type: string
          file_size_bytes: number | null
          filename: string
          id: string
          intake_id: string
          metadata: Json | null
          mime_type: string | null
          storage_path: string
          updated_at: string | null
          verification_code: string | null
        }
        Insert: {
          certificate_number?: string | null
          created_at?: string | null
          created_by?: string | null
          document_type: string
          file_size_bytes?: number | null
          filename: string
          id?: string
          intake_id: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path: string
          updated_at?: string | null
          verification_code?: string | null
        }
        Update: {
          certificate_number?: string | null
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          file_size_bytes?: number | null
          filename?: string
          id?: string
          intake_id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path?: string
          updated_at?: string | null
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_documents_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_documents_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_drafts: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          current_group_index: number | null
          current_step: string | null
          data: Json | null
          data_encrypted: Json | null
          encryption_metadata: Json | null
          id: string
          intake_id: string | null
          last_accessed_at: string | null
          request_id: string | null
          safety_evaluated_at: string | null
          safety_outcome: string | null
          safety_risk_tier: string | null
          safety_triggered_rules: string[] | null
          service_slug: string
          session_id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          current_group_index?: number | null
          current_step?: string | null
          data?: Json | null
          data_encrypted?: Json | null
          encryption_metadata?: Json | null
          id?: string
          intake_id?: string | null
          last_accessed_at?: string | null
          request_id?: string | null
          safety_evaluated_at?: string | null
          safety_outcome?: string | null
          safety_risk_tier?: string | null
          safety_triggered_rules?: string[] | null
          service_slug: string
          session_id: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          current_group_index?: number | null
          current_step?: string | null
          data?: Json | null
          data_encrypted?: Json | null
          encryption_metadata?: Json | null
          id?: string
          intake_id?: string | null
          last_accessed_at?: string | null
          request_id?: string | null
          safety_evaluated_at?: string | null
          safety_outcome?: string | null
          safety_risk_tier?: string | null
          safety_triggered_rules?: string[] | null
          service_slug?: string
          session_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      intake_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          created_at: string | null
          event_type: string
          from_status: Database["public"]["Enums"]["intake_status"] | null
          id: string
          intake_id: string
          metadata: Json | null
          to_status: Database["public"]["Enums"]["intake_status"] | null
        }
        Insert: {
          actor_id?: string | null
          actor_role: string
          created_at?: string | null
          event_type: string
          from_status?: Database["public"]["Enums"]["intake_status"] | null
          id?: string
          intake_id: string
          metadata?: Json | null
          to_status?: Database["public"]["Enums"]["intake_status"] | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string | null
          event_type?: string
          from_status?: Database["public"]["Enums"]["intake_status"] | null
          id?: string
          intake_id?: string
          metadata?: Json | null
          to_status?: Database["public"]["Enums"]["intake_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_events_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_events_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      intakes: {
        Row: {
          abandoned_email_sent_at: string | null
          admin_notes: string | null
          ai_draft_status: string | null
          amount_cents: number | null
          approved_at: string | null
          assigned_admin_id: string | null
          assigned_at: string | null
          cancelled_at: string | null
          category: string | null
          claimed_at: string | null
          claimed_by: string | null
          client_ip: string | null
          client_user_agent: string | null
          completed_at: string | null
          confirmation_email_sent_at: string | null
          created_at: string | null
          decided_at: string | null
          decision: string | null
          decline_reason: string | null
          decline_reason_code: string | null
          decline_reason_note: string | null
          declined_at: string | null
          dispute_id: string | null
          doctor_notes: string | null
          doctor_notes_enc: Json | null
          document_sent_at: string | null
          escalation_notes: string | null
          expired_at: string | null
          expiry_reason: string | null
          flagged_for_followup: boolean | null
          followup_reason: string | null
          generated_document_type: string | null
          generated_document_url: string | null
          guest_email: string | null
          id: string
          idempotency_key: string | null
          info_request_code: string | null
          info_request_message: string | null
          info_requested_at: string | null
          info_requested_by: string | null
          is_priority: boolean | null
          live_consult_reason: string | null
          notification_email_error: string | null
          notification_email_status: string | null
          paid_at: string | null
          parchment_reference: string | null
          patient_id: string
          payment_id: string | null
          payment_status: string | null
          prescription_sent_at: string | null
          prescription_sent_by: string | null
          prescription_sent_channel: string | null
          previous_status: Database["public"]["Enums"]["intake_status"] | null
          priority_review: boolean | null
          reference_number: string
          refund_amount_cents: number | null
          refund_error: string | null
          refund_status: Database["public"]["Enums"]["refund_status"] | null
          refund_stripe_id: string | null
          refunded_at: string | null
          refunded_by: string | null
          requires_live_consult: boolean | null
          review_started_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewing_doctor_id: string | null
          reviewing_doctor_name: string | null
          risk_flags: Json | null
          risk_reasons: Json | null
          risk_score: number | null
          risk_tier: Database["public"]["Enums"]["risk_tier"] | null
          script_notes: string | null
          script_sent: boolean | null
          script_sent_at: string | null
          service_id: string
          sla_breached: boolean | null
          sla_deadline: string | null
          sla_warning_sent: boolean | null
          status: Database["public"]["Enums"]["intake_status"]
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_price_id: string | null
          submitted_at: string | null
          subtype: string | null
          triage_reasons: Json | null
          triage_result: string | null
          updated_at: string | null
        }
        Insert: {
          abandoned_email_sent_at?: string | null
          admin_notes?: string | null
          ai_draft_status?: string | null
          amount_cents?: number | null
          approved_at?: string | null
          assigned_admin_id?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          category?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          client_ip?: string | null
          client_user_agent?: string | null
          completed_at?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string | null
          decided_at?: string | null
          decision?: string | null
          decline_reason?: string | null
          decline_reason_code?: string | null
          decline_reason_note?: string | null
          declined_at?: string | null
          dispute_id?: string | null
          doctor_notes?: string | null
          doctor_notes_enc?: Json | null
          document_sent_at?: string | null
          escalation_notes?: string | null
          expired_at?: string | null
          expiry_reason?: string | null
          flagged_for_followup?: boolean | null
          followup_reason?: string | null
          generated_document_type?: string | null
          generated_document_url?: string | null
          guest_email?: string | null
          id?: string
          idempotency_key?: string | null
          info_request_code?: string | null
          info_request_message?: string | null
          info_requested_at?: string | null
          info_requested_by?: string | null
          is_priority?: boolean | null
          live_consult_reason?: string | null
          notification_email_error?: string | null
          notification_email_status?: string | null
          paid_at?: string | null
          parchment_reference?: string | null
          patient_id: string
          payment_id?: string | null
          payment_status?: string | null
          prescription_sent_at?: string | null
          prescription_sent_by?: string | null
          prescription_sent_channel?: string | null
          previous_status?: Database["public"]["Enums"]["intake_status"] | null
          priority_review?: boolean | null
          reference_number?: string
          refund_amount_cents?: number | null
          refund_error?: string | null
          refund_status?: Database["public"]["Enums"]["refund_status"] | null
          refund_stripe_id?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          requires_live_consult?: boolean | null
          review_started_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewing_doctor_id?: string | null
          reviewing_doctor_name?: string | null
          risk_flags?: Json | null
          risk_reasons?: Json | null
          risk_score?: number | null
          risk_tier?: Database["public"]["Enums"]["risk_tier"] | null
          script_notes?: string | null
          script_sent?: boolean | null
          script_sent_at?: string | null
          service_id: string
          sla_breached?: boolean | null
          sla_deadline?: string | null
          sla_warning_sent?: boolean | null
          status?: Database["public"]["Enums"]["intake_status"]
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          submitted_at?: string | null
          subtype?: string | null
          triage_reasons?: Json | null
          triage_result?: string | null
          updated_at?: string | null
        }
        Update: {
          abandoned_email_sent_at?: string | null
          admin_notes?: string | null
          ai_draft_status?: string | null
          amount_cents?: number | null
          approved_at?: string | null
          assigned_admin_id?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          category?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          client_ip?: string | null
          client_user_agent?: string | null
          completed_at?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string | null
          decided_at?: string | null
          decision?: string | null
          decline_reason?: string | null
          decline_reason_code?: string | null
          decline_reason_note?: string | null
          declined_at?: string | null
          dispute_id?: string | null
          doctor_notes?: string | null
          doctor_notes_enc?: Json | null
          document_sent_at?: string | null
          escalation_notes?: string | null
          expired_at?: string | null
          expiry_reason?: string | null
          flagged_for_followup?: boolean | null
          followup_reason?: string | null
          generated_document_type?: string | null
          generated_document_url?: string | null
          guest_email?: string | null
          id?: string
          idempotency_key?: string | null
          info_request_code?: string | null
          info_request_message?: string | null
          info_requested_at?: string | null
          info_requested_by?: string | null
          is_priority?: boolean | null
          live_consult_reason?: string | null
          notification_email_error?: string | null
          notification_email_status?: string | null
          paid_at?: string | null
          parchment_reference?: string | null
          patient_id?: string
          payment_id?: string | null
          payment_status?: string | null
          prescription_sent_at?: string | null
          prescription_sent_by?: string | null
          prescription_sent_channel?: string | null
          previous_status?: Database["public"]["Enums"]["intake_status"] | null
          priority_review?: boolean | null
          reference_number?: string
          refund_amount_cents?: number | null
          refund_error?: string | null
          refund_status?: Database["public"]["Enums"]["refund_status"] | null
          refund_stripe_id?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          requires_live_consult?: boolean | null
          review_started_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewing_doctor_id?: string | null
          reviewing_doctor_name?: string | null
          risk_flags?: Json | null
          risk_reasons?: Json | null
          risk_score?: number | null
          risk_tier?: Database["public"]["Enums"]["risk_tier"] | null
          script_notes?: string | null
          script_sent?: boolean | null
          script_sent_at?: string | null
          service_id?: string
          sla_breached?: boolean | null
          sla_deadline?: string | null
          sla_warning_sent?: boolean | null
          status?: Database["public"]["Enums"]["intake_status"]
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_price_id?: string | null
          submitted_at?: string | null
          subtype?: string | null
          triage_reasons?: Json | null
          triage_result?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intakes_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_info_requested_by_fkey"
            columns: ["info_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_prescription_sent_by_fkey"
            columns: ["prescription_sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_reviewing_doctor_id_fkey"
            columns: ["reviewing_doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      issued_certificates: {
        Row: {
          certificate_number: string
          certificate_type: string
          clinic_identity_snapshot: Json
          created_at: string
          doctor_ahpra_number: string
          doctor_id: string
          doctor_name: string
          doctor_nominals: string | null
          doctor_provider_number: string
          edit_count: number | null
          email_delivery_id: string | null
          email_failed_at: string | null
          email_failure_reason: string | null
          email_retry_count: number | null
          email_sent_at: string | null
          end_date: string
          file_size_bytes: number | null
          id: string
          idempotency_key: string
          intake_id: string
          issue_date: string
          patient_dob: string | null
          patient_id: string
          patient_name: string
          pdf_hash: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["certificate_status"]
          storage_path: string
          template_config_snapshot: Json
          template_id: string | null
          template_version: number | null
          updated_at: string
          verification_code: string
        }
        Insert: {
          certificate_number: string
          certificate_type: string
          clinic_identity_snapshot: Json
          created_at?: string
          doctor_ahpra_number: string
          doctor_id: string
          doctor_name: string
          doctor_nominals?: string | null
          doctor_provider_number: string
          edit_count?: number | null
          email_delivery_id?: string | null
          email_failed_at?: string | null
          email_failure_reason?: string | null
          email_retry_count?: number | null
          email_sent_at?: string | null
          end_date: string
          file_size_bytes?: number | null
          id?: string
          idempotency_key: string
          intake_id: string
          issue_date: string
          patient_dob?: string | null
          patient_id: string
          patient_name: string
          pdf_hash?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["certificate_status"]
          storage_path: string
          template_config_snapshot: Json
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
          verification_code: string
        }
        Update: {
          certificate_number?: string
          certificate_type?: string
          clinic_identity_snapshot?: Json
          created_at?: string
          doctor_ahpra_number?: string
          doctor_id?: string
          doctor_name?: string
          doctor_nominals?: string | null
          doctor_provider_number?: string
          edit_count?: number | null
          email_delivery_id?: string | null
          email_failed_at?: string | null
          email_failure_reason?: string | null
          email_retry_count?: number | null
          email_sent_at?: string | null
          end_date?: string
          file_size_bytes?: number | null
          id?: string
          idempotency_key?: string
          intake_id?: string
          issue_date?: string
          patient_dob?: string | null
          patient_id?: string
          patient_name?: string
          pdf_hash?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["certificate_status"]
          storage_path?: string
          template_config_snapshot?: Json
          template_id?: string | null
          template_version?: number | null
          updated_at?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "issued_certificates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issued_certificates_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issued_certificates_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issued_certificates_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issued_certificates_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issued_certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          brand_names: string[] | null
          category: string
          category_label: string
          created_at: string | null
          default_form: string | null
          default_strength: string | null
          display_order: number | null
          forms: Json | null
          id: string
          is_active: boolean | null
          is_common: boolean | null
          is_controlled: boolean | null
          is_repeatable: boolean | null
          max_repeats: number | null
          name: string
          requires_authority: boolean | null
          schedule: string | null
          search_vector: unknown
          synonyms: string[] | null
          updated_at: string | null
        }
        Insert: {
          brand_names?: string[] | null
          category: string
          category_label: string
          created_at?: string | null
          default_form?: string | null
          default_strength?: string | null
          display_order?: number | null
          forms?: Json | null
          id?: string
          is_active?: boolean | null
          is_common?: boolean | null
          is_controlled?: boolean | null
          is_repeatable?: boolean | null
          max_repeats?: number | null
          name: string
          requires_authority?: boolean | null
          schedule?: string | null
          search_vector?: unknown
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          brand_names?: string[] | null
          category?: string
          category_label?: string
          created_at?: string | null
          default_form?: string | null
          default_strength?: string | null
          display_order?: number | null
          forms?: Json | null
          id?: string
          is_active?: boolean | null
          is_common?: boolean | null
          is_controlled?: boolean | null
          is_repeatable?: boolean | null
          max_repeats?: number | null
          name?: string
          requires_authority?: boolean | null
          schedule?: string | null
          search_vector?: unknown
          synonyms?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          intake_id: string | null
          patient_id: string
          read_at: string | null
          sender_id: string | null
          sender_type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          intake_id?: string | null
          patient_id: string
          read_at?: string | null
          sender_id?: string | null
          sender_type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          intake_id?: string | null
          patient_id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_messages_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_messages_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          created_by_name: string | null
          id: string
          note_type: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          created_by_name?: string | null
          id?: string
          note_type?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          id?: string
          note_type?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_paid: number | null
          created_at: string | null
          currency: string | null
          id: string
          refund_amount: number | null
          refund_reason: string | null
          refund_status: string | null
          refunded_at: string | null
          request_id: string
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          refund_amount?: number | null
          refund_reason?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          request_id: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          refund_amount?: number | null
          refund_reason?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          request_id?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      phi_encryption_audit: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          ip_address: unknown
          key_id: string
          operation: string
          record_id: string
          request_path: string | null
          table_name: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          key_id: string
          operation: string
          record_id: string
          request_path?: string | null
          table_name: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          key_id?: string
          operation?: string
          record_id?: string
          request_path?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "phi_encryption_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phi_encryption_keys: {
        Row: {
          created_at: string
          id: string
          key_id: string
          metadata: Json | null
          records_encrypted: number | null
          records_migrated: number | null
          rotated_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: string
          metadata?: Json | null
          records_encrypted?: number | null
          records_migrated?: number | null
          rotated_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: string
          metadata?: Json | null
          records_encrypted?: number | null
          records_migrated?: number | null
          rotated_at?: string | null
          status?: string
        }
        Relationships: []
      }
      priority_upsell_conversions: {
        Row: {
          converted: boolean | null
          converted_at: string | null
          created_at: string | null
          id: string
          offered_at: string | null
          patient_id: string | null
          price_paid: number | null
          request_id: string | null
        }
        Insert: {
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          offered_at?: string | null
          patient_id?: string | null
          price_paid?: number | null
          request_id?: string | null
        }
        Update: {
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          offered_at?: string | null
          patient_id?: string | null
          price_paid?: number | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "priority_upsell_conversions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_upsell_conversions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          ahpra_number: string | null
          auth_user_id: string | null
          certificate_identity_complete: boolean | null
          clerk_user_id: string | null
          consent_myhr: boolean | null
          created_at: string | null
          date_of_birth: string | null
          date_of_birth_encrypted: string | null
          email: string | null
          email_bounce_reason: string | null
          email_bounced: boolean | null
          email_bounced_at: string | null
          email_delivery_failures: number | null
          email_verified: boolean
          email_verified_at: string | null
          full_name: string
          id: string
          medicare_expiry: string | null
          medicare_irn: number | null
          medicare_number: string | null
          medicare_number_encrypted: string | null
          nominals: string | null
          onboarding_completed: boolean | null
          phi_encrypted_at: string | null
          phone: string | null
          phone_encrypted: string | null
          postcode: string | null
          provider_number: string | null
          role: string
          signature_storage_path: string | null
          state: string | null
          stripe_customer_id: string | null
          suburb: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          ahpra_number?: string | null
          auth_user_id?: string | null
          certificate_identity_complete?: boolean | null
          clerk_user_id?: string | null
          consent_myhr?: boolean | null
          created_at?: string | null
          date_of_birth?: string | null
          date_of_birth_encrypted?: string | null
          email?: string | null
          email_bounce_reason?: string | null
          email_bounced?: boolean | null
          email_bounced_at?: string | null
          email_delivery_failures?: number | null
          email_verified?: boolean
          email_verified_at?: string | null
          full_name: string
          id?: string
          medicare_expiry?: string | null
          medicare_irn?: number | null
          medicare_number?: string | null
          medicare_number_encrypted?: string | null
          nominals?: string | null
          onboarding_completed?: boolean | null
          phi_encrypted_at?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          postcode?: string | null
          provider_number?: string | null
          role: string
          signature_storage_path?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          suburb?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          ahpra_number?: string | null
          auth_user_id?: string | null
          certificate_identity_complete?: boolean | null
          clerk_user_id?: string | null
          consent_myhr?: boolean | null
          created_at?: string | null
          date_of_birth?: string | null
          date_of_birth_encrypted?: string | null
          email?: string | null
          email_bounce_reason?: string | null
          email_bounced?: boolean | null
          email_bounced_at?: string | null
          email_delivery_failures?: number | null
          email_verified?: boolean
          email_verified_at?: string | null
          full_name?: string
          id?: string
          medicare_expiry?: string | null
          medicare_irn?: number | null
          medicare_number?: string | null
          medicare_number_encrypted?: string | null
          nominals?: string | null
          onboarding_completed?: boolean | null
          phi_encrypted_at?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          postcode?: string | null
          provider_number?: string | null
          role?: string
          signature_storage_path?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          suburb?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          identifier_type: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          identifier_type?: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          identifier_type?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      request_answers: {
        Row: {
          answers: Json
          created_at: string | null
          id: string
          request_id: string
        }
        Insert: {
          answers: Json
          created_at?: string | null
          id?: string
          request_id: string
        }
        Update: {
          answers?: Json
          created_at?: string | null
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_answers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_documents: {
        Row: {
          certificate_number: string | null
          created_at: string | null
          created_by: string | null
          document_type: string
          file_size_bytes: number | null
          filename: string
          id: string
          metadata: Json | null
          mime_type: string
          request_id: string
          storage_path: string
          updated_at: string | null
          verification_code: string | null
        }
        Insert: {
          certificate_number?: string | null
          created_at?: string | null
          created_by?: string | null
          document_type: string
          file_size_bytes?: number | null
          filename: string
          id?: string
          metadata?: Json | null
          mime_type?: string
          request_id: string
          storage_path: string
          updated_at?: string | null
          verification_code?: string | null
        }
        Update: {
          certificate_number?: string | null
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          file_size_bytes?: number | null
          filename?: string
          id?: string
          metadata?: Json | null
          mime_type?: string
          request_id?: string
          storage_path?: string
          updated_at?: string | null
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          active_checkout_session_id: string | null
          after_hours: boolean | null
          category: string | null
          claimed_at: string | null
          claimed_by: string | null
          clinical_note: string | null
          created_at: string | null
          doctor_notes: string | null
          escalated_at: string | null
          escalated_by: string | null
          escalation_level: string | null
          escalation_reason: string | null
          estimated_review_time: string | null
          flagged_for_followup: boolean | null
          followup_reason: string | null
          id: string
          paid: boolean | null
          patient_id: string
          payment_status: string | null
          priority_purchased_at: string | null
          priority_review: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          script_notes: string | null
          script_sent: boolean | null
          script_sent_at: string | null
          status: string
          subtype: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          active_checkout_session_id?: string | null
          after_hours?: boolean | null
          category?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          clinical_note?: string | null
          created_at?: string | null
          doctor_notes?: string | null
          escalated_at?: string | null
          escalated_by?: string | null
          escalation_level?: string | null
          escalation_reason?: string | null
          estimated_review_time?: string | null
          flagged_for_followup?: boolean | null
          followup_reason?: string | null
          id?: string
          paid?: boolean | null
          patient_id: string
          payment_status?: string | null
          priority_purchased_at?: string | null
          priority_review?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          script_notes?: string | null
          script_sent?: boolean | null
          script_sent_at?: string | null
          status?: string
          subtype?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          active_checkout_session_id?: string | null
          after_hours?: boolean | null
          category?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          clinical_note?: string | null
          created_at?: string | null
          doctor_notes?: string | null
          escalated_at?: string | null
          escalated_by?: string | null
          escalation_level?: string | null
          escalation_reason?: string | null
          estimated_review_time?: string | null
          flagged_for_followup?: boolean | null
          followup_reason?: string | null
          id?: string
          paid?: boolean | null
          patient_id?: string
          payment_status?: string | null
          priority_purchased_at?: string | null
          priority_review?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          script_notes?: string | null
          script_sent?: boolean | null
          script_sent_at?: string | null
          status?: string
          subtype?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_escalated_by_fkey"
            columns: ["escalated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_audit_log: {
        Row: {
          additional_info_provided: Json | null
          answers_snapshot: Json
          draft_id: string | null
          evaluated_at: string | null
          evaluation_duration_ms: number | null
          id: string
          ip_address: unknown
          is_re_evaluation: boolean | null
          outcome: string
          previous_evaluation_id: string | null
          risk_tier: string
          service_slug: string
          session_id: string
          triggered_rule_ids: string[] | null
          user_agent: string | null
        }
        Insert: {
          additional_info_provided?: Json | null
          answers_snapshot: Json
          draft_id?: string | null
          evaluated_at?: string | null
          evaluation_duration_ms?: number | null
          id?: string
          ip_address?: unknown
          is_re_evaluation?: boolean | null
          outcome: string
          previous_evaluation_id?: string | null
          risk_tier: string
          service_slug: string
          session_id: string
          triggered_rule_ids?: string[] | null
          user_agent?: string | null
        }
        Update: {
          additional_info_provided?: Json | null
          answers_snapshot?: Json
          draft_id?: string | null
          evaluated_at?: string | null
          evaluation_duration_ms?: number | null
          id?: string
          ip_address?: unknown
          is_re_evaluation?: boolean | null
          outcome?: string
          previous_evaluation_id?: string | null
          risk_tier?: string
          service_slug?: string
          session_id?: string
          triggered_rule_ids?: string[] | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_audit_log_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "intake_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_audit_log_previous_evaluation_id_fkey"
            columns: ["previous_evaluation_id"]
            isOneToOne: false
            referencedRelation: "safety_audit_log"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          allowed_states: string[] | null
          badge_text: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          eligibility_rules: Json | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          max_age: number | null
          meta_description: string | null
          meta_title: string | null
          min_age: number | null
          name: string
          price_cents: number
          priority_fee_cents: number | null
          questionnaire_id: string | null
          requires_id_verification: boolean | null
          requires_medicare: boolean | null
          requires_photo: boolean | null
          short_name: string | null
          sla_priority_minutes: number | null
          sla_standard_minutes: number | null
          slug: string
          type: Database["public"]["Enums"]["service_type"]
          updated_at: string | null
        }
        Insert: {
          allowed_states?: string[] | null
          badge_text?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          eligibility_rules?: Json | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          max_age?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_age?: number | null
          name: string
          price_cents?: number
          priority_fee_cents?: number | null
          questionnaire_id?: string | null
          requires_id_verification?: boolean | null
          requires_medicare?: boolean | null
          requires_photo?: boolean | null
          short_name?: string | null
          sla_priority_minutes?: number | null
          sla_standard_minutes?: number | null
          slug: string
          type: Database["public"]["Enums"]["service_type"]
          updated_at?: string | null
        }
        Update: {
          allowed_states?: string[] | null
          badge_text?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          eligibility_rules?: Json | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          max_age?: number | null
          meta_description?: string | null
          meta_title?: string | null
          min_age?: number | null
          name?: string
          price_cents?: number
          priority_fee_cents?: number | null
          questionnaire_id?: string | null
          requires_id_verification?: boolean | null
          requires_medicare?: boolean | null
          requires_photo?: boolean | null
          short_name?: string | null
          sla_priority_minutes?: number | null
          sla_standard_minutes?: number | null
          slug?: string
          type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_disputes: {
        Row: {
          amount: number
          charge_id: string | null
          created_at: string
          currency: string
          dispute_id: string
          evidence_submitted_at: string | null
          id: string
          intake_id: string | null
          outcome: string | null
          reason: string
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          charge_id?: string | null
          created_at?: string
          currency?: string
          dispute_id: string
          evidence_submitted_at?: string | null
          id?: string
          intake_id?: string | null
          outcome?: string | null
          reason: string
          resolved_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number
          charge_id?: string | null
          created_at?: string
          currency?: string
          dispute_id?: string
          evidence_submitted_at?: string | null
          id?: string
          intake_id?: string | null
          outcome?: string | null
          reason?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_disputes_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_disputes_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "v_stuck_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_dead_letter: {
        Row: {
          created_at: string | null
          error_code: string | null
          error_message: string
          event_id: string
          event_type: string
          id: string
          last_retry_at: string | null
          max_retries: number | null
          payload: Json | null
          request_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          error_message: string
          event_id: string
          event_type: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          payload?: Json | null
          request_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_code?: string | null
          error_message?: string
          event_id?: string
          event_type?: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          payload?: Json | null
          request_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_dead_letter_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          metadata: Json | null
          processed_at: string
          request_id: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          processed_at?: string
          request_id?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          processed_at?: string
          request_id?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      compliance_audit_summary: {
        Row: {
          call_completed_before_decision: boolean | null
          call_required: boolean | null
          decision_at: string | null
          final_outcome: string | null
          has_human_review: boolean | null
          lifecycle_events_count: number | null
          prescribing_location: string | null
          request_id: string | null
          request_type: string | null
          reviewed_by: string | null
        }
        Relationships: []
      }
      v_stuck_intakes: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          id: string | null
          paid_at: string | null
          patient_name: string | null
          payment_status: string | null
          service_name: string | null
          status: Database["public"]["Enums"]["intake_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "intakes_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_to_webhook_dead_letter: {
        Args: {
          p_error_code?: string
          p_error_message: string
          p_event_id: string
          p_event_type: string
          p_payload?: Json
          p_request_id: string
          p_session_id: string
        }
        Returns: string
      }
      approve_draft: {
        Args: {
          p_doctor_id: string
          p_draft_id: string
          p_edited_content?: Json
        }
        Returns: boolean
      }
      approve_request_with_document: {
        Args: {
          p_doctor_id: string
          p_document_subtype: string
          p_document_type: string
          p_pdf_url: string
          p_request_id: string
        }
        Returns: {
          document_id: string
          error_message: string
          success: boolean
          verification_code: string
        }[]
      }
      archive_old_audit_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      atomic_approve_certificate: {
        Args: {
          p_certificate_number: string
          p_certificate_type: string
          p_clinic_identity_snapshot: Json
          p_doctor_ahpra_number: string
          p_doctor_id: string
          p_doctor_name: string
          p_doctor_nominals: string
          p_doctor_provider_number: string
          p_end_date: string
          p_file_size_bytes: number
          p_filename: string
          p_idempotency_key: string
          p_intake_id: string
          p_issue_date: string
          p_patient_dob: string
          p_patient_id: string
          p_patient_name: string
          p_pdf_hash?: string
          p_start_date: string
          p_storage_path: string
          p_template_config_snapshot: Json
          p_verification_code: string
        }
        Returns: {
          certificate_id: string
          error_message: string
          intake_document_id: string
          is_duplicate: boolean
          success: boolean
        }[]
      }
      audit_phi_access: {
        Args: {
          p_actor_id?: string
          p_actor_role?: string
          p_operation: string
          p_record_id: string
          p_request_path?: string
          p_table_name: string
        }
        Returns: undefined
      }
      check_employer_email_rate_limit: {
        Args: { p_intake_id: string }
        Returns: {
          allowed: boolean
          current_count: number
          reset_at: string
        }[]
      }
      claim_intake_for_review:
        | {
            Args: { p_doctor_id: string; p_intake_id: string }
            Returns: boolean
          }
        | {
            Args: {
              p_doctor_id: string
              p_force?: boolean
              p_intake_id: string
            }
            Returns: {
              current_claimant: string
              error_message: string
              success: boolean
            }[]
          }
      claim_request_for_review: {
        Args: { p_doctor_id: string; p_force?: boolean; p_request_id: string }
        Returns: {
          current_claimant: string
          error_message: string
          success: boolean
        }[]
      }
      cleanup_expired_locks: { Args: never; Returns: undefined }
      cleanup_old_drafts: { Args: never; Returns: undefined }
      expire_pending_payment_intakes: {
        Args: { p_hours_old?: number }
        Returns: {
          expired_count: number
          expired_ids: string[]
        }[]
      }
      get_my_profile_id: { Args: never; Returns: string }
      get_or_create_document_draft: {
        Args: {
          p_document_type: string
          p_initial_data?: Json
          p_request_id: string
        }
        Returns: string
      }
      get_or_create_email_preferences: {
        Args: { p_profile_id: string }
        Returns: {
          abandoned_checkout_emails: boolean
          created_at: string
          id: string
          marketing_emails: boolean
          profile_id: string
          transactional_emails: boolean
          unsubscribe_reason: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "email_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_doctor: { Args: never; Returns: boolean }
      is_doctor_or_admin: { Args: never; Returns: boolean }
      is_patient: { Args: never; Returns: boolean }
      is_phi_encrypted: { Args: { enc_column: Json }; Returns: boolean }
      log_ai_audit: {
        Args: {
          p_action: Database["public"]["Enums"]["ai_audit_action"]
          p_actor_id: string
          p_actor_type: Database["public"]["Enums"]["ai_actor_type"]
          p_completion_tokens?: number
          p_draft_id: string
          p_draft_type: Database["public"]["Enums"]["draft_type"]
          p_generation_duration_ms?: number
          p_ground_truth_errors?: Json
          p_ground_truth_passed?: boolean
          p_input_hash?: string
          p_intake_id: string
          p_metadata?: Json
          p_model?: string
          p_output_hash?: string
          p_prompt_tokens?: number
          p_reason?: string
          p_validation_errors?: Json
          p_validation_passed?: boolean
        }
        Returns: string
      }
      log_certificate_edit: {
        Args: {
          p_certificate_id: string
          p_doctor_id: string
          p_edit_reason?: string
          p_field_name: string
          p_intake_id: string
          p_new_value: string
          p_original_value: string
        }
        Returns: string
      }
      log_certificate_event: {
        Args: {
          p_actor_id?: string
          p_actor_role?: string
          p_certificate_id: string
          p_event_data?: Json
          p_event_type: Database["public"]["Enums"]["certificate_event_type"]
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      log_compliance_event: {
        Args: {
          p_actor_id?: string
          p_actor_role?: string
          p_call_completed_before_decision?: boolean
          p_call_occurred?: boolean
          p_call_required?: boolean
          p_event_data?: Json
          p_event_type: Database["public"]["Enums"]["compliance_event_type"]
          p_external_prescribing_reference?: string
          p_ip_address?: unknown
          p_is_human_action?: boolean
          p_outcome?: string
          p_prescribing_occurred_in_platform?: boolean
          p_previous_outcome?: string
          p_request_id: string
          p_request_type: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_intake_event: {
        Args: {
          p_actor_id?: string
          p_actor_role: string
          p_event_type: string
          p_from_status?: Database["public"]["Enums"]["intake_status"]
          p_intake_id: string
          p_metadata?: Json
          p_to_status?: Database["public"]["Enums"]["intake_status"]
        }
        Returns: string
      }
      log_safety_evaluation:
        | {
            Args: {
              p_details?: string
              p_evaluation_type: string
              p_input_data: Json
              p_request_id: string
              p_result: string
            }
            Returns: string
          }
        | {
            Args: {
              p_evaluation_type: string
              p_flags: string[]
              p_input_data: Json
              p_medication_name: string
              p_output_data: Json
              p_previous_evaluation_id?: string
              p_reason: string
              p_request_id: string
              p_requires_review: boolean
              p_result: string
              p_risk_score: number
            }
            Returns: string
          }
      merge_guest_profile: {
        Args: { p_authenticated_profile_id: string; p_guest_profile_id: string }
        Returns: undefined
      }
      payment_exists_for_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      reject_draft: {
        Args: { p_doctor_id: string; p_draft_id: string; p_reason: string }
        Returns: boolean
      }
      release_intake_claim: {
        Args: { p_doctor_id: string; p_intake_id: string }
        Returns: boolean
      }
      release_request_claim: {
        Args: { p_doctor_id: string; p_request_id: string }
        Returns: boolean
      }
      release_stale_intake_claims: {
        Args: { p_timeout_minutes: number }
        Returns: number
      }
      requesting_clerk_user_id: { Args: never; Returns: string }
      search_artg_products: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          active_ingredients_raw: string
          artg_id: string
          dosage_form: string
          product_name: string
          route: string
        }[]
      }
      search_medications: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          brand_names: string[]
          form: string
          generic_name: string
          id: string
          name: string
          pbs_listed: boolean
          rank: number
          requires_authority: boolean
          s8_drug: boolean
          strength: string
        }[]
      }
      try_process_stripe_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_metadata?: Json
          p_request_id?: string
          p_session_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      admin_action_type:
        | "viewed"
        | "assigned"
        | "unassigned"
        | "requested_info"
        | "approved"
        | "declined"
        | "escalated"
        | "added_note"
        | "generated_document"
        | "sent_message"
      ai_actor_type: "system" | "doctor" | "patient"
      ai_audit_action: "generate" | "approve" | "reject" | "regenerate" | "edit"
      attachment_type:
        | "id_document"
        | "medical_record"
        | "prescription"
        | "referral"
        | "pathology_result"
        | "photo"
        | "other"
      audit_event_type:
        | "intake_created"
        | "intake_submitted"
        | "payment_received"
        | "status_changed"
        | "admin_action"
        | "message_sent"
        | "document_generated"
        | "document_sent"
        | "consent_given"
        | "escalation_triggered"
        | "sla_warning"
        | "sla_breached"
      certificate_event_type:
        | "issued"
        | "email_sent"
        | "email_failed"
        | "email_retry"
        | "downloaded"
        | "verified"
        | "revoked"
        | "superseded"
      certificate_status: "valid" | "revoked" | "superseded" | "expired"
      compliance_event_type:
        | "request_created"
        | "request_reviewed"
        | "outcome_assigned"
        | "clinician_opened_request"
        | "clinician_reviewed_request"
        | "clinician_selected_outcome"
        | "triage_approved"
        | "triage_needs_call"
        | "triage_declined"
        | "triage_outcome_changed"
        | "call_required_flagged"
        | "call_initiated"
        | "call_completed"
        | "decision_after_call"
        | "no_prescribing_in_platform"
        | "external_prescribing_indicated"
      consent_type:
        | "telehealth_terms"
        | "privacy_policy"
        | "fee_agreement"
        | "escalation_agreement"
        | "medication_consent"
        | "treatment_consent"
      draft_type: "clinical_note" | "med_cert"
      email_status: "pending" | "sent" | "failed" | "bounced" | "retrying"
      intake_status:
        | "draft"
        | "pending_payment"
        | "paid"
        | "in_review"
        | "pending_info"
        | "approved"
        | "awaiting_script"
        | "declined"
        | "escalated"
        | "completed"
        | "cancelled"
        | "expired"
      message_sender_type: "patient" | "admin" | "system"
      refund_status:
        | "not_applicable"
        | "not_eligible"
        | "pending"
        | "succeeded"
        | "failed"
        | "skipped_e2e"
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
      user_role: "patient" | "doctor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_action_type: [
        "viewed",
        "assigned",
        "unassigned",
        "requested_info",
        "approved",
        "declined",
        "escalated",
        "added_note",
        "generated_document",
        "sent_message",
      ],
      ai_actor_type: ["system", "doctor", "patient"],
      ai_audit_action: ["generate", "approve", "reject", "regenerate", "edit"],
      attachment_type: [
        "id_document",
        "medical_record",
        "prescription",
        "referral",
        "pathology_result",
        "photo",
        "other",
      ],
      audit_event_type: [
        "intake_created",
        "intake_submitted",
        "payment_received",
        "status_changed",
        "admin_action",
        "message_sent",
        "document_generated",
        "document_sent",
        "consent_given",
        "escalation_triggered",
        "sla_warning",
        "sla_breached",
      ],
      certificate_event_type: [
        "issued",
        "email_sent",
        "email_failed",
        "email_retry",
        "downloaded",
        "verified",
        "revoked",
        "superseded",
      ],
      certificate_status: ["valid", "revoked", "superseded", "expired"],
      compliance_event_type: [
        "request_created",
        "request_reviewed",
        "outcome_assigned",
        "clinician_opened_request",
        "clinician_reviewed_request",
        "clinician_selected_outcome",
        "triage_approved",
        "triage_needs_call",
        "triage_declined",
        "triage_outcome_changed",
        "call_required_flagged",
        "call_initiated",
        "call_completed",
        "decision_after_call",
        "no_prescribing_in_platform",
        "external_prescribing_indicated",
      ],
      consent_type: [
        "telehealth_terms",
        "privacy_policy",
        "fee_agreement",
        "escalation_agreement",
        "medication_consent",
        "treatment_consent",
      ],
      draft_type: ["clinical_note", "med_cert"],
      email_status: ["pending", "sent", "failed", "bounced", "retrying"],
      intake_status: [
        "draft",
        "pending_payment",
        "paid",
        "in_review",
        "pending_info",
        "approved",
        "awaiting_script",
        "declined",
        "escalated",
        "completed",
        "cancelled",
        "expired",
      ],
      message_sender_type: ["patient", "admin", "system"],
      refund_status: [
        "not_applicable",
        "not_eligible",
        "pending",
        "succeeded",
        "failed",
        "skipped_e2e",
      ],
      risk_tier: ["low", "moderate", "high", "critical"],
      service_type: [
        "weight_loss",
        "mens_health",
        "womens_health",
        "common_scripts",
        "med_certs",
        "referrals",
        "pathology",
        "consult",
      ],
      user_role: ["patient", "doctor", "admin"],
    },
  },
} as const
