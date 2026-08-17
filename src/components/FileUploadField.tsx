import React, { useState, useRef } from 'react';
import { uploadFileToFirebaseStorage, readFileAsDataUrl, formatBytes, UploadProgressInfo, UploadControlHolder } from '../utils/firebaseUploadService';
import { useLanguage } from './LanguageContext';

interface FileUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  folder?: string;
  courseId?: string;
  placeholder?: string;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  value,
  onChange,
  accept = 'image/*',
  folder = 'uploads',
  courseId,
  placeholder
}) => {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelControlHolder = useRef<UploadControlHolder>({});

  const isImage = accept.includes('image') || (value && /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(value));
  const isPdf = accept.includes('pdf') || (value && /\.pdf(\?.*)?$/i.test(value));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setProgressInfo(null);
    setIsUploading(true);

    const holder: UploadControlHolder = {};
    cancelControlHolder.current = holder;

    try {
      console.log(`=== [FileUploadField] Uploading ${folder} file to Firebase Storage ===`);
      const downloadUrl = await uploadFileToFirebaseStorage({
        file,
        folder,
        courseId,
        onProgress: (info) => setProgressInfo(info),
        cancelControlHolder: holder
      });

      console.log(`=== [FileUploadField] Upload complete: ===`, downloadUrl);
      setProgressInfo({
        progress: 100,
        bytesTransferred: file.size,
        totalBytes: file.size,
        speed: t('مكتمل', 'Completed'),
        remainingTime: '0ث',
        formattedSize: `${formatBytes(file.size)} / ${formatBytes(file.size)}`,
        state: 'success'
      });

      await new Promise((r) => setTimeout(r, 200));

      setIsUploading(false);
      setProgressInfo(null);
      onChange(downloadUrl);
    } catch (err: any) {
      setIsUploading(false);
      setProgressInfo(null);
      if (err?.isCanceled || err?.code === 'storage/canceled' || err?.message?.includes('إلغاء')) {
        console.log('[FileUploadField] Upload canceled by user.');
        return;
      }
      console.error('FileUploadField error:', err);
      setErrorMsg(err?.message || t('حدث خطأ أثناء رفع الملف إلى Firebase Storage.', 'Error uploading file.'));
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
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 dir-rtl text-right">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <label className="font-bold text-white text-xs flex items-center gap-2">
          <span>{isPdf ? '📄' : isImage ? '🖼️' : '📁'}</span>
          <span>{label}</span>
        </label>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-3 py-1 bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/40 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
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
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || (isPdf ? 'https://.../file.pdf' : 'https://.../image.png')}
          className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 pr-9 text-white text-xs font-mono focus:outline-none focus:border-brand-cyan text-left dir-ltr"
        />
        <span className="absolute right-3 top-2.5 text-slate-500 text-xs">🔗</span>
      </div>

      {/* Real Upload Progress UI */}
      {isUploading && progressInfo && (
        <div className="bg-slate-950 rounded-xl p-3 border border-brand-cyan/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-brand-cyan">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-cyan animate-ping" />
              {progressInfo.speed.includes('سحابياً') || progressInfo.speed.includes('البيانات') 
                ? t('جاري المزامنة والحفظ السحابي...', 'Syncing to cloud...')
                : t('جاري رفع الملف إلى التخزين السحابي (Firebase Storage)...', 'Uploading file to Cloud Storage (Firebase)...')}
            </span>
            <span className="font-mono text-white">{Math.round(progressInfo.progress)}%</span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-brand-cyan h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressInfo.progress))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>{progressInfo.formattedSize}</span>
            <span>{progressInfo.speed}</span>
            <button
              type="button"
              onClick={handleCancel}
              className="text-rose-400 hover:underline font-sans cursor-pointer"
            >
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Live Preview Bar */}
      {value && value.trim().length > 0 && !isUploading && (
        <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden max-w-[80%]">
            {isImage ? (
              <img
                src={value}
                alt="Preview"
                className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : isPdf ? (
              <div className="w-10 h-10 rounded-lg bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center font-bold text-xs shrink-0">
                PDF
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 text-xs shrink-0">
                FILE
              </div>
            )}
            <div className="truncate text-xs font-mono text-slate-300 dir-ltr text-left">
              {value}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-rose-400 hover:text-rose-300 underline shrink-0 cursor-pointer"
          >
            {t('حذف', 'Remove')}
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
          >
            {t('إغلاق', 'Close')}
          </button>
        </div>
      )}
    </div>
  );
};
