import React from 'react';
import { useLanguage } from './LanguageContext';
import { WebsiteSettings } from '../types';
import { Phone, Send } from 'lucide-react';

interface FooterProps {
  settings: WebsiteSettings;
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  const { t } = useLanguage();

  const openExternalSafe = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleWhatsappClick = () => {
    const raw = (settings.whatsapp || '').trim();
    if (!raw) return;
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      openExternalSafe(raw);
    } else {
      let num = raw.replace(/\D/g, '');
      if (num.startsWith('0')) num = '2' + num;
      openExternalSafe(`https://wa.me/${num}`);
    }
  };

  const handleTelegramClick = () => {
    const raw = (settings.telegram || '').trim();
    if (!raw) return;
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      openExternalSafe(raw);
    } else {
      const rawTele = raw.replace('t.me/', '').replace('@', '');
      openExternalSafe(`https://t.me/${rawTele}`);
    }
  };

  return (
    <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] pb-8 pt-14 font-sans">
      
      {/* Glow highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-1/2 bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 text-xs">
          
          {/* Col 1: About */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-lg">
                🎓
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{t(settings.websiteNameAr, settings.websiteNameEn)}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {t(settings.seoDescription, 'Official technological university academic platform for IT department courses, delivering lectures and lab sheets in Word & PDF format by Eng/Mohamed abdal tawab.')}
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-2.5 mt-1">
              <button 
                type="button"
                onClick={handleWhatsappClick}
                className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-slate-600 dark:text-slate-400 hover:text-brand-cyan hover:border-brand-cyan/40 transition-all cursor-pointer"
                title="WhatsApp"
                aria-label="WhatsApp"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button 
                type="button"
                onClick={handleTelegramClick}
                className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-slate-600 dark:text-slate-400 hover:text-brand-cyan hover:border-brand-cyan/40 transition-all cursor-pointer"
                title="Telegram"
                aria-label="Telegram"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{t('روابط المنصة', 'Platform Links')}</h4>
            <div className="flex flex-col gap-2.5 font-semibold text-slate-600 dark:text-slate-400">
              <button type="button" onClick={() => onNavigate('home')} className="hover:text-brand-cyan text-right ltr:text-left cursor-pointer transition-colors">{t('الرئيسية', 'Home')}</button>
              <button type="button" onClick={() => onNavigate('courses')} className="hover:text-brand-cyan text-right ltr:text-left cursor-pointer transition-colors">{t('المحاضرات والسكاشن', 'Lectures & Labs')}</button>
              <button type="button" onClick={() => onNavigate('teacher')} className="hover:text-brand-cyan text-right ltr:text-left cursor-pointer transition-colors">{t('عن المنصة', 'About Platform')}</button>
            </div>
          </div>

          {/* Col 3: 6 IT Core Subjects */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{t('مقررات قسم IT الستة', '6 Core IT Courses')}</h4>
            <div className="flex flex-col gap-2 font-semibold text-slate-600 dark:text-slate-400 text-right ltr:text-left text-[11px]">
              <span>Physics – {t('الفيزياء', 'Physics')}</span>
              <span>Python Programming – {t('بايثون', 'Python')}</span>
              <span>IT Essentials – {t('أساسيات IT', 'IT Essentials')}</span>
              <span>Mathematics – {t('الرياضيات', 'Mathematics')}</span>
              <span>Cyber Security – {t('الأمن السيبراني', 'Cyber Security')}</span>
              <span>English – {t('اللغة الإنجليزية', 'Technical English')}</span>
            </div>
          </div>

          {/* Col 4: Quick Help & Policy */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{t('الدعم والسياسات', 'Terms & Policies')}</h4>
            <div className="flex flex-col gap-2.5 font-semibold text-slate-600 dark:text-slate-400">
              <button type="button" onClick={() => onNavigate('terms')} className="hover:text-brand-cyan text-right ltr:text-left cursor-pointer transition-colors">{t('شروط وأحكام المنصة', 'Platform Terms')}</button>
              <button type="button" onClick={() => onNavigate('privacy')} className="hover:text-brand-cyan text-right ltr:text-left cursor-pointer transition-colors">{t('سياسة خصوصية الطلاب', 'Student Privacy Policy')}</button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-slate-200 dark:border-slate-800/60 pt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-slate-500 dark:text-slate-400 font-medium">
          <p className="text-center md:text-right font-arabic">
            {t(settings.footerAr, settings.footerEn)}
          </p>
          <p className="text-center md:text-left font-mono text-[11px]">
            {t('صُمم بكفاءة وامتياز لمنصة قسم تكنولوجيا المعلومات © ٢٠٢٦', 'Designed for University IT Excellence © 2026')}
          </p>
        </div>

      </div>
    </footer>
  );
};
