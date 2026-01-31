-- Add missing FK indexes flagged by advisor
-- These improve JOIN performance and reduce lock contention

-- certificate_templates
CREATE INDEX IF NOT EXISTS idx_certificate_templates_activated_by ON public.certificate_templates(activated_by);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_created_by ON public.certificate_templates(created_by);

-- clinic_identity
CREATE INDEX IF NOT EXISTS idx_clinic_identity_created_by ON public.clinic_identity(created_by);
CREATE INDEX IF NOT EXISTS idx_clinic_identity_updated_by ON public.clinic_identity(updated_by);

-- content_blocks
CREATE INDEX IF NOT EXISTS idx_content_blocks_updated_by ON public.content_blocks(updated_by);

-- email_outbox
CREATE INDEX IF NOT EXISTS idx_email_outbox_certificate_id ON public.email_outbox(certificate_id);

-- email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON public.email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_updated_by ON public.email_templates(updated_by);

-- failed_profile_merges
CREATE INDEX IF NOT EXISTS idx_failed_profile_merges_resolved_by ON public.failed_profile_merges(resolved_by);

-- intake_events
CREATE INDEX IF NOT EXISTS idx_intake_events_actor_id ON public.intake_events(actor_id);

-- intakes
CREATE INDEX IF NOT EXISTS idx_intakes_info_requested_by ON public.intakes(info_requested_by);
CREATE INDEX IF NOT EXISTS idx_intakes_prescription_sent_by ON public.intakes(prescription_sent_by);
CREATE INDEX IF NOT EXISTS idx_intakes_refunded_by ON public.intakes(refunded_by);

-- issued_certificates
CREATE INDEX IF NOT EXISTS idx_issued_certificates_template_id ON public.issued_certificates(template_id);

-- patient_messages
CREATE INDEX IF NOT EXISTS idx_patient_messages_sender_id ON public.patient_messages(sender_id);
