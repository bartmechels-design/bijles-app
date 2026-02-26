'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import katex from 'katex'
import type { Subject } from '@/types/tutoring'

interface WhiteboardProps {
  boardContent?: string
  subject?: Subject
  drawingEnabled?: boolean
  onDrawingChange?: (dataUrl: string) => void
  childAge?: number
}

const COLORS = ['#2D1810', '#DC2626', '#2563EB', '#16A34A', '#F59E0B']
const DRAW_LINE_WIDTH = 4

// --- Content parsing ---

type LineType =
  | { kind: 'label'; prefix: string; text: string; stepNum?: number }
  | { kind: 'sum-number'; raw: string; digits: string; operator?: string }
  | { kind: 'sum-line' }
  | { kind: 'text'; text: string }

function classifyLine(line: string): LineType {
  const trimmed = line.trim()

  // Separator line: ---- or ════
  if (/^[-─═]{3,}$/.test(trimmed)) {
    return { kind: 'sum-line' }
  }

  // Labelled lines: STAP:, WOORD:, SPLITS:, KLANKEN:, UITLEG:, ANTWOORD:
  const labelMatch = trimmed.match(/^(STAP|WOORD|SPLITS|KLANKEN|UITLEG|ANTWOORD|TUSSENSTAP):(.*)$/)
  if (labelMatch) {
    return { kind: 'label', prefix: labelMatch[1], text: labelMatch[2].trim() }
  }

  // Sum line: just a number (possibly with leading spaces for alignment)
  if (/^\s*\d[\d\s.,]*$/.test(line)) {
    return { kind: 'sum-number', raw: line, digits: trimmed }
  }

  // Sum line with operator: × 35, + 810, - 27
  const opMatch = line.match(/^\s*([×x✕+\-−])\s*(\d[\d\s.,]*)$/)
  if (opMatch) {
    const op = opMatch[1] === 'x' || opMatch[1] === '✕' ? '×' : opMatch[1] === '−' ? '−' : opMatch[1]
    return { kind: 'sum-number', raw: line, digits: opMatch[2].trim(), operator: op }
  }

  return { kind: 'text', text: trimmed }
}

function parseLines(content: string): LineType[] {
  const rawLines = content.split('\n').filter(l => l.trim().length > 0)
  let stepNum = 0
  return rawLines.map(line => {
    const classified = classifyLine(line)
    if (classified.kind === 'label' && classified.prefix === 'STAP') {
      stepNum++
      classified.stepNum = stepNum
    }
    return classified
  })
}

// Group consecutive sum-related lines into blocks
interface SumBlock { kind: 'sum-block'; lines: (LineType & { kind: 'sum-number' | 'sum-line' })[] }
type ContentBlock = SumBlock | (LineType & { kind: 'label' | 'text' })

function groupIntoBlocks(lines: LineType[]): ContentBlock[] {
  const blocks: ContentBlock[] = []
  let currentSum: SumBlock | null = null

  for (const line of lines) {
    if (line.kind === 'sum-number' || line.kind === 'sum-line') {
      if (!currentSum) {
        currentSum = { kind: 'sum-block', lines: [] }
      }
      currentSum.lines.push(line as (LineType & { kind: 'sum-number' | 'sum-line' }))
    } else {
      if (currentSum) {
        blocks.push(currentSum)
        currentSum = null
      }
      blocks.push(line as (LineType & { kind: 'label' | 'text' }))
    }
  }
  if (currentSum) blocks.push(currentSum)

  return blocks
}

// Find the widest number in a sum block for alignment
function maxDigitWidth(block: SumBlock): number {
  let max = 0
  for (const line of block.lines) {
    if (line.kind === 'sum-number') {
      max = Math.max(max, line.digits.length)
    }
  }
  return max
}

// --- KaTeX math rendering ---

