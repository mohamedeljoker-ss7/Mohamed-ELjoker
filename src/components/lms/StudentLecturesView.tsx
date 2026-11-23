import React, { useEffect, useMemo, useState } from 'react';
import { Course, LectureItem, UserAuth } from '../../types';
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
  BookOpen, Search, Play, FileText, FileSpreadsheet, Image as ImageIcon,
  Download, CheckCircle2, Bookmark, Eye, ArrowUpDown, X
} from 'lucide-react';

interface StudentLecturesViewProps {
  lectures: LectureItem[];
  courses: Course[];
  currentUser: UserAuth | null;
  initialSubject?: string;
  onToggleWatched: (itemId: string) => void;
  onToggleFavorite: (itemId: string) => void;
  onOpenVideo: (url: string, title: string) => void;
  onOpenPdf: (url: string, title: string) => void;
}

export const StudentLecturesView: React.FC<StudentLecturesViewProps> = ({
  lectures,
  courses,
  currentUser,
  initialSubject,
  onToggleWatched,
  onToggleFavorite,
  onOpenVideo,
  onOpenPdf
}) => {
  const { language, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>(() => normalizeGradeCode(currentUser?.grade) || 'all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>(initialSubject || 'all');
  const [watchFilter, setWatchFilter] = useState<'all' | 'watched' | 'unwatched'>('all');
  const [sortBy, setSortBy] = useState<'number' | 'date'>('number');
  const [galleryLecture, setGalleryLecture] = useState<LectureItem | null>(null);

  useEffect(() => {
    if (initialSubject && initialSubject !== 'all') {
      setSubjectFilter(initialSubject);
      setYearFilter('all');
    }
  }, [initialSubject]);

  const watchedIds = currentUser?.watchedLessonIds || [];
  const favIds = currentUser?.favorites || currentUser?.bookmarkedLectureIds || [];

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

  const publishedLectures = useMemo(() => {
    return lectures.filter(l => isContentPublished(l));
  }, [lectures]);

  const filteredLectures = useMemo(() => {
    return publishedLectures
      .filter(lec => {
        if (!doesItemMatchYearAndSemester(lec, yearFilter, semesterFilter, courses)) return false;
        if (!doesSubjectMatch(lec, subjectFilter, courses)) return false;
        const isW = watchedIds.includes(lec.id);
        if (watchFilter === 'watched' && !isW) return false;
        if (watchFilter === 'unwatched' && isW) return false;
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const hay = `${lec.title} ${lec.description || ''} ${lec.subject || ''} ${lec.courseTitle || ''}`.toLowerCase();
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
  }, [publishedLectures, yearFilter, semesterFilter, subjectFilter, watchFilter, searchQuery, sortBy, watchedIds, courses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand-cyan" />
            <span>{t('المحاضرات الجامعية (قسم تكنولوجيا المعلومات IT)', 'University Lectures (IT Department)')}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t(
              'استعرض محاضرات المقررات، ملفات الـ PDF والعروض التقديمية PPT ورسوم السبورة وفيديوهات الشرح.',
              'Explore subject lectures, PDF notes, PowerPoint slides, board diagrams, and lecture videos.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          {(['all', 'watched', 'unwatched'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setWatchFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                watchFilter === st
                  ? 'bg-brand-cyan text-white dark:text-slate-950'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st === 'all' ? t('الكل', 'All') : st === 'watched' ? t('المكتملة', 'Completed') : t('قيد الدراسة', 'Remaining')}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('ابحث في المحاضرات...', 'Search lectures...')}
              className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-10 pl-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
            />
          </div>

          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">{t('كل الفرق', 'All Years')}</option>
            {ACADEMIC_GRADES.filter(g => g.id !== 'general').map(g => (
              <option key={g.id} value={g.id}>{t(g.nameAr, g.nameEn)}</option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={e => setSemesterFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">{t('كل الفصول', 'All Semesters')}</option>
            {ACADEMIC_SEMESTERS.filter(s => s.id !== 'all').map(s => (
              <option key={s.id} value={s.id}>{t(s.nameAr, s.nameEn)}</option>
            ))}
          </select>

          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white"
          >
            <option value="all">{t('جميع المواد', 'All Subjects')}</option>
            {subjectOptions.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="tabular-nums font-semibold">
            {t(`عرض ${filteredLectures.length} محاضرة`, `Showing ${filteredLectures.length} lectures`)}
          </span>
          <button
            type="button"
            onClick={() => setSortBy(prev => (prev === 'number' ? 'date' : 'number'))}
            className="inline-flex items-center gap-1.5 font-bold text-brand-cyan cursor-pointer"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{sortBy === 'number' ? t('ترتيب برقم المحاضرة', 'By Lecture #') : t('ترتيب بالأحدث', 'By Date')}</span>
          </button>
        </div>
      </div>

      {/* Lectures Grid */}
      {filteredLectures.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-10 text-center space-y-3">
          <BookOpen className="h-10 w-10 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">{t('لا توجد محاضرات منشورة في هذا التحديد', 'No published lectures match this filter')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('جرّب عرض جميع الفرق والفصول والمواد لإظهار كل المحاضرات المتاحة.', 'Try showing all academic years, semesters, and subjects.')}</p>
          {(yearFilter !== 'all' || semesterFilter !== 'all' || subjectFilter !== 'all' || watchFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setYearFilter('all');
                setSemesterFilter('all');
                setSubjectFilter('all');
                setWatchFilter('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-extrabold cursor-pointer shadow-sm"
            >
              {t('عرض كل المحاضرات بدون فلاتر', 'Show All Lectures Without Filters')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLectures.map(lec => {
            const isWatched = watchedIds.includes(lec.id);
            const isFav = favIds.includes(lec.id);
            const num = lec.lectureNumber ?? lec.number ?? 1;
            const videoSrc = lec.youtubeUrl || lec.videoUrl;
            return (
              <div
                key={lec.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-5 flex flex-col justify-between gap-4 hover:border-brand-cyan/40 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-brand-cyan tabular-nums">#{num}</span>
                      <span>·</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{lec.subject || lec.courseTitle}</span>
                      <span>·</span>
                      <span>{getGradeName(lec.academicYear || 'general', language)}</span>
                      {lec.semester && lec.semester !== 'all' && (
                        <>
                          <span>·</span>
                          <span>{getSemesterName(lec.semester, language)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(lec.id)}
                        className={`p-1.5 rounded-lg cursor-pointer ${isFav ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
                        title={t('حفظ في المفضلة', 'Bookmark')}
                      >
                        <Bookmark className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleWatched(lec.id)}
                        className={`p-1.5 rounded-lg cursor-pointer ${isWatched ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-emerald-500'}`}
                        title={isWatched ? t('تمت الدراسة', 'Completed') : t('تحديد كمكتملة', 'Mark Completed')}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">{lec.title}</h4>
                  {lec.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{lec.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  {videoSrc && (
                    <button
                      type="button"
                      onClick={() => onOpenVideo(videoSrc, lec.title)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light text-xs font-bold cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{t('مشاهدة الشرح', 'Watch Lecture')}</span>
                    </button>
                  )}

                  {lec.pdfUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenPdf(lec.pdfUrl!, lec.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-brand-cyan text-xs font-bold cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-brand-cyan" />
                        <span>{t('عرض PDF', 'Read PDF')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerFileDownload(lec.pdfUrl!, `${lec.title}.pdf`)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-brand-cyan text-xs font-bold cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{t('تحميل', 'Download')}</span>
                      </button>
                    </>
                  )}

                  {lec.pptxUrl && (
                    <button
                      type="button"
                      onClick={() => triggerFileDownload(lec.pptxUrl!, `${lec.title}.pptx`)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-bold cursor-pointer"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>PowerPoint</span>
                    </button>
                  )}

                  {(lec.imageUrls?.length || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setGalleryLecture(lec)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold cursor-pointer tabular-nums"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>{t(`الصور (${lec.imageUrls?.length})`, `Images (${lec.imageUrls?.length})`)}</span>
                    </button>
                  )}

                  {(lec.attachments || []).map(att => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => triggerFileDownload(att.url, att.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[120px]">{att.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lecture Images Modal */}
      {galleryLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">{galleryLecture.title}</h3>
              <button type="button" onClick={() => setGalleryLecture(null)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {galleryLecture.imageUrls?.map((img, i) => (
                <div key={i} className="space-y-2">
                  <ResolvedImage
                    src={img}
                    alt={`Slide ${i + 1}`}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 object-contain max-h-80 bg-slate-100 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => triggerFileDownload(img, `${galleryLecture.title}_img_${i + 1}.png`)}
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
