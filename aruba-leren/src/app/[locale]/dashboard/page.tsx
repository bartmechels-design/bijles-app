import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import AddChildForm from '@/components/AddChildForm'
import ChildList from '@/components/ChildList'
import { signOut } from '@/lib/auth/actions'

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
    // Redirect unauthenticated users to login
    redirect(`/${locale}/login`)
  }

  // Fetch current user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError)
    redirect(`/${locale}/login`)
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

            {/* Logout Button */}
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

        {/* Main Content */}
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
      </div>
    </div>
  )
}
