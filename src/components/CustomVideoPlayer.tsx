import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatVideoEmbedUrl, ParsedVideoInfo, buildYouTubeEmbedUrl } from '../utils/authAccess';
import { VideoWatermark } from './VideoWatermark';
import { Video, RefreshCw, Loader2, WifiOff, Maximize, Minimize, AlertTriangle, AlertCircle, ShieldAlert, Globe, HelpCircle } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { getVideoFromIndexedDB } from '../utils/videoStorage';
import { getFileFromFirestoreChunks } from '../utils/firestoreMediaStorage';

interface CustomVideoPlayerProps {
  src?: string | null;
  title?: string;
  poster?: string;
  user?: {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  className?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  title,
  poster,
  user,
  className = '',
  autoPlay = false,
  onEnded
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resolvedVideoSource, setResolvedVideoSource] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [isLocalMissingOnDevice, setIsLocalMissingOnDevice] = useState(false);
  const [useNoCookieMode, setUseNoCookieMode] = useState(true);
  const [showEmbedHelp, setShowEmbedHelp] = useState(false);

  const formatted: ParsedVideoInfo = formatVideoEmbedUrl(src);
  const isEmbedPlayer = formatted.type === 'youtube' || formatted.type === 'vimeo' || formatted.type === 'drive' || formatted.type === 'iframe';
  const renderAsIframe = isEmbedPlayer || useIframeFallback;

  // Active YouTube embed URL depending on useNoCookieMode
  const currentEmbedUrl = formatted.type === 'youtube' && formatted.videoId
    ? buildYouTubeEmbedUrl(formatted.videoId, useNoCookieMode)
    : formatted.embedUrl;

