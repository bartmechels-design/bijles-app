import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

interface TutorPageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function TutorPage({ params }: TutorPageProps) {
  const { locale } = await params
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect(`/${locale}/login`)
  }

  // Fetch current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect(`/${locale}/login`)
  }

  // Check if user is admin (admins bypass subscription check)
  const isAdmin = user.app_metadata?.role === 'admin'

  // Check subscription status (unless user is admin)
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

  // Require active subscription for tutoring
  if (!hasActiveSubscription) {
    redirect(`/${locale}/dashboard`)
  }

  // Fetch children for this parent
  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', profile.id)
    .order('created_at', { ascending: true })

  const t = await getTranslations({ locale })

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-amber-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-semibold mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('tutor.backToDashboard')}
          </Link>

          <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-3xl shadow-2xl p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-6xl">🐵</span>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {t('tutor.selectChild')}
                </h1>
                <p className="text-amber-100 text-lg">
                  Koko is klaar om te helpen!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Children Selection */}
        {!children || children.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-sky-100 p-4 rounded-full">
                <svg className="w-12 h-12 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('tutor.noChildren')}
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              {t('tutor.addChildFirst')}
            </p>
            <Link
              href={`/${locale}/dashboard`}
              className="inline-block bg-sky-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-300 transition-all shadow-md"
            >
              {t('tutor.backToDashboard')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/${locale}/tutor/${child.id}`}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border-4 border-transparent hover:border-sky-300 transform hover:scale-105 cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-gradient-to-br from-sky-400 to-sky-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold shadow-md">
                      {child.voornaam.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 group-hover:text-sky-600 transition-colors">
                        {child.voornaam}
                      </h3>
                      <p className="text-gray-600">
                        {child.leeftijd} jaar • Klas {child.klas}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sky-600 font-semibold">
                    <span>Start bijles</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
