import React, { useMemo, useState } from 'react';
import { Course, SectionItem, SectionExample, AttachmentFile } from '../../types';
import { dbService } from '../../firebase';
import { useLanguage } from '../LanguageContext';
import { FileUploadField } from '../FileUploadField';
import { VideoHostingUploader } from '../VideoHostingUploader';
import { MultiFileUploadList, mapAttachmentToPreviewType } from './MultiFileUploadList';
import { ResolvedImage } from '../ResolvedMedia';
import { PreviewFileType } from '../FilePreviewModal';
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
  isValidMediaOrWebUrl
} from '../../utils/gradeMatching';
import {
  Layers, Plus, Search, Video, FileText, Code2, Archive,
  Edit3, Trash2, Eye, CheckCircle2, X, Globe, FileEdit, ArrowUpDown,
  Download, AlertCircle, EyeOff
} from 'lucide-react';

interface AdminSectionsManagerProps {
  sections: SectionItem[];
  courses: Course[];
  onRefresh: () => void;
  onLogAction: (
    action: 'create' | 'update' | 'delete' | 'status_change',
    targetTitle: string,
    details?: string
  ) => void;
  onPreviewMedia?: (url: string, title?: string, fileType?: PreviewFileType, fileName?: string) => void;
}

export const AdminSectionsManager: React.FC<AdminSectionsManagerProps> = ({
  sections,
  courses,
  onRefresh,
  onLogAction,
  onPreviewMedia
}) => {
  const { language, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'unpublished'>('all');
  const [sortBy, setSortBy] = useState<'number' | 'date'>('number');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [previewItem, setPreviewItem] = useState<SectionItem | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SectionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isUploadingAny = Object.values(uploadingFields).some(Boolean);
  const setFieldUploading = (field: string, busy: boolean) => {
    setUploadingFields(prev => (prev[field] === busy ? prev : { ...prev, [field]: busy }));
  };

  const [form, setForm] = useState({
    academicYear: 'year1',
    semester: 'term1',
    courseId: '',
    subject: 'Python Programming',
    sectionNumber: 1,
    title: '',
    practicalTopic: '',
    labInstructions: '',
    youtubeUrl: '',
    pdfUrl: '',
    archiveUrl: '',
    sectionDate: new Date().toISOString().split('T')[0],
    status: 'published' as 'published' | 'draft' | 'unpublished',
    codeFiles: [] as AttachmentFile[],
    images: [] as AttachmentFile[],
    practicalExamples: [] as SectionExample[]
  });

  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    ACADEMIC_SUBJECTS.forEach(s => map.set(s.id.toLowerCase(), language === 'ar' ? s.nameAr : s.nameEn));
    courses.forEach(c => {
      const key = (c.subject || c.titleEn || c.titleAr).toLowerCase();
      if (!map.has(key)) {
        map.set(key, language === 'ar' ? c.titleAr : c.titleEn);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
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
    setFormError(null);
    setUploadingFields({});
    setForm({
      academicYear: yearFilter !== 'all' ? yearFilter : 'year1',
      semester: semesterFilter !== 'all' ? semesterFilter : 'term1',
      courseId: '',
      subject: subjectFilter !== 'all' ? subjectFilter : 'Python Programming',
      sectionNumber: sections.length + 1,
      title: '',
      practicalTopic: '',
      labInstructions: '',
      youtubeUrl: '',
      pdfUrl: '',
      archiveUrl: '',
      sectionDate: new Date().toISOString().split('T')[0],
      status: 'published',
      codeFiles: [],
      images: [],
      practicalExamples: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sec: SectionItem) => {
    setEditingId(sec.id);
    setFormError(null);
    setUploadingFields({});
    const existingImages: AttachmentFile[] = (sec.imageUrls || []).map((url, idx) => ({
      id: `secimg_${idx}_${Date.now()}`,
      name: `Lab Image ${idx + 1}`,
      url,
      fileType: 'image'
    }));
    const currentStatus: 'published' | 'draft' | 'unpublished' =
      sec.status === 'unpublished' ? 'unpublished' : isContentPublished(sec) ? 'published' : 'draft';
    setForm({
      academicYear: sec.academicYear || 'year1',
      semester: sec.semester || 'term1',
      courseId: sec.courseId || '',
      subject: sec.subject || sec.courseTitle || 'Python Programming',
      sectionNumber: sec.sectionNumber ?? sec.number ?? 1,
      title: sec.title || '',
      practicalTopic: sec.practicalTopic || '',
      labInstructions: sec.labInstructions || sec.description || '',
      youtubeUrl: sec.youtubeUrl || sec.videoUrl || '',
      pdfUrl: sec.pdfUrl || sec.fileUrl || '',
      archiveUrl: sec.archiveUrl || '',
      sectionDate: sec.sectionDate || (sec.createdAt ? sec.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      status: currentStatus,
      codeFiles: sec.codeFiles || [],
      images: existingImages,
      practicalExamples: sec.practicalExamples || []
    });
    setIsModalOpen(true);
  };

  const handleAddExample = () => {
    setForm(prev => ({
      ...prev,
      practicalExamples: [
        ...prev.practicalExamples,
        {
          id: 'ex_' + Date.now(),
          title: '',
          language: 'python',
          codeSnippet: '',
          solutionText: ''
        }
      ]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isUploadingAny) {
      setFormError(t('يرجى الانتظار حتى يكتمل رفع جميع الملفات أولاً.', 'Please wait for active file uploads to finish.'));
      return;
    }
    if (!form.title.trim()) {
      setFormError(t('عنوان السكشن العملي مطلوب.', 'Section title is required.'));
      return;
    }
    if (!Number.isFinite(Number(form.sectionNumber)) || Number(form.sectionNumber) < 1) {
      setFormError(t('يجب أن يكون رقم السكشن 1 فأكثر.', 'Section number must be 1 or greater.'));
      return;
    }
    if (
      !isValidMediaOrWebUrl(form.youtubeUrl) ||
      !isValidMediaOrWebUrl(form.pdfUrl) ||
      !isValidMediaOrWebUrl(form.archiveUrl)
    ) {
      setFormError(t('يوجد رابط ملف أو أرشيف أو فيديو غير صالح.', 'One or more file or video URLs are invalid.'));
      return;
    }

    setSaving(true);
    try {
      const { courseId, courseTitle } = resolveCourseMeta(form.subject, form.courseId);
      const payload: Omit<SectionItem, 'id' | 'createdAt'> = {
        academicYear: form.academicYear,
        semester: form.semester,
        courseId,
        courseTitle,
        subject: form.subject,
        number: Number(form.sectionNumber) || 1,
        sectionNumber: Number(form.sectionNumber) || 1,
        title: form.title.trim(),
        practicalTopic: form.practicalTopic.trim(),
        labInstructions: form.labInstructions.trim(),
        description: form.labInstructions.trim() || form.practicalTopic.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
        videoUrl: form.youtubeUrl.trim(),
        fileUrl: form.pdfUrl.trim() || form.archiveUrl.trim() || (form.codeFiles[0]?.url || ''),
        pdfUrl: form.pdfUrl.trim(),
        archiveUrl: form.archiveUrl.trim(),
        codeFiles: form.codeFiles,
        imageUrls: form.images.map(i => i.url),
        practicalExamples: form.practicalExamples.filter(ex => ex.title.trim() || ex.solutionText.trim() || ex.codeSnippet?.trim()),
        sectionDate: form.sectionDate,
        status: form.status,
        published: form.status === 'published',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await dbService.updateSection(editingId, payload);
        onLogAction('update', payload.title, `Updated section #${payload.sectionNumber} (${form.subject})`);
        emitAppToast(t('تم تحديث السكشن العملي وحفظه سحابياً.', 'Practical section updated successfully.'), 'success');
      } else {
        await dbService.addSection(payload);
        onLogAction('create', payload.title, `Created section #${payload.sectionNumber} (${form.subject})`);
        if (payload.status === 'published') {
          await dbService.addNotification({
            userId: 'global',
            type: 'lecture_added',
            courseId,
            courseTitle,
            titleAr: `سكشن عملي جديد: ${payload.title}`,
            titleEn: `New Practical Section: ${payload.title}`,
            bodyAr: `تم نشر السكشن العملي رقم ${payload.sectionNumber} لمادة ${courseTitle}.`,
            bodyEn: `Practical section #${payload.sectionNumber} for ${courseTitle} is now live.`,
            isRead: false,
            createdAt: new Date().toISOString()
          }).catch(() => {});
        }
        emitAppToast(t('تمت إضافة السكشن العملي وحفظه بنجاح.', 'Practical section saved successfully.'), 'success');
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err?.message || t('تعذر حفظ السكشن في قاعدة البيانات السحابية.', 'Failed to save section to cloud database.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (sec: SectionItem) => {
    setActionError(null);
    const currentlyPub = isContentPublished(sec);
    const nextStatus = currentlyPub ? 'unpublished' : 'published';
    try {
      await dbService.updateSection(sec.id, {
        status: nextStatus,
        published: nextStatus === 'published',
        updatedAt: new Date().toISOString()
      });
      onLogAction('status_change', sec.title, `Set section status to ${nextStatus}`);
      emitAppToast(
        nextStatus === 'published'
          ? t('تم نشر السكشن العملي للطلاب.', 'Practical section published.')
          : t('تم إيقاف نشر السكشن وإخفاؤه عن الطلاب.', 'Practical section unpublished.'),
        'success'
      );
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || t('تعذر تحديث حالة النشر.', 'Failed to update status.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await dbService.deleteSection(deleteTarget.id);
      onLogAction('delete', deleteTarget.title, 'Deleted section');
      emitAppToast(t('تم حذف السكشن وملفاته غير المستخدمة بنجاح.', 'Section deleted successfully.'), 'success');
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || t('تعذر حذف السكشن من قاعدة البيانات السحابية.', 'Failed to delete section.'));
    } finally {
      setDeleting(false);
    }
  };

  const filteredSections = useMemo(() => {
    return sections
      .filter(sec => {
        if (!doesItemMatchYearAndSemester(sec, yearFilter, semesterFilter, courses)) return false;
        const statusKey = sec.status === 'unpublished' ? 'unpublished' : isContentPublished(sec) ? 'published' : 'draft';
        if (statusFilter !== 'all' && statusKey !== statusFilter) return false;
        if (!doesSubjectMatch(sec, subjectFilter, courses)) return false;
        const subj = (sec.subject || sec.courseTitle || '').toLowerCase();
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const hay = `${sec.title} ${sec.practicalTopic || ''} ${sec.labInstructions || sec.description || ''} ${subj}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.sectionDate || b.createdAt).getTime() - new Date(a.sectionDate || a.createdAt).getTime();
        }
        return (a.sectionNumber ?? a.number ?? 0) - (b.sectionNumber ?? b.number ?? 0);
      });
  }, [sections, yearFilter, semesterFilter, statusFilter, subjectFilter, searchQuery, sortBy, courses]);

  const stats = useMemo(() => {
    const publishedCount = sections.filter(s => isContentPublished(s)).length;
    const withCodeOrExamples = sections.filter(s => (s.codeFiles?.length || 0) > 0 || (s.practicalExamples?.length || 0) > 0 || Boolean(s.archiveUrl)).length;
    return { total: sections.length, publishedCount, drafts: sections.length - publishedCount, withCodeOrExamples };
  }, [sections]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-brand-cyan" />
            <span>{t('إدارة السكاشن والتطبيقات العملية (نظام مستقل)', 'Practical Sections & Labs Management')}</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t(
              'نشر السكاشن العملية مع ملفات الأكواد (.py/.cpp/.js/.sql) والملفات المضغوطة والأمثلة المحلولة وملفات المعامل.',
              'Manage lab sections with code files, archives (ZIP/RAR), worked examples & solutions, PDFs, images, and videos.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 min-h-[44px] text-xs font-bold transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{t('إضافة سكشن عملي', 'Add Lab Section')}</span>
        </button>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </span>
          <button type="button" onClick={() => setActionError(null)} className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t('إجمالي السكاشن', 'Total Sections'), value: stats.total },
          { label: t('منشورة للطلاب', 'Published'), value: stats.publishedCount },
          { label: t('مسودات / مخفية', 'Drafts / Hidden'), value: stats.drafts },
          { label: t('تتضمن أكواد أو أمثلة محلولة', 'With Code / Examples'), value: stats.withCodeOrExamples }
        ].map((kpi, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{kpi.label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Independent Filters */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('بحث بعنوان السكشن أو الموضوع العملي...', 'Search section title or lab topic...')}
              className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-10 pl-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
            />
          </div>

          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">{t('كل الفرق الدراسية', 'All Academic Years')}</option>
            {ACADEMIC_GRADES.map(g => (
              <option key={g.id} value={g.id}>{t(g.nameAr, g.nameEn)}</option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={e => setSemesterFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">{t('كل الفصول الدراسية', 'All Semesters')}</option>
            {ACADEMIC_SEMESTERS.filter(s => s.id !== 'all').map(s => (
              <option key={s.id} value={s.id}>{t(s.nameAr, s.nameEn)}</option>
            ))}
          </select>

          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">{t('كل المواد الدراسية', 'All Subjects')}</option>
            {subjectOptions.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['all', 'published', 'draft', 'unpublished'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                  statusFilter === st ? 'bg-brand-cyan text-white dark:text-slate-950' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {st === 'all'
                  ? t('الكل', 'All')
                  : st === 'published'
                  ? t('المنشورة', 'Published')
                  : st === 'draft'
                  ? t('المسودات', 'Drafts')
                  : t('متوقفة', 'Unpublished')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSortBy(prev => (prev === 'number' ? 'date' : 'number'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-brand-cyan" />
            <span>{sortBy === 'number' ? t('الترتيب: رقم السكشن', 'Sort: Section #') : t('الترتيب: الأحدث تاريخاً', 'Sort: Latest Date')}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
        <table className="w-full text-right ltr:text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">#</th>
              <th className="p-3.5">{t('عنوان السكشن والموضوع', 'Section & Topic')}</th>
              <th className="p-3.5">{t('الفرقة / الترم', 'Year / Semester')}</th>
              <th className="p-3.5">{t('الأكواد والمرفقات', 'Code & Lab Assets')}</th>
              <th className="p-3.5">{t('الحالة', 'Status')}</th>
              <th className="p-3.5 text-center">{t('الإجراءات', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
            {filteredSections.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-500 dark:text-slate-400">
                  {t('لا توجد سكاشن عملية مطابقة.', 'No matching practical sections.')}
                </td>
              </tr>
            ) : (
              filteredSections.map(sec => {
                const pub = isContentPublished(sec);
                const isUnpub = sec.status === 'unpublished';
                const num = sec.sectionNumber ?? sec.number ?? 1;
                return (
                  <tr key={sec.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">#{num}</td>
                    <td className="p-3.5 max-w-xs">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{sec.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {sec.subject || sec.courseTitle} {sec.practicalTopic ? `· ${sec.practicalTopic}` : ''}
                      </p>
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div>{getGradeName(sec.academicYear || 'general', language)}</div>
                      <div className="text-slate-500">{getSemesterName(sec.semester || 'all', language)}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        {(sec.pdfUrl || sec.fileUrl) && (
                          <span className="text-brand-cyan inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> PDF</span>
                        )}
                        {(sec.codeFiles?.length || 0) > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 tabular-nums">
                            <Code2 className="h-3.5 w-3.5" /> {sec.codeFiles?.length}
                          </span>
                        )}
                        {sec.archiveUrl && (
                          <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1"><Archive className="h-3.5 w-3.5" /> ZIP</span>
                        )}
                        {(sec.practicalExamples?.length || 0) > 0 && (
                          <span className="text-purple-600 dark:text-purple-400 inline-flex items-center gap-1 tabular-nums">
                            {t(`${sec.practicalExamples?.length} مثال`, `${sec.practicalExamples?.length} ex`)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(sec)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                          pub
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isUnpub
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {pub ? <Globe className="h-3.5 w-3.5" /> : isUnpub ? <EyeOff className="h-3.5 w-3.5" /> : <FileEdit className="h-3.5 w-3.5" />}
                        <span>{pub ? t('منشور', 'Published') : isUnpub ? t('متوقف', 'Unpublished') : t('مسودة', 'Draft')}</span>
                      </button>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button type="button" onClick={() => setPreviewItem(sec)} className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title={t('معاينة كطالب', 'Preview as Student')}>
                          <Eye className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => openEditModal(sec)} className="p-2 rounded-lg text-brand-cyan hover:bg-brand-cyan/10 cursor-pointer" title={t('تعديل', 'Edit')}>
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(sec)} className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer" title={t('حذف', 'Delete')}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Section Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-brand-cyan" />
                <span>{editingId ? t('تعديل السكشن العملي', 'Edit Practical Section') : t('إضافة سكشن عملي جديد', 'Add Practical Section')}</span>
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('الفرقة الدراسية', 'Academic Year')}</label>
                  <select value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white">
                    {ACADEMIC_GRADES.map(g => <option key={g.id} value={g.id}>{t(g.nameAr, g.nameEn)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('الفصل الدراسي', 'Semester')}</label>
                  <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white">
                    {ACADEMIC_SEMESTERS.map(s => <option key={s.id} value={s.id}>{t(s.nameAr, s.nameEn)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('المادة', 'Subject')}</label>
                  <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white">
                    {subjectOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('رقم السكشن', 'Section #')}</label>
                  <input type="number" min={1} required value={form.sectionNumber} onChange={e => setForm({ ...form, sectionNumber: Number(e.target.value) })} className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 font-mono text-slate-900 dark:text-white" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('عنوان السكشن', 'Section Title')}</label>
                  <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('مثال: السكشن العملي الأول - الدوال والحلقات', 'e.g. Lab 1: Loops & Functions')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('تاريخ السكشن', 'Date')}</label>
                  <input type="date" value={form.sectionDate} onChange={e => setForm({ ...form, sectionDate: e.target.value })} className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 font-mono text-slate-900 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('الموضوع العملي (Lab Topic)', 'Practical Topic')}</label>
                <input type="text" value={form.practicalTopic} onChange={e => setForm({ ...form, practicalTopic: e.target.value })} placeholder={t('مثال: تنفيذ خوارزمية البحث الثنائي في بايثون', 'e.g. Implementing Binary Search in Python')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white" />
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('خطوات التطبيق وتعليمات المعمل', 'Lab Instructions & Steps')}</label>
                <textarea rows={3} value={form.labInstructions} onChange={e => setForm({ ...form, labInstructions: e.target.value })} placeholder={t('اكتب التعليمات التطبيقية خطوة بخطوة...', 'Write step-by-step lab instructions...')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white" />
              </div>

              <VideoHostingUploader
                label={t('فيديو الشرح العملي للسكشن (اختياري)', 'Lab Video Walkthrough (Optional)')}
                value={form.youtubeUrl}
                onChange={url => setForm({ ...form, youtubeUrl: url })}
                courseId={resolveCourseMeta(form.subject, form.courseId).courseId}
                onPreviewUrl={onPreviewMedia ? (url => onPreviewMedia(url, form.title || t('فيديو السكشن العملي', 'Lab Video'), 'video')) : undefined}
                onUploadingChange={busy => setFieldUploading('video', busy)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FileUploadField
                  label={t('ملف تعليمات المعمل (PDF / Word)', 'Lab Sheet / Guide (PDF / Word)')}
                  value={form.pdfUrl}
                  onChange={url => setForm({ ...form, pdfUrl: url })}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  fileType="pdf"
                  folder="sections_docs"
                  onPreview={onPreviewMedia ? ((url, meta) => onPreviewMedia(url, form.title || meta?.title || t('دليل المعمل', 'Lab Guide'), meta?.fileType || 'pdf')) : undefined}
                  onUploadingChange={busy => setFieldUploading('pdf', busy)}
                />
                <FileUploadField
                  label={t('ملف المشروع المضغوط (.zip / .rar)', 'Compressed Project Archive (.zip / .rar)')}
                  value={form.archiveUrl}
                  onChange={url => setForm({ ...form, archiveUrl: url })}
                  accept=".zip,.rar,.7z,application/zip"
                  fileType="zip"
                  folder="sections_archives"
                  placeholder="https://.../lab-files.zip"
                  onPreview={onPreviewMedia ? ((url, meta) => onPreviewMedia(url, form.title || meta?.title || t('ملف المشروع المضغوط', 'Project Archive'), meta?.fileType || 'zip')) : undefined}
                  onUploadingChange={busy => setFieldUploading('archive', busy)}
                />
              </div>

              <MultiFileUploadList
                label={t('ملفات الأكواد البرمجية (.py, .js, .c, .cpp, .html, .css, .sql)', 'Code Files (.py, .js, .c, .cpp, .html, .css, .sql)')}
                files={form.codeFiles}
                onChange={files => setForm({ ...form, codeFiles: files })}
                accept=".py,.js,.ts,.c,.cpp,.h,.html,.css,.sql,.json,.txt,.ipynb"
                folder="sections_code"
                onPreview={onPreviewMedia ? ((url, meta) => onPreviewMedia(url, meta?.title || form.title, meta?.fileType || 'code', meta?.fileName)) : undefined}
                onUploadingChange={busy => setFieldUploading('codeFiles', busy)}
              />

              <MultiFileUploadList
                label={t('صور التطبيق العملي والمخرجات', 'Lab Screenshots & Output Images')}
                files={form.images}
                onChange={files => setForm({ ...form, images: files })}
                accept="image/*"
                folder="sections_images"
                onPreview={onPreviewMedia ? ((url, meta) => onPreviewMedia(url, meta?.title || form.title, meta?.fileType || 'image', meta?.fileName)) : undefined}
                onUploadingChange={busy => setFieldUploading('images', busy)}
              />

              {/* Practical Worked Examples & Solutions Builder */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{t('الأمثلة العملية والحلول النموذجية', 'Practical Examples & Solutions')}</p>
                    <p className="text-[11px] text-slate-500">{t('أضف أمثلة تطبيقية مع مقتطف الكود والحل وشرح الفكرة.', 'Add worked examples with code snippets and step-by-step solutions.')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddExample}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-cyan/15 text-brand-cyan font-bold cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t('إضافة مثال', 'Add Example')}</span>
                  </button>
                </div>

                {form.practicalExamples.map((ex, idx) => (
                  <div key={ex.id} className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-brand-cyan">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, practicalExamples: prev.practicalExamples.filter((_, i) => i !== idx) }))}
                        className="text-rose-600 dark:text-rose-400 text-[11px] font-bold cursor-pointer"
                      >
                        {t('حذف المثال', 'Remove')}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={ex.title}
                        onChange={e => {
                          const next = [...form.practicalExamples];
                          next[idx] = { ...ex, title: e.target.value };
                          setForm({ ...form, practicalExamples: next });
                        }}
                        placeholder={t('عنوان المثال العملي', 'Example title')}
                        className="sm:col-span-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white"
                      />
                      <select
                        value={ex.language || 'python'}
                        onChange={e => {
                          const next = [...form.practicalExamples];
                          next[idx] = { ...ex, language: e.target.value };
                          setForm({ ...form, practicalExamples: next });
                        }}
                        className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 font-mono text-slate-900 dark:text-white"
                      >
                        <option value="python">Python</option>
                        <option value="cpp">C / C++</option>
                        <option value="javascript">JavaScript</option>
                        <option value="sql">SQL</option>
                        <option value="html">HTML / CSS</option>
                        <option value="text">Text / Steps</option>
                      </select>
                    </div>
                    <textarea
                      rows={3}
                      value={ex.codeSnippet || ''}
                      onChange={e => {
                        const next = [...form.practicalExamples];
                        next[idx] = { ...ex, codeSnippet: e.target.value };
                        setForm({ ...form, practicalExamples: next });
                      }}
                      placeholder={t('الكود التطبيقي (اختياري)...', 'Code snippet (optional)...')}
                      className="w-full rounded-lg bg-slate-900 text-slate-100 border border-slate-700 p-2.5 font-mono text-[11px] dir-ltr text-left"
                    />
                    <textarea
                      rows={2}
                      value={ex.solutionText}
                      onChange={e => {
                        const next = [...form.practicalExamples];
                        next[idx] = { ...ex, solutionText: e.target.value };
                        setForm({ ...form, practicalExamples: next });
                      }}
                      placeholder={t('شرح الحل والمخرج المتوقع...', 'Explanation & expected output...')}
                      className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{t('حالة النشر:', 'Publish Status:')}</span>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as 'published' | 'draft' | 'unpublished' })}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="published">{t('منشور للطلاب (Published)', 'Published')}</option>
                    <option value="draft">{t('مسودة مخفية (Draft)', 'Draft')}</option>
                    <option value="unpublished">{t('تم إيقاف النشر (Unpublished)', 'Unpublished (Hidden)')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer">
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button type="submit" disabled={saving || isUploadingAny} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 font-bold cursor-pointer disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {isUploadingAny
                        ? t('جاري رفع الملفات...', 'Uploading files...')
                        : saving
                        ? t('جاري الحفظ...', 'Saving...')
                        : t('حفظ السكشن العملي', 'Save Section')}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {t('تأكيد حذف السكشن العملي', 'Confirm Section Deletion')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t(
                `هل أنت متأكد من حذف السكشن "${deleteTarget.title}"؟ سيتم حذفه نهائياً من قاعدة البيانات السحابية.`,
                `Are you sure you want to delete section "${deleteTarget.title}"? This action cannot be undone.`
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {deleting ? t('جاري الحذف...', 'Deleting...') : t('تأكيد الحذف', 'Confirm Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[11px] font-bold text-brand-cyan">{t('معاينة السكشن كما يظهر للطالب', 'Student Section Preview')}</p>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{previewItem.title}</h3>
              </div>
              <button type="button" onClick={() => setPreviewItem(null)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            {previewItem.practicalTopic && (
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('الموضوع:', 'Topic:')} {previewItem.practicalTopic}</p>
            )}
            {(previewItem.labInstructions || previewItem.description) && (
              <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">{previewItem.labInstructions || previewItem.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {(previewItem.youtubeUrl || previewItem.videoUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    const vUrl = previewItem.youtubeUrl || previewItem.videoUrl!;
                    if (onPreviewMedia) onPreviewMedia(vUrl, previewItem.title, 'video');
                    else triggerFileDownload(vUrl, `${previewItem.title}.mp4`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                >
                  <Video className="h-3.5 w-3.5" /> {t('فيديو التطبيق', 'Watch Video')}
                </button>
              )}
              {(previewItem.pdfUrl || previewItem.fileUrl) && (
                <>
                  {onPreviewMedia && (
                    <button
                      type="button"
                      onClick={() => onPreviewMedia((previewItem.pdfUrl || previewItem.fileUrl)!, previewItem.title, 'pdf')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-brand-cyan" /> {t('معاينة دليل المعمل', 'Preview Guide')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerFileDownload((previewItem.pdfUrl || previewItem.fileUrl)!, `${previewItem.title}.pdf`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-cyan text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> {t('تحميل دليل المعمل', 'Download Guide')}
                  </button>
                </>
              )}
              {previewItem.archiveUrl && (
                <>
                  {onPreviewMedia && (
                    <button
                      type="button"
                      onClick={() => onPreviewMedia(previewItem.archiveUrl!, `${previewItem.title}.zip`, 'zip')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> {t('معاينة الأرشيف ZIP', 'Preview ZIP')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerFileDownload(previewItem.archiveUrl!, `${previewItem.title}.zip`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" /> ZIP
                  </button>
                </>
              )}
              {(previewItem.codeFiles || []).map(cf => (
                <div key={cf.id} className="inline-flex items-center rounded-xl bg-emerald-600 text-white overflow-hidden">
                  {onPreviewMedia && (
                    <button
                      type="button"
                      onClick={() => onPreviewMedia(cf.url, cf.name, mapAttachmentToPreviewType(cf.fileType) === 'other' ? 'code' : mapAttachmentToPreviewType(cf.fileType), cf.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 hover:bg-emerald-700 text-xs font-bold cursor-pointer"
                      title={t('معاينة الكود', 'Preview Code')}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{cf.name}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => triggerFileDownload(cf.url, cf.name)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 hover:bg-emerald-700 text-xs font-bold cursor-pointer border-r border-emerald-500/50"
                    title={t('تنزيل ملف الكود', 'Download code file')}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {!onPreviewMedia && <span>{cf.name}</span>}
                  </button>
                </div>
              ))}
            </div>
            {(previewItem.imageUrls?.length || 0) > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {previewItem.imageUrls?.map((img, i) => (
                  <ResolvedImage
                    key={i}
                    src={img}
                    alt={`Lab output ${i + 1}`}
                    className="w-full h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-800"
                  />
                ))}
              </div>
            )}
            {(previewItem.practicalExamples || []).map((ex, i) => (
              <div key={ex.id || i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{i + 1}. {ex.title}</p>
                {ex.codeSnippet && (
                  <pre className="rounded-lg bg-slate-900 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto dir-ltr text-left">{ex.codeSnippet}</pre>
                )}
                {ex.solutionText && <p className="text-xs text-slate-600 dark:text-slate-300">{ex.solutionText}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
