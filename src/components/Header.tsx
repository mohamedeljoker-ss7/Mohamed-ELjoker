import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';
import { Search, Globe, Shield, Menu, X, BookOpen, GraduationCap, User } from 'lucide-react';

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
    { view: 'courses', ar: 'الكورسات والمناهج', en: 'Courses' },
    { view: 'teacher', ar: 'عن مستر', en: 'About Mr. Mohamed' },
    { view: 'contact', ar: 'اتصل بنا', en: 'Contact' },
    ...(isAdminLoggedIn ? [{ view: 'admin-panel', ar: 'لوحة التحكم', en: 'Admin Panel' }] : [])
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-brand-dark/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo */}
          <div 
            onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
            className="flex cursor-pointer items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-xl shadow-lg shadow-cyan-950/25">
              🧪
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-white md:text-base leading-tight">
                {t('أكاديمية العلوم', 'Science Academy')}
              </span>
              <span className="text-[10px] font-medium text-brand-cyan-light font-arabic">
                {t('مستر محمد عبد التواب', 'Mr. Mohamed Abdel Tawab')}
              </span>
            </div>
          </div>

          {/* Search bar - Desktop */}
          <div className="hidden max-w-xs flex-grow md:block relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchVal}
              onChange={handleSearchChange}
              placeholder={t('ابحث عن كورس أو صف دراسي...', 'Search science courses...')}
              className="w-full rounded-xl bg-slate-900/60 border border-slate-800 py-1.5 pl-9 pr-4 text-xs text-white focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/20 placeholder-slate-500"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-300">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`transition-colors hover:text-brand-cyan cursor-pointer ${
                  currentView === item.view ? 'text-brand-cyan-light font-black border-b-2 border-brand-cyan pb-1' : ''
                }`}
              >
                {t(item.ar, item.en)}
              </button>
            ))}
          </nav>

          {/* Controls & Portal Access */}
          <div className="flex items-center gap-2.5">
            
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-brand-cyan hover:border-brand-cyan/30 transition-all cursor-pointer"
              title={language === 'ar' ? 'Switch to English' : 'تحويل للغة العربية'}
            >
              <Globe className="h-4 w-4 text-brand-cyan" />
              <span>{language === 'ar' ? 'EN' : 'العربية'}</span>
            </button>

             {/* Student Portal Button */}
            {isStudentLoggedIn ? (
              <button
                onClick={onGoToStudentDashboard}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-brand-cyan/40 hover:bg-cyan-500/20 text-brand-cyan-light px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 animate-pulse"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{t('بوابة الطالب', 'Student Hub')}</span>
              </button>
            ) : (
              <button
                onClick={onOpenStudentAuth}
                className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{t('بوابة الطالب', 'Student Hub')}</span>
              </button>
            )}

            {/* Admin Portal Button - Hidden for students */}
            {isAdminLoggedIn ? (
              <button
                onClick={onGoToAdminPanel}
                className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-md shadow-cyan-950/20 active:scale-95"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{t('لوحة التحكم', 'Admin Control')}</span>
              </button>
            ) : !isStudentLoggedIn ? (
              <button
                onClick={onOpenAdminLogin}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <GraduationCap className="h-4 w-4 text-brand-cyan" />
                <span className="hidden sm:inline">{t('بوابة الإدارة', 'Admin Portal')}</span>
              </button>
            ) : null}

            {/* Navigation Menu Toggle (3 lines button) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-800 bg-slate-900/60 p-1.5 text-slate-300 hover:text-brand-cyan hover:border-brand-cyan/30 transition-all cursor-pointer active:scale-95 shadow-sm"
              title={t('القائمة الرئيسية', 'Main Menu')}
              aria-label="Toggle Main Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-brand-cyan" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-800/80 bg-brand-dark p-4 animate-fadeIn shadow-2xl">
          {/* Mobile Search */}
          <div className="relative mb-4 md:hidden">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchVal}
              onChange={handleSearchChange}
              placeholder={t('ابحث عن كورس...', 'Search science...')}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
            />
          </div>

          {/* Navigation Items */}
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => { onNavigate(item.view); setMobileMenuOpen(false); }}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-900 transition-all ${
                  language === 'ar' ? 'text-right' : 'text-left'
                } ${currentView === item.view ? 'bg-slate-900 text-brand-cyan font-black border-r-2 border-brand-cyan' : ''}`}
              >
                {t(item.ar, item.en)}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
