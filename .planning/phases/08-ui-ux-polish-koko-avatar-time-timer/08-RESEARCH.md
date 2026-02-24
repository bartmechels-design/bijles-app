# Phase 8: UI/UX Polish — Koko Avatar & Time Timer - Research

**Researched:** 2026-02-24
**Domain:** SVG animation, CSS keyframes, Web Audio API, React component design
**Confidence:** HIGH

---

## Summary

Phase 8 consists of two independent UI components: (1) enhancing the existing KokoAvatar with proper 3D-style appearance, 5+ expressions, and smooth animations; and (2) replacing the current numeric SessionTimer with a visual Time Timer component built on SVG `stroke-dashoffset` animation.

The codebase audit reveals that **substantial foundation already exists**. `KokoAvatar.tsx` is a complete SVG monkey with emotion-based rendering and 6 emotion states (`idle | happy | thinking | encouraging | listening | speaking`). `globals.css` already contains 12 keyframe animations for Koko (blink, bounce, sway, speak, thought, ear-pulse, wave). `useKokoState.ts` drives emotion derivation from tutor session state. The Tailwind v4 pattern already in use (`@keyframes` defined in `globals.css`) is confirmed correct. What's missing: a 3D-style visual upgrade (gradients, depth), a `surprised` emotion to reach the UX-02 requirement of 5 distinct emotions (current code has 6 but `surprised` is not among them, and `idle` with static expression needs replacing), and the TimeTimer SVG component itself.

The Time Timer SVG approach is straightforward: a circle with `stroke-dashoffset` animated via React state + CSS `transition`, not a CSS `@keyframes` animation, because the timer must pause/resume in response to React state. The Web Audio API pattern for optional tick/bell sounds requires AudioContext unlock via first user gesture — a React `useRef` singleton that is resumed on first interaction. No external libraries are needed for either component.

**Primary recommendation:** Zero new npm dependencies. Implement both components with pure SVG + CSS (Tailwind globals.css keyframes) + vanilla Web Audio API. The existing KokoAvatar needs a visual upgrade pass (gradients, 3D depth) and one new `surprised` emotion, not a rewrite. TimeTimer is a new standalone component consuming `duration` and `onComplete` props.

---

## User Constraints

No CONTEXT.md exists for this phase. The following constraints are derived from the phase specification and prior decisions locked in the codebase:

### Locked Decisions (from phase spec + prior work)
- **Existing files must be evolved, not replaced.** `KokoAvatar.tsx`, `useKokoState.ts`, `koko.ts` already exist and are integrated into `ChatInterface.tsx`.
- **No new animation libraries.** The project has no Framer Motion, GSAP, or Lottie. CSS-only animation is the established pattern.
- **SVG-based avatar.** Koko is implemented as inline SVG in React — no Canvas, no Lottie JSON.
- **CSS keyframes in `globals.css`.** Existing animation patterns are defined in `globals.css`, not in Tailwind config or inline styles.
- **Tailwind CSS v4.** Project uses Tailwind v4 (`@import "tailwindcss"` pattern, `@theme` block for custom tokens).
- **Next.js 15 / React 19 / TypeScript.** All components are `.tsx` with `'use client'` where needed.
- **Mobile-first (low-end Android).** Animations must stay within 16ms frame budget. Only `transform` and `opacity` are GPU-composited.
- **Time Timer: SVG circle with stroke-dashoffset.** Phase spec explicitly calls this out.
- **TimeTimer API: `<TimeTimer duration={600} />`** — configurable duration in seconds.
- **No required digits on TimeTimer.** Numbers are optional.
- **SessionTimer uses `router.back()` for stop.** This must be preserved when integrating TimeTimer.
- **KokoEmotion type lives in `src/types/koko.ts`.** Adding new emotions requires updating this type.

### Claude's Discretion
- How to achieve "3D-style" appearance (CSS drop-shadow vs SVG radial gradients vs layered ellipses)
- Whether to add `surprised` as 7th emotion or repurpose `idle` with a surprised variant
- TimeTimer sound implementation (Web Audio API oscillator vs `<audio>` element vs optional/configurable)
- How to position/size TimeTimer in the ChatInterface header (replace text timer, or companion)
- Exact color of the "red segment" (Aruba palette: amber `#F59E0B`, red `#DC2626`)
- Whether tick sound fires every second or at configurable intervals

