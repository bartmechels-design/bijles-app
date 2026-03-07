/**
 * TTS Utilities
 *
 * Text preprocessing helpers for Neural TTS playback.
 * Applied before sending text to OpenAI TTS API.
 */

import { applyTtsSubstitutions } from './tts-substitutions';

export interface TtsSegment {
  text: string;
  /** Pause in milliseconds AFTER this segment plays */
  pauseAfter: number;
}

/**
 * Split text into segments with appropriate pause timings.
 *
 * Rules:
 * - Split on sentence boundaries (. ! ?) → 600ms pause after
 * - Split on clause boundaries (, ; :) → 300ms pause after
 * - Ignore punctuation inside numbers (3.14, 1,000)
 * - Ignore ellipsis (...) — treat as single pause of 600ms
 * - Empty segments are filtered out
 *
 * The last segment always has pauseAfter = 0.
 */
export function splitIntoSegments(text: string): TtsSegment[] {
  if (!text.trim()) return [];

  // Replace ellipsis with a single pause marker before splitting
  const normalized = text.replace(/\.{3}/g, '…');

  // Split on sentence-ending punctuation, keeping the delimiter
  // Pattern: split after . ! ? … but NOT when followed by a digit (3.14)
  const segments: TtsSegment[] = [];

  // Tokenize: find all boundary positions
  // We walk character by character to handle edge cases
  let current = '';
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i];
    const nextChar = normalized[i + 1] ?? '';
    const prevChar = normalized[i - 1] ?? '';

    // Sentence boundary: . ! ? …
    if (char === '.' || char === '!' || char === '?' || char === '…') {
      // Skip if . is between digits (decimal number: 3.14)
      const prevIsDigit = /\d/.test(prevChar);
      const nextIsDigit = /\d/.test(nextChar);
      if (char === '.' && prevIsDigit && nextIsDigit) {
        current += char;
        i++;
        continue;
      }

      current += char;
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        segments.push({ text: trimmed, pauseAfter: 600 });
      }
      current = '';
      i++;
      continue;
    }

    // Clause boundary: , ; :
    if (char === ',' || char === ';' || char === ':') {
      // Skip if , is between digits (thousand separator: 1,000)
      const prevIsDigit = /\d/.test(prevChar);
      const nextIsDigit = /\d/.test(nextChar);
      if (char === ',' && prevIsDigit && nextIsDigit) {
        current += char;
        i++;
        continue;
      }

      current += char;
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        segments.push({ text: trimmed, pauseAfter: 300 });
      }
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Handle remaining text without trailing punctuation
  const remaining = current.trim();
  if (remaining.length > 0) {
    segments.push({ text: remaining, pauseAfter: 0 });
  }

  // Last segment never has a pause
  if (segments.length > 0) {
    segments[segments.length - 1].pauseAfter = 0;
  }

  return segments.filter(s => s.text.length > 0);
}

/**
 * Convert math notation to spoken words in the given locale.
 * Prevents OpenAI TTS from reading symbols in English regardless of language.
 *
 * Examples (nl): "2 × 3 = 6" → "2 keer 3 is 6", "1/2" → "een half"
 */
function preprocessMathForTts(text: string, locale: string): string {
  const nl = locale === 'nl' || locale === 'pap';
  const es = locale === 'es';

  const times    = nl ? 'keer'          : es ? 'por'           : 'times';
  const divided  = nl ? 'gedeeld door'  : es ? 'dividido por'  : 'divided by';
  const plus     = nl ? 'plus'          : es ? 'más'           : 'plus';
  const minus    = nl ? 'min'           : es ? 'menos'         : 'minus';
  const equals   = nl ? 'is'            : es ? 'es'            : 'equals';

  let r = text;

  // Common fractions → words (before generic fraction rule)
  if (nl) {
    r = r
      .replace(/\b1\/2\b/g, 'een half')
      .replace(/\b1\/3\b/g, 'een derde')
      .replace(/\b2\/3\b/g, 'twee derde')
      .replace(/\b1\/4\b/g, 'een kwart')
      .replace(/\b3\/4\b/g, 'drie kwart')
      .replace(/\b1\/5\b/g, 'een vijfde')
      .replace(/\b2\/5\b/g, 'twee vijfde')
      .replace(/\b3\/5\b/g, 'drie vijfde')
      .replace(/\b4\/5\b/g, 'vier vijfde');
  } else if (es) {
    r = r
      .replace(/\b1\/2\b/g, 'la mitad')
      .replace(/\b1\/4\b/g, 'un cuarto')
      .replace(/\b3\/4\b/g, 'tres cuartos');
  } else {
    r = r
      .replace(/\b1\/2\b/g, 'one half')
      .replace(/\b1\/4\b/g, 'one quarter')
      .replace(/\b3\/4\b/g, 'three quarters');
  }

  // General fractions: 3/8 → "3 gedeeld door 8"
  r = r.replace(/(\d+)\/(\d+)/g, `$1 ${divided} $2`);

  // Math operators (Unicode symbols)
  r = r
    .replace(/[×✕]/g, ` ${times} `)
    .replace(/[÷]/g, ` ${divided} `)
    // = not preceded by < > ! and not followed by =
    .replace(/(?<![<>!=])=(?!=)/g, ` ${equals} `);

  // Operators between numbers (ASCII)
  r = r
    .replace(/(\d)\s*\+\s*(\d)/g, `$1 ${plus} $2`)
    .replace(/(\d)\s*-\s*(\d)/g, `$1 ${minus} $2`)
    // 'x' as multiply between digits: "2x3" or "2 x 3"
    .replace(/(\d)\s*[xX]\s*(\d)/g, `$1 ${times} $2`);

  return r.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Apply TTS text cleaning: strip markdown, special tags, emojis, math notation.
 * Extracted from ChatInterface.tsx cleanForAutoTts() for reuse across hooks.
 *
 * Pass locale so math operators are spoken in the correct language.
 */
export function cleanForTts(text: string, locale: string = 'nl'): string {
  const cleaned = text
    .replace(/\[BORD\][\s\S]*?\[\/BORD\]/g, '')           // strip board content
    .replace(/\[SPREEK\][\s\S]*?\[\/SPREEK\]/g, '')        // strip spreek blocks (dictation)
    .replace(/\[NL\][\s\S]*?\[\/NL\]/g, '')                // strip Dutch word refs (visible in chat, not spoken)
    .replace(/\[ZINSONTLEDING\][\s\S]*?\[\/ZINSONTLEDING\]/g, '') // strip zinsontleding JSON
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')               // bold/italic
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')                 // underline bold/italic
    .replace(/`([^`]+)`/g, '$1')                           // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')               // links
    .replace(/^#{1,6}\s+/gm, '')                           // headings
    .replace(/^[-*+]\s+/gm, '')                            // bullet points
    .replace(/^\d+\.\s+/gm, '')                            // numbered lists
    // strip emojis
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    .replace(/[*_~`^#>|]/g, '')                            // remaining markdown chars
    .replace(/\s{2,}/g, ' ')                               // collapse whitespace
    .trim();

  // Apply math preprocessing (locale-aware) before name substitutions
  const mathProcessed = preprocessMathForTts(cleaned, locale);

  // Apply Arubaanse name substitutions last
  return applyTtsSubstitutions(mathProcessed);
}
