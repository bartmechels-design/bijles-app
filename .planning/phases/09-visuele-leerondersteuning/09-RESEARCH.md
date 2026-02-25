# Phase 9: Visuele Leerondersteuning - Research

**Researched:** 2026-02-25
**Domain:** Visual learning support — whiteboard animation, KaTeX math rendering, interactive sentence analysis (zinsontleding), canvas scratchpad
**Confidence:** HIGH (codebase fully read; libraries verified via official docs/npm)

---

## Summary

Phase 9 adds four visual learning features to the existing AI tutor. The codebase already has a sophisticated `Whiteboard.tsx` component that renders AI board content (`[BORD]` blocks) with a line-by-line reveal animation driven by `setTimeout`. The animation is already functional — Phase 9 must *enhance* it with an SVG path-drawing (handwriting) effect per line rather than replacing the timer-based reveal. The existing architecture is clean: `ChatInterface` extracts `[BORD]` content and passes it to `WhiteboardPanel → Whiteboard` as a plain-text prop.

KaTeX is the clear choice for math rendering: faster bundle (~347 kB), synchronous rendering, server-side capable, and well-documented for Next.js App Router. The AI currently formats fractions as `1/4` plain text (no LaTeX in `[BORD]` blocks). To render fractions properly, the system prompt must be updated to emit KaTeX syntax (`\frac{1}{4}`) inside `[BORD]` blocks, and the `Whiteboard` component must call `katex.renderToString()` on any line containing `\frac`, `\times`, or other LaTeX tokens before rendering.

For the interactive zinsontleding (sentence analysis), the AI must emit a structured `[ZINSONTLEDING]` tag (similar to `[BORD]`) with JSON payload so the frontend can render clickable words with color assignment. No external NLP library is needed — Claude can parse Dutch sentences with high accuracy. For the scratchpad (kladblaadje), raw Canvas API via `react-sketch-canvas` (SVG-based, touch/stylus/mouse, exportImage method) is the right tool, with save-to-Supabase storage for parent/tutor viewing.

**Primary recommendation:** Use KaTeX (raw `katex` package, no react-katex wrapper) for math, raw Canvas PointerEvent API for the scratchpad (the project already has working canvas code in `Whiteboard.tsx`), and AI-driven structured JSON for zinsontleding — no third-party NLP needed.

---

## Codebase Audit (What Already Exists)

This is critical context for the planner. Read carefully before assigning any task.

### Whiteboard.tsx — Current State

**File:** `aruba-leren/src/components/tutor/Whiteboard.tsx`

**What it does:**
- Parses `[BORD]` content with `parseLines()` → classifies each line as `label`, `sum-number`, `sum-line`, or `text`
- Groups lines into `ContentBlock[]` (sums get grouped together for right-aligned column layout)
- Animates line-by-line reveal with `visibleLines` state + `setTimeout` (age-adaptive delay: 1200–2000ms per line)
- Draws background canvas (grid for rekenen, ruled lines for taal) via Canvas 2D API
- Has a **draw layer canvas** (PointerEvents, colors, wis button) already implemented — `drawingEnabled` prop
- Uses `transition-opacity duration-300` CSS for fade-in per block

**Current animation:** Lines *pop in* with a 300ms fade. NOT a writing/drawing effect.

**What Phase 9 needs to add:**
1. SVG `stroke-dashoffset` animation on each text line so it "writes" letter by letter (or word by word)
2. KaTeX rendering for lines containing LaTeX math syntax
3. Support for a new `[ZINSONTLEDING]` block type with clickable word spans

**Math handling today:** The system prompt instructs Koko to write fractions as `1/4` (plain text). The `[OPDRACHT]` block example in `system-prompts.ts` explicitly uses `1/4 + 1/4 = ___`. No KaTeX is currently in use anywhere.

### ChatInterface.tsx — Integration Point

The `[BORD]` auto-open whiteboard flow is:
```
AI response stream completes
→ hasBordBlocks() → extractBordContent()
→ setBoardContent(content)
→ setShowWhiteboard(true)
→ WhiteboardPanel receives boardContent prop
→ Whiteboard re-mounts (mountKey++) → animation restarts
```

