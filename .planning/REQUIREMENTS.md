# Requirements: ArubaLeren

**Defined:** 2026-02-12
**Core Value:** Kinderen op Aruba krijgen persoonlijke bijles die zich aanpast aan hun niveau, volledig zelfstandig, in hun eigen taal en context.

## v1.0 Requirements

Requirements voor de MVP-launch. Elke requirement mapt naar een roadmap-fase.

### Authenticatie & Accounts

- [ ] **AUTH-01**: Ouder kan account aanmaken via email en wachtwoord
- [ ] **AUTH-02**: Ouder kan inloggen via Google OAuth
- [ ] **AUTH-03**: Ouder kan inloggen via Facebook OAuth
- [ ] **AUTH-04**: Ouder sessie blijft actief na browser refresh
- [ ] **AUTH-05**: Ouder kan meerdere kindprofielen aanmaken (voornaam, klas 1-6, leeftijd)
- [ ] **AUTH-06**: Ouder geeft bij registratie toestemming voor AI-bijles via verplicht vinkje

### AI Tutoring - Koko

- [ ] **TUTOR-01**: Kind kan een vak kiezen en een bijlessessie starten met Koko
- [ ] **TUTOR-02**: Koko begeleidt Socratisch — geeft nooit direct het antwoord
- [ ] **TUTOR-03**: Koko spreekt Nederlands als instructietaal, schakelt naar Papiamento als kind te zwak is in Nederlands, en kan ook Spaans gebruiken voor Spaanstalige kinderen
- [ ] **TUTOR-04**: Koko gebruikt Arubaanse context in voorbeelden (Hooiberg, Florins, Shoco, etc.)
- [ ] **TUTOR-05**: Koko geeft directe feedback op antwoorden (goed/fout + uitleg)
- [ ] **TUTOR-06**: Koko past moeilijkheidsgraad aan op basis van prestaties
- [ ] **TUTOR-07**: Platform ondersteunt 3 kernvakken (Taal, Rekenen, Begrijpend Lezen) en 3 zaakvakken (Geschiedenis, Aardrijkskunde, Kennis der Natuur)
- [ ] **TUTOR-08**: Koko genereert printbare PDF-werkbladen na succesvolle oefeningen
- [ ] **TUTOR-09**: Kind kan huiswerk maken met ondersteuning van Koko via de app
- [ ] **TUTOR-10**: Kind kan gericht hiaten bijwerken per kernvak (bijv. breuken, ontleden, samenvatten)
- [ ] **TUTOR-11**: Kernvakken volgen de Arubaanse Kerndoelen en bijbehorende leerlijnen voor klas 1-6
- [ ] **TUTOR-12**: Leerkracht/bijlesmeneer kan leerstof voor zaakvakken handmatig invoeren of als PDF uploaden

### Beginsituatietoets

- [ ] **TOETS-01**: Kind doorloopt een beginsituatietoets per vak via chat met Koko
- [ ] **TOETS-02**: Toets past moeilijkheid aan op basis van antwoorden (adaptief)
- [ ] **TOETS-03**: Na afloop wordt een startniveau bepaald per vak

### Ouderportaal

- [ ] **OUDER-01**: Ouder ziet een dashboard met voortgang per kind, per vak
- [ ] **OUDER-02**: Ouder kan kindprofielen bewerken en toevoegen
- [ ] **OUDER-03**: Ouder kan abonnementsstatus en betalingsgeschiedenis bekijken
- [ ] **OUDER-04**: Ouder ontvangt wekelijks een automatisch gegenereerd voortgangsbericht per kind
- [ ] **OUDER-05**: Ouder kan een vakantierooster bekijken met Arubaanse schoolvakanties

### Betalingen

