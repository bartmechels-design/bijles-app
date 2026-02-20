# Phase 6: Advanced Tutor Features & Content Management - Research

**Researched:** 2026-02-20
**Domain:** PDF generation, leerstof upload & retrieval, hiaten practice UX, curriculum alignment, admin content management
**Confidence:** HIGH (codebase read directly; library research verified via npmjs/official docs/WebSearch)

---

## Summary

Phase 6 adds five distinct capabilities on top of the working Phase 4-5 tutor foundation: (1) printable PDF werkbladen generated client-side after practice sessions, (2) targeted hiaten practice where the child picks a specific topic and Koko focuses only on that, (3) a leerstof upload system for teachers/tutors so Koko can use uploaded text in its system prompt for zaakvakken, (4) an admin UI to manage uploaded leerstof, and (5) formalizing the system prompt against Arubaanse Kerndoelen for kernvakken.

The existing codebase already handles image uploads (homework), streaming AI responses, Supabase Storage (payment-proofs bucket), session management, and a `buildSystemPrompt()` function that accepts dynamic content sections. This makes Phase 6 largely additive: new database tables, new prompt injections, new UI panels, and one new server route for PDF download or leerstof CRUD.

The huiswerk support question has a concrete answer from the codebase: the upload-and-analyze flow is **already complete** (ChatInterface shows the camera button, PhoneUploadModal handles QR codes, the chat API handles multimodal Claude messages). What is missing is **structured huiswerk session tracking** (a dedicated session type + a post-session summary/next-steps prompt).

**Primary recommendation:** Implement the five features as separate plans in complexity order: hiaten selection (prompt injection only) → PDF werkblad (client-side browser print) → huiswerk session type → leerstof upload (Supabase Storage + text injection) → admin leerstof management.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | App framework | Already in use |
| @supabase/supabase-js | ^2.95.3 | Database + Storage | Already in use, storage proven for payment-proofs |
| ai (Vercel AI SDK) | ^6.0.84 | Streaming Claude responses | Already in use |
| @ai-sdk/anthropic | ^3.0.43 | Anthropic provider | Already in use |
| react | 19.2.3 | UI | Already in use |
| tailwindcss | ^4 | Styling | Already in use |

### New Libraries Needed

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| react-to-print | ^3.2.0 | Browser-native print/PDF | React 19 compatible, no server dependency, 3.2.0 explicitly lists React 19 in peer deps. Simpler than @react-pdf/renderer for this use case. |
| pdf-parse | ^1.1.1 | Extract text from uploaded PDFs server-side | Pure Node.js, no native binaries, works in Next.js API routes. Lighter than pdf2json for plain text extraction. |

### Libraries Rejected

| Library | Reason Rejected |
|---------|----------------|
| @react-pdf/renderer 4.3.x | Uses `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` from React internals; breaks with Next.js 15/16 App Router server components. PDFDownloadLink cannot SSR. Requires `dynamic({ ssr: false })` workarounds AND still has known App Router route handler crashes. Over-engineered for printable worksheets. |
| jsPDF | Rasterizes to image internally for complex layouts — text is not selectable in output. Poor CSS layout support. |
| Puppeteer | Requires a headless Chrome binary. Cannot run in Vercel Edge/serverless. Adds ~150MB to deployment. Overkill for simple worksheets. |
| pgvector / full RAG | Full vector embeddings are over-engineered for this app's scale. Content is short (1-2 page werkbladen), per-subject, and retrieved by subject key — not by semantic query. Simple text injection into system prompt is sufficient and free. |
| pdf2json | Works but `serverComponentsExternalPackages` config required in next.config.ts. pdf-parse is simpler for plain text extraction without coordinate data. |

