/**
 * File Upload Validation
 *
 * Validates uploaded files using magic bytes (file signatures)
 * This prevents MIME type spoofing attacks
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an image file for payment proof upload
 *
 * Checks:
 * 1. File size is under 5MB
 * 2. File type is jpeg, png, or webp (using magic bytes, not MIME headers)
 *
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * const result = await validateImageFile(file);
 * if (!result.valid) {
 *   console.error(result.error);
 *   return;
 * }
 */
export async function validateImageFile(
  file: File
): Promise<ValidationResult> {
  // Check file size first (cheapest check)
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Bestand is te groot (max 5MB)',
    };
  }

  try {
    // Convert File to ArrayBuffer, then to Uint8Array for edge runtime compatibility
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Dynamic import for ESM-only file-type package
    const { fileTypeFromBuffer } = await import('file-type');
    const fileType = await fileTypeFromBuffer(buffer);

    // Check if file type could be detected
    if (!fileType) {
      return {
        valid: false,
        error: 'Bestandstype kon niet worden bepaald',
      };
    }

    // Check if detected type is allowed
    if (!ALLOWED_IMAGE_TYPES.includes(fileType.mime)) {
      return {
        valid: false,
        error: `Bestandstype niet toegestaan (gedetecteerd: ${fileType.mime}). Alleen JPEG, PNG, en WebP zijn toegestaan.`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Validatiefout: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
    };
  }
}
