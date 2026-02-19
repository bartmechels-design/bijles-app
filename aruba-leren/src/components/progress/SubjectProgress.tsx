'use client';

import type { ChildSubjectProgress } from '@/types/progress';
import ProgressBar from './ProgressBar';
import LevelBadge from './LevelBadge';

interface SubjectProgressProps {
  progress: ChildSubjectProgress | null;
  locale: string;
}

/**
 * Combined progress card element per subject.
 * Renders one of three states:
 *   1. null (no assessment started)  — "Toets nodig" amber badge
 *   2. assessment_completed = false  — "Toets nodig" amber badge
 *   3. assessment_completed = true   — LevelBadge + ProgressBar (+ optional stuck indicator)
 */
export default function SubjectProgress({ progress, locale }: SubjectProgressProps) {
  // States 1 and 2: assessment not yet completed
  if (!progress || !progress.assessment_completed) {
    return (
      <div className="mt-3">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border-2 border-amber-300 font-semibold text-sm">
          <span>📋</span>
          <span>Toets nodig</span>
        </span>
      </div>
    );
  }

  // State 3: assessment completed — show level and progress
  return (
    <div className="mt-3 space-y-2">
      <LevelBadge level={progress.current_level} locale={locale} />
      <ProgressBar level={progress.current_level} showLevel />
      {progress.is_stuck && (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 text-xs font-semibold">
          <span>⚠️</span>
          <span>Vastgelopen</span>
        </div>
      )}
    </div>
  );
}
