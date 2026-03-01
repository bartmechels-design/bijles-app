'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import katex from 'katex';
import { useTextToSpeech } from '@/hooks/useSpeech';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  locale?: string;
  childAge?: number;
  imageUrl?: string;
  /** True when the parent (ChatInterface) has finished speaking the explanation
   *  and it is now safe to auto-play the first [SPREEK] dictation block. */
  allowDictationAutoPlay?: boolean;
  /** Hide the "Lees voor" button — used for tekst (reading comprehension) where reading aloud defeats the purpose */
  disableReadAloud?: boolean;
  onBoardClick?: (content: string) => void;
  onZinsontledingClick?: (content: string) => void;
}

function getLang(locale?: string) {
  if (locale === 'pap') return 'nl-NL'; // Papiamento fallback to Dutch
  if (locale === 'es') return 'es-ES';
  if (locale === 'en') return 'en-US';
  return 'nl-NL';
}

/** Strip markdown formatting, emojis, and special characters so TTS reads clean text */
function cleanForSpeech(text: string): string {
  return text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')   // **bold**, *italic*, ***both***
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')       // __bold__, _italic_
    .replace(/~~([^~]+)~~/g, '$1')                // ~~strikethrough~~
    .replace(/`([^`]+)`/g, '$1')                  // `code`
    .replace(/^#{1,6}\s+/gm, '')                  // # headings
    .replace(/^[-*+]\s+/gm, '')                   // - bullet points
    .replace(/^\d+\.\s+/gm, '')                   // 1. numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // [links](url)
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '') // strip emojis
    .replace(/[*_~`^#>|]/g, '')                    // remaining special chars
    .replace(/["„"«»]/g, '')                       // strip quotation marks (OpenAI TTS handles them oddly)
    .replace(/\n{2,}/g, '. ')                      // double newlines → sentence break
    .replace(/\s{2,}/g, ' ')                       // collapse whitespace
    .trim();
}

/** Regex to find [SPREEK]...[/SPREEK] blocks in Koko's messages */
const SPREEK_REGEX = /\[SPREEK\]([\s\S]*?)\[\/SPREEK\]/g;

/** Regex to find [BORD]...[/BORD] blocks */
const BORD_REGEX = /\[BORD\]([\s\S]*?)\[\/BORD\]/g;

/** Regex to find [OPDRACHT]...[/OPDRACHT] blocks */
const OPDRACHT_REGEX = /\[OPDRACHT\]([\s\S]*?)\[\/OPDRACHT\]/g;

/**
 * Parse message content into segments:
 * - text segments (visible)
 * - spoken segments (hidden, played via TTS)
 * - board segments (shown on whiteboard)
 * - opdracht segments (exercise cards, collected for werkblad)
 */
interface TextSegment { type: 'text'; content: string }
interface SpokenSegment { type: 'spoken'; content: string; index: number }
interface BoardSegment { type: 'board'; content: string; index: number }
interface OpdrachtSegment { type: 'opdracht'; content: string; index: number }
interface ZinsontledingSegment { type: 'zinsontleding'; content: string; index: number }
/** [NL] blocks: Dutch word references — shown as text, never spoken by the instructietaal TTS */
interface NlWordSegment { type: 'nl-word'; content: string }
type Segment = TextSegment | SpokenSegment | BoardSegment | OpdrachtSegment | ZinsontledingSegment | NlWordSegment;

/** Check if content contains [BORD] blocks */
export function hasBordBlocks(content: string): boolean {
  BORD_REGEX.lastIndex = 0;
  return BORD_REGEX.test(content);
}

/** Extract [BORD] content from a message */
export function extractBordContent(content: string): string | null {
  BORD_REGEX.lastIndex = 0;
  const match = BORD_REGEX.exec(content);
  return match ? match[1].trim() : null;
}

/** Check if content contains [OPDRACHT] blocks */
export function hasOpdrachtBlocks(content: string): boolean {
  return /\[OPDRACHT\][\s\S]*?\[\/OPDRACHT\]/.test(content);
}

/** Check if content contains [ZINSONTLEDING] blocks */
export function hasZinsontledingBlocks(content: string): boolean {
  return /\[ZINSONTLEDING\][\s\S]*?\[\/ZINSONTLEDING\]/.test(content);
}

