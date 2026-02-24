import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getVacations, getCurrentSchoolYear } from '@/lib/vacations/queries';
import Link from 'next/link';

interface VakantiesPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function VakantiesPage({ params }: VakantiesPageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  const currentSchoolYear = getCurrentSchoolYear();
  const vacations = await getVacations(currentSchoolYear);

  function formatDate(dateString: string): string {
    const date = new Date(dateString + 'T12:00:00Z'); // noon UTC avoids timezone boundary issues
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href={`/${locale}/dashboard`}
        className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 text-sm font-medium mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Terug naar Dashboard
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Vakantierooster {currentSchoolYear}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Schoolvakantiedagen voor het huidige schooljaar
        </p>
      </div>

      {/* Vacation list */}
      {vacations.length === 0 ? (
        <p className="text-gray-500 italic text-center py-8">
          Geen vakanties gevonden voor dit schooljaar
        </p>
      ) : (
        <div className="space-y-3">
          {vacations.map((vacation) => (
            <div
              key={vacation.id}
              className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-sky-400"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-gray-900">
                      {vacation.name}
                    </h2>
                    {vacation.is_public_holiday && (
                      <span className="inline-block bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        Feestdag
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    {formatDate(vacation.start_date)} t/m{' '}
                    {formatDate(vacation.end_date)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