For the scratchpad: a new `[KLADBLAADJE]` detection hook (similar to `hasBordBlocks`) must trigger showing the scratchpad panel when subject is `rekenen`.

For zinsontleding: a `[ZINSONTLEDING]...[/ZINSONTLEDING]` tag (like `[BORD]`) triggers opening an interactive panel.

### Existing Canvas Drawing Code

`Whiteboard.tsx` already has full pointer-event drawing on `drawCanvasRef`:
- `handlePointerDown`, `handlePointerMove`, `handlePointerUp`
- `setPointerCapture` for proper touch tracking
- Color palette (5 colors)
- `clearDrawing()` + `onDrawingChange` callback (exports dataURL)
- `touchAction: 'none'` when drawing enabled

The scratchpad (09-04) can **reuse this exact code** in a dedicated `Scratchpad.tsx` component, without importing any new library.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `katex` | `^0.16.28` | Math typesetting (fractions, ×, ÷) | Fastest web math renderer, ~347 kB, synchronous, no deps, SSR-capable |
| Raw Canvas API | (built-in) | Scratchpad drawing | Already implemented in Whiteboard.tsx — extract to Scratchpad component |
| CSS `stroke-dashoffset` animation | (built-in) | SVG writing effect | Zero-dep, GPU-accelerated, works on all mobile browsers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `framer-motion` | (already in ecosystem via shadcn) | Word-by-word reveal animation | Only if CSS transitions are insufficient for word highlight effect |
| Tailwind CSS | `^4` (already installed) | Styling colored word chips | Use existing setup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `katex` (direct) | `react-katex` or `@matejmazur/react-katex` | react-katex adds React wrapper overhead; direct katex gives full control and is simpler |
| `katex` | MathJax | MathJax is heavier (~700 kB+), async, overkill for elementary fractions |
| Raw canvas (Pointer API) | `react-sketch-canvas` 6.2.0 | react-sketch-canvas is last published June 2022, peerDeps may conflict with React 19; project already has working canvas code |
| AI-structured JSON | spaCy/Frog NLP | Server-side NLP adds infrastructure complexity; Claude understands Dutch grammar perfectly |
| CSS `stroke-dashoffset` | GSAP DrawSVG | GSAP adds ~68 kB bundle; CSS animation is sufficient and zero-cost |

**Installation:**
```bash
npm install katex
npm install --save-dev @types/katex
```
(No other new dependencies needed — scratchpad reuses existing canvas code.)

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/tutor/
│   ├── Whiteboard.tsx              # MODIFY: add KaTeX + SVG write animation + [ZINSONTLEDING] block
│   ├── WhiteboardPanel.tsx         # MODIFY: pass zinsontleding content; add scratchpad toggle tab
│   ├── Scratchpad.tsx              # NEW: extracted from Whiteboard drawing canvas
│   ├── ZinsontledingPanel.tsx      # NEW: interactive sentence coloring UI
│   └── ChatMessage.tsx             # MODIFY: add [ZINSONTLEDING] segment type
├── lib/ai/prompts/
│   ├── system-prompts.ts           # MODIFY: add KaTeX fraction format + [ZINSONTLEDING] instructions
│   └── subject-prompts.ts          # MODIFY: taal prompt — add zinsontleding color codes
```

### Pattern 1: KaTeX Line Rendering in Whiteboard

**What:** When a whiteboard line contains LaTeX syntax (detected by presence of `\frac`, `\times`, `\div`, `\sqrt`, or `$`), render it with `katex.renderToString()` and use `dangerouslySetInnerHTML`.

**When to use:** Any `text` or `label` line in `[BORD]` content that contains math.

**Example:**
```typescript
// Source: https://katex.org/docs/api
import katex from 'katex';
// CSS must be imported in layout or global CSS:
// import 'katex/dist/katex.min.css'

