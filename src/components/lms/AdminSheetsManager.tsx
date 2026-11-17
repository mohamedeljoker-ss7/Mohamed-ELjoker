import React, { useEffect, useMemo, useState } from 'react';
import { AttachmentFile, Course, SheetItem, SheetSubmission } from '../../types';
import { dbService } from '../../firebase';
import { useLanguage } from '../LanguageContext';
import { FileUploadField } from '../FileUploadField';
import { MultiFileUploadList } from './MultiFileUploadList';
import { triggerFileDownload } from '../../utils/videoStorage';
import {
  ACADEMIC_GRADES,
  ACADEMIC_SEMESTERS,
  ACADEMIC_SUBJECTS,
  doesItemMatchYearAndSemester,
  getGradeName,
  getSemesterName,
  isContentPublished
} from '../../utils/gradeMatching';
import {
  FileText, Plus, Search, Edit3, Trash2, Eye, CheckCircle2, X, Globe, FileEdit,
  ArrowUpDown, Download, ClipboardCheck, Clock, Lock, Unlock, Send, FileSpreadsheet,
  Image as ImageIcon, MessageSquare
} from 'lucide-react';

interface AdminSheetsManagerProps {
  sheets: SheetItem[];
  courses: Course[];
  adminName?: string;
  onRefresh: () => void;
  onLogAction: (
    action: 'create' | 'update' | 'delete' | 'status_change',
    targetTitle: string,
    details?: string
  ) => void;
  onPreviewMedia?: (url: string) => void;
}

