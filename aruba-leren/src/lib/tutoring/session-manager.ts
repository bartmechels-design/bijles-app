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
 * Create a new tutoring session for a child+subject
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

  // Create new session with default metadata
  const { data, error } = await supabase
    .from('tutoring_sessions')
    .insert({
      child_id: childId,
      subject,
      difficulty_level: 1,
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
 * Get the most recent active session for a child+subject
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
