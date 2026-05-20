-- Fix the duplicated wording in the "refund-processed" transactional email.
--
-- Before this migration the body read:
--   "A refund of {{amount}} has been processed for your {{service_name}} request."
-- and {{service_name}} defaulted to "your request", producing the rendered
-- string "A refund of $X has been processed for your your request request."
-- (Sarah Roberts's escalation on 2026-05-20 was the visible trigger.)
--
-- New body drops the {{service_name}} interpolation entirely. The refund
-- amount, reason, and timing are still surfaced, and the wording no longer
-- depends on a service-name value passed by the webhook handler. The
-- available_tags array is updated to match the new variable set so the
-- admin template editor doesn't surface a stale "service_name" slot.

UPDATE public.email_templates
SET
  body_html =
    '<h1>Hi {{patient_name}},</h1>'
    || '<p>A refund of {{amount}} has been processed to your original payment method.</p>'
    || '<p><strong>Reason:</strong> {{refund_reason}}</p>'
    || '<p>The refund should appear in your account within 5-10 business days, depending on your bank.</p>'
    || '<p>If you have questions, reply to this email or contact <a href="mailto:support@instantmed.com.au">support@instantmed.com.au</a>.</p>'
    || '<p>Best regards,<br>InstantMed Team</p>',
  available_tags = '["patient_name", "amount", "refund_reason"]'::jsonb,
  updated_at = NOW()
WHERE slug = 'refund-processed';