### Deferred Ideas (OUT OF SCOPE)
- 3D library integration (Three.js, React Three Fiber)
- Lottie or Rive animations
- Koko speaking with lip-sync audio analysis
- Animated transitions between emotion states

---

## Standard Stack

### Core (zero new dependencies)
| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| SVG (inline) | Browser native | Avatar rendering, Time Timer circle | Already in use; resolution-independent; animatable via CSS |
| CSS `@keyframes` | Browser native | Koko animation (blink, bounce, sway) | Established pattern in `globals.css`; GPU-composited transforms |
| CSS `stroke-dashoffset` + `transition` | Browser native | TimeTimer shrinking arc | Widely supported (since 2017); composited on GPU; no JS animation loop needed |
| Web Audio API (`AudioContext`, `OscillatorNode`) | Browser native | Optional tick + bell sounds | No file assets; generates tones programmatically; unlockable on user gesture |
| React `useRef` / `useEffect` / `useState` | React 19 | Timer countdown logic, Audio singleton | Already used throughout project |
| Tailwind CSS v4 | ^4 | Utility classes, custom keyframe utilities via `@theme` | Project standard |

### Supporting
| Item | Purpose | When to Use |
|------|---------|-------------|
| SVG `<defs>` + `<radialGradient>` | 3D depth on Koko | Upgrade KokoAvatar to feel dimensional without external tools |
| SVG `<filter>` `feDropShadow` | Soft shadow under Koko | Use sparingly — filters are paint-heavy; one shadow on the body only |
| CSS `transform-box: fill-box` | Correct transform-origin in SVG elements | Required when rotating/scaling SVG child elements from their own center |
| `prefers-reduced-motion` CSS media query | Accessibility | Wrap all `animation:` rules to pause for users who request it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SVG radial gradients for 3D | CSS `box-shadow` / `filter: drop-shadow` | Gradients give true 3D sphere look; drop-shadow on SVG is paint-heavy |
| Web Audio API OscillatorNode for sounds | External `.mp3` file | Oscillator: no file assets, no loading; MP3: better quality but requires file hosting |
| `setInterval` countdown + inline `style` | CSS `@keyframes` pure countdown | React state approach allows pause/resume; pure CSS can't respond to stop events |
| Custom SVG pie slice for red segment | `stroke-dashoffset` on circle | Stroke approach is simpler math, cleaner code, better browser support |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Files fit existing structure:

```
aruba-leren/src/
├── components/tutor/
│   ├── KokoAvatar.tsx        # MODIFY: add SVG gradients, surprised emotion, improve 3D style
│   ├── TimeTimer.tsx         # CREATE: SVG circle countdown component
│   └── SessionTimer.tsx      # MODIFY: embed TimeTimer, preserve router.back() stop logic
├── hooks/
│   └── useKokoState.ts       # MODIFY: add 'surprised' to emotion derivation if added to type
├── types/
│   └── koko.ts               # MODIFY: add 'surprised' to KokoEmotion union
└── app/
    └── globals.css           # MODIFY: add CSS for surprised emotion, TimeTimer styles
```

### Pattern 1: Stroke-dashoffset Time Timer

**What:** SVG circle whose visible arc shrinks from full circumference to 0 as time passes. React `useState` tracks remaining seconds, updated by `setInterval`. The `stroke-dashoffset` is computed as a derived value from remaining/total ratio, applied as inline `style` on the SVG `<circle>`. CSS `transition: stroke-dashoffset linear 1s` creates smooth animation without JS animation frames.

**When to use:** Any countdown where pause/resume must be React-controlled.

**Key math:**
```
radius = 45
circumference = 2 * Math.PI * radius  // ≈ 282.74
dashoffset = circumference * (1 - remaining / total)
// At start: dashoffset = 0 (full circle)
// At end:   dashoffset = circumference (empty circle)
```

