import React, { useEffect, useMemo, useState } from 'react';
import { Course, SectionItem, UserAuth } from '../../types';
import { useLanguage } from '../LanguageContext';
import { ResolvedImage } from '../ResolvedMedia';
import { triggerFileDownload } from '../../utils/videoStorage';
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
  Layers, Search, Play, FileText, Code2, Archive, Image as ImageIcon,
  Download, CheckCircle2, Eye, ArrowUpDown, X, ChevronDown, ChevronUp
} from 'lucide-react';

interface StudentSectionsViewProps {
  sections: SectionItem[];
  courses: Course[];
  currentUser: UserAuth | null;
  initialSubject?: string;
  onToggleWatched: (itemId: string) => void;
  onOpenVideo: (url: string, title: string) => void;
  onOpenPdf: (url: string, title: string) => void;
}

export const StudentSectionsView: React.FC<StudentSectionsViewProps> = ({
  sections,
  courses,
  currentUser,
  initialSubject,
  onToggleWatched,
  onOpenVideo,
  onOpenPdf
}) => {
  const { language, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>(() => normalizeGradeCode(currentUser?.grade) || 'all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>(initialSubject || 'all');
  const [sortBy, setSortBy] = useState<'number' | 'date'>('number');
  const [expandedExamplesId, setExpandedExamplesId] = useState<string | null>(null);
  const [gallerySection, setGallerySection] = useState<SectionItem | null>(null);

  useEffect(() => {
    if (initialSubject && initialSubject !== 'all') {
      setSubjectFilter(initialSubject);
      setYearFilter('all');
    }
  }, [initialSubject]);

  const watchedIds = currentUser?.watchedLessonIds || [];

  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    ACADEMIC_SUBJECTS.forEach(s => map.set(s.id.toLowerCase(), language === 'ar' ? s.nameAr : s.nameEn));
    courses.forEach(c => {
      const id = c.subject || c.titleEn || c.titleAr;
      if (id && !map.has(id.toLowerCase())) {
        map.set(id.toLowerCase(), language === 'ar' ? c.titleAr : c.titleEn);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [courses, language]);

  const publishedSections = useMemo(() => sections.filter(s => isContentPublished(s)), [sections]);

  const filteredSections = useMemo(() => {
    return publishedSections
      .filter(sec => {
        if (!doesItemMatchYearAndSemester(sec, yearFilter, semesterFilter, courses)) return false;
        if (!doesSubjectMatch(sec, subjectFilter, courses)) return false;
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const hay = `${sec.title} ${sec.practicalTopic || ''} ${sec.labInstructions || sec.description || ''} ${sec.subject || ''} ${sec.courseTitle || ''}`.toLowerCase();
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
  }, [publishedSections, yearFilter, semesterFilter, subjectFilter, searchQuery, sortBy, courses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-cyan" />
            <span>{t('السكاشن والتطبيقات العملية (IT Labs)', 'Practical Sections & Labs (IT Dept)')}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t(
              'تعليمات المعامل، ملفات الأكواد البرمجية والأرشيف المضغوط، والأمثلة العملية المحلولة خطوة بخطوة.',
              'Lab walkthroughs, code files, project archives, and worked practical examples with solutions.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSortBy(prev => (prev === 'number' ? 'date' : 'number'))}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-brand-cyan" />
          <span>{sortBy === 'number' ? t('ترتيب برقم السكشن', 'By Section #') : t('ترتيب بالأحدث', 'By Date')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('ابحث في السكاشن العملية...', 'Search practical sections...')}
            className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-10 pl-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
          />
        </div>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white">
          <option value="all">{t('كل الفرق', 'All Years')}</option>
          {ACADEMIC_GRADES.filter(g => g.id !== 'general').map(g => <option key={g.id} value={g.id}>{t(g.nameAr, g.nameEn)}</option>)}
        </select>
        <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white">
          <option value="all">{t('كل الفصول', 'All Semesters')}</option>
          {ACADEMIC_SEMESTERS.filter(s => s.id !== 'all').map(s => <option key={s.id} value={s.id}>{t(s.nameAr, s.nameEn)}</option>)}
        </select>
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white">
          <option value="all">{t('جميع المواد', 'All Subjects')}</option>
          {subjectOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Sections List */}
      {filteredSections.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-10 text-center space-y-3">
          <Layers className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">{t('لا توجد سكاشن عملية مطابقة حالياً', 'No matching practical sections found')}</p>
          {(yearFilter !== 'all' || semesterFilter !== 'all' || subjectFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setYearFilter('all');
                setSemesterFilter('all');
                setSubjectFilter('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-extrabold cursor-pointer shadow-sm"
            >
              {t('عرض كل السكاشن بدون فلاتر', 'Show All Sections Without Filters')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSections.map(sec => {
            const num = sec.sectionNumber ?? sec.number ?? 1;
            const videoSrc = sec.youtubeUrl || sec.videoUrl;
            const docUrl = sec.pdfUrl || sec.fileUrl;
            const isPdf = docUrl ? (/\.pdf(\?.*)?$/i.test(docUrl) || docUrl.startsWith('firestore://')) : false;
            const isCompleted = watchedIds.includes(sec.id);
            const hasExamples = (sec.practicalExamples?.length || 0) > 0;
            const isExpanded = expandedExamplesId === sec.id;

            return (
              <div key={sec.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-bold text-brand-cyan tabular-nums">#{num}</span>
                      <span>·</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{sec.subject || sec.courseTitle}</span>
                      <span>·</span>
                      <span>{getGradeName(sec.academicYear || 'general', language)}</span>
                      {sec.semester && sec.semester !== 'all' && (
                        <>
                          <span>·</span>
                          <span>{getSemesterName(sec.semester, language)}</span>
                        </>
                      )}
                    </div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">{sec.title}</h4>
                    {sec.practicalTopic && (
                      <p className="text-xs font-bold text-brand-cyan dark:text-brand-cyan-light">{sec.practicalTopic}</p>
                    )}
                    {(sec.labInstructions || sec.description) && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                        {sec.labInstructions || sec.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleWatched(sec.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isCompleted ? t('تم التطبيق', 'Completed') : t('تحديد كمكتمل', 'Mark Done')}</span>
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  {videoSrc && (
                    <button type="button" onClick={() => onOpenVideo(videoSrc, sec.title)} className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-brand-cyan text-white dark:text-slate-950 text-xs font-bold cursor-pointer">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{t('فيديو التطبيق', 'Lab Video')}</span>
                    </button>
                  )}

                  {docUrl && (
                    <>
                      <button type="button" onClick={() => onOpenPdf(docUrl, sec.title)} className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer">
                        <Eye className="h-3.5 w-3.5 text-brand-cyan" />
                        <span>{isPdf ? t('معاينة PDF', 'Preview PDF') : t('معاينة الملف', 'Preview File')}</span>
                      </button>
                      <button type="button" onClick={() => triggerFileDownload(docUrl, isPdf ? `${sec.title}.pdf` : sec.title)} className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer">
                        <Download className="h-3.5 w-3.5" />
                        <span>{t('تحميل دليل المعمل', 'Download Lab Sheet')}</span>
                      </button>
                    </>
                  )}

                  {sec.archiveUrl && (
                    <button type="button" onClick={() => triggerFileDownload(sec.archiveUrl!, `${sec.title}.zip`)} className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer">
                      <Archive className="h-3.5 w-3.5" />
                      <span>{t('تحميل أرشيف المشروع (ZIP)', 'Download Project Archive')}</span>
                    </button>
                  )}

                  {(sec.codeFiles || []).map(cf => (
                    <div key={cf.id} className="inline-flex items-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 overflow-hidden">
                      <button type="button" onClick={() => onOpenPdf(cf.url, cf.name)} className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-bold cursor-pointer hover:bg-emerald-500/15">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{cf.name}</span>
                      </button>
                      <button type="button" onClick={() => triggerFileDownload(cf.url, cf.name)} className="inline-flex items-center px-2.5 py-2 min-h-[40px] border-s border-emerald-500/30 text-xs font-bold cursor-pointer hover:bg-emerald-500/15" title={t('تحميل', 'Download')}>
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {(sec.imageUrls?.length || 0) > 0 && (
                    <button type="button" onClick={() => setGallerySection(sec)} className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold cursor-pointer tabular-nums">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>{t(`صور المخرجات (${sec.imageUrls?.length})`, `Screenshots (${sec.imageUrls?.length})`)}</span>
                    </button>
                  )}

                  {hasExamples && (
                    <button
                      type="button"
                      onClick={() => setExpandedExamplesId(isExpanded ? null : sec.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-bold cursor-pointer tabular-nums"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{t(`الأمثلة والحلول (${sec.practicalExamples?.length})`, `Worked Examples (${sec.practicalExamples?.length})`)}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>

                {/* Expanded Practical Examples */}
                {isExpanded && sec.practicalExamples && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {sec.practicalExamples.map((ex, i) => (
                      <div key={ex.id || i} className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="font-bold text-slate-900 dark:text-white text-xs">{i + 1}. {ex.title}</h5>
                          {ex.language && <span className="font-mono text-[10px] uppercase text-slate-500">{ex.language}</span>}
                        </div>
                        {ex.codeSnippet && (
                          <pre className="rounded-xl bg-slate-900 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto dir-ltr text-left">{ex.codeSnippet}</pre>
                        )}
                        {ex.solutionText && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{ex.solutionText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {gallerySection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">{gallerySection.title}</h3>
              <button type="button" onClick={() => setGallerySection(null)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gallerySection.imageUrls?.map((img, i) => (
                <div key={i} className="space-y-2">
                  <ResolvedImage
                    src={img}
                    alt={`Lab output ${i + 1}`}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 object-contain max-h-80 bg-slate-100 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => triggerFileDownload(img, `${gallerySection.title}_output_${i + 1}.png`)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-cyan hover:underline cursor-pointer"
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
    </div>
  );
};