- [ ] **PAY-01**: Ouder kan betalingsbewijs uploaden (foto bankovermaking)
- [ ] **PAY-02**: Ouder kan contante betaling aanvragen
- [ ] **PAY-03**: Toegang tot platform is gekoppeld aan actief abonnement
- [ ] **PAY-04**: Ouder kan kiezen uit abonnementsperiodes: per keer, per week, per maand, of per schooljaar

### Admin Panel

- [ ] **ADMIN-01**: Admin kan openstaande betalingsverzoeken bekijken
- [ ] **ADMIN-02**: Admin kan betaling goedkeuren en abonnement activeren
- [ ] **ADMIN-03**: Admin kan overzicht bekijken van alle families en kinderen
- [ ] **ADMIN-04**: Admin ontvangt melding (flag) als een kind 3x achtereen een concept niet begrijpt
- [ ] **ADMIN-05**: Admin kan het vakantierooster beheren (schoolvakanties Aruba)
- [ ] **ADMIN-06**: Admin kan geuploade leerstof van leerkrachten bekijken en beheren

### Drietalige Interface

- [ ] **I18N-01**: Gebruiker kan de UI schakelen tussen Nederlands, Papiamento en Spaans
- [ ] **I18N-02**: Alle UI-teksten, labels en navigatie zijn beschikbaar in drie talen

### Privacy & Beveiliging

- [ ] **PRIV-01**: Platform slaat alleen strikt noodzakelijke data op (voornaam, klas, voortgang)
- [ ] **PRIV-02**: Privacyverklaring is beschikbaar als pagina op het platform
- [ ] **PRIV-03**: Alle API-sleutels staan in .env en zijn uitgesloten via .gitignore
- [ ] **PRIV-04**: Alle database-tabellen hebben Row Level Security (RLS) ingeschakeld

### Voortgang & Monitoring

- [ ] **PROG-01**: Voortgang wordt bijgehouden per kind, per vak, per niveau
- [ ] **PROG-02**: Kind ziet eigen voortgang met visuele indicatoren
- [ ] **PROG-03**: Koko geeft een flag als een kind 3x achtereen vastloopt op een concept

## v2 Requirements

Uitgesteld naar toekomstige release. Bijgehouden maar niet in huidige roadmap.

### Geavanceerde Features

- **ADV-01**: Voice/audio-first modus — tekst-naar-spraak voor vragen, spraakinvoer voor antwoorden
- **ADV-02**: Offline oefenmodus — lessen downloaden voor offline gebruik
- **ADV-03**: Geavanceerde leeranalytics met voorspellende inzichten
- **ADV-04**: Milestone-vieringen en badges voor behaalde vaardigheden
- **ADV-05**: WhatsApp/Facebook community-integratie voor ouders
- **ADV-06**: Leerkrachtportaal met klasoverzicht (als scholen adopteren)

## Out of Scope

Expliciet uitgesloten. Gedocumenteerd om scope creep te voorkomen.

| Feature | Reden |
|---------|-------|
| Real-time video/audio tutoring | Te hoge complexiteit en kosten voor MVP |
| Automatische betalingsverwerking (iDEAL, creditcard) | Arubaanse markt vereist handmatig model |
| Native mobile app | Web-first, responsive design volstaat voor MVP |
| Ouder-leerkracht communicatieplatform | Focus op kind-tutor interactie |
| Multiplayer/samenwerkingsfeatures | Individueel leerpad eerst |
| Competitieve leaderboards | Onderzoek toont negatieve effecten op intrinsieke motivatie bij kinderen |
| Social features (vrienden, chat) | COPPA-compliancerisico; afleidend van leren |
| AI-beoordeling van open opdrachten | AI-grading nog onbetrouwbaar voor genuanceerd werk |

## Traceability

Welke fases welke requirements dekken. Wordt bijgewerkt tijdens roadmap-creatie.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (wordt ingevuld door roadmapper) | | |

**Coverage:**
- v1.0 requirements: 37 totaal
- Mapped to phases: 0
- Unmapped: 37

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after initial definition*