**Installation:**
```bash
npm install react-to-print pdf-parse
npm install --save-dev @types/pdf-parse
```

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
aruba-leren/src/
├── app/[locale]/
│   ├── api/
│   │   ├── leerstof/
│   │   │   ├── upload/route.ts      # POST: teacher uploads leerstof text/PDF
│   │   │   ├── list/route.ts        # GET: admin lists all leerstof
│   │   │   └── [id]/route.ts        # DELETE: admin removes leerstof
│   ├── admin/
│   │   └── leerstof/page.tsx        # Admin: view/delete uploaded leerstof
│   ├── tutor/[childId]/[subject]/
│   │   └── page.tsx                 # EXTENDED: receives hiatenContext prop
├── components/
│   ├── tutor/
│   │   ├── WerkbladPrint.tsx        # Printable worksheet component
│   │   ├── HiatenSelector.tsx       # Topic/hiaat picker UI
│   │   └── WerkbladButton.tsx       # "Print Werkblad" button in chat
│   └── leerstof/
│       ├── LeerstofUpload.tsx       # Teacher upload form
│       └── LeerstofList.tsx         # Admin list component
├── lib/
│   ├── tutoring/
│   │   └── leerstof-retriever.ts    # Fetch leerstof text for given subject
│   └── ai/prompts/
│       └── hiaten-prompts.ts        # Hiaat-topic definitions per subject
supabase/migrations/
└── 008_leerstof_tables.sql          # leerstof_items table + storage RLS
```

### Pattern 1: Hiaten Selection via Prompt Injection

**What:** Child picks a specific topic (bijv. "breuken" in rekenen). A UI panel in SubjectSelector or on the tutor page shows topic chips. Selected topic is passed as URL param or session state to the chat page, which injects it into `buildSystemPrompt()`.

**When to use:** Any time a child wants to practice a specific concept, not the default IGDI progression.

**Implementation approach:**
- Add optional `hiatenTopic?: string` to `ChatRequestBody` in the chat route
- In `buildSystemPrompt()`, add an optional `hiatenContext` parameter. When present, append a "FOCUS INSTRUCTIE" section at the end (after the existing `vakOverride`) so it has highest prompt priority.
- The SubjectSelector or a new `HiatenSelector` component renders subject-specific topic chips. Selection is passed via query param `?hiaat=breuken` to the chat page.
- The chat page reads the query param, passes it to ChatInterface, which includes it in the POST body.

**Example:**
```typescript
// In system-prompts.ts — extend buildSystemPrompt signature
export function buildSystemPrompt(
  subject: Subject,
  language: TutoringLanguage,
  childAge: number,
  childName: string,
  difficultyLevel: number,
  igdiPhase: IGDIPhase,
  sessionHistory?: SessionHistoryContext | null,
  childGrade?: number,
  hiatenTopic?: string  // NEW
): string {
  // ... existing build ...

  // Append LAST (after vakOverride) when hiaat is selected
  const hiatenInstruction = hiatenTopic ? `

# HIAAT-FOCUS INSTRUCTIE — ABSOLUTE PRIORITEIT

${childName} wil gericht oefenen met: **${hiatenTopic}**

1. Stel ALLEEN vragen en oefeningen over ${hiatenTopic}
2. Begin DIRECT met ${hiatenTopic} — geen introductie of keuzemenu
3. Gebruik de Socratische methode specifiek voor dit onderdeel
4. Geef na 5-10 oefeningen een korte terugblik: "Je hebt vandaag geoefend met ${hiatenTopic}!"
` : '';

  return [
    staticPrompt, subjectPrompt, languageContext,
    difficultyInstruction, igdiInstruction, sessionContext, historyContext,
    vakOverride, hiatenInstruction  // hiatenInstruction last = highest priority
  ].join('\n\n---\n\n');
}
```

### Pattern 2: Client-Side PDF Werkblad via react-to-print

**What:** After a successful practice session, a "Print Werkblad" button appears. Clicking it opens a printable view of the conversation exercises, then triggers `window.print()` via react-to-print.

**When to use:** After Koko completes a practice block. The trigger can be a button in ChatInterface toolbar or an inline button in a message.

**Why browser print over server PDF:** The content being printed (Koko's exercises) is already rendered as React/HTML in ChatMessage components. Browser print preserves layout, fonts, and Tailwind CSS (with `@media print` overrides) without needing a separate layout engine. No server compute. No extra binary. The child/parent can Save as PDF from the browser print dialog.

**Example:**
```typescript
// WerkbladPrint.tsx
'use client';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

