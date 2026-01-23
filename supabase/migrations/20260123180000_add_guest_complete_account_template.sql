-- ============================================================================
-- ADD GUEST ACCOUNT COMPLETION EMAIL TEMPLATE
-- Sent after guest checkout to encourage account creation
-- ============================================================================

INSERT INTO public.email_templates (slug, name, description, subject, body_html, body_text, available_tags) VALUES
  ('guest_complete_account', 'Guest Account Completion', 'Sent after guest checkout to encourage account creation',
   'Your request is being reviewed - create your account',
   '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .info-box { background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; }
    .benefits { margin: 20px 0; }
    .benefits li { margin: 8px 0; }
    .footer { margin-top: 30px; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your request is being reviewed</h1>
    </div>
    
    <p>Hi {{patient_name}},</p>
    
    <p>Your {{service_name}} request has been received and is now in the review queue. A doctor will review it shortly.</p>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>Reference:</strong> {{intake_id}}</p>
    </div>
    
    <h2>Create your account</h2>
    <p>Set up your InstantMed account to:</p>
    
    <ul class="benefits">
      <li>Track your request status in real-time</li>
      <li>Download your certificate instantly when ready</li>
      <li>Access your medical history</li>
      <li>Request future certificates faster</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{complete_account_url}}" class="button">Create Your Account</a>
    </p>
    
    <p class="footer">
      Don''t worry — your certificate will also be emailed to you when it''s ready, even if you don''t create an account.
    </p>
    
    <p>Best regards,<br>InstantMed Team</p>
  </div>
</body>
</html>',
   'Hi {{patient_name}},

Your {{service_name}} request has been received and is now in the review queue. A doctor will review it shortly.

Reference: {{intake_id}}

Create your account to:
- Track your request status in real-time
- Download your certificate instantly when ready
- Access your medical history
- Request future certificates faster

Create your account: {{complete_account_url}}

Don''t worry — your certificate will also be emailed to you when it''s ready, even if you don''t create an account.

Best regards,
InstantMed Team',
   '["patient_name", "service_name", "intake_id", "complete_account_url"]')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  available_tags = EXCLUDED.available_tags,
  updated_at = NOW();