/** Extract [ZINSONTLEDING] content from a message */
export function extractZinsontledingContent(content: string): string | null {
  const match = /\[ZINSONTLEDING\]([\s\S]*?)\[\/ZINSONTLEDING\]/.exec(content);
  return match ? match[1].trim() : null;
}

/** Extract all [OPDRACHT] block contents from a message */
export function extractOpdrachtBlocks(content: string): string[] {
  const regex = /\[OPDRACHT\]([\s\S]*?)\[\/OPDRACHT\]/g;
  const blocks: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

// --- KaTeX math rendering ---

/** Detecteer of een string LaTeX-tokens bevat */
function containsMath(text: string): boolean {
  return /\\frac|\\times|\\div|\\sqrt|\\cdot|\^{|_{/.test(text)
}

/**
 * Render een tekstregel met KaTeX als die LaTeX-tokens bevat.
 * Veilig: throwOnError: false + try/catch vangt alle parse-fouten op.
 */
function renderMathLine(text: string, className?: string): React.ReactElement {
  if (!containsMath(text)) {
    return <span className={className}>{text}</span>
  }
  try {
    const html = katex.renderToString(text, {
      throwOnError: false,
      displayMode: false,
      output: 'html',
      trust: false,
    })
    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  } catch {
    // Fallback: toon plain text als KaTeX toch faalt
    return <span className={className}>{text}</span>
  }
}

function parseSegments(content: string): Segment[] {
  // Combine all tag types into a unified parsing pass
  const TAG_REGEX = /\[(SPREEK|BORD|OPDRACHT|ZINSONTLEDING|NL)\]([\s\S]*?)\[\/\1\]/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let spokenIndex = 0;
  let boardIndex = 0;
  let match;

  TAG_REGEX.lastIndex = 0;

  while ((match = TAG_REGEX.exec(content)) !== null) {
    // Text before this block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text.trim()) segments.push({ type: 'text', content: text });
    }

    if (match[1] === 'SPREEK') {
      segments.push({ type: 'spoken', content: match[2].trim(), index: spokenIndex++ });
    } else if (match[1] === 'BORD') {
      segments.push({ type: 'board', content: match[2].trim(), index: boardIndex++ });
    } else if (match[1] === 'OPDRACHT') {
      segments.push({ type: 'opdracht', content: match[2].trim(), index: boardIndex++ });
    } else if (match[1] === 'ZINSONTLEDING') {
      segments.push({ type: 'zinsontleding', content: match[2].trim(), index: boardIndex++ });
    } else if (match[1] === 'NL') {
      segments.push({ type: 'nl-word', content: match[2].trim() });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text.trim()) segments.push({ type: 'text', content: text });
  }

  return segments;
}

/**
 * Render a plain text segment with basic markdown:
 * **bold**, *italic*, numbered lists, bullet lists, line breaks.
 */
function renderMarkdown(text: string): React.ReactNode {
  // Split into lines for list detection
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const inlineFormat = (line: string, key: string | number): React.ReactNode => {
    // Process **bold** and *italic* inline
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <span key={key}>
        {parts.map((part, pi) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pi}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return <em key={pi}>{part.slice(1, -1)}</em>;
          }
          return part;
        })}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^\d+\.\s/, ''), i)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1 my-1">{items}</ol>);
      continue;
    }

    // Bullet list
    if (/^[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^[-*]\s/, ''), i)}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 my-1">{items}</ul>);
      continue;
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      nodes.push(<br key={`br-${i}`} />);
      i++;
      continue;
    }

    // Regular line
    nodes.push(<span key={i}>{inlineFormat(line, i)}{i < lines.length - 1 ? <br /> : null}</span>);
    i++;
  }

  return <>{nodes}</>;
}

/** Check if content contains any [SPREEK] blocks */
function hasSpeekBlocks(content: string): boolean {
  SPREEK_REGEX.lastIndex = 0;
  return SPREEK_REGEX.test(content);
}

