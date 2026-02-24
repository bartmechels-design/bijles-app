import { redirect } from 'next/navigation'
import { isAdmin, createAdminClient } from '@/lib/auth/admin'

interface GebruikersPageProps {
  params: Promise<{ locale: string }>
}

interface SubjectProgressRow {
  subject: string
  current_level: number
  is_stuck: boolean
  stuck_since: string | null
  last_session_at: string | null
  total_sessions: number
}

interface ChildRow {
  id: string
  first_name: string
  grade: number
  child_subject_progress: SubjectProgressRow[]
}

interface SubscriptionRow {
  status: string
  expires_at: string | null
}

interface FamilyRow {
  id: string
  display_name: string
  user_id: string
  created_at: string
  children: ChildRow[]
  subscriptions: SubscriptionRow[]
}

interface StuckAlert {
  familyName: string
  childName: string
  childGrade: number
  subject: string
  stuckSince: string | null
}

const SUBJECT_LABELS: Record<string, string> = {
  taal: 'Nederlandse Taal',
  rekenen: 'Rekenen',
  begrijpend_lezen: 'Begrijpend Lezen',
  geschiedenis: 'Geschiedenis',
  aardrijkskunde: 'Aardrijkskunde',
  kennis_der_natuur: 'Kennis der Natuur',
}

function getSubscriptionStatus(subscriptions: SubscriptionRow[]): 'actief' | 'verlopen' | 'geen' {
  if (!subscriptions || subscriptions.length === 0) return 'geen'
  const active = subscriptions.find(
    (s) => s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > new Date())
  )
  if (active) return 'actief'
  return 'verlopen'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function GebruikersPage({ params }: GebruikersPageProps) {
  await params

  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    redirect('/')
  }

  const adminClient = createAdminClient()
  const { data: families } = await adminClient
    .from('profiles')
    .select(`
      id,
      display_name,
      user_id,
      created_at,
      children ( id, first_name, grade, child_subject_progress ( subject, current_level, is_stuck, stuck_since, last_session_at, total_sessions ) ),
      subscriptions ( status, expires_at )
    `)
    .order('created_at', { ascending: false }) as { data: FamilyRow[] | null }

  const allFamilies = families ?? []

  // Extract stuck alerts (ADMIN-04)
  const stuckAlerts: StuckAlert[] = []
  for (const family of allFamilies) {
    for (const child of (family.children ?? [])) {
      for (const progress of (child.child_subject_progress ?? [])) {
        if (progress.is_stuck) {
          stuckAlerts.push({
            familyName: family.display_name,
            childName: child.first_name,
            childGrade: child.grade,
            subject: SUBJECT_LABELS[progress.subject] ?? progress.subject,
            stuckSince: progress.stuck_since,
          })
        }
      }
    }
  }

  // Aggregate stats
  const totalFamilies = allFamilies.length
  const totalChildren = allFamilies.reduce((sum, f) => sum + (f.children?.length ?? 0), 0)
  const activeSubscriptions = allFamilies.filter(
    (f) => getSubscriptionStatus(f.subscriptions) === 'actief'
  ).length

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Families &amp; Kinderen</h2>

      {/* Stuck Alerts (ADMIN-04) */}
      {stuckAlerts.length === 0 ? (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-4 mb-8 flex items-center gap-3">
          <span className="text-2xl">✓</span>
          <p className="text-green-800 font-medium">Geen kinderen vastgelopen</p>
        </div>
      ) : (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-8">
          <h3 className="text-red-800 font-bold text-lg mb-3">
            Kinderen die vastgelopen zijn ({stuckAlerts.length})
          </h3>
          <ul className="space-y-1">
            {stuckAlerts.map((alert, i) => (
              <li key={i} className="text-red-700 text-sm">
                <span className="font-semibold">{alert.childName}</span>{' '}
                ({alert.familyName}, klas {alert.childGrade}) — {alert.subject}
                {alert.stuckSince && (
                  <span className="text-red-500"> (sinds {formatDate(alert.stuckSince)})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
          <p className="text-3xl font-bold text-sky-700">{totalFamilies}</p>
          <p className="text-gray-600 text-sm mt-1">Families</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
          <p className="text-3xl font-bold text-sky-700">{totalChildren}</p>
          <p className="text-gray-600 text-sm mt-1">Kinderen</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
          <p className="text-3xl font-bold text-green-600">{activeSubscriptions}</p>
          <p className="text-gray-600 text-sm mt-1">Actieve abonnementen</p>
        </div>
      </div>

      {/* Families list */}
      {allFamilies.length === 0 ? (
        <p className="text-gray-500 italic text-center py-12">Geen families gevonden</p>
      ) : (
        <div className="space-y-4">
          {allFamilies.map((family) => {
            const subStatus = getSubscriptionStatus(family.subscriptions)
            return (
              <div
                key={family.id}
                className="bg-white rounded-xl shadow-md p-6 border-l-4 border-sky-500"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{family.display_name}</h3>
                    <p className="text-gray-500 text-sm">
                      Lid sinds {formatDate(family.created_at)}
                    </p>
                  </div>
                  {subStatus === 'actief' && (
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                      Actief
                    </span>
                  )}
                  {subStatus === 'verlopen' && (
                    <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">
                      Verlopen
                    </span>
                  )}
                  {subStatus === 'geen' && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                      Geen abonnement
                    </span>
                  )}
                </div>

                {family.children && family.children.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {family.children.map((child) => {
                      const assessmentsDone = child.child_subject_progress?.filter(
                        (p) => p.current_level > 0
                      ).length ?? 0
                      const hasStuck = child.child_subject_progress?.some((p) => p.is_stuck) ?? false
                      return (
                        <span
                          key={child.id}
                          className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-800 text-sm font-medium px-3 py-1 rounded-full"
                        >
                          {child.first_name} (klas {child.grade})
                          {assessmentsDone > 0 && (
                            <span className="text-sky-600 text-xs">{assessmentsDone}/6</span>
                          )}
                          {hasStuck && (
                            <span className="text-red-600 text-xs font-bold" title="Vastgelopen">!</span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">Geen kinderen</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
