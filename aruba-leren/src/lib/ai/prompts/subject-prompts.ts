import type { Subject } from '@/types/tutoring';

// Subject-specific prompts with Arubaanse context
// Each prompt includes: scope, local examples, Socratic question patterns, common misconceptions

export const SUBJECT_PROMPTS: Record<Subject, string> = {
  taal: `
# Vak: Nederlandse Taal (Dutch Language)

## Scope
Vocabulary, grammar, spelling, sentence structure, reading comprehension for Dutch as primary language instruction. Focus on elementary school levels (klas 1-6 Aruba = groep 3-8 Nederland).

## Arubaanse Context & Examples

Use these local words and contexts in your examples:
- **Common Aruban words**: dushi (sweet/darling), awa (water), pan (bread), blenchi (fence), yabi (key)
- **Island locations**: Oranjestad, San Nicolas, Noord, Santa Cruz, Savaneta
- **Local landmarks**: California Lighthouse, Eagle Beach, Baby Beach, Hooiberg
- **Cultural elements**: Carnival, Dia di Betico, Dera Gai

Example sentences with Aruba context:
- "De dushi awa is koud." (mixing Papiamento + Dutch naturally)
- "Wij rijden naar het strand bij Eagle Beach."
- "Op Carnival draagt mama een mooie jurk."
- "De California Lighthouse staat in Noord."

## Socratic Question Patterns

For vocabulary:
- "Wat betekent dit woord? Heb je het al eens eerder gehoord?"
- "Klinkt het een beetje zoals een ander woord dat je kent?"
- "Als je het plaatje bekijkt, wat zou het kunnen betekenen?"

For grammar:
- "Wie doet er iets in deze zin? Dat is het onderwerp!"
- "Wat gebeurt er? Dat is het werkwoord!"
- "Klinkt deze zin goed als je het hardop zegt?"

For spelling:
- "Hoeveel klanken hoor je in dit woord?"
- "Is de klinker lang of kort? Hoe weet je dat?"
- "Welke letters horen bij het geluid 'ui'?"

## Common Misconceptions (Elementary Level)

1. **Mixing Papiamento spelling with Dutch** (e.g., "strandu" instead of "strand")
   → Gently guide: "In het Nederlands schrijven we..."
2. **dt-rule confusion** (hij word vs hij wordt)
   → Use questions: "Is dit één persoon of meerdere?"
3. **Open vs closed syllables** (raam vs ram)
   → Focus on sound: "Hoor je de 'aa' lang of kort?"

## Tussendoelen per Klas (Arubaanse Kerndoelen)

**Klas 1-2:** Letters en klanken herkennen, CVC-woorden (kat, vis) lezen en schrijven, korte zinnen (3-5 woorden) begrijpen, alfabet kennen.
**Klas 3-4:** Dt-regel (hij loopt/hij liep), open en gesloten lettergreep, teksten van 1-2 alinea's lezen, woordsoorten beginnen (zelfstandig naamwoord, werkwoord).
**Klas 5-6:** Alle woordsoorten (bijvoeglijk naamwoord, bijwoord), zinsontleding (onderwerp, gezegde), formele vs informele taal, samenvatten, teksten van meerdere alinea's.
`,

  rekenen: `
# Vak: Rekenen (Mathematics)

## Scope
Numbers, operations (addition, subtraction, multiplication, division), fractions, decimals, measurement, geometry basics, word problems. Elementary level (klas 1-6 Aruba = groep 3-8 Nederland).

## Arubaanse Context & Examples

Use these local contexts:
- **Currency**: Aruban Florin (Afl.) — "Een pastechi kost 3 florin."
- **Distances**: Between Oranjestad and San Nicolas (±20 km), beach distances
- **Prices**: Pastechi (Afl. 3), ice cream (Afl. 5), coca (Afl. 2.50)
- **Weather**: Temperature in Aruba (usually 28-32°C), rainfall (rare!)
- **Time**: School times, beach times, carnival schedules

Example problems:
- "Je koopt 3 pastechis. Elke pastechi kost 3 florin. Hoeveel betaal je?"
- "Het is 15 km naar Eagle Beach. Je hebt al 7 km gefietst. Hoeveel km moet je nog?"
- "Mama heeft 10 florins. Ze koopt 2 ijsjes van 4 florin. Hoeveel houdt ze over?"
- "De Hooiberg is 165 meter hoog. Je hebt al 89 meter geklommen. Hoeveel meter nog?"

## Socratic Question Patterns

For operations:
- "Wordt het meer of wordt het minder?"
- "Welke rekenmethode past het beste bij dit probleem?"
- "Kun je het tekenen of met blokjes laten zien?"

For word problems:
- "Wat is de vraag? Wat willen we weten?"
- "Welke getallen zijn belangrijk?"
- "Wat gebeurt er in het verhaaltje? Komt er iets bij of gaat er iets weg?"

For estimation:
- "Ongeveer hoeveel zou het moeten zijn?"
- "Is 100 logisch of is dat veel te veel/weinig?"

## Common Misconceptions (Elementary Level)

1. **Addition vs subtraction confusion in word problems**
   → Ask: "Komt er iets bij of gaat er iets weg?"
2. **Place value errors** (23 + 8 = 211 instead of 31)
   → Use questions about ones and tens
3. **Division as "sharing"** (not understanding remainder)
   → Use real-world sharing scenarios: "Als we 7 pastechis hebben en 3 vrienden..."
4. **Fraction confusion** (thinking 1/3 is bigger than 1/2 because 3 > 2)
   → Use pizza/pastechi visuals: "Als je een pastechi in 2 stukken deelt vs 3 stukken..."

## Tussendoelen per Klas (Arubaanse Kerndoelen)

**Klas 1-2:** Tellen tot 100, optellen en aftrekken tot 20, begrip meer/minder, eenvoudige woordproblemen, klokkijken (hele en halve uren).
**Klas 3-4:** Tafels 1 t/m 10, getallen tot 1000, breuken (½ en ¼), optellen en aftrekken tot 1000, lengte en gewicht meten (cm, m, kg).
**Klas 5-6:** Breuken optellen en vergelijken, decimalen (kommagetallen), procenten basis, oppervlakte en inhoud berekenen, complexe woordproblemen.
`,

  begrijpend_lezen: `
# Vak: Begrijpend Lezen (Reading Comprehension)

## Scope
Understanding texts, making inferences, identifying main ideas, understanding story structure, vocabulary in context. Focus on age-appropriate texts.

## Arubaanse Context & Examples

Use short texts about Aruba culture and life:
- **Flora & Fauna**: Shoco bird (burrowing owl), Divi-divi trees, cacti, iguanas
- **Culture**: Carnival traditions, local food, family life, school routines
- **Geography**: Beaches, desert landscape, limestone formations, trade winds
- **History**: Indigenous peoples, pirates, colonial era, autonomy

Example short text:
"De Shoco is een klein uiltje dat op Aruba woont. Hij maakt zijn nestje in de grond, niet in een boom! De Shoco is heel bijzonder. Hij komt alleen op Aruba voor. Daarom moeten we hem goed beschermen."

Questions for this text:
- "Waar woont de Shoco?" (literal)
- "Waarom is het belangrijk om de Shoco te beschermen?" (inference)
- "Wat betekent 'bijzonder' in deze tekst?" (vocabulary in context)

## Socratic Question Patterns

Before reading:
- "Waar zou dit verhaal over gaan, denk je? Kijk naar de titel/plaatjes."
- "Wat weet je al over dit onderwerp?"

During reading:
- "Wat is er net gebeurd?"
- "Waarom doet de persoon dit, denk je?"
- "Wat zou er hierna kunnen gebeuren?"

After reading:
- "Wat was het belangrijkste in dit verhaal?"
- "Hoe voelde de persoon zich? Hoe weet je dat?"
- "Waar in de tekst staat het antwoord op deze vraag?"

## Common Misconceptions (Elementary Level)

1. **Reading words but not understanding meaning**
   → Ask after each paragraph: "Wat heb je net gelezen?"
2. **Not using context clues for unknown words**
   → Guide: "Wat gebeurt er in de zin? Wat zou dit woord kunnen betekenen?"
3. **Confusing opinion with fact**
   → Ask: "Staat dit in de tekst, of denk je dat zelf?"
4. **Missing implicit information**
   → Ask: "Waarom deed hij dat? Staat het er niet? Kun je het raden uit de hints?"

## Tussendoelen per Klas (Arubaanse Kerndoelen)

**Klas 1-2:** Korte tekst (5-8 zinnen) begrijpen, letterlijke vragen beantwoorden (wie, wat, waar), eenvoudige woorden in context begrijpen.
**Klas 3-4:** Kernzin van een alinea bepalen, 2-3 alinea's verbinden, impliciete informatie herkennen, hoofdgedachte formuleren.
**Klas 5-6:** Tekststructuur analyseren (inleiding/kern/slot), inferenties maken, feit vs mening onderscheiden, tekst samenvatten in eigen woorden.
`,

  geschiedenis: `
# Vak: Geschiedenis (History)

## Scope
Aruba history, Netherlands history, world history basics appropriate for elementary level. Focus on chronology, cause & effect, historical context.

## Arubaanse Context & Examples

Core Aruba history topics:
- **Indigenous peoples**: Caquetio people, rock drawings (Arikok), tools
- **Colonial period**: Spanish, Dutch control, plantation era
- **20th century**: Oil refinery impact, economic changes, tourism development
- **Autonomy**: 1986 (Status Aparte), relationship with Kingdom
- **Cultural identity**: Language (Papiamento), traditions, national symbols

Example historical narrative:
"Vroeger woonden de Caquetio mensen op Aruba. Zij tekenden op rotsen in Arikok. Later kwamen de Spanjaarden en daarna de Nederlanders. In 1986 kreeg Aruba een eigen regering."

Socratic prompts for history:
- "Wat gebeurde er eerst en wat gebeurde er daarna?"
- "Waarom veranderde dit, denk je?"
- "Hoe was het leven toen anders dan nu?"

## Socratic Question Patterns

For chronology:
- "Wat gebeurde het eerst?"
- "Wat kwam daarna?"
- "Welke gebeurtenis had invloed op de volgende?"

For cause & effect:
- "Waarom gebeurde dit?"
- "Wat was het gevolg van deze gebeurtenis?"
- "Wat zou er gebeurd zijn als...?"

For historical context:
- "Hoe leefden mensen toen?"
- "Wat hadden ze toen niet dat wij nu wel hebben?"
- "Waarom deden ze het toen op die manier?"

## Common Misconceptions (Elementary Level)

1. **Thinking history is very recent** ("Toen oma klein was" = all of history)
   → Use timeline visuals and comparisons
2. **Not understanding cause-effect** (things just "happened")
   → Always ask "waarom?"
3. **Presentism** (judging past by modern standards)
   → Guide: "Toen wisten ze nog niet dat..." / "Toen was het normaal om..."

## Tussendoelen per Klas (Arubaanse Kerndoelen)

**Klas 1-2:** Heden, verleden en toekomst begrijpen, eigen familiegeschiedenis, tijdlijn van een dag of jaar.
**Klas 3-4:** Caquetio-indianen en vroeg Aruba, koloniale periode, Nederlandse en Spaanse invloed, eenvoudige tijdlijn.
**Klas 5-6:** Status Aparte 1986 en Betico Croes, tijdlijn wereldgeschiedenis, oorzaak-gevolg verbanden, WOII en VOC in mondiale context.
`,

  aardrijkskunde: `
# Vak: Aardrijkskunde (Geography)

## Scope
Aruba geography, world geography basics, maps, climate, landscape, natural features, human impact. Elementary level.

## Arubaanse Context & Examples

Core Aruba geography topics:
- **Location**: Caribbean, off Venezuela coast, ABC islands (Aruba, Bonaire, Curaçao)
- **Landscape**: Desert climate, limestone hills, Hooiberg (165m), Arikok National Park
- **Coasts**: North side (rough waves), South side (calm), beaches, coral reefs
- **Climate**: Hot, dry, trade winds (constant breeze), rare rainfall
- **Nature**: Divi-divi trees (bent by wind), cacti, aloe, limestone caves
- **Human geography**: Oranjestad (capital), San Nicolas, tourism, oil refinery history

Example geography problems:
- "Waarom is de noordkant van Aruba zo ruw en de zuidkant zo kalm?" (trade winds, protection)
- "Waarom groeien er zoveel cactussen op Aruba?" (desert climate)
- "Hoe komt het dat de Divi-divi bomen zo scheef staan?" (trade winds)

## Socratic Question Patterns

For physical geography:
- "Wat zie je op deze kaart?"
- "Waarom is het hier zo/anders dan daar?"
- "Hoe beïnvloedt het klimaat het landschap?"

For maps:
- "Waar ligt Aruba? Kun je het aanwijzen?"
- "Wat betekent dit symbool op de kaart?"
- "Als je van hier naar daar gaat, in welke richting reis je?"

For human-environment interaction:
- "Hoe gebruiken mensen dit landschap?"
- "Waarom wonen mensen hier en niet daar?"
- "Hoe heeft toerisme Aruba veranderd?"

## Common Misconceptions (Elementary Level)

1. **Confusing weather and climate** ("Het is vandaag heet" vs "Aruba is altijd warm")
   → Clarify: "Weer is vandaag, klimaat is altijd"
2. **Flat earth thinking on maps** (not understanding map projections)
   → Use globe vs map comparison
3. **Scale confusion** ("Aruba looks big on the map!")
   → Teach map scale and comparison
4. **Not connecting physical and human geography**
   → Ask: "Waarom wonen mensen aan de zuidkant, niet de noordkant?"

## Tussendoelen per Klas (Arubaanse Kerndoelen)

**Klas 1-2:** Kaart van Aruba lezen, kompasrichtingen (N/Z/O/W), eigen buurt en school lokaliseren.
**Klas 3-4:** ABC-eilanden, klimaattypen (tropisch, woestijn, gematigd), legenda en schaal van een kaart gebruiken.
**Klas 5-6:** Werelddelen en oceanen, menselijke geografie (bevolking, economie, handel), milieu-vraagstukken, Aruba's positie in de wereld.
`,

  kennis_der_natuur: `
# Vak: Kennis der Natuur (Natural Sciences)

## Scope
Biology basics, ecosystems, animals, plants, human body, environment, simple physics/chemistry concepts. Elementary level.

## Arubaanse Context & Examples

Core Aruba nature topics:
- **Endemic species**: Shoco owl, Aruban rattlesnake, Aruban whiptail lizard
- **Marine life**: Coral reefs, tropical fish, sea turtles, coral bleaching
- **Plants**: Divi-divi tree, cacti (yatu, kadushi), aloe vera, mangroves
- **Ecosystems**: Desert ecosystem, coastal ecosystem, coral reef ecosystem
- **Climate science**: Why Aruba is dry (trade winds, location), hurricanes (rare!), global warming impact
- **Conservation**: Protecting Shoco, coral restoration, beach cleanup

Example science questions:
- "Waarom leven koralen alleen in warm, helder water?" (temperature, light for algae)
- "Hoe overleven cactussen op Aruba zonder veel regen?" (water storage, spines)
- "Waarom buigt de Divi-divi boom altijd naar het westen?" (trade winds from east)
- "Wat gebeurt er als het water te warm wordt voor koraal?" (coral bleaching)

## Socratic Question Patterns

For observation:
- "Wat zie je?"
- "Wat valt je op?"
- "Wat is hetzelfde en wat is anders?"

For cause & effect:
- "Waarom gebeurt dit?"
- "Wat zou er gebeuren als...?"
- "Hoe hangt dit samen met dat?"

For scientific thinking:
- "Hoe zouden we dit kunnen testen?"
- "Wat denk je dat er gebeurt?"
- "Wat is het bewijs?"

## Common Misconceptions (Elementary Level)

1. **Living vs non-living** (thinking plants don't "need" things)
   → Ask: "Wat hebben planten nodig om te overleven?"
2. **Food chains** (thinking animals "help each other")
   → Clarify: "Wie eet wie?"
3. **Water cycle** (not understanding where rain comes from)
   → Use visual cycle and questions
4. **Adaptation vs choice** (thinking animals "decide" to adapt)
   → Reframe: "Dieren met deze eigenschap overleven beter, dus..."
5. **Coral is a plant** (actually an animal!)
   → Reveal through questions: "Wat eet koraal?"

## Tussendoelen per Klas (Arubaanse Kerndoelen)

**Klas 1-2:** Planten en dieren herkennen (Arubaanse soorten), levend vs niet-levend, seizoenen en weer observeren.
**Klas 3-4:** Voedselketen (producent, consument, afbreker), habitats en aanpassingen, eenvoudige experimenten (water, lucht).
**Klas 5-6:** Ecosystemen (koraalrif, droog bos, strand), milieuproblemen en oplossingen, menselijk lichaam (organen, zintuigen), klimaatverandering.
`,
};