  // Resolve IndexedDB and Firestore video sources if applicable
  useEffect(() => {
    let createdObjectUrl: string | null = null;
    let isSubscribed = true;
    setIsLocalMissingOnDevice(false);
    setErrorMessage(null);

    if (formatted.type === 'video' && formatted.embedUrl.startsWith('firestore://')) {
      setIsLoading(true);
      const key = formatted.embedUrl.replace('firestore://', '');
      getFileFromFirestoreChunks(key).then((blob) => {
        if (!isSubscribed) return;
        if (blob) {
          createdObjectUrl = URL.createObjectURL(blob);
          setResolvedVideoSource(createdObjectUrl);
          setHasError(false);
          setIsLocalMissingOnDevice(false);
        } else {
          setHasError(true);
          setErrorMessage(t('فشل تحميل الفيديو السحابي من قاعدة البيانات.', 'Failed to load cloud video from database.'));
        }
        setIsLoading(false);
      }).catch((err) => {
        console.error("Error retrieving video from Firestore:", err);
        if (isSubscribed) {
          setHasError(true);
          setIsLoading(false);
        }
      });
    } else if (formatted.type === 'video' && formatted.embedUrl.startsWith('indexeddb://')) {
      setIsLoading(true);
      const key = formatted.embedUrl.replace('indexeddb://', '');
      getVideoFromIndexedDB(key).then((blob) => {
        if (!isSubscribed) return;
        if (blob) {
          createdObjectUrl = URL.createObjectURL(blob);
          setResolvedVideoSource(createdObjectUrl);
          setHasError(false);
          setIsLocalMissingOnDevice(false);
        } else {
          console.warn("Local video Blob not found in IndexedDB store for key:", key);
          setIsLocalMissingOnDevice(true);
          setHasError(true);
          setErrorMessage(t(
            'هذا الفيديو مخزن على متصفح المعلم المحلي فقط. ليعمل للجميع وعلى الموقع المنشور، يرجى إعادة رفع الفيديو إلى التخزين السحابي من لوحة التحكم أو إضافة رابط YouTube/Drive.',
            'This video is stored in teacher local browser. To work globally, please re-upload to Cloud Storage in Admin Panel or add a YouTube/Drive link.'
          ));
        }
        setIsLoading(false);
      }).catch((err) => {
        console.error("Error retrieving video from IndexedDB:", err);
        if (isSubscribed) {
          setIsLocalMissingOnDevice(true);
          setHasError(true);
          setIsLoading(false);
        }
      });
    } else {
      setResolvedVideoSource(null);
    }

    return () => {
      isSubscribed = false;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [src, formatted.type, formatted.embedUrl, t]);

  // Track Fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // Monitor video element readiness
  useEffect(() => {
    setUseIframeFallback(false);
    setIsLoading(true);
    if (!isLocalMissingOnDevice) {
      setHasError(false);
    }

    const checkReadiness = () => {
      if (videoRef.current) {
        if (videoRef.current.readyState >= 1) {
          setIsLoading(false);
          setHasError(false);
        }
      }
    };

    checkReadiness();
    const timer1 = setTimeout(checkReadiness, 600);
    const timer2 = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [src, retryCount, resolvedVideoSource, isLocalMissingOnDevice]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setHasError(false);
      if (videoRef.current) {
        try {
          videoRef.current.load();
          videoRef.current.play().catch(() => {});
        } catch (e) {}
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle manual retry
  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setRetryCount(prev => prev + 1);

    if (videoRef.current) {
      try {
        videoRef.current.load();
        videoRef.current.play().then(() => {
          setIsLoading(false);
        }).catch((e) => {
          console.warn("Video playback retry attempt:", e);
        });
      } catch (err) {
        console.error("Video load error:", err);
      }
    }
  }, []);

  // Handle empty or missing source
  if (!src || formatted.type === 'empty') {
    return (
      <div className={`aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400 relative shadow-2xl ${className}`}>
        <Video className="h-12 w-12 mb-3 text-slate-600" />
        <p className="font-bold text-sm text-slate-300">{t('لا يوجد فيديو مرفق حالياً في هذا الدرس.', 'No video attached currently in this lesson.')}</p>
      </div>
    );
  }

  // Handle unsupported video URL format
  if (formatted.type === 'unsupported') {
    return (
      <div className={`aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-rose-900/50 flex flex-col items-center justify-center p-6 text-center text-slate-400 relative shadow-2xl ${className}`}>
        <AlertCircle className="h-12 w-12 mb-3 text-rose-500" />
        <h4 className="font-black text-sm text-white mb-1">{t('صيغة رابط الفيديو غير مدعومة', 'Unsupported Video Link Format')}</h4>
        <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
          {t('يرجى التأكد من إضافة رابط YouTube صحيح أو Google Drive أو ملف MP4 مباشر من لوحة التحكم.', 'Please ensure a valid YouTube, Google Drive, or MP4 video URL is provided in the admin panel.')}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800/90 shadow-2xl relative group select-none ${className}`}
    >
      {/* Dynamic Watermark Overlay for Student Anti-Piracy */}
      {user && <VideoWatermark user={user} />}

      {/* Top Controls Overlay: In-Platform Controls */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2 opacity-90 hover:opacity-100 transition-all pointer-events-auto">
        {formatted.type === 'youtube' && (
          <>
            <button
              type="button"
              onClick={() => setUseNoCookieMode(prev => !prev)}
              className="rounded-xl bg-slate-950/85 border border-slate-700/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-all shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
              title={useNoCookieMode ? t('التبديل إلى خادم YouTube العادي', 'Switch to Standard YouTube server') : t('التبديل إلى خادم YouTube الخصوصي (No-Cookie)', 'Switch to No-Cookie YouTube server')}
            >
              <Globe className="h-3.5 w-3.5 text-brand-cyan" />
              <span className="hidden sm:inline">{useNoCookieMode ? 'No-Cookie' : 'Standard'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEmbedHelp(true)}
              className="rounded-xl bg-slate-950/85 border border-slate-700/80 p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-900 transition-all shadow-lg flex items-center justify-center cursor-pointer backdrop-blur-md"
              title={t('حل مشكلة المحتوى محظور', 'Fix Blocked Content Error')}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleToggleFullscreen}
          className="rounded-xl bg-slate-950/85 border border-slate-700/80 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-900 hover:text-brand-cyan transition-all shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
          title={isFullscreen ? t('تصغير الشاشة', 'Exit Fullscreen') : t('تكبير الشاشة (ملء الشاشة)', 'Fullscreen')}
        >
          {isFullscreen ? <Minimize className="h-3.5 w-3.5 text-brand-cyan" /> : <Maximize className="h-3.5 w-3.5 text-brand-cyan" />}
          <span>{isFullscreen ? t('تصغير الشاشة', 'Exit Fullscreen') : t('تكبير الشاشة', 'Fullscreen')}</span>
        </button>
      </div>

      {/* Embed Troubleshooting Modal Overlay */}
      {showEmbedHelp && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center text-white backdrop-blur-md animate-fadeIn">
          <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-right">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ShieldAlert className="h-5 w-5" />
                <span>{t('حل مشكلة "المحتوى محظور" من يوتيوب', 'Fix "Content Blocked" YouTube Error')}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEmbedHelp(false)}
                className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                {t('إغلاق', 'Close')}
              </button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {t(
                'إذا ظهرت لك رسالة "المحتوى محظور" أو "تم تعطيل التشغيل في مواقع الويب الأخرى من قِبل مالك الفيديو"، فالسبب هو أن خيار السماح بالتضمين غير مفعل في قناة اليوتيوب.',
                'If you see "Content blocked" or "Playback disabled on other websites by video owner", embedding is turned off on YouTube Studio.'
              )}
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-4 text-xs text-slate-300 space-y-1.5">
              <div className="font-bold text-brand-cyan text-[11px] mb-1">{t('خطوات الحل في ثوانٍ من استوديو YouTube:', 'Steps to fix in seconds:')}</div>
              <div>1. {t('افتح استوديو يوتيوب (YouTube Studio) وادخل على تفاصيل الفيديو.', 'Open YouTube Studio and go to Video Details.')}</div>
              <div>2. {t('اضغط على "عرض المزيد" (Show More) في أسفل الصفحة.', 'Click "Show More" at bottom.')}</div>
              <div>3. {t('فعّل خيار: "السماح بالتضمين" (Allow embedding).', 'Check: "Allow embedding".')}</div>
              <div>4. {t('اضغط حفظ (Save)، وسيعمل الفيديو فوراً داخل المنصة.', 'Click Save, and video will play instantly in the platform.')}</div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseNoCookieMode(prev => !prev);
                  setShowEmbedHelp(false);
                }}
                className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-3.5 py-2 text-xs font-bold transition-all cursor-pointer"
              >
                {t('تجربة تبديل خادم التضمين الآن', 'Toggle Embed Server Now')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Native HTML5 Video Player for MP4/WEBM/MOV/MKV/Firebase Storage */}
      {formatted.type === 'video' && !useIframeFallback && (
        <div className="w-full h-full relative">
          {(isLoading || (formatted.embedUrl.startsWith('indexeddb://') && !resolvedVideoSource)) && !hasError && !isOffline && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white pointer-events-none">
              <Loader2 className="h-10 w-10 text-brand-cyan animate-spin mb-2" />
              <span className="text-xs font-bold text-slate-300">{t('جاري تحميل الفيديو...', 'Loading video...')}</span>
            </div>
          )}

          {/* Offline / Missing IndexedDB Device / Load Error Overlay */}
          {(isOffline || hasError) && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center text-white backdrop-blur-md animate-fadeIn">
              {isLocalMissingOnDevice ? (
                <div className="flex flex-col items-center max-w-md">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h4 className="font-black text-sm md:text-base text-amber-300 mb-1">
                    {t('فيديو مرفوع محلياً عبر جهاز المعلم (IndexedDB)', 'Local Browser Stored Video (IndexedDB)')}
                  </h4>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    {errorMessage || t(
                      'الملف تم حفظه على متصفح المعلم المحلي. لكي يظهر لجميع الطلاب، يرجى رفع الفيديو سحابياً أو وضع رابط YouTube أو Drive.',
                      'This file is stored in teacher local browser. To work globally, please upload to Cloud Storage or attach a YouTube/Drive link.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{t('إعادة الفحص', 'Recheck Local Store')}</span>
                  </button>
                </div>
              ) : (
                <>
                  <WifiOff className="h-12 w-12 text-rose-500 mb-3 animate-bounce" />
                  <h4 className="font-black text-sm md:text-base text-white mb-1">
                    {isOffline ? t('انقطع الاتصال بالإنترنت', 'Internet Connection Disconnected') : t('تعذر تشغيل الفيديو في المشغل المباشر', 'Failed to play video directly')}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                    {isOffline 
                      ? t('يرجى التحقق من الاتصال بالشبكة. سيكمل الفيديو التشغيل تلقائياً عند عودة الإنترنت.', 'Please check your connection. Video will resume automatically once connected.')
                      : t('يمكنك إعادة المحاولة أو تجربة التشغيل في إطار مدمج داخل المنصة.', 'You can retry playback or switch to embedded player inside the platform.')
                    }
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-4 py-2.5 text-xs font-bold transition-all shadow-lg shadow-cyan-950/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>{t('إعادة المحاولة', 'Retry Playback')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasError(false);
                        setUseIframeFallback(true);
                      }}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <Video className="h-4 w-4" />
                      <span>{t('التشغيل كـ إطار مدمج', 'Play as Embedded')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {(!formatted.embedUrl.startsWith('indexeddb://') || resolvedVideoSource) && (
            <video
              key={`${src}_${retryCount}_${resolvedVideoSource || ''}`}
              ref={videoRef}
              src={resolvedVideoSource || formatted.embedUrl}
              poster={poster}
              controls
              preload="metadata"
              controlsList="nodownload"
              playsInline
              autoPlay={autoPlay}
              onContextMenu={(e) => e.preventDefault()}
              onLoadStart={() => {
                setIsLoading(true);
              }}
              onLoadedMetadata={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onLoadedData={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onCanPlay={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onCanPlayThrough={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onDurationChange={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onTimeUpdate={() => {
                if (videoRef.current && videoRef.current.currentTime > 0) {
                  setIsLoading(false);
                  setHasError(false);
                }
              }}
              onPlay={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onPlaying={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onWaiting={() => setIsLoading(true)}
              onError={(e) => {
                const errObj = videoRef.current?.error;
                console.warn("Video element onError triggered. Code:", errObj?.code, "Message:", errObj?.message || "Media load error");
                if (errObj && errObj.code === 1) {
                  setIsLoading(false);
                  return;
                }
                setIsLoading(false);
                
                const isFirebaseOrDirectVideo = formatted.embedUrl.includes('firebasestorage') ||
                  formatted.embedUrl.startsWith('indexeddb://') ||
                  formatted.embedUrl.startsWith('blob:') ||
                  formatted.embedUrl.startsWith('data:') ||
                  /\.(mp4|webm|mov|mkv|m3u8|avi)(\?.*)?$/i.test(formatted.embedUrl);

                if (!isFirebaseOrDirectVideo && formatted.embedUrl && (formatted.embedUrl.startsWith('http://') || formatted.embedUrl.startsWith('https://')) && !useIframeFallback) {
                  console.log("Auto-switching to embedded iframe playback for non-direct video URL...");
                  setUseIframeFallback(true);
                  setHasError(false);
                  return;
                }
                setHasError(true);
              }}
              onEnded={onEnded}
              className="w-full h-full object-contain bg-black"
            >
              Your browser does not support playing this video.
            </video>
          )}
        </div>
      )}

      {/* Official YouTube & Iframe Embedded Player */}
      {renderAsIframe && (
        <div className="w-full h-full relative bg-black">
          <iframe
            key={`${currentEmbedUrl}_${useNoCookieMode ? 'nocookie' : 'standard'}`}
            src={resolvedVideoSource || currentEmbedUrl}
            title={title || 'Course Video'}
            className="w-full h-full border-none bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  );
};
