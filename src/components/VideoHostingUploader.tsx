import React, { useState, useRef, useMemo } from 'react';
import { uploadLargeVideo, UploadProgressInfo, UploadControlHolder } from '../utils/largeVideoUploader';
import { formatBytes } from '../utils/firebaseUploadService';
import { useLanguage } from './LanguageContext';
import { extractYouTubeVideoId, parseVideoSource } from '../utils/videoUtils';

interface VideoHostingUploaderProps {
  value: string;
  onChange: (url: string) => void;
  courseId?: string;
  lessonId?: string;
  onPreviewUrl?: (url: string) => void;
  label?: string;
  onFileSelect?: (file: File) => void;
}

export const VideoHostingUploader: React.FC<VideoHostingUploaderProps> = ({
  value,
  onChange,
  courseId,
  lessonId,
  onPreviewUrl,
  label,
  onFileSelect
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'device' | 'url'>('device');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelControlHolder = useRef<UploadControlHolder>({});

  const detectedYouTubeId = useMemo(() => {
    return extractYouTubeVideoId(value);
  }, [value]);

  const parsedSource = useMemo(() => {
    return parseVideoSource(value);
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setProgressInfo(null);

    const fileName = file.name || 'file';
    const fileType = file.type || '';
    const isVideo = fileType.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|3gp|m4v|flv|wmv)$/i.test(fileName.toLowerCase());

    if (!isVideo) {
      setErrorMsg(t('يرجى اختيار ملف فيديو صالح (MP4, MOV, MKV, WEBM).', 'Please select a valid video file (MP4, MOV, MKV, WEBM).'));
      return;
    }

    setSelectedFile(file);

    if (onFileSelect) {
      try {
        onFileSelect(file);
      } catch (err) {
        console.warn('[VideoHostingUploader] onFileSelect notice:', err);
      }
    }

    // Create local Object URL ONLY for immediate video player preview, not for form save
    try {
      const localUrl = URL.createObjectURL(file);
      if (onPreviewUrl) {
        onPreviewUrl(localUrl);
      }
    } catch (e) {
      console.warn('[VideoHostingUploader] Object URL notice:', e);
    }

    startRealUpload(file);
  };

  const startRealUpload = async (fileToUpload: File) => {
    setIsUploading(true);
    setErrorMsg(null);
    setProgressInfo({
      progress: 0,
      bytesTransferred: 0,
      totalBytes: fileToUpload.size,
      speed: t('جاري بدء الرفع...', 'Starting upload...'),
      remainingTime: t('حساب...', 'Calculating...'),
      formattedSize: `0 MB / ${(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB`,
      state: 'running'
    });

    const holder: UploadControlHolder = {};
    cancelControlHolder.current = holder;

    try {
      console.log('=== [VideoHostingUploader] Starting Real Firebase Storage Upload ===');
      const downloadUrl = await uploadLargeVideo(
        fileToUpload,
        (info) => {
          setProgressInfo(info);
        },
        holder,
        courseId,
        lessonId,
        'videos'
      );

      console.log('=== [VideoHostingUploader] Real Firebase Storage Upload Complete ===', downloadUrl);
      setProgressInfo({
        progress: 100,
        bytesTransferred: fileToUpload.size,
        totalBytes: fileToUpload.size,
        speed: t('مكتمل', 'Completed'),
        remainingTime: '0ث',
        formattedSize: `${formatBytes(fileToUpload.size)} / ${formatBytes(fileToUpload.size)}`,
        state: 'success'
      });
      
      await new Promise((r) => setTimeout(r, 200));

      setIsUploading(false);
      setProgressInfo(null);
      onChange(downloadUrl);
      if (onPreviewUrl) {
        onPreviewUrl(downloadUrl);
      }
    } catch (err: any) {
      setIsUploading(false);
      setProgressInfo(null);
      if (err?.isCanceled || err?.code === 'storage/canceled' || err?.message?.includes('إلغاء')) {
        console.log('[VideoHostingUploader] Upload canceled by user.');
        return;
      }
      console.error('Real Firebase Storage upload error:', err);
      setErrorMsg(err?.message || t('حدث خطأ أثناء رفع الفيديو إلى Firebase Storage.', 'Error uploading video to Firebase Storage.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    if (cancelControlHolder.current?.current?.cancel) {
      cancelControlHolder.current.current.cancel();
    }
    setIsUploading(false);
    setProgressInfo(null);
    setErrorMsg(null);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl text-right dir-rtl space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header & Mode Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <label className="font-bold text-white text-sm flex items-center gap-2">
          <span>🎬</span>
          <span>{label || t('فيديو الدرس', 'Lesson Video')}</span>
        </label>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('device')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'device'
                ? 'bg-brand-cyan text-brand-dark font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 {t('رفع من الجهاز', 'Upload from Device')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-brand-cyan text-brand-dark font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔗 {t('رابط YouTube / مستضاف', 'YouTube / Hosted Link')}
          </button>
        </div>
      </div>

      {/* TAB 1: Upload from Device */}
      {activeTab === 'device' && (
        <div className="space-y-3">
          {!isUploading && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-brand-cyan/60 rounded-2xl p-5 text-center bg-slate-950/60 hover:bg-slate-950 transition-all cursor-pointer group"
            >
              <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">📤</div>
              <p className="font-bold text-white text-sm mb-0.5">
                {value
                  ? t('اضغط هنا لاختيار فيديو جديد وتغيير الحالي', 'Click here to select a new video file to replace current')
                  : t('اضغط هنا لاختيار فيديو من جهازك ورفعه على Firebase Storage', 'Click here to select a video file and upload to Firebase Storage')}
              </p>
              <p className="text-slate-400 text-xs">
                {t('يدعم صيغ: MP4, MOV, WEBM, MKV (يتم حساب النسبة والسرعة بشكل حقيقي)', 'Supports MP4, MOV, WEBM, MKV with real progress tracking')}
              </p>
            </div>
          )}

          {/* Real Active Uploading Progress UI */}
          {isUploading && progressInfo && (
            <div className="bg-slate-950 rounded-xl p-4 border border-brand-cyan/40 space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-2 text-brand-cyan">
                  <span className="h-2 w-2 rounded-full bg-brand-cyan animate-ping" />
                  {progressInfo.speed.includes('سحابياً') || progressInfo.speed.includes('البيانات') 
                    ? t('جاري الحفظ والمزامنة السحابية للفيديو...', 'Syncing video to cloud storage...')
                    : t('جاري رفع الفيديو إلى التخزين السحابي (Firebase Storage)...', 'Uploading video to Cloud Storage (Firebase)...')}
                </span>
                <span className="font-mono text-brand-cyan text-sm">{Math.round(progressInfo.progress)}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="bg-gradient-to-r from-brand-cyan to-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progressInfo.progress))}%` }}
                />
              </div>

              {/* Upload Stats */}
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-center">
                <div>
                  <span className="block text-slate-500 text-[10px]">{t('الحجم المرفوع', 'Transferred')}</span>
                  <span className="text-white font-bold">{progressInfo.formattedSize}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[10px]">{t('سرعة الرفع الحقيقية', 'Real Speed')}</span>
                  <span className="text-brand-cyan font-bold">{progressInfo.speed}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[10px]">{t('الوقت المتبقي', 'Remaining')}</span>
                  <span className="text-amber-400 font-bold">{progressInfo.remainingTime}</span>
                </div>
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  🛑 {t('إلغاء عملية الرفع', 'Cancel Upload')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Manual Hosted / YouTube Link */}
      {activeTab === 'url' && (
        <div className="space-y-3">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/... or Google Drive / MP4"
              value={value}
              onChange={(e) => {
                const newVal = e.target.value;
                onChange(newVal);
                if (onPreviewUrl) onPreviewUrl(newVal);
              }}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 pr-10 text-white focus:outline-none focus:border-brand-cyan font-mono text-xs text-left dir-ltr"
            />
            <span className="absolute right-3 text-slate-500 text-sm">🔗</span>
          </div>

          {/* Real-time YouTube Detection Badge */}
          {detectedYouTubeId && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-2.5 flex items-center gap-2 text-xs text-red-200">
              <span className="text-base">▶️</span>
              <div className="flex-1">
                <span className="font-bold">{t('تم التعرف على فيديو YouTube بنجاح!', 'YouTube Video Detected Successfully!')}</span>
                <span className="font-mono text-slate-400 text-[11px] block mt-0.5">ID: {detectedYouTubeId} • {t('سيتم تشغيل الفيديو داخل المنصة', 'Will play in-platform')}</span>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
            💡 {t('يدعم روابط YouTube (watch, shorts, youtu.be, embed) أو Google Drive أو روابط MP4 المباشرة. يتم تشغيل الفيديو بالكامل داخل صفحة الكورس بدون فتح نوافذ خارجية.', 'Supports YouTube (watch, shorts, youtu.be, embed), Google Drive, or direct MP4 links. Video plays fully inside the course page without opening external tabs.')}
          </p>
        </div>
      )}

      {/* Successfully Uploaded / Attached Video Link Indicator */}
      {value && value.trim().length > 0 && !isUploading && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 truncate max-w-[80%]">
              <span>✅</span>
              <span className="truncate">{t('تم ربط الفيديو بنجاح وجاهز للحفظ:', 'Video attached and ready to save:')}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onPreviewUrl && (
                <button
                  type="button"
                  onClick={() => onPreviewUrl(value)}
                  className="bg-slate-800 hover:bg-slate-700 text-brand-cyan border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  👁️ {t('معاينة داخلية', 'Preview')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                {t('حذف', 'Remove')}
              </button>
            </div>
          </div>

          <div className="bg-slate-950/70 p-2 rounded-lg border border-emerald-500/20 text-[11px] font-mono text-slate-300 break-all">
            {detectedYouTubeId ? (
              <div className="space-y-1">
                <span className="text-red-400 font-bold">▶️ {t('فيديو YouTube مدمج داخل المنصة (ID: ' + detectedYouTubeId + ')', 'Embedded YouTube Video in Platform (ID: ' + detectedYouTubeId + ')')}</span>
                <p className="text-slate-400 text-[10px] truncate">{value}</p>
              </div>
            ) : value.startsWith('indexeddb://') ? (
              <div className="space-y-1">
                <span className="text-cyan-400 font-bold">📦 {t('تخزين الجهاز المحلي (IndexedDB)', 'Local Browser Store (IndexedDB)')}</span>
                <p className="text-slate-400 text-[10px] font-sans">
                  {t('💡 عند النشر على الموقع، يمكنك لصق رابط YouTube (عام أو غير مدرج Unlisted) أو Google Drive ليعمل لجميع الطلاب عبر الإنترنت.', '💡 For public deployment, you can also paste a YouTube Unlisted or Google Drive link in the Manual Hosted tab.')}
                </p>
              </div>
            ) : value.startsWith('https://firebasestorage.googleapis.com') ? (
              <div className="space-y-1">
                <span className="text-emerald-400 font-bold">☁️ {t('تخزين Firebase السحابي (Cloud Storage) - يعمل للجميع', 'Firebase Cloud Storage - Works globally')}</span>
                <p className="text-slate-400 text-[10px] truncate">{value}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-brand-cyan font-bold">🌐 {t('رابط مباشر مستضاف (تشغيل مدمج داخل المنصة)', 'Hosted Link (Embedded In-Platform)')}</span>
                <p className="text-slate-400 text-[10px] truncate">{value}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 flex items-center justify-between gap-2">
          <span>⚠️ {errorMsg}</span>
          <div className="flex items-center gap-2">
            {selectedFile && (
              <button
                type="button"
                onClick={() => startRealUpload(selectedFile)}
                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
              >
                🔄 {t('إعادة المحاولة', 'Retry')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
            >
              {t('إغلاق', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
