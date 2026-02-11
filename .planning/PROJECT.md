# ArubaLeren

## What This Is

Een autonoom AI-bijlesplatform voor basisschoolleerlingen (6-12 jaar) op Aruba. Het platform toetst het niveau van het kind, identificeert hiaten, en biedt gepersonaliseerde bijles via "Koko" — een geduldige, Socratische AI-tutor die Nederlands spreekt met Papiamento-aanmoediging. Ouders beheren abonnementen en volgen de voortgang via een ouderportaal.

## Core Value

Kinderen op Aruba krijgen persoonlijke bijles die zich aanpast aan hun niveau, zonder dat een ouder of leerkracht erbij hoeft te zitten — volledig zelfstandig, in hun eigen taal en context.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Ouder kan account aanmaken via Google, Facebook of email
- [ ] Ouder kan meerdere kindprofielen koppelen aan hun account
- [ ] Ouder kan abonnement aanvragen via handmatige betaling (bankovermaking Arubabank / contant)
- [ ] Ouder kan betalingsbewijs uploaden of contante betaling aanvragen
- [ ] Admin (eigenaar) kan betalingen verifi\u00ebren en toegang verlenen
- [ ] Ouder kan voortgang van elk kind bekijken op een dashboard
- [ ] Kind doorloopt een autonome beginsituatietoets via chat-interface per vak
- [ ] AI-tutor "Koko" begeleidt het kind Socratisch (geeft nooit direct het antwoord)
- [ ] AI-tutor gebruikt Arubaanse context in alle voorbeelden (locaties, flora/fauna, Florins)
- [ ] AI-tutor spreekt Nederlands met Papiamento-aanmoediging
- [ ] Platform ondersteunt kernvakken: Taal (Nederlands), Rekenen, Begrijpend Lezen
- [ ] Platform ondersteunt zaakvakken: Geschiedenis, Aardrijkskunde, Kennis der Natuur (Arubaanse context)
- [ ] UI schakelt tussen Nederlands en Papiamento (taalswitch)
- [ ] Voortgang wordt bijgehouden per kind, per vak, per niveau

### Out of Scope

- Real-time video/audio tutoring — te hoge complexiteit en kosten voor MVP
- Automatische betalingsverwerking (iDEAL, creditcard) — Arubaanse markt vereist handmatig model
- Native mobile app — web-first, responsive design volstaat voor MVP
- Ouder-leerkracht communicatieplatform — focus op kind-tutor interactie
- Multiplayer/samenwerkingsfeatures — individueel leerpad eerst

## Context

- **Doelgroep:** Basisschoolleerlingen op Aruba, 6-12 jaar (groep 3-8 equivalent)
- **Onderwijs:** Volgt het offici\u00eble Arubaanse curriculum
- **Taal:** Kinderen groeien op met Papiamento als moedertaal, krijgen onderwijs in het Nederlands. De tutor sluit hier op aan met Nederlands als instructietaal en Papiamento voor aanmoediging
- **Cultuur:** Alle voorbeelden gebruiken Arubaanse context — Hooiberg, Arikok, Oranjestad, San Nicolas, Shoco, Divi-divi, Florins (Afl.), Carnival, Caquet\u00edo-geschiedenis
- **Betalingen:** Aruba heeft beperkte online-betalingsinfrastructuur. Model is handmatige verificatie: ouder maakt over via Arubabank of betaalt contant, admin verifieert en activeert
- **AI Tutor "Koko":** Gedetailleerde pedagogische skill beschikbaar in `.agents/skills/aruba-teacher-logic/SKILL.md` — definieert Socratische methode, growth mindset, foutafhandeling, vakspecifieke instructies, en Papiamento-aanmoedigingen
- **Admin:** Eenpersoonsoperatie — eigenaar beheert betalingsverificatie en platform

## Constraints

- **Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, Real-time), Vercel AI SDK met Anthropic Claude 3.5 Sonnet, Vercel deployment
- **Tweetaligheid:** Volledige UI-switch Nederlands/Papiamento vereist (next-intl of vergelijkbaar)
- **Authenticatie:** Supabase Auth met Google, Facebook en email/password providers
- **AI Budget:** Claude API-kosten moeten beheersbaar blijven — sessielengtes en prompt-effici\u00ebntie zijn belangrijk
- **Deployment:** Vercel (serverless) — past bij Next.js stack

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Handmatige betalingsverificatie i.p.v. payment gateway | Arubaanse markt heeft beperkte online-betalingsopties; bankovermaking en contant zijn standaard | — Pending |
| Claude 3.5 Sonnet als AI-engine | Beste balans tussen kwaliteit en kosten voor educatieve conversaties | — Pending |
| Supabase als backend | Combineert PostgreSQL, Auth, en real-time in \u00e9\u00e9n platform; snel op te zetten | — Pending |
| Tweetalige UI (NL/PAP) | Sluit aan bij de taalrealiteit van Arubaanse kinderen | — Pending |
| Meerdere kinderen per ouderaccount | Gezinnen op Aruba hebben vaak meerdere schoolgaande kinderen | — Pending |
| Koko als tutor-persona | Vriendelijke, herkenbare naam; pedagogische regels vastgelegd in skill-bestand | — Pending |

---
*Last updated: 2026-02-11 after initialization*
