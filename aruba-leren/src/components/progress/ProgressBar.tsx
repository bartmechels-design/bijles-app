'use client';

interface ProgressBarProps {
  level: number;
  maxLevel?: number;
  label?: string;
  showLevel?: boolean;
}

/**
 * Accessible Tailwind progress bar for level 1-5 display.
 * Level maps to percentage: level 1 = 20%, level 5 = 100%.
 */
export default function ProgressBar({
  level,
  maxLevel = 5,
  label,
  showLevel = false,
}: ProgressBarProps) {
  const clampedLevel = Math.max(1, Math.min(level, maxLevel));
  const percentage = (clampedLevel / maxLevel) * 100;

  return (
    <div className="w-full">
      {(label || showLevel) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-xs font-semibold text-gray-600">{label}</span>
          )}
          {showLevel && (
            <span className="text-xs font-bold text-sky-700">
              {clampedLevel}/{maxLevel}
            </span>
          )}
        </div>
      )}
      <div
        className="w-full h-4 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedLevel}
        aria-valuemin={1}
        aria-valuemax={maxLevel}
        aria-label={label ?? `Level ${clampedLevel} van ${maxLevel}`}
      >
        <div
          className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
