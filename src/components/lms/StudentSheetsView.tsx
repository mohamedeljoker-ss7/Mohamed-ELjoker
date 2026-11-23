import React, { useEffect, useMemo, useState } from 'react';
import { Course, SheetAnswerKeyDoc, SheetItem, SheetSubmission, UserAuth } from '../../types';
import { dbService } from '../../firebase';
import { useLanguage } from '../LanguageContext';
import { FileUploadField } from '../FileUploadField';
import { ResolvedImage } from '../ResolvedMedia';
import { emitAppToast, triggerFileDownload } from '../../utils/videoStorage';
import {
  ACADEMIC_GRADES,
  ACADEMIC_SEMESTERS,
  ACADEMIC_SUBJECTS,
  doesItemMatchYearAndSemester,
  doesSubjectMatch,
  getGradeName,
  getSemesterName,
  isContentPublished,
  normalizeGradeCode,
  normalizeSemesterCode
} from '../../utils/gradeMatching';
import {
  FileSpreadsheet, Search, FileText, Image as ImageIcon, Download, Eye, ArrowUpDown,
  X, Clock, Upload, CheckCircle2, Lock, Unlock, Send, MessageSquare, AlertCircle, Loader2
} from 'lucide-react';

interface StudentSheetsViewProps {
  sheets: SheetItem[];
  courses: Course[];
  currentUser: UserAuth | null;
  onOpenPdf: (url: string, title: string) => void;
}

