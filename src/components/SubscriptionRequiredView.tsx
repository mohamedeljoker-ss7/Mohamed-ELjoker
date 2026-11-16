import React from 'react';
import { Course } from '../types';
import { ShieldAlert, Lock, ArrowLeft, KeyRound, Sparkles, Clock, UserX, PhoneCall, CheckCircle } from 'lucide-react';

interface SubscriptionRequiredProps {
  course?: Course | null;
  onNavigateBack: () => void;
  onEnroll?: (course: Course, e: React.MouseEvent) => void;
  onLogin?: () => void;
  language?: 'ar' | 'en';
  reason?: string;
  whatsappUrl?: string;
}

export const SubscriptionRequiredView: React.FC<SubscriptionRequiredProps> = ({
  course,
  onNavigateBack,
  onEnroll,
  onLogin,
  language = 'ar',
  reason,
  whatsappUrl = 'https://wa.me/201010298878'
}) => {
  const isAr = language === 'ar';
  const isPending = reason === 'pending_approval';
  const isRejected = reason === 'rejected';
  const isSuspended = reason === 'suspended';
  const isNotLoggedIn = reason === 'not_logged_in';

  const courseTitle = course ? (isAr ? course.titleAr : course.titleEn) : (isAr ? 'المحتوى التعليمي' : 'Educational Content');

  return (
    <div className="py-10 px-4 max-w-4xl mx-auto text-slate-900 dark:text-slate-100 font-sans">
      <button
        type="button"
        onClick={onNavigateBack}
        className="mb-6 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl shadow-xs"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Back to Home'}</span>
      </button>

      <div className="rounded-3xl border border-brand-cyan/30 bg-white dark:bg-slate-950/85 p-6 sm:p-10 shadow-xl glass relative overflow-hidden text-center space-y-6">
        {/* Neon Glow Accents */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border ${
          isRejected
            ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
            : isSuspended
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            : isPending
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
            : 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan'
        }`}>
          {isRejected ? <UserX className="h-8 w-8" /> : isSuspended ? <ShieldAlert className="h-8 w-8" /> : isPending ? <Clock className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
        </div>

        {/* Status Badge & Title */}
        <div className="space-y-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border ${
            isRejected
              ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              : isSuspended
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
              : isPending
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
              : 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan'
          }`}>
            {isRejected ? (isAr ? 'تم رفض الطلب (Rejected)' : 'Account Rejected') :
             isSuspended ? (isAr ? 'الحساب موقوف (Suspended)' : 'Account Suspended') :
             isPending ? (isAr ? 'في انتظار موافقة الإدارة (Pending)' : 'Pending Admin Approval') :
             (isAr ? 'منصة مجانية 100% - تتطلب تسجيل الدخول' : '100% Free - Login Required')}
          </span>

          <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isRejected ? (isAr ? 'تم رفض طلب تسجيل الحساب' : 'Account Registration Rejected') :
             isSuspended ? (isAr ? 'تم تعليق هذا الحساب مؤقتاً' : 'Account Suspended by Admin') :
             isPending ? (isAr ? 'حسابك قيد المراجعة والاعتماد من قبل الإدارة' : 'Your Account is Pending Admin Approval') :
             (isAr ? 'سجل دخولك مجاناً للوصول لكافة المحاضرات والسكاشن' : 'Log In to Access Free Lectures & Sections')}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed pt-2">
            {isRejected ? (isAr ? 'نعتذر، لم يتم قبول طلب تسجيل حسابك من قبل إدارة المنصة. إذا كنت تعتقد أن هذا حدث بالخطأ، يرجى التواصل مع المسؤول مباشرة.' : 'Your registration was not approved. Please contact the administrator for details.') :
             isSuspended ? (isAr ? 'تم إيقاف صلاحية الوصول لهذا الحساب من قبل الإدارة. يرجى التواصل مع المسؤول لفك التعليق وتفعيل الحساب.' : 'Access has been suspended by administration. Contact admin to resolve.') :
             isPending ? (isAr ? `تم تسجيل بياناتك بنجاح وهو الآن بحالة (Pending). المنصة مجانية 100% ولكن يُسمح فقط للطلاب المعتمدين من الإدارة بمشاهدة وتحميل المحاضرات والسكاشن والامتحانات لمقرر "${courseTitle}".` : `Your account was created with status Pending. Admin approval is required before you can access lectures and lab materials for "${courseTitle}".`) :
             (isAr ? `منصة MOHAMED ELJOKER مجانية 100%. سجل حسابك الآن بالاسم والبريد الإلكتروني، وبمجرد اعتماد الإدارة لحسابك ستتمكن من مشاهدة وتحميل كافة المحاضرات، السكاشن، الامتحانات، وشيتات المادة.` : `MOHAMED ELJOKER is 100% Free. Register or log in to get access upon admin verification.`)}
          </p>
        </div>

        {/* Feature Highlights - 100% Free Content */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <span className="block font-bold text-slate-900 dark:text-white mb-1">{isAr ? 'المحاضرات' : 'Lectures'}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{isAr ? 'شروحات يوتيوب وملفات PDF' : 'YouTube & PDF Notes'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <span className="block font-bold text-slate-900 dark:text-white mb-1">{isAr ? 'السكاشن' : 'Sections'}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{isAr ? 'شروحات وملفات المعامل' : 'Practical Lab Materials'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <span className="block font-bold text-slate-900 dark:text-white mb-1">{isAr ? 'الشيتات' : 'Sheets'}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{isAr ? 'شيتات المحاضرات والسكاشن' : 'Lecture & Section Sheets'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <span className="block font-bold text-slate-900 dark:text-white mb-1">{isAr ? 'الامتحانات' : 'Exams'}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{isAr ? 'امتحانات تفاعلية وبنك الأسئلة' : 'Interactive Exams & Question Bank'}</span>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          {(isPending || isRejected || isSuspended) && (
            <a
              href={`${whatsappUrl}?text=${encodeURIComponent('مرحباً، أستفسر عن حالة حسابي في منصة MOHAMED ELJOKER التعليمية لقسم تكنولوجيا المعلومات IT.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3.5 text-xs transition-all shadow-md"
            >
              <PhoneCall className="h-4 w-4" />
              <span>{isAr ? 'تواصل مع الإدارة عبر واتساب' : 'WhatsApp Administration'}</span>
            </a>
          )}

          {isNotLoggedIn && onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-8 py-3.5 text-xs font-black transition-all cursor-pointer shadow-md"
            >
              <KeyRound className="h-4 w-4" />
              <span>{isAr ? 'تسجيل الدخول / إنشاء حساب جديد' : 'Login / Register Free'}</span>
            </button>
          )}

          {course && !isPending && !isRejected && !isSuspended && !isNotLoggedIn && onEnroll && (
            <button
              type="button"
              onClick={(e) => onEnroll(course, e)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-8 py-3.5 text-xs font-black transition-all cursor-pointer shadow-md"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{isAr ? 'فتح المحتوى التعليمي' : 'Access Content'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateBack}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3.5 text-xs font-bold transition-all cursor-pointer"
          >
            <span>{isAr ? 'تصفح قائمة المواد' : 'Browse Subjects'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
