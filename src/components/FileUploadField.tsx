import React, { useState, useRef, useEffect } from 'react';
import { uploadFileToFirebaseStorage, formatBytes, UploadProgressInfo, UploadControlHolder } from '../utils/firebaseUploadService';
import { isValidMediaOrWebUrl } from '../utils/gradeMatching';
import { triggerFileDownload } from '../utils/videoStorage';
import { ResolvedImage } from './ResolvedMedia';
import { useLanguage } from './LanguageContext';
import { FilePreviewModal, PreviewFileType, PreviewMediaItem } from './FilePreviewModal';

interface FileUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  folder?: string;
  courseId?: string;
  placeholder?: string;
  fileType?: 'pdf' | 'image' | 'word' | 'ppt' | 'code' | 'zip' | 'other';
  onPreview?: (url: string, meta?: { title?: string; fileType?: PreviewFileType; fileName?: string }) => void;
  onUploadingChange?: (busy: boolean) => void;
  onErrorChange?: (err: string | null) => void;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  value,
  onChange,
  accept = 'image/*',
  folder = 'uploads',
  courseId,
  placeholder,
  fileType,
  onPreview,
  onUploadingChange,
  onErrorChange
}) => {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [internalPreview, setInternalPreview] = useState<PreviewMediaItem | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelControlHolder = useRef<UploadControlHolder>({});

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading]);

  useEffect(() => {
    onErrorChange?.(errorMsg);
  }, [errorMsg]);

  const urlLooksInvalid = Boolean(value && value.trim() && !isValidMediaOrWebUrl(value));
  const typeProbe = `${uploadedFileName} ${value || ''}`;

  const isImage = fileType === 'image' || accept.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(typeProbe);
  const isPdf = fileType === 'pdf' || (accept.includes('pdf') && !/\.(docx?|pptx?|zip|rar)$/i.test(typeProbe)) || /\.pdf(\?.*)?$/i.test(typeProbe);
  const isWord = fileType === 'word' || (accept.includes('word') && !/\.pdf(\?.*)?$/i.test(typeProbe)) || (accept.includes('doc') && !/\.pdf(\?.*)?$/i.test(typeProbe)) || /\.(docx?|doc)(\?.*)?$/i.test(typeProbe);
  const isPpt = fileType === 'ppt' || accept.includes('ppt') || /\.(pptx?|ppt)(\?.*)?$/i.test(typeProbe);
  const isZip = fileType === 'zip' || /\.(zip|rar|7z|tar|gz)(\?.*)?$/i.test(typeProbe);
  const isCode = fileType === 'code' || /\.(py|ipynb|json|sql|cpp|c|h|js|ts|tsx|html|css|txt)(\?.*)?$/i.test(typeProbe);

  const detectedPreviewType: PreviewFileType = isPdf
    ? 'pdf'
    : isImage
    ? 'image'
    : isWord
    ? 'word'
    : isPpt
    ? 'ppt'
    : isZip
    ? 'zip'
    : isCode
    ? 'code'
    : 'other';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setProgressInfo(null);
    setIsUploading(true);

    const holder: UploadControlHolder = {};
    cancelControlHolder.current = holder;

    try {
      const downloadUrl = await uploadFileToFirebaseStorage({
        file,
        folder,
        courseId,
        onProgress: (info) => setProgressInfo(info),
        cancelControlHolder: holder
      });

      setProgressInfo({
        progress: 100,
        bytesTransferred: file.size,
        totalBytes: file.size,
        speed: t('مكتمل', 'Completed'),
        remainingTime: '0ث',
        formattedSize: `${formatBytes(file.size)} / ${formatBytes(file.size)}`,
        state: 'success'
      });

      await new Promise((r) => setTimeout(r, 150));

      setIsUploading(false);
      setProgressInfo(null);
      setUploadedFileName(file.name);
      onChange(downloadUrl);
    } catch (err: any) {
      setIsUploading(false);
      setProgressInfo(null);
      if (err?.isCanceled || err?.code === 'storage/canceled' || err?.message?.includes('إلغاء')) {
        return;
      }
      console.error('FileUploadField error:', err);
      setErrorMsg(err?.message || t('حدث خطأ أثناء رفع الملف.', 'Error uploading file.'));
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCancel = () => {
    if (cancelControlHolder.current?.current?.cancel) {
      cancelControlHolder.current.current.cancel();
    }
    setIsUploading(false);
    setProgressInfo(null);
    setErrorMsg(null);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 dir-rtl text-right">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <label className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
          <span>{isPdf ? '📄' : isImage ? '🖼️' : isPpt ? '📊' : isWord ? '📝' : '📁'}</span>
          <span>{label}</span>
        </label>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-3 py-1.5 min-h-[40px] bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan dark:text-brand-cyan-light border border-brand-cyan/40 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <span>📤</span>
          <span>{t('رفع من الجهاز', 'Upload File')}</span>
        </button>
      </div>

      {/* Manual URL Input */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setErrorMsg(null);
            setUploadedFileName('');
            onChange(e.target.value);
          }}
          placeholder={placeholder || (isPdf ? 'https://.../file.pdf' : 'https://.../file')}
          className={`w-full rounded-xl bg-white dark:bg-slate-950 border p-2.5 pr-9 text-slate-900 dark:text-white text-xs font-mono focus:outline-none text-left dir-ltr ${
            urlLooksInvalid
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-slate-300 dark:border-slate-800 focus:border-brand-cyan'
          }`}
        />
        <span className="absolute right-3 top-2.5 text-slate-400 text-xs">🔗</span>
      </div>

      {urlLooksInvalid && (
        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
          ⚠️ {t('صيغة الرابط غير صحيحة (يجب أن يبدأ بـ https:// أو http:// أو يتم رفعه من الجهاز).', 'Invalid URL format (must start with https:// or be uploaded from device).')}
        </p>
      )}

      {/* Real Upload Progress UI */}
      {isUploading && progressInfo && (
        <div className="bg-white dark:bg-slate-950 rounded-xl p-3 border border-brand-cyan/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-brand-cyan">
            <span>
              {progressInfo.speed.includes('سحابياً') || progressInfo.speed.includes('البيانات')
                ? t('جاري المزامنة والحفظ السحابي...', 'Syncing to cloud...')
                : t('جاري رفع الملف من الجهاز...', 'Uploading file...')}
            </span>
            <span className="font-mono text-slate-900 dark:text-white tabular-nums">{Math.round(progressInfo.progress)}%</span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-brand-cyan h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressInfo.progress))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span>{progressInfo.formattedSize}</span>
            <span>{progressInfo.speed}</span>
            <button
              type="button"
              onClick={handleCancel}
              className="text-rose-600 dark:text-rose-400 hover:underline font-sans cursor-pointer"
            >
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Live Preview Bar */}
      {value && value.trim().length > 0 && !isUploading && !urlLooksInvalid && (
        <div className="bg-white dark:bg-slate-950 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
            {isImage ? (
              <ResolvedImage
                src={value}
                alt="Preview"
                className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : isPdf ? (
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                PDF
              </div>
            ) : isWord ? (
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                DOCX
              </div>
            ) : isPpt ? (
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                PPT
              </div>
            ) : isCode ? (
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                CODE
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs shrink-0">
                FILE
              </div>
            )}
            <div className="truncate text-xs font-mono text-slate-700 dark:text-slate-300 dir-ltr text-left">
              {uploadedFileName
                ? `${uploadedFileName}${value.startsWith('firestore://') ? ` (${t('محفوظ سحابياً', 'Cloud')})` : ''}`
                : value.startsWith('firestore://')
                ? `${t('ملف محفوظ سحابياً', 'Cloud File')} (${value.slice(0, 26)}...)`
                : value}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                const fName = uploadedFileName || undefined;
                if (onPreview) {
                  onPreview(value, { title: uploadedFileName || label, fileType: detectedPreviewType, fileName: fName });
                } else {
                  setInternalPreview({ url: value, title: uploadedFileName || label, fileType: detectedPreviewType, fileName: fName });
                }
              }}
              className="text-xs text-brand-cyan hover:underline cursor-pointer font-bold"
            >
              {t('معاينة', 'Preview')}
            </button>
            <button
              type="button"
              onClick={() => triggerFileDownload(value, uploadedFileName || label || 'resource')}
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-brand-cyan cursor-pointer font-bold"
            >
              {t('تنزيل', 'Download')}
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadedFileName('');
                onChange('');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline shrink-0 cursor-pointer font-bold"
            >
              {t('حذف', 'Remove')}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
          <span>⚠️ {errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline text-[11px] cursor-pointer shrink-0"
          >
            {t('إغلاق', 'Close')}
          </button>
        </div>
      )}

      <FilePreviewModal
        item={internalPreview}
        onClose={() => setInternalPreview(null)}
      />
    </div>
  );
};
