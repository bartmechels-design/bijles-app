/**
 * Response Analyzer
 *
 * Heuristic analysis of Koko's response text to determine whether the child
 * answered correctly, incorrectly, or received a hint.
 *
 * Used by the chat route's onFinish callback to feed the adaptive difficulty
 * system (difficulty-adjuster.ts) with real performance signals.
 *
 * All functions are pure — no side effects, no DB calls.
 */

export interface ResponseAnalysis {
  wasCorrect: boolean | null;  // null = indeterminate (new question, greeting, explanation)
  wasHint: boolean;
}

/**
 * Regex for praise patterns (correct answer signals)
 * Covers Dutch, Papiamento, and Spanish praise phrases used by Koko.
 */
const CORRECT_PATTERN = /goed\s+zo|precies!?|heel\s+goed|klopt!?|super!?|uitstekend|correct!?|dat\s+klopt|helemaal\s+goed|fantastisch|prima!?|knap!?|je\s+hebt\s+gelijk|bon\s+hasi!?|mashá\s+bon!?|ekselente!?|korecto!?|muy\s+bien!?|excelente!?|correcto!?|perfecto!?/i;

/**
 * Regex for correction patterns (incorrect answer signals)
 * Covers Dutch, Papiamento, and Spanish correction phrases used by Koko.
 */
const INCORRECT_PATTERN = /niet\s+helemaal|bijna!?|probeer\s+het\s+nog|dat\s+is\s+niet|helaas|nog\s+niet\s+goed|kijk\s+nog\s+eens|dat\s+klopt\s+niet|awor\s+purba|no\s+ta\s+korecto|no\s+es\s+correcto|intenta\s+de\s+nuevo/i;

/**
 * Regex for hint/tip patterns
 * Covers Socratic redirects, direct hints, and tip phrases used by Koko.
 */
const HINT_PATTERN = /hint:|een\s+hint|ik\s+geef\s+je\s+een\s+tip|laten\s+we\s+het\s+anders|denk\s+eens\s+aan|wat\s+als\s+je|probeer\s+eens|een\s+aanwijzing|tip:|stel\s+je\s+voor|wat\s+denk\s+jij\??|hoe\s+zou\s+je|kun\s+je\s+uitleggen|wat\s+als\b/i;

/**
 * Analyze Koko's response text for correctness and hint signals.
 *
 * Returns:
 *   wasCorrect: true  — Koko praised a correct answer
 *   wasCorrect: false — Koko corrected a wrong answer
 *   wasCorrect: null  — Indeterminate (question, greeting, explanation, etc.)
 *   wasHint: true     — Koko provided a hint or tip
 */
export function analyzeKokoResponse(text: string): ResponseAnalysis {
  const isCorrect = CORRECT_PATTERN.test(text);
  const isIncorrect = INCORRECT_PATTERN.test(text);
  const isHint = HINT_PATTERN.test(text);

  // Both correct and incorrect patterns matched — ambiguous, treat as indeterminate
  if (isCorrect && isIncorrect) {
    return { wasCorrect: null, wasHint: isHint };
  }

  if (isCorrect) {
    return { wasCorrect: true, wasHint: isHint };
  }

  if (isIncorrect) {
    return { wasCorrect: false, wasHint: isHint };
  }

  // Neither matched — Koko is asking a question, greeting, or explaining
  return { wasCorrect: null, wasHint: isHint };
}