**Example:**
```typescript
// Source: MDN stroke-dashoffset docs + CSS-Tricks countdown pattern
// https://css-tricks.com/how-to-create-an-animated-countdown-timer-with-html-css-and-javascript/

'use client'

import { useEffect, useRef, useState } from 'react'

const RADIUS = 45
const CIRCUMFERENCE = 2 * Math.PI * RADIUS  // 282.74

interface TimeTimerProps {
  duration: number        // seconds
  showDigits?: boolean    // optional, default false per UX-02
  onComplete?: () => void
  soundEnabled?: boolean  // optional tick + bell
}

export default function TimeTimer({ duration, showDigits = false, onComplete, soundEnabled = false }: TimeTimerProps) {
  const [remaining, setRemaining] = useState(duration)
  const [isRunning, setIsRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const progress = remaining / duration
  const dashoffset = CIRCUMFERENCE * (1 - progress)

  useEffect(() => {
    if (!isRunning || remaining <= 0) return
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [isRunning, onComplete])

  return (
    <svg viewBox="0 0 100 100" width={80} height={80} className="time-timer">
      {/* Background circle (grey track) */}
      <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      {/* Countdown arc (red segment that shrinks) */}
      <circle
        cx="50" cy="50" r={RADIUS}
        fill="none"
        stroke="#DC2626"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashoffset}
        style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}
      />
      {showDigits && (
        <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#1F2937">
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
        </text>
      )}
    </svg>
  )
}
```

### Pattern 2: SVG Radial Gradient for 3D Koko

**What:** Replace flat fill colors on Koko's head/body with `<radialGradient>` defined in `<defs>`. Light source top-left creates illusion of sphere depth. This is pure SVG, no external tools.

**When to use:** When a flat-colored SVG character needs to look 3D without adding canvas or WebGL.

**Example:**
```typescript
// Source: SVG specification, radialGradient element
// https://developer.mozilla.org/en-US/docs/Web/SVG/Element/radialGradient

<defs>
  <radialGradient id="headGrad" cx="35%" cy="30%" r="60%">
    <stop offset="0%" stopColor="#C8906A" />    {/* highlight */}
    <stop offset="100%" stopColor="#7A4428" />  {/* shadow */}
  </radialGradient>
  <radialGradient id="bodyGrad" cx="35%" cy="25%" r="65%">
    <stop offset="0%" stopColor="#A07050" />
    <stop offset="100%" stopColor="#5A3018" />
  </radialGradient>
</defs>
{/* Then: fill="url(#headGrad)" instead of fill="#A0704B" */}
```

### Pattern 3: Web Audio API Tone Generation for Timer Sounds

**What:** Generate tick sound (short 800Hz sine burst, 30ms) and bell sound (longer 660Hz sine with decay) using `OscillatorNode`. Single `AudioContext` stored in `useRef` and reused across all calls. Must be created/resumed inside a user gesture handler.

**When to use:** Short notification sounds in web apps without requiring audio file assets.

**Example:**
```typescript
// Source: MDN Web Audio API Best Practices
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices

const audioCtxRef = useRef<AudioContext | null>(null)

function getAudioCtx(): AudioContext {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new AudioContext()
  }
  // Resume if suspended (autoplay policy)
  if (audioCtxRef.current.state === 'suspended') {
    audioCtxRef.current.resume()
  }
  return audioCtxRef.current
}

function playTick() {
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 800
  osc.type = 'sine'
  gain.gain.setValueAtTime(0.1, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.03)
}

function playBell() {
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 660
  osc.type = 'sine'
  gain.gain.setValueAtTime(0.4, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 1.5)
}
```

### Pattern 4: Tailwind v4 Custom Animation Utilities

**What:** In Tailwind v4, custom animations are defined inside the `@theme` block in `globals.css`. This makes them available as `animate-*` utility classes in JSX. Keyframes defined inside `@theme` are tree-shaken.

**When to use:** Any new animation class needed on Koko or TimeTimer elements.

**Example:**
```css
/* Source: https://tailwindcss.com/docs/animation */
/* In globals.css — inside @theme block */

@theme {
  --animate-koko-surprised: koko-surprised 0.4s ease-out;

  @keyframes koko-surprised {
    0% { transform: translateY(0) scale(1); }
    30% { transform: translateY(-6px) scale(1.05); }
    100% { transform: translateY(0) scale(1); }
  }
}

/* Usage in JSX: className="animate-koko-surprised" */
```

