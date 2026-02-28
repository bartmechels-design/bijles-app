import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SUBJECTS } from '@/types/tutoring';
import type { ChildSubjectProgress, ProgressEvent } from '@/types/progress';
import SubjectProgress from '@/components/progress/SubjectProgress';

interface ChildDetailPageProps {
  params: Promise<{
    locale: string;
    childId: string;
  }>;
}

/**
 * Format a date string as a human-readable relative time or absolute date.
 * Returns strings like "2 dagen geleden", "3 weken geleden", or a formatted date.
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Vandaag';
  if (diffDays === 1) return 'Gisteren';
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 'en' : ''} geleden`;
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Dutch labels for progress event types */
const EVENT_TYPE_LABELS: Record<string, string> = {
  assessment_completed: 'Toets afgerond',
  level_up: 'Niveau omhoog',
  level_down: 'Niveau omlaag',
  stuck_flagged: 'Vastgelopen',
  stuck_cleared: 'Vlot getrokken',
  session_started: 'Les gestart',
  session_ended: 'Les beëindigd',
};

export default async function ChildDetailPage({ params }: ChildDetailPageProps) {
  const { locale, childId } = await params;
  const supabase = await createClient();

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // Fetch profile via user_id (CRITICAL: use profile.id — not user.id — for parent_id checks)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch child — must be owned by this parent (use profile.id for parent_id, not user.id)
  const { data: child } = await supabase
    .from('children')
    .select('id, first_name, grade, parent_id')
    .eq('id', childId)
    .eq('parent_id', profile.id)
    .single();

  if (!child) {
    // Child not found or not owned by this parent — redirect to dashboard
    redirect(`/${locale}/dashboard`);
  }

  // Fetch all subject progress for this child
  const { data: progressRows } = await supabase
    .from('child_subject_progress')
    .select('*')
    .eq('child_id', childId);

  // Build progress map keyed by subject for O(1) lookup
  const progressBySubject: Record<string, ChildSubjectProgress> = {};
  for (const row of progressRows ?? []) {
    progressBySubject[row.subject] = row as ChildSubjectProgress;
  }

  // Fetch recent progress events (last 10)
  const { data: recentEvents } = await supabase
    .from('progress_events')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(10);

  const events = (recentEvents ?? []) as ProgressEvent[];

  // Find subject info by id
  const subjectMap = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-800 font-semibold"
          >
            <span>&larr;</span>
            <span>Terug naar dashboard</span>
          </Link>
        </div>

        {/* Child header */}
        <div className="bg-gradient-to-r from-sky-400 to-sky-600 rounded-2xl shadow-xl p-6 mb-8 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{child.first_name}</h1>
              <p className="text-sky-100 mt-1">Klas {child.grade}</p>
            </div>
            <Link
              href={`/${locale}/dashboard/kind/${childId}/rapport`}
              className="shrink-0 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <span>📊</span>
              <span>Rapport bekijken</span>
            </Link>
          </div>
        </div>

        {/* Subject progress grid */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Voortgang per vak</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SUBJECTS.map((subject) => {
              const progress = progressBySubject[subject.id] ?? null;
              return (
                <div
                  key={subject.id}
                  className="bg-white rounded-2xl shadow-lg p-5 border-2 border-sky-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{subject.icon}</span>
                    <h3 className="text-lg font-bold text-gray-800">{subject.labelNl}</h3>
                  </div>

                  <SubjectProgress progress={progress} locale={locale} />

                  {/* Session stats — only shown when assessment is completed */}
                  {progress?.assessment_completed && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold">{progress.total_sessions}</span>{' '}
                        {progress.total_sessions === 1 ? 'les' : 'lessen'} gevolgd
                      </p>
                      {progress.last_session_at && (
                        <p className="text-xs text-gray-400">
                          Laatste les: {formatRelativeTime(progress.last_session_at)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Recente activiteit</h2>
          {events.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-sky-100">
              <p className="text-gray-400 italic text-sm">Nog geen activiteit geregistreerd.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-sky-100 divide-y divide-gray-100">
              {events.map((event) => {
                const subjectInfo = subjectMap[event.subject];
                return (
                  <div key={event.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-lg shrink-0">
                      {subjectInfo?.icon ?? '📝'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {subjectInfo?.labelNl ?? event.subject}
                      </p>
                    </div>
                    <time className="text-xs text-gray-400 shrink-0">
                      {formatRelativeTime(event.created_at)}
                    </time>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
