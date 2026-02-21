# 🎓 Bijles App — Verbeteringen Prompt (v2.0)

Gebruik deze prompt als instructieset bij het verder ontwikkelen van de bijles-app voor Aruba.
Alle verbeteringen hieronder zijn prioriteit. Behandel elk punt zorgvuldig en systematisch.

---

## 🔧 CONTEXT

Je bent een senior developer die werkt aan een bijles-app voor Arubaanse basisschoolleerlingen (groepen 4-6).
De app overbrugt de taalbarrière tussen **Papiamento Arubano** (thuistaal) en Nederlands (onderwijstaal).
> ⚠️ Er bestaan twee varianten van het Papiaments: Arubaans (Papiamento) en Curaçaos (Papiamentu). Deze app gebruikt **uitsluitend de Arubaanse variant**. Curaçaos Papiamentu is een andere schrijfwijze/spelling en moet NIET gebruikt worden. Toekomstige uitbreiding naar Curaçao is mogelijk maar valt buiten de huidige scope.
De doelgroep zijn kinderen van 8–12 jaar én hun ouders (die vaak weinig tech-affiniteit hebben).

---

## 📋 VERBETERPUNTEN

---

### 1. 📊 RAPPORTAGES AAN OUDERS

Implementeer een volledig rapportagesysteem met de volgende onderdelen:

**Communicatiekanaal:**
- Primair: gedeelde PDF die ook **online bekijkbaar** is (geen printer nodig)
- Optioneel: directe WhatsApp-deelmogelijkheid via een "Deel via WhatsApp"-knop
- Taal: rapport altijd beschikbaar in **Arubaans Papiamento EN Nederlands**

**Inhoud rapport:**
- **Startmeting:** beginsituatie van de leerling (eerste sessie, nulmeting per vak)
- **Voortgang:** grafische weergave van groei over tijd (visuele lijngrafieken)
- **Moeilijkheden:** automatisch gegenereerde lijst van terugkerende probleemgebieden
- **Aandachtspunten:** "Hier moet [naam] extra aan werken" met concrete uitleg
- **Effectieve leertijd:** totale en wekelijkse tijd actief in de app (exclusief idle-tijd)
- **Foutanalyse:** meest gemaakte fouten per categorie, met frequentie
- **Studieplan:** voorgesteld weekplan voor de komende periode, met voortgangscontrole
  - Ouder/tutor kan plan bevestigen of aanpassen

**Betalingsmodel (toon keuze bij onboarding tutor):**
- Per sessie (flexibel)
- Per week
- Per maand (met korting)
- Per jaar (met maximale korting)
- Toon duidelijke prijsvergelijking bij keuze

---

### 2. 🤖 AVATAR: KOKO — VISUELE VERBETERING

De huidige Koko-avatar is te vlak en saai. Vervang door:

- **3D-stijl avatar** (gebruik CSS 3D transforms of een SVG-gebaseerde 3D-look)
- **Levendige, warme kleuren:** gebruik het Arubaanse kleurenpalet (geel, oranje, turquoise, koraalrood)
- **Expressies:** Koko toont verschillende gezichtsuitdrukkingen (blij, aanmoedigend, denkend, verrast)
- **Animaties:** subtiele bewegingen (knipperen, hoofdknik bij correct antwoord, schudden bij fout)
- **Responsief:** Koko's expressie past zich aan op het resultaat van de leerling

---

### 3. 🔊 STEM & UITSPRAAK — VOLLEDIGE REVISIE

**Nederlands:**
- Vervang de huidige TTS door een **hoogwaardige Neural TTS-stem** (voorkeur: OpenAI TTS `onyx` of `nova`, of ElevenLabs Nederlandse stem)
- Vereisten:
  - Correct tempo (niet te snel, niet robotisch)
  - Goede interpunctie-pauzes (punt = 600ms pauze, komma = 300ms)
  - Spaties worden NIET uitgesproken
  - Zinnen worden als geheel uitgesproken, niet woord voor woord
  - Test met complexe zinnen: "Jan en Piet lopen naar school, maar het regent."

**Papiamento (Arubaans):**
- Onderzoek beschikbaarheid van native **Arubaans Papiamento** TTS — dit is een andere variant dan Curaçaos Papiamentu en mag daar NIET mee verwisseld worden
- Als geen goede Arubaans-Papiamento stem beschikbaar is:
  - Zet Papiamento-inhoud automatisch op **"Alleen lezen"-modus** (tekst zichtbaar, geen audio)
  - Toon melding: "🔇 Gesproken Papiamento is nog niet beschikbaar. Lees de tekst zelf voor."
  - Bied optie aan om tekst te laten voorlezen door de tutor/ouder via een microfoonfunctie

