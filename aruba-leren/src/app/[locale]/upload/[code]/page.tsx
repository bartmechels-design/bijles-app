'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';

/**
 * Minimal phone upload page.
 * No authentication required — access is via upload code.
 * Child scans QR code on PC → opens this page → takes photo → done.
 */

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB

type UploadState = 'ready' | 'preview' | 'uploading' | 'success' | 'error';

export default function PhoneUploadPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const locale = params.locale as string;

  const [state, setState] = useState<UploadState>('ready');
  const [imageData, setImageData] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Alleen foto\'s zijn toegestaan');
      setState('error');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage('Foto is te groot (max 4MB). Probeer een kleinere foto.');
      setState('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
      setState('preview');
      setErrorMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!imageData || !code) return;

    setState('uploading');

    try {
      const response = await fetch(`/${locale}/api/homework/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, imageData }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Upload mislukt');
        setState('error');
        return;
      }

      setState('success');
    } catch {
      setErrorMessage('Geen internetverbinding. Probeer opnieuw.');
      setState('error');
    }
  };

  const handleRetry = () => {
    setImageData(null);
    setErrorMessage('');
    setState('ready');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-amber-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Koko header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🐵</div>
          <h1 className="text-2xl font-bold text-sky-800">Koko</h1>
          <p className="text-gray-600 mt-1">Huiswerk uploaden</p>
          <div className="mt-2 bg-white rounded-lg px-4 py-2 inline-block shadow-sm">
            <span className="text-sm text-gray-500">Code: </span>
            <span className="font-mono font-bold text-lg text-sky-700 tracking-wider">{code}</span>
          </div>
        </div>

        {/* Ready state — show camera button */}
        {state === 'ready' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-white font-bold py-6 px-8 rounded-2xl shadow-lg hover:from-amber-500 hover:to-amber-600 active:scale-95 transition-all flex flex-col items-center gap-3"
            >
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <span className="text-xl">Maak een foto</span>
            </button>

            {/* Option to pick from gallery */}
            <button
              onClick={() => {
                // Create a new input without capture to show gallery
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) processFile(file);
                };
                input.click();
              }}
              className="w-full bg-white text-sky-700 font-semibold py-4 px-6 rounded-2xl shadow-md border-2 border-sky-200 hover:bg-sky-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span>Kies uit galerij</span>
            </button>
          </div>
        )}

        {/* Preview state — show image and send button */}
        {state === 'preview' && imageData && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-3 shadow-lg">
              <img
                src={imageData}
                alt="Huiswerk preview"
                className="w-full rounded-xl max-h-80 object-contain"
              />
            </div>

            <button
              onClick={handleUpload}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-5 px-8 rounded-2xl shadow-lg hover:from-green-600 hover:to-green-700 active:scale-95 transition-all flex items-center justify-center gap-3 text-xl"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Verstuur naar computer
            </button>

            <button
              onClick={handleRetry}
              className="w-full text-gray-500 font-medium py-3 hover:text-gray-700 transition-colors"
            >
              Andere foto kiezen
            </button>
          </div>
        )}

        {/* Uploading state */}
        {state === 'uploading' && (
          <div className="text-center space-y-4">
            <div className="animate-bounce text-6xl">🐵</div>
            <p className="text-xl font-semibold text-sky-800">Bezig met versturen...</p>
            <div className="w-full bg-sky-100 rounded-full h-2">
              <div className="bg-sky-500 h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}

        {/* Success state */}
        {state === 'success' && (
          <div className="text-center space-y-4">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-bold text-green-700">Gelukt!</h2>
            <p className="text-lg text-gray-600">
              Je foto staat nu op de computer. Je kunt deze pagina sluiten.
            </p>
            <div className="bg-green-50 rounded-2xl p-4 border-2 border-green-200">
              <p className="text-green-700 font-medium">
                🐵 Koko bekijkt je huiswerk!
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="text-center space-y-4">
            <div className="text-6xl">😕</div>
            <h2 className="text-xl font-bold text-red-700">Oeps!</h2>
            <p className="text-lg text-red-600">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="w-full bg-sky-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:bg-sky-600 active:scale-95 transition-all"
            >
              Probeer opnieuw
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
