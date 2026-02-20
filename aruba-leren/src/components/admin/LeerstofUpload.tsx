'use client';

import { useState } from 'react';

interface LeerstofUploadProps {
  locale: string;
}

const SUBJECT_LABELS: Record<string, string> = {
  geschiedenis: 'Geschiedenis',
  aardrijkskunde: 'Aardrijkskunde',
  kennis_der_natuur: 'Kennis der Natuur',
};

export default function LeerstofUpload({ locale }: LeerstofUploadProps) {
  const [subject, setSubject] = useState('geschiedenis');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ charCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Geef een titel op voor de leerstof');
      return;
    }
    if (mode === 'file' && !file) {
      setError('Selecteer een bestand om te uploaden');
      return;
    }
    if (mode === 'text' && !textContent.trim()) {
      setError('Voer de leerstof tekst in');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('title', title.trim());
      if (mode === 'file' && file) {
        formData.append('file', file);
      } else {
        formData.append('content', textContent.trim());
      }

      const response = await fetch(`/${locale}/api/leerstof/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload mislukt');
      }

      setResult({ charCount: data.charCount });
      setTitle('');
      setFile(null);
      setTextContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Leerstof uploaden</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Vak</label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {Object.entries(SUBJECT_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Titel</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Bijv. Klas 5 - Hoofdstuk 3: De Caquetio"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {/* Mode toggle */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'file'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Upload bestand
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'text'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tekst invoeren
            </button>
          </div>
        </div>

        {/* File or text input */}
        {mode === 'file' ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Bestand (PDF of .txt)</label>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Leerstof tekst</label>
            <textarea
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              rows={8}
              placeholder="Plak of typ de leerstof tekst hier..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            Leerstof opgeslagen! ({result.charCount.toLocaleString('nl-NL')} karakters)
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Bezig met opslaan...' : 'Leerstof opslaan'}
        </button>
      </form>
    </div>
  );
}
