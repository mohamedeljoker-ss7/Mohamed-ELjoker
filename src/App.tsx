import React, { useState, useEffect } from 'react';
import { Course, Category, NewsItem, Article, UserReview, WebsiteSettings, Order } from './types';
import { dbService, authService, isAdminEmail, firebaseAuth, waitForFirebaseAuth } from './firebase';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { useTheme } from './components/ThemeContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CourseCard } from './components/CourseCard';
import { AdminPanel } from './components/AdminPanel';
import { StudentDashboard } from './components/StudentDashboard';
import { SubscriptionRequiredView } from './components/SubscriptionRequiredView';
import { CustomVideoPlayer } from './components/CustomVideoPlayer';
import { verifyCourseAccess, formatVideoEmbedUrl } from './utils/authAccess';
import { triggerFileDownload } from './utils/videoStorage';
import { doesCourseMatchStudent, doesCourseMatchStudentGrade, ACADEMIC_GRADES, ACADEMIC_SEMESTERS, ACADEMIC_SUBJECTS, getGradeName, getCourseDisplayTitle, normalizeGradeCode, getGradeFromCourseOrCategory } from './utils/gradeMatching';
import { 
  Star, Phone, Send, Info, Award, Calendar, BookOpen, Clock, FileText, CheckCircle2, 
  MapPin, HelpCircle, ShieldAlert, ArrowLeft, Loader, Play, Download, Check, X, Video, Plus, Sparkles,
  Code2, Cpu, ShieldCheck, GraduationCap, Terminal, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HERO_IT_UNIVERSITY_IMG, ENG_MOHAMED_AVATAR_IMG } from './utils/platformAssets';

