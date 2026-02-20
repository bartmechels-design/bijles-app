'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SUBJECTS } from '@/types/tutoring';
import type { ChildSubjectProgress } from '@/types/progress';
import SubjectProgress from '@/components/progress/SubjectProgress';

interface SubjectSelectorProps {
  childId: string;
  childName: string;
  locale: string;
  progressMap: Record<string, ChildSubjectProgress>;
}

export default function SubjectSelector({ childId, childName, locale, progressMap }: SubjectSelectorProps) {
  const t = useTranslations('tutor');

  const kernSubjects = SUBJECTS.filter(s => s.category === 'kern');
  const zaakSubjects = SUBJECTS.filter(s => s.category === 'zaak');

  const getSubjectLabel = (subject: typeof SUBJECTS[0]) => {
    if (locale === 'pap') return subject.labelPap;
    if (locale === 'es') return subject.labelEs;
    if (locale === 'en') return subject.labelEn;
    return subject.labelNl;
  };

  /** Determine the href for a subject card based on assessment state. */
  const getSubjectHref = (subjectId: string): string => {
    const progress = progressMap[subjectId] ?? null;
    if (progress?.assessment_completed === true) {
      return `/${locale}/tutor/${childId}/${subjectId}`;
    }
    return `/${locale}/assessment/${childId}/${subjectId}`;
  };

  /** Button label: "Start Toets" if not yet assessed, "Start Sessie" otherwise. */
  const getButtonLabel = (subjectId: string): string => {
    const progress = progressMap[subjectId] ?? null;
    if (!progress || !progress.assessment_completed) {
      // Try i18n key, fall back to Dutch
      try {
        return t('startAssessment');
      } catch {
        return 'Start Toets';
      }
    }
    return t('startSession');
  };

  const renderCard = (
    subject: typeof SUBJECTS[0],
    gradientFrom: string,
    gradientTo: string,
    borderHover: string,
    categoryLabel: string,
  ) => {
    const progress = progressMap[subject.id] ?? null;
    const href = getSubjectHref(subject.id);
    const buttonLabel = getButtonLabel(subject.id);

    return (
      <Link key={subject.id} href={href} className="group">
        <div
          className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 border-4 border-transparent ${borderHover} transform hover:scale-105 cursor-pointer text-white`}
        >
          <div className="text-center">
            <div className="text-6xl mb-4">{subject.icon}</div>
            <h3 className="text-2xl font-bold mb-2">{getSubjectLabel(subject)}</h3>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 inline-block text-sm font-semibold mb-2">
              {categoryLabel}
            </div>
            <SubjectProgress progress={progress} locale={locale} />
            <div className="flex items-center justify-center gap-2 font-semibold mt-4">
              <span>{buttonLabel}</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  /** Zaakvakken card — no assessment gate, links directly to tutoring. Content upload comes in Phase 6. */
  const renderZaakCard = (
    subject: typeof SUBJECTS[0],
    gradientFrom: string,
    gradientTo: string,
    borderHover: string,
    categoryLabel: string,
  ) => {
    const href = `/${locale}/tutor/${childId}/${subject.id}`;
    return (
      <Link key={subject.id} href={href} className="group">
        <div
          className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 border-4 border-transparent ${borderHover} transform hover:scale-105 cursor-pointer text-white`}
        >
          <div className="text-center">
            <div className="text-6xl mb-4">{subject.icon}</div>
            <h3 className="text-2xl font-bold mb-2">{getSubjectLabel(subject)}</h3>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 inline-block text-sm font-semibold mb-2">
              {categoryLabel}
            </div>
            {/* No assessment badge — content upload unlocks assessment in Phase 6 */}
            <div className="mt-3 mb-1">
              <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                📄 Tekstbladen uploaden voor toets
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 font-semibold mt-4">
              <span>{t('startSession')}</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-8">
      {/* Kernvakken Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <span className="bg-sky-500 text-white px-4 py-1 rounded-full text-sm">
            {t('kernVakken')}
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kernSubjects.map((subject) =>
            renderCard(subject, 'from-sky-400', 'to-sky-600', 'hover:border-sky-300', 'Kernvak')
          )}
        </div>
      </div>

      {/* Zaakvakken Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <span className="bg-amber-500 text-white px-4 py-1 rounded-full text-sm">
            {t('zaakVakken')}
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zaakSubjects.map((subject) =>
            renderZaakCard(subject, 'from-amber-400', 'to-amber-600', 'hover:border-amber-300', 'Zaakvak')
          )}
        </div>
      </div>
    </div>
  );
}
