import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Users, Search, ChevronRight, Mail, Phone } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminPatientsPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      date_of_birth,
      created_at,
      is_verified,
      intakes (count)
    `)
    .eq('role', 'patient')
    .order('created_at', { ascending: false })

  // Search filter
  if (params.q) {
    query = query.or(`full_name.ilike.%${params.q}%,email.ilike.%${params.q}%`)
  }

  const { data: patients, error } = await query.limit(100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="text-muted-foreground">
            View and manage patient records
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form action="/admin/patients" method="get">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Search by name or email..."
                defaultValue={params.q}
                className="pl-9"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Patient List */}
      <div className="space-y-2">
        {patients && patients.length > 0 ? (
          patients.map((patient) => {
            const intakeCount = (patient.intakes as unknown as { count: number }[])?.[0]?.count || 0

            return (
              <Card key={patient.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-medium">
                        {patient.full_name?.charAt(0) || 'P'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{patient.full_name}</p>
                        {patient.is_verified && (
                          <Badge variant="secondary" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {patient.email}
                        </span>
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {patient.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right text-sm">
                      <p className="font-medium">{intakeCount} request{intakeCount !== 1 ? 's' : ''}</p>
                      <p className="text-muted-foreground">
                        Joined {formatDate(patient.created_at)}
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 font-medium">No patients found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {params.q ? 'Try a different search term' : 'No patients have registered yet'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
