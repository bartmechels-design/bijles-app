'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SESSION_DURATION_BY_AGE } from '@/types/tutoring';
import { useRouter } from 'next/navigation';
import TimeTimer from './TimeTimer';

interface SessionTimerProps {
  childAge: number;
}

export default function SessionTimer({ childAge }: SessionTimerProps) {
  const t = useTranslations('tutor');
  const router = useRouter();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [extraMinutes, setExtraMinutes] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Get age-appropriate session duration limit (in minutes)
  const getSessionLimit = (age: number): number => {
    // Handle ages outside the defined range
    if (age < 6) return SESSION_DURATION_BY_AGE[6];
    if (age > 12) return SESSION_DURATION_BY_AGE[12];
    return SESSION_DURATION_BY_AGE[age] || SESSION_DURATION_BY_AGE[10]; // Default to age 10 if not found
  };

  const sessionLimitMinutes = getSessionLimit(childAge) + extraMinutes;
  const totalDurationSeconds = sessionLimitMinutes * 60;

  // Wall-clock based timer — no drift
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
    }, 500); // Check twice per second for responsiveness

    return () => clearInterval(interval);
  }, []);

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
      <div className="flex items-center gap-2">
        <TimeTimer
          duration={totalDurationSeconds}
          elapsed={elapsedSeconds}
          size={40}
          onComplete={() => setShowWarning(true)}
        />
        <span className="text-xs font-semibold text-gray-500">
          {t('sessionTimer')}
        </span>
        {Math.floor(elapsedSeconds / 60) >= sessionLimitMinutes - 2 && (
          <span className="text-amber-600 text-xs font-semibold animate-pulse">
            ({sessionLimitMinutes} min)
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
