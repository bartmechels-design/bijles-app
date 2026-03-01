/*
 * Tutoring Session Manager
 *
 * Manages tutoring sessions and message persistence in Supabase.
 * All functions use the server Supabase client.
 *
 * IMPORTANT: Run the following SQL in Supabase Dashboard > SQL Editor before using this module:
 *
 * -- Run this in Supabase SQL Editor
 * CREATE TABLE IF NOT EXISTS tutoring_sessions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
 *   subject TEXT NOT NULL CHECK (subject IN ('taal', 'rekenen', 'begrijpend_lezen', 'geschiedenis', 'aardrijkskunde', 'kennis_der_natuur')),
 *   difficulty_level INT NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
 *   started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   ended_at TIMESTAMPTZ,
 *   metadata JSONB NOT NULL DEFAULT '{"consecutive_correct": 0, "consecutive_incorrect": 0, "total_hints_given": 0, "total_messages": 0, "tokens_used": 0, "igdi_phase": "instructie"}'::jsonb,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * CREATE TABLE IF NOT EXISTS tutoring_messages (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   session_id UUID NOT NULL REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
 *   role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
 *   content TEXT NOT NULL,
 *   metadata JSONB,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * -- Indexes for performance
 * CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_child_id ON tutoring_sessions(child_id);
 * CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_child_subject ON tutoring_sessions(child_id, subject);
 * CREATE INDEX IF NOT EXISTS idx_tutoring_messages_session_id ON tutoring_messages(session_id);
 * CREATE INDEX IF NOT EXISTS idx_tutoring_messages_session_created ON tutoring_messages(session_id, created_at);
 *
 * -- RLS policies
 * ALTER TABLE tutoring_sessions ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE tutoring_messages ENABLE ROW LEVEL SECURITY;
 *
 * -- Parents can view/create sessions for their own children
 * CREATE POLICY "Parents can manage their children's sessions"
 *   ON tutoring_sessions
 *   FOR ALL
 *   USING (
 *     child_id IN (
 *       SELECT c.id FROM children c
 *       JOIN profiles p ON c.parent_id = p.id
 *       WHERE p.user_id = auth.uid()
 *     )
 *   );
 *
 * -- Parents can view/create messages for their children's sessions
 * CREATE POLICY "Parents can manage their children's messages"
 *   ON tutoring_messages
 *   FOR ALL
 *   USING (
 *     session_id IN (
 *       SELECT ts.id FROM tutoring_sessions ts
 *       JOIN children c ON ts.child_id = c.id
 *       JOIN profiles p ON c.parent_id = p.id
 *       WHERE p.user_id = auth.uid()
 *     )
 *   );
 */

import { createClient } from '@/lib/supabase/server';
import type {
  TutoringSession,
  TutoringMessage,
  Subject,
  SessionMetadata,
  MessageMetadata
} from '@/types/tutoring';

/**
 * Get the last difficulty level reached by a child for a specific subject.
 * Used to carry forward progress between sessions.
 */
export async function getLastDifficultyLevel(
  childId: string,
  subject: Subject
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tutoring_sessions')
    .select('difficulty_level')
    .eq('child_id', childId)
    .eq('subject', subject)
    .order('last_activity_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return 1; // Default to level 1 for first-time users
  }

  return data.difficulty_level;
}

/**
 * Get a summary of the most recent session for a child+subject.
 * Used to give Koko context about what was covered before.
 *
 * @param excludeSessionId - Current session ID to exclude, so we get the PREVIOUS session's context
 */
