'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const t = useTranslations('subscription');
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous state
    setError('');
    setFileName('');
    setPreviewUrl('');

    // Client-side validation (UX only, server validates with magic bytes)
    if (file.size > MAX_FILE_SIZE) {
      setError(t('errors.fileTooLarge'));
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('errors.invalidFileType'));
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFileName(file.name);
    onFileSelect(file);
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">
          {t('uploadProof')}
        </span>
        <span className="block text-xs text-gray-500 mt-1">
          {t('uploadHint')}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="mt-2 block w-full text-sm text-gray-600
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-medium
            file:bg-sky-50 file:text-sky-700
            hover:file:bg-sky-100
            cursor-pointer"
        />
      </label>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      {previewUrl && (
        <div className="border border-sky-200 rounded-lg p-4 bg-sky-50">
          <p className="text-sm text-gray-700 mb-2 font-medium">{fileName}</p>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full h-auto max-h-48 rounded-lg shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
