'use client'

import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'aruba-leren-voice-first'

export function useVoiceFirstMode() {
  const [isVoiceFirst, setIsVoiceFirst] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsVoiceFirst(stored === 'true')
    }
  }, [])

  const setVoiceFirst = useCallback((value: boolean) => {
    setIsVoiceFirst(value)
    localStorage.setItem(STORAGE_KEY, String(value))
  }, [])

  return { isVoiceFirst, setVoiceFirst }
}
