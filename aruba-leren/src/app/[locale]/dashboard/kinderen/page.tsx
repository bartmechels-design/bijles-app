import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddChildForm from '@/components/AddChildForm'
import ChildList from '@/components/ChildList'
import Link from 'next/link'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function KinderenPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect(`/${locale}/login`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) redirect(`/${locale}/login`)

  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('parent_id', profile.id)
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/${locale}/dashboard`} className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-800 font-semibold">
            ← Terug naar dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Kinderen beheren</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AddChildForm locale={locale} />
          <ChildList children={children || []} locale={locale} />
        </div>
      </div>
    </div>
  )
}
