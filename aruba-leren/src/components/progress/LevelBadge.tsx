'use client';

import { LEVEL_NAMES } from '@/types/progress';

interface LevelBadgeProps {
  level: number;
  locale: string;
}

/** Emoji per level (1-5). */
const LEVEL_EMOJIS: Record<number, string> = {
  1: '🌱', // seedling
  2: '⭐', // star
  3: '🌟', // glowing star
  4: '🏆', // trophy
  5: '🚀', // rocket
};

/** Tailwind color classes per level (1-5). */
const LEVEL_COLORS: Record<
  number,
  { bg: string; text: string; border: string }
> = {
  1: { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300'  },
  2: { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300'   },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  4: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  5: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
};

/**
 * Kid-friendly level badge with locale-aware name and color-coded styling.
 * Supports nl, pap, es, en locales.
 */
export default function LevelBadge({ level, locale }: LevelBadgeProps) {
  const clampedLevel = Math.max(1, Math.min(level, 5)) as 1 | 2 | 3 | 4 | 5;
  const names = LEVEL_NAMES[clampedLevel];
  const name =
    locale === 'pap'
      ? names.pap
      : locale === 'es'
      ? names.es
      : locale === 'en'
      ? names.en
      : names.nl;
  const emoji = LEVEL_EMOJIS[clampedLevel];
  const colors = LEVEL_COLORS[clampedLevel];

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 font-bold text-sm ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <span>{emoji}</span>
      <span>{name}</span>
    </span>
  );
}