**Arubaanse voorbeelden met slechte uitspraak:**
- Als uitspraak van eigennamen/plaatsen slecht is: vervang door neutrale, internationaal begrijpelijke voorbeelden
- Of: gebruik "Alleen lezen" voor Aruba-specifieke content totdat uitspraak verbeterd is

---

### 4. 🎨 VISUELE ONDERSTEUNING — GROOT VERBETERPUNT

**Whiteboard/Bord:**
- Het bord moet **vloeiend animeren** (schrijfeffect, geen instant verschijnen)
- Gebruik **tekeningen en iconen** naast tekst (SVG-illustraties)
- Lijn en kleur gebruiken om structuur te geven

**Wiskunde — Wiskundige notatie:**
- NOOIT breuken schrijven als `1/4`
- Gebruik altijd echte breuken:
  - Inline: `¼` (Unicode-breukenteken)
  - Groot/uitgelegd: teller boven de streep, noemer eronder (HTML `<sup>` / `<sub>` of MathML/KaTeX)
- Gebruik KaTeX of MathJax voor alle wiskundige notaties
- Vermenigvuldiging: gebruik `×` niet `*`
- Kladblaadje: zie punt 6

**Nederlands — Zinsontleding met kleurcodering:**

| Onderdeel | Kleur | Beschrijving |
|---|---|---|
| Persoonsvorm (PV) | 🔴 Rood | Het werkwoord dat vervoegd wordt |
| Gezegde | 🟠 Oranje | Alle werkwoorden samen |
| Onderwerp (OND) | 🔵 Blauw | Wie/wat doet het? |
| Lijdend voorwerp (LV) | 🟢 Groen | Wie/wat ondergaat het? |
| Meewerkend voorwerp (MWV) | 🟣 Paars | Aan/voor wie? |

- Interactief: leerling kan woorden aanklikken en de juiste kleur toewijzen
- Animatie bij juist antwoord: woord "springt" in de juiste kleur

---

### 5. ⏱️ TIME TIMER — VISUELE TIJDWEERGAVE

Vervang de cijfer-afteltimer volledig door een **Time Timer**:

- **Rood-witte cirkelvisualisatie:** rood segment krimpt naarmate de tijd verstrijkt
- Geïnspireerd op de echte Time Timer® (rood segment = resterende tijd)
- Geen cijfers verplicht (optioneel tonen als instelling)
- Animatie: soepel, niet schokkerig
- Kleuren: rood (`#E63946`) op wit, met subtiele schaduw
- Geluid: optioneel tikgeluid en belgeluid aan het einde
- Implementeer als herbruikbaar component: `<TimeTimer duration={600} />`

```jsx
// Voorbeeld implementatie idee:
// SVG-cirkel met stroke-dashoffset animatie
// Rood segment neemt af van 100% naar 0%
```

---

### 6. 📝 KLADBLAADJE BIJ REKENEN — VERPLICHT

Bij ELKE rekenopgave:

- Toon een **interactief digitaal kladblaadje** naast of onder de opgave
- Gebruik een canvas-element waarop de leerling kan tekenen/schrijven (stylus/vinger/muis)
- Of: tekstveld voor tussenstappen
- **Prominente herinnering bij elke nieuwe opgave:** 
  > "✏️ Gebruik je kladblaadje! Schrijf je tussenstappen op."
- Herinnering verdwijnt NIET automatisch — moet actief weggeklikt worden
- Bewaar kladblaadje-inhoud zodat de tutor/ouder kan zien hoe het kind rekent

---

### 7. 📄 PDF ONLINE BESCHIKBAAR

Alle gegenereerde PDF's (rapporten, oefenbladen) moeten:

- **Online bekijkbaar** zijn via een unieke link (geen download verplicht)
- Weergave in browser: gebruik een **PDF-viewer component** of converteer naar responsive HTML
- Deelbaar via link (kopieer-knop aanwezig)
- Beveiligd: link heeft vervaldatum (bijv. 30 dagen) of is alleen toegankelijk met inlogcode
- WhatsApp-deelknop: `https://wa.me/?text=Bekijk%20het%20rapport%20van%20[naam]:%20[link]`

---

### 8. 🌍 ARUBAANSE CONTEXT — UITSPRAAKVEREISTEN

Voor alle Arubaans-contextgebonden voorbeelden:

**Als uitspraak GOED is:**
- Behoud de Arubaanse context (namen, plaatsen, tradities)
- Zorg dat TTS-stem eigennamen correct benadert

