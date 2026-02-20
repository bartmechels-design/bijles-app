import type { Subject } from '@/types/tutoring';

/**
 * Hiaat (learning gap) topics per subject.
 * Used by HiatenSelector component and injected into Koko's system prompt.
 */
export interface HiaatTopic {
  id: string;
  label: string;
  prompt: string;
}

export const HIAAT_TOPICS: Record<Subject, HiaatTopic[]> = {
  taal: [
    {
      id: 'spellen_lange_klinkers',
      label: 'Lange klinkers',
      prompt:
        'Focus UITSLUITEND op het spellen van woorden met lange klinkers (open lettergreep, dubbele klinker). Stel ALLEEN vragen over dit onderwerp. Gebruik Arubaanse context: woorden zoals "zee", "boom", "brood", namen van plekken op Aruba.',
    },
    {
      id: 'spellen_dt_regel',
      label: 'dt-regel',
      prompt:
        'Focus UITSLUITEND op de dt-regel (hij loopt / jij loopt / hij liep). Oefen ALLEEN zinnen waarbij het kind moet kiezen tussen -t of -dt of -d. Gebruik korte, duidelijke zinnen met Arubaanse context.',
    },
    {
      id: 'zinsontleding',
      label: 'Zinsontleding',
      prompt:
        'Focus UITSLUITEND op zinsontleding: onderwerp en werkwoord vinden in een zin. Stel ALLEEN vragen hierover. Gebruik eenvoudige zinnen over het dagelijks leven op Aruba.',
    },
    {
      id: 'woordsoorten',
      label: 'Woordsoorten',
      prompt:
        'Focus UITSLUITEND op woordsoorten: zelfstandig naamwoord, bijvoeglijk naamwoord en werkwoord herkennen. Stel ALLEEN vragen hierover. Gebruik voorbeeldzinnen met Arubaanse context.',
    },
    {
      id: 'samenvatten',
      label: 'Samenvatten',
      prompt:
        'Focus UITSLUITEND op het samenvatten van een korte tekst. Geef een korte tekst (3-5 zinnen) en vraag het kind de hoofdgedachte of een samenvatting te geven. Gebruik teksten over Aruba.',
    },
    {
      id: 'dictee_oefening',
      label: 'Dictee',
      prompt:
        'Focus UITSLUITEND op dictee-oefening. Gebruik [SPREEK]woord[/SPREEK] tags voor elk woord dat het kind moet opschrijven. Begin met eenvoudige woorden passend bij het niveau van het kind.',
    },
  ],
  rekenen: [
    {
      id: 'optellen_aftrekken',
      label: 'Optellen & aftrekken',
      prompt:
        'Focus UITSLUITEND op optellen en aftrekken. Stel ALLEEN sommen hierover. Gebruik Arubaanse context: Florin-bedragen, aantallen vissen, pastechi\'s, etc. Pas het niveau aan: klas 1-2 tot 20, klas 3-4 tot 1000, klas 5-6 met kommagetallen.',
    },
    {
      id: 'tafels_van_vermenigvuldiging',
      label: 'Tafels',
      prompt:
        'Focus UITSLUITEND op de tafels van vermenigvuldiging. Oefen ALLEEN tafels 1 t/m 10. Gebruik gevarieerde vraagstelling: "Hoeveel is 7×8?", "Als je 9 groepen van 6 hebt, hoeveel is dat?". Geef ook woordproblemen met Arubaanse context.',
    },
    {
      id: 'breuken_basis',
      label: 'Breuken',
      prompt:
        'Focus UITSLUITEND op breuken (teller, noemer, vergelijken, eenvoudig optellen van gelijknamige breuken). Stel ALLEEN vragen over breuken. Gebruik Arubaanse context: verdeel een pastechi in stukken, deel een strand-perceel op.',
    },
    {
      id: 'deelsommen',
      label: 'Deling',
      prompt:
        'Focus UITSLUITEND op deelsommen (delen met en zonder rest). Stel ALLEEN deelsom-vragen. Gebruik Arubaanse context: verdeel florin-munten eerlijk, verdeel vissen over bakken.',
    },
    {
      id: 'kommagetallen',
      label: 'Kommagetallen',
      prompt:
        'Focus UITSLUITEND op kommagetallen (decimalen). Oefen ALLEEN het lezen, schrijven, optellen en aftrekken van getallen met komma. Gebruik prijzen in Florin als context.',
    },
    {
      id: 'meten_en_gewichten',
      label: 'Meten & gewichten',
      prompt:
        'Focus UITSLUITEND op meten (cm, m, km) en gewichten (g, kg). Stel ALLEEN vragen hierover. Gebruik Arubaanse context: afstand naar Eagle Beach, gewicht van vissen, lengte van de Hooiberg.',
    },
    {
      id: 'woordsommen',
      label: 'Woordsommen',
      prompt:
        'Focus UITSLUITEND op woordsommen (tekstopgaven). Geef korte woordproblemen met Arubaanse context en begeleid het kind stap voor stap om de bewerking te kiezen en uit te voeren.',
    },
    {
      id: 'klokkijken',
      label: 'Klokkijken',
      prompt:
        'Focus UITSLUITEND op klokkijken (analoge en digitale tijd). Stel ALLEEN tijdsvragen: "Hoe laat is het?", "Hoeveel minuten tot...?". Gebruik dagelijkse situaties op Aruba als context.',
    },
  ],
  begrijpend_lezen: [
    {
      id: 'hoofdgedachte_bepalen',
      label: 'Hoofdgedachte',
      prompt:
        'Focus UITSLUITEND op het bepalen van de hoofdgedachte van een tekst. Geef een korte tekst (5-8 zinnen) over Aruba en vraag: "Waar gaat deze tekst principalmente over?". Leid het kind stap voor stap naar het antwoord.',
    },
    {
      id: 'samenvatten',
      label: 'Samenvatten',
      prompt:
        'Focus UITSLUITEND op het samenvatten van een tekst. Geef een korte tekst over Aruba en begeleid het kind om de belangrijkste informatie in eigen woorden te beschrijven.',
    },
    {
      id: 'vragen_beantwoorden',
      label: 'Vragen beantwoorden',
      prompt:
        'Focus UITSLUITEND op het beantwoorden van vragen bij een tekst. Geef een korte tekst over Aruba, stel gerichte vragen (wie, wat, waar, wanneer, waarom) en leid het kind naar de antwoorden in de tekst.',
    },
    {
      id: 'moeilijke_woorden',
      label: 'Moeilijke woorden',
      prompt:
        'Focus UITSLUITEND op het begrijpen van moeilijke woorden in context. Presenteer een zin of alinea met een onbekend woord en help het kind de betekenis te raden vanuit de context.',
    },
    {
      id: 'feiten_en_mening',
      label: 'Feit & mening',
      prompt:
        'Focus UITSLUITEND op het onderscheid tussen feiten en meningen in een tekst. Geef zinnen of een korte tekst en vraag het kind te bepalen of iets een feit of een mening is.',
    },
    {
      id: 'tekststructuur',
      label: 'Tekststructuur',
      prompt:
        'Focus UITSLUITEND op tekststructuur: inleiding, kern, slot herkennen. Geef een tekst en begeleid het kind om de opbouw te analyseren.',
    },
  ],
  geschiedenis: [
    {
      id: 'chronologie_tijdlijn',
      label: 'Tijdlijn & volgorde',
      prompt:
        'Focus UITSLUITEND op chronologie en tijdlijnen. Oefen het plaatsen van historische gebeurtenissen in de juiste volgorde. Gebruik gebeurtenissen uit de Arubaanse en mondiale geschiedenis.',
    },
    {
      id: 'oorzaak_gevolg',
      label: 'Oorzaak & gevolg',
      prompt:
        'Focus UITSLUITEND op oorzaak-gevolgrelaties in de geschiedenis. Geef historische situaties en vraag het kind: "Waarom gebeurde dit?" en "Wat was het gevolg?". Gebruik Arubaanse en mondiale voorbeelden.',
    },
    {
      id: 'caquetio_aruba',
      label: 'Caquetio & vroege Aruba',
      prompt:
        'Focus UITSLUITEND op de vroege geschiedenis van Aruba: de Caquetio-indianen, hun leven, cultuur en de komst van de Spanjaarden. Stel vragen over dit onderwerp.',
    },
    {
      id: 'koloniale_periode',
      label: 'Koloniale periode',
      prompt:
        'Focus UITSLUITEND op de koloniale periode van Aruba: Nederlandse en Spaanse invloed, slavernij, plantages. Stel vragen over dit onderwerp op een leeftijdsgeschikt niveau.',
    },
    {
      id: 'aruba_1986_status_aparte',
      label: 'Status Aparte 1986',
      prompt:
        'Focus UITSLUITEND op Aruba\'s Status Aparte in 1986: wat het betekent, waarom het gebeurde, Gilberto "Betico" Croes. Stel vragen over dit onderwerp.',
    },
    {
      id: 'nederland_wereldgeschiedenis',
      label: 'Wereld- & NL-geschiedenis',
      prompt:
        'Focus UITSLUITEND op belangrijke momenten uit de Nederlandse en mondiale geschiedenis (VOC, WOII, etc.) op het niveau van het kind. Leg verbanden met Aruba waar mogelijk.',
    },
  ],
  aardrijkskunde: [
    {
      id: 'kaart_lezen',
      label: 'Kaarten lezen',
      prompt:
        'Focus UITSLUITEND op het lezen en begrijpen van kaarten: legenda, schaal, symbolen. Gebruik de kaart van Aruba of de Caribische regio als voorbeeld.',
    },
    {
      id: 'kompasrichtingen',
      label: 'Kompasrichtingen',
      prompt:
        'Focus UITSLUITEND op kompasrichtingen (N, Z, O, W) en tussenrichtingen. Gebruik de ligging van plaatsen op Aruba als oefenmateriaal.',
    },
    {
      id: 'aruba_geografie',
      label: 'Aruba-geografie',
      prompt:
        'Focus UITSLUITEND op de geografie van Aruba: steden (Oranjestad, San Nicolas), dorpen (Noord, Santa Cruz), natuur (Hooiberg, Arikok, stranden). Stel vragen over de ligging en kenmerken.',
    },
    {
      id: 'klimaat_weeraruba',
      label: 'Klimaat & weer',
      prompt:
        'Focus UITSLUITEND op klimaat en weer op Aruba: droog klimaat, passaatwinden, weinig regen, Curaçaose golf. Stel vragen en vergelijk met andere klimaattypen.',
    },
    {
      id: 'abc_eilanden',
      label: 'ABC-eilanden',
      prompt:
        'Focus UITSLUITEND op de ABC-eilanden (Aruba, Bonaire, Curaçao): ligging, overeenkomsten en verschillen. Stel vragen op het niveau van het kind.',
    },
    {
      id: 'werelddelen',
      label: 'Werelddelen',
      prompt:
        'Focus UITSLUITEND op de werelddelen (continenten) en hun kenmerken. Stel vragen over ligging, bewoners, klimaat. Leg verbanden met Aruba\'s positie in de wereld.',
    },
  ],
  kennis_der_natuur: [
    {
      id: 'planten_dieren_aruba',
      label: 'Planten & dieren Aruba',
      prompt:
        'Focus UITSLUITEND op planten en dieren van Aruba: divi-divi boom, cactus, Shoco (uil), leguaan, schildpad, tropische vissen. Stel vragen over kenmerken, leefgebied en aanpassing.',
    },
    {
      id: 'voedselketen',
      label: 'Voedselketen',
      prompt:
        'Focus UITSLUITEND op de voedselketen: producenten, consumenten, afbrekers. Gebruik Arubaanse dieren en planten als voorbeeld in de voedselketen.',
    },
    {
      id: 'mensenlichaam',
      label: 'Het menselijk lichaam',
      prompt:
        'Focus UITSLUITEND op het menselijk lichaam: organen, lichaamsdelen, zintuigen, gezonde leefstijl. Stel vragen op het niveau van het kind.',
    },
    {
      id: 'ecosystemen',
      label: 'Ecosystemen',
      prompt:
        'Focus UITSLUITEND op ecosystemen: koraalrif, droog bos, strand. Gebruik Arubaanse ecosystemen als voorbeeld. Stel vragen over soorten, relaties en bedreigingen.',
    },
    {
      id: 'water_en_lucht',
      label: 'Water & lucht',
      prompt:
        'Focus UITSLUITEND op water en lucht: waterkringloop, weer, luchtverontreiniging. Gebruik Arubaanse context: het zoetwaterproblem, passaatwinden.',
    },
    {
      id: 'milieu_bescherming',
      label: 'Milieu & bescherming',
      prompt:
        'Focus UITSLUITEND op milieu en milieubescherming: afval, recycleren, klimaatverandering, koraalrif-bescherming op Aruba. Stel vragen op het niveau van het kind.',
    },
  ],
};
