interface DisputeAlertEmailProps {
  disputeId: string
  chargeId: string
  intakeId: string
  amount: string
  reason: string
  evidenceDueBy: string
  stripeDashboardUrl: string
}

export function renderDisputeAlertEmail(props: DisputeAlertEmailProps): string {
  const { disputeId, chargeId, intakeId, amount, reason, evidenceDueBy, stripeDashboardUrl } = props

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>URGENT: Stripe Dispute Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #0A0F1C; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #fafafa;">
  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    
    <div style="background: #dc2626; padding: 20px 32px;">
      <h1 style="margin: 0; font-size: 16px; font-weight: 600; color: #ffffff; letter-spacing: 0.5px;">PAYMENT DISPUTE RECEIVED</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">Immediate action required</p>
    </div>
    
    <div style="padding: 32px;">
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0; font-size: 14px;">
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 40%;">Dispute ID</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px;">${disputeId}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Charge ID</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px;">${chargeId}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Intake ID</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px;">${intakeId}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Amount</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #dc2626;">${amount}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Reason</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">${reason}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #92400e; font-weight: 500; background: #fffbeb;">Evidence Due</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #92400e; background: #fffbeb;">${evidenceDueBy}</td>
        </tr>
      </table>

      <div style="background: #fef2f2; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px 0; border-left: 3px solid #dc2626;">
        <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px; color: #991b1b;">Action Required</p>
        <ol style="margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 13px; line-height: 1.7;">
          <li>Review the intake and patient communication history</li>
          <li>Gather evidence (service delivery confirmation, signed consent, etc.)</li>
          <li>Submit evidence via Stripe Dashboard before the deadline</li>
        </ol>
      </div>

      <div style="text-align: center; margin: 0 0 24px 0;">
        <a href="${stripeDashboardUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          View in Stripe Dashboard
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 0 0 16px 0;">
      
      <p style="font-size: 11px; color: #9ca3af; margin: 0; text-align: center;">
        Automated alert from InstantMed &middot; Do not reply
      </p>
    </div>
  </div>
</body>
</html>`
}
