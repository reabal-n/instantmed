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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>URGENT: Stripe Dispute Alert - InstantMed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #dc2626; color: white; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 20px;">⚠️ PAYMENT DISPUTE RECEIVED</h1>
  </div>
  
  <p><strong>A customer has disputed a payment. Immediate action required.</strong></p>
  
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 500; width: 40%;">Dispute ID</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-family: monospace;">${disputeId}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 500;">Charge ID</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-family: monospace;">${chargeId}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 500;">Intake ID</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-family: monospace;">${intakeId}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 500;">Amount</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #dc2626;">${amount}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 500;">Reason</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${reason}</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #fef3c7; font-weight: 500;">Evidence Due By</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; background: #fef3c7; font-weight: 600; color: #92400e;">${evidenceDueBy}</td>
    </tr>
  </table>
  
  <div style="background: #fef2f2; border: 1px solid #dc2626; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; font-weight: 600; color: #dc2626;">Action Required:</p>
    <ol style="margin: 12px 0 0 0; padding-left: 20px; color: #7f1d1d;">
      <li>Review the intake and patient communication history</li>
      <li>Gather evidence (service delivery confirmation, signed consent, etc.)</li>
      <li>Submit evidence via Stripe Dashboard before the deadline</li>
    </ol>
  </div>
  
  <p style="text-align: center; margin: 24px 0;">
    <a href="${stripeDashboardUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      View in Stripe Dashboard
    </a>
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  
  <p style="font-size: 12px; color: #9ca3af;">
    This is an automated alert from InstantMed. Do not reply to this email.<br>
    For questions, contact the engineering team.
  </p>
</body>
</html>
  `
}
