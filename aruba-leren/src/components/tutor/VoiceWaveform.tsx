'use client'

interface VoiceWaveformProps {
  isActive: boolean
  barCount?: number
  color?: string
}

export default function VoiceWaveform({ isActive, barCount = 5, color = 'currentColor' }: VoiceWaveformProps) {
  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ height: 24 }}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            height: 24,
            backgroundColor: color,
            animationPlayState: isActive ? 'running' : 'paused',
            transform: isActive ? undefined : 'scaleY(0.3)',
          }}
        />
      ))}
    </div>
  )
}
