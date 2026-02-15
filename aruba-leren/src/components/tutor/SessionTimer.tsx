'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SESSION_DURATION_BY_AGE } from '@/types/tutoring';
import { useRouter } from 'next/navigation';

interface SessionTimerProps {
  childAge: number;
}

export default function SessionTimer({ childAge }: SessionTimerProps) {
  const t = useTranslations('tutor');
  const router = useRouter();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [extraMinutes, setExtraMinutes] = useState(0);

  // Get age-appropriate session duration limit (in minutes)
  const getSessionLimit = (age: number): number => {
    // Handle ages outside the defined range
    if (age < 6) return SESSION_DURATION_BY_AGE[6];
    if (age > 12) return SESSION_DURATION_BY_AGE[12];
    return SESSION_DURATION_BY_AGE[age] || SESSION_DURATION_BY_AGE[10]; // Default to age 10 if not found
  };

  const sessionLimitMinutes = getSessionLimit(childAge) + extraMinutes;

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    // Show warning when limit is reached
    if (elapsedMinutes >= sessionLimitMinutes && !showWarning) {
      setShowWarning(true);
    }
  }, [elapsedSeconds, sessionLimitMinutes, showWarning]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContinue = () => {
    setExtraMinutes(prev => prev + 5);
    setShowWarning(false);
  };

  const handleStop = () => {
    // Navigate back to subject selection
    router.back();
  };

  return (
    <>
      {/* Timer Display */}
      <div className="flex items-center gap-2 text-sm">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-gray-700 font-semibold">
          {t('sessionTimer')}: {formatTime(elapsedSeconds)}
        </span>
        {Math.floor(elapsedSeconds / 60) >= sessionLimitMinutes - 2 && (
          <span className="text-amber-600 text-xs font-semibold animate-pulse">
            ({sessionLimitMinutes} min limiet)
          </span>
        )}
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="text-center mb-6">
              <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⏰</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tijd voor een pauze?
              </h2>
              <p className="text-gray-700 text-lg">
                {t('sessionLimitReached', { minutes: sessionLimitMinutes })}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStop}
                className="flex-1 bg-gray-200 text-gray-900 font-bold py-3 px-6 rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all"
              >
                {t('endSession')}
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold py-3 px-6 rounded-xl hover:from-sky-600 hover:to-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 transition-all shadow-md"
              >
                {t('continueSession')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
