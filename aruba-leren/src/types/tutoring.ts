// Subject enum — the 6 vakken (3 kern + 3 zaak)
export type Subject = 'taal' | 'rekenen' | 'begrijpend_lezen' | 'geschiedenis' | 'aardrijkskunde' | 'kennis_der_natuur';

// Subject metadata for UI display
export interface SubjectInfo {
  id: Subject;
  labelNl: string;    // "Nederlandse Taal"
  labelPap: string;   // "Idioma Hulandes"
  labelEs: string;    // "Idioma Neerlandés"
  labelEn: string;    // "Dutch Language"
  icon: string;       // emoji or icon name for UI
  category: 'kern' | 'zaak';
}

export const SUBJECTS: SubjectInfo[] = [
  { id: 'taal', labelNl: 'Nederlandse Taal', labelPap: 'Idioma Hulandes', labelEs: 'Idioma Neerlandés', labelEn: 'Dutch Language', icon: '📖', category: 'kern' },
  { id: 'rekenen', labelNl: 'Rekenen', labelPap: 'Matematica', labelEs: 'Matemáticas', labelEn: 'Mathematics', icon: '🔢', category: 'kern' },
  { id: 'begrijpend_lezen', labelNl: 'Begrijpend Lezen', labelPap: 'Comprension di Lectura', labelEs: 'Comprensión Lectora', labelEn: 'Reading Comprehension', icon: '📚', category: 'kern' },
  { id: 'geschiedenis', labelNl: 'Geschiedenis', labelPap: 'Historia', labelEs: 'Historia', labelEn: 'History', icon: '🏛️', category: 'zaak' },
  { id: 'aardrijkskunde', labelNl: 'Aardrijkskunde', labelPap: 'Geografia', labelEs: 'Geografía', labelEn: 'Geography', icon: '🌍', category: 'zaak' },
  { id: 'kennis_der_natuur', labelNl: 'Kennis der Natuur', labelPap: 'Conocemento di Naturalesa', labelEs: 'Ciencias Naturales', labelEn: 'Natural Sciences', icon: '🌱', category: 'zaak' },
];

// Tutoring session (maps to Supabase tutoring_sessions table)
export interface TutoringSession {
  id: string;
  child_id: string;
  subject: Subject;
  difficulty_level: number;  // 1-5
  session_type?: 'assessment' | 'tutoring';  // Added in migration 007
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
  assessment_questions_asked?: number;  // Added for assessment sessions (migration 007)
  huiswerkMode?: boolean;               // Added for huiswerk hulp sessions (plan 06-04)
  last_locale?: string;                 // Last language used — skip DB context when locale changes
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
export type TutoringLanguage = 'nl' | 'pap' | 'es' | 'en';

// Rate limiting
export interface TokenBudget {
  allowed: boolean;
  remaining: number;
  dailyLimit: number;
  used: number;
}

// Session duration limits by age (minutes) — suggestion only, user can extend
export const SESSION_DURATION_BY_AGE: Record<number, number> = {
  6: 60,
  7: 60,
  8: 60,
  9: 60,
  10: 60,
  11: 60,
  12: 60,
};
