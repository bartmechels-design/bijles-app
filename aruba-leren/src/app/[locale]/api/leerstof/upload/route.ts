export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { TUTOR_MODEL } from '@/lib/ai/providers/anthropic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Admin check
    const isAdmin = user?.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const subject = formData.get('subject') as string | null;
    const title = formData.get('title') as string | null;

    if (!subject || !title) {
      return Response.json({ error: 'subject and title are required' }, { status: 400 });
    }

    const validSubjects = ['geschiedenis', 'aardrijkskunde', 'kennis_der_natuur'];
    if (!validSubjects.includes(subject)) {
      return Response.json({ error: 'Invalid subject — only zaakvakken allowed' }, { status: 400 });
    }

    let content = '';
    let sourceType: 'pdf' | 'text' = 'text';
    let sourceFilename: string | null = null;

    if (file) {
      sourceFilename = file.name;

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        sourceType = 'pdf';
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Dynamic import to avoid edge runtime issues (runtime = 'nodejs' handles this)
        const pdfParse = (await import('pdf-parse')).default;
        const parsed = await pdfParse(buffer);
        content = parsed.text.trim();
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        sourceType = 'text';
        content = await file.text();
      } else if (file.type.startsWith('image/')) {
        // Photo of book page — extract text via Claude vision
        sourceType = 'text';
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const { text } = await generateText({
          model: TUTOR_MODEL,
          messages: [{
            role: 'user',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content: [
              { type: 'image', image: base64, mimeType: file.type } as any,
              { type: 'text', text: 'Extraheer alle tekst uit deze afbeelding van een schoolboekpagina. Geef alleen de tekst terug, behoud alinea-structuur. Geen commentaar of inleiding.' },
            ],
          }],
        });
        content = text.trim();
      } else {
        return Response.json({ error: 'Alleen PDF, .txt of afbeeldingen (JPEG/PNG) zijn toegestaan' }, { status: 400 });
      }
    } else {
      // Direct text input
      const textContent = formData.get('content') as string | null;
      if (!textContent) {
        return Response.json({ error: 'file or content text is required' }, { status: 400 });
      }
      content = textContent;
      sourceType = 'text';
    }

    if (!content || content.length < 10) {
      return Response.json({ error: 'Extracted content is too short or empty' }, { status: 400 });
    }

    // Truncate to ~50k chars to stay within prompt budget
    const truncated = content.slice(0, 50000);

    // Save to database
    const { data, error: insertError } = await supabase
      .from('leerstof_items')
      .insert({
        subject,
        title,
        content: truncated,
        source_filename: sourceFilename,
        source_type: sourceType,
        uploaded_by: user.id,
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      console.error('Leerstof insert error:', insertError);
      return Response.json({ error: 'Failed to save leerstof' }, { status: 500 });
    }

    return Response.json({ success: true, id: data.id, charCount: truncated.length });
  } catch (error) {
    console.error('Leerstof upload error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
