import React, { useEffect, useState } from 'react';
import { getFileFromFirestoreChunks } from '../utils/firestoreMediaStorage';
import { getFileFromIndexedDB } from '../utils/videoStorage';

export function useResolvedMediaUrl(rawUrl?: string | null): { resolvedUrl: string; loading: boolean } {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('firestore://') || rawUrl.startsWith('indexeddb://')) return '';
    return rawUrl;
  });
  const [loading, setLoading] = useState<boolean>(() =>
    Boolean(rawUrl && (rawUrl.startsWith('firestore://') || rawUrl.startsWith('indexeddb://')))
  );

  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;

    if (!rawUrl || !rawUrl.trim()) {
      setResolvedUrl('');
      setLoading(false);
      return;
    }

    const clean = rawUrl.trim();
    if (clean.startsWith('firestore://')) {
      setLoading(true);
      const key = clean.replace('firestore://', '');
      getFileFromFirestoreChunks(key)
        .then((blob) => {
          if (!active) return;
          if (blob) {
            createdBlobUrl = URL.createObjectURL(blob);
            setResolvedUrl(createdBlobUrl);
          } else {
            setResolvedUrl('');
          }
          setLoading(false);
        })
        .catch(() => {
          if (active) {
            setResolvedUrl('');
            setLoading(false);
          }
        });
    } else if (clean.startsWith('indexeddb://')) {
      setLoading(true);
      const key = clean.replace('indexeddb://', '');
      getFileFromIndexedDB(key)
        .then((blob) => {
          if (!active) return;
          if (blob) {
            createdBlobUrl = URL.createObjectURL(blob);
            setResolvedUrl(createdBlobUrl);
          } else {
            setResolvedUrl('');
          }
          setLoading(false);
        })
        .catch(() => {
          if (active) {
            setResolvedUrl('');
            setLoading(false);
          }
        });
    } else {
      setResolvedUrl(clean);
      setLoading(false);
    }

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [rawUrl]);

  return { resolvedUrl, loading };
}

interface ResolvedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: React.ReactNode;
}

export const ResolvedImage: React.FC<ResolvedImageProps> = ({ src, alt = '', className = '', fallback, ...rest }) => {
  const { resolvedUrl, loading } = useResolvedMediaUrl(src);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src, resolvedUrl]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 ${className}`} aria-label={alt} />
    );
  }

  if (!resolvedUrl || broken) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold ${className}`}>
        IMG
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
      {...rest}
    />
  );
};
