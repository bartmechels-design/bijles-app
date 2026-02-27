/**
 * Arubaanse TTS Substitutie-map
 *
 * Vervangt Arubaanse eigennamen en plaatsnamen door fonetisch equivalente
 * Nederlandse schrijfwijzen die OpenAI TTS (nova stem) correct uitspreekt.
 *
 * Methode: case-insensitive matching, exact word boundary (whole-word).
 * Volgorde is belangrijk: langere/specifiekere namen staan vóór kortere.
 *
 * Hoe uitbreiden:
 * 1. Voeg entry toe aan TTS_SUBSTITUTIONS
 * 2. Test door tekst via TTS af te spelen in de chat
 * 3. Pas fonetische schrijfwijze aan tot uitspraak correct klinkt
 */

export interface TtsSubstitution {
  /** Originele naam zoals in tekst voorkomt */
  original: string;
  /** Fonetische schrijfwijze voor OpenAI TTS (nova, nl-NL) */
  phonetic: string;
}

export const TTS_SUBSTITUTIONS: TtsSubstitution[] = [
  // Plaatsnamen — Aruba
  { original: 'Oranjestad',        phonetic: 'Oranje-stad' },
  { original: 'San Nicolas',       phonetic: 'San Nikolaas' },
  { original: 'Santa Cruz',        phonetic: 'Santa Kroez' },
  { original: 'Noord',             phonetic: 'Nôrd' },
  { original: 'Savaneta',          phonetic: 'Savanetta' },
  { original: 'Pos Chiquito',      phonetic: 'Pos Tsjiekito' },
  { original: 'Paradera',          phonetic: 'Paradéra' },
  { original: 'Babijn',            phonetic: 'Babéin' },
  { original: 'Tanki Leendert',    phonetic: 'Tankie Leendert' },
  { original: 'Mahuma',            phonetic: 'Mahoema' },
  { original: 'Piedra Plat',       phonetic: 'Pjedra Plat' },
  { original: 'Cunucu',            phonetic: 'Koekoe' },

  // Straatnamen en wijken
  { original: 'Wilhelminastraat',  phonetic: 'Wilhelmina-straat' },
  { original: 'Caya Grandi',       phonetic: 'Kaja Grandi' },
  { original: 'Lindberghweg',      phonetic: 'Lindburg-weg' },

  // Historische/culturele namen
  { original: 'Lago',              phonetic: 'Lago' },          // al correct, maar bevestigt uitspraak
  { original: 'Aruba',             phonetic: 'Aroeba' },
  { original: 'Ayo',               phonetic: 'Ajo' },
  { original: 'Arikok',            phonetic: 'Ariekok' },
  { original: 'Kasikero',          phonetic: 'Kasikero' },

  // Papiamentse woorden die in Nederlandse tekst voorkomen
  { original: 'Bon dia',           phonetic: 'Bon dia' },       // al goed
  { original: 'Danki',             phonetic: 'Dankie' },
  { original: 'Pabien',            phonetic: 'Pabien' },
];

/**
 * Pas alle substitities toe op een tekst.
 * Case-insensitive, whole-word matching.
 * Behoudt de originele casing rondom de substitutie niet — vervangt volledig.
 */
export function applyTtsSubstitutions(text: string): string {
  let result = text;

  for (const sub of TTS_SUBSTITUTIONS) {
    // Escape special regex characters in the original name
    const escaped = sub.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word boundary: \b werkt voor ASCII, maar Arubaanse namen beginnen/eindigen op letters
    // Gebruik lookahead/lookbehind voor spatie of begin/einde van string
    const pattern = new RegExp(
      `(?<![\\wÀ-ÿ])${escaped}(?![\\wÀ-ÿ])`,
      'gi'
    );
    result = result.replace(pattern, sub.phonetic);
  }

  return result;
}
