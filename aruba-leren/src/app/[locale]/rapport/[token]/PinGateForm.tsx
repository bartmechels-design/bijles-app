'use client';

/**
 * PinGateForm — Client Component
 *
 * Formulier voor PIN-invoer op de publieke rapport-pagina.
 * Submits via GET (geen JavaScript vereist voor basiswerking).
 */

interface PinGateFormProps {
  locale: string;
  token: string;
  hasError: boolean;
}

export function PinGateForm({ locale, token, hasError }: PinGateFormProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <span className="text-4xl">🔒</span>
          <h1 className="text-xl font-bold text-gray-800 mt-3">Rapport beveiligd</h1>
          <p className="text-sm text-gray-500 mt-1">
            Voer de 4-cijferige code in om het rapport te bekijken.
          </p>
        </div>

        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium text-center">
            Onjuiste code. Probeer opnieuw.
          </div>
        )}

        <form action={`/${locale}/rapport/${token}`} method="GET" className="space-y-4">
          <div>
            <label
              htmlFor="pin-input"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Code
            </label>
            <input
              id="pin-input"
              name="pin"
              type="number"
              inputMode="numeric"
              placeholder="bijv. 1234"
              maxLength={4}
              autoFocus
              required
              className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-colors"
          >
            Bekijk rapport
          </button>
        </form>
      </div>
    </div>
  );
}

export default PinGateForm;
