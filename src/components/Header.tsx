import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import { Notification } from '../types';
import {
  Search, Globe, Shield, Menu, X, GraduationCap, User, Sun, Moon,
  Bell, BellRing, BookOpen, CheckCircle2, FileText, Award, Check, CheckCheck, ChevronRight
} from 'lucide-react';

interface HeaderProps {
  onNavigate: (view: string) => void;
  currentView: string;
  onSearch: (query: string) => void;
  isAdminLoggedIn: boolean;
  onOpenAdminLogin: () => void;
  onGoToAdminPanel: () => void;
  isStudentLoggedIn: boolean;
  onOpenStudentAuth: () => void;
  onGoToStudentDashboard: () => void;
  notifications?: Notification[];
  onMarkNotificationRead?: (notif: Notification) => void;
  onMarkAllNotificationsRead?: () => void;
  onNotificationClick?: (notif: Notification) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  currentView,
  onSearch,
  isAdminLoggedIn,
  onOpenAdminLogin,
  onGoToAdminPanel,
  isStudentLoggedIn,
  onOpenStudentAuth,
  onGoToStudentDashboard,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onNotificationClick
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const notifContainerRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    const filtered = notifFilter === 'unread'
      ? notifications.filter(n => !n.isRead)
      : notifications;
    return filtered.slice(0, 20);
  }, [notifications, notifFilter]);

  useEffect(() => {
    if (!isStudentLoggedIn) {
      setNotifOpen(false);
    }
  }, [isStudentLoggedIn]);

  useEffect(() => {
    if (!notifOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (notifContainerRef.current && !notifContainerRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [notifOpen]);

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return '';
      const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
      if (diffSec < 60) return language === 'ar' ? 'الآن' : 'Just now';
      if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60);
        return language === 'ar' ? `منذ ${mins} د` : `${mins}m ago`;
      }
      if (diffSec < 86400) {
        const hours = Math.floor(diffSec / 3600);
        return language === 'ar' ? `منذ ${hours} س` : `${hours}h ago`;
      }
      const days = Math.floor(diffSec / 86400);
      if (days < 7) {
        return language === 'ar' ? `منذ ${days} ي` : `${days}d ago`;
      }
      return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const renderCategoryIcon = (notif: Notification) => {
    switch (notif.type) {
      case 'lecture_added':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-brand-cyan">
            <BookOpen className="h-4 w-4" />
          </div>
        );
      case 'course_activated':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        );
      case 'assignment':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-500">
            <FileText className="h-4 w-4" />
          </div>
        );
      case 'exam':
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <Award className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-300">
            <BellRing className="h-4 w-4" />
          </div>
        );
    }
  };

  const handleOpenNotificationsHub = () => {
    try {
      sessionStorage.setItem('academy_student_target_tab', 'notifications');
      window.dispatchEvent(new CustomEvent('student-dashboard-tab', { detail: { tab: 'notifications' } }));
    } catch {
      // Ignore storage errors
    }
    setNotifOpen(false);
    onGoToStudentDashboard();
  };

  const handleItemClick = (notif: Notification) => {
    setNotifOpen(false);
    if (onNotificationClick) {
      onNotificationClick(notif);
    } else if (!notif.isRead && onMarkNotificationRead) {
      onMarkNotificationRead(notif);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch(e.target.value);
  };

  const navItems = [
    { view: 'home', ar: 'الرئيسية', en: 'Home' },
    { view: 'courses', ar: 'المقررات والمحاضرات', en: 'IT Courses & Labs' },
    { view: 'teacher', ar: 'عن المنصة', en: 'About Platform' },
    { view: 'contact', ar: 'تواصل معنا', en: 'Contact' },
    ...(isAdminLoggedIn ? [{ view: 'admin-panel', ar: 'لوحة الإدارة', en: 'Admin Panel' }] : [])
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#090d16]/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-3">
          
          {/* Logo */}
          <button
            type="button"
            onClick={() => { onNavigate('home'); setMobileMenuOpen(false); setNotifOpen(false); }}
            className="flex min-w-0 flex-1 sm:flex-initial cursor-pointer items-center gap-2 sm:gap-2.5 text-right ltr:text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/15 border border-brand-cyan/35 text-brand-cyan">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                {t('منصة MOHAMED ELJOKER', 'MOHAMED ELJOKER LMS')}
              </span>
              <span className="hidden sm:block text-[11px] font-semibold text-brand-cyan dark:text-brand-cyan-light truncate">
                {t('تكنولوجيا المعلومات IT · Eng/Mohamed abdal tawab', 'IT Dept · Eng/Mohamed abdal tawab')}
              </span>
            </div>
          </button>

          {/* Search bar - Desktop */}
          <div className="hidden max-w-xs flex-grow lg:block relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchVal}
              onChange={handleSearchChange}
              placeholder={t('ابحث عن محاضرة، سكشن، PDF أو Word...', 'Search lectures, labs, PDF, Word...')}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 py-1.5 pl-9 pr-4 text-xs text-slate-900 dark:text-white focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/20 placeholder-slate-500"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-bold text-slate-600 dark:text-slate-300">
            {navItems.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-brand-cyan cursor-pointer py-1 ${
                  currentView === item.view ? 'text-brand-cyan dark:text-brand-cyan-light font-extrabold border-b-2 border-brand-cyan' : ''
                }`}
              >
                {t(item.ar, item.en)}
              </button>
            ))}
          </nav>

          {/* Controls & Portal Access */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:text-brand-cyan hover:border-brand-cyan/40 transition-colors cursor-pointer shrink-0"
              title={theme === 'light' ? t('الوضع الداكن', 'Dark Mode') : t('الوضع الفاتح', 'Light Mode')}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand-cyan hover:border-brand-cyan/30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={language === 'ar' ? 'Switch to English' : 'تحويل للغة العربية'}
            >
              <Globe className="h-3.5 w-3.5 text-brand-cyan shrink-0" />
              <span>{language === 'ar' ? 'EN' : 'العربية'}</span>
            </button>

            {/* Student In-App Notification Bell */}
            {isStudentLoggedIn && (
              <div ref={notifContainerRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(prev => !prev);
                    setMobileMenuOpen(false);
                  }}
                  aria-expanded={notifOpen}
                  aria-haspopup="true"
                  aria-label={t('إشعارات الطالب', 'Student Notifications')}
                  title={t('إشعارات المنصة الفورية', 'Real-time Alerts')}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                    notifOpen || unreadCount > 0
                      ? 'border-amber-500/45 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:text-brand-cyan hover:border-brand-cyan/40'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-slate-950 font-mono tabular-nums shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                      <span className="pointer-events-none absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 opacity-50 animate-ping" />
                    </>
                  )}
                </button>

                {notifOpen && (
                  <div
                    role="dialog"
                    aria-label={t('قائمة الإشعارات', 'Notifications Menu')}
                    className="fixed inset-x-3 top-[4.25rem] sm:inset-auto sm:absolute sm:top-full sm:mt-2 sm:w-96 ltr:sm:right-0 rtl:sm:left-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl z-50 overflow-hidden"
                  >
                    {/* Dropdown Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 bg-slate-50/80 dark:bg-slate-900/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <BellRing className="h-4 w-4 text-brand-cyan shrink-0" />
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {t('إشعارات الطالب', 'Student Notifications')}
                        </span>
                        {unreadCount > 0 && (
                          <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unreadCount > 0 && onMarkAllNotificationsRead && (
                          <button
                            type="button"
                            onClick={onMarkAllNotificationsRead}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-brand-cyan hover:bg-brand-cyan/10 transition-colors cursor-pointer"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            <span>{t('تحديد الكل كمقروء', 'Mark all read')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotifOpen(false)}
                          aria-label={t('إغلاق الإشعارات', 'Close notifications')}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex items-center gap-1.5 border-b border-slate-200/70 dark:border-slate-800/60 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setNotifFilter('all')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                          notifFilter === 'all'
                            ? 'bg-brand-cyan text-white dark:text-slate-950'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`}
                      >
                        {t('الكل', 'All')} ({notifications.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifFilter('unread')}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                          notifFilter === 'unread'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`}
                      >
                        {t('غير مقروء', 'Unread')} ({unreadCount})
                      </button>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                      {visibleNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400">
                            <Bell className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {notifFilter === 'unread'
                              ? t('لا توجد إشعارات غير مقروءة.', 'You are all caught up!')
                              : t('لا توجد إشعارات حالياً.', 'No notifications yet.')}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {t('ستظهر تنبيهات المحاضرات الجديدة واعتماد المواد هنا فور نشرها.', 'Alerts for new lectures and course approvals will appear here in real time.')}
                          </p>
                        </div>
                      ) : (
                        visibleNotifications.map((notif) => {
                          const title = language === 'ar'
                            ? (notif.titleAr || notif.titleEn)
                            : (notif.titleEn || notif.titleAr);
                          const body = language === 'ar'
                            ? (notif.bodyAr || notif.bodyEn)
                            : (notif.bodyEn || notif.bodyAr);
                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleItemClick(notif)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleItemClick(notif);
                                }
                              }}
                              className={`group flex items-start gap-3 px-4 py-3 text-right ltr:text-left transition-colors cursor-pointer ${
                                notif.isRead
                                  ? 'bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                                  : 'bg-cyan-50/70 dark:bg-cyan-950/25 hover:bg-cyan-50 dark:hover:bg-cyan-950/40'
                              }`}
                            >
                              {renderCategoryIcon(notif)}

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-xs leading-snug line-clamp-1 ${
                                    notif.isRead
                                      ? 'font-semibold text-slate-700 dark:text-slate-300'
                                      : 'font-extrabold text-slate-900 dark:text-white'
                                  }`}>
                                    {title}
                                  </p>
                                  <span className="shrink-0 text-[10px] font-mono text-slate-400">
                                    {formatTimeAgo(notif.createdAt)}
                                  </span>
                                </div>

                                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                                  {body}
                                </p>

                                {notif.courseTitle && (
                                  <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-full">
                                    {notif.courseTitle}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                                {!notif.isRead && (
                                  <>
                                    <span className="h-2 w-2 rounded-full bg-brand-cyan" />
                                    {onMarkNotificationRead && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onMarkNotificationRead(notif);
                                        }}
                                        title={t('تحديد كمقروء', 'Mark as read')}
                                        aria-label={t('تحديد كمقروء', 'Mark as read')}
                                        className="rounded-md p-1 text-slate-400 hover:bg-brand-cyan/15 hover:text-brand-cyan transition-colors cursor-pointer"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer Action */}
                    <div className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 px-3 py-2">
                      <button
                        type="button"
                        onClick={handleOpenNotificationsHub}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold text-brand-cyan hover:bg-brand-cyan/10 transition-colors cursor-pointer"
                      >
                        <span>{t('عرض كل الإشعارات في بوابة الطالب', 'View all in Student Hub')}</span>
                        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Student Portal Button */}
            {isStudentLoggedIn ? (
              <button
                type="button"
                onClick={onGoToStudentDashboard}
                title={t('بوابة الطالب', 'Student Hub')}
                aria-label={t('بوابة الطالب', 'Student Hub')}
                className="flex items-center gap-1.5 rounded-xl bg-brand-cyan/15 border border-brand-cyan/40 hover:bg-brand-cyan/25 text-brand-cyan dark:text-brand-cyan-light px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('بوابة الطالب', 'Student Hub')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenStudentAuth}
                title={t('دخول / تسجيل', 'Login / Register')}
                aria-label={t('دخول / تسجيل', 'Login / Register')}
                className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
              >
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('دخول / تسجيل', 'Login / Register')}</span>
              </button>
            )}

            {/* Admin Portal Button */}
            {isAdminLoggedIn ? (
              <button
                type="button"
                onClick={onGoToAdminPanel}
                title={t('لوحة المدير', 'Manager Panel')}
                aria-label={t('لوحة المدير', 'Manager Panel')}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-brand-cyan text-white dark:text-slate-950 hover:opacity-90 px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('لوحة المدير', 'Manager Panel')}</span>
              </button>
            ) : !isStudentLoggedIn ? (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                title={t('تسجيل دخول المدير', 'Manager Login')}
                aria-label={t('تسجيل دخول المدير', 'Manager Login')}
                className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Shield className="h-3.5 w-3.5 text-brand-cyan shrink-0" />
                <span>{t('المدير', 'Manager')}</span>
              </button>
            ) : null}

            {/* Mobile / Drawer Menu Toggle */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setNotifOpen(false);
              }}
              className="xl:hidden flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-brand-cyan transition-colors cursor-pointer shrink-0"
              title={t('القائمة الرئيسية', 'Main Menu')}
              aria-label="Toggle Main Menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4 text-brand-cyan" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

        </div>
      </div>

      {/* Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16] p-4 shadow-xl xl:hidden">
          <div className="relative mb-4 lg:hidden">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchVal}
              onChange={handleSearchChange}
              placeholder={t('ابحث عن مادة، محاضرة، سكشن، PDF أو Word...', 'Search courses, lectures, labs, PDF, Word...')}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-2 pl-9 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => { onNavigate(item.view); setMobileMenuOpen(false); }}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer ${
                  language === 'ar' ? 'text-right' : 'text-left'
                } ${currentView === item.view ? 'bg-brand-cyan/10 text-brand-cyan dark:text-brand-cyan-light font-extrabold' : ''}`}
              >
                {t(item.ar, item.en)}
              </button>
            ))}
            {isStudentLoggedIn && (
              <button
                type="button"
                onClick={() => { onGoToStudentDashboard(); setMobileMenuOpen(false); }}
                className={`rounded-xl px-4 py-2.5 text-xs font-extrabold bg-brand-cyan/15 text-brand-cyan dark:text-brand-cyan-light hover:bg-brand-cyan/25 transition-colors cursor-pointer ${
                  language === 'ar' ? 'text-right' : 'text-left'
                }`}
              >
                {t('فتح بوابة الطالب والملفات', 'Open Student Hub & Files')}
              </button>
            )}
            {isAdminLoggedIn && (
              <button
                type="button"
                onClick={() => { onGoToAdminPanel(); setMobileMenuOpen(false); }}
                className={`rounded-xl px-4 py-2.5 text-xs font-extrabold bg-brand-cyan/15 text-brand-cyan dark:text-brand-cyan-light hover:bg-brand-cyan/25 transition-colors cursor-pointer ${
                  language === 'ar' ? 'text-right' : 'text-left'
                }`}
              >
                {t('فتح لوحة إدارة المنصة', 'Open Manager Panel')}
              </button>
            )}
            {!isAdminLoggedIn && !isStudentLoggedIn && (
              <button
                type="button"
                onClick={() => { onOpenAdminLogin(); setMobileMenuOpen(false); }}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer ${
                  language === 'ar' ? 'text-right' : 'text-left'
                }`}
              >
                {t('تسجيل دخول المدير', 'Manager Login')}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
