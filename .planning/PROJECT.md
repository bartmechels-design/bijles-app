# ArubaLeren

## What This Is

Een autonoom AI-bijlesplatform voor basisschoolleerlingen (6-12 jaar, klas 1-6) op Aruba. Het platform toetst het niveau van het kind via een adaptieve beginsituatietoets, identificeert hiaten per vak, en biedt gepersonaliseerde bijles via "Koko" — een geduldige, Socratische AI-tutor die Nederlands spreekt met Papiamento-aanmoediging. Ouders beheren abonnementen via handmatige betalingsverificatie en volgen de voortgang via een ouderportaal met wekelijkse e-mails en deelbare PDF-rapporten.

## Core Value

Kinderen op Aruba krijgen persoonlijke bijles die zich aanpast aan hun niveau, zonder dat een ouder of leerkracht erbij hoeft te zitten — volledig zelfstandig, in hun eigen taal en context.

## Current State (v1.0 Shipped 2026-03-01)

**Shipped v1.0** — alle 11 fases compleet. Platform is volledig functioneel en klaar voor productie-deployment.

- **~16,500 LOC** TypeScript/TSX (121 bestanden)
- **Tech stack:** Next.js (App Router), TypeScript, Tailwind CSS 4, Supabase, Vercel AI SDK, OpenAI TTS
- **Locales:** nl, pap, es, en (next-intl 3.x)
- **AI:** Claude Sonnet 4.5 voor tutoring, OpenAI tts-1-hd voor spraak

**What was built beyond original scope:**
- Neural TTS (OpenAI tts-1-hd, nova stem) — browser TTS was v2 plan
- Koko avatar with 7 expressions + Time Timer — v1.1 plan promoted to v1.0
- KaTeX wiskunde, interactieve zinsontleding, kladblaadje canvas — v1.1 plan promoted
- Voortgangsrapporten met WhatsApp-deling en PIN-gate — v1.1 plan promoted

**Pending for production deployment:**
- SQL migrations 008, 009, 011, 012 — handmatig uitvoeren in Supabase SQL Editor
- "genoeg geoefend" bug in bestaande DB-sessies met oude context (nieuwe sessies werken correct)

## Requirements

### Validated

- ✓ Ouder authenticatie (Google, Facebook, email/password) — v1.0
- ✓ Meerdere kindprofielen per ouderaccount — v1.0
- ✓ Handmatige betalingsflow (bankovermaking / contant) + admin verificatie — v1.0
- ✓ AI-tutor Koko met Socratische methode (nooit direct antwoord) — v1.0
- ✓ Koko gebruikt Arubaanse context (Hooiberg, Florins, Shoco, Arikok) — v1.0
- ✓ Koko spreekt Nederlands + Papiamento aanmoediging, kan schakelen — v1.0
- ✓ 6 vakken: Taal, Rekenen, Begrijpend Lezen, Geschiedenis, Aardrijkskunde, Kennis der Natuur — v1.0
- ✓ Beginsituatietoets per vak (adaptief via chat) — v1.0
- ✓ Voortgangsregistratie per kind, per vak, per niveau — v1.0
- ✓ Ouderportaal met voortgangskaarten — v1.0
- ✓ Wekelijkse automatische voortgangsmail via Supabase Edge Function + pg_cron — v1.0
- ✓ Admin panel voor betalingen, families, stuck-kind alerting, vakantierooster — v1.0
- ✓ PDF-werkbladen (react-to-print v3, [OPDRACHT] tag) — v1.0
- ✓ Huiswerk-sessie modus met foto-upload — v1.0
- ✓ Hiaten-selector per kernvak — v1.0
- ✓ Leerstof upload voor zaakvakken (PDF/foto, Claude Vision) — v1.0
- ✓ Neural TTS (OpenAI tts-1-hd, nova stem) + Arubaanse fonetische substitutie — v1.0
- ✓ Papiamento "Alleen lezen" modus — v1.0
- ✓ Koko avatar (7 expressies, 3D radialGradient) + Time Timer component — v1.0
- ✓ Whiteboard animaties (CSS clip-path), KaTeX breuken, interactieve zinsontleding — v1.0
- ✓ Kladblaadje canvas bij rekenen (PointerEvent, Supabase storage) — v1.0
- ✓ Voortgangsrapporten (Recharts, studieplan editor, deelbare link + PIN-gate, WhatsApp) — v1.0
- ✓ Tweetalige interface NL + PAP (+ ES, EN) via next-intl — v1.0
- ✓ RLS op alle database tabellen — v1.0
- ✓ Privacy policy pagina — v1.0

### Active (v2.0)

- [ ] Offline oefenmodus — lessen downloaden voor offline gebruik
- [ ] Geavanceerde leeranalytics met voorspellende inzichten
- [ ] Milestone-vieringen en badges voor behaalde vaardigheden
- [ ] WhatsApp/Facebook community-integratie voor ouders
- [ ] Leerkrachtportaal met klasoverzicht (als scholen adopteren)
- [ ] Volledige voice/audio-first modus (STT + TTS volledig geïntegreerd, geen tekst nodig)

### Out of Scope

