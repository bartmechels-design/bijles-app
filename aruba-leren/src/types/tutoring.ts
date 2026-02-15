// Subject enum — the 6 vakken (3 kern + 3 zaak)
export type Subject = 'taal' | 'rekenen' | 'begrijpend_lezen' | 'geschiedenis' | 'aardrijkskunde' | 'kennis_der_natuur';

// Subject metadata for UI display
export interface SubjectInfo {
  id: Subject;
  labelNl: string;    // "Nederlandse Taal"
  labelPap: string;   // "Idioma Hulandes"
  labelEs: string;    // "Idioma Neerlandés"
  icon: string;       // emoji or icon name for UI
  category: 'kern' | 'zaak';
}

export const SUBJECTS: SubjectInfo[] = [
  { id: 'taal', labelNl: 'Nederlandse Taal', labelPap: 'Idioma Hulandes', labelEs: 'Idioma Neerlandés', icon: '📖', category: 'kern' },
  { id: 'rekenen', labelNl: 'Rekenen', labelPap: 'Matematica', labelEs: 'Matemáticas', icon: '🔢', category: 'kern' },
  { id: 'begrijpend_lezen', labelNl: 'Begrijpend Lezen', labelPap: 'Comprension di Lectura', labelEs: 'Comprensión Lectora', icon: '📚', category: 'kern' },
  { id: 'geschiedenis', labelNl: 'Geschiedenis', labelPap: 'Historia', labelEs: 'Historia', icon: '🏛️', category: 'zaak' },
  { id: 'aardrijkskunde', labelNl: 'Aardrijkskunde', labelPap: 'Geografia', labelEs: 'Geografía', icon: '🌍', category: 'zaak' },
  { id: 'kennis_der_natuur', labelNl: 'Kennis der Natuur', labelPap: 'Conocemento di Naturalesa', labelEs: 'Ciencias Naturales', icon: '🌱', category: 'zaak' },
];

// Tutoring session (maps to Supabase tutoring_sessions table)
export interface TutoringSession {
  id: string;
  child_id: string;
  subject: Subject;
  difficulty_level: number;  // 1-5
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  consecutive_correct: number;
  consecutive_incorrect: number;
  total_hints_given: number;
  total_messages: number;
  tokens_used: number;
  igdi_phase: IGDIPhase;
}

// IGDI model phases mapped to conversation flow
export type IGDIPhase = 'instructie' | 'geleide_inoefening' | 'diagnostische_toets' | 'individuele_verwerking';

// Tutoring message (maps to Supabase tutoring_messages table)
export interface TutoringMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: MessageMetadata | null;
  created_at: string;
}

export interface MessageMetadata {
  tokens_used?: number;
  cached_tokens?: number;
  was_correct?: boolean;
  hints_given?: number;
  difficulty_at_time?: number;
}

// Difficulty adjustment
export interface DifficultyAdjustment {
  newDifficulty: number;
  instruction: string;  // Instruction to include in next prompt
  reason: 'consecutive_correct' | 'needs_easier' | 'no_change';
}

// Language preference (matches i18n locales)
export type TutoringLanguage = 'nl' | 'pap' | 'es';

// Rate limiting
export interface TokenBudget {
  allowed: boolean;
  remaining: number;
  dailyLimit: number;
  used: number;
}

// Session duration limits by age (minutes)
export const SESSION_DURATION_BY_AGE: Record<number, number> = {
  6: 8,   // Very short attention span
  7: 10,
  8: 12,
  9: 15,
  10: 18,
  11: 20,
  12: 25,
};
