'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const DRAW_COLORS = ['#1E293B', '#DC2626', '#2563EB', '#16A34A', '#F59E0B']
const LINE_WIDTH = 4

interface ScratchpadProps {
  childId: string
  sessionId: string | null
  isVisible: boolean  // controlled by parent — niet wegklikbaar (geen close knop)
}

export default function Scratchpad({ childId, sessionId, isVisible }: ScratchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0])
  const [hasContent, setHasContent] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const supabase = createClient()

  // Resize canvas to container
  const resizeCanvas = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    // Save drawing before resize
    const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    // Fill white background
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // Draw light grid
      ctx.strokeStyle = '#F3F4F6'
      ctx.lineWidth = 0.5
      const gridSize = 28
      for (let x = gridSize; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = gridSize; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }
      // Restore drawing (best effort after resize)
      if (imageData) ctx.putImageData(imageData, 0, 0)
    }
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas, isVisible])

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true)
    lastPointRef.current = getPos(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !lastPointRef.current) return
    const pos = getPos(e)
    ctx.strokeStyle = drawColor
    ctx.lineWidth = LINE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPointRef.current = pos
    setHasContent(true)
    setSaveStatus('idle')
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    lastPointRef.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // Redraw grid after clear
    ctx.strokeStyle = '#F3F4F6'
    ctx.lineWidth = 0.5
    const gridSize = 28
    for (let x = gridSize; x < canvas.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
    }
    for (let y = gridSize; y < canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
    }
    setHasContent(false)
    setSaveStatus('idle')
  }

  const saveToSupabase = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasContent) return
    setIsSaving(true)
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Canvas is leeg')
      const timestamp = Date.now()
      const path = `${childId}/${sessionId || 'no-session'}/${timestamp}.png`
      const { error } = await supabase.storage
        .from('scratchpads')
        .upload(path, blob, { contentType: 'image/png', upsert: false })
      if (error) throw error
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="flex flex-col border-t-2 border-amber-300 bg-amber-50">
      {/* Non-dismissible header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border-b border-amber-200">
        <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        <span className="text-sm font-semibold text-amber-800 flex-1">
          Kladblaadje — reken hier je tussenstappen uit!
        </span>
        {/* Color picker */}
        <div className="flex items-center gap-1">
          {DRAW_COLORS.map(color => (
            <button
              key={color}
              onClick={() => setDrawColor(color)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${drawColor === color ? 'border-amber-600 scale-125' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              aria-label={`Kleur ${color}`}
            />
          ))}
        </div>
        {/* Wis knop */}
        <button
          onClick={clearCanvas}
          className="text-xs text-gray-500 hover:text-red-500 px-2 py-0.5 rounded transition-colors"
        >
          Wis
        </button>
        {/* Opslaan knop */}
        <button
          onClick={saveToSupabase}
          disabled={!hasContent || isSaving}
          className={`text-xs font-medium px-2 py-0.5 rounded transition-colors disabled:opacity-40 ${
            saveStatus === 'saved' ? 'bg-green-500 text-white' :
            saveStatus === 'error' ? 'bg-red-500 text-white' :
            'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {isSaving ? '...' : saveStatus === 'saved' ? 'Opgeslagen!' : saveStatus === 'error' ? 'Fout!' : 'Bewaar'}
        </button>
      </div>
      {/* Canvas area */}
      <div
        ref={containerRef}
        className="h-40 relative bg-white"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  )
}
