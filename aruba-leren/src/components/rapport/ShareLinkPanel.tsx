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

          {/* WhatsApp + Kopieer knoppen */}
          <div className="flex flex-wrap gap-3 items-start">
            {/* WhatsApp-knop */}
            {(() => {
              const waMessage =
                locale === 'pap'
                  ? `Mira rapport di progreso di ${childName} na ArubaLeren: ${shareUrl}`
                  : `Bekijk het voortgangsrapport van ${childName} via ArubaLeren: ${shareUrl}`;
              const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;
              return (
                <div className="flex flex-col gap-1">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                  >
                    {/* WhatsApp SVG icon */}
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    {locale === 'pap' ? 'Parti via WhatsApp' : 'Deel via WhatsApp'}
                  </a>
                  <p className="text-xs text-gray-400">
                    {locale === 'pap' ? 'Funkshoná mihó riba bo telefòn' : 'Werkt het beste op je telefoon'}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareLinkPanel;
