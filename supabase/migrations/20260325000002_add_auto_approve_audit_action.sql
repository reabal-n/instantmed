-- Add 'auto_approve' to ai_audit_action enum
-- Required by the auto-approval pipeline which logs to ai_audit_log with action = 'auto_approve'

ALTER TYPE ai_audit_action ADD VALUE IF NOT EXISTS 'auto_approve';
