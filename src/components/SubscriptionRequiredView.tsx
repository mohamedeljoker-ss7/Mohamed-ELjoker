import React from 'react';
import { Course } from '../types';
import { ShieldAlert, Lock, ArrowLeft, KeyRound, Sparkles, Clock } from 'lucide-react';

interface SubscriptionRequiredProps {
  course: Course;
  onNavigateBack: () => void;
  onEnroll: (course: Course, e: React.MouseEvent) => void;
  onLogin?: () => void;
  language?: 'ar' | 'en';
  reason?: string;
}

export const SubscriptionRequiredView: React.FC<SubscriptionRequiredProps> = ({
  course,
  onNavigateBack,
  onEnroll,
  onLogin,
  language = 'ar',
  reason
}) => {
  const isAr = language === 'ar';
  const isPending = reason === 'pending_approval';

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto text-slate-100 font-sans">
      <button
        onClick={onNavigateBack}
        className="mb-6 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{isAr ? 'العودة لقائمة الكورسات' : 'Back to Courses'}</span>
      </button>

      <div className="rounded-3xl border border-amber-500/30 bg-slate-950/80 p-8 sm:p-12 shadow-2xl glass relative overflow-hidden text-center space-y-6">
        {/* Background glow effect */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-300 uppercase tracking-wider">
            <ShieldAlert className="h-3.5 w-3.5" />
            {isAr ? 'كورس محمي - اشتراك مدفوع (Premium)' : 'Premium Content Access Protected'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {isAr 
              ? (isPending ? 'طلب الاشتراك قيد المراجعة.' : 'يجب الاشتراك في الكورس أولاً.')
              : (isPending ? 'Subscription request is pending review.' : 'You must subscribe to the course first.')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed pt-2">
            {isAr
              ? (isPending 
                  ? `لقد قمت بتقديم طلب اشتراك في الكورس "${course.titleAr || course.titleEn}" وهو الآن قيد المراجعة من الإدارة لتفعيله قريباً.` 
                  : `الكورس "${course.titleAr || course.titleEn}" هو منهج محمي مخصص للمشتركين المفعلين فقط. يرجى الاشتراك في الكورس أولاً.`)
              : (isPending
                  ? `Your subscription request for "${course.titleEn || course.titleAr}" is currently pending review by an administrator.`
                  : `The course "${course.titleEn || course.titleAr}" requires an active subscription. You must subscribe to the course first.`)}
          </p>
        </div>

        {/* Feature Highlights - Zero exposure of actual course links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-4 border-t border-slate-900 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
            <span className="block font-bold text-white mb-1">🎬 {isAr ? 'شرح تفاعلي مبسط' : 'Video Lectures'}</span>
            <span className="text-[11px] text-slate-400">{isAr ? 'حصص مصورة وجودة عالية' : 'HD Simulated Lessons'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
            <span className="block font-bold text-white mb-1">📄 {isAr ? 'مذكرات ملخصة' : 'PDF Worksheets'}</span>
            <span className="text-[11px] text-slate-400">{isAr ? 'ملفات جاهزة للتحميل' : 'Revision Handouts'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
            <span className="block font-bold text-white mb-1">📝 {isAr ? 'امتحانات إلكترونية' : 'Online Exams'}</span>
            <span className="text-[11px] text-slate-400">{isAr ? 'تقييم ذاتي وشهادات' : 'Quizzes & Certificates'}</span>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {isPending ? (
            <button
              type="button"
              disabled
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 px-8 py-3.5 text-xs font-black transition-all cursor-default shadow-lg"
            >
              <Clock className="h-4 w-4" />
              {isAr ? 'جاري مراجعة الطلب' : 'Request Pending Review'}
            </button>
          ) : (
            <button
              onClick={(e) => onEnroll(course, e)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-8 py-3.5 text-xs font-black transition-all cursor-pointer shadow-lg shadow-cyan-950/30"
            >
              <Sparkles className="h-4 w-4" />
              {isAr ? 'الاشتراك وتفعيل الحساب الآن' : 'Subscribe & Activate Access'}
            </button>
          )}

          {onLogin && (
            <button
              onClick={onLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 px-6 py-3.5 text-xs font-bold transition-all cursor-pointer"
            >
              <KeyRound className="h-4 w-4 text-brand-cyan" />
              {isAr ? 'تسجيل الدخول بحساب آخر' : 'Login with Existing Account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