function renderMathLine(text: string): { html: string; hasMath: boolean } {
  const MATH_PATTERN = /\\frac|\\times|\\div|\\sqrt|\$|\^|_\{/;
  if (!MATH_PATTERN.test(text)) return { html: text, hasMath: false };

  try {
    const html = katex.renderToString(text, {
      throwOnError: false,      // show red error, don't crash
      displayMode: false,       // inline rendering
      output: 'html',
    });
    return { html, hasMath: true };
  } catch {
    return { html: text, hasMath: false }; // fallback to plain text
  }
}
```

**CSS import location:** Add to `aruba-leren/src/app/globals.css` or the root layout:
```typescript
// In layout.tsx or globals.css (not in 'use client' component)
import 'katex/dist/katex.min.css'
```

### Pattern 2: SVG Writing Animation (Typewriter/Drawing Effect)

**What:** Replace the instant `transition-opacity` line reveal with an SVG-based animated writing effect. Each text line is wrapped in an SVG `<text>` element with a `stroke-dasharray` equal to its total path length, animated from `stroke-dashoffset: length` to `0`.

**When to use:** For every new line appearing on the whiteboard.

**Implementation approach — CSS `stroke-dashoffset` with dynamic path length:**

```typescript
// Each line gets rendered inside an SVG with a CSS animation
// The dash animation gives a "pen drawing" appearance
// Source: CSS animation spec (MDN) + https://thecodedose.com/blog/animated-handwriting-effect-with-css/

function AnimatedTextLine({ text, delay }: { text: string; delay: number }) {
  return (
    <svg viewBox="0 0 400 40" className="w-full overflow-visible">
      <text
        x="0" y="30"
        className="whiteboard-text"
        style={{
          strokeDasharray: '1000',
          strokeDashoffset: '1000',
          animation: `write 0.8s ease forwards ${delay}ms`,
          fill: 'transparent',
          stroke: '#1E293B',
          strokeWidth: '0.5px',
          fontSize: '18px',
          fontFamily: 'sans-serif',
        }}
      >
        {text}
      </text>
    </svg>
  )
}
```

**Simpler alternative — CSS clip-path reveal (recommended for performance on Android):**

For low-end Android tablets, SVG path length calculation may be expensive. A CSS `clip-path` reveal is cheaper:
```css
@keyframes reveal-line {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0% 0 0); }
}
.line-animate {
  animation: reveal-line 0.6s ease-out forwards;
}
```

**Recommendation:** Use CSS `clip-path` reveal animation (not SVG stroke-dashoffset). It is:
- GPU-accelerated (compositor thread, not JS thread)
- Works with HTML text (no SVG wrapping needed)
- Compatible with KaTeX-rendered HTML
- Performant on low-end Android
- Visually reads as "text appearing left-to-right" which matches a writing effect

### Pattern 3: AI-Structured Zinsontleding Tag

**What:** Add a new `[ZINSONTLEDING]` tag to the AI system prompt. The AI outputs JSON with each word tagged by grammatical role.

**When to use:** When subject is `taal` and child is in klas 4-6.

**AI output format (in system prompt):**
```
[ZINSONTLEDING]
{
  "sentence": "De kat zit op de mat.",
  "words": [
    { "word": "De", "role": "LV", "label": "Lidwoord" },
    { "word": "kat", "role": "ONS", "label": "Onderwerp" },
    { "word": "zit", "role": "GEZ", "label": "Gezegde/PV" },
    { "word": "op", "role": "MWV", "label": "Meewerkend voorwerp" },
    { "word": "de", "role": "LV", "label": "Lidwoord" },
    { "word": "mat", "role": "LV_NOUN", "label": "Lijdend voorwerp" }
  ]
}
[/ZINSONTLEDING]
```

**Color mapping:**
```typescript
// Source: Phase 9 requirements (VIS-03)
const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PV:   { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Persoonsvorm' },
  GEZ:  { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Gezegde' },
  ONS:  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Onderwerp' },
  LV:   { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Lijdend voorwerp' },
  MWV:  { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Meewerkend voorwerp' },
  NONE: { bg: 'bg-gray-100',   text: 'text-gray-600',   label: '' },
}
```

**Interactive mode:** Child can click uncolored words to assign a role. Click a word → show role picker (5 color buttons) → assign role → word gets colored.

### Pattern 4: Scratchpad Component

**What:** Dedicated `Scratchpad.tsx` component — reuses the exact drawing logic already in `Whiteboard.tsx`. Key differences: always-visible, prominent "Kladblaadje" header, saves canvas snapshot to Supabase storage.

**When to use:** Shown whenever AI sends a `[REKENVRAAG]` signal in a rekenen session, OR whenever `subject === 'rekenen'` and there is an active problem on the board.

**Auto-detect rekenvraag:**
```typescript
// Detect in ChatInterface.tsx after stream completes
function hasRekenvraag(content: string, subject: Subject): boolean {
  if (subject !== 'rekenen') return false;
  // Option A: explicit [KLADBLAADJE] tag from AI
  if (/\[KLADBLAADJE\]/.test(content)) return true;
  // Option B: heuristic — AI put something on [BORD] for rekenen
  if (/\[BORD\]/.test(content)) return true;
  return false;
}
```

**Save to Supabase storage:**
```typescript
// Convert canvas to Blob, upload to Supabase storage
// Source: https://supabase.com/docs/reference/javascript/storage-from-upload
async function saveScratchpad(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  sessionId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  return new Promise((resolve) => {
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) return resolve(null);
      const path = `scratchpads/${sessionId}/${Date.now()}.png`;
      const { error } = await supabase.storage
        .from('scratchpads')
        .upload(path, blob, { contentType: 'image/png' });
      if (error) return resolve(null);
      const { data } = supabase.storage.from('scratchpads').getPublicUrl(path);
      resolve(data.publicUrl);
    }, 'image/png');
  });
}
```

### Anti-Patterns to Avoid

- **Don't import react-katex or @matejmazur/react-katex** — they add React wrapper overhead and the underlying `katex` package is simpler. Direct `katex.renderToString()` is sufficient.
- **Don't use `dangerouslySetInnerHTML` with unsanitized user content** — KaTeX output is safe (generated by KaTeX from AI-controlled LaTeX, not user input), but still only use it for KaTeX-rendered output.
- **Don't animate with `animationFrame` + JS per-character** — this kills performance on Android. Use CSS `clip-path` or `stroke-dashoffset` which run on the compositor thread.
- **Don't parse zinsontleding with client-side NLP** — spaCy/Frog require a backend. Claude handles Dutch grammar well; structured AI output is simpler and more accurate.
- **Don't block the scratchpad behind a click** — VIS-04 requires a "niet-wegklikbare herinnering" (un-dismissible reminder). The scratchpad should auto-appear and stay visible.
- **Don't save base64 to Supabase directly** — convert to Blob first, then upload as binary. See Pattern 4 above.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Math fraction rendering | Custom CSS fraction layout | `katex.renderToString()` | Edge cases: nested fractions, alignment, mixed math; KaTeX handles all of this |
| Canvas touch drawing | Custom pointer event state machine | Reuse existing `Whiteboard.tsx` drawing code | Already handles `setPointerCapture`, `touchAction:none`, multi-touch |
| Dutch grammar parsing | Custom regex parser | Structured AI output `[ZINSONTLEDING]` JSON | Claude understands Dutch grammar; regex breaks on complex sentences |
| Text writing animation | JS per-character animation loop | CSS `clip-path` reveal or `stroke-dashoffset` | JS animation loops degrade on low-end Android; CSS animations are compositor-threaded |

**Key insight:** The project already has most of what Phase 9 needs. The scratchpad IS Whiteboard's drawing canvas, just extracted. The animation IS the existing timeout reveal, just with a CSS animation added. The math rendering IS a single `katex.renderToString()` call. The heavy lifting is in the system prompt changes (teaching the AI new output formats) and the UI wiring.

---

## Common Pitfalls

### Pitfall 1: KaTeX CSS Not Loaded
**What goes wrong:** Math renders as broken/unstyled HTML. KaTeX renders HTML + CSS classes; without the CSS, everything looks wrong.
**Why it happens:** Developers import `katex` in a `'use client'` component but forget the CSS import.
**How to avoid:** Import `katex/dist/katex.min.css` in the root layout (`layout.tsx`) or `globals.css`, not inside the component. Next.js App Router requires CSS imports at the module level.
**Warning signs:** Math HTML appears but numbers are misaligned, fractions look broken.

### Pitfall 2: KaTeX ParseError Crashes Whiteboard
**What goes wrong:** AI outputs malformed LaTeX (e.g., `\frac{1}` instead of `\frac{1}{4}`), `katex.renderToString()` throws, the whole whiteboard crashes.
**Why it happens:** AI models occasionally produce slightly malformed LaTeX.
**How to avoid:** Always pass `{ throwOnError: false }` to KaTeX. Wrap in try/catch and fall back to plain text. Log the error for debugging.
**Warning signs:** Whiteboard goes blank when a math question is asked.

### Pitfall 3: SVG Stroke Animation Not Performant on Android
**What goes wrong:** The "writing" animation stutters or drops to 15fps on budget Android tablets.
**Why it happens:** SVG `stroke-dashoffset` animation with complex paths is CPU-intensive on underpowered devices.
**How to avoid:** Use CSS `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` animation instead. This is compositor-threaded and doesn't require path length calculation.
**Warning signs:** Animation stutters during testing on a ~$100 Android tablet.

### Pitfall 4: Zinsontleding JSON Parsing Failure
**What goes wrong:** AI outputs malformed JSON inside `[ZINSONTLEDING]` block; `JSON.parse()` throws; component crashes.
**Why it happens:** AI streaming can produce partial JSON; also AI occasionally makes formatting mistakes.
**How to avoid:** Always wrap `JSON.parse()` in try/catch. Show "Koko maakt een fout — probeer opnieuw" message on parse error. Validate that `words` is an array before rendering.
**Warning signs:** Zinsontleding panel stays empty or shows an error.

### Pitfall 5: Scratchpad Shows Even When Not Needed
**What goes wrong:** Scratchpad appears for every rekenen message, even when no problem is on the board yet (e.g., greeting messages, feedback messages).
**Why it happens:** Naive detection: `subject === 'rekenen'` → always show.
**How to avoid:** Only show scratchpad when AI has put content on `[BORD]` (whiteboard is active) OR when AI includes `[KLADBLAADJE]` signal. If only a greeting is sent, don't show.
**Warning signs:** Scratchpad appears from session start before any problem is posed.

### Pitfall 6: Canvas toBlob() Timing on iOS Safari
**What goes wrong:** `canvas.toBlob()` returns null on iOS Safari for offscreen or low-DPI canvases.
**Why it happens:** iOS Safari has quirks with canvas serialization when the canvas hasn't been painted to (empty canvas).
**How to avoid:** Check that the canvas has actual content before calling `toBlob()`. Provide a "Opslaan" button the child presses; don't auto-save empty canvases.
**Warning signs:** Parent sees null/empty scratchpad images in their portal.

### Pitfall 7: react-sketch-canvas React 19 Peer Dep Conflict
**What goes wrong:** `npm install react-sketch-canvas` fails or produces peer dep warnings with React 19.2.3.
**Why it happens:** react-sketch-canvas 6.2.0 was last published June 2022 and declares `react: ">=16.8"` — this should technically work with React 19, but may require `--legacy-peer-deps`.
**How to avoid:** Don't use react-sketch-canvas. The project already has working canvas drawing code in `Whiteboard.tsx`. Extract it into `Scratchpad.tsx` directly.
**Warning signs:** `npm install` produces ERESOLVE errors.

---

## Code Examples

Verified patterns from official sources:

### KaTeX Fraction Rendering
```typescript
// Source: https://katex.org/docs/api
import katex from 'katex';

