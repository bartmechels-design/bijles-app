'use client'

import { useEffect, useState } from 'react'
import Whiteboard from './Whiteboard'
import type { Subject } from '@/types/tutoring'

interface WhiteboardPanelProps {
  isOpen: boolean
  onToggle: () => void
  boardContent?: string
  subject: Subject
  drawingEnabled: boolean
  childAge?: number
}

export default function WhiteboardPanel({
  isOpen,
  onToggle,
  boardContent,
  subject,
  drawingEnabled,
  childAge,
}: WhiteboardPanelProps) {
  const [mode, setMode] = useState<'koko' | 'tekenen'>('koko')
  const [mountKey, setMountKey] = useState(0)

  // Switch to koko mode and reset animation when new board content arrives
  useEffect(() => {
    if (boardContent) {
      setMode('koko')
      setMountKey(k => k + 1) // force Whiteboard remount → restarts step animation
    }
  }, [boardContent])

  // Also reset animation when panel opens
  useEffect(() => {
    if (isOpen) {
      setMountKey(k => k + 1)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onToggle} />

      {/* Panel — bottom sheet on mobile, right panel on desktop */}
      <div className="relative z-10 w-full sm:w-[420px] h-[65vh] sm:h-[80vh] sm:mr-4 bg-white sm:rounded-2xl rounded-t-2xl sm:rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Panel header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
          </svg>
          <span className="font-semibold text-gray-800 flex-1">Schoolbord</span>

          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setMode('koko')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'koko' ? 'bg-sky-100 text-sky-700' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Koko
            </button>
            <button
              onClick={() => setMode('tekenen')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === 'tekenen' ? 'bg-sky-100 text-sky-700' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Tekenen
            </button>
          </div>

          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Sluit schoolbord"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Empty state when no board content in Koko mode */}
        {mode === 'koko' && !boardContent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-6">
            <svg className="w-16 h-16 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
            </svg>
            <p className="text-center text-sm font-medium">Koko heeft nog niks op het bord geschreven</p>
            <p className="text-center text-xs mt-1">Stel een rekenvraag en Koko schrijft de stappen hier!</p>
            <button
              onClick={() => setMode('tekenen')}
              className="mt-4 px-4 py-2 bg-sky-100 text-sky-700 rounded-lg text-sm font-medium hover:bg-sky-200 transition-colors"
            >
              Of ga zelf tekenen
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Whiteboard
              key={mountKey}
              boardContent={mode === 'koko' ? boardContent : undefined}
              subject={subject}
              drawingEnabled={mode === 'tekenen' || drawingEnabled}
              childAge={childAge}
            />
          </div>
        )}
      </div>
    </div>
  )
}
