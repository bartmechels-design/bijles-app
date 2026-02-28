import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { signOut } from '@/lib/auth/actions'
import Link from 'next/link'
import type { ChildSubjectProgress } from '@/types/progress'

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect(`/${locale}/login`)

  let { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, role: 'parent', display_name: user.email, consent_given: true, consent_date: new Date().toISOString() })
      .select('id')
      .single()
    profile = newProfile
  }
  if (!profile) redirect(`/${locale}/login`)

  const isAdminFromJWT = user.app_metadata?.role === 'admin'
  let isAdmin = isAdminFromJWT
  if (!isAdmin) {
    const { createAdminClient } = await import('@/lib/auth/admin')
    const adminClient = createAdminClient()
    const { data: dbUser } = await adminClient.auth.admin.getUserById(user.id)
    isAdmin = dbUser?.user?.app_metadata?.role === 'admin'
  }

  let hasActiveSubscription = false
  if (isAdmin) {
    hasActiveSubscription = true
  } else {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, expires_at')
      .eq('profile_id', profile.id)
      .single()
    hasActiveSubscription =
      !!subscription &&
      subscription.status === 'active' &&
      new Date(subscription.expires_at) > new Date()
  }

  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', profile.id)
    .order('created_at', { ascending: true })

  const childIds = (children || []).map((c) => c.id)
  let progressByChild: Record<string, Record<string, ChildSubjectProgress>> = {}

  if (childIds.length > 0) {
    const { data: progressRows } = await supabase
      .from('child_subject_progress')
      .select('child_id, subject, assessment_completed, is_stuck, total_sessions')
      .in('child_id', childIds)
    for (const row of progressRows ?? []) {
      if (!progressByChild[row.child_id]) progressByChild[row.child_id] = {}
      progressByChild[row.child_id][row.subject] = row as ChildSubjectProgress
    }
  }

  const t = await getTranslations({ locale })

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-sky-50 via-white to-sky-100 overflow-hidden">

      {/* ── Top bar ── */}
      <header className="shrink-0 bg-white border-b border-sky-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐵</span>
            <span className="font-bold text-sky-700 text-sm hidden sm:inline">ArubaLeren</span>
          </div>
          <p className="text-sm text-gray-500 truncate max-w-[200px] hidden md:block">{user.email}</p>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href={`/${locale}/admin`} className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-lg hover:bg-red-200">
                Admin
              </Link>
            )}
            <Link href={`/${locale}/subscription/status`} className="text-xs font-semibold text-amber-600 hover:text-amber-800 px-2 py-1 rounded-lg hover:bg-amber-50 hidden sm:inline">
              💳 Abonnement
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100">
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">

          {hasActiveSubscription ? (
            <>
              {/* Quick actions */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { href: `/${locale}/tutor`, emoji: '🐵', label: 'Bijles starten', color: 'from-amber-400 to-amber-500' },
                  { href: `/${locale}/vakanties`, emoji: '📅', label: 'Vakantierooster', color: 'from-sky-400 to-sky-500' },
                  { href: `/${locale}/subscription/status`, emoji: '💳', label: 'Abonnement', color: 'from-orange-400 to-orange-500' },
                  ...(children && children.length > 0
                    ? [{ href: `/${locale}/dashboard/kind/${children[0].id}/rapport`, emoji: '📊', label: 'Rapport', color: 'from-violet-400 to-violet-500' }]
                    : []),
                ].map(({ href, emoji, label, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex flex-col items-center gap-1.5 bg-gradient-to-br ${color} text-white rounded-2xl py-4 px-2 shadow hover:shadow-md hover:scale-[1.03] transition-all text-center`}
                  >
                    <span className="text-3xl">{emoji}</span>
                    <span className="font-bold text-xs leading-tight">{label}</span>
                  </Link>
                ))}
              </div>

              {/* Children */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Mijn kinderen</h2>
                  <Link href={`/${locale}/dashboard/kinderen`} className="text-xs text-sky-600 hover:underline">
                    Beheren →
                  </Link>
                </div>

                {children && children.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow border border-sky-100 divide-y divide-sky-50">
                    {children.map((child) => {
                      const prog = progressByChild[child.id] ?? {}
                      const assessed = Object.values(prog).filter((s) => s.assessment_completed).length
                      const isStuck = Object.values(prog).some((s) => s.is_stuck)
                      return (
                        <div key={child.id} className="flex items-center gap-3 px-4 py-3">
                          {/* Avatar */}
                          <div className="shrink-0 w-10 h-10 rounded-full bg-sky-100 text-sky-600 font-bold text-base flex items-center justify-center">
                            {child.first_name.charAt(0).toUpperCase()}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{child.first_name}</span>
                              <span className="text-xs text-gray-400">Klas {child.grade}</span>
                              {isStuck && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">⚠ hulp nodig</span>}
                            </div>
                            <div className="flex gap-1 mt-1">
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-1.5 w-5 rounded-full ${i < assessed ? 'bg-sky-400' : 'bg-gray-200'}`}
                                />
                              ))}
                              <span className="text-xs text-gray-400 ml-1">{assessed}/6</span>
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="shrink-0 flex gap-1.5">
                            <Link href={`/${locale}/tutor?child=${child.id}`} className="text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1.5 rounded-lg transition-colors">
                              Bijles
                            </Link>
                            <Link href={`/${locale}/dashboard/kind/${child.id}`} className="text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 px-2.5 py-1.5 rounded-lg transition-colors">
                              Voortgang
                            </Link>
                            <Link href={`/${locale}/dashboard/kind/${child.id}/rapport`} className="text-xs font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 px-2.5 py-1.5 rounded-lg transition-colors">
                              Rapport
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6 text-center text-gray-500 text-sm">
                    Nog geen kinderen toegevoegd
                  </div>
                )}

                <Link
                  href={`/${locale}/dashboard/kinderen`}
                  className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-dashed border-sky-200 text-sky-600 hover:border-sky-400 hover:bg-sky-50 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                >
                  + Kind toevoegen of beheren
                </Link>
              </section>
            </>
          ) : (
            /* No subscription */
            <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-amber-500 max-w-md mx-auto mt-8">
              <div className="text-center mb-6 text-5xl">🔒</div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-3">Actief abonnement vereist</h2>
              <p className="text-gray-500 text-sm text-center mb-6">Je hebt een actief abonnement nodig om ArubaLeren te gebruiken.</p>
              <div className="flex flex-col gap-3">
                <Link href={`/${locale}/subscription/request`} className="bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 transition-all text-center text-sm">
                  Betalingsverzoek indienen
                </Link>
                <Link href={`/${locale}/subscription/status`} className="bg-sky-100 text-sky-700 font-bold py-3 rounded-xl hover:bg-sky-200 transition-all text-center text-sm">
                  Abonnementsstatus bekijken
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
