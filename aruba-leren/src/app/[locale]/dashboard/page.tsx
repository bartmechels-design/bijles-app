import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import AddChildForm from '@/components/AddChildForm'
import ChildList from '@/components/ChildList'
import { signOut } from '@/lib/auth/actions'
import Link from 'next/link'

interface DashboardPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect(`/${locale}/login`)
  }

  // Fetch current user's profile - create if missing (trigger may not have fired)
  let { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    // Profile missing - create it manually
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, role: 'parent', display_name: user.email, consent_given: true, consent_date: new Date().toISOString() })
      .select('id')
      .single()
    profile = newProfile
  }

  if (!profile) {
    redirect(`/${locale}/login`)
  }

  // Check if user is admin (check both JWT metadata and database)
  const isAdminFromJWT = user.app_metadata?.role === 'admin'
  let isAdmin = isAdminFromJWT
  if (!isAdmin) {
    // Fallback: check raw_app_meta_data directly in database
    const { createAdminClient } = await import('@/lib/auth/admin')
    const adminClient = createAdminClient()
    const { data: dbUser } = await adminClient.auth.admin.getUserById(user.id)
    isAdmin = dbUser?.user?.app_metadata?.role === 'admin'
  }

  // Check subscription status (unless user is admin)
  let hasActiveSubscription = false
  if (isAdmin) {
    hasActiveSubscription = true // Admins always have access
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

  // Fetch children for this parent
  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', profile.id)
    .order('created_at', { ascending: true })

  if (childrenError) {
    console.error('Children fetch error:', childrenError)
  }

  const t = await getTranslations({ locale })

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-400 to-sky-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {t('parent.dashboardTitle')}
              </h1>
              <p className="text-sky-100 text-lg">
                {user.email}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link
                href={`/${locale}/subscription/status`}
                className="bg-amber-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-300/50 shadow-md transition-all"
              >
                Abonnement
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="bg-white text-sky-600 font-bold py-3 px-6 rounded-xl hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-white/50 shadow-md transition-all"
                >
                  {t('nav.logout')}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Main Content - Conditional based on subscription */}
        {hasActiveSubscription ? (
          <>
            {/* Tutoring CTA Card */}
            {children && children.length > 0 && (
              <div className="mb-8">
                <Link
                  href={`/${locale}/tutor`}
                  className="block group"
                >
                  <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-sky-500 rounded-2xl shadow-xl hover:shadow-2xl transition-all p-8 border-4 border-transparent hover:border-white transform hover:scale-[1.02]">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <span className="text-7xl">🐵</span>
                        <div className="text-white">
                          <h2 className="text-3xl font-bold mb-2">
                            Bijles met Koko
                          </h2>
                          <p className="text-amber-100 text-lg">
                            Start een les met onze AI-leraar
                          </p>
                        </div>
                      </div>
                      <div className="bg-white text-sky-600 font-bold px-6 py-3 rounded-xl group-hover:bg-sky-50 transition-colors shadow-md">
                        Start nu →
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add Child Form */}
              <div>
                <AddChildForm locale={locale} />
              </div>

              {/* Child List */}
              <div className="lg:col-span-1">
                <ChildList
                  children={children || []}
                  locale={locale}
                />
              </div>
            </div>
          </>
        ) : (
          /* No Active Subscription Message */
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-amber-500">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-amber-100 p-4 rounded-full">
                <svg
                  className="w-12 h-12 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Actief abonnement vereist
            </h2>

            {/* Message */}
            <p className="text-gray-700 text-center text-lg mb-8">
              U heeft een actief abonnement nodig om ArubaLeren te gebruiken en kinderen toe te voegen.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${locale}/subscription/request`}
                className="bg-amber-500 text-white font-bold py-4 px-8 rounded-xl hover:bg-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-300 transition-all text-center"
              >
                Betalingsverzoek indienen
              </Link>
              <Link
                href={`/${locale}/subscription/status`}
                className="bg-sky-500 text-white font-bold py-4 px-8 rounded-xl hover:bg-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-300 transition-all text-center"
              >
                Bekijk abonnementsstatus
              </Link>
            </div>

            {/* Additional Info */}
            <div className="mt-8 bg-sky-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 text-center">
                Na het indienen van een betalingsverzoek, controleren we uw betaling
                en activeren we uw abonnement binnen 24 uur.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