// In component (must be 'use client')
const mathHtml = katex.renderToString('\\frac{3}{4}', {
  throwOnError: false,
  displayMode: true,   // true = block display (big fraction), false = inline
  output: 'html',
});

// Usage in JSX:
<div dangerouslySetInnerHTML={{ __html: mathHtml }} />
```

### KaTeX CSS Global Import
```typescript
// In aruba-leren/src/app/[locale]/layout.tsx (server component — fine for CSS)
import 'katex/dist/katex.min.css'
```

### CSS Clip-Path Writing Animation
```css
/* In globals.css */
@keyframes reveal-line {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0% 0 0); }
}

.whiteboard-line-animate {
  animation: reveal-line 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}
```

```typescript
// In Whiteboard.tsx — apply class to each revealed line
<div
  key={blockIdx}
  className="whiteboard-line-animate"
  style={{ animationDelay: `${blockIdx * 200}ms` }}
>
  {/* line content */}
</div>
```

### Scratchpad Canvas Export + Supabase Upload
```typescript
// Source: https://supabase.com/docs/reference/javascript/storage-from-upload
// Convert canvas → blob → upload
const canvas = canvasRef.current;
canvas?.toBlob(async (blob) => {
  if (!blob) return;
  const arrayBuffer = await blob.arrayBuffer();
  const { error } = await supabase.storage
    .from('scratchpads')
    .upload(`scratchpads/${sessionId}/${Date.now()}.png`, arrayBuffer, {
      contentType: 'image/png',
      upsert: false,
    });
}, 'image/png');
```

### Zinsontleding Safe JSON Parse
```typescript
// Parse AI [ZINSONTLEDING] block content
interface ZinsWord {
  word: string;
  role: string;
  label: string;
}
interface ZinsData {
  sentence: string;
  words: ZinsWord[];
}

