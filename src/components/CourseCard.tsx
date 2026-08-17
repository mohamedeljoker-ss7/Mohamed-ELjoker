import React from 'react';
import { Course, Category, UserAuth, Order } from '../types';
import { useLanguage } from './LanguageContext';
import { BookOpen, Clock, Award, Star, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { verifyCourseAccess } from '../utils/authAccess';
import { authService } from '../firebase';
import { getCourseDisplayTitle, getGradeName } from '../utils/gradeMatching';

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

  const priceFormatted = (val: number) => {
    return language === 'ar' ? `${val} ج.م` : `${val} EGP`;
  };

  const hasDiscount = course.discountPrice !== undefined && course.discountPrice < course.price;

  return (
    <motion.div
      onClick={() => onSelect(course)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl glass transition-all hover:border-brand-cyan/40 hover:shadow-lg hover:shadow-cyan-950/25 flex flex-col h-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
        <img
          src={course.bannerUrl || course.thumbnailUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'}
          alt={t(course.titleAr, course.titleEn)}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent" />
        
        {/* Category & Grade Badge */}
        <span className="absolute top-3 left-3 rounded-full bg-brand-cyan/20 px-3 py-1 text-xs font-semibold text-brand-cyan-light backdrop-blur-md border border-brand-cyan/30">
          {category ? t(category.nameAr, category.nameEn) : getGradeName(course.grade, language)}
        </span>

        {/* Featured / Popular Badge */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {course.featured && (
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 backdrop-blur-md border border-amber-500/30 flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400" />
              {t('مميز', 'Featured')}
            </span>
          )}
          {course.popular && (
            <span className="rounded-full bg-violet-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-400 backdrop-blur-md border border-violet-500/30">
              {t('شائع', 'Popular')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow p-5">
        <h3 className="line-clamp-2 text-lg font-bold text-white group-hover:text-brand-cyan transition-colors font-sans leading-snug">
          {getCourseDisplayTitle(course, language)}
        </h3>
        
        <p className="mt-2 line-clamp-2 text-xs text-slate-400 font-sans leading-relaxed">
          {t(course.descriptionAr, course.descriptionEn)}
        </p>

        {/* Course details */}
        <div className="mt-4 flex items-center gap-4 border-t border-slate-800/60 pt-4 text-[11px] text-slate-400 font-sans">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-brand-cyan" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-brand-cyan" />
            <span>{course.lessonsCount} {t('درس', 'Lessons')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-brand-cyan" />
            <span className="truncate max-w-[80px]">{course.teacherName}</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {course.isFree ? (
              <span className="text-lg font-black text-emerald-400">
                {t('مجاني', 'Free')}
              </span>
            ) : hasDiscount ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 line-through">
                    {priceFormatted(course.price)}
                  </span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                    -{Math.round(((course.price - course.discountPrice!) / course.price) * 100)}%
                  </span>
                </div>
                <span className="text-lg font-black text-brand-cyan-light">
                  {priceFormatted(course.discountPrice!)}
                </span>
              </div>
            ) : (
              <span className="text-lg font-black text-white">
                {priceFormatted(course.price)}
              </span>
            )}
          </div>

          {access.allowed ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(course); }}
              className="rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>✅ {t('تم الاشتراك', 'Subscribed')}</span>
            </button>
          ) : access.reason === 'pending_approval' ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(course); }}
              className="rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{t('جاري مراجعة الطلب', 'Pending Review')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEnroll(course, e); }}
              className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer shadow-md shadow-cyan-950/20 active:scale-95"
            >
              {t('اشترك الآن', 'Enroll Now')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
