'use client'

import { useState, useCallback, useEffect } from 'react'
import type { KokoEmotion } from '@/types/koko'

const HAPPY_WORDS = ['goed', 'super', 'prima', 'geweldig', 'fantastisch', 'correct', 'klopt', 'juist', 'knap', 'yes', 'top', 'bravo']
const SURPRISED_WORDS = ['wauw', 'wow', 'ongelooflijk', 'indrukwekkend', 'verbazingwekkend', 'niet verwacht', 'verrassing']
const ENCOURAGING_WORDS = ['bijna', 'probeer', 'hint', 'denk', 'nog een keer', 'niet helemaal', 'oeps', 'jammer']

function detectEmotionFromText(text: string): KokoEmotion | null {
  const lower = text.toLowerCase()
  const firstSentence = lower.split(/[.!?]/)[0] || lower

  for (const word of HAPPY_WORDS) {
    if (firstSentence.includes(word)) return 'happy'
  }
  for (const word of SURPRISED_WORDS) {
    if (firstSentence.includes(word)) return 'surprised'
  }
  for (const word of ENCOURAGING_WORDS) {
    if (firstSentence.includes(word)) return 'encouraging'
  }
  return null
}

export function useKokoState() {
  const [emotion, setEmotion] = useState<KokoEmotion>('idle')
  const [override, setOverride] = useState<KokoEmotion | null>(null)

  const deriveEmotion = useCallback((params: {
    isLoading: boolean
    isListening: boolean
    isSpeaking: boolean
    lastAssistantMessage?: string
  }) => {
    if (override) {
      setEmotion(override)
      return
    }

    if (params.isSpeaking) {
      setEmotion('speaking')
    } else if (params.isListening) {
      setEmotion('listening')
    } else if (params.isLoading) {
      setEmotion('thinking')
    } else if (params.lastAssistantMessage) {
      const detected = detectEmotionFromText(params.lastAssistantMessage)
      setEmotion(detected || 'idle')
    } else {
      setEmotion('idle')
    }
  }, [override])

  const setTemporaryEmotion = useCallback((em: KokoEmotion, durationMs: number = 2000) => {
    setOverride(em)
    setTimeout(() => setOverride(null), durationMs)
  }, [])

  return { emotion, deriveEmotion, setTemporaryEmotion, setEmotion }
}