function parseZinsontleding(raw: string): ZinsData | null {
  try {
    const data = JSON.parse(raw) as ZinsData;
    if (!Array.isArray(data.words)) return null;
    return data;
  } catch {
    return null; // AI output was malformed
  }
}
```

### System Prompt Additions for KaTeX (additions to system-prompts.ts)
```typescript
// Add to KOKO_BASE_PROMPT or subject-specific rekenen prompt:
const MATH_FORMAT_RULES = `
# Wiskundige Notatie — VERPLICHT FORMAT

Wanneer je breuken schrijft op het schoolbord ([BORD] tag), gebruik je ALTIJD KaTeX-notatie:
- Breuk: \\frac{teller}{noemer} — NOOIT 1/4 of 1:4
- Vermenigvuldigen: \\times — NOOIT x of *
- Delen: \\div — NOOIT /
- Kwadraat: ^{2}

Voorbeeld GOED:
[BORD]
STAP: \\frac{1}{4} + \\frac{2}{4} = ?
STAP: \\frac{3}{4}
ANTWOORD: \\frac{3}{4}
[/BORD]

Voorbeeld FOUT (doe dit NOOIT):
[BORD]
STAP: 1/4 + 2/4 = ?
[/BORD]
`;
```

### [ZINSONTLEDING] System Prompt Addition
```typescript
// Add to subject-prompts.ts taal section (klas 4-6):
const ZINSONTLEDING_FORMAT = `
# Zinsontleding — [ZINSONTLEDING] tag

Wanneer je een zin ontleedt voor klas 4-6, gebruik je de [ZINSONTLEDING] tag:

Kleuren:
- PV = persoonsvorm → rood
- GEZ = gezegde → oranje
- ONS = onderwerp → blauw
- LV = lijdend voorwerp → groen
- MWV = meewerkend voorwerp → paars

Format (ALTIJD geldige JSON):
[ZINSONTLEDING]
{
  "sentence": "De kat zit op de mat.",
  "words": [
    { "word": "De", "role": "NONE" },
    { "word": "kat", "role": "ONS", "label": "Onderwerp" },
    { "word": "zit", "role": "PV", "label": "Persoonsvorm" },
    { "word": "op", "role": "NONE" },
    { "word": "de", "role": "NONE" },
    { "word": "mat", "role": "NONE" }
  ]
}
[/ZINSONTLEDING]

Gebruik role: "NONE" voor woorden die geen zinsdeelfunctie hebben (lidwoorden, voorzetsels).
`;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MathJax (heavy, async) | KaTeX (fast, sync) | ~2015-2018 | KaTeX is now ecosystem standard for web math |
| SVG SMIL animation | CSS animation + Web Animations API | ~2020 | SMIL deprecated in browsers; CSS is GPU-accelerated |
| canvas-draw libraries | Raw Canvas API / react-sketch-canvas | Ongoing | Libraries often stale; raw API is sufficient for simple drawing |
| Server-side NLP for sentence parsing | LLM-structured output | ~2023 | LLMs handle grammatical parsing accurately without separate service |