**Note:** For Koko animations triggered by emotion CSS class (`.koko-happy .koko-svg`), the existing pattern in `globals.css` (plain `@keyframes` outside `@theme`) is also valid — Tailwind v4 does not require all keyframes to be inside `@theme`.

### Pattern 5: transform-box for SVG Element Rotation

**What:** SVG elements default to `transform-origin: 0 0` (SVG viewport corner). To rotate/scale an element around its own center, set `transform-box: fill-box` and `transform-origin: center`.

**When to use:** Any CSS animation that rotates or scales an SVG child element (e.g., Koko's arm raise for `encouraging`, ear pulse for `listening`).

**Example:**
```css
/* Source: MDN transform-box, CSS-Tricks SVG transforms */
/* https://css-tricks.com/transforms-on-svg-elements/ */

.koko-encouraging .koko-arm-right {
  transform-box: fill-box;
  transform-origin: center top; /* rotate from shoulder */
  transform: rotate(-20deg);
}

.koko-listening .koko-ear-right {
  transform-box: fill-box;
  transform-origin: center;
  animation: koko-ear-pulse 1s ease-in-out infinite;
}
```

**Note:** The existing `globals.css` uses explicit coordinate-based `transform-origin` (e.g., `transform-origin: 82px 25px`). This is correct but brittle — if SVG coordinates change, the origin must be updated manually. For new animations, prefer `transform-box: fill-box` + `transform-origin: center`.

### Anti-Patterns to Avoid

- **Animating `stroke` color or `fill` directly:** Causes paint recalculation (not GPU-composited). Use `opacity` transitions instead of color transitions.
- **Using `setInterval` for visual smoothness:** `setInterval(fn, 16)` is NOT a requestAnimationFrame replacement. Use it only for 1-second countdown tick; let CSS `transition` handle the visual interpolation.
- **Creating a new `AudioContext` per sound play:** Browsers limit concurrent contexts. Create once, reuse.
- **`will-change: transform` on every Koko element:** Only apply to actively animating elements. Over-applying exhausts GPU memory on low-end Android.
- **SVG `<filter>` for drop-shadow on animated elements:** Paint-heavy. If using drop-shadow on Koko, apply it statically on the outer `<div>`, not on SVG elements.
- **Replacing SessionTimer entirely:** The existing session limit + warning modal logic in `SessionTimer.tsx` must be preserved. TimeTimer is a visual companion or replacement of the numeric display only, not the full component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth arc animation | JavaScript RAF loop updating stroke-dashoffset every frame | CSS `transition: stroke-dashoffset 1s linear` | CSS transitions run on compositor thread; JS RAF adds main-thread work |
| 3D sphere effect | Three.js/WebGL sphere | SVG radial gradients | Zero dependency cost; renders as SVG vector; sufficient for cartoon avatar at this scale |
| Tick/bell sound | `.mp3` file assets | Web Audio API OscillatorNode | No file hosting; programmatic; ~10 lines of code |
| Audio file management | howler.js or Tone.js | Native Web Audio API | App only needs 2 simple tones; library is overkill |
| Emotion state machine | Custom Redux/Zustand state | Existing `useKokoState.ts` hook | Already built and integrated; extend, don't replace |
| CSS animation utilities | Tailwind plugins | `@theme` block in `globals.css` | Tailwind v4 built-in pattern; no plugin needed |

**Key insight:** Both components in this phase are achievable with zero new npm dependencies. The technology stack (SVG + CSS + Web Audio API) is native browser API — stable, well-documented, and already partially implemented in the codebase.

---

## Common Pitfalls

### Pitfall 1: SVG transform-origin breaks animation
**What goes wrong:** Koko body parts rotate or scale from the wrong point (top-left corner of SVG viewport instead of the element's center).
**Why it happens:** SVG coordinate system defaults `transform-origin: 0 0` referenced to the SVG viewport. CSS `transform-origin: center` does not work unless `transform-box: fill-box` is also set.
**How to avoid:** For any new CSS animation on Koko SVG child elements, always set both:
```css
transform-box: fill-box;
transform-origin: center; /* or specific anchor like center top */
```
**Warning signs:** Arm appears to rotate around `(0,0)` corner, not the shoulder joint.

### Pitfall 2: stroke-dashoffset direction is counter-intuitive
**What goes wrong:** Timer arc shrinks from the wrong direction, or goes clockwise when clockwise was expected.
**Why it happens:** SVG circles start at the 3 o'clock position (right side). Increasing `strokeDashoffset` hides the stroke from the START of the dash, not the end.
**How to avoid:** Rotate the circle -90deg so the arc starts at the top (12 o'clock):
```css
style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}
```
Use `strokeDashoffset = circumference * (1 - remaining/total)` so the arc shrinks as time decreases (not grows).
**Warning signs:** Timer appears to fill up instead of drain.

### Pitfall 3: AudioContext blocked by autoplay policy
**What goes wrong:** `playTick()` or `playBell()` silently fails on mobile, no audio plays.
**Why it happens:** Mobile browsers (Chrome Android, Safari iOS) block AudioContext creation/resume unless triggered by a user gesture event handler (click, touchend).
**How to avoid:** Create the AudioContext lazily inside a user interaction handler. Resume if suspended:
```typescript
if (audioCtxRef.current?.state === 'suspended') {
  await audioCtxRef.current.resume()
}
```
Link the "sound enabled" toggle button to also unlock the context.
**Warning signs:** No errors in console but no audio; `audioCtx.state === 'suspended'` stays true.

### Pitfall 4: CSS animation conflicts between emotion states
**What goes wrong:** When emotion changes rapidly (e.g., `thinking` → `happy` → `thinking`), the `koko-sway` animation restarts from frame 0 creating a jerk, or animations from previous states bleed through.
**Why it happens:** CSS animations on an element restart when the class is re-added, even if the animation was already mid-cycle. State changes that rapidly flip classes cause flicker.
**How to avoid:** Koko emotions change at most once per AI response (not per frame). The existing `useKokoState.ts` already has a `setTemporaryEmotion` with duration guard. Keep emotion transitions at human-scale timing (minimum ~500ms per state).
**Warning signs:** Koko appears to "snap" or "jerk" during rapid conversation back-and-forth.

### Pitfall 5: `setInterval` drift in time display
**What goes wrong:** After 10 minutes the TimeTimer shows 2-3 seconds drift from actual wall time.
**Why it happens:** `setInterval` with 1000ms does not fire exactly every 1000ms; it accumulates latency when the tab is in background, CPU is busy, etc.
**How to avoid:** Record `startTime = Date.now()` when timer starts. In each tick, compute `remaining = duration - Math.floor((Date.now() - startTime) / 1000)` instead of decrementing a counter. This keeps the display accurate to wall time regardless of interval drift.
**Warning signs:** Timer shows 9:02 remaining when only 9 minutes have elapsed.

### Pitfall 6: KokoAvatar surprised emotion not in type union
**What goes wrong:** TypeScript error: `Type '"surprised"' is not assignable to type 'KokoEmotion'`.
**Why it happens:** `koko.ts` currently defines `KokoEmotion = 'idle' | 'happy' | 'thinking' | 'encouraging' | 'listening' | 'speaking'` — `surprised` is absent.
**How to avoid:** Add `'surprised'` to the union in `koko.ts` BEFORE implementing the emotion in `KokoAvatar.tsx` and `useKokoState.ts`. This is a single-file change that unblocks the rest.
**Warning signs:** TypeScript build errors; emotion never renders because it falls through to no matching branch.

### Pitfall 7: `<filter>` drop-shadow degrades performance on animated SVG
**What goes wrong:** Koko avatar causes noticeable frame drops on low-end Android when bouncing with `koko-bounce-happy`.
**Why it happens:** SVG `<filter>` effects (feDropShadow, feGaussianBlur) are computed per-frame during animation. On low-end GPU this is expensive.
**How to avoid:** Apply drop-shadow as a CSS `filter` on the outer `<div>`, not on SVG elements. Better yet, use a static `box-shadow` on the container div. Limit to one shadow effect total.
```css
/* GOOD: on outer div, not on SVG elements */
.koko-avatar {
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));
}
```
**Warning signs:** DevTools performance trace shows "Paint" events every frame during Koko animation.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### TimeTimer — Complete minimal implementation
```typescript
// Source: MDN stroke-dashoffset (Baseline widely available since 2017)
// Pattern: React state controls dashoffset; CSS transition handles smooth arc animation

'use client'

import { useEffect, useRef, useState } from 'react'

const RADIUS = 45
const CIRCUMFERENCE = 2 * Math.PI * RADIUS  // 282.743...

interface TimeTimerProps {
  duration: number          // total seconds (e.g., 600 = 10 min)
  showDigits?: boolean      // default false per UX-02
  soundEnabled?: boolean
  onComplete?: () => void
  className?: string
}

export default function TimeTimer({
  duration,
  showDigits = false,
  soundEnabled = false,
  onComplete,
  className = '',
}: TimeTimerProps) {
  const [remaining, setRemaining] = useState(duration)
  const startTimeRef = useRef<number>(Date.now())
  const audioCtxRef = useRef<AudioContext | null>(null)
  const doneRef = useRef(false)

  // Wall-clock accurate countdown (avoids setInterval drift)
  useEffect(() => {
    doneRef.current = false
    startTimeRef.current = Date.now()
    setRemaining(duration)

    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const left = Math.max(0, duration - elapsed)
      setRemaining(left)

      if (soundEnabled && left > 0 && left % 60 === 0) {
        playTick()
      }

      if (left === 0 && !doneRef.current) {
        doneRef.current = true
        clearInterval(tick)
        if (soundEnabled) playBell()
        onComplete?.()
      }
    }, 500)  // check twice per second to catch the 0 boundary reliably

    return () => clearInterval(tick)
  }, [duration]) // eslint-disable-line react-hooks/exhaustive-deps

  function getAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  function playTick() {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 800; osc.type = 'sine'
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
    osc.start(); osc.stop(ctx.currentTime + 0.04)
  }

  function playBell() {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 523  // C5
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0)
    osc.start(); osc.stop(ctx.currentTime + 2.0)
  }

  const progress = duration > 0 ? remaining / duration : 0
  // When progress=1 (start): dashoffset=0 (full red arc)
  // When progress=0 (done):  dashoffset=circumference (no red arc)
  const dashoffset = CIRCUMFERENCE * (1 - progress)

  const urgentColor = remaining <= 60 ? '#EF4444' : '#DC2626'

  return (
    <svg
      viewBox="0 0 100 100"
      className={`time-timer ${className}`}
      aria-label={`Nog ${Math.floor(remaining / 60)} minuten`}
      role="timer"
    >
      {/* Track */}
      <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      {/* Red countdown arc */}
      <circle
        cx="50" cy="50" r={RADIUS}
        fill="none"
        stroke={urgentColor}
        strokeWidth="8"
        strokeLinecap="butt"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashoffset}
        style={{
          transition: 'stroke-dashoffset 0.5s linear',
          transform: 'rotate(-90deg)',
          transformOrigin: '50px 50px',
        }}
      />
      {showDigits && (
        <text
          x="50" y="55"
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#374151"
          fontFamily="sans-serif"
        >
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
        </text>
      )}
    </svg>
  )
}
```

### KokoAvatar — Radial gradient upgrade
```typescript
// Add to KokoAvatar.tsx SVG <defs> section
// Source: SVG radialGradient specification
// https://developer.mozilla.org/en-US/docs/Web/SVG/Element/radialGradient

<defs>
  <radialGradient id="kokoHeadGrad" cx="35%" cy="30%" r="60%">
    <stop offset="0%" stopColor="#D4956A" />
    <stop offset="60%" stopColor="#A0704B" />
    <stop offset="100%" stopColor="#6B4226" />
  </radialGradient>
  <radialGradient id="kokoBodyGrad" cx="35%" cy="25%" r="65%">
    <stop offset="0%" stopColor="#A07050" />
    <stop offset="100%" stopColor="#5A3018" />
  </radialGradient>
  <radialGradient id="kokoFaceGrad" cx="40%" cy="35%" r="55%">
    <stop offset="0%" stopColor="#EAC090" />
    <stop offset="100%" stopColor="#C48050" />
  </radialGradient>
</defs>

// Replace flat fills:
// fill="#A0704B" → fill="url(#kokoHeadGrad)"
// fill="#8B5E3C" → fill="url(#kokoBodyGrad)"
// fill="#D4A574" → fill="url(#kokoFaceGrad)"
```

### surprised emotion — SVG mouth and eyes
```typescript
// Add to KokoAvatar.tsx mouth group, after other emotion checks
// 'surprised': wide-open mouth (oval), raised eyebrows (shift eyes up slightly)
// Note: Add 'surprised' to koko.ts type union first

{emotion === 'surprised' && (
  <g className="koko-mouth-group">
    {/* Wide-open O mouth */}
    <ellipse cx="50" cy="44" rx="6" ry="7" fill="#3D2010" className="koko-mouth" />
    <ellipse cx="50" cy="44" rx="4" ry="5" fill="#6B1515" />
  </g>
)}

// In globals.css — surprised eyes (raised, wide):
.koko-surprised .koko-eye-left,
.koko-surprised .koko-eye-right {
  animation: none;
  transform: scaleY(1.3) translateY(-2px);
  transform-box: fill-box;
  transform-origin: center;
}

// Surprised body jump:
@keyframes koko-jump-surprised {
  0% { transform: translateY(0) scale(1); }
  25% { transform: translateY(-8px) scale(1.04, 0.97); }
  50% { transform: translateY(-4px) scale(0.97, 1.03); }
  100% { transform: translateY(0) scale(1); }
}

.koko-surprised .koko-svg {
  animation: koko-jump-surprised 0.4s ease-out 1;
}
```

### Tailwind v4 custom animation (globals.css @theme block)
```css
/* Source: https://tailwindcss.com/docs/animation */
/* Add to @theme block in globals.css */

@theme {
  --animate-timer-pulse: timer-pulse 1s ease-in-out infinite;

  @keyframes timer-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
}

/* Usage: <svg className="animate-timer-pulse"> when time < 60s */
```

### prefers-reduced-motion guard (globals.css)
```css
/* Source: MDN prefers-reduced-motion, Josh W. Comeau pattern */
/* Add to globals.css — wraps all Koko keyframe animations */

@media (prefers-reduced-motion: reduce) {
  .koko-avatar * {
    animation: none !important;
    transition: none !important;
  }
  .time-timer circle {
    transition: none !important;
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Numeric countdown `MM:SS` | Visual SVG Time Timer (red arc) | Phase 8 | Children understand time visually; no reading required |
| Flat SVG fills | Radial gradient "3D-style" fills | Phase 8 | More engaging cartoon look without 3D library |
| Tailwind config.js keyframes | `@theme` block in CSS (Tailwind v4) | Tailwind v4 (2024) | CSS-first; utilities auto-generated; no build config needed |
| Fixed `transform-origin: Xpx Ypx` | `transform-box: fill-box; transform-origin: center` | Modern CSS | More robust; survives SVG coordinate refactoring |
| `setInterval` decrement counter | Wall-clock diff (`Date.now() - startTime`) | Phase 8 | No drift over 10-minute sessions |

**Deprecated/outdated patterns found in existing code:**
- `transform-origin: 82px 25px` in globals.css (works, but brittle). New animations should use `transform-box: fill-box`.
- `window.setTimeout` cast to `number` in Whiteboard.tsx (TypeScript workaround, not wrong but non-standard). New timer code should use `ReturnType<typeof setInterval>`.

---

## Open Questions

1. **Where does TimeTimer live in the ChatInterface header?**
   - What we know: SessionTimer currently renders text `MM:SS` in the header bar alongside KokoAvatar.
   - What's unclear: Should TimeTimer replace the text entirely (cleaner), or appear as companion alongside text (more info for older children)?
   - Recommendation: Replace the text display with TimeTimer SVG (80x80px). Keep `showDigits={false}` by default, allow parent to pass `showDigits` prop for older children. The session limit modal and `router.back()` logic stays in SessionTimer.tsx — TimeTimer is purely visual.

2. **Should `surprised` be added to KokoEmotion or re-use an existing emotion?**
   - What we know: Phase spec requires "minimaal 5 verschillende expressies". Current emotions: idle, happy, thinking, encouraging, listening, speaking = 6. `surprised` is mentioned in the plan description (08-01 specifically calls out "verrast").
   - What's unclear: Does `useKokoState.ts` have a natural trigger for "surprised"?
   - Recommendation: Add `surprised` as 7th emotion. Trigger: correct answer after a wrong attempt (consecutive_incorrect was >0 then correct). This can be a `setTemporaryEmotion('surprised', 1500)` call.

3. **Tick sound: every second or every minute?**
   - What we know: Classic Time Timer has no tick sound by default. The bell at end is the signature feature.
   - What's unclear: User preference not specified.
   - Recommendation: No tick sound by default. Bell at `remaining === 0`. Optional tick at minute boundaries (every 60 seconds) only when `soundEnabled={true}`. This is the least annoying pattern for children.

4. **TimeTimer size in the header at 80x80px — does it fit?**
   - What we know: ChatInterface header currently has: KokoAvatar (64px), SessionTimer text, whiteboard button, print button, voice toggle. On mobile (360px wide) this is already tight.
   - What's unclear: Whether TimeTimer replaces the text entirely or needs layout adjustment.
   - Recommendation: TimeTimer replaces the SessionTimer text display. The warning modal (`showWarning`) is triggered by the same elapsed-time comparison — embed TimeTimer in SessionTimer.tsx rather than making it fully independent. Use 56px size for the header.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — `stroke-dashoffset` (Baseline: Widely available since April 2017)
  https://developer.mozilla.org/en-US/docs/Web/CSS/stroke-dashoffset
- MDN Web Docs — Web Audio API Best Practices
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- Tailwind CSS v4 official docs — Animation
  https://tailwindcss.com/docs/animation
- MDN Web Docs — `transform-box`
  https://developer.mozilla.org/en-US/docs/Web/CSS/transform-box
- Codebase audit — `KokoAvatar.tsx`, `globals.css`, `useKokoState.ts`, `koko.ts`, `SessionTimer.tsx`, `ChatInterface.tsx` (all read directly)

### Secondary (MEDIUM confidence)
- CSS-Tricks — How to Create an Animated Countdown Timer with HTML, CSS and JavaScript
  https://css-tricks.com/how-to-create-an-animated-countdown-timer-with-html-css-and-javascript/
- CSS-Tricks — Transforms on SVG Elements
  https://css-tricks.com/transforms-on-svg-elements/
- zigpoll.com — SVG Animation Optimization for Mobile Browsers (multi-source aggregation)
  https://www.zigpoll.com/content/how-can-i-optimize-svg-animations-to-run-smoothly-on-both-desktop-and-mobile-browsers-without-significant-performance-loss
- Josh W. Comeau — prefers-reduced-motion in React
  https://www.joshwcomeau.com/react/prefers-reduced-motion/

### Tertiary (LOW confidence — noted for awareness)
- WebSearch: "CSS keyframe animation SVG 60fps low-end Android performance 2025" — General patterns verified by MDN; specific Android claim (68% sites struggle with GSAP) from unverified aggregator.
- WebSearch: "React useRef AudioBuffer Web Audio API tick bell sound" — Community patterns; verified core technique against MDN AudioContext docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all technologies are native browser APIs or already in codebase
- Architecture: HIGH — existing file structure is clear; new TimeTimer is a clean new component; KokoAvatar evolution is incremental
- Pitfalls: HIGH for transform-origin and dashoffset direction (verified against MDN); MEDIUM for AudioContext autoplay (MDN-verified pattern, but mobile behavior varies by browser version); MEDIUM for setInterval drift (well-known JavaScript issue)
- Koko 3D visual approach: MEDIUM — radial gradient technique is correct SVG; subjective outcome depends on color tuning

**Research date:** 2026-02-24
**Valid until:** 2026-06-01 (stable browser APIs; Tailwind v4 pattern stable; no rapidly-moving dependencies)
