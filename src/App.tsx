import React, { useState, useEffect } from 'react';
import { Course, Category, Student, NewsItem, Article, UserReview, Message, WebsiteSettings, Order } from './types';
import { dbService, authService, isAdminEmail } from './firebase';
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
import { doesCourseMatchStudent, doesCourseMatchStudentGrade, ACADEMIC_GRADES, ACADEMIC_SUBJECTS, getGradeName, getCourseDisplayTitle, normalizeGradeCode, getGradeFromCourseOrCategory } from './utils/gradeMatching';
import { 
  Star, Phone, Send, Info, Award, Calendar, BookOpen, Clock, FileText, CheckCircle2, 
  MapPin, HelpCircle, ShieldAlert, ArrowLeft, Loader, Play, Download, Check, X, Video, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [students, setStudents] = useState<Student[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [studentAuthForm, setStudentAuthForm] = useState({ name: '', email: '', password: '', phone: '', grade: '1prep', department: 'general' });
  const [studentAuthError, setStudentAuthError] = useState<string>('');
  const [studentAuthSuccess, setStudentAuthSuccess] = useState<string>('');

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

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        allCourses, allCategories, allStudents, allArticles, allNews, allReviews, allMessages, allOrders, webSettings
      ] = await Promise.all([
        dbService.getCourses(),
        dbService.getCategories(),
        dbService.getStudents(),
        dbService.getArticles(),
        dbService.getNews(),
        dbService.getReviews(),
        dbService.getMessages(),
        dbService.getOrders(),
        dbService.getSettings()
      ]);

      setCourses(allCourses);
      setCategories(allCategories);
      setStudents(allStudents);
      setArticles(allArticles);
      setNews(allNews);
      setReviews(allReviews);
      setMessages(allMessages);
      setOrders(allOrders);
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
  }, [courses]);

  // Keep selected course synchronized when courses array finishes fetching
  useEffect(() => {
    if (courses.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const courseIdParam = searchParams.get('id') || searchParams.get('courseId') || sessionStorage.getItem('academy_selected_course_id');
      if (courseIdParam && (!selectedCourse || selectedCourse.id !== courseIdParam)) {
        const found = courses.find(c => c.id === courseIdParam);
        if (found) {
          setSelectedCourse(found);
        }
      }
    }
  }, [courses, selectedCourse]);

  // Guard admin routes and enforce platform authentication
  useEffect(() => {
    if (!loading && !isAdminLoggedIn && !isStudentLoggedIn) {
      setIsStudentAuthOpen(true);
    }
    if (currentView === 'admin-panel' && !isAdminLoggedIn) {
      if (isStudentLoggedIn) {
        handleNavigate('student-panel');
      } else {
        handleNavigate('home');
      }
    }
  }, [loading, currentView, isAdminLoggedIn, isStudentLoggedIn]);

  useEffect(() => {
    fetchData();
    const unsubCourses = dbService.listenToCourses((realtimeCourses) => {
      setCourses(realtimeCourses);
    });
    const unsubOrders = dbService.listenToOrders((realtimeOrders) => {
      setOrders(realtimeOrders);
    });
    const unsubMessages = dbService.listenToMessages((realtimeMessages) => {
      setMessages(realtimeMessages);
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
            alert('تم إنهاء جميع جلسات الدخول وتسجيل الخروج من المنصة بواسطة إدارة الأكاديمية.');
          }
        }
      }
    });
    return () => {
      if (unsubCourses) unsubCourses();
      if (unsubOrders) unsubOrders();
      if (unsubMessages) unsubMessages();
      if (unsubSettings) unsubSettings();
    };
  }, [currentView]);

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
      setLoginError(language === 'ar' ? 'بيانات تسجيل دخول المعلم غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.' : 'Invalid teacher credentials. Please check email and password.');
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
      if (studentAuthMode === 'login') {
        const res = await authService.loginUser(email, password);
        if (res.success && res.user) {
          if (res.user.role === 'admin') {
            setIsAdminLoggedIn(true);
            setIsStudentAuthOpen(false);
            setStudentAuthForm({ name: '', email: '', password: '', phone: '' });
            handleNavigate('home');
          } else {
            setIsStudentLoggedIn(true);
            setIsStudentAuthOpen(false);
            setStudentAuthForm({ name: '', email: '', password: '', phone: '' });
            handleNavigate('student-panel');
          }
        } else {
          setStudentAuthError(res.error || t('خطأ في تسجيل الدخول. تواصل مع الدعم.', 'Authentication failed. Please verify inputs.'));
        }
      } else {
        // Register Student
        const res = await authService.registerUser(
          name, 
          email, 
          password, 
          'student', 
          phone, 
          studentAuthForm.grade || '1prep', 
          studentAuthForm.department || 'general'
        );
        if (res.success && res.user) {
          setIsStudentLoggedIn(true);
          setIsStudentAuthOpen(false);
          setStudentAuthForm({ name: '', email: '', password: '', phone: '', grade: '1prep', department: 'general' });
          handleNavigate('student-panel');
        } else {
          setStudentAuthError(res.error || t('خطأ في التسجيل. قد يكون البريد مسجلاً مسبقاً.', 'Registration failed.'));
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
      const isFreeCourse = Boolean(enrollingCourse.isFree);
      const subExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const courseTitle = language === 'ar' ? enrollingCourse.titleAr : enrollingCourse.titleEn;
      const finalPrice = enrollingCourse.discountPrice || enrollingCourse.price || 0;

      // 1. Create order / subscription request
      await dbService.addOrder({
        studentId: activeStudentUser?.id || ('stud_' + Date.now()),
        studentName: name,
        studentEmail: email,
        studentPhone: phone,
        courseId: enrollingCourse.id,
        courseTitle: courseTitle,
        pricePaid: isFreeCourse ? 0 : finalPrice,
        status: isFreeCourse ? 'completed' : 'pending'
      });

      // 2. If it is a free course, update existing student/user profile without creating registration requests
      if (isFreeCourse) {
        const activeUser = authService.getCurrentUser();
        if (activeUser && activeUser.email.toLowerCase() === email.trim().toLowerCase()) {
          const updatedPurchased = Array.from(new Set([...(activeUser.purchasedCourseIds || []), enrollingCourse.id]));
          const updatedUser = {
            ...activeUser,
            purchasedCourseIds: updatedPurchased,
            subscription: {
              active: true,
              expiresAt: subExpiresAt
            }
          };
          await dbService.updateStudent(activeUser.id, {
            purchasedCourseIds: updatedPurchased,
            subscription: { active: true, expiresAt: subExpiresAt }
          });
          localStorage.setItem('academy_active_user', JSON.stringify(updatedUser));
        } else {
          const allStudents = await dbService.getStudents();
          const existingStud = allStudents.find(s => (s.email || '').trim().toLowerCase() === email.trim().toLowerCase());
          if (existingStud) {
            const updatedPurchased = Array.from(new Set([...(existingStud.purchasedCourseIds || []), enrollingCourse.id]));
            await dbService.updateStudent(existingStud.id, {
              purchasedCourseIds: updatedPurchased,
              subscription: { active: true, expiresAt: subExpiresAt }
            });
          }
        }
      }

      setEnrollSuccess(true);
      setTimeout(() => {
        setIsEnrollModalOpen(false);
        setEnrollSuccess(false);
        setEnrollForm({ name: '', email: '', phone: '' });
      }, 3500);
    } catch (err: any) {
      console.error("Enrollment submission failed:", err);
      alert(language === 'ar' ? "حدث خطأ أثناء إرسال طلب الاشتراك" : "Subscription request failed");
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
      qAr: 'ما هي المقررات الأكاديمية الستة المتاحة على المنصة لقسم تكنولوجيا المعلومات IT؟',
      qEn: 'What are the 6 academic IT courses available on the platform?',
      aAr: 'تغطي المنصة المقررات الأساسية المعتمدة: Physics (الفيزياء)، Python Programming (برمجة بايثون)، IT Essentials (أساسيات تكنولوجيا المعلومات)، Mathematics (الرياضيات)، Cyber Security (الأمن السيبراني)، و English (اللغة الإنجليزية).',
      aEn: 'The platform covers the 6 accredited IT courses: Physics, Python Programming, IT Essentials, Mathematics, Cyber Security, and English.'
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
    <div className="flex min-h-screen flex-col bg-brand-dark text-slate-100 selection:bg-brand-cyan selection:text-brand-dark" style={{ direction }}>
      
      {/* Dynamic Background Mesh Grid */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-20 grid-bg" />
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] z-0 h-[600px] w-[600px] rounded-full bg-cyan-900/10 blur-[150px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] z-0 h-[600px] w-[600px] rounded-full bg-emerald-950/10 blur-[150px]" />

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
                <section className="relative overflow-hidden py-20 lg:py-28">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    
                    {/* IT University tag */}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 px-4 py-1.5 text-xs font-bold text-brand-cyan-light backdrop-blur-md mb-6">
                      🎓 {t('الجامعة التكنولوجية - قسم تكنولوجيا المعلومات (IT)', 'Technological University – IT Department')}
                    </span>

                    <h1 className="text-3xl font-black text-white sm:text-5xl lg:text-6xl tracking-tight leading-tight max-w-4xl mx-auto">
                      {t('الجامعة التكنولوجية', 'Technological University')} <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan-light via-blue-400 to-indigo-400">
                        {t('منصة محمد عبد التواب (قسم IT)', 'Eng/Mohamed abdal tawab Platform (IT Dept)')}
                      </span>
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed">
                      {t(
                        'المنصة الأكاديمية الشاملة لنزول المحاضرات والسكاشن العملية بصيغ PDF والوورد (Word .docx) وغيرها من الملفات لمواد قسم IT الستة: Physics – Python Programming – IT Essentials – Mathematics – Cyber Security – English.',
                        'The comprehensive university platform for lectures and practical lab sections with PDF, Word (.docx) and materials for the 6 IT subjects: Physics, Python Programming, IT Essentials, Mathematics, Cyber Security, and English.'
                      )}
                    </p>

                    {/* CTAs */}
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                      <button
                        onClick={() => handleNavigate('courses')}
                        className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-7 py-3 text-xs font-bold transition-all shadow-lg shadow-cyan-950/30 cursor-pointer active:scale-95 flex items-center gap-2"
                      >
                        <span>📚</span>
                        <span>{t('المحاضرات والسكاشن المتاحة', 'Browse Lectures & Labs')}</span>
                      </button>
                      <button
                        onClick={() => handleNavigate('teacher')}
                        className="rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 px-7 py-3 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>ℹ️</span>
                        <span>{t('عن منصة محمد عبد التواب', 'About Eng/Mohamed abdal tawab Platform')}</span>
                      </button>
                    </div>

                  </div>
                </section>

                {/* Categories strip */}
                <section className="py-12 bg-slate-950/20">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h2 className="text-xl font-bold text-white text-center mb-8">{t('اختر صفك الدراسي للبدء', 'Select Your Grade to Begin')}</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {categories.map(cat => (
                        <div
                          key={cat.id}
                          onClick={() => { setSelectedCategoryId(cat.id); handleNavigate('courses'); }}
                          className="group relative cursor-pointer overflow-hidden rounded-xl glass border border-slate-800/80 p-5 hover:border-brand-cyan/40 transition-all flex items-center justify-between"
                        >
                          <div>
                            <h3 className="font-bold text-white group-hover:text-brand-cyan transition-colors text-sm">{t(cat.nameAr, cat.nameEn)}</h3>
                            <p className="text-[10px] text-slate-400 mt-1">{t('شروحات واختبارات متكاملة', 'Comprehensive syllabus')}</p>
                          </div>
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cyan/10 text-brand-cyan">
                            🧪
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Featured / Popular Courses */}
                <section className="py-16">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
                      <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                          <BookOpen className="h-6 w-6 text-brand-cyan" />
                          {t('الكورسات المميزة والأكثر طلباً', 'Featured & Popular Courses')}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">{t('سجل الآن لضمان مقعدك والبدء فوراً في مذاكرة المنهج', 'Enroll now to lock in your seat and access instant learning modules')}</p>
                      </div>
                      <button
                        onClick={() => handleNavigate('courses')}
                        className="text-xs font-bold text-brand-cyan hover:text-brand-cyan-light flex items-center gap-1 cursor-pointer self-start"
                      >
                        {t('عرض جميع الكورسات', 'View all courses')} &rarr;
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {courses.slice(0, 3).map(course => (
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
                  </div>
                </section>

                {/* Teacher Profile Section (Home) */}
                <section className="py-16 bg-slate-950/40 relative overflow-hidden">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                      <div className="relative">
                        <div className="aspect-square max-w-md mx-auto rounded-3xl overflow-hidden border border-slate-800 glass shadow-2xl relative">
                          <img
                            src="https://i.postimg.cc/9FdBHzv0/file-0000000039e471f4b1bca6e21564ec9d.png"
                            alt="Eng/Mohamed abdal tawab"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent" />
                          <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl glass-cyan">
                            <p className="text-sm font-bold text-brand-cyan-light">{t('م. محمد عبد التواب - المشرف الأكاديمي لقسم تكنولوجيا المعلومات IT بالجامعة التكنولوجية', 'Eng/Mohamed abdal tawab – Academic Supervisor, IT Dept, Technological University')}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <span className="text-xs font-bold text-brand-cyan font-mono uppercase tracking-wider">{t('الجامعة التكنولوجية - قسم تكنولوجيا المعلومات', 'Technological University - IT Dept')}</span>
                        <h2 className="text-3xl font-black text-white">{t('م. محمد عبد التواب', 'Eng/Mohamed abdal tawab')}</h2>
                        
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                          {t(
                            'تركز منصة محمد عبد التواب على توفير بيئة تعليمية جامعية متكاملة لطلاب قسم تكنولوجيا المعلومات (IT)، من خلال رفع وتنسيق المحاضرات النظرية بصيغ PDF وسلايدز، والسكاشن العملية والتجارب المعملية بصيغ Word (.docx) و PDF لتسهيل أداء التكليفات والتقارير الأسبوعية ومذاكرة المواد التقنية.',
                            'Eng/Mohamed abdal tawab platform provides a complete academic environment for IT students, delivering theoretical lectures in PDF and practical lab sections in Word (.docx) & PDF for assignments and tech study.'
                          )}
                        </p>

                        <div className="space-y-3 text-xs text-slate-300">
                          {[
                            t('نزول دوري لمحاضرات المواد الستة: Physics, Python, IT Essentials, Math, Cyber Security, English.', 'Regular release of lectures for the 6 core IT subjects: Physics, Python, IT Essentials, Math, Cyber Security, English.'),
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
                          onClick={() => handleNavigate('teacher')}
                          className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 text-brand-cyan-light px-5 py-2.5 text-xs font-bold hover:bg-brand-cyan hover:text-brand-dark transition-all cursor-pointer"
                        >
                          {t('اقرأ السيرة الذاتية الكاملة', 'Read Complete Bio & Strategy')}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>



                {/* FAQ Section */}
                <section className="py-16 bg-slate-950/20">
                  <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-black text-white text-center mb-10 flex items-center justify-center gap-2">
                      <HelpCircle className="h-6 w-6 text-brand-cyan" />
                      {t('الأسئلة الشائعة وإجاباتها', 'Frequently Asked Questions')}
                    </h2>

                    <div className="space-y-3">
                      {faqs.map((faq, idx) => {
                        const isOpen = activeFaq === idx;
                        return (
                          <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden transition-all">
                            <button
                              onClick={() => setActiveFaq(isOpen ? null : idx)}
                              className="w-full text-right p-4 font-bold text-xs sm:text-sm text-white flex justify-between items-center gap-3 cursor-pointer"
                            >
                              <span>{t(faq.qAr, faq.qEn)}</span>
                              <span className="text-brand-cyan font-mono">{isOpen ? '−' : '+'}</span>
                            </button>
                            {isOpen && (
                              <div className="p-4 pt-0 border-t border-slate-800/40 text-xs text-slate-400 leading-relaxed">
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
                    <h1 className="text-2xl font-black text-white md:text-4xl">{t('الكورسات والمناهج الدراسية', 'Educational Courses & Curriculums')}</h1>
                    <p className="text-xs text-slate-400 mt-2">{t('تصفح الكورسات والمناهج لجميع المراحل الدراسية والمواد التعليمية', 'Browse courses by grade level and subject')}</p>
                  </div>

                  {/* Filters Bar: Grade Tabs + Subject Filter */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
                    {/* Grade Tabs */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 w-full md:w-auto">
                      <button
                        onClick={() => setSelectedCategoryId('all')}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          selectedCategoryId === 'all' 
                            ? 'bg-brand-cyan text-brand-dark shadow-md shadow-cyan-950/20' 
                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {t('جميع الصفوف', 'All Grades')}
                      </button>
                      {ACADEMIC_GRADES.map(g => (
                        <button
                          key={g.id}
                          onClick={() => setSelectedCategoryId(g.id)}
                          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            selectedCategoryId === g.id 
                              ? 'bg-brand-cyan text-brand-dark shadow-md shadow-cyan-950/20' 
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {t(g.nameAr, g.nameEn)}
                        </button>
                      ))}
                    </div>

                    {/* Subject Filter Dropdown */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">{t('المادة:', 'Subject:')}</span>
                      <select
                        value={selectedSubjectFilter}
                        onChange={e => setSelectedSubjectFilter(e.target.value)}
                        className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-cyan"
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
                      <HelpCircle className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                      <p className="font-bold text-white mb-1">{t('لا توجد كورسات حالياً', 'No courses currently available')}</p>
                      <p className="text-xs text-slate-400">{t('جرب البحث بكلمات أخرى أو تغيير القسم.', 'Try searching for other keywords or categories.')}</p>
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
                    <ArrowLeft className="h-4 w-4" />
                    <span>{t('العودة للكورسات والمناهج', 'Back to science courses')}</span>
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left side (Details, video, attachments) */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Video Player placeholder */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden aspect-video relative shadow-2xl">
                        <img 
                          src={selectedCourse.bannerUrl || selectedCourse.thumbnailUrl} 
                          alt="Banner" 
                          className="w-full h-full object-cover opacity-60"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                          <button 
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
                                triggerEnroll(selectedCourse);
                              }
                            }}
                            className="h-16 w-16 rounded-full bg-brand-cyan text-brand-dark flex items-center justify-center hover:scale-110 hover:bg-brand-cyan-light transition-all shadow-lg shadow-cyan-950/50 cursor-pointer"
                            title={t('مشاهدة العرض التوضيحي', 'Watch Demo')}
                          >
                            <Play className="h-6 w-6 fill-brand-dark ml-1" />
                          </button>
                        </div>
                        <div className="absolute bottom-4 right-4 bg-brand-dark/80 px-3 py-1.5 rounded-xl text-[10px] text-brand-cyan-light font-bold border border-brand-cyan/20">
                          {t('شاهد فيديو الشرح للمادة المقدمة', 'Watch promo video intro')}
                        </div>
                      </div>

                      {/* Info Card */}
                      <div className="rounded-2xl glass p-6 space-y-4">
                        <h1 className="text-xl font-black text-white sm:text-2xl">{t(selectedCourse.titleAr, selectedCourse.titleEn)}</h1>
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          <span className="font-bold text-brand-cyan-light bg-brand-cyan/10 px-2.5 py-1 rounded">
                            {t('الصف الدراسي الخاص', 'Grade level')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-brand-cyan" />
                            {selectedCourse.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-brand-cyan" />
                            {selectedCourse.lessonsCount} {t('درس تعليمي', 'Lessons')}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-2 border-t border-slate-800/60">
                          {t(selectedCourse.descriptionAr, selectedCourse.descriptionEn)}
                        </p>
                      </div>

                      {/* Course Curriculum preview */}
                      <div className="rounded-2xl glass p-6 space-y-4">
                        <h3 className="font-bold text-white text-sm">{t('محتوى الكورس وخطة الدراسة', 'Syllabus & Core Outline')}</h3>
                        
                        <div className="space-y-2 text-xs">
                          {selectedCourse.units && selectedCourse.units.length > 0 ? (
                            selectedCourse.units.map((unit, index) => (
                              <div key={unit.id || index} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-white text-xs">{unit.title}</p>
                                  <span className="text-brand-cyan font-bold font-mono text-[10px]">الوحدة #{index + 1}</span>
                                </div>
                                {unit.description && <p className="text-[11px] text-slate-400">{unit.description}</p>}
                                <div className="space-y-1 pt-1">
                                  {unit.lessons?.map((lsn, lIdx) => (
                                    <div key={lsn.id || lIdx} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-950/60 text-[11px]">
                                      <span className="text-slate-200 font-medium truncate">{lsn.title}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {lsn.wordUrl && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[9px] font-bold">DOCX</span>}
                                        {lsn.pdfUrl && <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-bold">PDF</span>}
                                        {lsn.isSection && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-bold">معمل عملي</span>}
                                        <span className="text-slate-400 font-mono text-[10px]">{lsn.duration}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400">{t('المحاضرات والسكاشن العملية متاحة بالكامل للطلاب المشتركين.', 'Lectures and practical sections available to enrolled students.')}</p>
                          )}
                        </div>
                      </div>

                      {/* Attachments / PDFs */}
                      {(selectedCourse.pdfUrl || (selectedCourse.attachments && selectedCourse.attachments.length > 0)) && (
                        <div className="rounded-2xl glass p-6 space-y-3">
                          <h3 className="font-bold text-white text-sm">{t('مذكرات الشرح وملفات التحميل المرفقة', 'Worksheets & Downloadable PDFs')}</h3>
                          
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
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20 text-xs text-brand-cyan-light hover:bg-brand-cyan/10 transition-all cursor-pointer text-left"
                              >
                                <span className="font-bold">{t('تحميل مذكرة المنهج الكاملة والملخصات PDF', 'Download Syllabus Revision Booklet PDF')}</span>
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
                                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-800 text-xs text-slate-300 bg-slate-900/10 hover:border-brand-cyan/20 transition-all cursor-pointer text-left"
                              >
                                <span>{attachment.split('/').pop()?.split('?')[0] || attachment}</span>
                                <span className="text-[10px] text-slate-500 font-mono">PDF Booklet</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Right side (Purchase / teacher details card) */}
                    <div className="space-y-6">
                      
                      {/* Price card */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-5 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          {t('قيمة الاشتراك بالدورة الدراسية', 'Syllabus Enrollment Fee')}
                        </span>
                        
                        <div className="flex flex-col items-center justify-center">
                          {selectedCourse.isFree ? (
                            <span className="text-3xl font-black text-emerald-400 font-mono">
                              {t('مجاني', 'Free')}
                            </span>
                          ) : (selectedCourse.discountPrice !== undefined && selectedCourse.discountPrice !== null && selectedCourse.discountPrice < selectedCourse.price) ? (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-slate-500 line-through font-mono">
                                  {language === 'ar' ? `${selectedCourse.price} ج.م` : `${selectedCourse.price} EGP`}
                                </span>
                                <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
                                  -{Math.round(((selectedCourse.price - selectedCourse.discountPrice) / selectedCourse.price) * 100)}%
                                </span>
                              </div>
                              <span className="text-3xl font-black text-brand-cyan-light font-mono">
                                {language === 'ar' ? `${selectedCourse.discountPrice} ج.م` : `${selectedCourse.discountPrice} EGP`}
                              </span>
                            </>
                          ) : (
                            <span className="text-3xl font-black text-white font-mono">
                              {language === 'ar' ? `${selectedCourse.price} ج.م` : `${selectedCourse.price} EGP`}
                            </span>
                          )}
                        </div>

                        {(() => {
                          const access = verifyCourseAccess(authService.getCurrentUser(), selectedCourse, orders);
                          if (access.allowed) {
                            return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    window.scrollTo({ top: 400, behavior: 'smooth' });
                                  }}
                                  className="w-full rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-3 text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>✅ {t('تم تفعيل المادة (تحميل المحاضرات والسكاشن متاح)', 'Activated (Lectures & Lab Files Unlocked)')}</span>
                                </button>
                              );
                            }
                            if (access.reason === 'pending_approval') {
                              return (
                                <button
                                  type="button"
                                  disabled
                                  className="w-full rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 py-3 text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-default"
                                >
                                  <Clock className="h-4 w-4 shrink-0" />
                                  <span>⏳ {t('طلب التفعيل قيد المراجعة الأكاديمية', 'Activation Pending Review')}</span>
                                </button>
                              );
                            }
                            return (
                              <button
                                onClick={(e) => triggerEnroll(selectedCourse, e)}
                                className="w-full rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light py-3 text-xs font-bold transition-all shadow-lg shadow-cyan-950/20 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                              >
                                <span>📥</span>
                                <span>{t('طلب تفعيل المادة وتحميل المحاضرات والسكاشن', 'Request Course Activation & File Access')}</span>
                              </button>
                            );
                          })()}

                          <div className="space-y-2 text-[11px] text-slate-400 text-right ltr:text-left">
                            <p>• {t('تفعيل فوري لتحميل ملفات المحاضرات (PDF) والسكاشن (Word)', 'Instant access to all lecture PDFs and lab Word sheets')}</p>
                            <p>• {t('إشراف أكاديمي مباشر من Eng/Mohamed abdal tawab', 'Academic supervision by Eng/Mohamed abdal tawab')}</p>
                            <p>• {t('قسم الشيتات والتكليفات المعملية ونماذج الامتحانات السابقة', 'Weekly lab sheets, assignments, and past exams archive')}</p>
                          </div>
                        </div>

                      {/* Instructor details short */}
                      <div className="rounded-2xl glass p-5 text-xs text-center space-y-3">
                        <div className="h-14 w-14 rounded-full overflow-hidden border border-slate-800 mx-auto bg-slate-900">
                          <img 
                            src="https://i.postimg.cc/9FdBHzv0/file-0000000039e471f4b1bca6e21564ec9d.png" 
                            alt="Teacher" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{selectedCourse.teacherName}</p>
                          <p className="text-[10px] text-brand-cyan-light mt-0.5">{t('الجامعة التكنولوجية - قسم تكنولوجيا المعلومات IT', 'Technological University - IT Department')}</p>
                        </div>
                        <p className="text-slate-400 leading-relaxed text-[11px]">
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
                    
                    <div className="flex flex-col md:flex-row gap-8 items-center border-b border-slate-800/80 pb-8">
                      <div className="aspect-square h-40 w-40 shrink-0 rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                        <img 
                          src="https://i.postimg.cc/9FdBHzv0/file-0000000039e471f4b1bca6e21564ec9d.png" 
                          alt="Eng/Mohamed abdal tawab" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-2 text-center md:text-right ltr:text-left">
                        <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider font-mono">Technological University Platform</span>
                        <h1 className="text-2xl font-black text-white sm:text-3xl">{t('منصة محمد عبد التواب', 'Eng/Mohamed abdal tawab Platform')}</h1>
                        <p className="text-sm text-brand-cyan-light font-bold font-arabic">{t('الجامعة التكنولوجية - قسم تكنولوجيا المعلومات (IT) | منصة المحاضرات والسكاشن', 'Technological University - IT Department | Lectures & Labs Hub')}</p>
                      </div>
                    </div>

                    <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Award className="h-5 w-5 text-brand-cyan" />
                        {t('عن المنصة والأهداف الأكاديمية لقسم IT', 'Platform Vision & IT Academic Goals')}
                      </h3>

                      <p>
                        {t(
                          'تأسست منصة محمد عبد التواب لتكون المرجع الأكاديمي الرقمي المتكامل لطلاب الجامعة التكنولوجية بقسم تكنولوجيا المعلومات (Information Technology). تهدف المنصة إلى تيسير وصول الطلاب إلى المحاضرات النظرية بصيغ PDF وسلايدز، وتوفير شيتات السكاشن المعملية والتقارير الأسبوعية بصيغ Word (.docx) و PDF لتسهيل التعديل والحل والطباعة.',
                          'Eng/Mohamed abdal tawab platform was built as the integrated digital academic reference for Technological University IT students, facilitating access to lectures in PDF and lab section sheets in editable Word (.docx) & PDF.'
                        )}
                      </p>

                      <p>
                        {t(
                          'تغطي المنصة المقررات الستة الأساسية المعتمدة للقسم: مادة الفيزياء (Physics)، برمجة بايثون (Python Programming)، أساسيات تكنولوجيا المعلومات (IT Essentials)، الرياضيات (Mathematics)، الأمن السيبراني (Cyber Security)، واللغة الإنجليزية التخصصية (English).',
                          'The platform covers the 6 core accredited courses: Physics, Python Programming, IT Essentials, Mathematics, Cyber Security, and Technical English.'
                        )}
                      </p>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          <p className="font-bold text-white mb-2">📄 {t('محاضرات وسلايدز PDF معتمدة', 'Accredited PDF Lectures & Slides')}</p>
                          <p className="text-xs text-slate-400">{t('ملفات مذكرات وعروض تقديمية واضحة وشاملة لجميع المحاضرات النظرية مع إمكانية القراءة والتحميل الفوري.', 'High quality lecture notes and slides for all theoretical courses with instant preview and download.')}</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          <p className="font-bold text-white mb-2">📝 {t('سكاشن وشيتات Word (.docx)', 'Practical Word Lab Sheets')}</p>
                          <p className="text-xs text-slate-400">{t('ملفات شيتات السكاشن العملية وتجارب المعامل بصيغ مايكروسوفت وورد قابلة للتعديل والحل المباشر والتسليم.', 'Practical lab sheets and assignment templates in Word format, ready for direct editing, solving, and submission.')}</p>
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
                    <h1 className="text-2xl font-black text-white sm:text-4xl">{t('تواصل مع المنصة الأكاديمية لقسم IT', 'Contact Eng/Mohamed abdal tawab Platform')}</h1>
                    <p className="text-xs text-slate-400 mt-2">{t('يسعدنا تواصل الطلاب لطرح أي استفسارات أكاديمية حول المقررات والمحاضرات والسكاشن', 'Have queries about courses, lectures, or practical lab sheets? Reach out anytime.')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    
                    {/* Contact Info column */}
                    <div className="md:col-span-2 space-y-4">
                      
                      <div className="rounded-2xl glass p-5 space-y-5 text-xs">
                        <h3 className="font-bold text-white text-sm">{t('قنوات التواصل المباشرة', 'Direct Channels')}</h3>
                        
                        <div className="flex gap-3 items-center">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-brand-cyan border border-slate-800 text-lg">
                            📞
                          </span>
                          <div>
                            <p className="font-bold text-white">{t('واتساب التواصل والدعم الفني', 'Academic Support WhatsApp')}</p>
                            <p className="text-slate-400 mt-0.5 font-mono select-all">{settings && settings.whatsapp ? settings.whatsapp : 'https://wa.me/201010298878'}</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-center">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-brand-cyan border border-slate-800 text-lg">
                            ✈️
                          </span>
                          <div>
                            <p className="font-bold text-white">{t('قناة التليجرام والمناقشات', 'Telegram Channel')}</p>
                            <p className="text-slate-400 mt-0.5 font-mono select-all">{settings && settings.telegram ? settings.telegram : 'https://t.me/mohamed_abdal_tawab'}</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-center">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-brand-cyan border border-slate-800 text-lg">
                            📍
                          </span>
                          <div>
                            <p className="font-bold text-white">{t('المقر والجهة الأكاديمية', 'Academic Department')}</p>
                            <p className="text-slate-400 mt-0.5">{t('الجامعة التكنولوجية - قسم تكنولوجيا المعلومات (IT)', 'Technological University - IT Department')}</p>
                          </div>
                        </div>

                        {/* Quick Interactive Clickable Buttons */}
                        <div className="pt-4 border-t border-slate-800/60 space-y-2">
                          <p className="font-bold text-white mb-1.5">{t('محادثة فورية بنقرة واحدة:', 'Instant One-Click Contact:')}</p>
                          
                          <button
                            onClick={handleWhatsappTrigger}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 font-bold transition-all shadow-md shadow-emerald-950/20 cursor-pointer"
                          >
                            <Phone className="h-4 w-4 fill-white" />
                            {t('تواصل معنا عبر واتساب', 'Chat on WhatsApp')}
                          </button>

                          <button
                            onClick={handleTelegramTrigger}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white py-2.5 font-bold transition-all shadow-md shadow-cyan-950/20 cursor-pointer"
                          >
                            <Send className="h-4 w-4 fill-white mr-0.5" />
                            {t('انضم لقناتنا على تليجرام', 'Join Telegram Channel')}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Contact Form column */}
                    <div className="md:col-span-3">
                      <form onSubmit={handleContactSubmit} className="rounded-2xl glass p-6 md:p-8 space-y-4 text-xs text-slate-300">
                        <h3 className="font-bold text-white text-sm">{t('أرسل استفسارك وسنعاود الاتصال بك', 'Drop an Inquiry Message')}</h3>
                        
                        {contactSuccess && (
                          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-400 font-bold">
                            ✓ {t('تم إرسال رسالتك بنجاح المزامنة! سنقوم بالتواصل معك عبر الواتساب أو الهاتف قريباً.', 'Your inquiry message sent successfully! We will contact you soon.')}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block mb-1.5 font-semibold text-white">{t('اسمك بالكامل', 'Your Name')}</label>
                            <input
                              type="text"
                              required
                              value={contactForm.name}
                              onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                              className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan"
                            />
                          </div>
                          <div>
                            <label className="block mb-1.5 font-semibold text-white">{t('رقم الموبايل (يفضل واتساب)', 'Mobile Number')}</label>
                            <input
                              type="text"
                              required
                              value={contactForm.phone}
                              onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                              className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block mb-1.5 font-semibold text-white">{t('البريد الإلكتروني', 'Email Address')}</label>
                            <input
                              type="email"
                              required
                              value={contactForm.email}
                              onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                              className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block mb-1.5 font-semibold text-white">{t('موضوع الاستفسار (مثال: حجز كورس علوم)', 'Subject')}</label>
                            <input
                              type="text"
                              required
                              value={contactForm.subject}
                              onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                              className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block mb-1.5 font-semibold text-white">{t('تفاصيل رسالتك أو استفسارك', 'Your message details')}</label>
                            <textarea
                              required
                              rows={4}
                              value={contactForm.message}
                              onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                              className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submittingContact}
                          className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-6 py-3.5 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/20"
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
                  <div className="rounded-2xl glass p-6 md:p-8 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <h1 className="text-xl font-black text-white sm:text-2xl">{t('لوائح المنصة الأكاديمية وصلاحية تحميل المحاضرات والسكاشن', 'Terms & Regulations of Course File Access')}</h1>
                    <p className="text-slate-500 font-mono">Last updated: Academic Year 2026</p>
                    
                    <p>{t('برجاء قراءة اللوائح الأكاديمية المنظمة لاستخدام منصة Eng/Mohamed abdal tawab بالجامعة التكنولوجية لقسم تكنولوجيا المعلومات IT:', 'Please review the academic regulations governing the use of Eng/Mohamed abdal tawab’s IT University Platform:')}</p>
                    
                    <h3 className="font-bold text-white text-sm">{t('١. صلاحية استخدام المواد الأكاديمية والملفات', '1. Academic Materials Usage License')}</h3>
                    <p>{t('عند تفعيل المقرر للطالب، يُمنح صلاحية أكاديمية للاطلاع وتحميل ملفات المحاضرات النظرية (PDF) وشيتات السكاشن العملية (Word .docx) وحل التكليفات والامتحانات للمقررات الستة. يحظر إعادة نشر أو بيع المحتوى الأكاديمي لجهات تجارية خارجية.', 'Active course access grants the student personal permission to access and download lecture notes, practical Word lab sheets, and assignments for accredited courses.')}</p>

                    <h3 className="font-bold text-white text-sm">{t('٢. تفعيل المواد الدراسية وقسم الامتحانات', '2. Course Activation & Exam System')}</h3>
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
                  <div className="rounded-2xl glass p-6 md:p-8 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <h1 className="text-xl font-black text-white sm:text-2xl">{t('سياسة الخصوصية وأمن بيانات الطلاب', 'Student Privacy Policy')}</h1>
                    <p className="text-slate-500 font-mono">Last updated: Academic Year 2026</p>
                    
                    <p>{t('تلتزم منصة Eng/Mohamed abdal tawab الأكاديمية بالجامعة التكنولوجية بأعلى معايير حماية بيانات الطلاب وخصوصيتهم:', 'We strictly protect the privacy and records of our university students:')}</p>
                    
                    <h3 className="font-bold text-white text-sm">{t('١. البيانات الأكاديمية المسجلة', '1. Collected Academic Data')}</h3>
                    <p>{t('نجمع بيانات الاسم، والبريد الإلكتروني، ورقم الواتساب، والفرقة الدراسية بقسم تكنولوجيا المعلومات لغرض تفعيل المقررات ومتابعة تسليمات الشيتات وحلول الامتحانات.', 'We securely collect student name, academic email, contact numbers, and year level to activate courses and record assignment submissions.')}</p>

                    <h3 className="font-bold text-white text-sm">{t('٢. سرية المعلومات وحمايتها', '2. Data Protection')}</h3>
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
                  <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl glass mx-4">
                    <div className="text-center mb-6">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-2xl mx-auto mb-3">
                        🎓
                      </span>
                      <h3 className="text-xl font-black text-white">{t('بوابة الطالب التعليمية', 'Student Learning Portal')}</h3>
                      <p className="text-xs text-slate-400 mt-1">{t('سجل دخولك لمتابعة حصصك وحل الامتحانات والواجبات المنزلية', 'Access courses, check certificates, do online exams and assignments')}</p>
                    </div>

                    <div className="space-y-4">
                      <button
                        onClick={() => { setStudentAuthMode('login'); setIsStudentAuthOpen(true); }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light py-3.5 font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20 text-xs sm:text-sm"
                      >
                        {t('تسجيل الدخول كطالب', 'Login to Student Account')}
                      </button>
                      <button
                        onClick={() => { setStudentAuthMode('register'); setIsStudentAuthOpen(true); }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-white py-3.5 font-bold transition-all cursor-pointer text-xs sm:text-sm"
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
                  <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl glass mx-4">
                    <div className="text-center mb-6">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-2xl mx-auto mb-3">
                        🔐
                      </span>
                      <h3 className="text-xl font-black text-white">{t('تسجيل الدخول للمسؤولين', 'Administrator Login')}</h3>
                      <p className="text-xs text-slate-400 mt-1">{t('بوابة إدارة محتوى أكاديمية م. محمد عبد التواب', 'Secure gateway for Eng/Mohamed abdal tawab academy board members')}</p>
                    </div>

                    <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs sm:text-sm text-slate-300">
                      {loginError && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 font-bold flex items-center gap-1.5 text-xs">
                          <ShieldAlert className="h-4.5 w-4.5" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block mb-1.5 font-semibold text-white">{t('البريد الإلكتروني للمدير', 'Admin Email')}</label>
                        <input
                          type="email"
                          required
                          placeholder="admin@example.com"
                          value={adminEmail}
                          onChange={e => setAdminEmail(e.target.value)}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-white">{t('كلمة المرور الآمنة', 'Password')}</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light py-3.5 font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20 text-xs sm:text-sm"
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

      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3 pointer-events-auto">
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
                  onClick={() => {
                    toggleTheme();
                    setIsSpeedDialOpen(false);
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/95 text-white hover:scale-110 active:scale-95 transition-all shadow-xl hover:border-brand-cyan hover:text-brand-cyan cursor-pointer text-lg"
                  title={theme === 'light' ? t('تفعيل الوضع الليلي', 'Switch to Dark Mode') : t('تفعيل الوضع النهاري', 'Switch to Light Mode')}
                  aria-label="Toggle Theme"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900/95 text-white border border-slate-700/80 text-xs font-semibold shadow-lg backdrop-blur-md select-none pointer-events-none">
                  {theme === 'light' ? t('🌙 تغيير المظهر (ليلي)', '🌙 Dark Mode') : t('☀️ تغيير المظهر (نهاري)', '☀️ Light Mode')}
                </span>
              </div>

              {/* 2. WhatsApp Button */}
              {currentView !== 'admin-panel' && settings && settings.whatsapp && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleWhatsappTrigger();
                      setIsSpeedDialOpen(false);
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-110 active:scale-95 transition-all shadow-xl shadow-emerald-950/40 relative group cursor-pointer"
                    title={t('تواصل معنا عبر واتساب', 'Contact on WhatsApp')}
                  >
                    <span className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
                    <Phone className="h-5 w-5 fill-white" />
                  </button>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900/95 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shadow-lg backdrop-blur-md select-none pointer-events-none">
                    {t('📱 واتساب', '📱 WhatsApp')}
                  </span>
                </div>
              )}

              {/* 3. Telegram Button */}
              {currentView !== 'admin-panel' && settings && settings.telegram && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleTelegramTrigger();
                      setIsSpeedDialOpen(false);
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-white hover:bg-cyan-400 hover:scale-110 active:scale-95 transition-all shadow-xl shadow-cyan-950/40 cursor-pointer"
                    title={t('تابعنا على قناة التليجرام', 'Join Telegram Channel')}
                  >
                    <Send className="h-5 w-5 fill-white mr-0.5" />
                  </button>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900/95 text-cyan-400 border border-cyan-500/30 text-xs font-semibold shadow-lg backdrop-blur-md select-none pointer-events-none">
                    {t('✈️ تيليجرام', '✈️ Telegram')}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Speed Dial Trigger (+) Button */}
        <button
          onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)}
          className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 hover:scale-105 active:scale-95 transition-all duration-250 shadow-2xl shadow-cyan-500/40 border-2 border-white/20 cursor-pointer z-50"
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

      {/* Unified Dual Login Modal (Student Login & Teacher Login) */}
      {(isStudentAuthOpen || isAdminLoginOpen || (!loading && !isAdminLoggedIn && !isStudentLoggedIn)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/95 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl glass mx-4 animate-scaleUp">
            
            {/* Close Button - Only available when logged in */}
            {(isAdminLoggedIn || isStudentLoggedIn) && (
              <button
                onClick={() => {
                  setIsStudentAuthOpen(false);
                  setIsAdminLoginOpen(false);
                  setLoginError('');
                  setStudentAuthError('');
                }}
                className="absolute top-4 left-4 rounded-lg bg-slate-900 p-2 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            )}

            {/* Dual Login Option Tabs */}
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 mb-6 font-bold text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('student');
                  setStudentAuthError('');
                  setLoginError('');
                }}
                className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${
                  authTab === 'student'
                    ? 'bg-brand-cyan text-brand-dark shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-brand-cyan text-brand-dark shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👨‍🏫 {t('دخول المعلم', 'Teacher Login')}
              </button>
            </div>

            {/* TAB 1: TEACHER LOGIN */}
            {authTab === 'teacher' && (
              <>
                <div className="text-center mb-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-xl mx-auto mb-2">
                    👨‍🏫
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {t('تسجيل دخول المعلم / المدير', 'Teacher & Board Login')}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t('بوابة إدارة الكورسات والطلاب لم. محمد عبد التواب', 'Course & Student Management Portal')}
                  </p>
                </div>

                <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs text-slate-300">
                  {loginError && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 font-bold flex items-center gap-1.5 text-[11px]">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block mb-1.5 font-semibold text-white">{t('البريد الإلكتروني للمعلم', 'Teacher Email')}</label>
                    <input
                      type="email"
                      required
                      placeholder="teacher@example.com"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-white">{t('كلمة المرور', 'Password')}</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light py-3 font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20 text-xs"
                  >
                    {t('تسجيل الدخول كمعلم', 'Login as Teacher')}
                  </button>

                  <div className="text-center pt-2 text-[10px] text-slate-500 border-t border-slate-900/60">
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
                  <h3 className="text-lg font-black text-white">
                    {studentAuthMode === 'login' 
                      ? t('بوابة تسجيل دخول الطلاب', 'Student Login Portal') 
                      : t('إنشاء حساب طالب جديد', 'Student Registration')}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {studentAuthMode === 'login' 
                      ? t('تابع دروسك واختباراتك التفاعلية', 'Continue your lessons and interactive tests') 
                      : t('سجل الآن لتبدأ رحلة التفوق مع المهندس محمد عبد التواب', 'Join us to begin your scientific journey')}
                  </p>
                </div>

                <form onSubmit={handleStudentAuthSubmit} className="space-y-4 text-xs text-slate-300">
                  {studentAuthError && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 font-bold flex items-center gap-1.5 text-[11px]">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>{studentAuthError}</span>
                    </div>
                  )}

                  {studentAuthMode === 'register' && (
                    <div>
                      <label className="block mb-1.5 font-semibold text-white">{t('الاسم الثلاثي للطالب', 'Full Name')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('مثال: أحمد محمد علي', 'e.g. Ahmed Mohamed')}
                        value={studentAuthForm.name}
                        onChange={e => setStudentAuthForm({ ...studentAuthForm, name: e.target.value })}
                        className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block mb-1.5 font-semibold text-white">{t('البريد الإلكتروني للطالب', 'Student Email')}</label>
                    <input
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={studentAuthForm.email}
                      onChange={e => setStudentAuthForm({ ...studentAuthForm, email: e.target.value })}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  {studentAuthMode === 'register' && (
                    <>
                      <div>
                        <label className="block mb-1.5 font-semibold text-white">{t('رقم الموبايل / الواتساب', 'WhatsApp Number')}</label>
                        <input
                          type="tel"
                          required
                          placeholder="01010298878"
                          value={studentAuthForm.phone}
                          onChange={e => setStudentAuthForm({ ...studentAuthForm, phone: e.target.value })}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-white">{t('الصف الدراسي', 'Grade Level')}</label>
                        <select
                          value={studentAuthForm.grade}
                          onChange={e => setStudentAuthForm({ ...studentAuthForm, grade: e.target.value })}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan"
                        >
                          {ACADEMIC_GRADES.map(g => (
                            <option key={g.id} value={g.id}>
                              {t(g.nameAr, g.nameEn)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-white">{t('الشعبة / النظام الدراسي', 'Department / System')}</label>
                        <select
                          value={studentAuthForm.department}
                          onChange={e => setStudentAuthForm({ ...studentAuthForm, department: e.target.value })}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan"
                        >
                          <option value="general">{t('عربي / عام', 'General / Arabic')}</option>
                          <option value="languages">{t('لغات / Integrated Science', 'Languages')}</option>
                          <option value="stem">{t('مدارس STEM', 'STEM Schools')}</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block mb-1.5 font-semibold text-white">{t('كلمة المرور الآمنة', 'Password')}</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={studentAuthForm.password}
                      onChange={e => setStudentAuthForm({ ...studentAuthForm, password: e.target.value })}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light py-3 font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20 text-xs"
                  >
                    {studentAuthMode === 'login' 
                      ? t('الدخول للأكاديمية وتفعيل الدروس', 'Login as Student') 
                      : t('تسجيل طالب جديد فورا', 'Register New Student')}
                  </button>

                  <div className="text-center pt-3 border-t border-slate-800/60 flex justify-between text-[11px] text-slate-400">
                    {studentAuthMode === 'login' ? (
                      <>
                        <span>{t('ليس لديك حساب؟', 'New Student?')}</span>
                        <button
                          type="button"
                          onClick={() => setStudentAuthMode('register')}
                          className="text-brand-cyan hover:underline font-bold"
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
                          className="text-brand-cyan hover:underline font-bold"
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

      {/* Modal: Enroll Now checkout form */}
      {isEnrollModalOpen && enrollingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/95 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl">
            
            <button
              onClick={() => setIsEnrollModalOpen(false)}
              className="absolute top-4 left-4 rounded-lg bg-slate-900 p-2 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {enrollSuccess ? (
              <div className="text-center py-6 space-y-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xl mx-auto">
                  ✓
                </span>
                <h3 className="text-lg font-black text-white">{t('تم تسجيل طلب الحجز بنجاح!', 'Booking Registered Successfully!')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t(
                    'تمت إضافة اشتراكك لقاعدة البيانات. سيقوم طاقم المساعدين لالمهندس بالتواصل معك لتفعيل حسابك ومتابعة المذاكرة فورا.',
                    'Your reservation has been added to our databases. Eng/Mohamed abdal tawab’s assistants will contact you soon.'
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs text-slate-300">
                <div className="text-center mb-4">
                  <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider font-mono">Instant Booking</span>
                  <h3 className="text-base font-black text-white mt-1">{t('نموذج الاشتراك الفوري بالكورس', 'Course Enrollment Form')}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 truncate max-w-xs mx-auto">
                    {t(enrollingCourse.titleAr, enrollingCourse.titleEn)}
                  </p>
                </div>

                <div>
                  <label className="block mb-1.5 font-semibold text-white">{t('اسمك الثلاثي بالكامل', 'Your Full Name')}</label>
                  <input
                    type="text"
                    required
                    value={enrollForm.name}
                    onChange={e => setEnrollForm({ ...enrollForm, name: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-semibold text-white">{t('بريدك الإلكتروني (لتفعيل الحساب)', 'Your Email Address')}</label>
                  <input
                    type="email"
                    required
                    value={enrollForm.email}
                    onChange={e => setEnrollForm({ ...enrollForm, email: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-semibold text-white">{t('رقم الموبايل للتنسيق والواتساب', 'Phone / WhatsApp Number')}</label>
                  <input
                    type="text"
                    required
                    value={enrollForm.phone}
                    onChange={e => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingEnroll}
                  className="w-full rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light py-3 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/20"
                >
                  {submittingEnroll ? t('جاري تأكيد الحجز ومزامنة الملفات...', 'Processing...') : t('تأكيد الحجز الفوري', 'Confirm Enrollment Booking')}
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Protected Video Modal Overlay */}
      {activeVideoModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <button
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