export const AdminSheetsManager: React.FC<AdminSheetsManagerProps> = ({
  sheets,
  courses,
  adminName = 'Administrator',
  onRefresh,
  onLogAction,
  onPreviewMedia
}) => {
  const { language, t } = useLanguage();

  // Independent Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lecture_sheet' | 'section_sheet'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [sortBy, setSortBy] = useState<'number' | 'date'>('number');

  // Submissions state
  const [submissions, setSubmissions] = useState<SheetSubmission[]>([]);
  const [gradingSheet, setGradingSheet] = useState<SheetItem | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<SheetSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState<string>('');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [savingGrade, setSavingGrade] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewItem, setPreviewItem] = useState<SheetItem | null>(null);

  const [form, setForm] = useState({
    academicYear: 'year1',
    semester: 'term1',
    courseId: '',
    subject: 'Physics',
    sheetType: 'lecture_sheet' as 'lecture_sheet' | 'section_sheet',
    referenceNumber: 1,
    title: '',
    description: '',
    pdfUrl: '',
    wordUrl: '',
    publishDate: new Date().toISOString().split('T')[0],
    deadline: '',
    requiresSubmission: false,
    totalPoints: 10,
    modelAnswerUrl: '',
    modelAnswerText: '',
    showAnswersToStudents: false,
    status: 'published' as 'draft' | 'published' | 'closed',
    images: [] as AttachmentFile[],
    attachments: [] as AttachmentFile[]
  });

  useEffect(() => {
    const unsub = dbService.listenToSheetSubmissions((subs) => {
      setSubmissions(subs);
    });
    return () => unsub();
  }, []);

  const subjectOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; courseId?: string }>();
    ACADEMIC_SUBJECTS.forEach(s => map.set(s.id.toLowerCase(), { id: s.id, label: language === 'ar' ? s.nameAr : s.nameEn }));
    courses.forEach(c => {
      const key = (c.subject || c.titleEn || c.titleAr).toLowerCase();
      if (!map.has(key)) {
        map.set(key, { id: c.subject || c.titleEn || c.titleAr, label: language === 'ar' ? c.titleAr : c.titleEn, courseId: c.id });
      }
    });
    return Array.from(map.values());
  }, [courses, language]);

  const resolveCourseMeta = (subjectVal: string, selectedCourseId: string) => {
    if (selectedCourseId) {
      const c = courses.find(cr => cr.id === selectedCourseId);
      if (c) return { courseId: c.id, courseTitle: c.titleAr || c.subject || subjectVal };
    }
    const lower = subjectVal.toLowerCase();
    const matched = courses.find(
      c =>
        (c.subject && c.subject.toLowerCase() === lower) ||
        c.titleAr.toLowerCase().includes(lower) ||
        c.titleEn.toLowerCase().includes(lower)
    );
    if (matched) return { courseId: matched.id, courseTitle: matched.titleAr };
    return { courseId: `course_${lower.replace(/\s+/g, '_')}`, courseTitle: subjectVal };
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      academicYear: yearFilter !== 'all' ? yearFilter : 'year1',
      semester: semesterFilter !== 'all' ? semesterFilter : 'term1',
      courseId: '',
      subject: subjectFilter !== 'all' ? subjectFilter : 'Physics',
      sheetType: typeFilter !== 'all' ? typeFilter : 'lecture_sheet',
      referenceNumber: sheets.length + 1,
      title: '',
      description: '',
      pdfUrl: '',
      wordUrl: '',
      publishDate: new Date().toISOString().split('T')[0],
      deadline: '',
      requiresSubmission: false,
      totalPoints: 10,
      modelAnswerUrl: '',
      modelAnswerText: '',
      showAnswersToStudents: false,
      status: 'published',
      images: [],
      attachments: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sheet: SheetItem) => {
    setEditingId(sheet.id);
    const existingImages: AttachmentFile[] = (sheet.imageUrls || []).map((url, idx) => ({
      id: `simg_${idx}_${Date.now()}`,
      name: `Sheet Image ${idx + 1}`,
      url,
      fileType: 'image'
    }));
    const sType = sheet.sheetType || sheet.type || 'lecture_sheet';
    const currentStatus: 'draft' | 'published' | 'closed' =
      sheet.status === 'closed' ? 'closed' : isContentPublished(sheet) ? 'published' : 'draft';

    setForm({
      academicYear: sheet.academicYear || 'year1',
      semester: sheet.semester || 'term1',
      courseId: sheet.courseId || '',
      subject: sheet.subject || sheet.courseTitle || 'Physics',
      sheetType: sType,
      referenceNumber: sheet.referenceNumber ?? sheet.lectureNumber ?? sheet.sectionNumber ?? 1,
      title: sheet.title || '',
      description: sheet.description || '',
      pdfUrl: sheet.pdfUrl || (sheet.fileUrl && /\.pdf(\?|$)/i.test(sheet.fileUrl) ? sheet.fileUrl : sheet.fileUrl || ''),
      wordUrl: sheet.wordUrl || '',
      publishDate: sheet.publishDate || (sheet.createdAt ? sheet.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      deadline: sheet.deadline || '',
      requiresSubmission: Boolean(sheet.requiresSubmission),
      totalPoints: sheet.totalPoints ?? 10,
      modelAnswerUrl: sheet.modelAnswerUrl || '',
      modelAnswerText: sheet.modelAnswerText || '',
      showAnswersToStudents: Boolean(sheet.showAnswersToStudents),
      status: currentStatus,
      images: existingImages,
      attachments: sheet.attachments || []
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { courseId, courseTitle } = resolveCourseMeta(form.subject, form.courseId);
      const refNum = Number(form.referenceNumber) || 1;
      const primaryFileUrl = form.pdfUrl.trim() || form.wordUrl.trim() || form.attachments[0]?.url || '';

      const payload: Omit<SheetItem, 'id' | 'createdAt'> = {
        academicYear: form.academicYear,
        semester: form.semester,
        courseId,
        courseTitle,
        subject: form.subject,
        sheetType: form.sheetType,
        type: form.sheetType,
        referenceNumber: refNum,
        lectureNumber: form.sheetType === 'lecture_sheet' ? refNum : undefined,
        sectionNumber: form.sheetType === 'section_sheet' ? refNum : undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        fileUrl: primaryFileUrl,
        pdfUrl: form.pdfUrl.trim(),
        wordUrl: form.wordUrl.trim(),
        imageUrls: form.images.map(i => i.url),
        attachments: form.attachments,
        publishDate: form.publishDate,
        deadline: form.deadline,
        requiresSubmission: form.requiresSubmission,
        totalPoints: Number(form.totalPoints) || 10,
        modelAnswerUrl: form.modelAnswerUrl.trim(),
        modelAnswerText: form.modelAnswerText.trim(),
        showAnswersToStudents: form.showAnswersToStudents,
        status: form.status,
        published: form.status !== 'draft',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await dbService.updateSheet(editingId, payload);
        onLogAction('update', payload.title, `Updated ${form.sheetType} #${refNum} (${form.subject})`);
      } else {
        await dbService.addSheet(payload);
        onLogAction('create', payload.title, `Created ${form.sheetType} #${refNum} (${form.subject})`);
        if (payload.status === 'published') {
          await dbService.addNotification({
            userId: 'global',
            type: 'assignment',
            courseId,
            courseTitle,
            titleAr: `شيت جديد: ${payload.title}`,
            titleEn: `New Academic Sheet: ${payload.title}`,
            bodyAr: `تم نشر ${form.sheetType === 'lecture_sheet' ? 'شيت محاضرة' : 'شيت سكشن'} رقم ${refNum} لمادة ${courseTitle}.`,
            bodyEn: `${form.sheetType === 'lecture_sheet' ? 'Lecture Sheet' : 'Section Sheet'} #${refNum} for ${courseTitle} is now available.`,
            isRead: false,
            createdAt: new Date().toISOString()
          }).catch(() => {});
        }
      }
      setIsModalOpen(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAnswersVisibility = async (sheet: SheetItem) => {
    const next = !sheet.showAnswersToStudents;
    await dbService.updateSheet(sheet.id, {
      showAnswersToStudents: next,
      updatedAt: new Date().toISOString()
    });
    onLogAction('status_change', sheet.title, `Model answer visibility: ${next ? 'Shown' : 'Hidden'}`);
    onRefresh();
  };

  const handleTogglePublish = async (sheet: SheetItem) => {
    const currentlyPublished = isContentPublished(sheet);
    const nextStatus = currentlyPublished ? 'draft' : 'published';
    await dbService.updateSheet(sheet.id, {
      status: nextStatus,
      published: nextStatus !== 'draft',
      updatedAt: new Date().toISOString()
    });
    onLogAction('status_change', sheet.title, `Set sheet status to ${nextStatus}`);
    onRefresh();
  };

  const handleDelete = async (sheet: SheetItem) => {
    if (!confirm(t(`هل تريد حذف الشيت "${sheet.title}"؟`, `Delete sheet "${sheet.title}"?`))) return;
    await dbService.deleteSheet(sheet.id);
    onLogAction('delete', sheet.title, 'Deleted academic sheet');
    onRefresh();
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;
    setSavingGrade(true);
    try {
      const parsedScore = gradeScore.trim() === '' ? undefined : Number(gradeScore);
      await dbService.gradeSheetSubmission(activeSubmission.id, parsedScore, gradeFeedback.trim(), adminName);
      onLogAction('update', activeSubmission.sheetTitle, `Graded submission by ${activeSubmission.studentName}`);
      setActiveSubmission(null);
      setGradeScore('');
      setGradeFeedback('');
    } finally {
      setSavingGrade(false);
    }
  };

  const filteredSheets = useMemo(() => {
    return sheets
      .filter(sheet => {
        if (!doesItemMatchYearAndSemester(sheet, yearFilter, semesterFilter, courses)) return false;
        const subj = (sheet.subject || sheet.courseTitle || '').toLowerCase();
        if (subjectFilter !== 'all' && !subj.includes(subjectFilter.toLowerCase())) return false;
        const sType = sheet.sheetType || sheet.type || 'lecture_sheet';
        if (typeFilter !== 'all' && sType !== typeFilter) return false;
        const currentStatus = sheet.status === 'closed' ? 'closed' : isContentPublished(sheet) ? 'published' : 'draft';
        if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const hay = `${sheet.title} ${sheet.description || ''} ${subj}`.toLowerCase();
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
  }, [sheets, yearFilter, semesterFilter, subjectFilter, typeFilter, statusFilter, searchQuery, sortBy, courses]);

  const kpis = useMemo(() => {
    const lecSheets = sheets.filter(s => (s.sheetType || s.type || 'lecture_sheet') === 'lecture_sheet').length;
    const secSheets = sheets.filter(s => (s.sheetType || s.type) === 'section_sheet').length;
    const pendingSubs = submissions.filter(s => s.status === 'submitted').length;
    return {
      total: sheets.length,
      lecSheets,
      secSheets,
      pendingSubs,
      gradedSubs: submissions.filter(s => s.status === 'graded').length
    };
  }, [sheets, submissions]);

  const sheetSubmissions = useMemo(() => {
    if (!gradingSheet) return [];
    return submissions.filter(s => s.sheetId === gradingSheet.id);
  }, [submissions, gradingSheet]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand-cyan" />
            <span>{t('إدارة الشيتات الأكاديمية (شيتات المحاضرات والسكاشن)', 'Academic Sheets Management (Lecture & Section Sheets)')}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('رفع شيتات PDF و Word، التحكم في مواعيد التسليم، وإتاحة أو إخفاء نموذج الإجابة للطلاب.', 'Manage lecture/section sheets, deadlines, student submissions, and model answer visibility.')}
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 min-h-[44px] bg-brand-cyan hover:bg-cyan-600 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{t('إضافة شيت جديد', 'Add New Sheet')}</span>
        </button>
      </div>

      {/* Independent KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('إجمالي الشيتات', 'Total Sheets')}</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{kpis.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('شيتات المحاضرات / السكاشن', 'Lecture / Section')}</div>
          <div className="text-2xl font-black text-brand-cyan mt-1 tabular-nums">{kpis.lecSheets} / {kpis.secSheets}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('تسليمات بانتظار التقييم', 'Pending Submissions')}</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{kpis.pendingSubs}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('تسليمات تم تقييمها', 'Graded Submissions')}</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{kpis.gradedSubs}</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('بحث في الشيتات...', 'Search sheets...')}
            className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
          />
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
        >
          <option value="all">{t('كل الفرق الدراسية', 'All Academic Years')}</option>
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
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'lecture_sheet' | 'section_sheet')}
          className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
        >
          <option value="all">{t('كل أنواع الشيتات', 'All Sheet Types')}</option>
          <option value="lecture_sheet">{t('شيتات المحاضرات', 'Lecture Sheets')}</option>
          <option value="section_sheet">{t('شيتات السكاشن', 'Section Sheets')}</option>
        </select>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft' | 'closed')}
            className="flex-1 px-2.5 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="all">{t('كل الحالات', 'All Status')}</option>
            <option value="published">{t('منشور', 'Published')}</option>
            <option value="draft">{t('مسودة', 'Draft')}</option>
            <option value="closed">{t('مغلق', 'Closed')}</option>
          </select>
          <button
            type="button"
            onClick={() => setSortBy(prev => prev === 'number' ? 'date' : 'number')}
            className="px-2.5 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:border-brand-cyan cursor-pointer shrink-0"
            title={t('تبديل الترتيب', 'Toggle Sort')}
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-brand-cyan" />
          </button>
        </div>
      </div>

      {/* Sheets List */}
      {filteredSheets.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
          <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
            {t('لا توجد شيتات مطابقة للفلاتر الحالية.', 'No academic sheets match the current filters.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSheets.map(sheet => {
            const isPub = isContentPublished(sheet);
            const isClosed = sheet.status === 'closed';
            const sType = sheet.sheetType || sheet.type || 'lecture_sheet';
            const sheetSubs = submissions.filter(s => s.sheetId === sheet.id);
            const pendingCount = sheetSubs.filter(s => s.status === 'submitted').length;

            return (
              <div
                key={sheet.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-brand-cyan/60 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
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
                      <h4 className="font-black text-slate-900 dark:text-white text-base mt-1 truncate">
                        {sheet.title}
                      </h4>
                    </div>
                    <span className={`text-[11px] font-bold shrink-0 ${isClosed ? 'text-amber-600 dark:text-amber-400' : isPub ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {isClosed ? t('مغلق', 'Closed') : isPub ? t('منشور', 'Published') : t('مسودة', 'Draft')}
                    </span>
                  </div>

                  {sheet.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{sheet.description}</p>
                  )}

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 tabular-nums">
                    {(sheet.pdfUrl || sheet.fileUrl) && (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                        <FileText className="h-3.5 w-3.5" /> PDF
                      </span>
                    )}
                    {sheet.wordUrl && (
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
                        <FileText className="h-3.5 w-3.5" /> Word
                      </span>
                    )}
                    {sheet.requiresSubmission && (
                      <span className="inline-flex items-center gap-1 text-brand-cyan font-bold">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        {t(`تسليم مطلوب (${sheetSubs.length})`, `Submission (${sheetSubs.length})`)}
                      </span>
                    )}
                    {sheet.deadline && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {t('الموعد:', 'Due:')} {new Date(sheet.deadline).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 font-bold ${sheet.showAnswersToStudents ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {sheet.showAnswersToStudents ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {sheet.showAnswersToStudents ? t('الإجابة متاحة', 'Answers Shown') : t('الإجابة مخفية', 'Answers Hidden')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(sheet)}
                      className="px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{t('معاينة', 'Preview')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGradingSheet(sheet)}
                      className="px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-brand-cyan bg-brand-cyan/10 hover:bg-brand-cyan/20 rounded-lg flex items-center gap-1 cursor-pointer tabular-nums"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      <span>{t(`التسليمات (${sheetSubs.length})`, `Submissions (${sheetSubs.length})`)}</span>
                      {pendingCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-black">· {pendingCount} {t('جديد', 'new')}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAnswersVisibility(sheet)}
                      className="px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      {sheet.showAnswersToStudents ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      <span>{sheet.showAnswersToStudents ? t('إخفاء الحل', 'Hide Key') : t('إظهار الحل', 'Show Key')}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(sheet)}
                      className="p-2 min-h-[36px] min-w-[36px] text-slate-600 dark:text-slate-300 hover:text-brand-cyan rounded-lg cursor-pointer"
                      title={isPub ? t('تحويل لمسودة', 'Move to Draft') : t('نشر للطلاب', 'Publish')}
                    >
                      {isPub ? <FileEdit className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(sheet)}
                      className="p-2 min-h-[36px] min-w-[36px] text-slate-600 dark:text-slate-300 hover:text-brand-cyan rounded-lg cursor-pointer"
                      title={t('تعديل', 'Edit')}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sheet)}
                      className="p-2 min-h-[36px] min-w-[36px] text-slate-600 dark:text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer"
                      title={t('حذف', 'Delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Sheet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {editingId ? t('تعديل بيانات الشيت', 'Edit Academic Sheet') : t('إضافة شيت أكاديمي جديد', 'Add New Academic Sheet')}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('الفرقة الدراسية', 'Academic Year')}</label>
                  <select
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {ACADEMIC_GRADES.map(g => (
                      <option key={g.id} value={g.id}>{language === 'ar' ? g.nameAr : g.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('الفصل الدراسي', 'Semester')}</label>
                  <select
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {ACADEMIC_SEMESTERS.map(s => (
                      <option key={s.id} value={s.id}>{language === 'ar' ? s.nameAr : s.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('المادة الدراسية', 'Subject')}</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {subjectOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('تصنيف الشيت', 'Sheet Type')}</label>
                  <select
                    value={form.sheetType}
                    onChange={(e) => setForm({ ...form, sheetType: e.target.value as 'lecture_sheet' | 'section_sheet' })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="lecture_sheet">{t('شيت محاضرة (Lecture Sheet)', 'Lecture Sheet')}</option>
                    <option value="section_sheet">{t('شيت سكشن (Section Sheet)', 'Section Sheet')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('رقم الشيت', 'Sheet Number')}</label>
                  <input
                    type="number"
                    min={1}
                    value={form.referenceNumber}
                    onChange={(e) => setForm({ ...form, referenceNumber: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('الحالة', 'Status')}</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' | 'closed' })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="published">{t('منشور للطلاب', 'Published')}</option>
                    <option value="draft">{t('مسودة (مخفي)', 'Draft (Hidden)')}</option>
                    <option value="closed">{t('مغلق (انتهى التسليم)', 'Closed')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('عنوان الشيت *', 'Sheet Title *')}</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t('مثال: شيت 1 - أساسيات الدوائر المنطقية', 'e.g. Sheet 1 - Logic Circuits Basics')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('تعليمات وملاحظات الشيت', 'Sheet Instructions')}</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('اكتب تعليمات الحل المطلوبة من الطالب...', 'Enter instructions for students...')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-brand-cyan"
                />
              </div>

              {/* Files */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileUploadField
                  label={t('ملف الشيت (PDF)', 'Sheet PDF File')}
                  value={form.pdfUrl}
                  onChange={(val) => setForm({ ...form, pdfUrl: val })}
                  accept=".pdf,application/pdf"
                  fileType="pdf"
                  folder="lms_sheets"
                  onPreview={(url) => onPreviewMedia?.(url)}
                />
                <FileUploadField
                  label={t('ملف الشيت (Word .doc / .docx)', 'Sheet Word File (.doc / .docx)')}
                  value={form.wordUrl}
                  onChange={(val) => setForm({ ...form, wordUrl: val })}
                  accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  fileType="other"
                  folder="lms_sheets"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MultiFileUploadList
                  label={t('صور توضيحية للشيت', 'Sheet Images')}
                  files={form.images}
                  onChange={(files) => setForm({ ...form, images: files })}
                  accept="image/*"
                  folder="lms_sheets_images"
                />
                <MultiFileUploadList
                  label={t('مرفقات إضافية / أكواد', 'Additional Attachments')}
                  files={form.attachments}
                  onChange={(files) => setForm({ ...form, attachments: files })}
                  folder="lms_sheets_attachments"
                />
              </div>

              {/* Submission & Deadline Settings */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiresSubmission}
                      onChange={(e) => setForm({ ...form, requiresSubmission: e.target.checked })}
                      className="w-4 h-4 accent-brand-cyan rounded"
                    />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {t('تفعيل تسليم حلول الطلاب أونلاين', 'Allow Students to Submit Solutions Online')}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">{t('الدرجة الكلية:', 'Total Points:')}</span>
                    <input
                      type="number"
                      min={1}
                      value={form.totalPoints}
                      onChange={(e) => setForm({ ...form, totalPoints: Number(e.target.value) || 10 })}
                      className="w-20 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('تاريخ النشر', 'Publish Date')}</label>
                    <input
                      type="date"
                      value={form.publishDate}
                      onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('آخر موعد للتسليم (اختياري)', 'Submission Deadline (Optional)')}</label>
                    <input
                      type="datetime-local"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Model Answer Section + Admin Visibility Toggle */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    {form.showAnswersToStudents ? <Unlock className="h-4 w-4 text-emerald-500" /> : <Lock className="h-4 w-4 text-slate-400" />}
                    {t('نموذج الإجابة والتحكم في ظهوره للطلاب', 'Model Answer & Student Visibility')}
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.showAnswersToStudents}
                      onChange={(e) => setForm({ ...form, showAnswersToStudents: e.target.checked })}
                      className="w-4 h-4 accent-brand-cyan rounded"
                    />
                    <span className="text-xs font-bold text-brand-cyan">
                      {t('إظهار نموذج الإجابة للطلاب', 'Show Model Answer to Students')}
                    </span>
                  </label>
                </div>

                <FileUploadField
                  label={t('ملف نموذج الإجابة (PDF)', 'Model Answer PDF')}
                  value={form.modelAnswerUrl}
                  onChange={(val) => setForm({ ...form, modelAnswerUrl: val })}
                  accept=".pdf,image/*,.doc,.docx"
                  fileType="pdf"
                  folder="lms_sheets_answers"
                  onPreview={(url) => onPreviewMedia?.(url)}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {t('نص نموذج الإجابة أو الملاحظات الإرشادية', 'Model Answer Text / Solution Notes')}
                  </label>
                  <textarea
                    rows={3}
                    value={form.modelAnswerText}
                    onChange={(e) => setForm({ ...form, modelAnswerText: e.target.value })}
                    placeholder={t('اكتب خطوات الحل النموذجي...', 'Write model solution steps...')}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 min-h-[44px] bg-brand-cyan hover:bg-cyan-600 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ الشيت', 'Save Sheet')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview As Student Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-brand-cyan">
                  {t('معاينة الطالب — ', 'Student Preview — ')}
                  {(previewItem.sheetType || previewItem.type) === 'section_sheet' ? t('شيت سكشن', 'Section Sheet') : t('شيت محاضرة', 'Lecture Sheet')} #{previewItem.referenceNumber}
                </span>
                <h4 className="font-black text-slate-900 dark:text-white text-lg mt-0.5">{previewItem.title}</h4>
              </div>
              <button type="button" onClick={() => setPreviewItem(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {previewItem.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{previewItem.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {(previewItem.pdfUrl || previewItem.fileUrl) && (
                <button
                  type="button"
                  onClick={() => triggerFileDownload(previewItem.pdfUrl || previewItem.fileUrl, `${previewItem.title}.pdf`)}
                  className="px-3.5 py-2 min-h-[40px] bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-rose-500" />
                  <span>{t('تحميل ملف الشيت PDF', 'Download Sheet PDF')}</span>
                </button>
              )}
              {previewItem.wordUrl && (
                <button
                  type="button"
                  onClick={() => triggerFileDownload(previewItem.wordUrl!, `${previewItem.title}.docx`)}
                  className="px-3.5 py-2 min-h-[40px] bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-blue-500" />
                  <span>{t('تحميل ملف Word', 'Download Word')}</span>
                </button>
              )}
            </div>

            {previewItem.imageUrls && previewItem.imageUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {previewItem.imageUrls.map((img, i) => (
                  <img key={i} src={img} alt="" className="rounded-xl border border-slate-200 dark:border-slate-700 object-cover max-h-48 w-full" />
                ))}
              </div>
            )}

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="text-xs font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                {previewItem.showAnswersToStudents ? <Unlock className="h-4 w-4 text-emerald-500" /> : <Lock className="h-4 w-4 text-amber-500" />}
                <span>
                  {previewItem.showAnswersToStudents
                    ? t('نموذج الإجابة (ظاهر للطلاب)', 'Model Answer (Visible to Students)')
                    : t('نموذج الإجابة (مخفي حاليًا عن الطلاب)', 'Model Answer (Currently Hidden from Students)')}
                </span>
              </div>
              {previewItem.showAnswersToStudents ? (
                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {previewItem.modelAnswerText && <p className="whitespace-pre-wrap">{previewItem.modelAnswerText}</p>}
                  {previewItem.modelAnswerUrl && (
                    <button
                      type="button"
                      onClick={() => triggerFileDownload(previewItem.modelAnswerUrl!, `${previewItem.title}_answer.pdf`)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{t('تحميل ملف الإجابة النموذجية', 'Download Model Answer')}</span>
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">{t('لن يظهر نموذج الإجابة للطالب إلا عند تفعيل خيار الإظهار من الإدارة.', 'Students cannot see model answers until enabled by administration.')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submissions & Grading Modal */}
      {gradingSheet && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-brand-cyan">{t('تسليمات الطلاب وتقييمها', 'Student Sheet Submissions')}</span>
                <h3 className="font-black text-slate-900 dark:text-white text-base mt-0.5">{gradingSheet.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => { setGradingSheet(null); setActiveSubmission(null); }}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {sheetSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm font-bold">
                  {t('لم يقم أي طالب بتسليم حلول لهذا الشيت حتى الآن.', 'No student submissions yet for this sheet.')}
                </div>
              ) : (
                sheetSubmissions.map(sub => (
                  <div key={sub.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-black text-sm text-slate-900 dark:text-white">{sub.studentName}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {sub.studentEmail} · {new Date(sub.submittedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sub.status === 'graded' ? (
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {t('تم التقييم:', 'Graded:')} {sub.score ?? '-'} / {sub.totalPoints ?? gradingSheet.totalPoints ?? 10}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{t('بانتظار التقييم', 'Pending Grade')}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSubmission(sub);
                            setGradeScore(sub.score !== undefined ? String(sub.score) : '');
                            setGradeFeedback(sub.feedback || '');
                          }}
                          className="px-3 py-1.5 min-h-[36px] bg-brand-cyan text-white dark:text-slate-950 font-black rounded-lg text-xs cursor-pointer"
                        >
                          {sub.status === 'graded' ? t('تعديل التقييم', 'Update Grade') : t('تقييم الحل', 'Grade')}
                        </button>
                      </div>
                    </div>

                    {sub.answerText && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                        {sub.answerText}
                      </p>
                    )}

                    {sub.fileUrl && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => triggerFileDownload(sub.fileUrl!, sub.fileName || `${sub.studentName}_sheet`)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-brand-cyan flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{sub.fileName || t('تحميل ملف الحل المرفق', 'Download Submitted File')}</span>
                        </button>
                        {onPreviewMedia && (
                          <button
                            type="button"
                            onClick={() => onPreviewMedia(sub.fileUrl!)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{t('معاينة', 'Preview')}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {sub.feedback && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-brand-cyan mt-0.5 shrink-0" />
                        <span>{sub.feedback}</span>
                      </div>
                    )}

                    {activeSubmission?.id === sub.id && (
                      <form onSubmit={handleSaveGrade} className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            {t(`الدرجة (من ${gradingSheet.totalPoints ?? 10})`, `Score (out of ${gradingSheet.totalPoints ?? 10})`)}
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            max={gradingSheet.totalPoints ?? 100}
                            value={gradeScore}
                            onChange={(e) => setGradeScore(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white tabular-nums"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            {t('ملاحظات التقييم للطالب', 'Instructor Feedback')}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={gradeFeedback}
                              onChange={(e) => setGradeFeedback(e.target.value)}
                              placeholder={t('أضف ملاحظاتك حول الحل...', 'Enter feedback...')}
                              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                            />
                            <button
                              type="submit"
                              disabled={savingGrade}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>{savingGrade ? t('حفظ...', 'Saving...') : t('اعتماد', 'Save')}</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