- Real-time video/audio tutoring — te hoge complexiteit en kosten
- Automatische betalingsverwerking (iDEAL, creditcard) — Arubaanse markt vereist handmatig model
- Native mobile app — web-first (responsive) volstaat; TTS werkt goed op mobiel
- Ouder-leerkracht communicatieplatform — focus op kind-tutor interactie
- Multiplayer/samenwerkingsfeatures — individueel leerpad eerst
- Social features (vrienden, chat) — COPPA-compliancerisico; afleidend
- Competitieve leaderboards — negatief effect op intrinsieke motivatie bij kinderen
- AI-beoordeling van open opdrachten — onbetrouwbaar voor genuanceerd werk

## Context

- **Doelgroep:** Basisschoolleerlingen op Aruba, 6-12 jaar (klas 1 = groep 3, klas 6 = groep 8)
- **Onderwijs:** Volgt het officiële Arubaanse curriculum
- **Taal:** Kinderen groeien op met Papiamento als moedertaal, krijgen onderwijs in het Nederlands. Koko sluit hier op aan: Nederlands als instructietaal, Papiamento voor aanmoediging
- **Cultuur:** Alle voorbeelden gebruiken Arubaanse context — Hooiberg, Arikok, Oranjestad, San Nicolas, Shoco, Divi-divi, Florins (Afl.), Carnival, Caquetío-geschiedenis
- **Betalingen:** Aruba heeft beperkte online-betalingsinfrastructuur. Model is handmatige verificatie: ouder maakt over via Arubabank of betaalt contant, admin verifieert en activeert
- **AI Tutor "Koko":** Pedagogische skill in `.agents/skills/aruba-teacher-logic/SKILL.md` — Socratische methode, IGDI-model, growth mindset, vakspecifieke instructies, Papiamento-aanmoedigingen
- **Admin:** Eenpersoonsoperatie — eigenaar beheert betalingsverificatie en platform

## Constraints

- **Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS 4, Supabase (PostgreSQL, Auth, Storage, Edge Functions), Vercel AI SDK 6 met Claude Sonnet 4.5, OpenAI TTS (tts-1-hd), Vercel deployment
- **Tweetaligheid:** Volledige UI-switch NL/PAP vereist (next-intl 3.x); ES en EN ook ondersteund
- **Authenticatie:** Supabase Auth met Google, Facebook en email/password providers
- **AI Budget:** Claude API-kosten beheersbaar via prompt caching (~90% reductie), sessielimieten, 50K daily token limit per kind
- **Deployment:** Vercel (serverless) + Supabase Edge Functions voor email scheduling

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Handmatige betalingsverificatie i.p.v. payment gateway | Arubaanse markt heeft beperkte online-betalingsopties | ✓ Good — werkt goed voor MVP, admin-overhead acceptabel |
| Claude Sonnet 4.5 als AI-engine | Beste balans kwaliteit/kosten voor educatieve conversaties | ✓ Good — $3/MTok, prompt caching effectief |
| Prompt caching (statische base + guards eerst) | ~90% kostenreductie op herhaalde prompts | ✓ Good — kritisch voor schaalbaarheid |
| Supabase als backend | Combineert PostgreSQL, Auth, Storage, Edge Functions in één platform | ✓ Good — snel op te zetten, pg_cron voor scheduling |
| Tweetalige UI (NL/PAP) | Sluit aan bij taalrealiteit Arubaanse kinderen | ✓ Good — next-intl werkt soepel |
| profiles.id vs user_id strikte scheiding | Voorkomt veelvoorkomende auth bugs | ✓ Good — MEMORY.md patroon vastgelegd |
| client-side router.push() na auth | Server-side redirect() verliest Supabase auth cookies | ✓ Good — voorkomt auth-loop bugs |
| react-to-print v3 over @react-pdf/renderer | @react-pdf/renderer crasht in Next.js App Router | ✓ Good — stabiel, werkt ook voor werkbladen |
| Text injection over RAG voor leerstof | Simpler at MVP scale, geen vector database nodig | ✓ Good — voldoende voor zaakvak content |
| clip-path over SVG stroke-dashoffset voor whiteboard | GPU-compositor-threaded, beter voor low-end Android | ✓ Good — vloeiende animaties op mobiel |
| Neural TTS (OpenAI tts-1-hd, nova stem) | Kindvriendelijk stemgeluid, aangenaam bij langdurig luisteren | ✓ Good — aanzienlijke kwaliteitsverbetering |
| Rule-based study plan over AI-gegenereerd | Deterministisch, geen extra Claude API kosten | ✓ Good — voldoende voor MVP rapportage |
| session_type in tutoring_sessions tabel | Vermijdt schema duplicatie voor assessment sessies | ✓ Good — eenvoudiger queries |
| vakOverride als laatste sectie in system prompt | Hoogste Claude prioriteit, overschrijft basis gedrag | ✓ Good — kritisch voor vak-restricties |
| Zaakvakken bypass assessment gate | Content upload is toekomstige fase; direct naar tutoring | ✓ Good — gebruiksvriendelijker voor MVP |

---
*Last updated: 2026-03-01 after v1.0 milestone*
