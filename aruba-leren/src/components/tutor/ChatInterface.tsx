'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Subject } from '@/types/tutoring';
import ChatMessage from './ChatMessage';
import SessionTimer from './SessionTimer';
import PhoneUploadModal from './PhoneUploadModal';
import { useSpeechToText } from '@/hooks/useSpeech';

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
}

function getSttLang(locale: string) {
  if (locale === 'pap') return 'nl-NL';
  if (locale === 'es') return 'es-ES';
  if (locale === 'en') return 'en-US';
  return 'nl-NL';
}

// Max file size: 4MB (Claude vision limit is ~5MB)
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

export default function ChatInterface({
  childId,
  childAge,
  childName,
  subject,
  locale,
  existingSessionId,
  subjectLabel,
}: ChatInterfaceProps) {
  const t = useTranslations('tutor');
  const [currentSessionId, setCurrentSessionId] = useState(existingSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [showPhoneUpload, setShowPhoneUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Speech-to-text
  const { startListening, stopListening, isListening, transcript, isSupported: sttSupported } =
    useSpeechToText(getSttLang(locale));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && !pendingImage) || isLoading) return;

    // Stop listening if active
    if (isListening) stopListening();

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
    };
  }, []);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Session Timer */}
      <div className="px-4 py-2 bg-white border-b border-gray-200">
        <SessionTimer childAge={childAge} />
      </div>

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
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-start gap-3">
            <div className="bg-sky-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🐵</span>
            </div>
            <div className="bg-sky-100 text-sky-900 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[80%] shadow-sm">
              <div className="flex gap-1">
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

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          {/* Hidden file input — no capture attr so user can choose camera OR gallery */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Camera/Upload Button (direct from this device) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || rateLimited}
            className="flex-shrink-0 w-12 h-12 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-amber-100 text-amber-600 hover:bg-amber-200 hover:text-amber-700 active:scale-95"
            aria-label="Upload huiswerk foto"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </button>

          {/* Phone Upload Button (scan QR to upload from phone) */}
          <button
            type="button"
            onClick={() => setShowPhoneUpload(true)}
            disabled={isLoading || rateLimited}
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-purple-100 text-purple-600 hover:bg-purple-200 hover:text-purple-700 active:scale-95"
            aria-label="Upload via telefoon"
            title="Foto maken met telefoon"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </button>

          {/* Microphone Button */}
          {sttSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={isLoading || rateLimited}
              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600'
              }`}
              aria-label={isListening ? 'Stop opnemen' : 'Spreek in'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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
            className={`flex-1 px-5 py-3 text-lg border-2 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all ${
              isListening ? 'border-red-300 bg-red-50' : pendingImage ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
            }`}
          />
          <button
            type="submit"
            disabled={isLoading || rateLimited || (!input.trim() && !pendingImage)}
            className="bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold px-6 py-3 rounded-xl hover:from-sky-600 hover:to-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md disabled:shadow-none flex items-center gap-2"
          >
            <span>{t('send')}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </form>
      </div>

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
