import { BaseLayout } from "./base-layout"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"

interface GuestCompleteAccountEmailProps {
  patientName: string
  requestType: string
  intakeId: string
  completeAccountUrl: string
}

export function GuestCompleteAccountEmail({
  patientName,
  requestType,
  intakeId,
  completeAccountUrl,
}: GuestCompleteAccountEmailProps) {
  return (
    <BaseLayout previewText={`Create your InstantMed account to track your ${requestType}`} appUrl={APP_URL}>
      <h1>Your request is being reviewed</h1>
      <p>Hi {patientName},</p>
      <p>
        Your {requestType} request has been received and is now in the review queue.
        A doctor will review it shortly.
      </p>

      <div style={{ background: "#F5F5F4", borderRadius: "8px", padding: "12px 20px", margin: "16px 0", border: "1px solid #E7E5E4" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#78716C" }}>
          <strong style={{ color: "#1C1917" }}>Reference:</strong>{" "}
          <span style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: "0.5px", fontSize: "13px" }}>
            {intakeId.slice(0, 8).toUpperCase()}
          </span>
        </p>
      </div>

      <h2>Create your account</h2>
      <p>Set up your InstantMed account to:</p>
      <ul>
        <li>Track your request status in real-time</li>
        <li>Download your certificate instantly when ready</li>
        <li>Access your medical history</li>
        <li>Request future certificates faster</li>
      </ul>

      <div style={{ textAlign: "center" }}>
        <a href={completeAccountUrl} className="button">
          Create Your Account
        </a>
      </div>

      <p style={{ fontSize: "13px", color: "#78716C" }}>
        Don&apos;t worry — your certificate will also be emailed to you when it&apos;s ready,
        even if you don&apos;t create an account.
      </p>
    </BaseLayout>
  )
}
