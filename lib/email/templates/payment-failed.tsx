import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface PaymentFailedEmailProps {
  patientName: string
  serviceName: string
  failureReason: string
  retryUrl: string
}

export function PaymentFailedEmail({ patientName, serviceName, failureReason, retryUrl }: PaymentFailedEmailProps) {
  return (
    <BaseLayout previewText={`Payment issue with your ${serviceName} request`} appUrl={APP_URL}>
      <h1>Payment couldn&apos;t be processed</h1>
      <p>Hi {patientName},</p>
      <p>
        We weren&apos;t able to process your payment for your <strong>{serviceName}</strong> request.
      </p>

      <div className="info-box">
        <p style={{ margin: 0, fontWeight: 500 }}>What happened:</p>
        <p style={{ margin: "8px 0 0 0" }}>{failureReason}</p>
      </div>

      <p>
        <strong>Your request is saved</strong> — you can complete payment whenever you&apos;re ready.
      </p>

      <p>
        <a href={retryUrl} className="button">
          Complete Payment
        </a>
      </p>

      <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "20px", margin: "24px 0" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>
          <strong>Common reasons for payment issues:</strong>
        </p>
        <ul style={{ margin: "12px 0 0 0", paddingLeft: "20px", color: "#475569", fontSize: "14px" }}>
          <li>Card expired or incorrect details</li>
          <li>Insufficient funds</li>
          <li>Bank declined the transaction</li>
        </ul>
        <p style={{ margin: "12px 0 0 0", fontSize: "14px", color: "#475569" }}>
          If the issue persists, try a different payment method or contact your bank.
        </p>
      </div>

      <p style={{ fontSize: "14px", color: "#737373" }}>
        Need help? Reply to this email and we&apos;ll assist you.
      </p>
    </BaseLayout>
  )
}

export function renderPaymentFailedEmail(props: PaymentFailedEmailProps): string {
  const { patientName, serviceName, failureReason, retryUrl } = props

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Issue - InstantMed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://instantmed.com.au/branding/logo.svg" alt="InstantMed" width="150" style="height: auto;">
  </div>
  
  <h1 style="color: #0A0F1C; font-size: 24px; margin-bottom: 16px;">Payment couldn't be processed</h1>
  
  <p>Hi ${patientName},</p>
  
  <p>We weren't able to process your payment for your <strong>${serviceName}</strong> request.</p>
  
  <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; font-weight: 500; color: #92400e;">What happened:</p>
    <p style="margin: 8px 0 0 0; color: #92400e;">${failureReason}</p>
  </div>
  
  <p><strong>Your request is saved</strong> — you can complete payment whenever you're ready.</p>
  
  <p style="text-align: center; margin: 24px 0;">
    <a href="${retryUrl}" style="display: inline-block; background: #0A0F1C; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      Complete Payment
    </a>
  </p>
  
  <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
    <p style="margin: 0; font-size: 14px; color: #475569; font-weight: 500;">Common reasons for payment issues:</p>
    <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #475569; font-size: 14px;">
      <li>Card expired or incorrect details</li>
      <li>Insufficient funds</li>
      <li>Bank declined the transaction</li>
    </ul>
    <p style="margin: 12px 0 0 0; font-size: 14px; color: #475569;">
      If the issue persists, try a different payment method or contact your bank.
    </p>
  </div>
  
  <p style="font-size: 14px; color: #737373;">
    Need help? Reply to this email and we'll assist you.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
  
  <p style="font-size: 12px; color: #9ca3af; text-align: center;">
    InstantMed | Australian Telehealth<br>
    <a href="https://instantmed.com.au" style="color: #9ca3af;">instantmed.com.au</a>
  </p>
</body>
</html>
  `
}
