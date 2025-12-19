import { NextRequest, NextResponse } from 'next/server'
import { exportIntakeForAudit } from '@/lib/security/data-export'
import { rateLimit } from '@/lib/security/rate-limit'
import { z } from 'zod'

const schema = z.object({
  intakeId: z.string().uuid(),
})

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
    const body = await request.json()
    const { intakeId } = schema.parse(body)

    const exportData = await exportIntakeForAudit(intakeId)

    // Return as downloadable JSON
    const response = NextResponse.json(exportData)
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="intake-audit-${intakeId}-${Date.now()}.json"`
    )

    return response
  } catch (error) {
    console.error('Intake export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: error instanceof Error && error.message.includes('Admin') ? 403 : 500 }
    )
  }
}
