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

  const handleWhatsappClick = () => {
    if (settings.whatsapp.startsWith('http')) {
      window.open(settings.whatsapp, '_blank');
    } else {
      window.open(`https://wa.me/${settings.whatsapp}`, '_blank');
    }
  };

  const handleTelegramClick = () => {
    if (settings.telegram.startsWith('http')) {
      window.open(settings.telegram, '_blank');
    } else {
      const rawTele = settings.telegram.replace('t.me/', '').replace('@', '');
      window.open(`https://t.me/${rawTele}`, '_blank');
    }
  };

  return (
    <footer className="relative z-10 border-t border-slate-800 bg-brand-dark pb-8 pt-16 font-sans">
      
      {/* Glow highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-1/2 bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 text-xs">
          
          {/* Col 1: About */}
          <div className="md:col-span-1.5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-lg">
                🧪
              </span>
              <span className="text-sm font-black text-white">{t(settings.websiteNameAr, settings.websiteNameEn)}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t(settings.seoDescription, 'Premium educational platform focusing on Science Preparatory Grades & High School Integrated Science by Mr. Mohamed Abdel Tawab.')}
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-2.5 mt-2">
              <button 
                onClick={handleWhatsappClick}
                className="rounded-xl bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:text-brand-cyan hover:border-brand-cyan/30 transition-all cursor-pointer"
                title="WhatsApp"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button 
                onClick={handleTelegramClick}
                className="rounded-xl bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:text-brand-cyan hover:border-brand-cyan/30 transition-all cursor-pointer"
                title="Telegram"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold text-white border-r-2 border-brand-cyan pr-2 pl-2">{t('روابط الأكاديمية', 'Academy Links')}</h4>
            <div className="flex flex-col gap-2.5 font-semibold text-slate-400">
              <button onClick={() => onNavigate('home')} className="hover:text-brand-cyan text-right ltr:text-left cursor-pointer">{t('الرئيسية', 'Home')}</button>
              <button onClick={() => onNavigate('courses')} className="hover:text-brand-cyan text-right ltr:text-left cursor-pointer">{t('كورسات العلوم', 'Science Courses')}</button>
            </div>
          </div>

          {/* Col 3: Academic Phases */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold text-white border-r-2 border-brand-cyan pr-2 pl-2">{t('المراحل التعليمية', 'Academic Grades')}</h4>
            <div className="flex flex-col gap-2.5 font-semibold text-slate-400 text-right ltr:text-left">
              <span>{t('الصف الأول الإعدادي', '1st Prep Grade')}</span>
              <span>{t('الصف الثاني الإعدادي', '2nd Prep Grade')}</span>
              <span>{t('الصف الثالث الإعدادي', '3rd Prep Grade')}</span>
              <span>{t('الصف الأول الثانوي', '1st Secondary Grade')}</span>
              <span>{t('الصف الثاني الثانوي', '2nd Secondary Grade')}</span>
              <span>{t('الصف الثالث الثانوي', '3rd Secondary Grade')}</span>
            </div>
          </div>

          {/* Col 4: Quick Help & Policy */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold text-white border-r-2 border-brand-cyan pr-2 pl-2">{t('الدعم القانوني والسياسات', 'Terms & Policies')}</h4>
            <div className="flex flex-col gap-2.5 font-semibold text-slate-400 font-medium">
              <button onClick={() => onNavigate('terms')} className="hover:text-brand-cyan text-right ltr:text-left cursor-pointer">{t('شروط وأحكام الأكاديمية', 'Academy Terms & Conditions')}</button>
              <button onClick={() => onNavigate('privacy')} className="hover:text-brand-cyan text-right ltr:text-left cursor-pointer">{t('سياسة خصوصية الطالب', 'Student Privacy Policy')}</button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-slate-800/60 pt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-slate-500 font-medium">
          <p className="text-center md:text-right font-arabic">
            {t(settings.footerAr, settings.footerEn)}
          </p>
          <p className="text-center md:text-left font-mono">
            {t('صُمم بكفاءة وامتياز للأكاديمية والطلاب © ٢٠٢٦', 'Designed for Excellence & Innovation © 2026')}
          </p>
        </div>

      </div>
    </footer>
  );
};
