import React, { useRef, useState } from 'react';
import { AttachmentFile } from '../../types';
import {
  uploadFileToFirebaseStorage,
  UploadProgressInfo,
  UploadControlHolder
} from '../../utils/firebaseUploadService';
import { useLanguage } from '../LanguageContext';
import { Upload, Trash2, FileText, Image as ImageIcon, Code2, Archive, FileSpreadsheet, Loader2, X, ExternalLink } from 'lucide-react';

interface MultiFileUploadListProps {
  label: string;
  files: AttachmentFile[];
  onChange: (files: AttachmentFile[]) => void;
  accept?: string;
  folder?: string;
  courseId?: string;
  helperText?: string;
  allowCodeAndArchives?: boolean;
}

export function detectAttachmentType(fileName: string): AttachmentFile['fileType'] {
  const clean = fileName.split('?')[0].toLowerCase();
  if (/\.pdf$/i.test(clean)) return 'pdf';
  if (/\.pptx$/i.test(clean)) return 'pptx';
  if (/\.ppt$/i.test(clean)) return 'ppt';
  if (/\.docx$/i.test(clean)) return 'docx';
  if (/\.doc$/i.test(clean)) return 'doc';
  if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(clean)) return 'image';
  if (/\.(zip|rar|7z|tar|gz)$/i.test(clean)) return 'zip';
  if (/\.(py|js|ts|tsx|c|cpp|h|html|css|sql|json|txt|ipynb)$/i.test(clean)) return 'code';
  if (/\.(mp4|webm|mov)$/i.test(clean)) return 'video';
  return 'other';
}

export const MultiFileUploadList: React.FC<MultiFileUploadListProps> = ({
  label,
  files,
  onChange,
  accept = 'image/*,.pdf,.ppt,.pptx,.doc,.docx,.zip,.rar,.py,.js,.c,.cpp,.html,.css,.sql,.txt,.json',
  folder = 'lms_attachments',
  courseId,
  helperText
}) => {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelHolder = useRef<UploadControlHolder>({});
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgressInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []) as File[];
    if (selected.length === 0) return;
    setErrorMsg(null);

    const added: AttachmentFile[] = [];
    for (const file of selected) {
      setUploadingName(file.name);
      const holder: UploadControlHolder = {};
      cancelHolder.current = holder;
      try {
        const url = await uploadFileToFirebaseStorage({
          file,
          folder,
          courseId,
          onProgress: (info) => setProgress(info),
          cancelControlHolder: holder
        });
        added.push({
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: file.name,
          url,
          fileType: detectAttachmentType(file.name),
          size: file.size
        });
      } catch (err: any) {
        if (!err?.isCanceled) {
          setErrorMsg(err?.message || t('تعذر رفع أحد الملفات.', 'Failed to upload one of the files.'));
        }
        break;
      }
    }

    if (added.length > 0) {
      onChange([...files, ...added]);
    }
    setUploadingName(null);
    setProgress(null);
    if (e.target) e.target.value = '';
  };

  const handleCancel = () => {
    cancelHolder.current?.current?.cancel?.();
    setUploadingName(null);
    setProgress(null);
  };

  const renderTypeIcon = (type: AttachmentFile['fileType']) => {
    if (type === 'image') return <ImageIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
    if (type === 'code') return <Code2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    if (type === 'zip') return <Archive className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    if (type === 'ppt' || type === 'pptx') return <FileSpreadsheet className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
    return <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleSelectFiles}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white">{label}</p>
          {helperText && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{helperText}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={Boolean(uploadingName)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan dark:text-brand-cyan-light border border-brand-cyan/35 text-xs font-bold cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{t('إضافة ملفات من الجهاز', 'Add Files from Device')}</span>
        </button>
      </div>

      {uploadingName && progress && (
        <div className="rounded-xl bg-white dark:bg-slate-950 border border-brand-cyan/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 font-bold text-slate-900 dark:text-white truncate">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-cyan shrink-0" />
              <span className="truncate">{uploadingName}</span>
            </span>
            <span className="font-mono tabular-nums text-brand-cyan font-bold">{Math.round(progress.progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-cyan transition-all" style={{ width: `${Math.min(100, progress.progress)}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>{progress.formattedSize}</span>
            <button type="button" onClick={handleCancel} className="text-rose-600 dark:text-rose-400 font-sans font-bold cursor-pointer">
              {t('إلغاء الرفع', 'Cancel Upload')}
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {f.fileType === 'image' ? (
                  <img src={f.url} alt={f.name} className="h-9 w-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                    {renderTypeIcon(f.fileType)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{f.name}</p>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">{f.fileType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-500 hover:text-brand-cyan transition-colors"
                  title={t('فتح الملف', 'Open file')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => onChange(files.filter(item => item.id !== f.id))}
                  className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  title={t('حذف المرفق', 'Remove attachment')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