function AcademyApp() {
  const { language, t, direction } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Navigation state: 'home' | 'courses' | 'course-details' | 'teacher' | 'articles' | 'news' | 'contact' | 'privacy' | 'terms' | 'admin-panel'
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeVideoModalUrl, setActiveVideoModalUrl] = useState<string | null>(null);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState<boolean>(false);
  
  // Database State (synchronized with Firestore/LocalStorage)
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingContact, setSubmittingContact] = useState<boolean>(false);
  const [submittingEnroll, setSubmittingEnroll] = useState<boolean>(false);

  // Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Student Auth States
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState<boolean>(false);
  const [isStudentAuthOpen, setIsStudentAuthOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'student' | 'teacher'>('student');
  const [studentAuthMode, setStudentAuthMode] = useState<'login' | 'register'>('login');
  const [studentAuthForm, setStudentAuthForm] = useState({ name: '', email: '', password: '', phone: '', grade: 'year1', semester: 'term1', department: 'IT' });
  const [studentAuthError, setStudentAuthError] = useState<string>('');
  const [studentAuthSuccess, setStudentAuthSuccess] = useState<string>('');
  const [studentAccountStatus, setStudentAccountStatus] = useState<string>('');

  // Enroll Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const [enrollingCourse, setEnrollingCourse] = useState<Course | null>(null);
  const [enrollForm, setEnrollForm] = useState({ name: '', email: '', phone: '' });
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false);

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [contactSuccess, setContactSuccess] = useState<boolean>(false);

  // FAQ Accordion Active state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Fetch initial public catalog data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        allCourses, allCategories, allArticles, allNews, allReviews, webSettings
      ] = await Promise.all([
        dbService.getCourses(),
        dbService.getCategories(),
        dbService.getArticles(),
        dbService.getNews(),
        dbService.getReviews(),
        dbService.getSettings()
      ]);

      setCourses(allCourses);
      setCategories(allCategories);
      setArticles(allArticles);
      setNews(allNews);
      setReviews(allReviews);
      setSettings(webSettings);

      // Verify active session
      const currentAdmin = authService.getCurrentAdmin();
      if (currentAdmin) {
        setIsAdminLoggedIn(true);
      }
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.role === 'student') {
        setIsStudentLoggedIn(true);
      }
    } catch (err) {
      console.error("Error synchronizing academy data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine the base application path (supports GitHub Pages sub-directories and custom domains)
  const getAppBasePath = () => {
    const p = window.location.pathname;
    const knownRoutes = ['admin', 'student', 'home', 'courses', 'course-details', 'teacher', 'articles', 'news', 'contact', 'privacy', 'terms', 'admin-panel', 'student-panel', 'subscription-required', 'player'];
    const segments = p.split('/').filter(Boolean);
    if (segments.length > 0 && knownRoutes.includes(segments[segments.length - 1])) {
      segments.pop();
    }
    const base = '/' + segments.join('/') + (segments.length > 0 ? '/' : '');
    return base.startsWith('/') ? base : '/' + base;
  };

  // Synchronize on mount and handle direct url access routing
  useEffect(() => {
    const unsubAuth = authService.listenToAuthState((user) => {
      if (user) {
        if (user.role === 'admin') {
          setIsAdminLoggedIn(true);
          setIsStudentLoggedIn(false);
        } else {
          setIsStudentLoggedIn(true);
          setIsAdminLoggedIn(false);
        }
      } else {
        setIsAdminLoggedIn(false);
        setIsStudentLoggedIn(false);
      }
    });

    const handleUrlRouting = () => {
      // 1. Check query parameter ?p= or ?view= (from 404.html redirection or direct link)
      const searchParams = new URLSearchParams(window.location.search);
      const queryView = searchParams.get('p') || searchParams.get('view');
      const courseIdParam = searchParams.get('id') || searchParams.get('courseId') || sessionStorage.getItem('academy_selected_course_id');

      // 2. Check hash route e.g. #/admin or #admin
      const hashView = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0];

      // 3. Check pathname
      const fullPath = window.location.pathname.replace(/\/$/, '') || '/';
      const pathSegments = fullPath.split('/').filter(Boolean);
      const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';

      const effectiveRoute = (queryView ? queryView.replace(/^\//, '') : '') || hashView || lastSegment || 'home';

      if (effectiveRoute === 'admin' || effectiveRoute === 'admin-panel') {
        setCurrentView('admin-panel');
      } else if (effectiveRoute === 'student' || effectiveRoute === 'student-panel') {
        setCurrentView('student-panel');
      } else if (effectiveRoute === 'subscription-required') {
        setCurrentView('subscription-required');
      } else {
        const validViews = ['home', 'courses', 'course-details', 'teacher', 'articles', 'news', 'contact', 'privacy', 'terms', 'admin-panel', 'student-panel', 'subscription-required', 'player'];
        if (validViews.includes(effectiveRoute)) {
          setCurrentView(effectiveRoute);
        } else {
          setCurrentView('home');
        }
      }

      if (courseIdParam && courses.length > 0) {
        const found = courses.find(c => c.id === courseIdParam);
        if (found) {
          setSelectedCourse(found);
        }
      }
    };
    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => {
      unsubAuth();
      window.removeEventListener('popstate', handleUrlRouting);
    };
  }, []);

  // Keep selected course synchronized when courses array finishes fetching
  const selectedCourseId = selectedCourse?.id;
  useEffect(() => {
    if (courses.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const courseIdParam = searchParams.get('id') || searchParams.get('courseId') || sessionStorage.getItem('academy_selected_course_id');
      if (courseIdParam && selectedCourseId !== courseIdParam) {
        const found = courses.find(c => c.id === courseIdParam);
        if (found) {
          setSelectedCourse(found);
        }
      }
    }
  }, [courses, selectedCourseId]);

  // Guard admin routes without blocking public platform views
  useEffect(() => {
    if (currentView === 'admin-panel' && !isAdminLoggedIn) {
      if (isStudentLoggedIn) {
        handleNavigate('student-panel');
      } else {
        handleNavigate('home');
        setAuthTab('teacher');
        setIsAdminLoginOpen(true);
      }
    }
  }, [currentView, isAdminLoggedIn, isStudentLoggedIn]);

  useEffect(() => {
    fetchData();
    const unsubCourses = dbService.listenToCourses((realtimeCourses) => {
      setCourses(realtimeCourses);
    });
    const unsubSettings = dbService.listenToSettings((realtimeSettings) => {
      setSettings(realtimeSettings);
      if (realtimeSettings && realtimeSettings.forceLogoutVersion) {
        const forceVer = Number(realtimeSettings.forceLogoutVersion);
        localStorage.setItem('academy_global_force_logout_ver', String(forceVer));
        const activeUser = authService.getCurrentUser();
        if (activeUser && activeUser.role !== 'admin' && !isAdminEmail(activeUser.email || '')) {
          const userLoginTime = activeUser.lastLoginTimestamp || Date.now();
          if (userLoginTime < forceVer) {
            console.log("Global force logout triggered from settings listener!");
            authService.logout();
            setIsStudentLoggedIn(false);
            if (window.location.pathname.includes('student') || currentView === 'student-panel') {
              handleNavigate('home');
            }
            alert('تم إنهاء جميع جلسات الدخول وتسجيل الخروج من المنصة بواسطة إدارة المنصة الجامعية.');
          }
        }
      }
    });
    return () => {
      if (unsubCourses) unsubCourses();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  // Auth-scoped orders listener (only when authenticated)
  useEffect(() => {
    if (!isAdminLoggedIn && !isStudentLoggedIn) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    let unsubOrders: (() => void) | undefined;

    (async () => {
      await waitForFirebaseAuth();
      if (cancelled) return;
      if (dbService.isRealFirebase() && !firebaseAuth?.currentUser) {
        return;
      }
      const scopedStudentId = isAdminLoggedIn ? undefined : (firebaseAuth?.currentUser?.uid || authService.getCurrentUser()?.id);
      unsubOrders = dbService.listenToOrders((realtimeOrders) => {
        if (!cancelled) setOrders(realtimeOrders);
      }, scopedStudentId);
    })();

    return () => {
      cancelled = true;
      if (unsubOrders) unsubOrders();
    };
  }, [isAdminLoggedIn, isStudentLoggedIn]);

  useEffect(() => {
    if (selectedCourse?.id) {
      sessionStorage.setItem('academy_selected_course_id', selectedCourse.id);
    }
  }, [selectedCourse?.id]);

  useEffect(() => {
    if ((currentView === 'course-details' || currentView === 'player' || currentView === 'subscription-required') && selectedCourse) {
      const activeUser = authService.getCurrentUser();
      const access = verifyCourseAccess(activeUser, selectedCourse, orders);
      if (access.allowed && currentView === 'subscription-required') {
        setCurrentView('course-details');
      } else if (!access.allowed && (currentView === 'course-details' || currentView === 'player')) {
        if (access.reason === 'not_logged_in') {
          setStudentAuthMode('login');
          setIsStudentAuthOpen(true);
          setCurrentView('courses');
        } else {
          setCurrentView('subscription-required');
        }
      }
    }
  }, [currentView, selectedCourse, isStudentLoggedIn, orders]);

  // Social handles trigger
  const handleWhatsappTrigger = () => {
    if (!settings) return;
    let num = settings.whatsapp.replace(/\D/g, '');
    if (num.startsWith('0')) {
      num = '2' + num;
    }
    window.open(`https://wa.me/${num}`, '_blank');
  };

  const handleTelegramTrigger = () => {
    if (!settings) return;
    let username = settings.telegram.trim();
    username = username.replace('https://t.me/', '');
    username = username.replace('t.me/', '');
    username = username.replace('@', '');
    window.open(`https://t.me/${username}`, '_blank');
  };

  // Nav actions
  const handleNavigate = (view: string) => {
    setCurrentView(view);
    const basePath = getAppBasePath();
    let targetSegment = '';
    if (view === 'admin-panel') {
      targetSegment = 'admin';
    } else if (view === 'student-panel') {
      targetSegment = 'student';
    } else if (view === 'home') {
      targetSegment = '';
    } else {
      targetSegment = view;
    }

    const newUrl = targetSegment ? `${basePath}${targetSegment}` : basePath;
    try {
      window.history.pushState({}, '', newUrl);
    } catch (e) {
      console.warn("Could not pushState:", e);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCourseClick = (course: Course) => {
    const activeUser = authService.getCurrentUser();
    const access = verifyCourseAccess(activeUser, course, orders);
    setSelectedCourse(course);
    const basePath = getAppBasePath();

    if (!access.allowed) {
      if (access.reason === 'not_logged_in') {
        setStudentAuthMode('login');
        setIsStudentAuthOpen(true);
      } else {
        setCurrentView('subscription-required');
        try {
          window.history.pushState({}, '', `${basePath}subscription-required?id=${course.id}`);
        } catch (e) {
          console.warn("Could not pushState:", e);
        }
      }
      return;
    }
    try {
      window.history.pushState({}, '', `${basePath}course-details?id=${course.id}`);
    } catch (e) {
      console.warn("Could not pushState:", e);
    }
    setCurrentView('course-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateEmail = (emailStr: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const sanitizeInput = (text: string): string => {
    return text.replace(/[<>]/g, '').trim();
  };

  // Admin login process
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPassword = adminPassword.trim();

    if (cleanEmail !== 'mhmdbdaltwabalsdawy7@gmail.com' || cleanPassword !== 'MoJoker77') {
      setLoginError(language === 'ar' ? 'بيانات تسجيل دخول الإدارة غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.' : 'Invalid administrator credentials. Please check email and password.');
      return;
    }

    try {
      const res = await authService.loginAdmin(cleanEmail, cleanPassword);
      if (res.success && res.admin) {
        setIsAdminLoggedIn(true);
        setIsStudentLoggedIn(false);
        setIsAdminLoginOpen(false);
        setIsStudentAuthOpen(false);
        setAdminEmail('');
        setAdminPassword('');
        setLoginError('');
        setStudentAuthError('');
        handleNavigate('home');
      } else {
        setLoginError(res.error || (language === 'ar' ? 'فشل تسجيل الدخول. يرجى التأكد من كلمة المرور والبريد.' : 'Authentication Failed'));
      }
    } catch {
      setLoginError(language === 'ar' ? 'حدث خطأ غير متوقع أثناء تسجيل الدخول.' : 'Error logging in');
    }
  };

  const handleGoogleAuth = async (mode: 'admin' | 'student') => {
    setLoginError('');
    setStudentAuthError('');
    setStudentAuthSuccess('');
    setStudentAccountStatus('');
    try {
      const res = await authService.loginWithGoogle(mode);
      if (res.success && (res.admin || res.user?.role === 'admin')) {
        setIsAdminLoggedIn(true);
        setIsStudentLoggedIn(false);
        setIsAdminLoginOpen(false);
        setIsStudentAuthOpen(false);
        handleNavigate('home');
      } else if (res.success && res.user) {
        setIsStudentLoggedIn(true);
        setIsAdminLoggedIn(false);
        setIsStudentAuthOpen(false);
        setIsAdminLoginOpen(false);
        handleNavigate('student-panel');
      } else {
        if (mode === 'admin') {
          setLoginError(res.error || t('تعذر تسجيل الدخول عبر Google.', 'Google login failed.'));
        } else {
          if (res.accountStatus) setStudentAccountStatus(res.accountStatus);
          setStudentAuthError(res.error || t('تعذر تسجيل الدخول عبر Google.', 'Google login failed.'));
        }
      }
    } catch (err: any) {
      const msg = err?.message || t('تعذر تسجيل الدخول عبر Google.', 'Google login failed.');
      if (mode === 'admin') setLoginError(msg);
      else setStudentAuthError(msg);
    }
  };

  const handleAdminLogout = async () => {
    await authService.logoutAdmin();
    setIsAdminLoggedIn(false);
    setIsStudentLoggedIn(false);
    handleNavigate('home');
    setIsStudentAuthOpen(true);
  };

  // Student auth process handlers
  const handleStudentLogout = async () => {
    await authService.logout();
    setIsAdminLoggedIn(false);
    setIsStudentLoggedIn(false);
    handleNavigate('home');
    setIsStudentAuthOpen(true);
  };

  const handleStudentAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentAuthError('');
    setStudentAuthSuccess('');
    
    const name = sanitizeInput(studentAuthForm.name);
    const email = studentAuthForm.email.trim().toLowerCase();
    const password = studentAuthForm.password.trim();
    const phone = studentAuthForm.phone.trim();
    
    if (studentAuthMode === 'register') {
      if (!name || name.length < 3) {
        setStudentAuthError(language === 'ar' ? 'الاسم يجب أن لا يقل عن 3 أحرف.' : 'Name must be at least 3 characters.');
        return;
      }
      if (!phone || phone.length < 8 || !/^\+?[0-9\s-]+$/.test(phone)) {
        setStudentAuthError(language === 'ar' ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number.');
        return;
      }
    }

    if (!email || !validateEmail(email)) {
      setStudentAuthError(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setStudentAuthError(language === 'ar' ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' : 'Password must be at least 6 characters.');
      return;
    }
    
    try {
      setStudentAccountStatus('');
      if (studentAuthMode === 'login') {
        const res = await authService.loginUser(email, password);
        if (res.success && res.user) {
          if (res.user.role === 'admin') {
            setIsAdminLoggedIn(true);
            setIsStudentAuthOpen(false);
            setStudentAuthForm({ name: '', email: '', password: '', phone: '', grade: 'year1', semester: 'term1', department: 'IT' });
            handleNavigate('home');
          } else {
            setIsStudentLoggedIn(true);
            setIsStudentAuthOpen(false);
            setStudentAuthForm({ name: '', email: '', password: '', phone: '', grade: 'year1', semester: 'term1', department: 'IT' });
            handleNavigate('student-panel');
          }
        } else {
          if ((res as any).accountStatus) {
            setStudentAccountStatus((res as any).accountStatus);
          }
          setStudentAuthError(res.error || t('خطأ في تسجيل الدخول. تأكد من صحة البيانات.', 'Authentication failed. Please verify inputs.'));
        }
      } else {
        // Register Student (initially Pending Admin Approval)
        const res = await authService.registerUser(
          name, 
          email, 
          password, 
          'student', 
          phone, 
          studentAuthForm.grade || 'year1', 
          studentAuthForm.department || 'IT',
          studentAuthForm.semester || 'term1'
        );
        if (res.success && res.user) {
          setIsStudentLoggedIn(true);
          setIsStudentAuthOpen(false);
          setStudentAuthForm({ name: '', email: '', password: '', phone: '', grade: 'year1', semester: 'term1', department: 'IT' });
          handleNavigate('student-panel');
        } else {
          const msg = res.error || '';
          if (msg.includes('Pending') || msg.includes('مراجعة') || msg.includes('قيد')) {
            setStudentAccountStatus('pending');
            setStudentAuthSuccess(msg);
          } else {
            setStudentAuthError(msg || t('خطأ في التسجيل. قد يكون البريد مسجلاً مسبقاً.', 'Registration failed.'));
          }
        }
      }
    } catch (err: any) {
      setStudentAuthError(err.message || 'Error executing action');
    }
  };

  // Enrollment process
  const triggerEnroll = (course: Course, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEnrollingCourse(course);
    setEnrollForm({ name: '', email: '', phone: '' });
    setEnrollSuccess(false);
    setIsEnrollModalOpen(true);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollingCourse) return;

    const name = sanitizeInput(enrollForm.name);
    const email = enrollForm.email.trim().toLowerCase();
    const phone = enrollForm.phone.trim();

    if (!name || name.length < 3) {
      alert(language === 'ar' ? 'الاسم يجب أن لا يقل عن 3 أحرف.' : 'Name must be at least 3 characters.');
      return;
    }
    if (!email || !validateEmail(email)) {
      alert(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
      return;
    }
    if (!phone || phone.length < 8 || !/^\+?[0-9\s-]+$/.test(phone)) {
      alert(language === 'ar' ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number.');
      return;
    }

    setSubmittingEnroll(true);
    try {
      const activeStudentUser = authService.getCurrentUser();
      const courseTitle = language === 'ar' ? enrollingCourse.titleAr : enrollingCourse.titleEn;

      // Submit a 100% Free Course Activation Request for Administration review
      await dbService.addOrder({
        studentId: activeStudentUser?.id || ('stud_' + Date.now()),
        studentName: name,
        studentEmail: email,
        studentPhone: phone,
        courseId: enrollingCourse.id,
        courseTitle: courseTitle,
        pricePaid: 0,
        status: 'pending'
      });

      setEnrollSuccess(true);
      setTimeout(() => {
        setIsEnrollModalOpen(false);
        setEnrollSuccess(false);
        setEnrollForm({ name: '', email: '', phone: '' });
      }, 3500);
    } catch (err: any) {
      console.error("Activation request submission failed:", err);
      alert(language === 'ar' ? "حدث خطأ أثناء إرسال طلب التفعيل المجاني" : "Activation request failed");
    } finally {
      setSubmittingEnroll(false);
    }
  };

  // Contact message submit
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = sanitizeInput(contactForm.name);
    const email = contactForm.email.trim().toLowerCase();
    const phone = contactForm.phone.trim();
    const subject = sanitizeInput(contactForm.subject);
    const message = sanitizeInput(contactForm.message);

    if (!name || name.length < 3) {
      alert(language === 'ar' ? 'الاسم يجب أن لا يقل عن 3 أحرف.' : 'Name must be at least 3 characters.');
      return;
    }
    if (!email || !validateEmail(email)) {
      alert(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
      return;
    }
    if (!phone || phone.length < 8 || !/^\+?[0-9\s-]+$/.test(phone)) {
      alert(language === 'ar' ? 'يرجى إدخال رقم هاتف صحيح.' : 'Please enter a valid phone number.');
      return;
    }
    if (!subject || subject.length < 3) {
      alert(language === 'ar' ? 'الموضوع يجب أن لا يقل عن 3 أحرف.' : 'Subject must be at least 3 characters.');
      return;
    }
    if (!message || message.length < 10) {
      alert(language === 'ar' ? 'الرسالة يجب أن لا تقل عن 10 أحرف.' : 'Message must be at least 10 characters.');
      return;
    }

    setSubmittingContact(true);
    try {
      await dbService.addMessage({
        name,
        email,
        phone,
        subject,
        message
      });
      setContactSuccess(true);
      setContactForm({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setContactSuccess(false), 5000);
    } catch {
      alert("Failed to send message");
    } finally {
      setSubmittingContact(false);
    }
  };

  // Filter logic
  const filteredCourses = courses.filter(course => {
    // Hide unpublished/draft courses from students and public catalog
    if (course.published === false) return false;
    
    // If student is logged in and no specific grade category is selected ('all'), filter by student grade matching
    if (isStudentLoggedIn && selectedCategoryId === 'all') {
      const activeUser = authService.getCurrentUser();
      if (activeUser && (activeUser.grade || activeUser.department)) {
        if (!doesCourseMatchStudent(course, activeUser.grade, activeUser.department, categories)) {
          return false;
        }
      }
    }

    const matchesSearch = 
      course.titleAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.descriptionAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.subjectAr && course.subjectAr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.subjectEn && course.subjectEn.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const normSelectedCategory = normalizeGradeCode(selectedCategoryId);
    let matchesCategory = selectedCategoryId === 'all';
    if (!matchesCategory) {
      if (course.categoryId === selectedCategoryId || course.grade === selectedCategoryId) {
        matchesCategory = true;
      } else {
        const courseNormGrade = getGradeFromCourseOrCategory(course, categories);
        if (courseNormGrade && normSelectedCategory && courseNormGrade === normSelectedCategory) {
          matchesCategory = true;
        }
      }
    }

    const matchesSubject = selectedSubjectFilter === 'all' || (course.subject === selectedSubjectFilter || course.subjectAr === selectedSubjectFilter);

    return matchesSearch && matchesCategory && matchesSubject;
  });

  const featuredCourses = courses.filter(c => {
    if (!c.featured || c.published === false) return false;
    if (isStudentLoggedIn) {
      const activeUser = authService.getCurrentUser();
      if (activeUser && (activeUser.grade || activeUser.department)) {
        return doesCourseMatchStudent(c, activeUser.grade, activeUser.department, categories);
      }
    }
    return true;
  });

  const popularCourses = courses.filter(c => {
    if (!c.popular || c.published === false) return false;
    if (isStudentLoggedIn) {
      const activeUser = authService.getCurrentUser();
      if (activeUser && (activeUser.grade || activeUser.department)) {
        return doesCourseMatchStudent(c, activeUser.grade, activeUser.department, categories);
      }
    }
    return true;
  });

  // FAQs
  const faqs = [
    {
      qAr: 'ما هي المواد الدراسية المتاحة على المنصة لقسم تكنولوجيا المعلومات IT؟',
      qEn: 'What academic IT courses are available on the platform?',
      aAr: 'تنشر الإدارة المقررات الدراسية لقسم تكنولوجيا المعلومات حسب كل فرقة دراسية وفصل دراسي، شاملة المحاضرات والسكاشن والشيتات والامتحانات.',
      aEn: 'The administration publishes IT department courses organized by academic year and semester, complete with lectures, lab sections, sheets, and exams.'
    },
    {
      qAr: 'كيف أحصل على ملفات المحاضرات وسكاشن العملي والشيتات؟',
      qEn: 'How can I access lecture notes, lab sheets, and assignments?',
      aAr: 'تتوفر المحاضرات بصيغة PDF وسلايدز معتمدة للتحميل المباشر، وتتوفر سكاشن العملي وشيتات التمارين والتكليفات الأسبوعية بصيغة Word (.docx) و PDF قابلة للحل والتسليم الفوري.',
      aEn: 'Lectures are available as PDF documents and slides, while practical lab sections and weekly assignment sheets are provided in editable Word (.docx) and PDF formats.'
    },
    {
      qAr: 'كيف يتم تفعيل حساب الطالب لتحميل ملفات المحاضرات والسكاشن وحل الشيتات؟',
      qEn: 'How do I activate course access to download lecture and lab materials?',
      aAr: 'يمكنك إنشاء حساب طالب أو تسجيل الدخول ثم الضغط على "طلب تفعيل المادة الأكاديمية"، وتراجع الإدارة طلبك لتفعيل صلاحية الوصول الفوري لكافة ملفات المحاضرات والسكاشن والشيتات وبنك الامتحانات.',
      aEn: 'Create a student account or log in, then click "Request Course Activation". The administration will review and grant immediate access to all lecture, lab, and exam files.'
    },
    {
      qAr: 'هل يشتمل كل مقرر على قسم للامتحانات ونماذج الميدترم والفاينل وبنك الأسئلة؟',
      qEn: 'Does each course include an exam archive and past midterm & final papers?',
      aAr: 'نعم، يشتمل كل مقرر على قسم خاص بالشيتات والتكليفات المعملية، وقسم أرشيف الامتحانات وبنك الأسئلة التفاعلي مع نماذج حلول استرشادية لضمان التفوق الأكاديمي.',
      aEn: 'Yes, every course includes a dedicated section for weekly sheets and assignments, plus a past exams archive with sample solutions for midterm and final preparations.'
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-brand-cyan selection:text-white dark:selection:text-slate-950" style={{ direction }}>
      
      {/* Dynamic Background Mesh Grid */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20 grid-bg" />
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] z-0 h-[600px] w-[600px] rounded-full bg-cyan-500/5 dark:bg-cyan-900/10 blur-[150px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] z-0 h-[600px] w-[600px] rounded-full bg-emerald-500/5 dark:bg-emerald-950/10 blur-[150px]" />

      {/* Header component */}
      <Header
        onNavigate={handleNavigate}
        currentView={currentView}
        onSearch={(q) => { setSearchQuery(q); if(currentView !== 'courses' && q) handleNavigate('courses'); }}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onGoToAdminPanel={() => handleNavigate('admin-panel')}
        isStudentLoggedIn={isStudentLoggedIn}
        onOpenStudentAuth={() => { setStudentAuthMode('login'); setIsStudentAuthOpen(true); }}
        onGoToStudentDashboard={() => handleNavigate('student-panel')}
      />

      {/* Main Core Router View */}
      <main className="relative z-10 flex-grow">
        {loading ? (
          <div className="flex h-[70vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader className="h-10 w-10 animate-spin text-brand-cyan" />
              <p className="text-sm font-semibold font-mono text-slate-400">{t('جاري مزامنة المنصة التعليمية...', 'Syncing academy engine...')}</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: HOME PAGE */}
            {currentView === 'home' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pb-20"
              >
                {/* Hero Section */}
                <section className="relative overflow-hidden py-12 lg:py-20">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                      <div className="lg:col-span-7 text-center lg:text-right ltr:lg:text-left space-y-6">
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand-cyan">
                          {t('كلية تكنولوجيا الصناعة والطاقة · قسم تكنولوجيا المعلومات (IT)', 'Faculty of Industry & Energy Technology · IT Dept')}
                        </p>

                        <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-5xl tracking-tight leading-[1.15]">
                          {t('منصة MOHAMED ELJOKER التعليمية', 'MOHAMED ELJOKER IT University LMS')}
                        </h1>

                        <p className="max-w-2xl mx-auto lg:mx-0 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                          {t(
                            'منصة جامعية مجانية بالكامل بإشراف Eng/Mohamed abdal tawab لتنظيم المحاضرات والسكاشن العملية (PDF & Word) والامتحانات التفاعلية وبنك الأسئلة لطلاب قسم تكنولوجيا المعلومات.',
                            '100% Free university learning management system supervised by Eng/Mohamed abdal tawab for IT lectures, lab sections (PDF & Word), interactive exams, and question banks.'
                          )}
                        </p>

                        {/* 6 Core IT Subjects Quick Filter Strip */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                          {[
                            { id: 'Physics', label: 'Physics' },
                            { id: 'Python Programming', label: 'Python' },
                            { id: 'IT Essentials', label: 'IT Essentials' },
                            { id: 'Mathematics', label: 'Mathematics' },
                            { id: 'Cyber Security', label: 'Cyber Security' },
                            { id: 'English', label: 'English' }
                          ].map((subj) => (
                            <button
                              key={subj.id}
                              type="button"
                              onClick={() => {
                                setSelectedSubjectFilter(subj.id);
                                handleNavigate('courses');
                              }}
                              className="hover:text-brand-cyan transition-colors cursor-pointer underline decoration-brand-cyan/40 underline-offset-4"
                            >
                              {subj.label}
                            </button>
                          ))}
                        </div>

                        {/* CTAs */}
                        <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleNavigate('courses')}
                            className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3.5 text-xs font-extrabold transition-all shadow-md cursor-pointer flex items-center gap-2"
                          >
                            <BookOpen className="h-4 w-4" />
                            <span>{t('استعراض المقررات والمحاضرات', 'Browse IT Courses & Labs')}</span>
                          </button>
                          {isStudentLoggedIn ? (
                            <button
                              type="button"
                              onClick={() => handleNavigate('student-panel')}
                              className="rounded-xl border border-brand-cyan/40 bg-brand-cyan/10 hover:bg-brand-cyan/20 px-6 py-3.5 text-xs font-bold text-brand-cyan dark:text-brand-cyan-light transition-all cursor-pointer flex items-center gap-2"
                            >
                              <GraduationCap className="h-4 w-4" />
                              <span>{t('فتح لوحة الطالب', 'Open Student Dashboard')}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setAuthTab('student'); setStudentAuthMode('register'); setIsStudentAuthOpen(true); }}
                              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 hover:border-brand-cyan/50 px-6 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-2"
                            >
                              <GraduationCap className="h-4 w-4 text-brand-cyan" />
                              <span>{t('إنشاء حساب طالب جديد (مجاني)', 'Create Student Account')}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hero Editorial Laboratory Visual */}
                      <div className="lg:col-span-5">
                        <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xl bg-slate-900">
                          <img
                            src={HERO_IT_UNIVERSITY_IMG}
                            alt={t('معمل تكنولوجيا المعلومات بالجامعة التكنولوجية', 'Technological University IT Lab')}
                            className="w-full aspect-[16/10] object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                            <div>
                              <p className="font-extrabold">{t('بوابة قسم تكنولوجيا المعلومات', 'IT Department Academic Hub')}</p>
                              <p className="text-[11px] text-cyan-300 font-mono">Eng/Mohamed abdal tawab · IT Department</p>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-emerald-300">100% FREE</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Categories strip */}
                <section className="py-12 bg-slate-100/70 dark:bg-slate-950/30 border-y border-slate-200/60 dark:border-slate-800/50">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white text-center mb-8">
                      {t('تصفح حسب الفرقة الدراسية أو القسم الأكاديمي', 'Select Academic Year or Section')}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {categories.map((cat, idx) => (
                        <div
                          key={cat.id}
                          onClick={() => { setSelectedCategoryId(cat.id); handleNavigate('courses'); }}
                          className="group relative cursor-pointer overflow-hidden rounded-2xl glass border border-slate-200/80 dark:border-slate-800/80 p-5 hover:border-brand-cyan/40 transition-all flex items-center justify-between"
                        >
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-cyan transition-colors text-sm">{t(cat.nameAr, cat.nameEn)}</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t('محاضرات PDF وسكاشن Word وشيتات', 'PDF Lectures, Word Labs & Sheets')}</p>
                          </div>
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/10 text-brand-cyan">
                            {idx % 3 === 0 ? <Terminal className="h-5 w-5" /> : idx % 3 === 1 ? <Cpu className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Core IT Department Courses */}
                <section className="py-16">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <BookOpen className="h-6 w-6 text-brand-cyan" />
                          {t('مقررات قسم تكنولوجيا المعلومات (IT)', 'Core IT Department Courses')}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {t('جميع المواد متاحة مجاناً للطلاب المعتمدين شاملة المحاضرات والسكاشن والامتحانات', 'All courses are 100% free for approved IT students with lectures, labs, and exams')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleNavigate('courses')}
                        className="text-xs font-bold text-brand-cyan hover:text-brand-cyan-light flex items-center gap-1 cursor-pointer self-start"
                      >
                        {t('عرض جميع المقررات', 'View all courses')} &rarr;
                      </button>
                    </div>

                    {courses.filter(c => c.published !== false).length === 0 ? (
                      <div className="rounded-2xl glass border border-slate-200/80 dark:border-slate-800/80 p-12 text-center max-w-lg mx-auto">
                        <BookOpen className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                        <p className="font-bold text-slate-900 dark:text-white mb-1">
                          {t('لا توجد مقررات دراسية منشورة حالياً', 'No published courses available yet')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t('سيتم عرض المقررات فور إضافتها ونشرها من لوحة الإدارة.', 'Courses will appear here as soon as they are added by the administration.')}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {courses.filter(c => c.published !== false).slice(0, 6).map(course => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            category={categories.find(c => c.id === course.categoryId)}
                            onSelect={handleCourseClick}
                            onEnroll={(course, e) => triggerEnroll(course, e)}
                            user={authService.getCurrentUser()}
                            orders={orders}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* Supervisor Profile Section (Home) */}
                <section className="py-16 bg-slate-100/70 dark:bg-slate-950/40 relative overflow-hidden">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                      <div className="relative">
                        <div className="aspect-square max-w-md mx-auto rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 glass shadow-2xl relative">
                          <img
                            src={ENG_MOHAMED_AVATAR_IMG}
                            alt="Eng/Mohamed abdal tawab"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                          <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl glass-cyan">
                            <p className="text-sm font-bold text-cyan-200">{t('Eng/Mohamed abdal tawab – المشرف الأكاديمي لقسم تكنولوجيا المعلومات IT', 'Eng/Mohamed abdal tawab – Academic Supervisor, IT Dept')}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <span className="text-xs font-bold text-brand-cyan font-mono uppercase tracking-wider">{t('الجامعة التكنولوجية - قسم تكنولوجيا المعلومات', 'Technological University - IT Dept')}</span>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white">{t('MOHAMED ELJOKER', 'MOHAMED ELJOKER')}</h2>
                        
                        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                          {t(
                            'تركز منصة MOHAMED ELJOKER التعليمية على توفير بيئة تعليمية جامعية مجانية بالكامل لطلاب قسم تكنولوجيا المعلومات (IT)، من خلال تنظيم ونشر المحاضرات والسكاشن العملية بصيغ PDF و Word والامتحانات وشيتات المادة لتسهيل الاستيعاب والتفوق الدراسي.',
                            'MOHAMED ELJOKER Educational Platform provides a 100% free academic environment for IT students, delivering lectures, practical labs (PDF & Word), exams, and worksheets for academic excellence.'
                          )}
                        </p>

                        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                          {[
                            t('نزول دوري لمحاضرات ومقررات قسم تكنولوجيا المعلومات (IT) المنشورة عبر المنصة.', 'Regular release of lectures and accredited IT Department courses published on the platform.'),
                            t('سكاشن عملية وشيتات وتجارب معملية بصيغ Word (.docx) قابلة للتعديل والطباعة.', 'Practical lab sections and assignment sheets in editable Word (.docx) and PDF format.'),
                            t('ملخصات مركزة ونماذج امتحانات الميدترم والفاينل مع الإجابات النموذجية.', 'Focused summaries and past midterm & final exam archives with model answers.'),
                            t('مكتبة رقمية للمراجع والكتب وأكواد البرمجة الجاهزة والمشاريع التطبيقية.', 'Digital library with course textbooks, ready-to-run source code, and practical projects.'),
                            t('بوابة أكاديمية مخصصة للطلاب للمتابعة وتسليم التكليفات والتواصل المستمر.', 'Dedicated student portal for tracking progress, submitting assignments, and continuous interaction.')
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4.5 w-4.5 text-brand-cyan shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleNavigate('teacher')}
                          className="rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan dark:text-brand-cyan-light px-5 py-2.5 text-xs font-bold hover:bg-brand-cyan hover:text-white dark:hover:text-slate-950 transition-all cursor-pointer"
                        >
                          {t('اقرأ السيرة الذاتية الكاملة', 'Read Complete Bio & Strategy')}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>



                {/* FAQ Section */}
                <section className="py-16 bg-slate-50 dark:bg-slate-950/20">
                  <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-10 flex items-center justify-center gap-2">
                      <HelpCircle className="h-6 w-6 text-brand-cyan" />
                      {t('الأسئلة الشائعة وإجاباتها', 'Frequently Asked Questions')}
                    </h2>

                    <div className="space-y-3">
                      {faqs.map((faq, idx) => {
                        const isOpen = activeFaq === idx;
                        return (
                          <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 overflow-hidden transition-all shadow-xs">
                            <button
                              type="button"
                              onClick={() => setActiveFaq(isOpen ? null : idx)}
                              className="w-full text-right ltr:text-left p-4 font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex justify-between items-center gap-3 cursor-pointer"
                            >
                              <span>{t(faq.qAr, faq.qEn)}</span>
                              <span className="text-brand-cyan font-mono shrink-0">{isOpen ? '−' : '+'}</span>
                            </button>
                            {isOpen && (
                              <div className="p-4 pt-3 border-t border-slate-200/70 dark:border-slate-800/40 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {t(faq.aAr, faq.aEn)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

              </motion.div>
            )}

            {/* VIEW 2: COURSES LIST PAGE */}
            {currentView === 'courses' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12"
              >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  
                  {/* Headline */}
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-4xl">{t('المقررات والمناهج الجامعية', 'University Subjects & Curriculums')}</h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{t('تصفح المقررات الدراسية لجميع الفرق والمواد التخصصية بقسم IT', 'Browse academic subjects by academic year and department')}</p>
                  </div>

                  {/* Filters Bar: Grade Tabs + Subject Filter */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
                    {/* Grade Tabs */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId('all')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          selectedCategoryId === 'all' 
                            ? 'bg-brand-cyan text-white dark:text-slate-950 shadow-sm' 
                            : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {t('جميع الصفوف', 'All Grades')}
                      </button>
                      {ACADEMIC_GRADES.map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(g.id)}
                          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            selectedCategoryId === g.id 
                              ? 'bg-brand-cyan text-white dark:text-slate-950 shadow-sm' 
                              : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {t(g.nameAr, g.nameEn)}
                        </button>
                      ))}
                    </div>

                    {/* Subject Filter Dropdown */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">{t('المادة:', 'Subject:')}</span>
                      <select
                        value={selectedSubjectFilter}
                        onChange={e => setSelectedSubjectFilter(e.target.value)}
                        className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                      >
                        <option value="all">{t('جميع المواد', 'All Subjects')}</option>
                        {ACADEMIC_SUBJECTS.map(s => (
                          <option key={s.id} value={s.nameAr}>
                            {t(s.nameAr, s.nameEn)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Course grid */}
                  {filteredCourses.length === 0 ? (
                    <div className="rounded-2xl glass p-12 text-center max-w-md mx-auto">
                      <HelpCircle className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                      <p className="font-bold text-slate-900 dark:text-white mb-1">{t('لا توجد مقررات دراسية متاحة حالياً', 'No subjects currently available')}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('جرب البحث بكلمات أخرى أو تغيير القسم.', 'Try searching for other keywords or categories.')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredCourses.map(course => (
                        <CourseCard
                          key={course.id}
                          course={course}
                          category={categories.find(c => c.id === course.categoryId)}
                          onSelect={handleCourseClick}
                          onEnroll={(course, e) => triggerEnroll(course, e)}
                          user={authService.getCurrentUser()}
                          orders={orders}
                        />
                      ))}
                    </div>
                  )}

                </div>
              </motion.div>
            )}

            {/* VIEW 3: COURSE DETAILS PAGE */}
            {currentView === 'course-details' && selectedCourse && (() => {
              const access = verifyCourseAccess(authService.getCurrentUser(), selectedCourse, orders);
              if (!access.allowed) {
                return (
                  <SubscriptionRequiredView
                    course={selectedCourse}
                    onNavigateBack={() => handleNavigate('courses')}
                    onEnroll={(c, e) => triggerEnroll(c, e)}
                    onLogin={() => { setStudentAuthMode('login'); setIsStudentAuthOpen(true); }}
                    language={language}
                    reason={access.reason}
                  />
                );
              }

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12"
                >
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                  
                  {/* Back button */}
                  <button
                    onClick={() => handleNavigate('courses')}
                    className="mb-6 flex items-center gap-1 text-xs font-bold text-brand-cyan hover:text-brand-cyan-light transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    <span>{t('العودة لمقررات قسم IT', 'Back to IT courses')}</span>
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left side (Details, video, attachments) */}
                    <div className="lg:col-span-2 space-y-6 min-w-0">
                      
                      {/* Video Player placeholder */}
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden aspect-video relative shadow-xl">
                        <img 
                          src={selectedCourse.bannerUrl || selectedCourse.thumbnailUrl || HERO_IT_UNIVERSITY_IMG} 
                          alt="Banner" 
                          className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={() => {
                              const activeUser = authService.getCurrentUser();
                              const access = verifyCourseAccess(activeUser, selectedCourse, orders);
                              if (!access.allowed) {
                                if (access.reason === 'not_logged_in') {
                                  setStudentAuthMode('login');
                                  setIsStudentAuthOpen(true);
                                } else {
                                  setCurrentView('subscription-required');
                                }
                                return;
                              }
                              if (selectedCourse.videoUrl) {
                                setActiveVideoModalUrl(selectedCourse.videoUrl);
                              } else {
                                handleNavigate('student-panel');
                              }
                            }}
                            className="h-16 w-16 rounded-full bg-brand-cyan text-white dark:text-slate-950 flex items-center justify-center hover:scale-110 hover:bg-brand-cyan-light transition-all shadow-lg cursor-pointer"
                            title={t('تشغيل المحاضرة التعريفية', 'Play Course Intro')}
                          >
                            <Play className="h-6 w-6 fill-current ml-1" />
                          </button>
                        </div>
                        <div className="absolute bottom-4 right-4 bg-slate-950/85 px-3 py-1.5 rounded-xl text-[10px] text-cyan-300 font-bold border border-cyan-500/25">
                          {t('تشغيل الشرح أو الدخول للوحة الطالب', 'Play Intro or Open Student Hub')}
                        </div>
                      </div>

                      {/* Info Card */}
                      <div className="rounded-2xl glass p-6 space-y-4">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">{t(selectedCourse.titleAr, selectedCourse.titleEn)}</h1>
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          <span className="font-bold text-brand-cyan dark:text-brand-cyan-light">
                            {getGradeName(selectedCourse.grade, language)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-brand-cyan" />
                            {selectedCourse.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-brand-cyan" />
                            {selectedCourse.lessonsCount} {t('محاضرة وسكشن', 'Lectures & Labs')}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-200 dark:border-slate-800/60">
                          {t(selectedCourse.descriptionAr, selectedCourse.descriptionEn)}
                        </p>
                      </div>

                      {/* Course Curriculum preview */}
                      <div className="rounded-2xl glass p-6 space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('محتوى المقرر والوحدات الدراسية', 'Course Syllabus & Units')}</h3>
                        
                        <div className="space-y-2 text-xs">
                          {selectedCourse.units && selectedCourse.units.length > 0 ? (
                            selectedCourse.units.map((unit, index) => (
                              <div key={unit.id || index} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-bold text-slate-900 dark:text-white text-xs">{unit.title}</p>
                                  <span className="text-brand-cyan font-bold font-mono text-[10px] shrink-0">{t(`الوحدة #${index + 1}`, `Unit #${index + 1}`)}</span>
                                </div>
                                {unit.description && <p className="text-[11px] text-slate-500 dark:text-slate-400">{unit.description}</p>}
                                <div className="space-y-1 pt-1">
                                  {unit.lessons?.map((lsn, lIdx) => (
                                    <div key={lsn.id || lIdx} className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/60 text-[11px]">
                                      <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{lsn.title}</span>
                                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                                        {lsn.wordUrl && <span className="text-blue-600 dark:text-blue-400 font-bold">DOCX</span>}
                                        {lsn.pdfUrl && <span className="text-red-600 dark:text-red-400 font-bold">PDF</span>}
                                        <span className="text-slate-500 dark:text-slate-400 tabular-nums">{lsn.duration}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t('المحاضرات والسكاشن العملية متاحة بالكامل للطلاب المعتمدين.', 'Lectures and practical sections available to approved students.')}</p>
                          )}
                        </div>
                      </div>

                      {/* Attachments / PDFs */}
                      {(selectedCourse.pdfUrl || (selectedCourse.attachments && selectedCourse.attachments.length > 0)) && (
                        <div className="rounded-2xl glass p-6 space-y-3">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('ملفات المنهج والمذكرات المرفقة', 'Course Notes & Downloadable PDFs')}</h3>
                          
                          <div className="space-y-2">
                            {selectedCourse.pdfUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const activeUser = authService.getCurrentUser();
                                  const access = verifyCourseAccess(activeUser, selectedCourse, orders);
                                  if (!access.allowed) {
                                    if (access.reason === 'not_logged_in') {
                                      setStudentAuthMode('login');
                                      setIsStudentAuthOpen(true);
                                    } else {
                                      setCurrentView('subscription-required');
                                    }
                                    return;
                                  }
                                  triggerFileDownload(selectedCourse.pdfUrl, selectedCourse.titleAr || 'syllabus.pdf');
                                }}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-brand-cyan/10 border border-brand-cyan/25 text-xs text-brand-cyan dark:text-brand-cyan-light hover:bg-brand-cyan/15 transition-all cursor-pointer text-right ltr:text-left"
                              >
                                <span className="font-bold">{t('تحميل ملف المنهج الشامل PDF', 'Download Complete Syllabus PDF')}</span>
                                <Download className="h-4 w-4 shrink-0" />
                              </button>
                            )}

                            {selectedCourse.attachments?.map((attachment, idx) => (
                              <button 
                                key={idx} 
                                type="button"
                                onClick={() => {
                                  const activeUser = authService.getCurrentUser();
                                  const access = verifyCourseAccess(activeUser, selectedCourse, orders);
                                  if (!access.allowed) {
                                    if (access.reason === 'not_logged_in') {
                                      setStudentAuthMode('login');
                                      setIsStudentAuthOpen(true);
                                    } else {
                                      setCurrentView('subscription-required');
                                    }
                                    return;
                                  }
                                  triggerFileDownload(attachment, 'course_attachment.pdf');
                                }}
                                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20 hover:border-brand-cyan/30 transition-all cursor-pointer text-right ltr:text-left gap-2"
                              >
                                <span className="truncate">{attachment.split('/').pop()?.split('?')[0] || attachment}</span>
                                <span className="text-[10px] text-slate-500 font-mono shrink-0">PDF / DOCX</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Right side (100% Free Access & Supervisor details card) */}
                    <div className="space-y-6">
                      
                      {/* Access card */}
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-6 space-y-5 text-center shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          {t('إتاحة المقرر الأكاديمي', 'Academic Course Access')}
                        </span>
                        
                        <div className="flex flex-col items-center justify-center text-center">
                          <span className="text-2xl font-black text-brand-cyan dark:text-brand-cyan-light font-mono flex items-center justify-center gap-1.5">
                            <Sparkles className="h-5 w-5 text-brand-cyan" />
                            {t('مجاني 100%', '100% Free')}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {t('جميع المحاضرات والسكاشن متاحة مجاناً للطلاب المعتمدين', 'All lectures & lab files are completely free for approved students')}
                          </span>
                        </div>

                        {(() => {
                          const access = verifyCourseAccess(authService.getCurrentUser(), selectedCourse, orders);
                          if (access.allowed) {
                            return (
                                <button
                                  type="button"
                                  onClick={() => handleNavigate('student-panel')}
                                  className="w-full rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-3 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>{t('فتح المقرر في لوحة الطالب', 'Open in Student Hub')}</span>
                                </button>
                              );
                            }
                            if (access.reason === 'pending_approval') {
                              return (
                                <button
                                  type="button"
                                  disabled
                                  className="w-full rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-default"
                                >
                                  <Clock className="h-4 w-4 shrink-0" />
                                  <span>{t('حسابك قيد المراجعة الأكاديمية', 'Account Pending Review')}</span>
                                </button>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={(e) => triggerEnroll(selectedCourse, e)}
                                className="w-full rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light py-3 text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                              >
                                <span>{t('طلب تفعيل الوصول المجاني للمادة', 'Request Free Course Access')}</span>
                              </button>
                            );
                          })()}

                          <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400 text-right ltr:text-left">
                            <p>• {t('تفعيل مجاني لتحميل ملفات المحاضرات (PDF) والسكاشن (Word)', 'Free access to lecture PDFs and lab Word sheets')}</p>
                            <p>• {t('إشراف أكاديمي مباشر من Eng/Mohamed abdal tawab', 'Academic supervision by Eng/Mohamed abdal tawab')}</p>
                            <p>• {t('قسم الشيتات والامتحانات التفاعلية وبنك الأسئلة', 'Weekly lab sheets, interactive exams & question bank')}</p>
                          </div>
                        </div>

                      {/* Instructor details short */}
                      <div className="rounded-2xl glass p-5 text-xs text-center space-y-3">
                        <div className="h-14 w-14 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 mx-auto bg-slate-100 dark:bg-slate-900">
                          <img 
                            src={ENG_MOHAMED_AVATAR_IMG} 
                            alt="Eng/Mohamed abdal tawab" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedCourse.teacherName}</p>
                          <p className="text-[10px] text-brand-cyan dark:text-brand-cyan-light mt-0.5">{t('الجامعة التكنولوجية - قسم تكنولوجيا المعلومات IT', 'Technological University - IT Department')}</p>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                          {t('يقدم المهندس محمد عبد التواب كافة المحاضرات وسكاشن العملي والشيتات التخصصية لتمكين طلاب قسم IT من التفوق والتميز الدراسي والعملي.', 'Eng/Mohamed abdal tawab provides comprehensive lectures, lab sections, and practice sheets to empower IT students to achieve academic and practical excellence.')}
                        </p>
                      </div>

                    </div>

                  </div>

                </div>
              </motion.div>
            );
          })()}

            {/* VIEW: SUBSCRIPTION REQUIRED PAGE */}
            {currentView === 'subscription-required' && selectedCourse && (() => {
              const access = verifyCourseAccess(authService.getCurrentUser(), selectedCourse, orders);
              return (
                <SubscriptionRequiredView
                  course={selectedCourse}
                  onNavigateBack={() => handleNavigate('courses')}
                  onEnroll={(c, e) => triggerEnroll(c, e)}
                  onLogin={() => { setStudentAuthMode('login'); setIsStudentAuthOpen(true); }}
                  language={language}
                  reason={access.reason}
                />
              );
            })()}

            {/* VIEW 4: TEACHER PROFILE PAGE */}
            {currentView === 'teacher' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12"
              >
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                  <div className="rounded-2xl glass p-6 md:p-10 space-y-8">
                    
                    <div className="flex flex-col md:flex-row gap-8 items-center border-b border-slate-200 dark:border-slate-800/80 pb-8">
                      <div className="aspect-square h-40 w-40 shrink-0 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-xl">
                        <img 
                          src={ENG_MOHAMED_AVATAR_IMG} 
                          alt="Eng/Mohamed abdal tawab" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-2 text-center md:text-right ltr:text-left">
                        <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider font-mono">Technological University Platform</span>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">{t('منصة MOHAMED ELJOKER التعليمية', 'MOHAMED ELJOKER Platform')}</h1>
                        <p className="text-sm text-brand-cyan dark:text-brand-cyan-light font-bold font-arabic">{t('الجامعة التكنولوجية - قسم تكنولوجيا المعلومات (IT) | منصة المحاضرات والسكاشن', 'Technological University - IT Department | Lectures & Labs Hub')}</p>
                      </div>
                    </div>

                    <div className="space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="h-5 w-5 text-brand-cyan" />
                        {t('عن المنصة والأهداف الأكاديمية لقسم IT', 'Platform Vision & IT Academic Goals')}
                      </h3>

                      <p>
                        {t(
                          'تأسست منصة MOHAMED ELJOKER التعليمية لتكون المرجع الأكاديمي الرقمي المجاني المتكامل لطلاب الجامعة التكنولوجية بقسم تكنولوجيا المعلومات (Information Technology). تهدف المنصة إلى تنظيم ونشر المحاضرات والسكاشن بصيغ PDF و Word والامتحانات وشيتات المادة لتسهيل الاستيعاب والتفوق الدراسي.',
                          'MOHAMED ELJOKER Platform was built as the integrated digital academic reference for Technological University IT students, facilitating access to lectures, practical lab sections, exams, and sheets.'
                        )}
                      </p>

                      <p>
                        {t(
                          'تتيح المنصة للإدارة إضافة وتنظيم جميع المقررات الأكاديمية لقسم تكنولوجيا المعلومات (IT) حسب الفرق والفصول الدراسية مع المحاضرات والسكاشن والامتحانات والشيتات.',
                          'The platform enables the administration to organize and publish accredited IT Department courses by academic year and semester with lectures, labs, exams, and sheets.'
                        )}
                      </p>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
                          <p className="font-bold text-slate-900 dark:text-white mb-2">📄 {t('محاضرات وسلايدز PDF معتمدة', 'Accredited PDF Lectures & Slides')}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{t('ملفات مذكرات وعروض تقديمية واضحة وشاملة لجميع المحاضرات النظرية مع إمكانية القراءة والتحميل الفوري.', 'High quality lecture notes and slides for all theoretical courses with instant preview and download.')}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
                          <p className="font-bold text-slate-900 dark:text-white mb-2">📝 {t('سكاشن وشيتات Word (.docx)', 'Practical Word Lab Sheets')}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{t('ملفات شيتات السكاشن العملية وتجارب المعامل بصيغ مايكروسوفت وورد قابلة للتعديل والحل المباشر والتسليم.', 'Practical lab sheets and assignment templates in Word format, ready for direct editing, solving, and submission.')}</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}



            {/* VIEW 7: CONTACT PAGE */}
            {currentView === 'contact' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12"
              >
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                  
                  <div className="text-center max-w-xl mx-auto mb-10">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-4xl">{t('تواصل مع المنصة الأكاديمية لقسم IT', 'Contact Eng/Mohamed abdal tawab Platform')}</h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{t('يسعدنا تواصل الطلاب لطرح أي استفسارات أكاديمية حول المقررات والمحاضرات والسكاشن', 'Have queries about courses, lectures, or practical lab sheets? Reach out anytime.')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    
                    {/* Contact Info column */}
                    <div className="md:col-span-2 space-y-4">
                      
                      <div className="rounded-2xl glass p-5 space-y-5 text-xs">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('قنوات التواصل المباشرة', 'Direct Channels')}</h3>
                        
                        <div className="flex gap-3 items-center">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-brand-cyan border border-slate-200 dark:border-slate-800 text-lg">
                            📞
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white">{t('واتساب التواصل والدعم الفني', 'Academic Support WhatsApp')}</p>
                            <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-mono select-all break-all">{settings && settings.whatsapp ? settings.whatsapp : 'https://wa.me/201010298878'}</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-center">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-brand-cyan border border-slate-200 dark:border-slate-800 text-lg">
                            ✈️
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white">{t('قناة التليجرام والمناقشات', 'Telegram Channel')}</p>
                            <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-mono select-all break-all">{settings && settings.telegram ? settings.telegram : 'https://t.me/mohamed_abdal_tawab'}</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-center">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-brand-cyan border border-slate-200 dark:border-slate-800 text-lg">
                            📍
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{t('المقر والجهة الأكاديمية', 'Academic Department')}</p>
                            <p className="text-slate-600 dark:text-slate-400 mt-0.5">{t('الجامعة التكنولوجية - قسم تكنولوجيا المعلومات (IT)', 'Technological University - IT Department')}</p>
                          </div>
                        </div>

                        {/* Quick Interactive Clickable Buttons */}
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 space-y-2">
                          <p className="font-bold text-slate-900 dark:text-white mb-1.5">{t('محادثة فورية بنقرة واحدة:', 'Instant One-Click Contact:')}</p>
                          
                          <button
                            type="button"
                            onClick={handleWhatsappTrigger}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 font-bold transition-all shadow-md cursor-pointer"
                          >
                            <Phone className="h-4 w-4 fill-white" />
                            {t('تواصل معنا عبر واتساب', 'Chat on WhatsApp')}
                          </button>

                          <button
                            type="button"
                            onClick={handleTelegramTrigger}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white py-2.5 font-bold transition-all shadow-md cursor-pointer"
                          >
                            <Send className="h-4 w-4 fill-white mr-0.5" />
                            {t('انضم لقناتنا على تليجرام', 'Join Telegram Channel')}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Contact Form column */}
                    <div className="md:col-span-3">
                      <form onSubmit={handleContactSubmit} className="rounded-2xl glass p-6 md:p-8 space-y-4 text-xs text-slate-700 dark:text-slate-300">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('أرسل استفسارك وسنعاود الاتصال بك', 'Drop an Inquiry Message')}</h3>
                        
                        {contactSuccess && (
                          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                            ✓ {t('تم إرسال رسالتك بنجاح المزامنة! سنقوم بالتواصل معك عبر الواتساب أو الهاتف قريباً.', 'Your inquiry message sent successfully! We will contact you soon.')}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('اسمك بالكامل', 'Your Name')}</label>
                            <input
                              type="text"
                              required
                              value={contactForm.name}
                              onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                            />
                          </div>
                          <div>
                            <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('رقم الموبايل (يفضل واتساب)', 'Mobile Number')}</label>
                            <input
                              type="text"
                              required
                              value={contactForm.phone}
                              onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('البريد الإلكتروني', 'Email Address')}</label>
                            <input
                              type="email"
                              required
                              value={contactForm.email}
                              onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('موضوع الاستفسار (مثال: استفسار حول مقرر أو محاضرة قسم IT)', 'Subject (e.g. IT Course or Lecture Inquiry)')}</label>
                            <input
                              type="text"
                              required
                              value={contactForm.subject}
                              onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('تفاصيل رسالتك أو استفسارك', 'Your message details')}</label>
                            <textarea
                              required
                              rows={4}
                              value={contactForm.message}
                              onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submittingContact}
                          className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3.5 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
                        >
                          {submittingContact ? t('جاري إرسال الرسالة...', 'Submitting...') : t('إرسال الاستفسار والاتصال', 'Send Inquiry')}
                        </button>
                      </form>
                    </div>

                  </div>

                </div>
              </motion.div>
            )}

            {/* VIEW 8: TERMS PAGE */}
            {currentView === 'terms' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12"
              >
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                  <div className="rounded-2xl glass p-6 md:p-8 space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">{t('لوائح المنصة الأكاديمية وصلاحية تحميل المحاضرات والسكاشن', 'Terms & Regulations of Course File Access')}</h1>
                    <p className="text-slate-500 font-mono">Last updated: Academic Year 2026</p>
                    
                    <p>{t('برجاء قراءة اللوائح الأكاديمية المنظمة لاستخدام منصة Eng/Mohamed abdal tawab بالجامعة التكنولوجية لقسم تكنولوجيا المعلومات IT:', 'Please review the academic regulations governing the use of Eng/Mohamed abdal tawab’s IT University Platform:')}</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('١. صلاحية استخدام المواد الأكاديمية والملفات', '1. Academic Materials Usage License')}</h3>
                    <p>{t('عند تفعيل المقرر للطالب، يُمنح صلاحية أكاديمية للاطلاع وتحميل ملفات المحاضرات النظرية (PDF) وشيتات السكاشن العملية (Word .docx) وحل التكليفات والامتحانات للمقررات المعتمدة. يحظر إعادة نشر أو بيع المحتوى الأكاديمي لجهات تجارية خارجية.', 'Active course access grants the student personal permission to access and download lecture notes, practical Word lab sheets, and assignments for accredited courses.')}</p>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('٢. تفعيل المواد الدراسية وقسم الامتحانات', '2. Course Activation & Exam System')}</h3>
                    <p>{t('يتم تفعيل الوصول إلى ملفات السكاشن والمحاضرات وحل الشيتات وبنك أسئلة الامتحانات بعد مراجعة حساب الطالب من قبل الإدارة لضمان انتظام العملية التعليمية لطلاب قسم IT.', 'File access and exam submissions are activated once student credentials are verified by the department administration.')}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 9: PRIVACY POLICY */}
            {currentView === 'privacy' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12"
              >
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                  <div className="rounded-2xl glass p-6 md:p-8 space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">{t('سياسة الخصوصية وأمن بيانات الطلاب', 'Student Privacy Policy')}</h1>
                    <p className="text-slate-500 font-mono">Last updated: Academic Year 2026</p>
                    
                    <p>{t('تلتزم منصة Eng/Mohamed abdal tawab الأكاديمية بالجامعة التكنولوجية بأعلى معايير حماية بيانات الطلاب وخصوصيتهم:', 'We strictly protect the privacy and records of our university students:')}</p>
                    
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('١. البيانات الأكاديمية المسجلة', '1. Collected Academic Data')}</h3>
                    <p>{t('نجمع بيانات الاسم، والبريد الإلكتروني، ورقم الواتساب، والفرقة الدراسية بقسم تكنولوجيا المعلومات لغرض تفعيل المقررات ومتابعة تسليمات الشيتات وحلول الامتحانات.', 'We securely collect student name, academic email, contact numbers, and year level to activate courses and record assignment submissions.')}</p>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('٢. سرية المعلومات وحمايتها', '2. Data Protection')}</h3>
                    <p>{t('لا يتم بيع أو مشاركة بيانات الطلاب مع أي جهة خارجية، وتظل محفوظة بأعلى معايير الحماية والتشفير بقواعد بياناتنا السحابية المزامنة.', 'No student data is sold or shared with third parties. Databases are encrypted and stored in safe synchronized cloud configurations.')}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 11: STUDENT DASHBOARD PANELS */}
            {currentView === 'student-panel' && (
              isStudentLoggedIn ? (
                <StudentDashboard onLogout={handleStudentLogout} onNavigateHome={() => handleNavigate('courses')} />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="py-16 flex items-center justify-center min-h-[75vh]"
                >
                  <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 md:p-8 shadow-xl glass mx-4">
                    <div className="text-center mb-6">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-2xl mx-auto mb-3">
                        🎓
                      </span>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{t('بوابة الطالب التعليمية', 'Student Learning Portal')}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('سجل دخولك لمتابعة المحاضرات والسكاشن وحل الامتحانات والشيتات الجامعية', 'Access academic resources, online exams, and lecture/section sheets')}</p>
                    </div>

                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => { setStudentAuthMode('login'); setIsStudentAuthOpen(true); }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light py-3.5 font-bold transition-all cursor-pointer shadow-md text-xs sm:text-sm"
                      >
                        {t('تسجيل الدخول كطالب', 'Login to Student Account')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStudentAuthMode('register'); setIsStudentAuthOpen(true); }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800/80 text-slate-800 dark:text-white py-3.5 font-bold transition-all cursor-pointer text-xs sm:text-sm"
                      >
                        {t('إنشاء حساب طالب جديد', 'Register New Student Account')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            )}

            {/* VIEW 10: ADMIN PANEL CONSOLE wrapper with secure login gate */}
            {currentView === 'admin-panel' && (
              isAdminLoggedIn ? (
                <AdminPanel onLogout={handleAdminLogout} />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="py-16 flex items-center justify-center min-h-[75vh]"
                >
                  <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 md:p-8 shadow-xl glass mx-4">
                    <div className="text-center mb-6">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-2xl mx-auto mb-3">
                        🔐
                      </span>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{t('تسجيل الدخول للمسؤولين', 'Administrator Login')}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('بوابة إدارة محتوى منصة MOHAMED ELJOKER التعليمية', 'Secure gateway for MOHAMED ELJOKER Platform')}</p>
                    </div>

                    <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {loginError && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5 text-xs">
                          <ShieldAlert className="h-4.5 w-4.5" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('البريد الإلكتروني للمدير', 'Admin Email')}</label>
                        <input
                          type="email"
                          required
                          placeholder="admin@example.com"
                          value={adminEmail}
                          onChange={e => setAdminEmail(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('كلمة المرور الآمنة', 'Password')}</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light py-3.5 font-bold transition-all cursor-pointer shadow-md text-xs sm:text-sm"
                      >
                        {t('الولوج الآمن لقاعدة البيانات', 'Access Board Controls')}
                      </button>
                    </form>
                  </div>
                </motion.div>
              )
            )}

          </AnimatePresence>
        )}
      </main>

      {/* Footer Component */}
      {currentView !== 'admin-panel' && settings && (
        <Footer settings={settings} onNavigate={handleNavigate} />
      )}

      {/* Floating Speed Dial Action Menu (+) */}
      {isSpeedDialOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] transition-opacity duration-250"
          onClick={() => setIsSpeedDialOpen(false)}
        />
      )}

      <div className={`fixed bottom-6 left-4 sm:left-6 z-50 flex-col items-start gap-3 pointer-events-auto ${currentView === 'student-panel' ? 'hidden lg:flex' : 'flex'}`}>
        <AnimatePresence>
          {isSpeedDialOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.75, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.75, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start gap-3 mb-1"
            >
              {/* 1. Theme Toggle Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    setIsSpeedDialOpen(false);
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 text-slate-900 dark:text-white hover:scale-110 active:scale-95 transition-all shadow-xl hover:border-brand-cyan hover:text-brand-cyan cursor-pointer text-lg"
                  title={theme === 'light' ? t('تفعيل الوضع الليلي', 'Switch to Dark Mode') : t('تفعيل الوضع النهاري', 'Switch to Light Mode')}
                  aria-label="Toggle Theme"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/95 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/80 text-xs font-semibold shadow-lg backdrop-blur-md select-none pointer-events-none">
                  {theme === 'light' ? t('🌙 تغيير المظهر (ليلي)', '🌙 Dark Mode') : t('☀️ تغيير المظهر (نهاري)', '☀️ Light Mode')}
                </span>
              </div>

              {/* 2. WhatsApp Button */}
              {currentView !== 'admin-panel' && settings && settings.whatsapp && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleWhatsappTrigger();
                      setIsSpeedDialOpen(false);
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-110 active:scale-95 transition-all shadow-xl relative group cursor-pointer"
                    title={t('تواصل معنا عبر واتساب', 'Contact on WhatsApp')}
                  >
                    <Phone className="h-5 w-5 fill-white" />
                  </button>
                  <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/95 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold shadow-lg backdrop-blur-md select-none pointer-events-none">
                    {t('📱 واتساب', '📱 WhatsApp')}
                  </span>
                </div>
              )}

              {/* 3. Telegram Button */}
              {currentView !== 'admin-panel' && settings && settings.telegram && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleTelegramTrigger();
                      setIsSpeedDialOpen(false);
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-400 hover:scale-110 active:scale-95 transition-all shadow-xl cursor-pointer"
                    title={t('تابعنا على قناة التليجرام', 'Join Telegram Channel')}
                  >
                    <Send className="h-5 w-5 fill-white mr-0.5" />
                  </button>
                  <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/95 text-sky-700 dark:text-cyan-400 border border-cyan-500/30 text-xs font-semibold shadow-lg backdrop-blur-md select-none pointer-events-none">
                    {t('✈️ تيليجرام', '✈️ Telegram')}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Speed Dial Trigger (+) Button */}
        <button
          type="button"
          onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)}
          className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 hover:scale-105 active:scale-95 transition-all duration-250 shadow-2xl shadow-cyan-500/30 border-2 border-white/40 cursor-pointer z-50"
          title={isSpeedDialOpen ? t('إغلاق القائمة', 'Close Menu') : t('القائمة العائمة', 'Actions Menu')}
          aria-label="Toggle Floating Action Menu"
        >
          <Plus
            className={`h-6 w-6 stroke-[3] transition-transform duration-300 ${
              isSpeedDialOpen ? 'rotate-[135deg]' : 'rotate-0'
            }`}
          />
        </button>
      </div>

      {/* Unified Dual Login Modal (Student Login & Administrator Login) */}
      {(isStudentAuthOpen || isAdminLoginOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 dark:bg-[#090d16]/90 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 sm:p-7 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            
            {/* Close Button - Always available so visitors can browse freely */}
            <button
              type="button"
              onClick={() => {
                setIsStudentAuthOpen(false);
                setIsAdminLoginOpen(false);
                setLoginError('');
                setStudentAuthError('');
                setStudentAuthSuccess('');
                setStudentAccountStatus('');
              }}
              className="absolute top-3.5 left-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Dual Login Option Tabs */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 mb-6 font-bold text-xs mt-6 sm:mt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('student');
                  setStudentAuthError('');
                  setLoginError('');
                }}
                className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${
                  authTab === 'student'
                    ? 'bg-brand-cyan text-white dark:text-slate-950 shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🎓 {t('دخول الطالب', 'Student Login')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('teacher');
                  setStudentAuthError('');
                  setLoginError('');
                }}
                className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${
                  authTab === 'teacher'
                    ? 'bg-brand-cyan text-white dark:text-slate-950 shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🛡️ {t('دخول الإدارة', 'Admin Login')}
              </button>
            </div>

            {/* TAB 1: ADMINISTRATOR LOGIN */}
            {authTab === 'teacher' && (
              <>
                <div className="text-center mb-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-xl mx-auto mb-2">
                    🔐
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {t('تسجيل دخول الإدارة والمشرف الأكاديمي', 'Administrator Login')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {t('بوابة إدارة المقررات والطلاب لم. محمد عبد التواب', 'University LMS & Student Administration')}
                  </p>
                </div>

                <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                  {loginError && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5 text-[11px]">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('البريد الإلكتروني للإدارة', 'Administrator Email')}</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@university.edu"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('كلمة المرور', 'Password')}</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light py-3 font-bold transition-all cursor-pointer shadow-md text-xs"
                  >
                    {t('تسجيل الدخول كمدير للنظام', 'Login as Administrator')}
                  </button>

                  {dbService.isRealFirebase() && (
                    <button
                      type="button"
                      onClick={() => handleGoogleAuth('admin')}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white py-2.5 font-bold transition-all cursor-pointer text-xs"
                    >
                      🔐 {t('الدخول بحساب Google (للإدارة)', 'Sign in with Google (Admin)')}
                    </button>
                  )}

                  <div className="text-center pt-2 text-[10px] text-slate-500 border-t border-slate-200 dark:border-slate-900/60">
                    <p>{t('يتم التحقق من رتبة الحساب (role == "admin") في قاعدة البيانات فور تسجيل الدخول.', 'Role (role == "admin") is strictly verified in Firestore upon login.')}</p>
                  </div>
                </form>
              </>
            )}

            {/* TAB 2: STUDENT LOGIN & REGISTRATION */}
            {authTab === 'student' && (
              <>
                <div className="text-center mb-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-xl mx-auto mb-2">
                    {studentAuthMode === 'login' ? '🔑' : '📝'}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {studentAuthMode === 'login' 
                      ? t('بوابة تسجيل دخول الطلاب', 'Student Login Portal') 
                      : t('إنشاء حساب طالب جديد', 'Student Registration')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {studentAuthMode === 'login' 
                      ? t('تابع دروسك واختباراتك التفاعلية', 'Continue your lessons and interactive tests') 
                      : t('سجل الآن لتبدأ رحلة التعلم في منصة MOHAMED ELJOKER التعليمية', 'Join us to begin your learning journey on MOHAMED ELJOKER Platform')}
                  </p>
                </div>

                <form onSubmit={handleStudentAuthSubmit} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                  {studentAuthSuccess && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-amber-800 dark:text-amber-200 space-y-2 text-[11px]">
                      <div className="flex items-center gap-1.5 font-extrabold text-amber-700 dark:text-amber-300">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{t('تم استلام طلبك (الحالة: قيد المراجعة Pending)', 'Request Received (Status: Pending)')}</span>
                      </div>
                      <p className="leading-relaxed">{studentAuthSuccess}</p>
                      <a
                        href={`https://wa.me/201010298878?text=${encodeURIComponent('مرحباً، قمت بتسجيل حساب جديد في منصة MOHAMED ELJOKER وأرجو مراجعة وتفعيل الحساب.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-1"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{t('تواصل عبر واتساب لتسريع الاعتماد', 'Contact Admin on WhatsApp')}</span>
                      </a>
                    </div>
                  )}

                  {studentAuthError && (
                    <div className={`rounded-xl border p-3.5 font-bold space-y-2 text-[11px] ${
                      studentAccountStatus === 'pending'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                        : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <span>{studentAuthError}</span>
                      </div>
                      {studentAccountStatus && (
                        <a
                          href={`https://wa.me/201010298878?text=${encodeURIComponent('مرحباً، أستفسر عن حالة حسابي في منصة MOHAMED ELJOKER.')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>{t('تواصل مع الإدارة عبر واتساب', 'Contact Admin via WhatsApp')}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {studentAuthMode === 'register' && (
                    <div>
                      <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('الاسم الثلاثي للطالب', 'Full Name')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('مثال: أحمد محمد علي', 'e.g. Ahmed Mohamed')}
                        value={studentAuthForm.name}
                        onChange={e => setStudentAuthForm({ ...studentAuthForm, name: e.target.value })}
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('البريد الإلكتروني للطالب', 'Student Email')}</label>
                    <input
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={studentAuthForm.email}
                      onChange={e => setStudentAuthForm({ ...studentAuthForm, email: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  {studentAuthMode === 'register' && (
                    <>
                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('رقم الموبايل / الواتساب', 'WhatsApp Number')}</label>
                        <input
                          type="tel"
                          required
                          placeholder="01010298878"
                          value={studentAuthForm.phone}
                          onChange={e => setStudentAuthForm({ ...studentAuthForm, phone: e.target.value })}
                          className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('الفرقة الدراسية', 'Academic Year')}</label>
                        <select
                          value={studentAuthForm.grade}
                          onChange={e => setStudentAuthForm({ ...studentAuthForm, grade: e.target.value })}
                          className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                        >
                          {ACADEMIC_GRADES.map(g => (
                            <option key={g.id} value={g.id}>
                              {t(g.nameAr, g.nameEn)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('الفصل الدراسي', 'Academic Semester')}</label>
                        <select
                          value={studentAuthForm.semester || 'term1'}
                          onChange={e => setStudentAuthForm({ ...studentAuthForm, semester: e.target.value })}
                          className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                        >
                          {ACADEMIC_SEMESTERS.map(s => (
                            <option key={s.id} value={s.id}>
                              {t(s.nameAr, s.nameEn)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('التخصص / المسار الدراسي', 'IT Department Track')}</label>
                        <select
                          value={studentAuthForm.department}
                          onChange={e => setStudentAuthForm({ ...studentAuthForm, department: e.target.value })}
                          className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                        >
                          <option value="IT">{t('قسم تكنولوجيا المعلومات العام (IT)', 'General Information Technology (IT)')}</option>
                          <option value="networks">{t('مسار الشبكات والأمن السيبراني', 'Networks & Cyber Security Track')}</option>
                          <option value="software">{t('مسار البرمجيات وتطوير الأنظمة', 'Software & Systems Development')}</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('كلمة المرور الآمنة', 'Password')}</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={studentAuthForm.password}
                      onChange={e => setStudentAuthForm({ ...studentAuthForm, password: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light py-3 font-bold transition-all cursor-pointer shadow-md text-xs"
                  >
                    {studentAuthMode === 'login' 
                      ? t('الدخول إلى المنصة الجامعية', 'Login as Student') 
                      : t('تسجيل حساب طالب جديد', 'Register New Student')}
                  </button>

                  {dbService.isRealFirebase() && (
                    <button
                      type="button"
                      onClick={() => handleGoogleAuth('student')}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white py-2.5 font-bold transition-all cursor-pointer text-xs"
                    >
                      🎓 {t('المتابعة بحساب Google', 'Continue with Google')}
                    </button>
                  )}

                  <div className="text-center pt-3 border-t border-slate-200 dark:border-slate-800/60 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    {studentAuthMode === 'login' ? (
                      <>
                        <span>{t('ليس لديك حساب؟', 'New Student?')}</span>
                        <button
                          type="button"
                          onClick={() => setStudentAuthMode('register')}
                          className="text-brand-cyan hover:underline font-bold cursor-pointer"
                        >
                          {t('سجل الآن', 'Register Now')}
                        </button>
                      </>
                    ) : (
                      <>
                        <span>{t('لديك حساب بالفعل؟', 'Have an account?')}</span>
                        <button
                          type="button"
                          onClick={() => setStudentAuthMode('login')}
                          className="text-brand-cyan hover:underline font-bold cursor-pointer"
                        >
                          {t('سجل دخولك', 'Login Here')}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

      {/* Modal: Free Academic Course Activation Request */}
      {isEnrollModalOpen && enrollingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 dark:bg-[#090d16]/90 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(false)}
              className="absolute top-3.5 left-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {enrollSuccess ? (
              <div className="text-center py-6 space-y-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xl mx-auto">
                  ✓
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{t('تم إرسال طلب التفعيل المجاني!', 'Free Activation Request Sent!')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t(
                    'تم تسجيل طلبك بنجاح (مجاني 100%). سيقوم طاقم إدارة المنصة بمراجعة وتفعيل حسابك للمقرر فوراً.',
                    'Your 100% free course activation request is now queued for admin approval.'
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs text-slate-700 dark:text-slate-300 mt-4">
                <div className="text-center mb-4">
                  <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider font-mono">100% Free Academic Access</span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">{t('طلب تفعيل المادة الأكاديمية', 'Request Free Course Activation')}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate max-w-xs mx-auto">
                    {t(enrollingCourse.titleAr, enrollingCourse.titleEn)}
                  </p>
                </div>

                <div>
                  <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('اسم الطالب بالكامل', 'Your Full Name')}</label>
                  <input
                    type="text"
                    required
                    value={enrollForm.name}
                    onChange={e => setEnrollForm({ ...enrollForm, name: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('البريد الإلكتروني الأكاديمي', 'Your Email Address')}</label>
                  <input
                    type="email"
                    required
                    value={enrollForm.email}
                    onChange={e => setEnrollForm({ ...enrollForm, email: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-semibold text-slate-800 dark:text-white">{t('رقم الواتساب للتواصل السريع', 'Phone / WhatsApp Number')}</label>
                  <input
                    type="text"
                    required
                    value={enrollForm.phone}
                    onChange={e => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingEnroll}
                  className="w-full rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light py-3 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {submittingEnroll ? t('جاري إرسال طلب التفعيل...', 'Submitting...') : t('إرسال طلب التفعيل المجاني', 'Submit Free Activation Request')}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Protected Video Modal Overlay */}
      {activeVideoModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4 backdrop-blur-md">
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveVideoModalUrl(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="w-full mt-6">
              <CustomVideoPlayer
                src={activeVideoModalUrl}
                autoPlay
                user={authService.getCurrentUser()}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AcademyApp />
    </LanguageProvider>
  );
}
