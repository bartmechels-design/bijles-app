---
phase: 01-foundation-infrastructure
plan: 01
subsystem: i18n-routing
tags: [next-intl, middleware, routing, i18n, ui-foundation]
dependency_graph:
  requires: []
  provides: [trilingual-routing, locale-detection, language-switcher, i18n-foundation]
  affects: [all-future-pages, all-ui-components]
tech_stack:
  added: [next-intl, locale-routing-middleware]
  patterns: [server-components, client-components, async-params]
key_files:
  created:
    - aruba-leren/middleware.ts
    - aruba-leren/src/app/[locale]/layout.tsx
    - aruba-leren/src/app/[locale]/page.tsx
    - aruba-leren/src/components/Header.tsx
    - aruba-leren/src/components/LanguageSwitcher.tsx
  modified:
    - aruba-leren/next.config.ts
    - aruba-leren/src/app/layout.tsx
    - aruba-leren/src/app/globals.css
    - aruba-leren/src/messages/nl.json
    - aruba-leren/src/messages/pap.json
    - aruba-leren/src/messages/es.json
decisions:
  - "Use getTranslations instead of useTranslations in async Server Components to avoid React context errors"
  - "Root layout.tsx becomes minimal pass-through, [locale]/layout.tsx handles html/body/providers"
  - "Header component is Server Component, LanguageSwitcher is Client Component (uses hooks)"
  - "Language switcher buttons use aria-label and aria-current for accessibility"
metrics:
  duration: 346
  completed_date: 2026-02-14
---

# Phase 01 Plan 01: I18n Routing Infrastructure Summary

**One-liner:** Implemented trilingual (NL/PAP/ES) routing with next-intl middleware, locale detection, and persistent header with language switcher.

## Overview

This plan established the internationalization foundation for the ArubaLeren application by wiring next-intl into the Next.js App Router architecture. The implementation enables locale-based routing (/nl/, /pap/, /es/), automatic browser language detection with fallback to Dutch, and a persistent header with language switching functionality that appears on every page.

## Tasks Completed

### Task 1: Wire next-intl middleware, config, and locale layout
**Status:** Complete
**Commit:** 30586d0
**Files:**
- Created `middleware.ts` with next-intl routing middleware
- Updated `next.config.ts` to integrate next-intl plugin
- Created `[locale]/layout.tsx` with NextIntlClientProvider and static params generation
- Created `[locale]/page.tsx` with translated home page content
- Simplified root `layout.tsx` to pass-through wrapper
- Updated `globals.css` to remove dark mode, keep Geist font

**Verification:** Build completed successfully. All 3 locales (/nl/, /pap/, /es/) generate as static HTML.

### Task 2: Create Header component with LanguageSwitcher
**Status:** Complete
**Commit:** 1e2bf95
**Files:**
- Created `LanguageSwitcher.tsx` client component with locale switching buttons
- Created `Header.tsx` server component with app name, nav links, and language switcher
- Updated `[locale]/layout.tsx` to include Header and main wrapper
- Updated `[locale]/page.tsx` to adjust layout for header
- Added `languageSwitcher` translations to all 3 language files

**Verification:** Build completed successfully. Header renders on all pages with functional language switcher.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed async component translation hook error**
- **Found during:** Task 1 build verification
- **Issue:** `useTranslations` cannot be called in async Server Components (React context error)
- **Fix:** Changed from `useTranslations` to `getTranslations` in `[locale]/page.tsx`
- **Files modified:** `src/app/[locale]/page.tsx`
- **Commit:** Included in 30586d0

**2. [Rule 3 - Missing critical functionality] Added languageSwitcher translations**
- **Found during:** Task 2 component creation
- **Issue:** Translation keys for language names were not present in nl.json/pap.json/es.json
- **Fix:** Added `languageSwitcher` namespace with `nl`, `pap`, `es` keys to all 3 translation files
- **Files modified:** `src/messages/nl.json`, `src/messages/pap.json`, `src/messages/es.json`
- **Commit:** Included in 1e2bf95

## Technical Details

### Architecture Decisions

1. **Two-tier layout structure:** Root `layout.tsx` is a minimal pass-through (returns `{children}` only), while `[locale]/layout.tsx` provides the full HTML structure with fonts, providers, and header. This avoids double-wrapping html/body tags.

2. **Static generation:** Used `generateStaticParams()` returning all locales to enable static optimization (SSG) for all locale routes. This is critical for performance (Pitfall 8 from research).

3. **Server/Client component split:** Header is a Server Component (can use translations directly), LanguageSwitcher is a Client Component (needs useRouter hook for navigation).

4. **Async params handling:** Next.js 16 requires params to be awaited (`params: Promise<{ locale: string }>`), implemented correctly in both layout and page.

### Translation Structure

All UI text sourced from translation JSON files in `src/messages/`:
- `nl.json` - Dutch (default locale)
- `pap.json` - Papiamento
- `es.json` - Spanish

Added `languageSwitcher` namespace with locale display names:
- NL: "Nederlands", "Papiamento", "Español"
- PAP: "Hulandes", "Papiamento", "Spaño"
- ES: "Neerlandés", "Papiamento", "Español"

### Middleware Behavior

Middleware intercepts all requests (except `/api`, `/_next`, `/_vercel`, and files with extensions) and:
1. Checks for locale in URL path
2. If no locale, reads `Accept-Language` header
3. Falls back to `nl` (default locale)
4. Redirects to correct locale path

### Accessibility

LanguageSwitcher includes:
- `role="group"` on container
- `aria-label="Language switcher"` on group
- Individual `aria-label` on each button
- `aria-current="true"` on active locale button

## Verification Results

### Build Output
```
Route (app)
┌ ○ /_not-found
└ ● /[locale]
  ├ /nl
  ├ /pap
  └ /es

○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML (uses generateStaticParams)
```

All 3 locale routes successfully generated as static HTML.

### Success Criteria Met

- [x] next-intl middleware intercepts requests and routes to correct locale
- [x] [locale]/layout.tsx wraps all pages in NextIntlClientProvider with correct messages
- [x] Home page renders all content from translation files (home namespace)
- [x] LanguageSwitcher allows switching between NL/PAP/ES with URL update
- [x] Header is persistent across all pages with app name, nav, and language switcher
- [x] Build succeeds with static params for all 3 locales

## Self-Check: PASSED

### Created files verification
```
FOUND: aruba-leren/middleware.ts
FOUND: aruba-leren/src/app/[locale]/layout.tsx
FOUND: aruba-leren/src/app/[locale]/page.tsx
FOUND: aruba-leren/src/components/Header.tsx
FOUND: aruba-leren/src/components/LanguageSwitcher.tsx
```

### Commits verification
```
FOUND: 30586d0 (Task 1)
FOUND: 1e2bf95 (Task 2)
```

All claimed files exist and all commits are present in git history.

## Impact

This plan establishes the critical i18n infrastructure that all future pages and components depend on. The trilingual routing fulfills the locked requirement that the application must support "Nederlands, Papiamento en Spaans" from the start. The persistent header with language switcher satisfies the requirement that language switching must be "altijd zichtbaar in de header/navbar op elke pagina."

All future development can now assume:
- Every route is locale-aware
- Translations are available via `useTranslations` (client) or `getTranslations` (server)
- Users can switch languages from any page
- All 3 locales render correctly with appropriate translations

## Next Steps

Phase 01 Plan 02 will build on this foundation to implement authentication routing and UI, database schema, and environment configuration. The i18n infrastructure created here will ensure that all auth flows (login, signup) are also trilingual.