/** Detecteer of een string LaTeX-tokens bevat */
function containsMath(text: string): boolean {
  return /\\frac|\\times|\\div|\\sqrt|\\cdot|\^{|_{/.test(text)
}

/**
 * Render een tekstregel met KaTeX als die LaTeX-tokens bevat.
 * Geeft een React element terug met dangerouslySetInnerHTML voor KaTeX HTML.
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

// --- Component ---

export default function Whiteboard({ boardContent, subject, drawingEnabled = false, onDrawingChange, childAge }: WhiteboardProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawColor, setDrawColor] = useState(COLORS[0])
  const [visibleLines, setVisibleLines] = useState(0)
  const animFrameRef = useRef<number>(0)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const parsedLines = boardContent ? parseLines(boardContent) : []
  const blocks = boardContent ? groupIntoBlocks(parsedLines) : []
  const isRuled = subject === 'taal' || subject === 'begrijpend_lezen'

  // Step delay based on child age
  const stepDelay = !childAge ? 1500 : childAge <= 7 ? 2000 : childAge <= 9 ? 1500 : 1200
  const firstDelay = !childAge ? 800 : childAge <= 7 ? 1000 : 800

  // Animate lines one by one
  useEffect(() => {
    if (!parsedLines.length) return
    setVisibleLines(0)

    let current = 0
    const showNext = () => {
      current++
      setVisibleLines(current)
      if (current < parsedLines.length) {
        animFrameRef.current = window.setTimeout(showNext, stepDelay) as unknown as number
      }
    }

    animFrameRef.current = window.setTimeout(showNext, firstDelay) as unknown as number
    return () => clearTimeout(animFrameRef.current)
  }, [boardContent, stepDelay, firstDelay])

  // Draw background (grid or ruled lines)
  const drawBackground = useCallback(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#FFFEF7'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 0.5

    if (isRuled) {
      const lineSpacing = 36
      for (let y = lineSpacing; y < h; y += lineSpacing) {
        ctx.beginPath()
        ctx.moveTo(20, y)
        ctx.lineTo(w - 20, y)
        ctx.stroke()
      }
      ctx.strokeStyle = '#FCA5A5'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(50, 0)
      ctx.lineTo(50, h)
      ctx.stroke()
    } else {
      const gridSize = 30
      for (let x = gridSize; x < w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = gridSize; y < h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
    }
  }, [isRuled])

  // Resize canvases
  useEffect(() => {
    const resize = () => {
      const container = containerRef.current
      const bg = bgCanvasRef.current
      const draw = drawCanvasRef.current
      if (!container || !bg || !draw) return

      const w = container.clientWidth
      const h = container.clientHeight
      bg.width = w
      bg.height = h
      draw.width = w
      draw.height = h
      drawBackground()
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [drawBackground])

  // --- Drawing handlers ---
  const getPos = (e: React.PointerEvent) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!drawingEnabled) return
    setIsDrawing(true)
    lastPointRef.current = getPos(e)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !drawingEnabled) return
    const ctx = drawCanvasRef.current?.getContext('2d')
    if (!ctx || !lastPointRef.current) return

    const pos = getPos(e)
    ctx.strokeStyle = drawColor
    ctx.lineWidth = DRAW_LINE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPointRef.current = pos
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    lastPointRef.current = null
    if (onDrawingChange && drawCanvasRef.current) {
      onDrawingChange(drawCanvasRef.current.toDataURL())
    }
  }

  const clearDrawing = () => {
    const ctx = drawCanvasRef.current?.getContext('2d')
    if (!ctx || !drawCanvasRef.current) return
    ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height)
  }

  // Count how many parsed lines a block consumes (for visibility check)
  function blockLineRange(blockIdx: number): { start: number; end: number } {
    let lineCount = 0
    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b]
      if (block.kind === 'sum-block') {
        const start = lineCount
        lineCount += block.lines.length
        if (b === blockIdx) return { start, end: lineCount }
      } else {
        if (b === blockIdx) return { start: lineCount, end: lineCount + 1 }
        lineCount += 1
      }
    }
    return { start: 0, end: 0 }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar (only when drawing enabled) */}
      {drawingEnabled && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setDrawColor(color)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                drawColor === color ? 'border-sky-500 scale-110' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Kleur ${color}`}
            />
          ))}
          <div className="flex-1" />
          <button
            onClick={clearDrawing}
            className="text-sm text-gray-500 hover:text-red-500 px-2 py-1 rounded transition-colors"
          >
            Wis
          </button>
        </div>
      )}

      {/* Canvas + Content area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ touchAction: drawingEnabled ? 'none' : 'auto' }}>
        {/* Background canvas (grid/ruled) */}
        <canvas ref={bgCanvasRef} className="absolute inset-0" />

        {/* HTML content overlay */}
        {boardContent && (
          <div className="absolute inset-0 overflow-y-auto p-4 z-10 pointer-events-none">
            <div className="space-y-3">
              {blocks.map((block, blockIdx) => {
                const range = blockLineRange(blockIdx)

                if (block.kind === 'sum-block') {
                  const width = maxDigitWidth(block)
                  // Render each line of the sum block only if visible
                  return (
                    <div key={blockIdx} className="flex justify-start pl-4">
                      <div
                        className="inline-block"
                        style={{ fontFamily: '"Courier New", Courier, monospace' }}
                      >
                        {block.lines.map((sumLine, li) => {
                          const lineIdx = range.start + li
                          if (lineIdx >= visibleLines) return null

                          if (sumLine.kind === 'sum-line') {
                            return (
                              <div
                                key={li}
                                className="whiteboard-line"
                                style={{
                                  borderBottom: '2px solid #1E293B',
                                  width: `${(width + 2) * 0.62}em`,
                                  marginLeft: 'auto',
                                  animationDelay: `${(range.start + li) * 80}ms`,
                                }}
                              />
                            )
                          }

                          // sum-number: right-align digits
                          return (
                            <div
                              key={li}
                              className="flex whiteboard-line"
                              style={{ width: `${(width + 2) * 0.62}em`, animationDelay: `${(range.start + li) * 80}ms` }}
                            >
                              {/* Operator column */}
                              <span
                                className="text-xl font-bold text-slate-800 shrink-0"
                                style={{ width: '1.2em', textAlign: 'center' }}
                              >
                                {sumLine.operator || '\u00A0'}
                              </span>
                              {/* Digits column - right aligned */}
                              <span
                                className="text-xl font-bold text-slate-800 flex-1 text-right tracking-[0.15em]"
                              >
                                {sumLine.digits}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                }

                // Label or text line
                if (range.start >= visibleLines) return null

                if (block.kind === 'label') {
                  const displayPrefix = block.prefix === 'STAP'
                    ? `Stap ${block.stepNum || ''}:`
                    : block.prefix === 'ANTWOORD'
                      ? 'Antwoord:'
                      : block.prefix === 'UITLEG'
                        ? ''
                        : `${block.prefix}:`

                  const animDelay = `${range.start * 100}ms`
                  return (
                    <div key={blockIdx} className="whiteboard-line" style={{ animationDelay: animDelay }}>
                      {block.prefix === 'UITLEG' ? (
                        <p className="text-base text-slate-600 italic pl-1">{renderMathLine(block.text, 'italic text-slate-600 text-sm')}</p>
                      ) : block.prefix === 'ANTWOORD' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base font-bold text-green-700">{displayPrefix}</span>
                          {renderMathLine(block.text, 'text-xl font-bold text-green-700 tracking-[0.15em]')}
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-indigo-600 shrink-0">{displayPrefix}</span>
                          {renderMathLine(block.text, 'text-base text-slate-800')}
                        </div>
                      )}
                    </div>
                  )
                }

                // Plain text
                return (
                  <p
                    key={blockIdx}
                    className="text-base text-slate-800 whiteboard-line"
                    style={{ animationDelay: `${range.start * 100}ms` }}
                  >
                    {renderMathLine(block.text)}
                  </p>
                )
              })}
            </div>
          </div>
        )}

        {/* Drawing canvas (on top) */}
        <canvas
          ref={drawCanvasRef}
          className="absolute inset-0 z-20"
          style={{ cursor: drawingEnabled ? 'crosshair' : 'default' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  )
}
