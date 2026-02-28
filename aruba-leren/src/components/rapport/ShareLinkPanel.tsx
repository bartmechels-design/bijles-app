'use client';

/**
 * ShareLinkPanel — Client Component
 *
 * UI-paneel voor het genereren en delen van een deelbare rapport-link.
 * Gebruikt door: geauthenticeerde rapportpagina (/dashboard/kind/[childId]/rapport)
 */

import { useState } from 'react';

// ============================================
// Props
// ============================================

interface ShareLinkPanelProps {
  childId: string;
  childName: string;
  locale: string;
  existingToken?: { token: string; expiresAt: string } | null;
}

// ============================================
// Helpers
// ============================================

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================
// Component
// ============================================

export function ShareLinkPanel({
  childId,
  childName,
  locale,
  existingToken = null,
}: ShareLinkPanelProps) {
  const [token, setToken] = useState<string | null>(existingToken?.token ?? null);
  const [expiresAt, setExpiresAt] = useState<string | null>(existingToken?.expiresAt ?? null);
  const [shareUrl, setShareUrl] = useState<string | null>(
    existingToken
      ? (() => {
          const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
          return `${appUrl}/${locale}/rapport/${existingToken.token}`;
        })()
      : null
  );
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ============================================
  // Handlers
  // ============================================

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    if (val.length > 0 && val.length !== 4) {
      setPinError('Code moet exact 4 cijfers zijn');
    } else {
      setPinError('');
    }
  }

  async function handleGenerate() {
    // Valideer PIN voor generatie
    if (pin.length > 0 && pin.length !== 4) {
      setPinError('Code moet exact 4 cijfers zijn');
      return;
    }

    setGenerating(true);
    setApiError(null);

    try {
      const response = await fetch(`/${locale}/api/rapport/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          locale,
          pin: pin.length === 4 ? pin : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? 'Er is een fout opgetreden');
        return;
      }

      setToken(data.token);
      setExpiresAt(data.expiresAt);
      setShareUrl(data.shareUrl);
    } catch {
      setApiError('Kan geen verbinding maken met de server');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API niet beschikbaar — fallback: selecteer de tekst
    }
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-sky-100 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔗</span>
        <h2 className="text-xl font-bold text-gray-800">Rapport delen</h2>
      </div>

      <p className="text-sm text-gray-500">
        Genereer een deelbare link voor het rapport van{' '}
        <span className="font-semibold text-gray-700">{childName}</span>. De link is 30 dagen
        geldig zonder account.
      </p>

      {/* PIN-sectie */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
        <label
          htmlFor="share-pin"
          className="block text-sm font-semibold text-amber-800"
        >
          Beveilig met code (optioneel)
        </label>
        <input
          id="share-pin"
          type="number"
          inputMode="numeric"
          placeholder="bijv. 1234"
          value={pin}
          onChange={handlePinChange}
          maxLength={4}
          className="w-full sm:w-32 px-3 py-2 border-2 border-amber-300 rounded-lg text-gray-800 text-center text-lg font-mono focus:outline-none focus:border-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {pinError && (
          <p className="text-xs text-red-600 font-medium">{pinError}</p>
        )}
        <p className="text-xs text-amber-700">
          Ontvanger moet deze 4-cijferige code invoeren om het rapport te zien.
        </p>
      </div>

      {/* Genereer-knop */}
      <button
        onClick={handleGenerate}
        disabled={generating || (pin.length > 0 && pin.length !== 4)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
      >
        {generating ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            <span>Genereren...</span>
          </>
        ) : (
          <>
            <span>🔗</span>
            <span>{token ? 'Nieuwe link genereren' : 'Link genereren'}</span>
          </>
        )}
      </button>

      {/* API fout */}
      {apiError && (
        <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </p>
      )}

      {/* Gedeelde link weergave */}
      {token && shareUrl && expiresAt && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700">Deelbare link:</p>

          {/* URL + Kopieer-knop */}
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50 focus:outline-none truncate"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors whitespace-nowrap ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 hover:bg-green-200 text-green-800 border-2 border-green-300'
              }`}
            >
              {copied ? 'Gekopieerd!' : 'Kopieer'}
            </button>
          </div>

          {/* Vervaldatum */}
          <p className="text-xs text-gray-400">
            Link geldig tot {formatDate(expiresAt)}
          </p>

          {/* WhatsApp-knop wordt toegevoegd in plan 11-04 */}
        </div>
      )}
    </div>
  );
}

export default ShareLinkPanel;
