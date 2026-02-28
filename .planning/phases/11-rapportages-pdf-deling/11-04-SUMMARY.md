---
phase: 11-rapportages-pdf-deling
plan: 04
subsystem: ui
tags: [next-intl, react-to-print, whatsapp, i18n, papiamento, pdf, rapport]

# Dependency graph
requires:
  - phase: 11-02
    provides: StudyPlanEditor, rapport page structure
  - phase: 11-03
    provides: ShareLinkPanel, report_tokens table, publieke /rapport/[token] route

provides:
  - rapport-namespace in nl.json + pap.json (48 vertaalsleutels)
  - RapportView als async Server Component met getTranslations (nl + pap)
  - RapportPrintWrapper (react-to-print v3) voor Opslaan als PDF
  - WhatsApp-deelknop in ShareLinkPanel met locale-bewust bericht (nl/pap)

affects: [rapport-pagina, publieke-rapport-route, tweetaligheid]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - async Server Component met getTranslations({ locale, namespace }) voor i18n
    - react-to-print v3 contentRef patroon (niet verouderde content callback)
    - locale-bewuste WhatsApp wa.me links met encodeURIComponent
    - SUBJECT_TRANSLATION_KEYS record voor type-veilige vertaal-sleutel lookup

key-files:
  created:
    - aruba-leren/src/components/rapport/RapportPrintWrapper.tsx
  modified:
    - aruba-leren/src/messages/nl.json
    - aruba-leren/src/messages/pap.json
    - aruba-leren/src/components/rapport/RapportView.tsx
    - aruba-leren/src/components/rapport/ShareLinkPanel.tsx
    - aruba-leren/src/app/[locale]/dashboard/kind/[childId]/rapport/page.tsx

key-decisions:
  - "RapportView omgezet naar async Server Component — getTranslations vereist async context"
  - "nl-AW als date locale fallback voor Papiamento — Aruba heeft geen eigen locale-code"
  - "SUBJECT_TRANSLATION_KEYS record i.p.v. t.has() — type-veilig zonder runtime API afhankelijkheid"
  - "RapportPrintWrapper wrapping op page-niveau — client wrapper kan async server children bevatten"
  - "WhatsApp-bericht hardgecodeerd in ShareLinkPanel — client component kan getTranslations niet aanroepen"
  - "Papiamento vertalingen zijn approximatief — vereisen review door native speaker"

patterns-established:
  - "Async Server Component i18n: export async function + getTranslations({ locale, namespace })"
  - "react-to-print v3: useReactToPrint({ contentRef }) niet verouderde content callback"

# Metrics
duration: 18min
completed: 2026-02-28
---

# Phase 11 Plan 04: Tweetaligheid + WhatsApp + PDF export Summary

**Volledig tweetalig rapport (nl + pap) met WhatsApp-deelknop via wa.me en Opslaan als PDF via react-to-print v3**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-28T01:20:15Z
- **Completed:** 2026-02-28T01:38:00Z
- **Tasks:** 2 auto-tasks (checkpoint volgt)
- **Files modified:** 5

## Accomplishments

- rapport-namespace toegevoegd aan nl.json en pap.json met 48 vertaalsleutels elk
- RapportView refactored naar async Server Component dat getTranslations gebruikt — alle labels nu tweetalig
- RapportPrintWrapper.tsx aangemaakt met react-to-print v3 contentRef patroon voor PDF-export
- WhatsApp-deelknop toegevoegd aan ShareLinkPanel — opent wa.me link met kindnaam en rapport-URL, bericht in nl of pap

## Task Commits

1. **Task 1: Tweetalige vertalingen + RapportView i18n + RapportPrintWrapper** - `798c5cf` (feat)
2. **Task 2: WhatsApp-deelknop in ShareLinkPanel** - `adcb574` (feat)

## Files Created/Modified

- `aruba-leren/src/messages/nl.json` - rapport-namespace toegevoegd (48 keys, nl)
- `aruba-leren/src/messages/pap.json` - rapport-namespace toegevoegd (48 keys, pap)
- `aruba-leren/src/components/rapport/RapportView.tsx` - omgezet naar async Server Component met getTranslations
- `aruba-leren/src/components/rapport/RapportPrintWrapper.tsx` - nieuw: react-to-print v3 wrapper met PDF-knop
- `aruba-leren/src/components/rapport/ShareLinkPanel.tsx` - WhatsApp-deelknop + locale-bewust bericht
- `aruba-leren/src/app/[locale]/dashboard/kind/[childId]/rapport/page.tsx` - RapportPrintWrapper import + wrapping

## Decisions Made

- **RapportView async Server Component:** getTranslations vereist async context, dus RapportView is nu `export async function`. Beide pagina's (geauthenticeerd + publiek) kunnen async Server Components renderen.
- **nl-AW als Papiamento date locale:** Aruba heeft geen eigen BCP-47 locale code. nl-AW (Nederlandse taal, Aruba regio) is de meest nauwkeurige fallback voor datumopmaak.
- **SUBJECT_TRANSLATION_KEYS record:** Gebruik een statisch record in plaats van `t.has()` voor type-veilige subject sleutel-lookup. Vermijdt afhankelijkheid van next-intl runtime API.
- **WhatsApp bericht hardgecodeerd in ShareLinkPanel:** ShareLinkPanel is een 'use client' component — getTranslations is server-only. Hardgecodeerde nl/pap berichten zijn een acceptabele tradeoff.
- **Papiamento approximatief:** Papiamento vertalingen zijn AI-gegenereerd en vereisen review door native speaker (zie user_setup in plan frontmatter).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Papiamento vertalingen in `aruba-leren/src/messages/pap.json` (rapport-namespace) zijn approximatief gegenereerd en vereisen review door een native speaker. Corrigeer waar nodig — het bestand staat in version control voor eenvoudige diff.

## Next Phase Readiness

- Phase 11 VOLLEDIG AFGEROND — menselijke verificatie goedgekeurd: "alles werkt, ziet er goed uit"
- Volledig rapport systeem opgeleverd: vakkaarten + lijngrafieken + studieplan + deelbare link + PIN-gate + WhatsApp + PDF + tweetaligheid
- Alle 11 projectfases zijn nu compleet — project klaar voor productie-deployment

---
*Phase: 11-rapportages-pdf-deling*
*Completed: 2026-02-28*
