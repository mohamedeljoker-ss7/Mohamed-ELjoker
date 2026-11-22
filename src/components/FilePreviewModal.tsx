import React, { useEffect, useState } from 'react';
import { useLanguage } from './LanguageContext';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { formatPdfEmbedUrl } from '../utils/authAccess';
import { formatBytes } from '../utils/firebaseUploadService';
import { getFileFromFirestoreChunks, getFirestoreMediaMeta } from '../utils/firestoreMediaStorage';
import { getFileFromIndexedDB, triggerFileDownload } from '../utils/videoStorage';
import {
  X, Download, Copy, Check, Loader2, AlertCircle, FileText,
  Image as ImageIcon, Video as VideoIcon, FileSpreadsheet, Code2, Archive, File
} from 'lucide-react';

export type PreviewFileType = 'video' | 'pdf' | 'image' | 'word' | 'ppt' | 'code' | 'zip' | 'other';

export interface PreviewMediaItem {
  url: string;
  title?: string;
  fileType?: PreviewFileType;
  fileName?: string;
}

interface FilePreviewModalProps {
  item: PreviewMediaItem | null;
  onClose: () => void;
  onCopied?: (message: string) => void;
}

function detectKindFromHintOrStrings(
  hint?: PreviewFileType,
  url?: string,
  fileName?: string,
  mimeType?: string
): PreviewFileType {
  if (hint && hint !== 'other') return hint;
  const combined = `${fileName || ''} ${url || ''}`.split('?')[0].toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (
    mime.startsWith('video/') ||
    /youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov|m3u8)(\?|$)/i.test(url || '') ||
    /\.(mp4|webm|mov|m3u8)$/i.test(combined)
  ) {
    return 'video';
  }
  if (mime === 'application/pdf' || /\.pdf$/i.test(combined)) {
    return 'pdf';
  }
  if (mime.startsWith('image/') || /^data:image\//i.test(url || '') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico)$/i.test(combined)) {
    return 'image';
  }
  if (
    mime.includes('wordprocessingml') ||
    mime.includes('msword') ||
    /\.docx?$/i.test(combined)
  ) {
    return 'word';
  }
  if (
    mime.includes('presentationml') ||
    mime.includes('powerpoint') ||
    /\.pptx?$/i.test(combined)
  ) {
    return 'ppt';
  }
  if (
    mime.includes('zip') ||
    mime.includes('rar') ||
    mime.includes('7z') ||
    /\.(zip|rar|7z|tar|gz)$/i.test(combined)
  ) {
    return 'zip';
  }
  if (
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    /\.(py|js|ts|tsx|jsx|c|cpp|h|hpp|html|css|sql|json|txt|md|ipynb|csv|xml|yml|yaml)$/i.test(combined)
  ) {
    return 'code';
  }
  return 'other';
}