/** Speed for dictation based on child age — younger = slower */
function dictationSpeed(childAge?: number): number {
  if (!childAge || childAge <= 7) return 0.65;  // klas 1-2: very slow
  if (childAge <= 9) return 0.70;                // klas 3-4: slow
  return 0.75;                                   // klas 5-6: moderate
}

/**
 * Inline play button for a spoken segment (dictation / read-aloud).
 * Plays the word TWICE with a 2-second pause in between — like a real dictation teacher.
 * Uses the browser's built-in SpeechSynthesis API with nl-NL voice for correct Dutch pronunciation.
 * OpenAI TTS has an English accent on Dutch words — browser voices are native Dutch.
 */
function SpokenBlock({ text, autoPlay, childAge }: { text: string; locale?: string; autoPlay?: boolean; childAge?: number }) {
  const [played, setPlayed] = useState(false);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const autoPlayedRef = useRef(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const clean = cleanForSpeech(text);
  const speed = dictationSpeed(childAge);

  /** Speak once using browser SpeechSynthesis — native Dutch pronunciation, instant, no API cost */
  const speakOnce = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (stoppedRef.current || typeof window === 'undefined') { resolve(); return; }

      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = 'nl-NL';
      utter.rate = speed;  // 0.65–0.75 depending on child age

      // Pick the best Dutch voice available on this device
      const voices = window.speechSynthesis.getVoices();
      const nlVoice = voices.find(v => v.lang === 'nl-NL') ?? voices.find(v => v.lang.startsWith('nl'));
      if (nlVoice) utter.voice = nlVoice;

      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    });
  }, [clean, speed]);

  const playSequence = useCallback(async () => {
    stoppedRef.current = false;
    setIsSequencePlaying(true);
    setPlayed(true);

    await speakOnce();
    if (stoppedRef.current) { setIsSequencePlaying(false); return; }

    // Wait 2 seconds, then repeat — same as a real dictation teacher
    pauseTimerRef.current = setTimeout(async () => {
      if (stoppedRef.current) { setIsSequencePlaying(false); return; }
      await speakOnce();
      setIsSequencePlaying(false);
    }, 2000);
  }, [speakOnce]);

  const stopSequence = useCallback(() => {
    stoppedRef.current = true;
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    setIsSequencePlaying(false);
  }, []);

  const handlePlay = useCallback(() => {
    if (isSequencePlaying) {
      stopSequence();
    } else {
      playSequence();
    }
  }, [isSequencePlaying, stopSequence, playSequence]);

  // Auto-play on mount for dictation (only once)
  useEffect(() => {
    if (autoPlay && !autoPlayedRef.current) {
      autoPlayedRef.current = true;
      playSequence();
    }
  }, [autoPlay, playSequence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const showStopping = isSequencePlaying;

  return (
    <span className="inline-flex items-center gap-1.5 my-1">
      <button
        onClick={handlePlay}
        className={`inline-flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-full transition-all ${
          showStopping
            ? 'bg-sky-500 text-white animate-pulse'
            : played
              ? 'bg-sky-200 text-sky-700 hover:bg-sky-300'
              : 'bg-amber-400 text-white hover:bg-amber-500 shadow-md'
        }`}
      >
        {showStopping ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            <span className="text-sm">Stop</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
            <span className="text-sm">{played ? 'Nog een keer' : 'Luister'}</span>
          </>
        )}
      </button>
    </span>
  );
}

