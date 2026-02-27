// src/components/DropZone.tsx
// Uses react-dropzone 14.3.8 — accept prop MUST be object format, NOT string.
// String accept format ("image/*") silently breaks in v14. Always use MIME→extensions object.

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { useFrameStore } from '../store/useFrameStore';
import type { ImageFrame } from '../types/frames';

// v14 object format — DO NOT use string format
const ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

export function DropZone() {
  const addFrames = useFrameStore((s) => s.addFrames);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setError(null);
      setIsLoading(true);
      try {
        const frames: ImageFrame[] = await Promise.all(
          acceptedFiles.map(async (file) => {
            const bitmap = await createImageBitmap(file);
            return {
              type: 'image' as const,
              id: crypto.randomUUID(),
              file,
              bitmap,
              name: file.name,
            };
          }),
        );
        addFrames(frames);
      } catch (err) {
        setError('Failed to load one or more images. Please try again.');
        console.error('Image decode error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [addFrames],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: ACCEPT,
      multiple: true,
      onDropRejected: () => {
        setError('Only PNG, JPG, and WebP images are accepted.');
      },
    });

  const hasRejections = fileRejections.length > 0;

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={[
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-150',
          isDragActive
            ? 'border-blue-400 bg-blue-950/30 scale-[1.01]'
            : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/50',
          isLoading ? 'opacity-60 pointer-events-none' : '',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-3 text-gray-500" size={36} />
        {isLoading ? (
          <p className="text-gray-400">Processing images...</p>
        ) : isDragActive ? (
          <p className="text-blue-300 font-medium">Drop images here</p>
        ) : (
          <>
            <p className="text-gray-300 font-medium">
              Drag images here, or click to select
            </p>
            <p className="text-gray-500 text-sm mt-1">PNG, JPG, WebP</p>
          </>
        )}
      </div>
      {(error || hasRejections) && (
        <p className="mt-2 text-red-400 text-sm text-center">
          {error ?? 'Some files were rejected. Only PNG, JPG, WebP accepted.'}
        </p>
      )}
    </div>
  );
}
