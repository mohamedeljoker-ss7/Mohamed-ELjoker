import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import { Search, Globe, Shield, Menu, X, GraduationCap, User, Sun, Moon } from 'lucide-react';

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
  onGoToStudentDashboard
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

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
            onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
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

            {/* Student Portal Button */}
            {isStudentLoggedIn ? (
              <button
                type="button"
                onClick={onGoToStudentDashboard}
                className="flex items-center gap-1.5 rounded-xl bg-brand-cyan/15 border border-brand-cyan/40 hover:bg-brand-cyan/25 text-brand-cyan dark:text-brand-cyan-light px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('بوابة الطالب', 'Student Hub')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenStudentAuth}
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
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-brand-cyan text-white dark:text-slate-950 hover:opacity-90 px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('لوحة الإدارة', 'Admin Panel')}</span>
              </button>
            ) : !isStudentLoggedIn ? (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Shield className="h-3.5 w-3.5 text-brand-cyan shrink-0" />
                <span>{t('الإدارة', 'Admin')}</span>
              </button>
            ) : null}

            {/* Mobile / Drawer Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
            {!isAdminLoggedIn && !isStudentLoggedIn && (
              <button
                type="button"
                onClick={() => { onOpenAdminLogin(); setMobileMenuOpen(false); }}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer ${
                  language === 'ar' ? 'text-right' : 'text-left'
                }`}
              >
                {t('تسجيل دخول الإدارة', 'Admin Portal Login')}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