**Als uitspraak SLECHT is (fallback):**
- Keuze A: vervang door universele, neutrale voorbeelden (Amsterdam, Jan, Marie)
- Keuze B: gebruik "Alleen lezen" modus — geen audio, wel tekst
- Nooit slechte uitspraak laten staan in de productieversie

---

## ✅ ACCEPTATIECRITERIA (Definition of Done)

Per verbeterpunt geldt: het punt is KLAAR als:
- [ ] De functionaliteit werkt op mobiel (primair device van leerlingen)
- [ ] Getest is met een kind van 8-12 jaar (of gesimuleerd)
- [ ] Zowel Nederlands als Papiamento-content correct verwerkt wordt
- [ ] Visuele output voldoet aan het kleur- en stijlpalet van de app
- [ ] Performance: geen merkbare vertraging op een low-end Android telefoon
- [ ] **Stem/audio klinkt natuurlijk en aangenaam** — prettig om naar te luisteren, ook bij langere sessies. Test door minimaal 5 minuten aaneengesloten te luisteren. Geen irritant, robotisch of vermoeiend stemgeluid.

---

## 📚 KERNDOELEN CHECK

De koppeling met kerndoelen is **optioneel zichtbaar voor ouders** maar moet te allen tijde beschikbaar zijn.

- **Voor ouders:** kerndoelen worden NIET standaard getoond in het rapport, maar kunnen worden opgeroepen via een "Meer info"-knop of apart tabblad
- **Voor docenten:** kerndoelenoverzicht is opvraagbaar als exportdocument (PDF of online) — inclusief welke doelen gedekt zijn en welke nog ontbreken
- **Voor promotie:** de koppeling met officiële kerndoelen is een sterk verkoopargument. Communiceer dit duidelijk op social media: *"Onze app is afgestemd op de officiële kerndoelen van het Arubaans basisonderwijs"*

Bij elke module intern bijhouden:
1. Welk kerndoel wordt gedekt?
2. Is de oefening passend voor het niveau?
3. Zijn er kerndoelen die nog NIET gedekt worden? → Backlog-item aanmaken

---

## 📱 SOCIAL MEDIA STRATEGIE — PROMOTIE OP ARUBA

De app moet actief gepromoot worden via alle relevante social media kanalen op Aruba, met maximaal bereik.

**Anonimiteit:**
- Geen persoonsnaam van de maker zichtbaar in enige communicatie
- Maak een **apart zakelijk Gmail-account** aan als basis (bijv. `bijlesaruba@gmail.com` of `kokolearns@gmail.com`)
- Alle accounts worden op naam van het merk/de app geregistreerd, niet op persoonsnaam

**Kanalen (prioriteit voor Aruba):**

| Platform | Aanpak | Frequentie |
|---|---|---|
| **Facebook** | Primair kanaal op Aruba — gerichte advertenties op ouders (30-50j) | Dagelijks |
| **Instagram** | Visuele content: Koko-animaties, voor/na resultaten, tips | 4-5x/week |
| **WhatsApp** | Directe outreach naar scholen, oudergroepen, kerkgemeenschappen | Wekelijks |
| **TikTok** | Korte video's: leermomentjes, "Wist je dat…", Koko in actie | 3-4x/week |
| **YouTube** | Langere demo's, testimonials, uitlegvideo's | 1x/week |

**Content strategie:**
- Altijd in het **Papiamento én Nederlands** posten (vergroot bereik enorm)
- Gebruik herkenbare Arubaanse elementen: kleuren, locaties, tradities
- **Sociaal bewijs:** deel (geanonimiseerde) resultaten van leerlingen
- **Gratis tip-content:** korte lesmomenten die waarde geven → vertrouwen bouwen
- Koppel aan actuele momenten: begin schooljaar, examens, vakantie-inhaal

**Groei-tactieken (organisch én betaald):**
- Samenwerkingen met Arubaanse scholen en leerkrachten (mond-tot-mond)
- Outreach naar WhatsApp-groepen van ouders (via tussenpersoon)
- Facebook-advertenties gericht op: ouders op Aruba, leerkrachten, Nederlandse expats
- Tag relevante Arubaanse organisaties: DOW, SKOA, scholen
- Gebruik hashtags: `#Aruba #bijles #papiamento #onderwijs #leren #koko`

**Technische setup:**
- Facebook Business Manager account (anoniem op app-naam)
- Instagram Business account (gekoppeld aan Facebook)
- Meta Pixel op de app/website voor retargeting
- Maak een simpele landingspagina: `kokolearns.com` of `bijlesaruba.com`

---

*Prompt versie 2.1 — Bijles App Aruba | 2026*
