import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface PaymentConfirmedEmailProps {
  patientName: string
  requestType: string
  amount: string
  requestId: string
}

export function PaymentConfirmedEmail({ patientName, requestType, amount, requestId }: PaymentConfirmedEmailProps) {
  return (
    <BaseLayout previewText={`Payment confirmed for your ${requestType}`} appUrl={APP_URL}>
      <h1>Payment confirmed ✓</h1>
      <p>Hi {patientName},</p>
      <p>
        We&apos;ve received your payment of <strong>{amount}</strong> for your {requestType} request.
      </p>

      <div className="info-box">
        <p style={{ margin: 0 }}>Your request is now in the review queue. A GP will review it shortly.</p>
      </div>

      <p>
        <strong>Reference:</strong> {requestId.slice(0, 8).toUpperCase()}
        <br />
        <strong>Amount:</strong> {amount}
      </p>

      <p>
        <a href={`${APP_URL}/patient/requests/${requestId}`} className="button">
          Track Your Request
        </a>
      </p>

      <p style={{ fontSize: "14px", color: "#737373" }}>
        A receipt has been sent to your email. If you need an invoice for tax purposes, you can download it from your
        dashboard.
      </p>
    </BaseLayout>
  )
}
