import { NextRequest, NextResponse } from 'next/server'
import { requestDataDeletion } from '@/lib/security/data-export'
import { rateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResult = await rateLimit('general')
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: rateLimitResult.error },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  try {
    const result = await requestDataDeletion()

    return NextResponse.json({
      success: true,
      message: 'Deletion request received',
      retentionEndDate: result.retentionEndDate,
      note: 'As required by Australian healthcare regulations, medical records must be retained for 7 years from the last interaction. Your data will be automatically deleted after this period.',
    })
  } catch (error) {
    console.error('Deletion request error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    )
  }
}
