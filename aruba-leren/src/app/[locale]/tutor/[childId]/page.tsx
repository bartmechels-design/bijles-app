import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import SubjectSelector from '@/components/tutor/SubjectSelector'
import { getAllSubjectProgress } from '@/lib/tutoring/assessment-manager'
import type { ChildSubjectProgress } from '@/types/progress'

interface SubjectSelectionPageProps {
  params: Promise<{
    locale: string
    childId: string
  }>
}

export default async function SubjectSelectionPage({ params }: SubjectSelectionPageProps) {
  const { locale, childId } = await params
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

  // Fetch child and verify ownership
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .single()

  if (childError || !child) {
    redirect(`/${locale}/tutor`)
  }

  // Verify child ownership
  if (child.parent_id !== profile.id) {
    redirect(`/${locale}/tutor`)
  }

  // Fetch progress for all subjects — used by SubjectSelector to show assessment status
  const progressRows = await getAllSubjectProgress(childId)
  const progressMap: Record<string, ChildSubjectProgress> = {}
  for (const row of progressRows) {
    progressMap[row.subject] = row
  }

  const t = await getTranslations({ locale })

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-amber-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/tutor`}
            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-semibold mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('tutor.backToChildren')}
          </Link>

          <div className="bg-gradient-to-r from-sky-400 to-sky-600 rounded-3xl shadow-2xl p-8 text-white">
            <div className="flex items-center gap-4">
              <span className="text-6xl">🐵</span>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {t('tutor.selectSubject', { childName: child.first_name })}
                </h1>
                <p className="text-sky-100 text-lg">
                  Kies een vak om mee te beginnen
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Selector */}
        <SubjectSelector
          childId={childId}
          childName={child.first_name}
          locale={locale}
          progressMap={progressMap}
        />
      </div>
    </div>
  )
}