async function sniffBlobMagicBytes(blob: Blob, currentKind: PreviewFileType): Promise<{ kind: PreviewFileType; mimeType: string }> {
  const mime = (blob.type || '').toLowerCase();
  if (currentKind !== 'other' && mime && mime !== 'application/octet-stream') {
    return { kind: currentKind, mimeType: blob.type };
  }

  try {
    const headerBuf = await blob.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(headerBuf);
    const ascii = String.fromCharCode(...bytes.slice(0, 8));

    if (ascii.startsWith('%PDF-')) {
      return { kind: 'pdf', mimeType: 'application/pdf' };
    }
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { kind: 'image', mimeType: 'image/png' };
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { kind: 'image', mimeType: 'image/jpeg' };
    }
    if (ascii.startsWith('GIF8')) {
      return { kind: 'image', mimeType: 'image/gif' };
    }
    if (ascii.startsWith('RIFF') && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
      return { kind: 'image', mimeType: 'image/webp' };
    }
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      // Zip archive (could also be docx/pptx if filename indicated it)
      if (currentKind === 'word' || currentKind === 'ppt') {
        return { kind: currentKind, mimeType: mime || 'application/octet-stream' };
      }
      return { kind: 'zip', mimeType: 'application/zip' };
    }
  } catch {
    // Ignore read failure and rely on fallback kind
  }

  if (currentKind === 'pdf') return { kind: 'pdf', mimeType: 'application/pdf' };
  if (currentKind === 'image') return { kind: 'image', mimeType: mime || 'image/png' };
  return { kind: currentKind, mimeType: blob.type || 'application/octet-stream' };
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ item, onClose, onCopied }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resolvedKind, setResolvedKind] = useState<PreviewFileType>('other');
  const [resolvedObjectUrl, setResolvedObjectUrl] = useState<string>('');
  const [resolvedText, setResolvedText] = useState<string | null>(null);
  const [metaInfo, setMetaInfo] = useState<{ fileName?: string; fileSize?: number; fileType?: string }>({});
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!item?.url) return;

    let active = true;
    let createdBlobUrl: string | null = null;
    const rawUrl = item.url.trim();

    setErrorMsg(null);
    setResolvedText(null);
    setResolvedObjectUrl('');
    setMetaInfo({ fileName: item.fileName });
    setLoadProgress(0);

    const initialKind = detectKindFromHintOrStrings(item.fileType, rawUrl, item.fileName);
    setResolvedKind(initialKind);

    // Videos use CustomVideoPlayer directly (it handles firestore://, indexeddb://, YouTube, Drive, MP4, etc.)
    if (initialKind === 'video') {
      setLoading(false);
      return;
    }

    const resolveBlobContent = async (blob: Blob, knownName?: string, knownMime?: string, size?: number) => {
      const prelimKind = detectKindFromHintOrStrings(item.fileType, rawUrl, knownName || item.fileName, knownMime || blob.type);
      const sniffed = await sniffBlobMagicBytes(blob, prelimKind);
      if (!active) return;

      setResolvedKind(sniffed.kind);
      setMetaInfo({
        fileName: knownName || item.fileName || item.title,
        fileSize: size || blob.size,
        fileType: knownMime || sniffed.mimeType
      });

      if (sniffed.kind === 'code') {
        try {
          const textSlice = blob.size > 512 * 1024 ? blob.slice(0, 512 * 1024) : blob;
          const text = await textSlice.text();
          if (active) {
            setResolvedText(blob.size > 512 * 1024 ? `${text}\n\n... [Truncated at 512 KB for preview]` : text);
          }
        } catch {
          // Fallback to download card
        }
      }

      if (sniffed.kind === 'pdf' || sniffed.kind === 'image') {
        const typedBlob = blob.type === sniffed.mimeType ? blob : new Blob([blob], { type: sniffed.mimeType });
        createdBlobUrl = URL.createObjectURL(typedBlob);
        setResolvedObjectUrl(createdBlobUrl);
      }
    };

    if (rawUrl.startsWith('firestore://')) {
      setLoading(true);
      const key = rawUrl.replace('firestore://', '');
      (async () => {
        try {
          const [meta, blob] = await Promise.all([
            getFirestoreMediaMeta(key).catch(() => null),
            getFileFromFirestoreChunks(key, (pct) => { if (active) setLoadProgress(pct); })
          ]);
          if (!active) return;
          if (!blob) {
            setErrorMsg(t('تعذر العثور على الملف في التخزين السحابي.', 'File could not be retrieved from cloud storage.'));
            setLoading(false);
            return;
          }
          await resolveBlobContent(blob, meta?.fileName, meta?.fileType, meta?.fileSize);
        } catch (err: any) {
          if (active) {
            setErrorMsg(err?.message || t('حدث خطأ أثناء تحميل معاينة الملف.', 'Error loading file preview.'));
          }
        } finally {
          if (active) setLoading(false);
        }
      })();
    } else if (rawUrl.startsWith('indexeddb://')) {
      setLoading(true);
      const key = rawUrl.replace('indexeddb://', '');
      (async () => {
        try {
          const blob = await getFileFromIndexedDB(key);
          if (!active) return;
          if (!blob) {
            setErrorMsg(t('الملف غير موجود في التخزين المحلي على هذا الجهاز.', 'File not found in local IndexedDB on this device.'));
            setLoading(false);
            return;
          }
          await resolveBlobContent(blob, item.fileName, blob.type, blob.size);
        } catch (err: any) {
          if (active) {
            setErrorMsg(err?.message || t('تعذر قراءة الملف المحلي.', 'Could not read local file.'));
          }
        } finally {
          if (active) setLoading(false);
        }
      })();
    } else if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
      if (initialKind === 'code') {
        setLoading(true);
        fetch(rawUrl)
          .then(res => res.blob())
          .then(blob => resolveBlobContent(blob, item.fileName, blob.type, blob.size))
          .catch(() => {})
          .finally(() => { if (active) setLoading(false); });
      } else {
        setResolvedObjectUrl(rawUrl);
        setLoading(false);
      }
    } else {
      // Remote HTTP(S) URL
      if (initialKind === 'code') {
        setLoading(true);
        fetch(rawUrl)
          .then(res => {
            if (!res.ok) throw new Error('HTTP error');
            return res.blob();
          })
          .then(blob => resolveBlobContent(blob, item.fileName, blob.type, blob.size))
          .catch(() => {
            if (active) setResolvedObjectUrl(rawUrl);
          })
          .finally(() => { if (active) setLoading(false); });
      } else {
        setResolvedObjectUrl(rawUrl);
        setLoading(false);
      }
    }

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [item?.url, item?.fileType, item?.fileName]);

  if (!item || !item.url) return null;

  const cleanUrl = item.url.trim();
  const displayName = metaInfo.fileName || item.fileName || item.title || t('معاينة الملف', 'File Preview');

  const getHeaderIcon = () => {
    switch (resolvedKind) {
      case 'video': return <VideoIcon className="h-4 w-4 text-rose-500" />;
      case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
      case 'image': return <ImageIcon className="h-4 w-4 text-sky-500" />;
      case 'word': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'ppt': return <FileSpreadsheet className="h-4 w-4 text-orange-500" />;
      case 'code': return <Code2 className="h-4 w-4 text-emerald-500" />;
      case 'zip': return <Archive className="h-4 w-4 text-amber-500" />;
      default: return <File className="h-4 w-4 text-brand-cyan" />;
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(cleanUrl).then(() => {
      setCopiedUrl(true);
      onCopied?.(t('تم نسخ الرابط بنجاح!', 'URL copied!'));
      setTimeout(() => setCopiedUrl(false), 2000);
    }).catch(() => {});
  };

  const handleCopyCode = () => {
    if (!resolvedText) return;
    navigator.clipboard.writeText(resolvedText).then(() => {
      setCopiedCode(true);
      onCopied?.(t('تم نسخ الكود بنجاح!', 'Code copied!'));
      setTimeout(() => setCopiedCode(false), 2000);
    }).catch(() => {});
  };

  const handleDownload = () => {
    const ext =
      resolvedKind === 'pdf' ? '.pdf' :
      resolvedKind === 'word' ? '.docx' :
      resolvedKind === 'ppt' ? '.pptx' :
      resolvedKind === 'zip' ? '.zip' :
      resolvedKind === 'image' ? '.png' : '';
    const base = metaInfo.fileName || item.fileName || item.title || 'academic-resource';
    const downloadName = /\.[a-z0-9]{1,6}$/i.test(base) ? base : `${base}${ext}`;
    triggerFileDownload(cleanUrl, downloadName);
  };

  const renderExternalDocIframe = () => {
    const isRemoteHttp = /^https?:\/\//i.test(cleanUrl);
    if (!isRemoteHttp) return null;

    if (cleanUrl.includes('drive.google.com')) {
      return formatPdfEmbedUrl(cleanUrl);
    }
    if (resolvedKind === 'word' || resolvedKind === 'ppt') {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(cleanUrl)}`;
    }
    return null;
  };

  const officeEmbedSrc = renderExternalDocIframe();

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              {getHeaderIcon()}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-900 dark:text-white text-sm truncate">{displayName}</h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span className="uppercase">{resolvedKind}</span>
                {metaInfo.fileSize ? <span>· {formatBytes(metaInfo.fileSize)}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {resolvedKind !== 'video' && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan-light text-white dark:text-slate-950 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t('تحميل الملف', 'Download')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 transition-all cursor-pointer"
              title={t('إغلاق', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Preview Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('جاري تحميل ومعالجة معاينة الملف...', 'Loading file preview...')}
              </p>
              {loadProgress > 0 && (
                <div className="w-56 space-y-1">
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-cyan transition-all" style={{ width: `${Math.min(100, loadProgress)}%` }} />
                  </div>
                  <p className="text-[11px] font-mono text-brand-cyan font-bold">{loadProgress}%</p>
                </div>
              )}
            </div>
          ) : errorMsg ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{errorMsg}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 px-4 py-2 text-xs font-bold cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>{t('محاولة التنزيل المباشر', 'Try Direct Download')}</span>
              </button>
            </div>
          ) : resolvedKind === 'video' ? (
            <div className="rounded-xl overflow-hidden bg-black">
              <CustomVideoPlayer src={cleanUrl} title={displayName} />
            </div>
          ) : resolvedKind === 'image' && resolvedObjectUrl ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-3 flex items-center justify-center">
              <img
                src={resolvedObjectUrl}
                alt={displayName}
                className="max-h-[66vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : resolvedKind === 'pdf' ? (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white">
                <iframe
                  src={resolvedObjectUrl || formatPdfEmbedUrl(cleanUrl)}
                  title={displayName}
                  className="w-full h-[64vh] border-none bg-white"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  {t('إذا لم يظهر مستند PDF على متصفح الهاتف، استخدم زر التحميل لفتحه مباشرة.', 'If PDF inline rendering is blocked on your browser, click Download to open it directly.')}
                </span>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-cyan/15 text-brand-cyan font-bold hover:bg-brand-cyan/25 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t('تنزيل PDF', 'Download PDF')}</span>
                </button>
              </div>
            </div>
          ) : resolvedKind === 'code' && resolvedText !== null ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
                <span className="font-mono">{displayName}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-cyan font-bold cursor-pointer"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? t('تم النسخ', 'Copied') : t('نسخ الكود', 'Copy Code')}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-100 overflow-x-auto max-h-[60vh] dir-ltr text-left leading-relaxed">
                <code>{resolvedText}</code>
              </pre>
            </div>
          ) : officeEmbedSrc ? (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white">
                <iframe
                  src={officeEmbedSrc}
                  title={displayName}
                  className="w-full h-[64vh] border-none bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-8 sm:p-10 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center mx-auto">
                {resolvedKind === 'word' ? (
                  <FileText className="h-8 w-8 text-blue-500" />
                ) : resolvedKind === 'ppt' ? (
                  <FileSpreadsheet className="h-8 w-8 text-orange-500" />
                ) : resolvedKind === 'zip' ? (
                  <Archive className="h-8 w-8 text-amber-500" />
                ) : (
                  <File className="h-8 w-8 text-brand-cyan" />
                )}
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-base font-black text-slate-900 dark:text-white">{displayName}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {resolvedKind === 'word' || resolvedKind === 'ppt'
                    ? t(
                        'ملفات Word / PowerPoint المرفوعة سحابياً جاهزة للتحميل والفتح مباشرة ببرنامج Office أو عارض المستندات على جهازك.',
                        'Cloud-stored Word / PowerPoint documents open cleanly once downloaded to your device.'
                      )
                    : resolvedKind === 'zip'
                    ? t(
                        'ملفات المشاريع المضغوطة (.zip / .rar) جاهزة للتحميل وفك الضغط على جهازك.',
                        'Compressed project archives are ready to download and extract on your device.'
                      )
                    : t(
                        'الملف محفوظ بنجاح ويمكنك تحميله وفتحه مباشرة على جهازك الآن.',
                        'File is stored safely and ready to download or open on your device.'
                      )}
                </p>
                {metaInfo.fileSize ? (
                  <p className="text-xs font-mono text-brand-cyan font-bold">
                    {t('حجم الملف:', 'Size:')} {formatBytes(metaInfo.fileSize)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-cyan hover:bg-brand-cyan-light text-white dark:text-slate-950 px-6 py-3 text-xs font-black transition-all cursor-pointer shadow-lg shadow-cyan-950/20"
              >
                <Download className="h-4 w-4" />
                <span>{t('تحميل وفتح الملف الآن', 'Download & Open File Now')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer URL Bar */}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          <span className="truncate flex-1 select-all dir-ltr text-left">{cleanUrl}</span>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-cyan text-brand-cyan px-3 py-1 text-[11px] font-bold transition-all shrink-0 cursor-pointer"
          >
            {copiedUrl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <span>{copiedUrl ? t('تم النسخ', 'Copied') : t('نسخ الرابط', 'Copy URL')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
