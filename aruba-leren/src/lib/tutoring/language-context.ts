import type { TutoringLanguage } from '@/types/tutoring';

/**
 * Builds language and age-appropriate context for the AI tutor
 * Returns instructions about language preference, vocabulary level, and sentence structure
 */
export function buildLanguageContext(
  preferredLanguage: TutoringLanguage,
  childAge: number
): string {
  // Determine vocabulary complexity based on age
  const vocabularyLevel = childAge <= 7 ? 'heel eenvoudige woorden' :
                         childAge <= 9 ? 'eenvoudige woorden' :
                         'woorden passend bij groep 5-6';

  // Determine sentence length guideline
  const maxWords = childAge <= 7 ? 10 :
                   childAge <= 9 ? 12 :
                   15;

  // Base instruction for language
  let languageInstruction = '';

  switch (preferredLanguage) {
    case 'nl':
      languageInstruction = `
# Taalinstructies

**Primaire taal**: Nederlands
**Vocabulaire niveau**: Gebruik ${vocabularyLevel} die een ${childAge}-jarige kan begrijpen
**Zinlengte**: Maximaal ${maxWords} woorden per zin. Korte zinnen zijn duidelijker.
**Taalwisseling**: Als het kind midden in het gesprek overschakelt naar Papiamento of Spaans, schakel dan ook over naar die taal.

Voorbeeld van goede zinnen voor deze leeftijd:
- "Wat zie je op het plaatje?"
- "Kun je het antwoord tekenen?"
- "Hoeveel zijn er in totaal?"
`;
      break;

    case 'pap':
      languageInstruction = `
# Language Instructions

**Primary language**: Papiamento
**Vocabulary level**: Use ${vocabularyLevel} (eenvoudige woorden) die een ${childAge}-jarige kan begrijpen
**Sentence length**: Maximaal ${maxWords} woorden per zin
**Local expressions**: Gebruik lokale uitdrukkingen en woorden waar passend (dushi, ban, ta, etc.)
**Language switching**: Als het kind overschakelt naar Nederlands of Spaans, schakel dan mee.

Voorbeeld van goede zinnen:
- "Kiko bo ta mira riba e portret?"
- "Bo por dibou e respuesta?"
- "Cuanto nan ta den total?"

**Important**: Papiamento has spelling variations. Accept both "ta" and "ta" forms, "k" and "c" variants (kos/cos), etc.
`;
      break;

    case 'es':
      languageInstruction = `
# Instrucciones de Idioma

**Idioma primario**: Español (variante latinoamericana, NO castellano)
**Nivel de vocabulario**: Usa ${vocabularyLevel} que un niño de ${childAge} años pueda entender
**Longitud de oraciones**: Máximo ${maxWords} palabras por oración. Oraciones cortas son más claras.
**Cambio de idioma**: Si el niño cambia a Holandés o Papiamento durante la conversación, cambia también.

Ejemplos de buenas oraciones para esta edad:
- "¿Qué ves en la imagen?"
- "¿Puedes dibujar la respuesta?"
- "¿Cuántos hay en total?"

**Important**: Usa "tú" (informal), no "usted". Los niños responden mejor a un tono amigable e informal.
`;
      break;
  }

  // Add age-specific instructions
  const ageGuidance = childAge <= 7
    ? `
**Leeftijd ${childAge}**: Dit kind is nog heel jong. Gebruik HEEL korte zinnen, veel enthousiasme, en visuele hints ("Kijk naar...", "Tel met je vingers..."). Geef veel aanmoediging en positieve feedback. Aandachtsspanne is kort (maximaal 8-10 minuten).`
    : childAge <= 9
    ? `
**Leeftijd ${childAge}**: Gebruik heldere, eenvoudige taal. Het kind kan al beter concentreren, maar heeft nog veel aanmoediging nodig. Gebruik concrete voorbeelden uit hun dagelijks leven. Sessies mogen iets langer (10-15 minuten).`
    : `
**Leeftijd ${childAge}**: Het kind kan al wat meer abstracte concepten begrijpen, maar houd het nog steeds praktisch en concreet. Gebruik relevante voorbeelden. Sessies kunnen 15-20 minuten duren.`;

  return languageInstruction + '\n' + ageGuidance;
}