**Deprecated/outdated:**
- `react-canvas-draw`: Last meaningful update 2022, low stars (913), not maintained — do not use.
- SVG SMIL `<animate>` tag: Removed from Chrome 45+. Use CSS animations instead.
- `react-katex` (vinothpandian): Thin wrapper with no benefit over direct `katex` usage; peer dep issues possible.

---

## Open Questions

1. **Scratchpad storage bucket**
   - What we know: Supabase storage works well for images (blobs). A `scratchpads` bucket needs to be created.
   - What's unclear: Whether scratchpad images should be tied to sessions (via `session_id`) or to individual questions.
   - Recommendation: Use path `scratchpads/{childId}/{sessionId}/{timestamp}.png`. Create the bucket in a migration. Make it private (RLS: parent can read own child's scratchpads).

2. **Whiteboard animation — clip-path vs stroke-dashoffset**
   - What we know: Clip-path is simpler and more performant. Stroke-dashoffset looks more "authentic" (handwriting) but requires SVG wrapping.
   - What's unclear: Whether children/teachers care about visual authenticity vs smoothness on low-end devices.
   - Recommendation: Default to clip-path reveal. Phase 9-01 plan should decide which approach and stick to it.

3. **KaTeX in [OPDRACHT] blocks**
   - What we know: The AI also writes math in `[OPDRACHT]` blocks (exercise cards). These are rendered in `ChatMessage.tsx` as plain whitespace-pre-wrap text.
   - What's unclear: Should KaTeX also apply to `[OPDRACHT]` blocks? Currently they show fractions as `1/4`.
   - Recommendation: Yes — apply the same KaTeX detection + rendering to OPDRACHT blocks. But scope this within the Phase 9-02 KaTeX plan to avoid scope creep.

4. **Zinsontleding scope: klas 1-3 vs 4-6**
   - What we know: Zinsontleding (sentence analysis) is klas 5-6 content per subject-prompts.ts. Klas 1-3 do not do this.
   - What's unclear: Should the `[ZINSONTLEDING]` tag be gated by child grade in the AI prompt?
   - Recommendation: Yes — add grade check to the subject prompt. Only enable for `childGrade >= 4`.

---

## Sources

### Primary (HIGH confidence)
- Codebase read: `aruba-leren/src/components/tutor/Whiteboard.tsx` — full component architecture
- Codebase read: `aruba-leren/src/components/tutor/ChatInterface.tsx` — integration points
- Codebase read: `aruba-leren/src/components/tutor/ChatMessage.tsx` — segment parsing
- Codebase read: `aruba-leren/src/lib/ai/prompts/system-prompts.ts` — [BORD] tag format
- Codebase read: `aruba-leren/package.json` — confirmed React 19.2.3, Next.js 16.1.6, no existing KaTeX
- https://katex.org/docs/api — KaTeX API (renderToString, throwOnError, displayMode options)
- https://katex.org/docs/options — KaTeX configuration options

### Secondary (MEDIUM confidence)
- https://dev.to/kirankulkarni/next-js-14-katex-web-app-30ld — KaTeX + Next.js App Router pattern (2024)
- https://supabase.com/docs/reference/javascript/storage-from-upload — Supabase storage upload API
- https://github.com/vinothpandian/react-sketch-canvas — react-sketch-canvas: last published June 2022, v6.2.0, SVG-based
- BigGo News Nov 2025: KaTeX ~347 kB bundle; MathJax 3 has closed performance gap but still heavier

### Tertiary (LOW confidence)
- WebSearch: react-sketch-canvas React 19 peer dep issues — confirmed pattern (old peerDeps declarations) but not specifically tested
- WebSearch: CSS clip-path animation performance on Android — multiple sources confirm compositor-threaded, but no specific Aruba device benchmarks available

---

## Metadata

**Confidence breakdown:**
- Standard stack (KaTeX, raw Canvas): HIGH — official docs read, codebase confirmed no existing math library
- Architecture (how [BORD] flows): HIGH — full source code read
- Pitfalls (KaTeX CSS, throwOnError): HIGH — from official docs
- Animation approach: MEDIUM — CSS clip-path preferred but no Android device benchmark
- Zinsontleding JSON format: MEDIUM — approach is sound but AI output format is new (untested)
- Scratchpad save flow: MEDIUM — Supabase storage API confirmed; bucket setup and RLS policy are new work

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable libraries; AI prompt format may need iteration after first test)
