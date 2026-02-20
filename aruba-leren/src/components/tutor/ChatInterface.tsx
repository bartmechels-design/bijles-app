'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Subject } from '@/types/tutoring';
import ChatMessage from './ChatMessage';
import { hasBordBlocks, extractBordContent } from './ChatMessage';
import SessionTimer from './SessionTimer';
import PhoneUploadModal from './PhoneUploadModal';
import WhiteboardPanel from './WhiteboardPanel';
import KokoAvatar from './KokoAvatar';
import VoiceWaveform from './VoiceWaveform';
import HiatenSelector from './HiatenSelector';
import WerkbladPrint from './WerkbladPrint';
import { useSpeechToText, useTextToSpeech } from '@/hooks/useSpeech';
import { useKokoState } from '@/hooks/useKokoState';
import { useVoiceFirstMode } from '@/hooks/useVoiceFirstMode';
import { HIAAT_TOPICS } from '@/lib/ai/prompts/hiaten-prompts';

// Message type — supports text and optional image
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string; // base64 data URL for uploaded images
}

interface ChatInterfaceProps {
  childId: string;
  childAge: number;
  childName: string;
  subject: Subject;
  locale: string;
  existingSessionId: string | null;
  subjectLabel: string;
  /** When 'assessment', shows the beginsituatietoets banner and completion UI */
  sessionType?: 'assessment' | 'tutoring';
  /** Pre-selected hiaat topic id from ?hiaat= URL param */
  initialHiaat?: string;
}

function getSttLang(locale: string) {
  if (locale === 'pap') return 'nl-NL';
  if (locale === 'es') return 'es-ES';
  if (locale === 'en') return 'en-US';
  return 'nl-NL';
}

function getTtsLang(locale: string) {
  if (locale === 'pap') return 'nl-NL';
  if (locale === 'es') return 'es-ES';
  if (locale === 'en') return 'en-US';
  return 'nl-NL';
}

function hasSpeekBlocks(text: string) {
  return /\[SPREEK\]/.test(text);
}

function cleanForAutoTts(text: string) {
  return text
    .replace(/\[BORD\][\s\S]*?\[\/BORD\]/g, '') // strip board content
    .replace(/\[SPREEK\][\s\S]*?\[\/SPREEK\]/g, '') // strip spreek blocks
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1') // bold/italic
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1') // underline bold/italic
    .replace(/`([^`]+)`/g, '$1') // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/^[-*+]\s+/gm, '') // bullet points
    .replace(/^\d+\.\s+/gm, '') // numbered lists
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '') // strip emojis
    .replace(/[*_~`^#>|]/g, '') // remaining markdown chars
    .replace(/\s{2,}/g, ' ') // collapse whitespace
    .trim();
}

// Max file size: 4MB (Claude vision limit is ~5MB)
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

// Regex for the assessment completion signal emitted by Koko
const ASSESSMENT_DONE_REGEX = /\[ASSESSMENT_DONE:level=([1-5])\]/;

/** Strip [ASSESSMENT_DONE:level=X] from visible message text */
function stripAssessmentSignal(text: string): string {
  return text.replace(ASSESSMENT_DONE_REGEX, '').trim();
}

