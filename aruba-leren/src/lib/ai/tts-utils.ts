/**
 * TTS Utilities
 *
 * Text preprocessing helpers for Neural TTS playback.
 * Applied before sending text to OpenAI TTS API.
 */

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
 * Apply TTS text cleaning: strip markdown, special tags, emojis.
 * Extracted from ChatInterface.tsx cleanForAutoTts() for reuse across hooks.
 */
export function cleanForTts(text: string): string {
  return text
    .replace(/\[BORD\][\s\S]*?\[\/BORD\]/g, '')           // strip board content
    .replace(/\[SPREEK\][\s\S]*?\[\/SPREEK\]/g, '')        // strip spreek blocks
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
}