export default function ChatMessage({ role, content, isStreaming = false, locale, childAge, imageUrl, allowDictationAutoPlay, disableReadAloud, onBoardClick, onZinsontledingClick }: ChatMessageProps) {
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const { speak, stop, isSpeaking } = useTextToSpeech();

  useEffect(() => {
    setShouldAnimate(true);
    const timer = setTimeout(() => setShouldAnimate(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      // For full message read-aloud, strip [SPREEK] blocks entirely.
      // Dutch dictation words are played by SpokenBlock (nl-NL voice) — not here.
      const fullText = content.replace(/\[SPREEK\][\s\S]*?\[\/SPREEK\]/g, '');
      speak(cleanForSpeech(fullText), getLang(locale));
    }
  };

  const hasSpecialBlocks = !isStreaming && (
    hasSpeekBlocks(content) ||
    hasBordBlocks(content) ||
    hasOpdrachtBlocks(content) ||
    hasZinsontledingBlocks(content) ||
    /\[NL\]/.test(content)
  );

  if (role === 'assistant') {
    return (
      <div
        className={`flex items-start gap-3 ${shouldAnimate ? 'animate-fade-in' : ''}`}
      >
        <div className="bg-sky-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🐵</span>
        </div>
        <div className="bg-sky-100 text-sky-900 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[80%] shadow-sm">
          {/* Render with or without special blocks */}
          {hasSpecialBlocks ? (
            <div className="text-lg">
              {parseSegments(content).map((segment, i) =>
                segment.type === 'text' ? (
                  <span key={i} className="whitespace-pre-wrap">{segment.content}</span>
                ) : segment.type === 'spoken' ? (
                  <SpokenBlock
                    key={`spoken-${segment.index}`}
                    text={segment.content}
                    locale={locale}
                    childAge={childAge}
                    autoPlay={segment.index === 0 && !!allowDictationAutoPlay}
                  />
                ) : segment.type === 'board' ? (
                  <button
                    key={`board-${segment.index}`}
                    type="button"
                    onClick={() => onBoardClick?.(segment.content)}
                    className="inline-flex items-center gap-1.5 my-1"
                  >
                    <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-indigo-200 transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                      </svg>
                      Bekijk op schoolbord
                    </span>
                  </button>
                ) : segment.type === 'opdracht' ? (
                  <div key={`opdracht-${segment.index}`} className="my-3 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2 mb-2 text-amber-700 font-semibold text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Opdracht
                    </div>
                    <div className="text-base">
                      {segment.content.split('\n').map((line, li) => (
                        <div key={li}>
                          {renderMathLine(line, 'whitespace-pre-wrap')}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : segment.type === 'zinsontleding' ? (
                  <button
                    key={`zinsontleding-${segment.index}`}
                    type="button"
                    onClick={() => onZinsontledingClick?.(segment.content)}
                    className="inline-flex items-center gap-1.5 my-1"
                  >
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-green-200 transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.143 2.94 2.736 3.15a48.054 48.054 0 00.784.057A3.375 3.375 0 006.375 18H5.25A2.25 2.25 0 013 15.75V8.25A2.25 2.25 0 015.25 6H18A2.25 2.25 0 0120.25 8.25v7.5A2.25 2.25 0 0118 18h-1.125a3.375 3.375 0 01-.784-.057 48.054 48.054 0 00-.784-.057A3.375 3.375 0 0113.5 18h-1.125c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V18" />
                      </svg>
                      Zinsontleding bekijken
                    </span>
                  </button>
                ) : segment.type === 'nl-word' ? (
                  // [NL] block: Dutch word reference — visible as text, skipped by instructietaal TTS
                  <strong key={`nl-${i}`} className="font-semibold">{segment.content}</strong>
                ) : null
              )}
            </div>
          ) : (
            <div className="text-lg">
              {isStreaming ? (
                <span className="whitespace-pre-wrap">
                  {content}
                  <span className="inline-block w-2 h-5 bg-sky-600 ml-1 animate-pulse"></span>
                </span>
              ) : (
                renderMarkdown(content)
              )}
            </div>
          )}
          {/* Speak button — hidden while streaming, and for subjects where reading aloud defeats the purpose */}
          {!isStreaming && content && !disableReadAloud && (
            <button
              onClick={handleSpeak}
              className={`mt-2 inline-flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-lg transition-all ${
                isSpeaking
                  ? 'bg-sky-500 text-white'
                  : 'text-sky-600 hover:bg-sky-200'
              }`}
              aria-label={isSpeaking ? 'Stop voorlezen' : 'Voorlezen'}
            >
              {isSpeaking ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              )}
              <span>{isSpeaking ? 'Stop' : 'Lees voor'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 justify-end ${shouldAnimate ? 'animate-fade-in' : ''}`}
    >
      <div className="bg-amber-500 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] shadow-sm">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Huiswerk"
            className="rounded-lg mb-2 max-w-full max-h-64 object-contain border-2 border-amber-300"
          />
        )}
        <p className="text-lg whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </div>
  );
}