export default function ChatInterface({
  childId,
  childAge,
  childName,
  subject,
  locale,
  existingSessionId,
  subjectLabel,
  sessionType = 'tutoring',
  initialHiaat,
}: ChatInterfaceProps) {
  const t = useTranslations('tutor');
  const router = useRouter();
  const isAssessmentMode = sessionType === 'assessment';
  const [currentSessionId, setCurrentSessionId] = useState(existingSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [hiatenTopicId, setHiatenTopicId] = useState<string | null>(initialHiaat || null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [huiswerkMode, setHuiswerkMode] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showPhoneUpload, setShowPhoneUpload] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [boardContent, setBoardContent] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Speech hooks
  const { startListening, stopListening, isListening, transcript, isSupported: sttSupported } =
    useSpeechToText(getSttLang(locale));
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  // Koko avatar state
  const { emotion, deriveEmotion, setEmotion } = useKokoState();

  // Voice-first mode — disabled for begrijpend_lezen (reading comprehension requires reading, not listening)
  const { isVoiceFirst: isVoiceFirstRaw, setVoiceFirst } = useVoiceFirstMode();
  const isVoiceFirst = subject === 'begrijpend_lezen' ? false : isVoiceFirstRaw;

  // Track last completed assistant message for auto-TTS
  const lastCompletedRef = useRef<string | null>(null);

  // Derive Koko emotion from current state
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    deriveEmotion({
      isLoading,
      isListening,
      isSpeaking,
      lastAssistantMessage: lastAssistant?.content,
    });
  }, [isLoading, isListening, isSpeaking, messages, deriveEmotion]);

  // When transcript changes, update input field
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Initialize with greeting if no existing session
  useEffect(() => {
    if (!existingSessionId) {
      setMessages([{
        id: 'koko-greeting',
        role: 'assistant',
        content: t('kokoGreeting', { childName, subject: subjectLabel }),
      }]);
    }
  }, [existingSessionId, childName, subjectLabel, t]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-send first message when huiswerk mode activates with a pending image
  useEffect(() => {
    if (huiswerkMode && pendingImage && !sessionStarted && !isLoading) {
      const timer = setTimeout(() => {
        handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [huiswerkMode, pendingImage]); // eslint-disable-line react-hooks/exhaustive-deps

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Alleen afbeeldingen zijn toegestaan (foto, screenshot)');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Afbeelding is te groot (max 4MB). Probeer een kleinere foto.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
      setError(null);
      // Activate huiswerk mode when image attached before session starts
      if (!sessionStarted && messages.length <= 1) {
        setHuiswerkMode(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = '';
  };

  // Handle paste from clipboard (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processImageFile(file);
        return;
      }
    }
  };

  // Auto-TTS: speak completed assistant messages in voice-first mode
  const autoSpeak = useCallback((text: string) => {
    if (!isVoiceFirst) return;
    if (hasSpeekBlocks(text)) return; // [SPREEK] blocks handle their own TTS
    const cleaned = cleanForAutoTts(text);
    if (!cleaned) return;

    speak(cleaned, getTtsLang(locale), {
      onStart: () => setEmotion('speaking'),
      onEnd: () => setEmotion('idle'),
    });
  }, [isVoiceFirst, locale, speak, setEmotion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && !pendingImage) || isLoading) return;

    // Stop listening/speaking if active
    if (isListening) stopListening();
    if (isSpeaking) stopSpeaking();

    const messageText = input.trim() || (pendingImage ? 'Kun je mijn huiswerk bekijken?' : '');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      imageUrl: pendingImage || undefined,
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const imageToSend = pendingImage;
    setPendingImage(null);
    setIsLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/${locale}/api/tutor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
            ...(m.imageUrl ? { imageUrl: m.imageUrl } : {}),
          })),
          sessionId: currentSessionId,
          subject,
          childId,
          hiatenTopic: hiatenTopicId
            ? (HIAAT_TOPICS[subject].find(t => t.id === hiatenTopicId)?.prompt ?? null)
            : null,
          huiswerkMode: huiswerkMode || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          setRateLimited(true);
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      const assistantMessageId = `assistant-${Date.now()}`;

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      }]);

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;

        // Update the assistant message with streamed content
        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: assistantMessage }
            : m
        ));
      }

      // Mark session as started (hides HiatenSelector)
      setSessionStarted(true);

      // Detect assessment completion signal in the full streamed response
      if (isAssessmentMode && ASSESSMENT_DONE_REGEX.test(assistantMessage)) {
        setAssessmentDone(true);
        // Strip signal from the visible message content in state
        setMessages(prev => prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: stripAssessmentSignal(m.content) }
            : m
        ));
      }

      // Auto-TTS after streaming completes
      if (assistantMessage && assistantMessage !== lastCompletedRef.current) {
        lastCompletedRef.current = assistantMessage;
        const speakText = isAssessmentMode ? stripAssessmentSignal(assistantMessage) : assistantMessage;
        autoSpeak(speakText);

        // Auto-open whiteboard if [BORD] detected
        if (hasBordBlocks(assistantMessage)) {
          const content = extractBordContent(assistantMessage);
          if (content) {
            setBoardContent(content);
            setShowWhiteboard(true);
          }
        }
      }

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message);
      } else {
        setError(t('connectionError'));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleMicToggle = () => {
    if (isSpeaking) stopSpeaking();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      stopSpeaking();
    };
  }, []);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Header: Avatar + Timer + Voice Toggle */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-4">
        <KokoAvatar emotion={emotion} size="sm" />
        <div className="flex-1">
          <SessionTimer childAge={childAge} />
        </div>
        {/* Whiteboard toggle */}
        <button
          type="button"
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            showWhiteboard
              ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title="Schoolbord"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
          </svg>
        </button>

        {/* Print Werkblad — shown as soon as any [OPDRACHT] block is present */}
        <WerkbladPrint
          messages={messages}
          childName={childName}
          subject={subject}
          subjectLabel={subjectLabel}
        />

        {/* Voice-first toggle — hidden for begrijpend_lezen */}
        {subject !== 'begrijpend_lezen' && <button
          type="button"
          onClick={() => setVoiceFirst(!isVoiceFirstRaw)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            isVoiceFirst
              ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-300'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title={isVoiceFirst ? 'Spraak-modus aan' : 'Spraak-modus uit'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          {isVoiceFirstRaw ? 'Aan' : 'Uit'}
        </button>}
      </div>

      {/* Assessment Mode Banner */}
      {isAssessmentMode && !assessmentDone && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <span className="text-amber-500" aria-hidden="true">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="text-sm font-medium text-amber-800">
            Beginsituatietoets — Koko bepaalt jouw startpunt
          </span>
        </div>
      )}

      {/* Huiswerk Hulp Banner */}
      {huiswerkMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2">
          <span className="text-blue-500" aria-hidden="true">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.255 0 2.443.29 3.5.804V4.804zM10.5 4.804A7.968 7.968 0 0114.5 4c1.255 0 2.443.29 3.5.804v10a7.969 7.969 0 01-3.5-.804V4.804z" />
            </svg>
          </span>
          <span className="text-sm font-medium text-blue-800">
            Huiswerk Hulp actief — Koko analyseert jouw huiswerk
          </span>
        </div>
      )}

      {/* Hiaat Selector — shown before first message, hidden once session starts */}
      {!isAssessmentMode && !sessionStarted && !existingSessionId && !huiswerkMode &&
        !(['geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'] as string[]).includes(subject) && (
        <HiatenSelector
          subject={subject}
          selected={hiatenTopicId}
          onSelect={(topic) => setHiatenTopicId(topic?.id ?? null)}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message: Message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            locale={locale}
            imageUrl={message.imageUrl}
            isStreaming={isLoading && message.id === messages[messages.length - 1]?.id && message.role === 'assistant'}
            onBoardClick={(boardText) => {
              setBoardContent(boardText);
              setShowWhiteboard(true);
            }}
          />
        ))}

        {/* Loading Indicator with Avatar */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-start gap-3">
            <KokoAvatar emotion="thinking" size="sm" className="flex-shrink-0" />
            <div className="bg-sky-100 text-sky-900 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[80%] shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="text-sm text-sky-600">{t('thinking')}</span>
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && !rateLimited && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Rate Limited Message */}
        {rateLimited && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-4 rounded-lg">
            <p className="font-semibold">{t('rateLimitReached')}</p>
          </div>
        )}

        {/* Assessment Completion Banner — inline after last message */}
        {isAssessmentMode && assessmentDone && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm">
            <span className="text-green-500 flex-shrink-0" aria-hidden="true">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">Toets afgerond! Je niveau is bepaald.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/tutor/${childId}/${subject}`)}
              className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              Ga naar de les
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending Image Preview */}
      {pendingImage && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
          <div className="flex items-center gap-3">
            <img
              src={pendingImage}
              alt="Huiswerk preview"
              className="w-16 h-16 object-cover rounded-lg border-2 border-amber-300"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Huiswerk foto klaar om te versturen</p>
              <p className="text-xs text-amber-600">Typ eventueel een vraag erbij, of druk op verzenden</p>
            </div>
            <button
              onClick={() => setPendingImage(null)}
              className="text-amber-600 hover:text-red-600 p-1"
              aria-label="Verwijder foto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input Area — Voice-First Layout */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Big Mic Button (voice-first mode) */}
        {isVoiceFirst && sttSupported && (
          <div className="flex justify-center mb-3">
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={isLoading || rateLimited}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-500 text-white scale-110'
                  : 'bg-gradient-to-br from-sky-400 to-sky-600 text-white hover:from-sky-500 hover:to-sky-700 active:scale-95'
              }`}
              aria-label={isListening ? 'Stop opnemen' : 'Spreek in'}
            >
              {/* Pulse ring when listening */}
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
              )}

              {isListening ? (
                <VoiceWaveform isActive={true} color="white" />
              ) : (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Text input row with action buttons */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          {/* Camera/Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || rateLimited}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-700 active:scale-95"
            aria-label="Upload huiswerk foto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </button>

          {/* Phone Upload Button */}
          <button
            type="button"
            onClick={() => setShowPhoneUpload(true)}
            disabled={isLoading || rateLimited}
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-purple-100 text-purple-600 hover:bg-purple-200 hover:text-purple-700 active:scale-95"
            aria-label="Upload via telefoon"
            title="Foto maken met telefoon"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </button>

          {/* Small mic button (non-voice-first mode) */}
          {!isVoiceFirst && sttSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={isLoading || rateLimited}
              className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600'
              }`}
              aria-label={isListening ? 'Stop opnemen' : 'Spreek in'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            disabled={isLoading || rateLimited}
            placeholder={isListening ? 'Luisteren...' : pendingImage ? 'Stel een vraag over je huiswerk...' : t('sendMessage')}
            className={`flex-1 px-4 py-2.5 text-lg border-2 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all ${
              isListening ? 'border-red-300 bg-red-50' : pendingImage ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
            }`}
          />

          <button
            type="submit"
            disabled={isLoading || rateLimited || (!input.trim() && !pendingImage)}
            className="bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold px-5 py-2.5 rounded-xl hover:from-sky-600 hover:to-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md disabled:shadow-none flex items-center gap-2"
          >
            <span>{t('send')}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </form>
      </div>

      {/* Whiteboard Panel */}
      <WhiteboardPanel
        isOpen={showWhiteboard}
        onToggle={() => setShowWhiteboard(!showWhiteboard)}
        boardContent={boardContent}
        subject={subject}
        drawingEnabled={false}
        childAge={childAge}
      />

      {/* Phone Upload Modal (QR code for phone-to-PC transfer) */}
      {showPhoneUpload && (
        <PhoneUploadModal
          childId={childId}
          sessionId={currentSessionId || undefined}
          locale={locale}
          onImageReceived={(imageData) => {
            setPendingImage(imageData);
            setShowPhoneUpload(false);
          }}
          onClose={() => setShowPhoneUpload(false)}
        />
      )}
    </div>
  );
}
