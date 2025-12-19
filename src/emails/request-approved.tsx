import * as React from 'react'
import {
  EmailLayout,
  Heading,
  Text,
  Button,
  Reference,
  InfoBox,
  Divider,
} from './components'

interface RequestApprovedEmailProps {
  patientName: string
  referenceNumber: string
  serviceName: string
  documentType: string
  documentUrl: string
  dashboardUrl: string
  doctorName?: string
  expiryDate?: string
}

export function RequestApprovedEmail({
  patientName,
  referenceNumber,
  serviceName,
  documentType,
  documentUrl,
  dashboardUrl,
  doctorName,
  expiryDate,
}: RequestApprovedEmailProps) {
  return (
    <EmailLayout previewText={`Your ${serviceName} has been approved - ${referenceNumber}`}>
      <Heading>✓ Request Approved</Heading>
      
      <Text>Hi {patientName},</Text>
      
      <Text>
        Great news! Your {serviceName.toLowerCase()} request has been reviewed and approved 
        {doctorName ? ` by Dr. ${doctorName}` : ''}.
      </Text>

      <Reference number={referenceNumber} />

      <InfoBox variant="success">
        Your {documentType} is ready. Click the button below to download it, or find it 
        in your patient dashboard.
      </InfoBox>

      <Button href={documentUrl}>Download Your {documentType}</Button>

      {expiryDate && (
        <Text muted>
          Please note: This document is valid until <strong>{expiryDate}</strong>.
        </Text>
      )}

      <Divider />

      <Text>
        <strong>Important:</strong>
      </Text>
      
      <Text muted>
        • Keep a copy of this document for your records<br />
        • Your document can be re-downloaded from your dashboard<br />
        • If you have any issues, please contact us
      </Text>

      <Button href={dashboardUrl} variant="secondary">
        Go to Dashboard
      </Button>

      <Divider />

      <Text muted>
        Thank you for choosing InstantMed. We hope you feel better soon.
      </Text>
    </EmailLayout>
  )
}

export default RequestApprovedEmail
