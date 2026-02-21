'use client';

import Link from 'next/link';
import { SUBJECTS } from '@/types/tutoring';
import type { ChildSubjectProgress } from '@/types/progress';
import SubjectProgress from './SubjectProgress';

interface ChildBasic {
  id: string;
  first_name: string;
  grade: number;
}

interface ProgressSummaryCardProps {
  child: ChildBasic;
  progress: Record<string, ChildSubjectProgress>;
  locale: string;
}

/**
 * Compact progress overview card per child for the parent dashboard.
 * Shows child name, grade, and per-subject progress for all 6 subjects.
 * Links to the per-child detail page for full breakdown.
 */
export default function ProgressSummaryCard({ child, progress, locale }: ProgressSummaryCardProps) {
  const hasAnyProgress = Object.keys(progress).length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-sky-100">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-sky-700">{child.first_name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">Klas {child.grade}</p>
        </div>
        <Link
          href={`/${locale}/dashboard/kind/${child.id}`}
          className="text-sm font-semibold text-sky-600 hover:text-sky-800 hover:underline whitespace-nowrap"
        >
          Details &gt;
        </Link>
      </div>

      {/* Per-subject progress */}
      {hasAnyProgress ? (
        <div className="space-y-4">
          {SUBJECTS.map((subject) => (
            <div key={subject.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{subject.icon}</span>
                <span className="text-sm font-semibold text-gray-700">{subject.labelNl}</span>
              </div>
              <SubjectProgress
                progress={progress[subject.id] ?? null}
                locale={locale}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-gray-400 mt-2">Nog geen lessen gevolgd</p>
      )}
    </div>
  );
}
