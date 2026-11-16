import React from 'react';
import { Course, Category, UserAuth, Order } from '../types';
import { useLanguage } from './LanguageContext';
import { BookOpen, Clock, Award, CheckCircle2, ArrowUpRight, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { verifyCourseAccess } from '../utils/authAccess';
import { authService } from '../firebase';
import { getCourseDisplayTitle, getGradeName } from '../utils/gradeMatching';
import { getCourseFallbackImage } from '../utils/platformAssets';

interface CourseCardProps {
  course: Course;
  category?: Category;
  onSelect: (course: Course) => void;
  onEnroll: (course: Course, e: React.MouseEvent) => void;
  user?: UserAuth | null;
  orders?: Order[];
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, category, onSelect, onEnroll, user, orders }) => {
  const { language, t } = useLanguage();
  const activeUser = user !== undefined ? user : authService.getCurrentUser();
  const access = verifyCourseAccess(activeUser, course, orders);
  const fallbackImg = getCourseFallbackImage(course.subjectEn || course.subject || course.titleEn);
  const coverSrc =
    course.bannerUrl && !course.bannerUrl.includes('unsplash.com')
      ? course.bannerUrl
      : course.thumbnailUrl && !course.thumbnailUrl.includes('unsplash.com')
      ? course.thumbnailUrl
      : fallbackImg;

  const gradeText = category ? t(category.nameAr, category.nameEn) : getGradeName(course.grade, language);

  return (
    <motion.div
      onClick={() => onSelect(course)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl glass transition-all hover:border-brand-cyan/40 hover:shadow-xl hover:shadow-cyan-950/20 flex flex-col h-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        <img
          src={coverSrc}
          alt={t(course.titleAr, course.titleEn)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />

        {/* Single primary corner status when approved */}
        {access.allowed && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t('متاح بالكامل', 'Unlocked')}</span>
          </div>
        )}

        <div className="absolute bottom-3 right-3 text-[11px] font-mono font-bold text-cyan-200 tracking-wide">
          {course.subject || 'IT'} · {t('مجاني 100%', '100% Free')}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow p-5">
        <p className="text-[11px] font-semibold text-brand-cyan dark:text-brand-cyan-light mb-1 truncate">
          {gradeText}
        </p>

        <h3 className="line-clamp-2 text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-brand-cyan transition-colors leading-snug">
          {getCourseDisplayTitle(course, language)}
        </h3>
        
        <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {t(course.descriptionAr, course.descriptionEn)}
        </p>

        {/* Clean Unboxed Metadata */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-200/70 dark:border-slate-800/60 pt-3.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium tabular-nums">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-brand-cyan" />
            {course.duration}
          </span>
          <span className="text-slate-400">·</span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-brand-cyan" />
            {course.lessonsCount} {t('مادة تعليمية', 'Items')}
          </span>
          <span className="text-slate-400">·</span>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-brand-cyan" />
            PDF & Word
          </span>
        </div>

        {/* Footer & Action */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
            <Award className="h-3.5 w-3.5 text-brand-cyan shrink-0" />
            {course.teacherName}
          </span>

          {access.allowed ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(course); }}
              className="rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>{t('فتح المحاضرات والسكاشن', 'Open Lectures & Labs')}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            </button>
          ) : access.reason === 'pending_approval' ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(course); }}
              className="rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{t('حسابك قيد المراجعة', 'Pending Approval')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEnroll(course, e); }}
              className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-extrabold transition-all cursor-pointer shadow-sm whitespace-nowrap"
            >
              {t('دخول / تفعيل المقرر', 'Access Course')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
