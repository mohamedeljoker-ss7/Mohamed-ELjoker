import React, { useMemo, useState } from 'react';
import { Course, LectureItem, AttachmentFile } from '../../types';
import { dbService } from '../../firebase';
import { useLanguage } from '../LanguageContext';
import { FileUploadField } from '../FileUploadField';
import { VideoHostingUploader } from '../VideoHostingUploader';
import { MultiFileUploadList } from './MultiFileUploadList';
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
  BookOpen, Plus, Search, Video, FileText, FileSpreadsheet, Image as ImageIcon,
  Edit3, Trash2, Eye, CheckCircle2, X, Globe, FileEdit, ArrowUpDown, Download
} from 'lucide-react';

interface AdminLecturesManagerProps {
  lectures: LectureItem[];
  courses: Course[];
  onRefresh: () => void;
  onLogAction: (
    action: 'create' | 'update' | 'delete' | 'status_change',
    targetTitle: string,
    details?: string
  ) => void;
  onPreviewMedia?: (url: string) => void;
}

export const AdminLecturesManager: React.FC<AdminLecturesManagerProps> = ({
  lectures,
  courses,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'number' | 'date'>('number');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewItem, setPreviewItem] = useState<LectureItem | null>(null);

  const [form, setForm] = useState({
    academicYear: 'year1',
    semester: 'term1',
    courseId: '',
    subject: 'Physics',
    lectureNumber: 1,
    title: '',
    description: '',
    youtubeUrl: '',
    pdfUrl: '',
    pptxUrl: '',
    lectureDate: new Date().toISOString().split('T')[0],
    status: 'published' as 'published' | 'draft',
    images: [] as AttachmentFile[],
    attachments: [] as AttachmentFile[]
  });

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
      lectureNumber: lectures.length + 1,
      title: '',
      description: '',
      youtubeUrl: '',
      pdfUrl: '',
      pptxUrl: '',
      lectureDate: new Date().toISOString().split('T')[0],
      status: 'published',
      images: [],
      attachments: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (lec: LectureItem) => {
    setEditingId(lec.id);
    const existingImages: AttachmentFile[] = (lec.imageUrls || []).map((url, idx) => ({
      id: `img_${idx}_${Date.now()}`,
      name: `Slide Image ${idx + 1}`,
      url,
      fileType: 'image'
    }));
    setForm({
      academicYear: lec.academicYear || 'year1',
      semester: lec.semester || 'term1',
      courseId: lec.courseId || '',
      subject: lec.subject || lec.courseTitle || 'Physics',
      lectureNumber: lec.lectureNumber ?? lec.number ?? 1,
      title: lec.title || '',
      description: lec.description || '',
      youtubeUrl: lec.youtubeUrl || lec.videoUrl || '',
      pdfUrl: lec.pdfUrl || '',
      pptxUrl: lec.pptxUrl || '',
      lectureDate: lec.lectureDate || (lec.createdAt ? lec.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      status: isContentPublished(lec) ? 'published' : 'draft',
      images: existingImages,
      attachments: lec.attachments || []
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { courseId, courseTitle } = resolveCourseMeta(form.subject, form.courseId);
      const payload: Omit<LectureItem, 'id' | 'createdAt'> = {
        academicYear: form.academicYear,
        semester: form.semester,
        courseId,
        courseTitle,
        subject: form.subject,
        number: Number(form.lectureNumber) || 1,
        lectureNumber: Number(form.lectureNumber) || 1,
        title: form.title.trim(),
        description: form.description.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
        videoUrl: form.youtubeUrl.trim(),
        pdfUrl: form.pdfUrl.trim(),
        pptxUrl: form.pptxUrl.trim(),
        imageUrls: form.images.map(i => i.url),
        attachments: form.attachments,
        lectureDate: form.lectureDate,
        status: form.status,
        published: form.status === 'published',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await dbService.updateLecture(editingId, payload);
        onLogAction('update', payload.title, `Updated lecture #${payload.lectureNumber} (${form.subject})`);
      } else {
        await dbService.addLecture(payload);
        onLogAction('create', payload.title, `Created lecture #${payload.lectureNumber} (${form.subject})`);
        if (payload.status === 'published') {
          await dbService.addNotification({
            userId: 'global',
            type: 'lecture_added',
            courseId,
            courseTitle,
            titleAr: `محاضرة جديدة: ${payload.title}`,
            titleEn: `New Lecture: ${payload.title}`,
            bodyAr: `تم نشر المحاضرة رقم ${payload.lectureNumber} لمادة ${courseTitle}.`,
            bodyEn: `Lecture #${payload.lectureNumber} for ${courseTitle} has been published.`,
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

  const handleToggleStatus = async (lec: LectureItem) => {
    const nextStatus = isContentPublished(lec) ? 'draft' : 'published';
    await dbService.updateLecture(lec.id, {
      status: nextStatus,
      published: nextStatus === 'published',
      updatedAt: new Date().toISOString()
    });
    onLogAction('status_change', lec.title, `Set lecture status to ${nextStatus}`);
    onRefresh();
  };

  const handleDelete = async (lec: LectureItem) => {
    if (!confirm(t(`هل تريد حذف المحاضرة "${lec.title}"؟`, `Delete lecture "${lec.title}"?`))) return;
    await dbService.deleteLecture(lec.id);
    onLogAction('delete', lec.title, 'Deleted lecture');
    onRefresh();
  };

  const filteredLectures = useMemo(() => {
    return lectures
      .filter(lec => {
        if (!doesItemMatchYearAndSemester(lec, yearFilter, semesterFilter, courses)) return false;
        const pub = isContentPublished(lec);
        if (statusFilter === 'published' && !pub) return false;
        if (statusFilter === 'draft' && pub) return false;
        const subj = (lec.subject || lec.courseTitle || '').toLowerCase();
        if (subjectFilter !== 'all' && !subj.includes(subjectFilter.toLowerCase())) return false;
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const hay = `${lec.title} ${lec.description || ''} ${subj}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.lectureDate || b.createdAt).getTime() - new Date(a.lectureDate || a.createdAt).getTime();
        }
        return (a.lectureNumber ?? a.number ?? 0) - (b.lectureNumber ?? b.number ?? 0);
      });
  }, [lectures, yearFilter, semesterFilter, statusFilter, subjectFilter, searchQuery, sortBy, courses]);

  const stats = useMemo(() => {
    const publishedCount = lectures.filter(l => isContentPublished(l)).length;
    const draftCount = lectures.length - publishedCount;
    const withMedia = lectures.filter(l => Boolean(l.youtubeUrl || l.videoUrl || l.pdfUrl || l.pptxUrl)).length;
    return { total: lectures.length, publishedCount, draftCount, withMedia };
  }, [lectures]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-brand-cyan" />
            <span>{t('إدارة المحاضرات الجامعية (نظام مستقل)', 'University Lectures Management')}</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t(
              'نشر وتنظيم المحاضرات حسب الفرقة والفصل الدراسي والمادة مع دعم PDF و PowerPoint والصور والفيديو ومعاينة الطالب.',
              'Publish and organize lectures by Academic Year, Semester, and Subject with PDF, PowerPoint, Images, Video & Student Preview.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 min-h-[44px] text-xs font-bold transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{t('إضافة محاضرة جديدة', 'Add Lecture')}</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t('إجمالي المحاضرات', 'Total Lectures'), value: stats.total },
          { label: t('منشورة للطلاب', 'Published'), value: stats.publishedCount },
          { label: t('مسودات غير منشورة', 'Drafts'), value: stats.draftCount },
          { label: t('مرتبطة بملفات/فيديو', 'With Media & Files'), value: stats.withMedia }
        ].map((kpi, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{kpi.label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Independent Filters Toolbar */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('بحث بعنوان المحاضرة أو الوصف أو المادة...', 'Search lecture title, description or subject...')}
              className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-10 pl-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
            />
          </div>

          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
          >
            <option value="all">{t('كل الفرق الدراسية', 'All Academic Years')}</option>
            {ACADEMIC_GRADES.map(g => (
              <option key={g.id} value={g.id}>{t(g.nameAr, g.nameEn)}</option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={e => setSemesterFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
          >
            <option value="all">{t('كل الفصول الدراسية', 'All Semesters')}</option>
            {ACADEMIC_SEMESTERS.filter(s => s.id !== 'all').map(s => (
              <option key={s.id} value={s.id}>{t(s.nameAr, s.nameEn)}</option>
            ))}
          </select>

          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
          >
            <option value="all">{t('كل المواد الدراسية', 'All Subjects')}</option>
            {subjectOptions.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['all', 'published', 'draft'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-brand-cyan text-white dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'all' ? t('الكل', 'All') : st === 'published' ? t('المنشورة', 'Published') : t('المسودات', 'Drafts')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSortBy(prev => (prev === 'number' ? 'date' : 'number'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-brand-cyan" />
            <span>{sortBy === 'number' ? t('الترتيب: رقم المحاضرة', 'Sort: Lecture #') : t('الترتيب: الأحدث تاريخاً', 'Sort: Latest Date')}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
        <table className="w-full text-right ltr:text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">#</th>
              <th className="p-3.5">{t('العنوان والمادة', 'Title & Subject')}</th>
              <th className="p-3.5">{t('الفرقة / الترم', 'Year / Semester')}</th>
              <th className="p-3.5">{t('المرفقات والوسائط', 'Media & Files')}</th>
              <th className="p-3.5">{t('الحالة', 'Status')}</th>
              <th className="p-3.5 text-center">{t('الإجراءات', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
            {filteredLectures.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-500 dark:text-slate-400">
                  {t('لا توجد محاضرات مطابقة للتصفية الحالية.', 'No lectures match current filters.')}
                </td>
              </tr>
            ) : (
              filteredLectures.map(lec => {
                const pub = isContentPublished(lec);
                const num = lec.lectureNumber ?? lec.number ?? 1;
                const subj = lec.subject || lec.courseTitle || 'IT';
                return (
                  <tr key={lec.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">#{num}</td>
                    <td className="p-3.5 max-w-xs">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{lec.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {subj} · {lec.lectureDate || lec.createdAt?.split('T')[0]}
                      </p>
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div>{getGradeName(lec.academicYear || 'general', language)}</div>
                      <div className="text-slate-500">{getSemesterName(lec.semester || 'all', language)}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        {(lec.youtubeUrl || lec.videoUrl) && (
                          <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                            <Video className="h-3.5 w-3.5" /> {t('فيديو', 'Video')}
                          </span>
                        )}
                        {lec.pdfUrl && (
                          <span className="text-brand-cyan inline-flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" /> PDF
                          </span>
                        )}
                        {lec.pptxUrl && (
                          <span className="text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
                            <FileSpreadsheet className="h-3.5 w-3.5" /> PPT
                          </span>
                        )}
                        {(lec.imageUrls?.length || 0) > 0 && (
                          <span className="text-sky-600 dark:text-sky-400 inline-flex items-center gap-1 tabular-nums">
                            <ImageIcon className="h-3.5 w-3.5" /> {lec.imageUrls?.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(lec)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer ${
                          pub ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {pub ? <Globe className="h-3.5 w-3.5" /> : <FileEdit className="h-3.5 w-3.5" />}
                        <span>{pub ? t('منشورة', 'Published') : t('مسودة', 'Draft')}</span>
                      </button>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(lec)}
                          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title={t('معاينة كطالب', 'Preview as Student')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(lec)}
                          className="p-2 rounded-lg text-brand-cyan hover:bg-brand-cyan/10 cursor-pointer"
                          title={t('تعديل', 'Edit')}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(lec)}
                          className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title={t('حذف', 'Delete')}
                        >
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

      {/* Add/Edit Lecture Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-brand-cyan" />
                <span>{editingId ? t('تعديل المحاضرة الجامعية', 'Edit University Lecture') : t('إضافة محاضرة جامعية جديدة', 'Add University Lecture')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('الفرقة الدراسية', 'Academic Year')}</label>
                  <select
                    value={form.academicYear}
                    onChange={e => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white"
                  >
                    {ACADEMIC_GRADES.map(g => (
                      <option key={g.id} value={g.id}>{t(g.nameAr, g.nameEn)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('الفصل الدراسي', 'Semester')}</label>
                  <select
                    value={form.semester}
                    onChange={e => setForm({ ...form, semester: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white"
                  >
                    {ACADEMIC_SEMESTERS.map(s => (
                      <option key={s.id} value={s.id}>{t(s.nameAr, s.nameEn)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('المادة الدراسية', 'Subject')}</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white"
                  >
                    {subjectOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('رقم المحاضرة', 'Lecture #')}</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.lectureNumber}
                    onChange={e => setForm({ ...form, lectureNumber: Number(e.target.value) })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('عنوان المحاضرة', 'Lecture Title')}</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder={t('مثال: المحاضرة الأولى - أساسيات الشبكات', 'e.g. Lecture 1: Network Fundamentals')}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('تاريخ النشر', 'Publish Date')}</label>
                  <input
                    type="date"
                    value={form.lectureDate}
                    onChange={e => setForm({ ...form, lectureDate: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-slate-800 dark:text-slate-200">{t('ملخص ومحاور المحاضرة', 'Lecture Outline & Description')}</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder={t('اكتب النقاط الرئيسية والموضوعات التي تغطيها المحاضرة...', 'Summarize key topics covered in this lecture...')}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <VideoHostingUploader
                label={t('فيديو المحاضرة (رفع من الجهاز أو رابط YouTube)', 'Lecture Video (Upload or YouTube URL)')}
                value={form.youtubeUrl}
                onChange={url => setForm({ ...form, youtubeUrl: url })}
                courseId={resolveCourseMeta(form.subject, form.courseId).courseId}
                onPreviewUrl={onPreviewMedia}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FileUploadField
                  label={t('ملف المحاضرة PDF', 'Lecture PDF File')}
                  value={form.pdfUrl}
                  onChange={url => setForm({ ...form, pdfUrl: url })}
                  accept=".pdf,application/pdf"
                  folder="lectures_pdf"
                />
                <FileUploadField
                  label={t('ملف العرض التقديمي PowerPoint (.ppt / .pptx)', 'PowerPoint Slides (.ppt / .pptx)')}
                  value={form.pptxUrl}
                  onChange={url => setForm({ ...form, pptxUrl: url })}
                  accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  folder="lectures_pptx"
                  placeholder="https://.../slides.pptx"
                />
              </div>

              <MultiFileUploadList
                label={t('صور السبورة أو شرائح توضيحية (متعدد)', 'Lecture Images / Diagrams (Multiple)')}
                files={form.images}
                onChange={files => setForm({ ...form, images: files })}
                accept="image/*"
                folder="lectures_images"
              />

              <MultiFileUploadList
                label={t('مرفقات إضافية (مذكرات Word / ملفات مساعدة)', 'Additional Lecture Files (Word / Docs)')}
                files={form.attachments}
                onChange={files => setForm({ ...form, attachments: files })}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.rar"
                folder="lectures_attachments"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{t('حالة النشر:', 'Publish Status:')}</span>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as 'published' | 'draft' })}
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="published">{t('منشورة للطلاب (Published)', 'Published')}</option>
                    <option value="draft">{t('مسودة مخفية (Draft)', 'Draft (Hidden)')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 font-bold cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{saving ? t('جاري الحفظ...', 'Saving...') : t('حفظ المحاضرة', 'Save Lecture')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[11px] font-bold text-brand-cyan">{t('معاينة المحاضرة كما تظهر للطالب', 'Student View Preview')}</p>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{previewItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{previewItem.subject || previewItem.courseTitle}</span>
              <span>·</span>
              <span>{getGradeName(previewItem.academicYear || 'general', language)}</span>
              <span>·</span>
              <span>{getSemesterName(previewItem.semester || 'all', language)}</span>
              <span>·</span>
              <span className="font-mono">#{previewItem.lectureNumber ?? previewItem.number}</span>
            </div>
            {previewItem.description && (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{previewItem.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {previewItem.pdfUrl && (
                <a href={previewItem.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-cyan text-white dark:text-slate-950 text-xs font-bold">
                  <Download className="h-3.5 w-3.5" /> PDF
                </a>
              )}
              {previewItem.pptxUrl && (
                <a href={previewItem.pptxUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> PowerPoint
                </a>
              )}
              {(previewItem.youtubeUrl || previewItem.videoUrl) && (
                <a href={previewItem.youtubeUrl || previewItem.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold">
                  <Video className="h-3.5 w-3.5" /> {t('فيديو الشرح', 'Watch Video')}
                </a>
              )}
            </div>
            {(previewItem.imageUrls?.length || 0) > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                {previewItem.imageUrls?.map((img, i) => (
                  <img key={i} src={img} alt={`Slide ${i + 1}`} className="w-full h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-800" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
