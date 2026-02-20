import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import ChatInterface from '@/components/tutor/ChatInterface'
import { Subject, SUBJECTS } from '@/types/tutoring'
import { getActiveSession } from '@/lib/tutoring/session-manager'

interface ChatPageProps {
  params: Promise<{
    locale: string
    childId: string
    subject: string
  }>
  searchParams: Promise<{ hiaat?: string }>
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { locale, childId, subject } = await params
  const { hiaat } = await searchParams
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

  // Validate subject parameter
  const validSubjects = SUBJECTS.map(s => s.id)
  if (!validSubjects.includes(subject as Subject)) {
    redirect(`/${locale}/tutor/${childId}`)
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

  // Get subject info for display
  const subjectInfo = SUBJECTS.find(s => s.id === subject)
  if (!subjectInfo) {
    redirect(`/${locale}/tutor/${childId}`)
  }

  // Check for active session
  const activeSession = await getActiveSession(childId, subject as Subject)

  const t = await getTranslations({ locale })

  // Get localized subject label
  const getSubjectLabel = () => {
    if (locale === 'pap') return subjectInfo.labelPap
    if (locale === 'es') return subjectInfo.labelEs
    if (locale === 'en') return subjectInfo.labelEn
    return subjectInfo.labelNl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-amber-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-sky-300">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/${locale}/tutor/${childId}`}
              className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('tutor.backToSubjects')}
            </Link>

            <div className="flex items-center gap-3">
              <span className="text-3xl">{subjectInfo.icon}</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {child.first_name} • {getSubjectLabel()}
                </h1>
                <p className="text-sm text-gray-600">
                  {activeSession ? t('tutor.resumeSession') : t('tutor.startSession')}
                </p>
              </div>
            </div>

            <div className="w-24"></div> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          childId={childId}
          childAge={child.age}
          childName={child.first_name}
          subject={subject as Subject}
          locale={locale}
          existingSessionId={activeSession?.id || null}
          subjectLabel={getSubjectLabel()}
          initialHiaat={hiaat}
        />
      </div>
    </div>
  )
}
