/**
 * Token Budget Enforcement
 *
 * Enforces daily token limits per child to control costs.
 * Queries Supabase for token usage in last 24 hours and compares against daily limit.
 */

import { createClient } from '@/lib/supabase/server';
import { DAILY_TOKEN_LIMIT } from '@/lib/ai/providers/anthropic';
import type { TokenBudget } from '@/types/tutoring';

/**
 * Check if a child has remaining token budget for today
 * Returns budget status with remaining tokens
 */
export async function checkTokenBudget(childId: string): Promise<TokenBudget> {
  const supabase = await createClient();

  // Calculate 24 hours ago
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Query all sessions for this child in last 24 hours
  const { data: sessions, error } = await supabase
    .from('tutoring_sessions')
    .select('metadata')
    .eq('child_id', childId)
    .gte('created_at', twentyFourHoursAgo);

  if (error) {
    console.error('Error checking token budget:', error);
    // On error, allow request but log warning
    return {
      allowed: true,
      remaining: DAILY_TOKEN_LIMIT,
      dailyLimit: DAILY_TOKEN_LIMIT,
      used: 0
    };
  }

  // Sum tokens_used from all sessions
  const totalTokensUsed = sessions.reduce((sum, session) => {
    return sum + (session.metadata?.tokens_used || 0);
  }, 0);

  const remaining = Math.max(0, DAILY_TOKEN_LIMIT - totalTokensUsed);
  const allowed = remaining > 0;

  return {
    allowed,
    remaining,
    dailyLimit: DAILY_TOKEN_LIMIT,
    used: totalTokensUsed
  };
}

/**
 * Record token usage for a session
 * Updates session metadata and latest assistant message metadata
 */
export async function recordTokenUsage(
  sessionId: string,
  tokensUsed: number
): Promise<void> {
  const supabase = await createClient();

  // Fetch current session to get existing token count
  const { data: session, error: sessionError } = await supabase
    .from('tutoring_sessions')
    .select('metadata')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    console.error('Error fetching session for token update:', sessionError);
    return;
  }

  // Update session metadata with new token count
  const updatedTokens = (session.metadata?.tokens_used || 0) + tokensUsed;
  const updatedMetadata = {
    ...session.metadata,
    tokens_used: updatedTokens
  };

  const { error: updateError } = await supabase
    .from('tutoring_sessions')
    .update({ metadata: updatedMetadata })
    .eq('id', sessionId);

  if (updateError) {
    console.error('Error recording token usage:', updateError);
  }
}
