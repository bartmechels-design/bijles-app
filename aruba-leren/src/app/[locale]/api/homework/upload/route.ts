/**
 * Phone Upload API
 *
 * POST /[locale]/api/homework/upload
 *
 * Accepts a homework photo upload using an upload code.
 * NO authentication required — access is controlled by the code.
 * Uses admin client to bypass RLS.
 */

import { NextRequest } from 'next/server';
import { uploadImageByCode } from '@/lib/tutoring/homework-upload';

// Max body size: ~6MB (base64 of 4MB image)
export async function POST(request: NextRequest) {
  try {
    const { code, imageData } = await request.json();

    if (!code || !imageData) {
      return Response.json(
        { error: 'Code en afbeelding zijn verplicht' },
        { status: 400 }
      );
    }

    // Validate code format (6 alphanumeric chars)
    if (!/^[A-Za-z0-9]{6}$/.test(code)) {
      return Response.json(
        { error: 'Ongeldige code' },
        { status: 400 }
      );
    }

    // Validate image data (must be base64 data URL)
    if (!imageData.startsWith('data:image/')) {
      return Response.json(
        { error: 'Ongeldig bestandstype' },
        { status: 400 }
      );
    }

    // Check size (rough check: base64 is ~33% larger than original)
    if (imageData.length > 6 * 1024 * 1024) {
      return Response.json(
        { error: 'Afbeelding is te groot (max 4MB)' },
        { status: 413 }
      );
    }

    const result = await uploadImageByCode(code, imageData);

    if (!result.success) {
      return Response.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Upload API error:', error);
    return Response.json(
      { error: 'Upload mislukt. Probeer opnieuw.' },
      { status: 500 }
    );
  }
}
