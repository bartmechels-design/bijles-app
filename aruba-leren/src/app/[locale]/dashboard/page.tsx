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
      .select('child_id, subject, assessment_completed, is_stuck, total_sessions, last_session_at')
      .in('child_id', childIds)
    for (const row of progressRows ?? []) {
      if (!progressByChild[row.child_id]) progressByChild[row.child_id] = {}
      progressByChild[row.child_id][row.subject] = row as ChildSubjectProgress
    }
  }

  const t = await getTranslations({ locale })

  function relTime(iso: string | null): string {
    if (!iso) return '—'
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (diff === 0) return 'Vandaag'
    if (diff === 1) return 'Gisteren'
    if (diff < 7) return `${diff}d geleden`
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('parent.dashboardTitle')}</h1>
            <p className="text-sky-200 text-sm">{user.email}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isAdmin && (
              <Link href={`/${locale}/admin`} className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors">
                Admin
              </Link>
            )}
            <Link href={`/${locale}/subscription/status`} className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
              💳 Abonnement
            </Link>
            <Link href={`/${locale}/vakanties`} className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
              📅 Vakanties
            </Link>
            <form action={signOut}>
              <button type="submit" className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
                {t('nav.logout')}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {hasActiveSubscription ? (
          <>
            {/* ── Bijles CTA ── */}
            {children && children.length > 0 && (
              <Link href={`/${locale}/tutor`} className="block group">
                <div className="bg-gradient-to-r from-amber-400 to-sky-500 rounded-2xl p-5 flex items-center justify-between shadow-md hover:shadow-xl hover:scale-[1.01] transition-all">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">🐵</span>
                    <div className="text-white">
                      <p className="text-xl font-bold">Bijles met Koko</p>
                      <p className="text-amber-100 text-sm">Start een les met onze AI-leraar</p>
                    </div>
                  </div>
                  <div className="bg-white text-sky-600 font-bold px-5 py-2 rounded-xl group-hover:bg-sky-50 transition-colors shadow text-sm">
                    Start nu →
                  </div>
                </div>
              </Link>
            )}

            {/* ── Kinderen ── */}
            {children && children.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-800">Voortgang per kind</h2>
                  <Link href={`/${locale}/dashboard/kinderen`} className="text-sm text-sky-600 hover:underline font-semibold">
                    Beheren →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {children.map((child) => {
                    const prog = progressByChild[child.id] ?? {}
                    const subjects = Object.values(prog)
                    const assessed = subjects.filter((s) => s.assessment_completed).length
                    const totalSessions = subjects.reduce((sum, s) => sum + (s.total_sessions ?? 0), 0)
                    const isStuck = subjects.some((s) => s.is_stuck)
                    const lastSession = subjects.map((s) => s.last_session_at).filter(Boolean).sort().at(-1) ?? null

                    return (
                      <div
                        key={child.id}
                        className={`bg-white rounded-2xl shadow-md border-2 p-5 ${isStuck ? 'border-orange-300' : 'border-sky-100'}`}
                      >
                        {/* Kind header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-sky-100 text-sky-600 font-bold text-lg flex items-center justify-center shrink-0">
                              {child.first_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{child.first_name}</p>
                              <p className="text-sm text-gray-400">Klas {child.grade}</p>
                            </div>
                          </div>
                          {isStuck && (
                            <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-1 rounded-full">⚠ Hulp nodig</span>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-sky-50 rounded-xl py-2 text-center">
                            <p className="text-lg font-bold text-sky-600">{assessed}/6</p>
                            <p className="text-xs text-gray-500">Getoetst</p>
                          </div>
                          <div className="bg-amber-50 rounded-xl py-2 text-center">
                            <p className="text-lg font-bold text-amber-600">{totalSessions}</p>
                            <p className="text-xs text-gray-500">Lessen</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl py-2 text-center">
                            <p className="text-sm font-bold text-gray-600">{relTime(lastSession)}</p>
                            <p className="text-xs text-gray-500">Laatste les</p>
                          </div>
                        </div>

                        {/* Actie-knoppen */}
                        <div className="flex gap-2">
                          <Link href={`/${locale}/dashboard/kind/${child.id}`} className="flex-1 text-center text-sm font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 py-2 rounded-xl transition-colors">
                            Voortgang
                          </Link>
                          <Link href={`/${locale}/dashboard/kind/${child.id}/rapport`} className="flex-1 text-center text-sm font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 py-2 rounded-xl transition-colors">
                            Rapport
                          </Link>
                          <Link href={`/${locale}/tutor?child=${child.id}`} className="flex-1 text-center text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-xl transition-colors">
                            Bijles
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Geen kinderen */}
            {(!children || children.length === 0) && (
              <Link href={`/${locale}/dashboard/kinderen`} className="flex items-center justify-center gap-2 border-2 border-dashed border-sky-300 text-sky-600 hover:border-sky-500 hover:bg-sky-50 rounded-2xl py-10 text-base font-semibold transition-colors">
                + Eerste kind toevoegen
              </Link>
            )}

            {/* Kind toevoegen knop */}
            {children && children.length > 0 && (
              <Link href={`/${locale}/dashboard/kinderen`} className="flex items-center justify-center gap-2 border-2 border-dashed border-sky-200 text-sky-500 hover:border-sky-400 hover:bg-sky-50 rounded-xl py-3 text-sm font-semibold transition-colors">
                + Kind toevoegen of beheren
              </Link>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-amber-500 max-w-md mx-auto mt-4">
            <div className="text-center text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-3">Actief abonnement vereist</h2>
            <p className="text-gray-500 text-sm text-center mb-6">Je hebt een actief abonnement nodig om ArubaLeren te gebruiken.</p>
            <div className="flex flex-col gap-3">
              <Link href={`/${locale}/subscription/request`} className="bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 text-center text-sm">
                Betalingsverzoek indienen
              </Link>
              <Link href={`/${locale}/subscription/status`} className="bg-sky-100 text-sky-700 font-bold py-3 rounded-xl hover:bg-sky-200 text-center text-sm">
                Abonnementsstatus bekijken
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
