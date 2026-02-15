'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import QRCode from 'qrcode';

interface PhoneUploadModalProps {
  childId: string;
  sessionId?: string;
  locale: string;
  onImageReceived: (imageData: string) => void;
  onClose: () => void;
}

type ModalState = 'generating' | 'waiting' | 'received' | 'expired' | 'error';

export default function PhoneUploadModal({
  childId,
  sessionId,
  locale,
  onImageReceived,
  onClose,
}: PhoneUploadModalProps) {
  const [state, setState] = useState<ModalState>('generating');
  const [code, setCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [error, setError] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate upload code
  const generateCode = useCallback(async () => {
    setState('generating');
    try {
      const response = await fetch(`/${locale}/api/homework/create-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate code');
      }

      const data = await response.json();
      setCode(data.code);
      setTimeLeft(600);

      // Generate QR code with upload URL
      // In dev (localhost), replace with local network IP so phones on same WiFi can reach it
      let origin = window.location.origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        // Try to get local network IP from a quick API call, fallback to showing manual instructions
        try {
          const ipRes = await fetch(`/${locale}/api/homework/local-ip`);
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData.ip) {
              origin = `http://${ipData.ip}:${window.location.port}`;
            }
          }
        } catch {
          // Ignore — will use localhost (won't work on phone but code entry still works)
        }
      }
      const uploadUrl = `${origin}/${locale}/upload/${data.code}`;
      const dataUrl = await QRCode.toDataURL(uploadUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0c4a6e', // sky-900
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
      setState('waiting');
    } catch (err) {
      console.error('Error generating code:', err);
      setError('Kon geen code aanmaken. Probeer opnieuw.');
      setState('error');
    }
  }, [childId, sessionId, locale]);

  // Poll for uploaded image
  useEffect(() => {
    if (state !== 'waiting' || !code) return;

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/${locale}/api/homework/check/${code}`);
        const data = await response.json();

        if (data.status === 'uploaded' && data.imageData) {
          setState('received');
          // Small delay for the success animation
          setTimeout(() => {
            onImageReceived(data.imageData);
          }, 1500);
        } else if (data.status === 'expired') {
          setState('expired');
        }
      } catch {
        // Silently retry on network errors
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [state, code, locale, onImageReceived]);

  // Countdown timer
  useEffect(() => {
    if (state !== 'waiting') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setState('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Generate code on mount
  useEffect(() => {
    generateCode();
  }, [generateCode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Sluiten"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Generating state */}
        {state === 'generating' && (
          <div className="text-center py-8">
            <div className="animate-bounce text-5xl mb-4">🐵</div>
            <p className="text-lg text-gray-600">Code aanmaken...</p>
          </div>
        )}

        {/* Waiting state — show QR code */}
        {state === 'waiting' && (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold text-sky-800">
              Scan met je telefoon
            </h2>
            <p className="text-gray-600 text-sm">
              Open de camera-app op je telefoon en scan de QR-code
            </p>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-2xl shadow-inner border-2 border-sky-100">
                  <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
                </div>
              </div>
            )}

            {/* Manual code */}
            <div className="bg-sky-50 rounded-xl p-3">
              <p className="text-xs text-sky-600 mb-1">Of typ deze code op je telefoon:</p>
              <p className="font-mono text-3xl font-bold text-sky-800 tracking-[0.3em]">
                {code}
              </p>
              <p className="text-xs text-sky-500 mt-1">
                {window.location.origin}/{locale}/upload/{code}
              </p>
            </div>

            {/* Timer */}
            <div className={`text-sm font-medium ${timeLeft < 60 ? 'text-red-500' : 'text-gray-500'}`}>
              Geldig nog {formatTime(timeLeft)}
            </div>

            {/* Waiting animation */}
            <div className="flex items-center justify-center gap-2 text-sky-600">
              <div className="flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </div>
              <span className="text-sm">Wachten op foto</span>
            </div>
          </div>
        )}

        {/* Received state */}
        {state === 'received' && (
          <div className="text-center py-8 space-y-4">
            <div className="text-6xl">✅</div>
            <h2 className="text-xl font-bold text-green-700">Foto ontvangen!</h2>
            <p className="text-gray-600">De foto wordt nu in het gesprek geplaatst...</p>
          </div>
        )}

        {/* Expired state */}
        {state === 'expired' && (
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl">⏰</div>
            <h2 className="text-xl font-bold text-amber-700">Code verlopen</h2>
            <p className="text-gray-600">De code is verlopen. Maak een nieuwe aan.</p>
            <button
              onClick={generateCode}
              className="bg-sky-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-sky-600 active:scale-95 transition-all"
            >
              Nieuwe code
            </button>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl">😕</div>
            <p className="text-red-600">{error}</p>
            <button
              onClick={generateCode}
              className="bg-sky-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-sky-600 active:scale-95 transition-all"
            >
              Probeer opnieuw
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
