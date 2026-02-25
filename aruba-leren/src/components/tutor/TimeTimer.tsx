'use client';

import { useEffect, useRef } from 'react';

interface TimeTimerProps {
  duration: number;       // Total duration in seconds
  elapsed: number;        // Elapsed seconds (controlled from parent)
  size?: number;          // Pixel size (default: 56)
  showDigits?: boolean;   // Show M:SS inside circle (default: false)
  soundEnabled?: boolean; // Enable completion bell (default: false)
  onComplete?: () => void; // Callback when time expires
}

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~282.74

export default function TimeTimer({
  duration,
  elapsed,
  size = 56,
  showDigits = false,
  soundEnabled = false,
  onComplete,
}: TimeTimerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const bellPlayedRef = useRef(false);

  // Reset bell when duration changes (new timer lifecycle)
  useEffect(() => {
    bellPlayedRef.current = false;
  }, [duration]);

  // Fire bell and onComplete when time expires (only once per lifecycle)
  useEffect(() => {
    if (elapsed >= duration && !bellPlayedRef.current) {
      bellPlayedRef.current = true;
      if (soundEnabled) {
        playBell(); // playBell calls onComplete internally
      } else {
        onComplete?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, duration, soundEnabled]);

  function playBell() {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 523; // C5

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 1.5);

      // Call onComplete after bell starts
      onComplete?.();
    } catch {
      // Autoplay policy or other audio error — silently skip
      onComplete?.();
    }
  }

  // Clamp elapsed to [0, duration] to avoid overflow
  const clampedElapsed = Math.min(Math.max(elapsed, 0), duration);
  const remaining = duration - clampedElapsed;

  // strokeDashoffset grows as elapsed increases: 0 = full arc, circumference = empty
  const strokeDashoffset = CIRCUMFERENCE * (clampedElapsed / Math.max(duration, 1));

  // Warning when less than 20% remaining
  const isWarning = remaining / Math.max(duration, 1) < 0.2;

  // Format remaining time as M:SS
  const formatRemaining = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <style>{`
        @keyframes time-timer-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .time-timer-warning {
          animation: time-timer-pulse 1s ease-in-out infinite;
        }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-label={`Timer: ${formatRemaining(remaining)} remaining`}
      >
        {/* Background circle */}
        <circle
          cx={50}
          cy={50}
          r={RADIUS}
          stroke="#E5E7EB"
          strokeWidth={8}
          fill="none"
        />
        {/* Progress arc — red, shrinks as elapsed grows */}
        <circle
          cx={50}
          cy={50}
          r={RADIUS}
          stroke="#EF4444"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
          className={isWarning ? 'time-timer-warning' : undefined}
          style={{ transition: 'stroke-dashoffset 0.5s linear' }}
        />
        {/* Optional digit display */}
        {showDigits && (
          <text
            x={50}
            y={55}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={18}
            fill="#374151"
            fontWeight="bold"
          >
            {formatRemaining(remaining)}
          </text>
        )}
      </svg>
    </>
  );
}
