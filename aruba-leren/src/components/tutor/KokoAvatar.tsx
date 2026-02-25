'use client'

import type { KokoEmotion } from '@/types/koko'

interface KokoAvatarProps {
  emotion: KokoEmotion
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = { sm: 64, md: 96, lg: 120 }

export default function KokoAvatar({ emotion, size = 'md', className = '' }: KokoAvatarProps) {
  const px = SIZES[size]

  return (
    <div
      className={`koko-avatar koko-${emotion} ${className}`}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        xmlns="http://www.w3.org/2000/svg"
        className="koko-svg"
      >
        <defs>
          {/* Head gradient — warm brown with highlight at top-left */}
          <radialGradient id="kokoHeadGrad" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#B8845C" />
            <stop offset="100%" stopColor="#8B5E3C" />
          </radialGradient>
          {/* Face gradient — lighter skin tone with highlight */}
          <radialGradient id="kokoFaceGrad" cx="40%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#E8C9A5" />
            <stop offset="100%" stopColor="#C4976A" />
          </radialGradient>
          {/* Body gradient — darker brown with depth */}
          <radialGradient id="kokoBodyGrad" cx="45%" cy="25%" r="65%">
            <stop offset="0%" stopColor="#9E6F45" />
            <stop offset="100%" stopColor="#6B432A" />
          </radialGradient>
          {/* Ear gradient */}
          <radialGradient id="kokoEarGrad" cx="40%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#B8845C" />
            <stop offset="100%" stopColor="#7A5030" />
          </radialGradient>
        </defs>

        {/* Body */}
        <g className="koko-body">
          <ellipse cx="50" cy="65" rx="28" ry="30" fill="url(#kokoBodyGrad)" />
        </g>

        {/* Left arm */}
        <g className="koko-arm-left">
          <path
            d="M22,60 Q12,55 10,45"
            stroke="url(#kokoBodyGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="10" cy="44" r="5" fill="url(#kokoFaceGrad)" />
        </g>

        {/* Right arm */}
        <g className="koko-arm-right">
          <path
            d="M78,60 Q88,55 90,45"
            stroke="url(#kokoBodyGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="90" cy="44" r="5" fill="url(#kokoFaceGrad)" />
        </g>

        {/* Head */}
        <g className="koko-head">
          {/* Ears */}
          <circle cx="18" cy="25" r="10" fill="url(#kokoEarGrad)" className="koko-ear-left" />
          <circle cx="18" cy="25" r="6" fill="url(#kokoFaceGrad)" />
          <circle cx="82" cy="25" r="10" fill="url(#kokoEarGrad)" className="koko-ear-right" />
          <circle cx="82" cy="25" r="6" fill="url(#kokoFaceGrad)" />

          {/* Head shape */}
          <ellipse cx="50" cy="30" rx="30" ry="26" fill="url(#kokoHeadGrad)" />

          {/* Specular highlight on head for 3D depth */}
          <ellipse cx="40" cy="20" rx="12" ry="6" fill="white" opacity="0.12" />

          {/* Face (lighter area) */}
          <ellipse cx="50" cy="35" rx="20" ry="18" fill="url(#kokoFaceGrad)" />
        </g>

        {/* Eyes */}
        <g className="koko-eyes">
          {/* Left eye */}
          <g className="koko-eye-left">
            <ellipse cx="40" cy="28" rx="5" ry="5.5" fill="white" />
            <circle cx="41" cy="28" r="2.8" fill="#2D1810" className="koko-pupil-left" />
            <circle cx="42" cy="27" r="1" fill="white" />
          </g>
          {/* Right eye */}
          <g className="koko-eye-right">
            <ellipse cx="60" cy="28" rx="5" ry="5.5" fill="white" />
            <circle cx="61" cy="28" r="2.8" fill="#2D1810" className="koko-pupil-right" />
            <circle cx="62" cy="27" r="1" fill="white" />
          </g>
        </g>

        {/* Nose */}
        <ellipse cx="50" cy="36" rx="3" ry="2" fill="#6B4226" />

        {/* Mouth - changes per emotion */}
        <g className="koko-mouth-group">
          {emotion === 'happy' && (
            <path
              d="M40,42 Q50,52 60,42"
              stroke="#6B4226"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              className="koko-mouth"
            />
          )}
          {emotion === 'thinking' && (
            <ellipse cx="54" cy="43" rx="3.5" ry="3" fill="#6B4226" className="koko-mouth" />
          )}
          {emotion === 'speaking' && (
            <ellipse cx="50" cy="43" rx="5" ry="4" fill="#6B4226" className="koko-mouth koko-mouth-speaking" />
          )}
          {emotion === 'encouraging' && (
            <path
              d="M42,42 Q50,48 58,42"
              stroke="#6B4226"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              className="koko-mouth"
            />
          )}
          {emotion === 'surprised' && (
            <ellipse cx="50" cy="44" rx="4" ry="5" fill="#6B4226" className="koko-mouth" />
          )}
          {(emotion === 'idle' || emotion === 'listening') && (
            <path
              d="M43,42 Q50,47 57,42"
              stroke="#6B4226"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              className="koko-mouth"
            />
          )}
        </g>

        {/* Thought bubble for thinking */}
        {emotion === 'thinking' && (
          <g className="koko-thought">
            <circle cx="82" cy="12" r="2" fill="#E0E0E0" opacity="0.8" />
            <circle cx="88" cy="6" r="3" fill="#E0E0E0" opacity="0.8" />
            <ellipse cx="92" cy="-2" rx="6" ry="4" fill="#E0E0E0" opacity="0.8" />
            <text x="92" y="0" textAnchor="middle" fontSize="5" fill="#888">...</text>
          </g>
        )}

        {/* Listening indicator */}
        {emotion === 'listening' && (
          <g className="koko-listen-waves">
            <path d="M86,20 Q92,25 86,30" stroke="#38BDF8" strokeWidth="1.5" fill="none" opacity="0.6" className="koko-wave-1" />
            <path d="M89,17 Q97,25 89,33" stroke="#38BDF8" strokeWidth="1.5" fill="none" opacity="0.4" className="koko-wave-2" />
            <path d="M92,14 Q102,25 92,36" stroke="#38BDF8" strokeWidth="1.5" fill="none" opacity="0.2" className="koko-wave-3" />
          </g>
        )}

        {/* Surprised sparkle stars */}
        {emotion === 'surprised' && (
          <g className="koko-surprised-stars">
            <text x="20" y="12" fontSize="8" className="koko-star-1">✦</text>
            <text x="78" y="8" fontSize="6" className="koko-star-2">✦</text>
            <text x="14" y="5" fontSize="5" className="koko-star-3">✦</text>
          </g>
        )}
      </svg>
    </div>
  )
}