interface WerkbladPrintProps {
  childName: string;
  subject: string;
  exercises: string[]; // extracted exercise messages from conversation
}

export default function WerkbladPrint({ childName, subject, exercises }: WerkbladPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Werkblad_${childName}_${subject}`,
    pageStyle: `
      @media print {
        body { font-family: Arial, sans-serif; font-size: 14pt; }
        .no-print { display: none !important; }
        @page { margin: 2cm; }
      }
    `,
  });

  return (
    <>
      <button
        onClick={() => handlePrint()}
        className="bg-green-600 text-white px-4 py-2 rounded-lg"
      >
        Werkblad Afdrukken / Opslaan als PDF
      </button>

      {/* Hidden printable area */}
      <div className="hidden print:block" ref={printRef}>
        <h1>Werkblad: {subject} — {childName}</h1>
        {exercises.map((ex, i) => (
          <div key={i} className="exercise">
            <p>{ex}</p>
            <div className="answer-line" style={{ borderBottom: '1px solid black', height: '2rem', marginBottom: '1rem' }} />
          </div>
        ))}
      </div>
    </>
  );
}
```

**Note:** react-to-print 3.x changed the API — `contentRef` replaces the old `content` callback ref. Use `useReactToPrint` hook from `react-to-print`.

### Pattern 3: Leerstof Upload — Text Injection (Not RAG)

**What:** A leerkracht/bijlesmeneer uploads a text file or PDF containing zaakvak content. The text is extracted server-side and stored as plain text in a Supabase table. When a child starts a zaakvak session, the stored text is fetched and injected into the system prompt.

**When to use:** Zaakvakken (geschiedenis, aardrijkskunde, kennis_der_natuur). These subjects have no fixed curriculum in the app — content comes from the teacher's werkbladen or textbook pages.

**Why text injection, not RAG:** The app has one subject per session. Content is short (one textbook chapter = ~2-5KB text). The teacher uploads per-subject content, so retrieval is always by subject key — no semantic search needed. RAG adds pgvector setup, embedding API calls, and complexity for zero benefit at this scale.

**Flow:**
1. Teacher uploads PDF or plain text file via form at `/admin/leerstof`
2. Server API route extracts text (pdf-parse for PDF, direct read for .txt)
3. Text stored in `leerstof_items` table with `subject`, `title`, `content` (TEXT), `uploaded_by`
4. When chat session starts for a zaakvak, `leerstof-retriever.ts` fetches the most recent active leerstof for that subject
5. Content injected into `buildSystemPrompt()` via new `leerstofContext` parameter

**Example schema (new table):**
```sql
CREATE TABLE leerstof_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL CHECK (subject IN ('geschiedenis', 'aardrijkskunde', 'kennis_der_natuur')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,           -- Extracted plain text from PDF/txt
  original_filename TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Example prompt injection:**
```typescript
// In buildSystemPrompt() — add leerstofContext parameter
const leerstofSection = leerstofContext ? `
# Lesmateriaal voor deze sessie

De leerkracht heeft het volgende materiaal geüpload voor ${subject}. Gebruik UITSLUITEND dit materiaal als basis voor je vragen en uitleg:

---
${leerstofContext}
---

Stel vragen die aansluiten bij dit materiaal. Ga niet buiten de scope van dit materiaal.
` : '';
```

**File size limit:** Restrict uploads to 2MB max, 10 pages max. At ~500 words/page, 10 pages = ~5000 words = ~7KB text — well within Claude's context window.

### Pattern 4: Huiswerk Session Type

**What:** The image upload functionality already works. What is missing is a **distinct session mode** where Koko knows it is in "huiswerk help" mode (not regular tutoring or assessment). This changes the system prompt: Koko focuses on the uploaded assignment, guides through specific exercises, and produces a summary at the end.

**When to use:** Child clicks "Huiswerk Hulp" button and uploads an image of their assignment before the chat begins.

**Implementation:**
- Add `'huiswerk'` as a third `session_type` option (alongside `'assessment'` and `'tutoring'`)
- Build a `buildHuiswerkPrompt()` function similar to `buildAssessmentPrompt()` — same static base, but different instructions: "focus on THIS homework image, guide through each exercise"
- ChatInterface receives a `sessionType='huiswerk'` prop and shows a banner "Huiswerkhhulp actief"
- The homework image is sent as the FIRST user message in the session automatically

**Key insight from codebase:** The `buildMessageContent()` function in `route.ts` already handles image + text as multimodal Claude messages. The homework flow only needs a prompt wrapper — no new upload infrastructure required.

### Anti-Patterns to Avoid

- **RAG for leerstof:** Full vector embedding pipeline for 1-2 page content is over-engineered. Simple text injection suffices.
- **Server-side PDF generation with @react-pdf/renderer:** Known crashes in Next.js 16 App Router route handlers due to React internal API usage.
- **Storing leerstof as binary in DB:** Store extracted text, not the raw file bytes, in the database. Store the original file in Supabase Storage for admin download/audit only.
- **Injecting leerstof into the STATIC part of the system prompt:** The static part (KOKO_BASE_PROMPT + SOCRATIC_GUARD_PROMPT) is optimized for Claude prompt caching. Dynamic leerstof content must go in the dynamic section to avoid cache invalidation on every request.
- **Hardcoding Arubaanse kerndoelen as a separate file:** Kerndoelen are best embedded directly in each subject's `SUBJECT_PROMPTS` entry in `subject-prompts.ts`, scoped by `childGrade`. They are already partly there (e.g., klas-level examples in each subject prompt).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser print/PDF | Custom PDF serialization | react-to-print + `window.print()` | Browser handles fonts, layout, page breaks. react-to-print adds CSS isolation and filename. Zero extra compute. |
| PDF text extraction | PDF byte parser | pdf-parse npm | PDF format has 30 years of edge cases: encrypted PDFs, embedded fonts, content streams. pdf-parse is battle-tested. |
| File type validation | MIME header check only | Existing `validateImageFile()` pattern using `file-type` (magic bytes) | Already in the codebase for payment proofs. Extend the same pattern for leerstof uploads. |
| Leerstof retrieval caching | In-memory cache | Supabase query (fast on indexed `subject` column) | Table will have <100 rows. No caching needed. |
| Hiaat topic lists | Dynamic generation | Static TypeScript constant per subject | Topics are curriculum-defined. A `HIAAT_TOPICS` constant per subject is readable, maintainable, and prevents Koko from making up topics. |

**Key insight:** The most complex part of leerstof handling (getting text from PDFs) is solved by `pdf-parse`. Everything else is Supabase CRUD that already has proven patterns in this codebase.

---

## Common Pitfalls

### Pitfall 1: @react-pdf/renderer Server Route Handler Crash
**What goes wrong:** `renderToBuffer` throws `TypeError: ba.Component is not a constructor` in Next.js App Router route handlers.
**Why it happens:** @react-pdf/renderer uses React internal APIs that changed in React 19 and are not exposed in the App Router server context.
**How to avoid:** Use browser print via react-to-print instead. If server PDF is absolutely required in the future, use Puppeteer on a dedicated Node.js microservice, not inside the Next.js app.
**Warning signs:** Any import of `renderToBuffer` or `renderToStream` from `@react-pdf/renderer` in an App Router route handler.

### Pitfall 2: Leerstof Text Exceeding Claude Context Window
**What goes wrong:** A teacher uploads a full 50-page PDF. The extracted text fills the context window, leaving no room for conversation.
**Why it happens:** Claude Sonnet 4.5 has a 200K token context window, but long leerstof + long conversation history = potential overflow.
**How to avoid:** Enforce a max content length server-side (e.g., 8000 characters ≈ ~2000 tokens). Truncate with a clear message to the teacher. Recommend: "Upload maximaal 10 pagina's per keer."
**Warning signs:** Claude responses becoming shorter or cutting off mid-sentence in zaakvak sessions.

### Pitfall 3: Hiaten Prompt Being Overridden by vakOverride
**What goes wrong:** The `vakOverride` section says "stel ALLEEN vragen over rekenen" — too generic. The hiaten instruction says "focus on breuken" — but vakOverride comes after and wipes it.
**Why it happens:** Prompt sections that appear later have higher Claude attention weight. The existing `vakOverride` is currently last in the prompt array.
**How to avoid:** Place `hiatenInstruction` AFTER `vakOverride` in the join array. Make `hiatenInstruction` more specific and explicit ("Je ENIGE doel nu is breuken oefenen").
**Warning signs:** Child selects "breuken" but Koko asks about geometry or other topics in the first message.

### Pitfall 4: PDF Upload RLS — Teacher vs Parent Access
**What goes wrong:** Parents can accidentally see or modify leerstof uploaded by teachers. Or teachers cannot upload because RLS blocks them.
**Why it happens:** The app currently has two roles: parent and admin. Teachers/bijlesmeneer are not a distinct auth role.
**How to avoid:** For Phase 6, scope leerstof upload to admin role only (same `app_metadata.role = 'admin'` check used in payment-proofs storage policies). If a teacher-specific role is needed later, add it in a later phase. Document this limitation.
**Warning signs:** 403 errors on leerstof upload, or unauthorized users seeing leerstof content.

### Pitfall 5: pdf-parse Incompatibility with Next.js Edge Runtime
**What goes wrong:** `pdf-parse` uses Node.js `fs` module internally. If the API route is configured for Edge runtime, it will fail.
**Why it happens:** Edge runtime does not support Node.js built-in modules.
**How to avoid:** Add `export const runtime = 'nodejs';` to the leerstof upload API route. Do NOT use Edge runtime for this route.
**Warning signs:** `Module not found: Can't resolve 'fs'` build error, or runtime errors about unavailable Node APIs.

### Pitfall 6: react-to-print API Changed in v3
**What goes wrong:** Using old v2 API (`content={() => ref.current}`) causes TypeScript errors or silent failures in v3.
**Why it happens:** react-to-print 3.x changed to `contentRef` (a React ref object) and `useReactToPrint` hook returns a trigger function directly.
**How to avoid:** Use the v3 API: `const handlePrint = useReactToPrint({ contentRef: myRef })`. Call `handlePrint()` directly. Do not pass a function to `content`.
**Warning signs:** TypeScript errors about missing `content` property; print dialog not appearing.

---

## Code Examples

Verified patterns from codebase and official sources:

### Supabase Storage Upload (from existing payment-proofs pattern)
```typescript
// Source: aruba-leren/src/lib/storage/upload.ts pattern — extend for leerstof
// In /api/leerstof/upload/route.ts
export const runtime = 'nodejs'; // Required: pdf-parse needs Node.js

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Verify admin role via app_metadata
  const isAdmin = user?.app_metadata?.role === 'admin';
  if (!isAdmin) return Response.json({ error: 'Verboden' }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const subject = formData.get('subject') as string;
  const title = formData.get('title') as string;

  let extractedText = '';
  if (file.type === 'application/pdf') {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdf(buffer); // pdf-parse
    extractedText = pdfData.text.slice(0, 8000); // enforce limit
  } else {
    extractedText = await file.text();
    extractedText = extractedText.slice(0, 8000);
  }

  const { data, error } = await supabase
    .from('leerstof_items')
    .insert({ subject, title, content: extractedText, uploaded_by: profile.id });

  return Response.json({ success: true, id: data?.id });
}
```

### Leerstof Retriever
```typescript
// Source: session-manager.ts pattern — same Supabase server client approach
// In /lib/tutoring/leerstof-retriever.ts
import { createClient } from '@/lib/supabase/server';
import type { Subject } from '@/types/tutoring';

export async function getActiveLeerstof(subject: Subject): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('leerstof_items')
    .select('content')
    .eq('subject', subject)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data?.content ?? null;
}
```

### Hiaat Topics Constant
```typescript
// Source: subject-prompts.ts pattern
// In /lib/ai/prompts/hiaten-prompts.ts
export const HIAAT_TOPICS: Record<string, string[]> = {
  taal: [
    'Werkwoordspelling (dt-regel)',
    'Samengestelde woorden',
    'Klinkers en medeklinkers',
    'Woordgeslacht (de/het)',
    'Zinsontleding (onderwerp en gezegde)',
    'Dictee',
  ],
  rekenen: [
    'Optellen en aftrekken',
    'Tafels (vermenigvuldigen)',
    'Deling met rest',
    'Breuken',
    'Decimale getallen',
    'Meten en gewichten',
    'Klokkijken',
    'Meetkunde (vormen)',
  ],
  begrijpend_lezen: [
    'Hoofdgedachte vinden',
    'Vragen beantwoorden bij een tekst',
    'Moeilijke woorden begrijpen',
    'Feiten en mening onderscheiden',
    'Samenvatten',
  ],
  geschiedenis: ['Tijdlijn', 'Oorzaak en gevolg', 'Aruba-geschiedenis'],
  aardrijkskunde: ['Kaarten lezen', 'Klimaat en weer', 'Aruba-geografie'],
  kennis_der_natuur: ['Planten en dieren', 'Het menselijk lichaam', 'Ecosystemen', 'Milieu'],
};
```

### Chat Route Extension for Hiaten + Leerstof
```typescript
// In route.ts — extend ChatRequestBody and systemPrompt build
interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string; imageUrl?: string }>;
  sessionId?: string;
  subject: Subject;
  childId: string;
  hiatenTopic?: string;   // NEW: from HiatenSelector
}

// In POST handler, after building base systemPrompt:
const leerstofContent = isZaakvak(subject)
  ? await getActiveLeerstof(subject)
  : null;

systemPrompt = buildSystemPrompt(
  subject, tutorLanguage, child.age, child.first_name,
  currentSession.difficulty_level, currentSession.metadata.igdi_phase,
  sessionHistory, child.grade,
  body.hiatenTopic,    // NEW
  leerstofContent      // NEW
);
```

---

## Arubaanse Kerndoelen — What We Know

**Source:** [ea.aw/pages/leerplannen/kerndoelen](https://www.ea.aw/pages/leerplannen/kerndoelen/) (HIGH confidence — official Aruba education authority)

The Aruba government (Enseñansa Aruba / Departamento di Enseñansa) has published official kerndoelen documents:

- **Kerndoelendocument Arubaans Primair Onderwijs**: First official edition with legal status for klas 1-6. Contains cross-subject core goals + per-subject goals.
- **Rekenen & Wiskunde**: 6 core learning goals with progression from preparatory through klas 6.
- **Taal & Communicatie — Nederlands**: Two tracks — NIT (Dutch as instruction language) and NVT (Dutch as foreign language). Aruba uses NIT for most children.
- **Tussendoelen**: Intermediate goals per class level — the practical scaffold for per-klas content.

**Implication for Phase 6:** Rather than importing the full kerndoelen document into the app, the approach is to embed grade-appropriate tussendoelen examples directly into the existing `SUBJECT_PROMPTS` in `subject-prompts.ts`. The current subject prompts already contain klas-level examples. Phase 6 can enrich them with more specific klas 1-6 content guidance per subject.

**Confidence:** MEDIUM — The ea.aw website confirms the existence and structure of kerndoelen documents, but the actual tussendoelen content requires reading the downloadable documents, which were not accessible during research. The existing subject-prompts.ts content is reasonably aligned already. A full curriculum alignment task can be treated as a documentation enrichment in `subject-prompts.ts`.

---

## Feature Complexity Estimates

| Feature | Complexity | Plans Needed | Key Risk |
|---------|------------|--------------|----------|
| Hiaten selection (UI + prompt) | LOW | 1 | Prompt ordering (must be last) |
| PDF werkblad (browser print) | LOW | 1 | Exercise extraction from messages |
| Huiswerk session type | MEDIUM | 1 | New session_type in DB CHECK constraint |
| Leerstof upload + text injection | MEDIUM | 1-2 | pdf-parse Node.js runtime requirement |
| Admin leerstof management UI | LOW | 1 | RLS policy for admin-only access |
| Kerndoelen enrichment in subject prompts | LOW | 1 | Content accuracy (verify against ea.aw docs) |

---

## Schema Changes Needed

### Migration 008 — Leerstof Tables

```sql
-- leerstof_items: stores extracted text from teacher uploads
CREATE TABLE leerstof_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL CHECK (subject IN (
    'geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 8000),
  original_filename TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leerstof_subject_active
  ON leerstof_items(subject, is_active, created_at DESC);

ALTER TABLE leerstof_items ENABLE ROW LEVEL SECURITY;

-- Only admins can manage leerstof
CREATE POLICY "Admins manage leerstof"
  ON leerstof_items FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Authenticated users can read active leerstof (for their children's sessions)
CREATE POLICY "Authenticated users read active leerstof"
  ON leerstof_items FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);
```

### Tutoring Sessions — Add huiswerk session_type (if pursued)

```sql
-- Extend the existing session_type CHECK constraint
ALTER TABLE tutoring_sessions
  DROP CONSTRAINT IF EXISTS tutoring_sessions_session_type_check;
ALTER TABLE tutoring_sessions
  ADD CONSTRAINT tutoring_sessions_session_type_check
    CHECK (session_type IN ('assessment', 'tutoring', 'huiswerk'));
```

**Note:** Altering CHECK constraints in PostgreSQL requires dropping and re-adding. On Supabase, this must be done in SQL Editor.

### Supabase Storage — New Bucket for Leerstof Originals

A new `leerstof-originals` bucket stores the original PDF/text files for admin audit trail (not used for AI injection — only the extracted text is used):

```
Bucket: leerstof-originals
Public: OFF
File size limit: 2MB
Allowed MIME types: application/pdf, text/plain
Folder: leerstof/{subject}/{uuid}
```

---

## Recommended Plan Sequencing

The plans should be built in this order to minimize risk and deliver value incrementally:

1. **Plan 1: Hiaten selection** — Lowest risk. Pure prompt engineering + small UI. No schema changes. Delivers immediate value.
2. **Plan 2: PDF werkblad** — Low risk. Add react-to-print, build WerkbladPrint component. Requires identifying which messages are "exercises" to extract.
3. **Plan 3: Huiswerk session type** — Medium complexity. Needs session_type constraint extension and new system prompt builder function. The upload flow already works.
4. **Plan 4: Leerstof upload + injection** — Medium complexity. New DB table, new API route, pdf-parse, prompt injection. Must be on nodejs runtime.
5. **Plan 5: Admin leerstof management** — Low risk. Mostly CRUD UI. Depends on Plan 4's table.
6. **Plan 6: Kerndoelen enrichment** — Low risk. Content work in subject-prompts.ts. Can be done in parallel with other plans.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Puppeteer for PDF | Browser print via react-to-print | No server binary, works in serverless |
| @react-pdf/renderer v3 | react-to-print + CSS @media print | Avoids React internal API breakage |
| Full RAG with pgvector for context | Plain text injection into system prompt | No embedding cost, no vector infra |
| pdf2json (coordinate-aware) | pdf-parse (text-only) | Simpler for use case, fewer config steps |

**Deprecated in this context:**
- `@react-pdf/renderer` server-side in Next.js App Router: broken since React 19 update. Client-side PDFDownloadLink still works but requires `dynamic({ ssr: false })` and is more complex than react-to-print for this use case.

---

## Open Questions

1. **Huiswerk session type vs existing tutoring flow**
   - What we know: The image upload and multimodal chat already work for homework help within a normal tutoring session.
   - What's unclear: Should huiswerk be a dedicated session_type in the DB, or should it remain a "tutoring" session with an imageUrl on the first message and a slightly different greeting? A dedicated session_type provides better analytics but requires the CHECK constraint change.
   - Recommendation: Start with a modified tutoring session (add `huiswerkMode: boolean` to session metadata JSONB). This avoids the DB constraint change. Upgrade to proper session_type in a future phase if analytics require it.

2. **Leerstof for kernvakken**
   - What we know: Phase 6 scope says leerstof upload is for zaakvakken only.
   - What's unclear: Should kernvakken (taal, rekenen, begrijpend_lezen) ever get uploaded leerstof? For example, a teacher might want to upload a specific reading passage for begrijpend_lezen.
   - Recommendation: Keep the `leerstof_items` table CHECK constraint to zaakvakken only for Phase 6. Extend in a later phase if needed.

3. **Werkblad exercise extraction**
   - What we know: Chat messages are stored as plain text in `tutoring_messages`. The exercises Koko generates are embedded in these messages along with explanations and encouragement.
   - What's unclear: How to automatically extract only the "exercise" portions from Koko's messages for the printable werkblad. Koko's messages are free-form text.
   - Recommendation: Two options: (a) Add a new `[OPDRACHT]...[/OPDRACHT]` tag that Koko uses to mark exercise blocks, similar to the existing `[BORD]` and `[SPREEK]` tags. (b) Let the child/parent manually select which messages to include in the werkblad. Option (a) is more automated but requires prompt engineering. Option (b) is simpler to build and gives user control.

4. **Arubaanse tussendoelen content**
   - What we know: The ea.aw website confirms per-klas tussendoelen exist as downloadable documents.
   - What's unclear: The exact content of those documents was not accessible during research.
   - Recommendation: The bijlesmeneer (user) likely has access to these documents. They can provide the klas-level content for enriching `subject-prompts.ts`. Research should be validated against the actual documents before the kerndoelen enrichment plan is executed.

---

## Sources

### Primary (HIGH confidence)
- Codebase (read directly): `route.ts`, `system-prompts.ts`, `subject-prompts.ts`, `ChatInterface.tsx`, `SubjectSelector.tsx`, `homework-upload.ts`, `storage/upload.ts`, migrations 005-007, `package.json`, `types/tutoring.ts`, `types/progress.ts`
- [Enseñansa Aruba — Kerndoelen](https://www.ea.aw/pages/leerplannen/kerndoelen/) — official Aruba education authority, confirms kerndoelen document structure and per-subject tussendoelen

### Secondary (MEDIUM confidence)
- [react-pdf compatibility page](https://react-pdf.org/compatibility) — confirms React 19 support since v4.1.0, and Next.js compatibility caveats
- [react-to-print npm](https://www.npmjs.com/package/react-to-print) — version 3.2.0, React 19 peer dep confirmed
- [react-pdf GitHub issue #2460](https://github.com/diegomura/react-pdf/issues/2460) — server-side rendering broken in App Router route handlers
- [pdf2json npm](https://www.npmjs.com/package/pdf2json) — confirmed zero-dependency, serverComponentsExternalPackages requirement
- [pdf-parse npm](https://www.npmjs.com/package/pdf-parse) — confirmed plain text extraction, pure Node.js
- [Comparing PDF libraries 2025](https://dmitriiboikov.com/posts/2025/01/pdf-generation-comarison/) — library tradeoff comparison

### Tertiary (LOW confidence — single source, unverified against official docs)
- WebSearch results on hiaten/topic practice UX patterns — no authoritative source found; pattern derived from codebase analysis
- WebSearch on Aruba curriculum content — only structure confirmed, actual tussendoelen content not retrieved

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing packages confirmed from package.json; new packages verified via npm/official sources
- Architecture: HIGH — derived from direct codebase read; patterns mirror existing code conventions exactly
- PDF generation: HIGH — multiple sources confirm @react-pdf/renderer server issues; react-to-print v3 React 19 compatibility confirmed
- Leerstof/RAG decision: HIGH — scale analysis (small content, key-based retrieval) clearly rules out full RAG
- Pitfalls: HIGH — all pitfalls derived from either codebase analysis or confirmed library issues
- Kerndoelen content: MEDIUM — structure confirmed, actual grade-level content not retrieved

**Research date:** 2026-02-20
**Valid until:** 2026-04-01 (stable libraries; kerndoelen tussendoelen content may need manual verification sooner)
