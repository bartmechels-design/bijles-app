/**
 * Streaming Chat API Route
 *
 * POST /[locale]/api/tutor/chat
 *
 * Main streaming endpoint for Koko AI tutor conversations.
 * Handles authentication, rate limiting, session management, and message persistence.
 *
 * Request body:
 * {
 *   messages: Array<{role: 'user' | 'assistant', content: string}>,
 *   sessionId?: string,     // Optional: resume existing session
 *   subject: Subject,       // Required: which vakken
 *   childId: string         // Required: which child
 * }
 *
 * Returns: Streaming AI response (Vercel AI SDK format)
 */

import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  TUTOR_MODEL,
  MAX_TOKENS_PER_RESPONSE,
  TEMPERATURE,
  MAX_CONTEXT_MESSAGES,
} from '@/lib/ai/providers/anthropic';
import {
  createSession,
  getSession,
  getActiveSession,
  getSessionHistory,
  saveMessage,
  getRecentMessages,
  updateSessionMetadata,
} from '@/lib/tutoring/session-manager';
import { adjustDifficulty, recordAnswer } from '@/lib/tutoring/difficulty-adjuster';
import { analyzeKokoResponse } from '@/lib/tutoring/response-analyzer';
import { checkTokenBudget, recordTokenUsage } from '@/lib/ai/rate-limiter';
import { buildSystemPrompt, buildAssessmentPrompt } from '@/lib/ai/prompts/system-prompts';
import { finishAssessment } from '@/lib/tutoring/assessment-manager';
import { updateStuckFlag, recordProgressEvent } from '@/lib/tutoring/progress-tracker';
import type { Subject, TutoringLanguage, SessionMetadata } from '@/types/tutoring';

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string; imageUrl?: string }>;
  sessionId?: string;
  subject: Subject;
  childId: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> }
) {
  try {
    // Parse request body
    const body: ChatRequestBody = await request.json();
    const { messages, sessionId, subject, childId } = body;

    // Basic validation
    if (!messages || messages.length === 0) {
      return Response.json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (!subject || !childId) {
      return Response.json({ error: 'Subject and childId are required' }, { status: 400 });
    }

    // Extract locale from URL params
    const { locale } = await context.params;
    const tutorLanguage = (locale || 'nl') as TutoringLanguage;

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get parent profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return Response.json({ error: 'Profile not found' }, { status: 401 });
    }

    // Verify child ownership
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, parent_id, first_name, age, grade')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return Response.json({ error: 'Child not found' }, { status: 404 });
    }

    if (child.parent_id !== profile.id) {
      return Response.json({ error: 'Access denied: child does not belong to this parent' }, { status: 403 });
    }

    // Rate limit check
    const tokenBudget = await checkTokenBudget(childId);
    if (!tokenBudget.allowed) {
      return Response.json(
        {
          error: 'Dagelijks limiet bereikt',
          remaining: 0,
          dailyLimit: tokenBudget.dailyLimit,
        },
        { status: 429 }
      );
    }

    // Get or create session
    let currentSession;
    if (sessionId) {
      // Try to resume existing session
      currentSession = await getSession(sessionId);
      if (!currentSession || currentSession.child_id !== childId) {
        return Response.json({ error: 'Invalid session' }, { status: 400 });
      }
    } else {
      // Try to find active session for this child+subject
      currentSession = await getActiveSession(childId, subject);
      if (!currentSession) {
        // Create new session
        currentSession = await createSession(childId, subject);
        if (!currentSession) {
          return Response.json({ error: 'Failed to create session' }, { status: 500 });
        }
      }
    }

    // Load conversation context (last 15 messages)
    const contextMessages = await getRecentMessages(
      currentSession.id,
      MAX_CONTEXT_MESSAGES
    );

    // Get the latest user message from request
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage.role !== 'user') {
      return Response.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    // Save user message to database
    await saveMessage(currentSession.id, 'user', latestUserMessage.content);

    // Determine session type — assessment sessions use a different system prompt
    const isAssessment = currentSession.session_type === 'assessment';

    // Check if difficulty adjustment is needed (tutoring sessions only)
    // Assessment sessions manage their own difficulty internally via the prompt (CAT algorithm)
    const difficultyAdjustment = isAssessment
      ? { reason: 'no_change' as const, newDifficulty: currentSession.difficulty_level, instruction: '' }
      : adjustDifficulty(currentSession);
    let systemPromptAddition = '';
    if (!isAssessment && difficultyAdjustment.reason !== 'no_change') {
      systemPromptAddition = `\n\n⚠️ MOEILIJKHEIDSAANPASSING:\n${difficultyAdjustment.instruction}`;

      // Update session difficulty level
      await updateSessionMetadata(currentSession.id, {
        ...currentSession.metadata,
        consecutive_correct: 0,
        consecutive_incorrect: 0,
        total_hints_given: 0,
      });

      // Update local reference for prompt building
      currentSession.difficulty_level = difficultyAdjustment.newDifficulty;
    }

    // Build system prompt — assessment vs tutoring use different prompts
    let systemPrompt: string;
    if (isAssessment) {
      systemPrompt = buildAssessmentPrompt(
        subject,
        tutorLanguage,
        child.age,
        child.first_name,
        child.grade
      );
    } else {
      // Get session history for continuity across sessions (tutoring only)
      const sessionHistory = await getSessionHistory(childId, subject);
      systemPrompt =
        buildSystemPrompt(
          subject,
          tutorLanguage,
          child.age,
          child.first_name,
          currentSession.difficulty_level,
          currentSession.metadata.igdi_phase,
          sessionHistory,
          child.grade
        ) + systemPromptAddition;
    }

    // Convert context messages to AI SDK format and append new user message
    // Support multimodal messages (text + image) for homework uploads
    const buildMessageContent = (text: string, imageUrl?: string) => {
      if (!imageUrl) return text;

      // Parse base64 data URL: "data:image/jpeg;base64,..."
      const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return text;

      const [, mimeType, base64Data] = match;
      return [
        { type: 'image' as const, image: base64Data, mimeType },
        { type: 'text' as const, text: text || 'Bekijk mijn huiswerk' },
      ];
    };

    const conversationMessages = [
      ...contextMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: buildMessageContent(latestUserMessage.content, latestUserMessage.imageUrl),
      },
    ];

    // Stream AI response
    const result = streamText({
      model: TUTOR_MODEL,
      system: systemPrompt,
      messages: conversationMessages,
      maxOutputTokens: MAX_TOKENS_PER_RESPONSE,
      temperature: TEMPERATURE,
      onFinish: async ({ text, usage }) => {
        try {
          // Get total tokens (with fallback)
          const totalTokens = usage.totalTokens || 0;

          // Analyze Koko's response for correctness and hint signals
          const analysis = analyzeKokoResponse(text);

          // Save assistant message with analysis metadata for auditability
          await saveMessage(currentSession.id, 'assistant', text, {
            tokens_used: totalTokens,
            was_correct: analysis.wasCorrect ?? undefined,
            hints_given: analysis.wasHint ? 1 : 0,
            difficulty_at_time: currentSession.difficulty_level,
          });

          // Record token usage for rate limiting
          await recordTokenUsage(currentSession.id, totalTokens);

          // Build combined metadata updates (messages + tokens + answer counters)
          const metadataUpdates: Partial<SessionMetadata> = {
            total_messages: (currentSession.metadata.total_messages || 0) + 2,
            tokens_used: (currentSession.metadata.tokens_used || 0) + totalTokens,
          };

          // Record answer if we detected a definitive correct/incorrect signal
          if (analysis.wasCorrect !== null) {
            const answerUpdates = recordAnswer(currentSession, analysis.wasCorrect);
            Object.assign(metadataUpdates, answerUpdates);

            // Update local session reference so adjustDifficulty reads fresh counters on next request
            Object.assign(currentSession.metadata, answerUpdates);
          }

          // Increment total_hints_given when Koko gives hints
          if (analysis.wasHint) {
            metadataUpdates.total_hints_given = (currentSession.metadata.total_hints_given || 0) + 1;
            currentSession.metadata.total_hints_given = metadataUpdates.total_hints_given;
          }

          // Persist all metadata updates in a single call
          await updateSessionMetadata(currentSession.id, metadataUpdates);

          // BLOCK 1: Assessment completion detection
          // Koko emits [ASSESSMENT_DONE:level=X] at end of baseline assessment
          if (isAssessment) {
            const levelMatch = text.match(/\[ASSESSMENT_DONE:level=([1-5])\]/);
            if (levelMatch) {
              const determinedLevel = parseInt(levelMatch[1]);
              try {
                await finishAssessment(childId, subject, determinedLevel, currentSession.id);
              } catch (e) {
                console.error('Assessment finalization failed:', e);
              }
            }
          }

          // BLOCK 2: Stuck detection (both assessment and tutoring sessions)
          // Trigger: 3+ consecutive incorrect answers without a correct one in between
          const currentConsecutiveIncorrect =
            metadataUpdates.consecutive_incorrect ?? currentSession.metadata.consecutive_incorrect;
          if (currentConsecutiveIncorrect >= 3 && analysis.wasCorrect !== true) {
            try {
              await updateStuckFlag(childId, subject, true);
            } catch (e) {
              console.error('Stuck flag update failed:', e);
            }
          }
          if (analysis.wasCorrect === true) {
            try {
              await updateStuckFlag(childId, subject, false);
            } catch (e) {
              // Non-fatal: row may not exist yet on first session
            }
          }

          // BLOCK 3: Level change tracking (tutoring sessions only)
          // Records level_up / level_down events to the progress_events ledger
          if (!isAssessment && difficultyAdjustment.reason !== 'no_change') {
            try {
              await recordProgressEvent(
                childId,
                subject,
                currentSession.id,
                difficultyAdjustment.newDifficulty > currentSession.difficulty_level
                  ? 'level_up'
                  : 'level_down',
                difficultyAdjustment.newDifficulty,
                difficultyAdjustment.reason
              );
            } catch (e) {
              console.error('Progress event recording failed:', e);
            }
          }
        } catch (error) {
          console.error('Error in onFinish callback:', error);
          // Don't throw — streaming already completed
        }
      },
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);

    // Check if it's an Anthropic API error
    if (error && typeof error === 'object' && 'status' in error) {
      return Response.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      );
    }

    // Generic error
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
