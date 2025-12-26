import { NextRequest, NextResponse } from 'next/server'
import { exportPatientData } from '@/lib/security/data-export'
import { rateLimit } from '@/lib/security/rate-limit'

export async function GET(request: NextRequest) {
  // Rate limit this expensive operation
  const rateLimitResult = await rateLimit('general')
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: rateLimitResult.error },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  try {
    const exportData = await exportPatientData()

    if (!exportData) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }

    // Return as downloadable JSON
    const response = NextResponse.json(exportData)
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="instantmed-data-export-${Date.now()}.json"`
    )

    return response
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