export const StudentSheetsView: React.FC<StudentSheetsViewProps> = ({
  sheets,
  courses,
  currentUser,
  onOpenPdf
}) => {
  const { language, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>(() => normalizeGradeCode(currentUser?.grade) || 'all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lecture_sheet' | 'section_sheet'>('all');
  const [sortBy, setSortBy] = useState<'number' | 'date'>('number');

  const [mySubmissions, setMySubmissions] = useState<SheetSubmission[]>([]);
  const [gallerySheet, setGallerySheet] = useState<SheetItem | null>(null);

  // Answer key modal state (fetched dynamically from sheet_answer_keys when showAnswersToStudents == true)
  const [answerModalSheet, setAnswerModalSheet] = useState<SheetItem | null>(null);
  const [answerKeyDoc, setAnswerKeyDoc] = useState<SheetAnswerKeyDoc | null>(null);
  const [loadingAnswerKey, setLoadingAnswerKey] = useState(false);
  const [answerKeyError, setAnswerKeyError] = useState('');

  // Solution submission modal state
  const [submitModalSheet, setSubmitModalSheet] = useState<SheetItem | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = dbService.listenToSheetSubmissions((subs) => {
      setMySubmissions(subs);
    }, undefined, currentUser.id);
    return () => unsub();
  }, [currentUser?.id]);

  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    ACADEMIC_SUBJECTS.forEach(s => map.set(s.id.toLowerCase(), language === 'ar' ? s.nameAr : s.nameEn));
    courses.forEach(c => {
      const id = c.subject || c.titleEn || c.titleAr;
      if (id && !map.has(id.toLowerCase())) {
        map.set(id.toLowerCase(), language === 'ar' ? c.titleAr : c.titleEn);
      }
    });
    return Array.from(map.entries()).map(([k, label]) => ({ id: k, label }));
  }, [courses, language]);

  const visibleSheets = useMemo(() => {
    return sheets.filter(s => isContentPublished(s));
  }, [sheets]);

  const filteredSheets = useMemo(() => {
    return visibleSheets
      .filter(sheet => {
        if (!doesItemMatchYearAndSemester(sheet, yearFilter, semesterFilter, courses)) return false;
        if (!doesSubjectMatch(sheet, subjectFilter, courses)) return false;
        const sType = sheet.sheetType || sheet.type || 'lecture_sheet';
        if (typeFilter !== 'all' && sType !== typeFilter) return false;
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const hay = `${sheet.title} ${sheet.description || ''} ${sheet.subject || ''} ${sheet.courseTitle || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.publishDate || b.createdAt).getTime() - new Date(a.publishDate || a.createdAt).getTime();
        }
        return (a.referenceNumber ?? 0) - (b.referenceNumber ?? 0);
      });
  }, [visibleSheets, yearFilter, semesterFilter, subjectFilter, typeFilter, searchQuery, sortBy, courses]);

  const handleOpenSubmitModal = (sheet: SheetItem) => {
    setSubmitModalSheet(sheet);
    setAnswerText('');
    setFileUrl('');
    setUploadingFile(false);
    setSubmitError('');
  };

  const handleOpenAnswerModal = async (sheet: SheetItem) => {
    if (sheet.showAnswersToStudents !== true) return;
    setAnswerModalSheet(sheet);
    setAnswerKeyError('');
    setAnswerKeyDoc(
      sheet.modelAnswerUrl || sheet.modelAnswerText
        ? {
            sheetId: sheet.id,
            modelAnswerUrl: sheet.modelAnswerUrl || '',
            modelAnswerText: sheet.modelAnswerText || '',
            showAnswersToStudents: true
          }
        : null
    );
    setLoadingAnswerKey(true);
    try {
      const fetched = await dbService.getSheetAnswerKey(sheet.id);
      if (fetched) {
        setAnswerKeyDoc(fetched);
      }
    } catch (err: any) {
      setAnswerKeyError(err?.message || t('تعذر تحميل نموذج الإجابة في الوقت الحالي.', 'Unable to load model answer at the moment.'));
    } finally {
      setLoadingAnswerKey(false);
    }
  };

  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModalSheet || !currentUser || uploadingFile || submitting) return;
    if (!answerText.trim() && !fileUrl.trim()) {
      setSubmitError(t('يرجى كتابة إجابتك أو إرفاق ملف الحل قبل الإرسال.', 'Please enter your answer or attach a solution file before submitting.'));
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await dbService.submitSheetSolution({
        sheetId: submitModalSheet.id,
        sheetTitle: submitModalSheet.title,
        sheetType: submitModalSheet.sheetType || submitModalSheet.type || 'lecture_sheet',
        courseId: submitModalSheet.courseId,
        courseTitle: submitModalSheet.courseTitle,
        subject: submitModalSheet.subject,
        academicYear: submitModalSheet.academicYear,
        semester: submitModalSheet.semester,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentEmail: currentUser.email,
        answerText: answerText.trim(),
        fileUrl: fileUrl.trim(),
        fileName: fileUrl ? `${submitModalSheet.title}_${currentUser.name}` : undefined,
        status: 'submitted',
        totalPoints: submitModalSheet.totalPoints ?? 10
      });
      emitAppToast(t('تم تسليم حل الشيت بنجاح.', 'Sheet solution submitted successfully.'), 'success');
      setSubmitModalSheet(null);
      setAnswerText('');
      setFileUrl('');
    } catch (err: any) {
      const msg = err?.message || t('فشل إرسال حل الشيت للسحابة، حاول مرة أخرى.', 'Failed to submit sheet solution. Please try again.');
      setSubmitError(msg);
      emitAppToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedModelAnswerText = answerKeyDoc?.modelAnswerText ?? answerModalSheet?.modelAnswerText ?? '';
  const resolvedModelAnswerUrl = answerKeyDoc?.modelAnswerUrl ?? answerModalSheet?.modelAnswerUrl ?? '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand-cyan" />
            <span>{t('الشيتات الأكاديمية (شيتات المحاضرات والسكاشن)', 'Academic Sheets (Lectures & Sections)')}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('تحميل شيتات التدريب والتمارين، رفع الحلول، ومراجعة الإجابات النموذجية عند إتاحتها.', 'Download practice sheets, submit solutions, and check model answers when released.')}
          </p>
        </div>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
          {filteredSheets.length} {t('شيت متاح', 'available sheets')}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('ابحث في الشيتات...', 'Search sheets...')}
            className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
          />
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
        >
          <option value="all">{t('كل الفرق الدراسية', 'All Years')}</option>
          {ACADEMIC_GRADES.filter(g => g.id !== 'general').map(g => (
            <option key={g.id} value={g.id}>{language === 'ar' ? g.nameAr : g.nameEn}</option>
          ))}
        </select>
        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
        >
          <option value="all">{t('كل الفصول الدراسية', 'All Semesters')}</option>
          {ACADEMIC_SEMESTERS.filter(s => s.id !== 'all').map(s => (
            <option key={s.id} value={s.id}>{language === 'ar' ? s.nameAr : s.nameEn}</option>
          ))}
        </select>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
        >
          <option value="all">{t('كل المواد', 'All Subjects')}</option>
          {subjectOptions.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'lecture_sheet' | 'section_sheet')}
            className="flex-1 px-2.5 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="all">{t('الكل', 'All Types')}</option>
            <option value="lecture_sheet">{t('شيت محاضرة', 'Lecture')}</option>
            <option value="section_sheet">{t('شيت سكشن', 'Section')}</option>
          </select>
          <button
            type="button"
            onClick={() => setSortBy(prev => prev === 'number' ? 'date' : 'number')}
            className="px-2.5 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
            title={t('ترتيب', 'Sort')}
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-brand-cyan" />
          </button>
        </div>
      </div>

      {/* Sheets Cards */}
      {filteredSheets.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-3">
          <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
            {t('لا توجد شيتات متاحة لهذا الفلتر حاليًا.', 'No sheets available for this filter.')}
          </p>
          {(yearFilter !== 'all' || semesterFilter !== 'all' || subjectFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setYearFilter('all');
                setSemesterFilter('all');
                setSubjectFilter('all');
                setTypeFilter('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-extrabold cursor-pointer shadow-sm"
            >
              {t('عرض كل الشيتات بدون فلاتر', 'Show All Sheets Without Filters')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSheets.map(sheet => {
            const sType = sheet.sheetType || sheet.type || 'lecture_sheet';
            const pdfHref = sheet.pdfUrl || (sheet.fileUrl && (/\.pdf(\?|$)/i.test(sheet.fileUrl) || sheet.fileUrl.startsWith('firestore://')) ? sheet.fileUrl : (!sheet.wordUrl ? sheet.fileUrl : ''));
            const latestSub = mySubmissions.find(s => s.sheetId === sheet.id);
            const isClosed = sheet.status === 'closed' || (sheet.deadline ? new Date(sheet.deadline).getTime() < Date.now() : false);

            return (
              <div
                key={sheet.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-brand-cyan/60 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 tabular-nums">
                        <span className="text-brand-cyan font-black">
                          {sType === 'lecture_sheet' ? t('شيت محاضرة', 'Lecture Sheet') : t('شيت سكشن', 'Section Sheet')} #{sheet.referenceNumber}
                        </span>
                        <span>·</span>
                        <span>{sheet.subject || sheet.courseTitle}</span>
                        <span>·</span>
                        <span>{getGradeName(sheet.academicYear, language)}</span>
                        <span>·</span>
                        <span>{getSemesterName(sheet.semester, language)}</span>
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white text-base mt-1">{sheet.title}</h4>
                    </div>
                    {latestSub && (
                      <span className={`text-[11px] font-black shrink-0 tabular-nums ${latestSub.status === 'graded' ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-cyan'}`}>
                        {latestSub.status === 'graded'
                          ? `${latestSub.score ?? '-'} / ${latestSub.totalPoints ?? sheet.totalPoints ?? 10}`
                          : t('تم التسليم', 'Submitted')}
                      </span>
                    )}
                  </div>

                  {sheet.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{sheet.description}</p>
                  )}

                  {sheet.deadline && (
                    <div className={`text-[11px] font-bold flex items-center gap-1.5 tabular-nums ${isClosed ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {t('آخر موعد للتسليم:', 'Deadline:')} {new Date(sheet.deadline).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        {isClosed ? ` (${t('مغلق', 'Closed')})` : ''}
                      </span>
                    </div>
                  )}

                  {latestSub?.feedback && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                      <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{latestSub.feedback}</span>
                    </div>
                  )}
                </div>

                {/* Files & Submission Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {pdfHref && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenPdf(pdfHref, sheet.title)}
                        className="px-3 py-2 min-h-[38px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-rose-500" />
                        <span>{t('عرض PDF', 'View PDF')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerFileDownload(pdfHref, `${sheet.title}.pdf`)}
                        className="px-3 py-2 min-h-[38px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-brand-cyan" />
                        <span>{t('تحميل', 'Download')}</span>
                      </button>
                    </>
                  )}
                  {sheet.wordUrl && (
                    <button
                      type="button"
                      onClick={() => triggerFileDownload(sheet.wordUrl!, `${sheet.title}.docx`)}
                      className="px-3 py-2 min-h-[38px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      <span>{t('تحميل Word', 'Word')}</span>
                    </button>
                  )}
                  {sheet.imageUrls && sheet.imageUrls.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setGallerySheet(sheet)}
                      className="px-3 py-2 min-h-[38px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer tabular-nums"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
                      <span>{t(`صور (${sheet.imageUrls.length})`, `Images (${sheet.imageUrls.length})`)}</span>
                    </button>
                  )}
                  {sheet.attachments && sheet.attachments.map(att => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => triggerFileDownload(att.url, att.name)}
                      className="px-3 py-2 min-h-[38px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-brand-cyan" />
                      <span className="truncate max-w-[120px]">{att.name}</span>
                    </button>
                  ))}

                  {sheet.requiresSubmission && !isClosed && (
                    <button
                      type="button"
                      onClick={() => handleOpenSubmitModal(sheet)}
                      className="px-3.5 py-2 min-h-[38px] bg-brand-cyan hover:bg-cyan-600 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{latestSub ? t('إعادة تسليم الحل', 'Resubmit Solution') : t('تسليم الحل', 'Submit Solution')}</span>
                    </button>
                  )}

                  {/* Strictly gated Model Answer visibility (resolved securely from sheet_answer_keys) */}
                  {sheet.showAnswersToStudents === true ? (
                    <button
                      type="button"
                      onClick={() => handleOpenAnswerModal(sheet)}
                      className="px-3 py-2 min-h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>{t('نموذج الإجابة', 'Model Answer')}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400 inline-flex items-center gap-1 px-2">
                      <Lock className="h-3 w-3" />
                      {t('نموذج الإجابة غير متاح بعد', 'Answer key locked')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Images Gallery Modal */}
      {gallerySheet && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="font-black text-slate-900 dark:text-white text-base">{gallerySheet.title}</h4>
              <button type="button" onClick={() => setGallerySheet(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(gallerySheet.imageUrls || []).map((img, i) => (
                <div key={i} className="space-y-1.5">
                  <ResolvedImage
                    src={img}
                    alt={`${gallerySheet.title} ${i + 1}`}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 w-full object-contain max-h-72 bg-slate-100 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={() => triggerFileDownload(img, `${gallerySheet.title}_img_${i + 1}.png`)}
                    className="text-xs font-bold text-brand-cyan flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{t('تحميل الصورة', 'Download Image')}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student Solution Submission Modal */}
      {submitModalSheet && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-brand-cyan">{t('تسليم حل الشيت', 'Submit Sheet Solution')}</span>
                <h4 className="font-black text-slate-900 dark:text-white text-base">{submitModalSheet.title}</h4>
              </div>
              <button type="button" onClick={() => setSubmitModalSheet(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitSolution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('إجابتك أو ملاحظاتك النصية', 'Written Answer / Notes')}
                </label>
                <textarea
                  rows={4}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder={t('اكتب إجابتك هنا أو أرفق ملف الحل بالأسفل...', 'Type your answer or attach a solution file below...')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
                />
              </div>

              <FileUploadField
                label={t('إرفاق ملف الحل (PDF / Word / صورة / كود)', 'Attach Solution File (PDF / Word / Image / Code)')}
                value={fileUrl}
                onChange={(val) => setFileUrl(val)}
                onUploadingChange={(busy) => setUploadingFile(busy)}
                accept=".pdf,.doc,.docx,image/*,.zip,.rar,.py,.js,.c,.cpp"
                fileType="other"
                folder="sheet_submissions"
                courseId={submitModalSheet.courseId}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubmitModalSheet(null)}
                  className="px-4 py-2.5 min-h-[40px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile || (!answerText.trim() && !fileUrl.trim())}
                  className="px-5 py-2.5 min-h-[40px] bg-brand-cyan hover:bg-cyan-600 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {uploadingFile
                      ? t('جاري رفع الملف...', 'Uploading file...')
                      : submitting
                      ? t('جاري الإرسال...', 'Submitting...')
                      : t('إرسال الحل', 'Submit Solution')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Strictly Gated Model Answer Modal */}
      {answerModalSheet && answerModalSheet.showAnswersToStudents === true && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('نموذج الإجابة الرسمي', 'Official Model Answer')}
                </span>
                <h4 className="font-black text-slate-900 dark:text-white text-base mt-0.5">{answerModalSheet.title}</h4>
              </div>
              <button type="button" onClick={() => setAnswerModalSheet(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingAnswerKey ? (
              <div className="py-10 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-brand-cyan" />
                <span>{t('جاري تحميل نموذج الإجابة...', 'Loading model answer...')}</span>
              </div>
            ) : answerKeyError ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{answerKeyError}</span>
              </div>
            ) : (
              <>
                {resolvedModelAnswerText && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {resolvedModelAnswerText}
                  </div>
                )}

                {resolvedModelAnswerUrl && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenPdf(resolvedModelAnswerUrl, `${answerModalSheet.title} - Model Answer`)}
                      className="px-4 py-2.5 min-h-[40px] bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{t('عرض ملف الإجابة النموذجية', 'View Answer Key File')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerFileDownload(resolvedModelAnswerUrl, `${answerModalSheet.title}_model_answer.pdf`)}
                      className="px-4 py-2.5 min-h-[40px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>{t('تحميل الملف', 'Download')}</span>
                    </button>
                  </div>
                )}

                {!resolvedModelAnswerText && !resolvedModelAnswerUrl && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                    {t('لم يتم إرفاق ملف أو نص لنموذج الإجابة لهذا الشيت بعد.', 'No model answer file or notes have been attached to this sheet yet.')}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
