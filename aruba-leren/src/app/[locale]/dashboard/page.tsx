import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import AddChildForm from '@/components/AddChildForm'
import ChildList from '@/components/ChildList'
import { signOut } from '@/lib/auth/actions'
import Link from 'next/link'
import type { ChildSubjectProgress } from '@/types/progress'

interface DashboardPageProps {
  params: Promise<{
    locale: string
  }>
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
    const now = new Date()
    hasActiveSubscription =
      !!subscription &&
      subscription.status === 'active' &&
      new Date(subscription.expires_at) > now
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
      .select('child_id, subject, current_level, assessment_completed, is_stuck, last_session_at, total_sessions')
      .in('child_id', childIds)

    for (const row of progressRows ?? []) {
      if (!progressByChild[row.child_id]) progressByChild[row.child_id] = {}
      progressByChild[row.child_id][row.subject] = row as ChildSubjectProgress
    }
  }

  const t = await getTranslations({ locale })

  // Compute per-child summary stats
  const childStats = (children || []).map((child) => {
    const prog = progressByChild[child.id] ?? {}
    const subjects = Object.values(prog)
    const assessed = subjects.filter((s) => s.assessment_completed).length
    const totalSessions = subjects.reduce((sum, s) => sum + (s.total_sessions ?? 0), 0)
    const isStuck = subjects.some((s) => s.is_stuck)
    const lastSession = subjects
      .map((s) => s.last_session_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null
    return { child, assessed, totalSessions, isStuck, lastSession }
  })

  // Format relative time
  function relTime(iso: string | null): string {
    if (!iso) return 'Nooit'
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (diff === 0) return 'Vandaag'
    if (diff === 1) return 'Gisteren'
    if (diff < 7) return `${diff} dagen geleden`
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      {/* Top bar */}
      <div className="bg-white border-b border-sky-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐵</span>
            <div>
              <p className="text-xs text-gray-400 leading-none">Ingelogd als</p>
              <p className="text-sm font-semibold text-gray-700 truncate max-w-[180px]">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/subscription/status`}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
            >
              💳 Abonnement
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('parent.dashboardTitle')}</h1>
          <p className="text-gray-500 mt-1">Welkom terug — hier is een overzicht van je kinderen.</p>
        </div>

        {hasActiveSubscription ? (
          <>
            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link
                href={`/${locale}/tutor`}
                className="flex flex-col items-center gap-2 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-2xl p-5 shadow-md hover:shadow-lg hover:scale-[1.03] transition-all text-center"
              >
                <span className="text-4xl">🐵</span>
                <span className="font-bold text-sm">Bijles starten</span>
              </Link>
              <Link
                href={`/${locale}/vakanties`}
                className="flex flex-col items-center gap-2 bg-gradient-to-br from-sky-400 to-sky-500 text-white rounded-2xl p-5 shadow-md hover:shadow-lg hover:scale-[1.03] transition-all text-center"
              >
                <span className="text-4xl">📅</span>
                <span className="font-bold text-sm">Vakantierooster</span>
              </Link>
              <Link
                href={`/${locale}/subscription/status`}
                className="flex flex-col items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl p-5 shadow-md hover:shadow-lg hover:scale-[1.03] transition-all text-center sm:hidden"
              >
                <span className="text-4xl">💳</span>
                <span className="font-bold text-sm">Abonnement</span>
              </Link>
              {children && children.length > 0 && (
                <Link
                  href={`/${locale}/dashboard/kind/${children[0].id}/rapport`}
                  className="flex flex-col items-center gap-2 bg-gradient-to-br from-violet-400 to-violet-500 text-white rounded-2xl p-5 shadow-md hover:shadow-lg hover:scale-[1.03] transition-all text-center"
                >
                  <span className="text-4xl">📊</span>
                  <span className="font-bold text-sm">Rapport</span>
                </Link>
              )}
              <Link
                href={`/${locale}/subscription/status`}
                className="hidden sm:flex flex-col items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl p-5 shadow-md hover:shadow-lg hover:scale-[1.03] transition-all text-center"
              >
                <span className="text-4xl">💳</span>
                <span className="font-bold text-sm">Abonnement</span>
              </Link>
            </div>

            {/* Children overview */}
            {childStats.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Mijn kinderen</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {childStats.map(({ child, assessed, totalSessions, isStuck, lastSession }) => (
                    <div
                      key={child.id}
                      className={`bg-white rounded-2xl shadow-md border-2 p-5 flex flex-col gap-4 ${isStuck ? 'border-orange-300' : 'border-sky-100'}`}
                    >
                      {/* Child header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-sky-100 text-sky-600 font-bold text-xl w-12 h-12 rounded-full flex items-center justify-center">
                            {child.first_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{child.first_name}</p>
                            <p className="text-sm text-gray-500">Klas {child.grade}</p>
                          </div>
                        </div>
                        {isStuck && (
                          <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-1 rounded-full">
                            ⚠ Hulp nodig
                          </span>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-sky-50 rounded-xl py-2">
                          <p className="text-xl font-bold text-sky-600">{assessed}/6</p>
                          <p className="text-xs text-gray-500">Vakken getoetst</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl py-2">
                          <p className="text-xl font-bold text-amber-600">{totalSessions}</p>
                          <p className="text-xs text-gray-500">Lessen gevolgd</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl py-2">
                          <p className="text-sm font-bold text-gray-600">{relTime(lastSession)}</p>
                          <p className="text-xs text-gray-500">Laatste les</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <Link
                          href={`/${locale}/dashboard/kind/${child.id}`}
                          className="flex-1 text-center text-sm font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 py-2 rounded-xl transition-colors"
                        >
                          Voortgang
                        </Link>
                        <Link
                          href={`/${locale}/dashboard/kind/${child.id}/rapport`}
                          className="flex-1 text-center text-sm font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 py-2 rounded-xl transition-colors"
                        >
                          Rapport
                        </Link>
                        <Link
                          href={`/${locale}/tutor?child=${child.id}`}
                          className="flex-1 text-center text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-xl transition-colors"
                        >
                          Bijles
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Add/manage children */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AddChildForm locale={locale} />
              <ChildList children={children || []} locale={locale} />
            </div>
          </>
        ) : (
          /* No active subscription */
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-amber-500 max-w-lg mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-amber-100 p-4 rounded-full">
                <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">Actief abonnement vereist</h2>
            <p className="text-gray-600 text-center mb-8">
              Je hebt een actief abonnement nodig om ArubaLeren te gebruiken.
            </p>
            <div className="flex flex-col gap-3">
              <Link href={`/${locale}/subscription/request`} className="bg-amber-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-amber-600 transition-all text-center">
                Betalingsverzoek indienen
              </Link>
              <Link href={`/${locale}/subscription/status`} className="bg-sky-100 text-sky-700 font-bold py-3 px-6 rounded-xl hover:bg-sky-200 transition-all text-center">
                Abonnementsstatus bekijken
              </Link>
            </div>
            <p className="text-xs text-gray-400 text-center mt-6">
              Na je betaling activeren we je abonnement binnen 24 uur.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