export async function getSessionHistory(
  childId: string,
  subject: Subject,
  excludeSessionId?: string
): Promise<{ lastLevel: number; lastMessages: string[]; totalSessions: number } | null> {
  const supabase = await createClient();

  // Get most recent session (regardless of ended_at — sessions may never be explicitly ended)
  // Exclude current session so we get PREVIOUS session context for continuity
  const baseQuery = supabase
    .from('tutoring_sessions')
    .select('id, difficulty_level, metadata')
    .eq('child_id', childId)
    .eq('subject', subject);
  const filteredQuery = excludeSessionId ? baseQuery.neq('id', excludeSessionId) : baseQuery;
  const { data: lastSession, error: sessionError } = await filteredQuery
    .order('last_activity_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError || !lastSession) {
    return null; // No previous sessions
  }

  // Count total sessions for this child+subject
  const { count } = await supabase
    .from('tutoring_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('subject', subject);

  // Get last 6 messages from the previous session (for context)
  const { data: messages } = await supabase
    .from('tutoring_messages')
    .select('role, content')
    .eq('session_id', lastSession.id)
    .order('created_at', { ascending: false })
    .limit(6);

  const lastMessages = (messages || [])
    .reverse()
    .map(m => `${m.role === 'assistant' ? 'Koko' : 'Kind'}: ${m.content.slice(0, 150)}`);

  return {
    lastLevel: lastSession.difficulty_level,
    lastMessages,
    totalSessions: count || 0,
  };
}

/**
 * Create a new tutoring session for a child+subject.
 * Carries forward the difficulty level from the last session.
 */
export async function createSession(
  childId: string,
  subject: Subject
): Promise<TutoringSession | null> {
  const supabase = await createClient();

  // Verify child exists before creating session
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .single();

  if (childError || !child) {
    console.error('Child not found:', childError);
    return null;
  }

  // Carry forward difficulty from last session
  const lastLevel = await getLastDifficultyLevel(childId, subject);

  // Create new session with carried-forward difficulty
  const { data, error } = await supabase
    .from('tutoring_sessions')
    .insert({
      child_id: childId,
      subject,
      session_type: 'tutoring',  // Explicit — prevents accidental assessment session creation
      difficulty_level: lastLevel,
      metadata: {
        consecutive_correct: 0,
        consecutive_incorrect: 0,
        total_hints_given: 0,
        total_messages: 0,
        tokens_used: 0,
        igdi_phase: 'instructie'
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }

  return data as TutoringSession;
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<TutoringSession | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tutoring_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }

  return data as TutoringSession;
}

/**
 * Get the most recent active TUTORING session for a child+subject.
 * Filters by session_type = 'tutoring' to prevent assessment sessions from
 * being resumed as tutoring sessions (they use a different system prompt).
 * Returns null if no active session found (ended_at IS NULL AND last_activity_at within 30 minutes)
 */
export async function getActiveSession(
  childId: string,
  subject: Subject
): Promise<TutoringSession | null> {
  const supabase = await createClient();

  // Calculate 30 minutes ago
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('tutoring_sessions')
    .select('*')
    .eq('child_id', childId)
    .eq('subject', subject)
    .eq('session_type', 'tutoring')
    .is('ended_at', null)
    .gt('last_activity_at', thirtyMinutesAgo)
    .order('last_activity_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active session:', error);
    return null;
  }

  return data as TutoringSession | null;
}

/**
 * Get the most recent active ASSESSMENT session for a child+subject.
 * Mirrors getActiveSession but filters for session_type = 'assessment'.
 * Used by the assessment entry page to resume an in-progress assessment.
 * Returns null if no active assessment session found within 30 minutes.
 */
export async function getActiveAssessmentSession(
  childId: string,
  subject: Subject
): Promise<TutoringSession | null> {
  const supabase = await createClient();

  // Calculate 30 minutes ago
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('tutoring_sessions')
    .select('*')
    .eq('child_id', childId)
    .eq('subject', subject)
    .eq('session_type', 'assessment')
    .is('ended_at', null)
    .gt('last_activity_at', thirtyMinutesAgo)
    .order('last_activity_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active assessment session:', error);
    return null;
  }

  return data as TutoringSession | null;
}

/**
 * Save a message to a session and update session metadata
 */
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: MessageMetadata
): Promise<void> {
  const supabase = await createClient();

  // Insert message
  const { error: messageError } = await supabase
    .from('tutoring_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      metadata: metadata || null
    });

  if (messageError) {
    console.error('Error saving message:', messageError);
    throw new Error('Failed to save message');
  }

  // Update session last_activity_at and increment message count
  const { error: sessionError } = await supabase
    .from('tutoring_sessions')
    .update({
      last_activity_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (sessionError) {
    console.error('Error updating session activity:', sessionError);
  }
}

/**
 * Get recent messages for a session (for building AI context)
 * Returns last N messages ordered by created_at ascending
 */
export async function getRecentMessages(
  sessionId: string,
  limit: number = 15
): Promise<TutoringMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tutoring_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  // Reverse to get chronological order (oldest to newest)
  return (data as TutoringMessage[]).reverse();
}

/**
 * Update session metadata (difficulty, IGDI phase, performance counters)
 */
export async function updateSessionMetadata(
  sessionId: string,
  metadata: Partial<SessionMetadata>
): Promise<void> {
  const supabase = await createClient();

  // Fetch current session to merge metadata
  const { data: session, error: fetchError } = await supabase
    .from('tutoring_sessions')
    .select('metadata')
    .eq('id', sessionId)
    .single();

  if (fetchError || !session) {
    console.error('Error fetching session for metadata update:', fetchError);
    throw new Error('Session not found');
  }

  // Merge new metadata with existing
  const updatedMetadata = {
    ...session.metadata,
    ...metadata
  };

  const { error } = await supabase
    .from('tutoring_sessions')
    .update({ metadata: updatedMetadata })
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating session metadata:', error);
    throw new Error('Failed to update session metadata');
  }
}

/**
 * End a session (set ended_at to now)
 */
export async function endSession(sessionId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tutoring_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    console.error('Error ending session:', error);
    throw new Error('Failed to end session');
  }
}
