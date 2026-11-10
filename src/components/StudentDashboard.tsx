import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Course, Lesson, Quiz, UserAuth, Assignment, AssignmentSubmission, Certificate, ChatMessage, LessonComment, Notification, Category, Order 
} from '../types';
import { dbService, authService, firestoreDb } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useLanguage } from './LanguageContext';
import { verifyCourseAccess, formatVideoEmbedUrl, formatPdfEmbedUrl, normalizeCourseLessons } from '../utils/authAccess';
import { triggerFileDownload, getFileFromIndexedDB } from '../utils/videoStorage';
import { getFileFromFirestoreChunks } from '../utils/firestoreMediaStorage';
import { doesCourseMatchStudent, doesCourseMatchStudentGrade, ACADEMIC_GRADES, ACADEMIC_SUBJECTS, getGradeName, getCourseDisplayTitle, normalizeGradeCode } from '../utils/gradeMatching';
import { SubscriptionRequiredView } from './SubscriptionRequiredView';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { 
  BookOpen, Video, Award, Send, User, ChevronRight, Download, Upload, CheckCircle2,
  Clock, Sparkles, MessageSquare, Bell, LogOut, Check, X, ShieldAlert, FileText, ChevronLeft,
  Calendar, Star, SendHorizontal, Paperclip, Loader2, HelpCircle, BellRing, CheckCheck, Trash2, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentDashboardProps {
  onLogout: () => void;
  onNavigateHome: () => void;
}

type StudentSubTab = 
  | 'overview'
  | 'my-courses'
  | 'player'
  | 'exams'
  | 'assignments'
  | 'chat'
  | 'profile'
  | 'notifications';

const EmbeddedPdfViewer: React.FC<{ url: string; title?: string }> = ({ url, title }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let createdUrl: string | null = null;
    let isSubscribed = true;

    if (url.startsWith('firestore://')) {
      setIsLoading(true);
      const key = url.replace('firestore://', '');
      getFileFromFirestoreChunks(key).then(blob => {
        if (!isSubscribed) return;
        if (blob) {
          createdUrl = URL.createObjectURL(blob);
          setResolvedUrl(createdUrl);
        } else {
          setResolvedUrl(null);
        }
        setIsLoading(false);
      }).catch(err => {
        console.error("Failed to load PDF from Firestore:", err);
        if (isSubscribed) setIsLoading(false);
      });
    } else if (url.startsWith('indexeddb://')) {
      setIsLoading(true);
      const key = url.replace('indexeddb://', '');
      getFileFromIndexedDB(key).then(blob => {
        if (!isSubscribed) return;
        if (blob) {
          createdUrl = URL.createObjectURL(blob);
          setResolvedUrl(createdUrl);
        } else {
          setResolvedUrl(null);
        }
        setIsLoading(false);
      }).catch(err => {
        console.error("Failed to load PDF from IndexedDB:", err);
        if (isSubscribed) setIsLoading(false);
      });
    } else {
      setResolvedUrl(formatPdfEmbedUrl(url));
    }

    return () => {
      isSubscribed = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [url]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-brand-cyan" />
        <span className="text-xs font-bold">جاري تحميل الملف...</span>
      </div>
    );
  }

  const finalSrc = resolvedUrl || formatPdfEmbedUrl(url);

  if (!finalSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
        رابط الملف المرفق فارغ.
      </div>
    );
  }

  return (
    <iframe
      src={finalSrc}
      className="w-full h-full border-none"
      title={title || "PDF Viewer"}
    />
  );
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onLogout, onNavigateHome }) => {
  const { language, t, direction } = useLanguage();
  const [currentUser, setCurrentUser] = useState<UserAuth | null>(null);
  const [activeTab, setActiveTab] = useState<StudentSubTab>('overview');

  // DB States
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [assignmentTasks, setAssignmentTasks] = useState<Assignment[]>([]);
  const [assignments, setAssignments] = useState<AssignmentSubmission[]>([]);
  const [assignmentsSubTab, setAssignmentsSubTab] = useState<'tasks' | 'submissions'>('tasks');
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState<Assignment | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'activation' | 'lecture' | 'exams'>('all');
  const [floatingToast, setFloatingToast] = useState<Notification | null>(null);
  const prevNotifIdsRef = useRef<Set<string>>(new Set());
  const isInitialNotifLoadRef = useRef<boolean>(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  const isStudentSubscribedToCourse = useCallback((courseId?: string) => {
    if (!courseId || courseId === 'all' || courseId.trim() === '') return true;
    if (myCourses.some(c => c.id === courseId)) return true;
    if (courses.some(c => c.id === courseId && verifyCourseAccess(currentUser, c, myOrders).allowed)) return true;
    if (allPublishedCoursesRef.current.some(c => c.id === courseId && verifyCourseAccess(currentUser, c, myOrders).allowed)) return true;
    if (currentUser?.purchasedCourseIds?.includes(courseId)) return true;
    if (myOrders.some(o => {
      const st = (o.status || '').trim().toLowerCase();
      const isApproved = ['completed', 'approved', 'active', 'graded'].includes(st);
      return isApproved && (o.courseId === courseId || o.itemType === 'course');
    })) return true;
    return false;
  }, [myCourses, courses, currentUser, myOrders]);

  const publishedQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      if (quiz.published === false) return false;

      const quizGradeNorm = normalizeGradeCode(quiz.grade);
      const studentGradeNorm = normalizeGradeCode(currentUser?.grade);

      const isGradeMatch = !quizGradeNorm || quizGradeNorm === 'all' || !studentGradeNorm || studentGradeNorm === 'all' || quizGradeNorm === studentGradeNorm;

      const isCourseMatch = quiz.courseId && quiz.courseId !== 'all' && quiz.courseId.trim() !== '' 
        ? isStudentSubscribedToCourse(quiz.courseId) 
        : false;

      return isGradeMatch || isCourseMatch;
    });
  }, [quizzes, currentUser?.grade, isStudentSubscribedToCourse]);

  const publishedAssignmentTasks = useMemo(() => {
    return assignmentTasks.filter(task => {
      if (task.published === false) return false;

      const taskGradeNorm = normalizeGradeCode(task.grade);
      const studentGradeNorm = normalizeGradeCode(currentUser?.grade);
      const isGradeMatch = !taskGradeNorm || taskGradeNorm === 'all' || !studentGradeNorm || studentGradeNorm === 'all' || taskGradeNorm === studentGradeNorm;

      if (!isGradeMatch) return false;

      const isCourseVis = task.visibility === 'course' || (task.visibility !== 'free' && task.courseId && task.courseId !== 'all' && task.courseId.trim() !== '');

      if (isCourseVis) {
        if (task.courseId && task.courseId !== 'all' && task.courseId.trim() !== '') {
          if (isStudentSubscribedToCourse(task.courseId)) return true;
        }
        const hasSubscribedCourse = myCourses.length > 0 ||
          (currentUser?.purchasedCourseIds && currentUser.purchasedCourseIds.length > 0) ||
          myOrders.some(o => {
            const st = (o.status || '').trim().toLowerCase();
            return ['completed', 'approved', 'active', 'graded'].includes(st);
          });
        return hasSubscribedCourse;
      }

      return true;
    });
  }, [assignmentTasks, currentUser?.grade, currentUser?.purchasedCourseIds, isStudentSubscribedToCourse, myCourses, myOrders]);

  // Active items for detail/player view
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const allPublishedCoursesRef = useRef<Course[]>([]);

  // Loading / Messages
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', bio: '', grade: '1prep' });
  const [newCommentText, setNewCommentText] = useState('');
  const [homeworkText, setHomeworkText] = useState('');
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);
  const [homeworkUploading, setHomeworkUploading] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // Quiz-taking State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({}); // questionId -> optionIndex
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState<number>(0); // remaining seconds
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const handleSubmitQuizRef = useRef<() => Promise<void>>(async () => {});

  // Platform Review State
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Certificate Modal State
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  // Course Password Lock States
  const [passwordPromptCourse, setPasswordPromptCourse] = useState<Course | null>(null);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [unlockedCourseIds, setUnlockedCourseIds] = useState<string[]>(() => {
    try {
      const activeUser = authService.getCurrentUser();
      if (activeUser?.id) {
        const saved = localStorage.getItem(`unlocked_courses_${activeUser.id}`);
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Scroll for Chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load initial data
  const loadStudentData = async () => {
    try {
      setLoading(true);
      const user = authService.getCurrentUser();
      if (!user) {
        onLogout();
        return;
      }
      setCurrentUser(user);
      setProfileForm({ name: user.name, phone: user.phone, bio: user.bio || '' });

      // Load all published courses, quizzes, assignment tasks, assignment submissions, certificates, orders
      const [allCategories, allCoursesRaw, allQuizzes, allAssignmentTasks, allAssignments, allCertificates, allOrders] = await Promise.all([
        dbService.getCategories(),
        dbService.getCourses(),
        dbService.getQuizzes(),
        dbService.getAssignmentTasks(),
        dbService.getAssignments(user.id),
        dbService.getCertificates(user.id),
        dbService.getOrders()
      ]);

      setCategories(allCategories);
      setMyOrders(allOrders);

      // Refresh user from Firestore directly to ensure purchasedCourseIds is up to date
      let latestUser = { ...user };
      try {
        if (user.id || (user as any).uid) {
          const uRef = doc(firestoreDb, 'users', user.id || (user as any).uid);
          const uSnap = await getDoc(uRef);
          if (uSnap.exists()) {
            const fbData = uSnap.data() as UserAuth;
            latestUser = { ...latestUser, ...fbData };
          }
        }
      } catch (e) {
        console.error("Error refreshing user from Firestore:", e);
      }

      // Only published courses for students
      const publishedCourses = allCoursesRaw.filter(c => c.published !== false);
      allPublishedCoursesRef.current = publishedCourses;

      // Filter courses matching student grade & department
      const gradeCourses = publishedCourses.filter(c => 
        doesCourseMatchStudent(c, latestUser.grade, latestUser.department, allCategories)
      );

      const finalCourses = gradeCourses.length > 0 ? gradeCourses : publishedCourses;

      const enrolled = publishedCourses.filter(c => verifyCourseAccess(latestUser, c, allOrders).allowed);
      setMyCourses(enrolled);

      const mergedPurchased = enrolled.map(c => c.id);
      latestUser.purchasedCourseIds = mergedPurchased;
      setCurrentUser(latestUser);
      setProfileForm({ name: latestUser.name || '', phone: latestUser.phone || '', bio: latestUser.bio || '', grade: latestUser.grade || '1prep' });
      localStorage.setItem('academy_active_user', JSON.stringify(latestUser));

      setCourses(finalCourses);
      setQuizzes(allQuizzes);
      setAssignmentTasks(allAssignmentTasks);
      setAssignments(allAssignments);
      setCertificates(allCertificates);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  // Set up real-time courses and orders listener for automatic updates when admin approves/publishes
  useEffect(() => {
    if (!currentUser) return;
    const unsubCourses = dbService.listenToCourses((allCoursesRaw) => {
      const publishedCourses = allCoursesRaw.filter(c => c.published !== false);
      allPublishedCoursesRef.current = publishedCourses;
      const gradeCourses = publishedCourses.filter(c => 
        doesCourseMatchStudent(c, currentUser.grade, currentUser.department, categories)
      );
      const finalCourses = gradeCourses.length > 0 ? gradeCourses : publishedCourses;
      setCourses(finalCourses);
      const enrolled = publishedCourses.filter(c => verifyCourseAccess(currentUser, c, myOrders).allowed);
      setMyCourses(enrolled);
    });

    const unsubOrders = dbService.listenToOrders((allOrders) => {
      setMyOrders(allOrders);
      const coursesToFilter = allPublishedCoursesRef.current.length > 0 ? allPublishedCoursesRef.current : courses;
      const enrolled = coursesToFilter.filter(c => verifyCourseAccess(currentUser, c, allOrders).allowed);
      setMyCourses(enrolled);
      
      const updatedPurchased = enrolled.map(c => c.id);
      const userWithUpdatedCourses = { ...currentUser, purchasedCourseIds: updatedPurchased };
      setCurrentUser(userWithUpdatedCourses);
      localStorage.setItem('academy_active_user', JSON.stringify(userWithUpdatedCourses));
    });

    let unsubUser: (() => void) | undefined;
    if (currentUser.id || (currentUser as any).uid) {
      try {
        const uRef = doc(firestoreDb, 'users', currentUser.id || (currentUser as any).uid);
        unsubUser = onSnapshot(uRef, (snap) => {
          if (snap.exists()) {
            const fbData = snap.data() as UserAuth;
            const savedLocal = localStorage.getItem('academy_active_user');
            let localTime = Date.now();
            if (savedLocal) {
              try { localTime = JSON.parse(savedLocal).lastLoginTimestamp || Date.now(); } catch {}
            }
            const updatedUser = { ...currentUser, ...fbData };
            const loginTime = updatedUser.lastLoginTimestamp || localTime;
            updatedUser.lastLoginTimestamp = loginTime;

            const globalVerStr = localStorage.getItem('academy_global_force_logout_ver');
            const globalVer = globalVerStr ? Number(globalVerStr) : 0;
            const userVer = fbData.forceLogoutVersion ? Number(fbData.forceLogoutVersion) : 0;

            if ((globalVer > 0 && loginTime < globalVer) || (userVer > 0 && loginTime < userVer)) {
              authService.logout();
              onLogout();
              alert('تم إنهاء جميع جلسات الدخول وتسجيل الخروج من المنصة بواسطة إدارة المنصة وقسم IT.');
              return;
            }
            const coursesToFilter = allPublishedCoursesRef.current.length > 0 ? allPublishedCoursesRef.current : courses;
            const enrolled = coursesToFilter.filter(c => verifyCourseAccess(updatedUser, c, myOrders).allowed);
            const updatedPurchased = enrolled.map(c => c.id);
            const finalUser = { ...updatedUser, purchasedCourseIds: updatedPurchased };
            setCurrentUser(finalUser);
            localStorage.setItem('academy_active_user', JSON.stringify(finalUser));
            setMyCourses(enrolled);
          }
        });
      } catch (err) {
        console.error("User doc listener err:", err);
      }
    }

    const unsubQuizzes = dbService.listenToQuizzes((realtimeQuizzes) => {
      setQuizzes(realtimeQuizzes);
    });

    const unsubAssignmentTasks = dbService.listenToAssignmentTasks((realtimeTasks) => {
      setAssignmentTasks(realtimeTasks);
    });

    const unsubAssignmentSubmissions = dbService.listenToAssignmentSubmissions((realtimeSubs) => {
      if (currentUser) {
        setAssignments(realtimeSubs.filter(s => s.studentId === currentUser.id));
      }
    });

    return () => {
      if (unsubCourses) unsubCourses();
      if (unsubOrders) unsubOrders();
      if (unsubQuizzes) unsubQuizzes();
      if (unsubAssignmentTasks) unsubAssignmentTasks();
      if (unsubAssignmentSubmissions) unsubAssignmentSubmissions();
      if (unsubUser) unsubUser();
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.grade, currentUser?.department, categories]);

  useEffect(() => {
    if (selectedCourse && (courses.length > 0 || myCourses.length > 0)) {
      const liveCourseRaw = courses.find(c => c.id === selectedCourse.id) || myCourses.find(c => c.id === selectedCourse.id);
      if (liveCourseRaw && liveCourseRaw !== selectedCourse) {
        const liveCourse = normalizeCourseLessons(liveCourseRaw);
        setSelectedCourse(liveCourse);
        if (activeLesson) {
          const liveLesson = liveCourse.lessons?.find(l => l.id === activeLesson.id) || liveCourse.lessons?.[0] || null;
          if (liveLesson) setActiveLesson(liveLesson);
        } else if (liveCourse.lessons && liveCourse.lessons.length > 0) {
          setActiveLesson(liveCourse.lessons[0]);
        }
      }
    }
  }, [courses, myCourses, selectedCourse, activeLesson]);

  useEffect(() => {
    if (activeTab === ('subscription-required' as any) && selectedCourse) {
      const access = verifyCourseAccess(currentUser, selectedCourse, myOrders);
      if (access.allowed) {
        setActiveTab('player');
      }
    }
  }, [activeTab, selectedCourse, currentUser, myOrders]);

  // Set up real-time chat listener and online status heartbeat
  useEffect(() => {
    if (!currentUser?.id) return;
    const studentId = currentUser.id;
    const studentName = currentUser.name;

    // Update online status immediately and every 30 seconds
    dbService.updateStudentOnlineStatus(studentId, studentName, true);
    const interval = setInterval(() => {
      dbService.updateStudentOnlineStatus(studentId, studentName, true);
    }, 30000);

    const unsubscribe = dbService.listenToChatMessages(studentId, (messages) => {
      setChatMessages(messages);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => {
      clearInterval(interval);
      dbService.updateStudentOnlineStatus(studentId, studentName, false);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.id]);

  // Play subtle chime sound when an instant alert arrives
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio context may require prior user interaction
    }
  }, []);

  // Set up real-time notification listener with instant floating alerts & sound chime
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = dbService.listenToNotifications(currentUser.id, currentUser.email || '', (notifs) => {
      setNotifications(notifs);

      // Detect brand-new unread notifications received while user is online
      if (!isInitialNotifLoadRef.current) {
        const brandNew = notifs.find(n => !prevNotifIdsRef.current.has(n.id) && !n.isRead);
        if (brandNew) {
          setFloatingToast(brandNew);
          playNotificationSound();
        }
      } else {
        isInitialNotifLoadRef.current = false;
      }

      prevNotifIdsRef.current = new Set(notifs.map(n => n.id));
    });
    return () => unsubscribe();
  }, [currentUser, playNotificationSound]);

  // Auto-dismiss floating toast after 7 seconds
  useEffect(() => {
    if (!floatingToast) return;
    const timer = setTimeout(() => {
      setFloatingToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [floatingToast]);

  // Set up real-time comments listener
  useEffect(() => {
    if (!selectedCourse || !activeLesson) return;
    const unsubscribe = dbService.listenToComments(selectedCourse.id, activeLesson.id, (commentsList) => {
      setComments(commentsList);
    });
    return () => unsubscribe();
  }, [selectedCourse, activeLesson]);

  const handleAddReview = async () => {
    if (!userComment.trim()) {
      setReviewError(t('برجاء كتابة تعليق أو رأي أولاً!', 'Please write a comment or review first!'));
      return;
    }
    setSubmittingReview(true);
    setReviewError('');
    try {
      let gradeLabelAr = 'طالب قسم تكنولوجيا المعلومات (IT)';
      let gradeLabelEn = 'Academy Student';
      if (currentUser?.grade === '1sec') {
        gradeLabelAr = 'الصف الأول الثانوي (علوم متكاملة)';
        gradeLabelEn = '1st Secondary (Integrated Science)';
      } else if (currentUser?.grade === '3prep') {
        gradeLabelAr = 'الصف الثالث الإعدادي';
        gradeLabelEn = '3rd Prep Grade';
      } else if (currentUser?.grade === '2prep') {
        gradeLabelAr = 'الصف الثاني الإعدادي';
        gradeLabelEn = '2nd Prep Grade';
      } else if (currentUser?.grade === '1prep') {
        gradeLabelAr = 'الصف الأول الإعدادي';
        gradeLabelEn = '1st Prep Grade';
      }

      await dbService.addReview({
        studentName: currentUser?.name || 'طالب تكنولوجيا المعلومات',
        studentTitleAr: gradeLabelAr,
        studentTitleEn: gradeLabelEn,
        rating: userRating,
        commentAr: userComment,
        commentEn: userComment,
        approved: false // Set to false so the teacher can approve it in the admin panel!
      });
      setReviewSubmitted(true);
      setUserComment('');
      setSuccessMsg(t('شكراً لتقييمك! تم إرسال التقييم وسيقوم المهندس محمد عبد التواب بمراجعته قريباً للظهور في الصفحة الرئيسية.', 'Thank you! Your review has been submitted and is pending teacher approval.'));
    } catch (err) {
      console.error("Error submitting review:", err);
      setReviewError(t('فشل إرسال التقييم. حاول مرة أخرى.', 'Failed to submit review. Try again.'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setActionLoading(true);
    try {
      await authService.updateUserProfile(currentUser.id, profileForm);
      setCurrentUser(prev => prev ? { ...prev, ...profileForm } : null);
      setSuccessMsg(t('تم تحديث الملف الشخصي بنجاح!', 'Profile updated successfully!'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  // Chat sender
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    try {
      dbService.updateStudentOnlineStatus(currentUser.id, currentUser.name, true);
      await dbService.addChatMessage(currentUser.id, {
        senderId: currentUser.id,
        senderName: currentUser.name,
        text,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Watched Lesson toggle progress tracking
  const handleToggleLessonComplete = async (lessonId: string) => {
    if (!currentUser || !selectedCourse) return;
    const currentWatched = currentUser.watchedLessonIds || [];
    let updated: string[];
    if (currentWatched.includes(lessonId)) {
      updated = currentWatched.filter(id => id !== lessonId);
    } else {
      updated = [...currentWatched, lessonId];
    }

    try {
      await authService.updateUserProfile(currentUser.id, { watchedLessonIds: updated });
      setCurrentUser(prev => prev ? { ...prev, watchedLessonIds: updated } : null);
      
      // Auto-trigger certificate if all lessons of selected course are completed!
      if (selectedCourse.lessons) {
        const courseLessonIds = selectedCourse.lessons.map(l => l.id);
        const allCompleted = courseLessonIds.every(id => updated.includes(id));
        
        // Also check if they has a certificate already
        const hasCert = certificates.some(cert => cert.courseId === selectedCourse.id);
        if (allCompleted && !hasCert) {
          // Generate certificate of completion!
          const code = 'CERT-' + selectedCourse.id.substring(0, 4).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
          const newCert = await dbService.addCertificate({
            studentId: currentUser.id,
            studentName: currentUser.name,
            courseId: selectedCourse.id,
            courseTitleAr: selectedCourse.titleAr,
            courseTitleEn: selectedCourse.titleEn,
            issueDate: new Date().toLocaleDateString('ar-EG'),
            verificationCode: code
          });
          setCertificates(prev => [...prev, newCert]);
          // Notify
          await dbService.addNotification({
            userId: currentUser.id,
            titleAr: '🎉 تهانينا! حصلت على شهادة جديدة',
            titleEn: '🎉 Congratulations! You earned a new certificate',
            bodyAr: `لقد أكملت بنجاح كورس "${selectedCourse.titleAr}". شهادة التخرج الخاصة بك جاهزة الآن للعرض والتحميل!`,
            bodyEn: `You have successfully completed "${selectedCourse.titleEn}". Your graduation certificate is ready!`,
            isRead: false,
            createdAt: new Date().toISOString()
          });
          setSuccessMsg(t('تهانينا! لقد أكملت الكورس بنجاح وحصلت على شهادة التخرج.', 'Congratulations! You completed the course and earned a certificate.'));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Comment submitter
  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCourse || !activeLesson || !newCommentText.trim()) return;
    const text = newCommentText.trim();
    setNewCommentText('');
    try {
      await dbService.addComment({
        courseId: selectedCourse.id,
        lessonId: activeLesson.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        comment: text,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Assignment Submit
  const handleAssignmentSubmit = async (e: React.FormEvent, taskToSubmit?: Assignment | null) => {
    e.preventDefault();
    if (!currentUser) return;
    const task = taskToSubmit || selectedTaskForSubmission;
    const targetCourseId = task?.courseId || selectedCourse?.id || '';
    const targetLessonId = activeLesson?.id || '';
    const targetHomeworkAr = task?.titleAr || activeLesson?.homework || t('واجب مدرسي', 'Homework Task');

    if (!homeworkText.trim() && !homeworkFile) {
      setErrorMsg(t('برجاء كتابة نص الإجابة أو إرفاق صورة/ملف الحل للواجب.', 'Please provide solution text or attach a homework file/image.'));
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      let fileUrl = '';
      if (homeworkFile) {
        setHomeworkUploading(true);
        try {
          fileUrl = await dbService.uploadFile(homeworkFile, 'homeworks');
        } finally {
          setHomeworkUploading(false);
        }
      }

      const added = await dbService.submitAssignment({
        assignmentId: task?.id || undefined,
        studentId: currentUser.id,
        studentName: currentUser.name,
        courseId: targetCourseId,
        lessonId: targetLessonId,
        homeworkAr: targetHomeworkAr,
        studentText: homeworkText,
        fileUrl,
        date: new Date().toLocaleDateString('ar-EG'),
        status: 'submitted'
      });

      setAssignments(prev => [...prev.filter(s => s.id !== added.id), added]);
      setHomeworkText('');
      setHomeworkFile(null);
      setIsSubmissionModalOpen(false);
      setSelectedTaskForSubmission(null);
      setSuccessMsg(t('تم تسليم الواجب بنجاح للمصحح المساعد!', 'Homework submitted successfully!'));
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit homework');
    } finally {
      setActionLoading(false);
    }
  };

  // Quiz-taking mechanics
  const handleStartQuiz = (quiz: Quiz) => {
    if (quiz.published === false) {
      alert(t('هذا الامتحان غير متاح للطلاب حالياً.', 'This exam is not available currently.'));
      return;
    }
    if (quiz.courseId && quiz.courseId !== 'all' && quiz.courseId.trim() !== '') {
      const isSubscribed = isStudentSubscribedToCourse(quiz.courseId);
      if (!isSubscribed) {
        alert(t('عفواً، يجب الاشتراك في الكورس المرتبط بالامتحان أولاً.', 'You must enroll in the associated course first to take this exam.'));
        return;
      }
    }

    setActiveQuiz(quiz);
    setActiveTab('exams');
  };

  const handleSelectOption = (questionId: string, index: number) => {
    if (quizFinished) return;
    setQuizAnswers(prev => {
      const updated = { ...prev, [questionId]: index };
      if (activeQuiz && currentUser) {
        const userId = currentUser.id || 'student';
        const draftStorageKey = `quiz_draft_${userId}_${activeQuiz.id}`;
        try {
          localStorage.setItem(draftStorageKey, JSON.stringify(updated));
        } catch (err) {
          console.error("Draft save error:", err);
        }
      }
      return updated;
    });
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !currentUser || isSubmittingQuiz) return;
    setIsSubmittingQuiz(true);

    try {
      const userId = currentUser.id || 'student';
      const questions = activeQuiz.questions || [];
      
      let correctCount = 0;
      questions.forEach(q => {
        if (quizAnswers[q.id] === q.correctAnswerIndex) {
          correctCount++;
        }
      });

      const totalQs = questions.length > 0 ? questions.length : 1;
      const percent = Math.round((correctCount / totalQs) * 100);

      setQuizScore(percent);
      setQuizFinished(true);

      const subStorageKey = `quiz_sub_${userId}_${activeQuiz.id}`;
      const startStorageKey = `quiz_start_${userId}_${activeQuiz.id}`;
      const draftStorageKey = `quiz_draft_${userId}_${activeQuiz.id}`;

      const submissionData = {
        score: percent,
        correctCount,
        totalQuestions: totalQs,
        answers: quizAnswers,
        submittedAt: new Date().toISOString()
      };

      try {
        localStorage.setItem(subStorageKey, JSON.stringify(submissionData));
        localStorage.removeItem(startStorageKey);
        localStorage.removeItem(draftStorageKey);
      } catch (err) {
        console.error("Submission storage save error:", err);
      }

      // Update student profile in Firestore
      const currentGrades = currentUser.quizGrades || {};
      const updatedGrades = { ...currentGrades, [activeQuiz.id]: percent };

      try {
        await authService.updateUserProfile(userId, { quizGrades: updatedGrades });
        setCurrentUser(prev => prev ? { ...prev, quizGrades: updatedGrades } : null);
      } catch (err) {
        console.error("Error updating user profile quiz grade:", err);
      }

      // Record detailed submission document in Firestore
      try {
        const subDocRef = doc(firestoreDb, 'quiz_submissions', `${userId}_${activeQuiz.id}`);
        await setDoc(subDocRef, {
          studentId: userId,
          studentName: currentUser.name || '',
          studentEmail: currentUser.email || '',
          quizId: activeQuiz.id,
          quizTitle: activeQuiz.titleAr || activeQuiz.titleEn || '',
          courseId: activeQuiz.courseId || '',
          score: percent,
          correctCount,
          totalQuestions: totalQs,
          answers: quizAnswers,
          submittedAt: new Date().toISOString()
        }, { merge: true });
      } catch (subErr) {
        console.warn("Quiz submission record write warning:", subErr);
      }
    } catch (err) {
      console.error("Critical error in handleSubmitQuiz:", err);
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Keep handleSubmitQuizRef synchronized with latest state
  useEffect(() => {
    handleSubmitQuizRef.current = handleSubmitQuiz;
  });

  // Real-time Timer and Exam Session Persistence Effect
  useEffect(() => {
    if (!activeQuiz || !currentUser) {
      setQuizTimeRemaining(0);
      return;
    }

    const userId = currentUser.id || 'student';
    const quizId = activeQuiz.id;
    const subStorageKey = `quiz_sub_${userId}_${quizId}`;
    const startStorageKey = `quiz_start_${userId}_${quizId}`;
    const draftStorageKey = `quiz_draft_${userId}_${quizId}`;

    // 1. Check if exam is already submitted
    const existingGrade = currentUser.quizGrades?.[quizId];
    const storedSubRaw = localStorage.getItem(subStorageKey);

    if (existingGrade !== undefined || storedSubRaw) {
      setQuizFinished(true);
      if (existingGrade !== undefined) {
        setQuizScore(existingGrade);
      } else if (storedSubRaw) {
        try {
          const parsed = JSON.parse(storedSubRaw);
          setQuizScore(parsed.score || 0);
        } catch {}
      }

      if (storedSubRaw) {
        try {
          const parsed = JSON.parse(storedSubRaw);
          if (parsed.answers) {
            setQuizAnswers(parsed.answers);
          }
        } catch {}
      }
      return;
    }

    // 2. Unsubmitted quiz: initialize active session
    setQuizFinished(false);
    setQuizScore(0);

    const savedDraftRaw = localStorage.getItem(draftStorageKey);
    if (savedDraftRaw) {
      try {
        setQuizAnswers(JSON.parse(savedDraftRaw));
      } catch {
        setQuizAnswers({});
      }
    } else {
      setQuizAnswers({});
    }

    // 3. Initialize Timer from timeLimit (mins)
    const durationMinutes = (activeQuiz.timeLimit && activeQuiz.timeLimit > 0) ? activeQuiz.timeLimit : 30;
    const totalDurationSec = durationMinutes * 60;

    let startTime = parseInt(localStorage.getItem(startStorageKey) || '0', 10);
    if (!startTime || isNaN(startTime)) {
      startTime = Date.now();
      localStorage.setItem(startStorageKey, startTime.toString());
    }

    const calcRemainingSeconds = () => {
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      return Math.max(0, totalDurationSec - elapsedSec);
    };

    const initialRem = calcRemainingSeconds();
    setQuizTimeRemaining(initialRem);

    if (initialRem <= 0) {
      // Time expired, auto-submit
      handleSubmitQuizRef.current();
      return;
    }

    const timerInterval = setInterval(() => {
      const rem = calcRemainingSeconds();
      setQuizTimeRemaining(rem);
      if (rem <= 0) {
        clearInterval(timerInterval);
        handleSubmitQuizRef.current();
      }
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [activeQuiz, currentUser]);

  const formatQuizTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNotificationRead = async (id: string) => {
    try {
      await dbService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      if (currentUser) {
        await dbService.markAllNotificationsAsRead(currentUser.id, currentUser.email || '');
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await dbService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (floatingToast?.id === id) setFloatingToast(null);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await handleNotificationRead(notif.id);
    }
    if (notif.courseId) {
      const targetCourse = courses.find(c => c.id === notif.courseId) || myCourses.find(c => c.id === notif.courseId);
      if (targetCourse) {
        handleSelectCourse(targetCourse);
        setActiveTab('player');
        setIsNotificationDropdownOpen(false);
        return;
      }
    }
    if (notif.type === 'assignment' || notif.titleAr?.includes('واجب') || notif.titleAr?.includes('شيت')) {
      setActiveTab('assignments');
      setIsNotificationDropdownOpen(false);
      return;
    }
    if (notif.type === 'exam' || notif.titleAr?.includes('امتحان') || notif.titleAr?.includes('اختبار')) {
      setActiveTab('exams');
      setIsNotificationDropdownOpen(false);
      return;
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return language === 'ar' ? 'منذ لحظات' : 'Just now';
      if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60);
        return language === 'ar' ? `منذ ${mins} دقيقة` : `${mins}m ago`;
      }
      if (diffSec < 86400) {
        const hours = Math.floor(diffSec / 3600);
        return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
      }
      return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      if (notificationFilter === 'unread') return !notif.isRead;
      if (notificationFilter === 'activation') return notif.type === 'course_activated' || notif.titleAr?.includes('تفعيل');
      if (notificationFilter === 'lecture') return notif.type === 'lecture_added' || notif.titleAr?.includes('محاضر') || notif.titleAr?.includes('سكشن');
      if (notificationFilter === 'exams') return notif.type === 'assignment' || notif.type === 'exam' || notif.titleAr?.includes('امتحان') || notif.titleAr?.includes('واجب') || notif.titleAr?.includes('شيت');
      return true;
    });
  }, [notifications, notificationFilter]);

  const handleOpenProtectedLink = (
    url: string | undefined | null,
    course: Course | null | undefined,
    linkType: 'video' | 'pdf' | 'file' = 'file',
    task?: Assignment | null
  ) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === '#') {
      alert(t('هذا الرابط فارغ أو غير متاح حالياً.', 'This link is empty or currently unavailable.'));
      return;
    }

    const cleanUrl = url.trim();

    // Admin & Teacher always have full access
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'teacher')) {
      triggerFileDownload(cleanUrl, task?.titleAr || task?.titleEn || course?.titleAr || 'document.pdf');
      return;
    }

    // Always allow opening Data URLs, Blob URLs, or IndexedDB stored files
    if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:') || cleanUrl.startsWith('indexeddb://')) {
      triggerFileDownload(cleanUrl, task?.titleAr || task?.titleEn || course?.titleAr || 'file_download');
      return;
    }

    // Check if student has ANY active subscription or approved order
    const hasAnySubscription =
      (currentUser?.purchasedCourseIds && currentUser.purchasedCourseIds.length > 0) ||
      myCourses.length > 0 ||
      myOrders.some(o => {
        const st = (o.status || '').trim().toLowerCase();
        return ['completed', 'approved', 'active', 'graded'].includes(st);
      });

    // If opening an assignment task / sheet
    if (task) {
      if (task.visibility === 'free' || hasAnySubscription) {
        triggerFileDownload(cleanUrl, task.titleAr || task.titleEn || 'assignment_sheet.pdf');
        return;
      } else {
        alert(t('عفواً، يتطلب تنزيل الشيت الاشتراك في كورس هذا الصف الدراسي أولاً.', 'You must subscribe to a course first to download this sheet.'));
        return;
      }
    }

    // If course is provided
    if (course) {
      const access = verifyCourseAccess(currentUser, course, myOrders);
      if (access.allowed || hasAnySubscription) {
        triggerFileDownload(cleanUrl, course.titleAr || 'course_file.pdf');
        return;
      }
      if (access.reason === 'not_logged_in') {
        onLogout();
      } else {
        setSelectedCourse(course);
        setActiveTab('subscription-required' as any);
      }
      return;
    }

    // General file link for logged in student
    if (currentUser) {
      triggerFileDownload(cleanUrl, 'document.pdf');
      return;
    }

    triggerFileDownload(cleanUrl, 'document.pdf');
  };

  const handleOpenCoursePlayer = (course: Course) => {
    const access = verifyCourseAccess(currentUser, course, myOrders);
    if (!access.allowed) {
      if (access.reason === 'not_logged_in') {
        onLogout();
      } else {
        setSelectedCourse(course);
        setActiveTab('subscription-required' as any);
      }
      return;
    }

    if (course.password && course.password.trim() !== '' && !unlockedCourseIds.includes(course.id)) {
      setPasswordPromptCourse(course);
      setEnteredPassword('');
      setPasswordError('');
      return;
    }
    proceedToPlayer(course);
  };

  const proceedToPlayer = (courseParam: Course) => {
    const rawCourse = courses.find(c => c.id === courseParam.id) || myCourses.find(c => c.id === courseParam.id) || allPublishedCoursesRef.current.find(c => c.id === courseParam.id) || courseParam;
    const originalCourse = normalizeCourseLessons(rawCourse);
    const access = verifyCourseAccess(currentUser, originalCourse, myOrders);
    if (!access.allowed) {
      if (access.reason === 'not_logged_in') {
        onLogout();
      } else {
        setSelectedCourse(originalCourse);
        setActiveTab('subscription-required' as any);
      }
      return;
    }

    setSelectedCourse(originalCourse);
    if (originalCourse.lessons && originalCourse.lessons.length > 0) {
      setActiveLesson(originalCourse.lessons[0]);
    } else {
      setActiveLesson(null);
    }
    setActiveTab('player');
  };

  const handleVerifyCoursePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPromptCourse) return;
    const targetCourse = passwordPromptCourse;
    if (enteredPassword.trim() === (targetCourse.password || '').trim()) {
      const nextUnlocked = Array.from(new Set([...unlockedCourseIds, targetCourse.id]));
      setUnlockedCourseIds(nextUnlocked);
      if (currentUser?.id) {
        localStorage.setItem(`unlocked_courses_${currentUser.id}`, JSON.stringify(nextUnlocked));
      }

      setPasswordPromptCourse(null);
      setEnteredPassword('');
      setPasswordError('');
      proceedToPlayer(targetCourse);
    } else {
      setPasswordError(t('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.', 'Incorrect password, please try again.'));
    }
  };

  return (
    <div className="min-h-[85vh] py-8 text-slate-100 font-sans" dir={direction}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Profile Card Header */}
        {currentUser && (
          <div className="mb-8 rounded-2xl glass p-6 border border-slate-800/80 bg-slate-950/40 shadow-xl flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex items-center gap-4 text-center md:text-right">
              <div className="h-16 w-16 rounded-full bg-brand-cyan/10 border-2 border-brand-cyan flex items-center justify-center text-3xl font-black">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2 justify-center md:justify-start">
                  {currentUser.name}
                  <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-brand-cyan-light px-2.5 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider">
                    {t('طالب تكنولوجيا المعلومات', 'Academy Student')}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">{currentUser.email} • {currentUser.phone || t('لا يوجد هاتف', 'No mobile number')}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{t('تاريخ الانتساب والاشتراك:', 'Enrollment date:')} {currentUser.enrollmentDate || '2026-07-19'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center items-center">
              {/* Notification Quick Bell Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationDropdownOpen(prev => !prev)}
                  className={`relative rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                    unreadNotificationsCount > 0
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300'
                  }`}
                  title={t('إشعارات الأكاديمية الفورية', 'Academy Alerts')}
                >
                  <Bell className={`h-4 w-4 ${unreadNotificationsCount > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">{t('الإشعارات', 'Notifications')}</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center font-mono">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Popover */}
                <AnimatePresence>
                  {isNotificationDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 rtl:left-auto rtl:right-0 mt-2 w-80 sm:w-96 rounded-2xl glass bg-slate-950/95 border border-slate-800 p-4 shadow-2xl z-50 text-right space-y-3"
                      style={{ direction }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <BellRing className="h-4 w-4 text-brand-cyan" />
                          {t('إشعارات الأكاديمية الفورية', 'Academy Alerts')}
                        </span>
                        <div className="flex items-center gap-2">
                          {unreadNotificationsCount > 0 && (
                            <button
                              type="button"
                              onClick={handleMarkAllNotificationsRead}
                              className="text-[10px] text-brand-cyan hover:underline cursor-pointer"
                            >
                              {t('تحديد الكل كمقروء', 'Mark all read')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsNotificationDropdownOpen(false)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-500 text-xs">
                            {t('لا توجد إشعارات جديدة حالياً.', 'No notifications available.')}
                          </div>
                        ) : (
                          notifications.slice(0, 6).map(notif => (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                notif.isRead
                                  ? 'bg-slate-900/30 border-slate-800/60 text-slate-400'
                                  : 'bg-cyan-950/30 border-cyan-500/30 text-white shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-xs truncate flex items-center gap-1">
                                  <span>{notif.type === 'course_activated' ? '🎓' : notif.type === 'lecture_added' ? '📚' : '📢'}</span>
                                  <span>{t(notif.titleAr, notif.titleEn)}</span>
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono shrink-0">{formatTimeAgo(notif.createdAt)}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 line-clamp-2">{t(notif.bodyAr, notif.bodyEn)}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="border-t border-slate-800/80 pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('notifications');
                            setIsNotificationDropdownOpen(false);
                          }}
                          className="text-xs text-brand-cyan hover:text-brand-cyan-light font-bold flex items-center justify-center gap-1 w-full py-1 cursor-pointer"
                        >
                          <span>{t('عرض جميع الإشعارات بالتفصيل', 'View All Notifications Center')}</span>
                          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => onNavigateHome()}
                className="rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-brand-cyan" />
                {t('بوابة المناهج الدراسية', 'Browse Curriculums')}
              </button>
              <button
                onClick={onLogout}
                className="rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {t('خروج آمن', 'Sign Out')}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-4 space-y-1">
              <h3 className="text-slate-500 text-[10px] uppercase font-bold tracking-wider px-3 mb-2 font-mono">{t('لوحة الطالب', 'Student Workspace')}</h3>
              
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'overview' ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-cyan-950/30' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Sparkles className="h-4.5 w-4.5" />
                <span>{t('نظرة عامة والتقدم', 'Overview & Progress')}</span>
              </button>

              <button
                onClick={() => setActiveTab('my-courses')}
                className={`w-full rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'my-courses' || activeTab === 'player' ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-cyan-950/30' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Video className="h-4.5 w-4.5" />
                <span>{t('مناهجي المشتركة', 'My Enrolled Courses')}</span>
                {myCourses.length > 0 && (
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'my-courses' ? 'bg-brand-dark text-brand-cyan' : 'bg-slate-900 text-brand-cyan'}`}>
                    {myCourses.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer relative ${
                  activeTab === 'notifications' ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-cyan-950/30' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Bell className={`h-4.5 w-4.5 ${unreadNotificationsCount > 0 ? (activeTab === 'notifications' ? 'text-brand-dark' : 'text-amber-400 animate-bounce') : ''}`} />
                <span>{t('إشعارات الأكاديمية', 'Academy Notifications')}</span>
                {unreadNotificationsCount > 0 && (
                  <span className={`mr-auto rtl:mr-auto ltr:ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeTab === 'notifications' ? 'bg-brand-dark text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono'
                  }`}>
                    {unreadNotificationsCount} {t('جديد', 'New')}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('exams')}
                className={`w-full rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'exams' ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-cyan-950/30' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>{t('الاختبارات الإلكترونية', 'Online Exams')}</span>
                {publishedQuizzes.length > 0 && (
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-brand-cyan`}>
                    {publishedQuizzes.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('assignments')}
                className={`w-full rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'assignments' ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-cyan-950/30' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <FileText className="h-4.5 w-4.5" />
                <span>{t('الواجبات والتقييمات', 'My Homeworks')}</span>
                {publishedAssignmentTasks.length > 0 && (
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-brand-cyan`}>
                    {publishedAssignmentTasks.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`w-full rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'chat' ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-cyan-950/30' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <MessageSquare className="h-4.5 w-4.5" />
                <span>{t('استشارة المهندس والمساعدين', 'Live Support Chat')}</span>
                <span className="inline-block h-2 w-2 rounded-full bg-brand-cyan animate-pulse ml-auto" />
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'profile' ? 'bg-brand-cyan text-brand-dark shadow-lg shadow-cyan-950/30' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <User className="h-4.5 w-4.5" />
                <span>{t('الملف الشخصي وكلمة المرور', 'Profile Settings')}</span>
              </button>
            </div>

            {/* Notification alert bells widget */}
            {notifications.length > 0 && (
              <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-brand-cyan animate-bounce" />
                    {t('إشعارات الأكاديمية الفورية', 'Academic Alerts')}
                  </span>
                  <span className="rounded bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan-light px-1.5 py-0.5 text-[9px] font-mono">
                    {unreadNotificationsCount} {t('جديد', 'New')}
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                  {notifications.slice(0, 3).map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-2 rounded-lg transition-all cursor-pointer border ${
                        notif.isRead ? 'bg-slate-900/20 border-transparent text-slate-400' : 'bg-brand-cyan/5 border-cyan-500/20 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold truncate">{t(notif.titleAr, notif.titleEn)}</p>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">{formatTimeAgo(notif.createdAt)}</span>
                      </div>
                      <p className="text-[10px] mt-0.5 line-clamp-2">{t(notif.bodyAr, notif.bodyEn)}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-1 text-center border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    className="text-[11px] text-brand-cyan hover:underline font-bold cursor-pointer"
                  >
                    {t('عرض كل الإشعارات والتنبيهات 🔔', 'View All Notifications 🔔')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Board View Panel */}
          <div className="lg:col-span-3">
            
            {successMsg && (
              <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-bold text-emerald-400 flex items-center gap-2 animate-fadeIn">
                <span>✓</span>
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-bold text-red-400 flex items-center gap-2 animate-fadeIn">
                <ShieldAlert className="h-4.5 w-4.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-cyan border-t-transparent" />
                <p className="text-xs text-slate-400 font-mono">Synchronizing academy study logs...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                
                {/* SUBTAB 1: STUDENT OVERVIEW */}
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Bento Box Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      <div className="rounded-2xl glass p-5 border border-slate-800 bg-slate-950/40 relative overflow-hidden group">
                        <span className="absolute -top-3 -right-3 text-6xl text-slate-800 opacity-20 select-none">📚</span>
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">{t('مناهج تدرسها', 'Enrolled Courses')}</p>
                        <h4 className="text-3xl font-black text-white mt-2 font-mono">{myCourses.length}</h4>
                        <button 
                          onClick={() => setActiveTab('my-courses')} 
                          className="text-[10px] text-brand-cyan hover:underline mt-4 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {t('عرض جميع الكورسات', 'View all courses')}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="rounded-2xl glass p-5 border border-slate-800 bg-slate-950/40 relative overflow-hidden group">
                        <span className="absolute -top-3 -right-3 text-6xl text-slate-800 opacity-20 select-none">🧪</span>
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">{t('الدروس المكتملة', 'Completed Lessons')}</p>
                        <h4 className="text-3xl font-black text-white mt-2 font-mono">{(currentUser?.watchedLessonIds || []).length}</h4>
                        <p className="text-[10px] text-slate-500 mt-4">{t('مستمر بالمذاكرة المنتظمة', 'Keep up the excellent work!')}</p>
                      </div>

                      <div className="rounded-2xl glass p-5 border border-slate-800 bg-slate-950/40 relative overflow-hidden group">
                        <span className="absolute -top-3 -right-3 text-6xl text-slate-800 opacity-20 select-none">🏆</span>
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">{t('شهادات التخرج المعتمدة', 'Certificates Earned')}</p>
                        <h4 className="text-3xl font-black text-white mt-2 font-mono">{certificates.length}</h4>
                        <p className="text-[10px] text-brand-cyan-light mt-4 font-mono">{t('بإمضاء م. محمد عبد التواب', 'Signed by Eng/Mohamed abdal tawab')}</p>
                      </div>

                    </div>

                    {/* Certificates Carousel/List */}
                    {certificates.length > 0 && (
                      <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-6 space-y-4">
                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                          <Award className="h-5 w-5 text-brand-cyan" />
                          {t('شهادات التخرج المعتمدة الخاصة بك', 'Your Graduation Certificates')}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {certificates.map((cert) => (
                            <div 
                              key={cert.id} 
                              className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between gap-4 hover:border-brand-cyan/20 transition-all"
                            >
                              <div>
                                <h4 className="text-xs font-black text-white">{t(cert.courseTitleAr, cert.courseTitleEn)}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 font-mono">{cert.verificationCode}</p>
                                <p className="text-[10px] text-slate-500">{t('صدرت بتاريخ:', 'Issued on:')} {cert.issueDate}</p>
                              </div>
                              <button
                                onClick={() => setSelectedCertificate(cert)}
                                className="rounded-lg bg-brand-cyan text-brand-dark p-2 hover:bg-brand-cyan-light cursor-pointer shadow-lg shadow-cyan-950/20 flex items-center justify-center"
                                title={t('عرض الشهادة ومشاركتها', 'View Certificate')}
                              >
                                <Award className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unenrolled Promo banner if none */}
                    {myCourses.length === 0 && (
                      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 space-y-4 text-center">
                        <h3 className="text-lg font-black text-white">{t('لم يتم تفعيل أي مقررات دراسية بحسابك بعد!', 'No active courses activated yet!')}</h3>
                        <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                          {t(
                            'تصفح مقررات قسم تكنولوجيا المعلومات (IT) بالجامعة التكنولوجية بإشراف Eng/Mohamed abdal tawab، واختر المقرر لطلب التفعيل والوصول الفوري لملفات المحاضرات (PDF) والسكاشن (Word) وبنك الامتحانات والشيتات.',
                            'Explore accredited IT courses at the Technological University supervised by Eng/Mohamed abdal tawab. Choose your course to request activation for immediate access to lectures, Word lab sheets, and exam archives.'
                          )}
                        </p>
                        <button
                          onClick={() => onNavigateHome()}
                          className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-6 py-3 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-cyan-950/20"
                        >
                          {t('تصفح المقررات الأكاديمية الآن', 'Browse IT Courses Now')}
                        </button>
                      </div>
                    )}

                    {/* Homework list overview */}
                    <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-6 space-y-4">
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <FileText className="h-5 w-5 text-brand-cyan" />
                        {t('حالة تسليم الواجبات المنزلية', 'My Homework Submissions Status')}
                      </h3>

                      {assignments.length > 0 ? (
                        <div className="space-y-3">
                          {assignments.map((assign) => (
                            <div key={assign.id} className="rounded-xl border border-slate-900 bg-slate-950 p-4 text-xs flex flex-col sm:flex-row justify-between gap-4">
                              <div>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-mono mb-2 ${
                                  assign.status === 'graded' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {assign.status === 'graded' ? t('تم التصحيح والتقييم', 'Graded') : t('قيد مراجعة المصححين', 'Pending Correcting')}
                                </span>
                                <h4 className="font-black text-white">{assign.homeworkAr}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 font-mono">{t('تاريخ التسليم:', 'Submitted date:')} {assign.date}</p>
                                {assign.studentText && <p className="text-[11px] text-slate-400 mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/50">{assign.studentText}</p>}
                              </div>

                              {assign.status === 'graded' && (
                                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 sm:max-w-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-[10px]">{t('الدرجة / التقييم:', 'Your score:')}</span>
                                    <span className="text-brand-cyan font-black font-mono text-sm">{assign.grade}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-300 italic leading-normal">
                                    <strong>{t('ملاحظة المهندس:', 'Teacher feedback:')}</strong> {assign.feedback || t('ممتاز واصل المذاكرة والدراسة!', 'Excellent!')}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">{t('لا يوجد واجبات مسلمة حالياً.', 'No submitted assignments found.')}</p>
                      )}
                    </div>



                  </motion.div>
                )}

                {/* SUBTAB 2: MY COURSES */}
                {activeTab === 'my-courses' && (() => {
                  const displayCourses = myCourses;
                  return (
                    <motion.div
                      key="my-courses"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <h3 className="font-bold text-white text-base">{t('مناهجي المشتركة', 'My Enrolled Courses')}</h3>
                        <span className="text-xs text-slate-400 font-mono">{displayCourses.length} Courses</span>
                      </div>

                      {displayCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {displayCourses.map((course) => {
                            const access = verifyCourseAccess(currentUser, course, myOrders);
                            return (
                              <div 
                                key={course.id} 
                                onClick={() => handleOpenCoursePlayer(course)}
                                className="rounded-2xl glass border border-slate-800 bg-slate-950/40 p-5 flex flex-col justify-between hover:border-brand-cyan/30 cursor-pointer group transition-all"
                              >
                                <div>
                                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 relative">
                                    <img 
                                      src={course.bannerUrl || course.thumbnailUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'} 
                                      alt={course.titleAr} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3 justify-between">
                                      <span className="rounded-lg bg-brand-cyan text-brand-dark px-2 py-0.5 text-[9px] font-bold">
                                        {course.duration}
                                      </span>
                                      {access.allowed ? (
                                        <span className="rounded-lg bg-emerald-500/90 text-slate-950 px-2 py-0.5 text-[9px] font-bold">
                                          {t('متاح للمشاهدة', 'Enrolled')}
                                        </span>
                                      ) : access.reason === 'pending_approval' ? (
                                        <span className="rounded-lg bg-blue-500/90 text-slate-950 px-2 py-0.5 text-[9px] font-bold">
                                          {t('قيد المراجعة', 'Pending Review')}
                                        </span>
                                      ) : (
                                        <span className="rounded-lg bg-amber-500/90 text-slate-950 px-2 py-0.5 text-[9px] font-bold">
                                          {t('اشتراك مطلوب', 'Subscription Required')}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <h4 className="text-sm font-black text-white mt-4 group-hover:text-brand-cyan-light transition-all line-clamp-2">
                                    {getCourseDisplayTitle(course, language)}
                                  </h4>
                                  
                                  {/* Progress bar */}
                                  {access.allowed && (() => {
                                    const lessons = course.lessons || [];
                                    const total = lessons.length;
                                    const watched = lessons.filter(l => currentUser?.watchedLessonIds?.includes(l.id)).length;
                                    const percent = total > 0 ? Math.round((watched / total) * 100) : 0;
                                    return (
                                      <div className="mt-4 space-y-1.5 text-[10px] text-slate-400">
                                        <div className="flex justify-between">
                                          <span>{t('نسبة التقدم والمشاهدة:', 'Study Progress:')}</span>
                                          <span className="font-mono font-bold text-brand-cyan">{percent}%</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                                          <div className="h-full bg-brand-cyan transition-all duration-500" style={{ width: `${percent}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleOpenCoursePlayer(course); }}
                                  className={`w-full rounded-xl py-2.5 font-bold text-xs mt-5 transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                                    access.allowed 
                                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30' 
                                      : access.reason === 'pending_approval'
                                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                                      : 'bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30'
                                  }`}
                                >
                                  {access.allowed ? (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                                      <span>✅ {t('تم الاشتراك (افتح المشغل)', 'Subscribed (Open Player)')}</span>
                                    </>
                                  ) : access.reason === 'pending_approval' ? (
                                    <>
                                      <Clock className="h-4 w-4 shrink-0" />
                                      <span>{t('جاري مراجعة الطلب', 'Pending Review')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Video className="h-4 w-4 shrink-0" />
                                      <span>{t('اشترك الآن / عرض التفاصيل', 'Enroll Now / View Details')}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-500 font-bold">
                          {t('لا توجد كورسات مشتركة حالياً. يمكنك تصفح الكورسات والاشتراك بها.', 'No enrolled courses found. Browse courses and enroll today.')}
                        </div>
                      )}
                    </motion.div>
                  );
                })()}

                {/* SUBTAB 3: COURSE PLAYER */}
                {activeTab === 'player' && selectedCourse && (() => {
                  const access = verifyCourseAccess(currentUser, selectedCourse, myOrders);
                  if (!access.allowed) {
                    return (
                      <SubscriptionRequiredView
                        course={selectedCourse}
                        onNavigateBack={() => setActiveTab('my-courses')}
                        onEnroll={(c, e) => onNavigateHome()}
                        onLogin={onLogout}
                        language={language}
                        reason={access.reason}
                      />
                    );
                  }

                  return (
                    <motion.div
                      key="player"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                    {/* Back Button */}
                    <button
                      onClick={() => setActiveTab('my-courses')}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('العودة لقائمة كورساتي', 'Back to courses')}
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      
                      {/* University Document & Lab Hub Column */}
                      <div className="lg:col-span-2 space-y-6">
                        {activeLesson ? (
                          <div className="space-y-5">
                            {/* Academic Item Header Card */}
                            <div className="rounded-2xl glass bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 p-6 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-brand-cyan px-2.5 py-0.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20">
                                      {activeLesson.isSection || activeLesson.wordUrl ? t("🔬 سكشن عملي / معمل", "Lab Section") : t("📖 محاضرة جامعية معتمدة", "Accredited Lecture")}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                                      Eng/Mohamed abdal tawab
                                    </span>
                                  </div>
                                  <h3 className="text-lg sm:text-xl font-black text-white">{t(activeLesson.titleAr, activeLesson.titleEn)}</h3>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleLessonComplete(activeLesson.id)}
                                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                      currentUser?.watchedLessonIds?.includes(activeLesson.id)
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                        : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                                    }`}
                                  >
                                    <Check className="h-4 w-4" />
                                    <span>{currentUser?.watchedLessonIds?.includes(activeLesson.id) ? t("تمت المذاكرة ✅", "Completed") : t("تحديد كمكتمل", "Mark as Done")}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Quick Action Download Buttons Bar */}
                              <div className="flex flex-wrap items-center gap-3">
                                {activeLesson.pdfUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenProtectedLink(activeLesson.pdfUrl!, selectedCourse, "pdf")}
                                    className="flex-1 min-w-[200px] flex items-center justify-center gap-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 px-4 py-3 text-xs font-bold transition-all cursor-pointer shadow-md"
                                  >
                                    <Download className="h-4 w-4" />
                                    <span>{t("تحميل ملف المحاضرة (PDF)", "Download Lecture PDF")}</span>
                                  </button>
                                )}

                                {activeLesson.wordUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenProtectedLink(activeLesson.wordUrl!, selectedCourse, "file")}
                                    className="flex-1 min-w-[200px] flex items-center justify-center gap-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 px-4 py-3 text-xs font-bold transition-all cursor-pointer shadow-md"
                                  >
                                    <Download className="h-4 w-4" />
                                    <span>{t("تحميل شيت السكشن العملي (Word .docx)", "Download Lab Sheet (Word)")}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Optional Explanatory Video Accordion */}
                            {activeLesson.videoUrl && (
                              <details className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition-all">
                                <summary className="cursor-pointer text-xs font-bold text-slate-400 hover:text-brand-cyan flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <span>▶️</span>
                                    <span>{t("عرض تسجيل الشرح التوضيحي للمحاضرة / السكشن (اختياري)", "Watch Video Explanation (Optional)")}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">{t("انقر للفتح / الإغلاق", "Toggle")}</span>
                                </summary>
                                <div className="mt-4">
                                  <CustomVideoPlayer
                                    src={activeLesson.videoUrl}
                                    title={activeLesson.titleAr}
                                    user={currentUser}
                                  />
                                </div>
                              </details>
                            )}

                            {/* Attachments / Worksheets / Word & PDF viewer */}
                            <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-6 space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                  <Paperclip className="h-4.5 w-4.5 text-brand-cyan" />
                                  {t("ملفات المحاضرة والسكاشن العملية (Word & PDF)", "Lecture & Lab Materials (Word & PDF)")}
                                </h4>
                                {activeLesson?.isSection && (
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                                    🔬 {t("سكشن عملي / معمل", "Lab Section")}
                                  </span>
                                )}
                              </div>

                              {/* Word Document (.docx / .doc) Dedicated Card */}
                              {activeLesson?.wordUrl && (
                                <div className="bg-gradient-to-r from-blue-950/50 to-slate-900 border border-blue-600/30 rounded-2xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-black text-lg shrink-0">
                                        📝
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono">Word Document / Lab Sheet</span>
                                        <h5 className="font-bold text-white text-xs">{t("شيت السكشن العملي / التقرير المطلوب (.docx / .doc)", "Lab Sheet & Assignment Doc")}</h5>
                                      </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-mono font-bold">DOCX</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenProtectedLink(activeLesson.wordUrl!, selectedCourse, "file")}
                                      className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow transition-all"
                                    >
                                      <Download className="h-4 w-4" />
                                      <span>{t("تحميل ملف الوورد (.docx) للسكشن", "Download Word (.docx)")}</span>
                                    </button>
                                    <a
                                      href={`https://docs.google.com/viewer?url=${encodeURIComponent(activeLesson.wordUrl)}&embedded=true`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-xl border border-blue-500/40 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 px-3.5 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                    >
                                      <span>👁️</span>
                                      <span>{t("معاينة أونلاين", "Preview Online")}</span>
                                    </a>
                                  </div>
                                </div>
                              )}

                              {activeLesson.pdfUrl ? (
                                <div className="space-y-4">
                                  {/* PDF view embedded */}
                                  <div className="w-full h-[350px] rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
                                    <EmbeddedPdfViewer url={activeLesson.pdfUrl} title="PDF Viewer" />
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => handleOpenProtectedLink(activeLesson.pdfUrl, selectedCourse, 'pdf')}
                                    className="w-full rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-3 text-xs text-brand-cyan font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                                  >
                                    <Download className="h-4 w-4" />
                                    {t('تحميل مذكرة المذاكرة والشرح والملاحظات بصيغة PDF', 'Download PDF Textbook')}
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">{t('لا يوجد ملف PDF مرفق بالحصة، راجع الملحقات الإضافية.', 'No direct PDF text attached to this lesson.')}</p>
                              )}

                              {/* Lesson Attachments list */}
                              {activeLesson.attachments && activeLesson.attachments.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-slate-900">
                                  <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">{t('ملفات الحصة المتاحة للتحميل:', 'Available Downloads:')}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {activeLesson.attachments.map((file, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleOpenProtectedLink(file, selectedCourse, 'file')}
                                        className="rounded-lg bg-slate-950 border border-slate-900 p-2.5 flex items-center justify-between text-xs hover:border-brand-cyan/20 transition-all text-slate-300 w-full text-left cursor-pointer"
                                      >
                                        <span className="truncate max-w-[180px] font-bold">{file.split('/').pop()?.split('?')[0] || `Attachment #${idx + 1}`}</span>
                                        <Download className="h-4 w-4 text-brand-cyan shrink-0" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                             {/* Assignments block for active lesson & course */}
                            {(() => {
                              const courseTasks = assignmentTasks.filter(t => t.published !== false && (t.courseId === selectedCourse.id || ((!t.courseId || t.courseId === 'all') && (normalizeGradeCode(t.grade) === 'all' || normalizeGradeCode(t.grade) === normalizeGradeCode(selectedCourse.grade)))));
                              const hasHomework = activeLesson.homework || courseTasks.length > 0;
                              if (!hasHomework) return null;

                              return (
                                <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-6 space-y-4">
                                  <div className="border-l-4 border-brand-cyan pl-4 text-xs">
                                    <span className="text-[10px] font-mono text-brand-cyan font-bold uppercase tracking-wider">Required Homework</span>
                                    <h4 className="font-black text-white text-sm mt-1">{t('📝 قسم الشيتات والتكليفات الأسبوعية لمقرر المادة:', 'Weekly Problem Sheets & Lab Assignments:')}</h4>
                                    
                                    {activeLesson.homework && (
                                      <p className="text-slate-300 mt-2 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/50 font-bold">{activeLesson.homework}</p>
                                    )}

                                    {courseTasks.map(task => (
                                      <div key={task.id} className="mt-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                        <h5 className="font-bold text-white text-xs text-brand-cyan">{task.titleAr}</h5>
                                        {task.descriptionAr && <p className="text-slate-300 text-[11px]">{task.descriptionAr}</p>}
                                        {task.pdfUrl && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenProtectedLink(task.pdfUrl!, selectedCourse, 'file', task)}
                                            className="inline-flex items-center gap-1.5 text-[11px] text-brand-cyan font-bold hover:underline cursor-pointer"
                                          >
                                            <Download className="h-3.5 w-3.5" />
                                            <span>{t('تحميل شيت الواجب PDF المرفق 📎', 'Download Homework Sheet PDF')}</span>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  <form onSubmit={(e) => handleAssignmentSubmit(e)} className="space-y-4 text-xs text-slate-300 pt-2 border-t border-slate-900">
                                    <div>
                                      <label className="block mb-1.5 font-semibold text-white">{t('اكتب حل الأسئلة أو ملاحظاتك هنا:', 'Write your answers or notes here:')}</label>
                                      <textarea
                                        rows={4}
                                        value={homeworkText}
                                        onChange={e => setHomeworkText(e.target.value)}
                                        placeholder={t('قم بكتابة الحلول أو كتابة تم حل الواجب بالمذكرة المرفقة...', 'Submit homework solutions here...')}
                                        className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan"
                                      />
                                    </div>

                                    <div>
                                      <label className="block mb-1.5 font-semibold text-white">{t('إرفاق صورة أو ملف الـ PDF لحل الواجب (اختياري):', 'Attach Homework PDF/Image (Optional):')}</label>
                                      <div className="flex items-center gap-4">
                                        <input
                                          type="file"
                                          onChange={e => setHomeworkFile(e.target.files?.[0] || null)}
                                          className="text-slate-400 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-cyan/10 file:text-brand-cyan file:hover:bg-brand-cyan/20 cursor-pointer"
                                        />
                                      </div>
                                    </div>

                                    <button
                                      type="submit"
                                      disabled={actionLoading}
                                      className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-6 py-3 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/20"
                                    >
                                      {actionLoading ? t('جاري تسليم الواجب...', 'Submitting Homework...') : t('تسليم حل الواجب لالمهندس والتقييم', 'Submit Assignment')}
                                    </button>
                                  </form>
                                </div>
                              );
                            })()}

                            {/* Real-time Lesson Comments Panel */}
                            <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-6 space-y-4">
                              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                <MessageSquare className="h-4.5 w-4.5 text-brand-cyan" />
                                {t('الأسئلة والتعليقات على الدرس', 'Lesson Q&A Discussion Forum')}
                              </h4>

                              {/* Message submit */}
                              <form onSubmit={handleAddCommentSubmit} className="flex gap-2 text-xs">
                                <input
                                  type="text"
                                  required
                                  value={newCommentText}
                                  onChange={e => setNewCommentText(e.target.value)}
                                  placeholder={t('اطرح سؤالاً على المهندس أو اكتب تعليقك...', 'Ask Eng/Mohamed abdal tawab or drop a query...')}
                                  className="flex-grow rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-white focus:outline-none focus:border-brand-cyan"
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-4 py-3 font-bold transition-all cursor-pointer"
                                >
                                  <SendHorizontal className="h-4 w-4" />
                                </button>
                              </form>

                              {/* Comments list sync */}
                              <div className="space-y-3 pt-2 max-h-72 overflow-y-auto pr-1">
                                {comments.length > 0 ? (
                                  comments.map((comm) => (
                                    <div key={comm.id} className="rounded-xl bg-slate-950 border border-slate-900 p-3 text-xs leading-relaxed">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-black text-white">{comm.studentName}</span>
                                        <span className="text-[9px] text-slate-500 font-mono">{new Date(comm.timestamp).toLocaleString('ar-EG')}</span>
                                      </div>
                                      <p className="text-slate-300 font-bold">{comm.comment}</p>
                                      {comm.reply && (
                                        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 bg-brand-cyan/5 rounded-lg p-2.5 border-r-2 border-r-brand-cyan">
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="font-black text-brand-cyan text-[11px] flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
                                              {t('رد الأستاذ / محمد عبد التواب', 'Instructor Reply - Eng/Mohamed abdal tawab')}
                                            </span>
                                            {comm.replyTimestamp && (
                                              <span className="text-[9px] text-slate-500 font-mono">{new Date(comm.replyTimestamp).toLocaleString('ar-EG')}</span>
                                            )}
                                          </div>
                                          <p className="text-slate-200 font-bold mt-1">{comm.reply}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-slate-500">{t('لا يوجد أسئلة حالية، كن الأول في طرح سؤال!', 'No comments on this lesson yet. Be the first to ask!')}</p>
                                )}
                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className="py-12 text-center text-slate-500">
                            {t('لا يوجد حصص دراسية متاحة حالياً.', 'No lessons found inside this curriculum.')}
                          </div>
                        )}
                      </div>

                      {/* Lesson Navigation Sidebar */}
                      <div className="lg:col-span-1 space-y-4">
                        
                        {/* Course Quiz access widget */}
                        {(() => {
                          const courseQuizzes = quizzes.filter(q => q.published !== false && q.courseId === selectedCourse.id);
                          if (courseQuizzes.length === 0) return null;
                          return (
                            <div className="rounded-2xl border border-brand-cyan/20 bg-brand-cyan/5 p-4 space-y-3">
                              <h4 className="font-black text-white text-xs flex items-center gap-1.5">
                                <Award className="h-4.5 w-4.5 text-brand-cyan animate-pulse" />
                                {t('🏆 قسم الامتحانات وبنك الأسئلة (Exams & Test Archive)', 'University Exams & Test Archive')}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                {t('اختبارات فورية للمذاكرة والتقييم الذاتي والحصول على شهادة التخرج.', 'Take these online exams to test your concepts and unlock graduation certificate.')}
                              </p>
                              
                              {courseQuizzes.map(associatedQuiz => {
                                const isSolved = currentUser?.quizGrades?.[associatedQuiz.id] !== undefined;
                                return (
                                  <div key={associatedQuiz.id} className="rounded-xl bg-slate-900/80 p-3 text-xs border border-slate-800 space-y-2">
                                    <div className="flex justify-between items-center gap-2">
                                      <span className="font-bold text-white text-xs truncate">{t(associatedQuiz.titleAr, associatedQuiz.titleEn)}</span>
                                      {isSolved && (
                                        <span className="font-black text-brand-cyan font-mono text-[11px] shrink-0">{currentUser.quizGrades[associatedQuiz.id]}%</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleStartQuiz(associatedQuiz)}
                                      className="w-full rounded-lg bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light py-2 px-3 font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>{isSolved ? t('مراجعة النتيجة', 'Review Result') : t('ابدأ الامتحان الآن', 'Start Quiz Now')}</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Lessons List Navigation card */}
                        <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-4 space-y-3">
                          <h4 className="font-bold text-white text-xs px-2 uppercase font-mono tracking-wider">{t('قائمة الحصص والمحاضرات', 'Lessons Syllabus')}</h4>
                          
                          <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
                            {selectedCourse.lessons && selectedCourse.lessons.map((lesson, idx) => {
                              const isActive = activeLesson?.id === lesson.id;
                              const isCompleted = currentUser?.watchedLessonIds?.includes(lesson.id);
                              
                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => setActiveLesson(lesson)}
                                  className={`w-full rounded-xl p-3 text-right flex items-center gap-3 transition-all cursor-pointer border text-xs leading-normal ${
                                    isActive 
                                      ? 'bg-brand-cyan/10 border-cyan-500/30 text-brand-cyan-light font-bold' 
                                      : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-900/60'
                                  }`}
                                >
                                  <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                                  <div className="text-right flex-grow truncate">
                                    <div className="flex items-center gap-1.5">
                                      <p className="truncate font-black">{t(lesson.titleAr, lesson.titleEn)}</p>
                                      {lesson.wordUrl && (
                                        <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[9px] font-bold shrink-0">DOCX</span>
                                      )}
                                      {lesson.pdfUrl && (
                                        <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[9px] font-bold shrink-0">PDF</span>
                                      )}
                                      {lesson.isSection && (
                                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold shrink-0">معمل</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{lesson.duration}</p>
                                  </div>
                                  {isCompleted && (
                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>

                    </div>
                  </motion.div>
                );
              })()}

                {/* SUBTAB: SUBSCRIPTION REQUIRED */}
                {(activeTab as string) === 'subscription-required' && selectedCourse && (() => {
                  const access = verifyCourseAccess(currentUser, selectedCourse, myOrders);
                  return (
                    <SubscriptionRequiredView
                      course={selectedCourse}
                      onNavigateBack={() => setActiveTab('my-courses')}
                      onEnroll={(c, e) => onNavigateHome()}
                      onLogin={onLogout}
                      language={language}
                      reason={access.reason}
                    />
                  );
                })()}

                {/* SUBTAB 4: EXAMS */}
                {activeTab === 'exams' && (
                  <motion.div
                    key="exams"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {activeQuiz ? (
                      <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-6 md:p-8 space-y-6">
                        <div className="border-b border-slate-900 pb-4 flex flex-wrap justify-between items-center gap-4">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-brand-cyan uppercase tracking-wider">Online Academic Exam</span>
                            <h3 className="text-lg font-black text-white mt-1">{t(activeQuiz.titleAr, activeQuiz.titleEn)}</h3>
                          </div>

                          <div className="flex items-center gap-3">
                            {!quizFinished && (
                              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-xs shadow-inner">
                                <Clock className="h-4 w-4 animate-pulse text-amber-400 shrink-0" />
                                <span>{formatQuizTime(quizTimeRemaining)}</span>
                              </div>
                            )}

                            <button
                              onClick={() => setActiveQuiz(null)}
                              className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:text-white cursor-pointer"
                              title={t('إغلاق الامتحان', 'Close Exam')}
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>

                        {quizFinished ? (
                          <div className="space-y-6 py-4">
                            <div className="text-center py-6 space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6">
                              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 border-2 border-brand-cyan text-brand-cyan-light text-3xl font-black shadow-lg">
                                {quizScore >= 60 ? '🏆' : '✏️'}
                              </span>
                              <h4 className="text-xl font-black text-white">{t('اكتمل الامتحان الإلكتروني بنجاح!', 'Exam Finished!')}</h4>
                              <p className="text-xs text-slate-400">
                                {t('لقد حصلت على تقييم نهائي وقدره:', 'Your evaluated performance score is:')}
                              </p>
                              <h3 className="text-4xl font-black text-brand-cyan font-mono">{quizScore}%</h3>
                            </div>

                            {/* Detailed answers review if autoCorrection is enabled */}
                            {activeQuiz.autoCorrection !== false ? (
                              <div className="space-y-4 pt-2">
                                <h4 className="text-sm font-bold text-white border-b border-slate-900 pb-2 flex items-center justify-between">
                                  <span>{t('مراجعة وتصحيح الإجابات:', 'Answers Evaluation & Review:')}</span>
                                  <span className="text-xs text-slate-400 font-mono font-normal">{activeQuiz.questions?.length || 0} {t('أسئلة', 'Questions')}</span>
                                </h4>

                                {(activeQuiz.questions || []).map((q, qIdx) => {
                                  const studentAns = quizAnswers[q.id];
                                  const isCorrect = studentAns === q.correctAnswerIndex;
                                  const optionsList = language === 'ar' ? q.optionsAr : q.optionsEn;

                                  return (
                                    <div key={q.id || qIdx} className="rounded-xl border border-slate-900 bg-slate-950 p-4 space-y-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 className="text-xs sm:text-sm font-bold text-white leading-snug">
                                          <span className="text-brand-cyan font-mono mr-1.5">{qIdx + 1}.</span>
                                          {t(q.questionAr, q.questionEn)}
                                        </h5>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${
                                          isCorrect 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        }`}>
                                          {isCorrect ? t('إجابة صحيحة ✓', 'Correct ✓') : t('إجابة خاطئة ✗', 'Incorrect ✗')}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold pt-1">
                                        {optionsList.map((opt, oIdx) => {
                                          const wasChosen = studentAns === oIdx;
                                          const isRightOption = oIdx === q.correctAnswerIndex;
                                          let optionStyle = 'bg-slate-900/40 border-slate-800 text-slate-400';

                                          if (wasChosen && isRightOption) {
                                            optionStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold';
                                          } else if (wasChosen && !isRightOption) {
                                            optionStyle = 'bg-rose-500/10 border-rose-500/40 text-rose-400 font-bold';
                                          } else if (isRightOption) {
                                            optionStyle = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/80';
                                          }

                                          return (
                                            <div key={oIdx} className={`p-3 rounded-xl border ${optionStyle} flex justify-between items-center gap-2`}>
                                              <span>{opt}</span>
                                              {wasChosen && isRightOption && (
                                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                  ✓ {t('إجابتك', 'Your answer')}
                                                </span>
                                              )}
                                              {wasChosen && !isRightOption && (
                                                <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                                  ✗ {t('إجابتك', 'Your answer')}
                                                </span>
                                              )}
                                              {!wasChosen && isRightOption && (
                                                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                  {t('الإجابة النموذجية', 'Correct Answer')}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
                                {t('تنبيه: تم إخفاء نموذج الإجابة لهذا الاختبار بناءً على إعدادات المعلم.', 'Notice: Answer keys are hidden for this test as per teacher settings.')}
                              </div>
                            )}

                            <div className="pt-4 flex justify-center">
                              <button
                                onClick={() => setActiveQuiz(null)}
                                className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-6 py-3 font-bold text-xs cursor-pointer shadow-lg shadow-cyan-950/20"
                              >
                                {t('العودة لقائمة الامتحانات', 'Close Exam Dashboard')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-900 pb-3">
                              <span>{t('إجمالي الأسئلة:', 'Total Questions:')} <strong className="text-white font-mono">{activeQuiz.questions?.length || 0}</strong></span>
                              <span>{t('الإجابات المحفوظة:', 'Saved Answers:')} <strong className="text-brand-cyan font-mono">{Object.keys(quizAnswers).length} / {activeQuiz.questions?.length || 0}</strong></span>
                            </div>

                            {activeQuiz.questions.map((q, qIdx) => (
                              <div key={q.id || qIdx} className="rounded-xl border border-slate-900 bg-slate-950 p-5 space-y-3">
                                <h4 className="text-xs sm:text-sm font-black text-white flex gap-2">
                                  <span className="text-brand-cyan font-mono">{qIdx + 1}.</span>
                                  <span>{t(q.questionAr, q.questionEn)}</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {(language === 'ar' ? q.optionsAr : q.optionsEn).map((opt, oIdx) => {
                                    const isSelected = quizAnswers[q.id] === oIdx;
                                    return (
                                      <button
                                        key={oIdx}
                                        type="button"
                                        onClick={() => handleSelectOption(q.id, oIdx)}
                                        className={`w-full rounded-xl p-3.5 text-right border transition-all cursor-pointer font-bold ${
                                          isSelected
                                            ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan-light shadow-sm shadow-cyan-950/20'
                                            : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900/80'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}

                            <div className="pt-4 border-t border-slate-900 flex justify-between items-center flex-wrap gap-3">
                              <span className="text-[11px] text-slate-500 italic">
                                {t('تُحفظ الإجابات تلقائياً فور اختيارها لتجنب ضياعها.', 'Answers are saved automatically upon selection.')}
                              </span>
                              <button
                                type="button"
                                onClick={handleSubmitQuiz}
                                disabled={isSubmittingQuiz}
                                className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-6 py-3 font-bold text-xs cursor-pointer shadow-lg shadow-cyan-950/20 disabled:opacity-50 flex items-center gap-2"
                              >
                                {isSubmittingQuiz ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>{t('جاري الإنهاء والتسليم...', 'Submitting...')}</span>
                                  </>
                                ) : (
                                  <span>{t('تسجيل وحساب درجة الامتحان فوراً', 'Submit Exam Answers')}</span>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                          <h3 className="font-bold text-white text-base">{t('جميع الامتحانات الإلكترونية المتاحة', 'Platform Online Exams')}</h3>
                        </div>

                        {publishedQuizzes.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {publishedQuizzes.map((quiz) => {
                              const isSolved = currentUser?.quizGrades?.[quiz.id] !== undefined;
                              return (
                                <div key={quiz.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 flex justify-between items-center gap-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[9px] font-mono text-brand-cyan font-bold uppercase tracking-wider">Academic Exam</span>
                                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {quiz.timeLimit || 30} {t('دقيقة', 'mins')}
                                      </span>
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-black text-white mt-0.5">{t(quiz.titleAr, quiz.titleEn)}</h4>
                                    {isSolved && (
                                      <p className="text-[10px] text-emerald-400 mt-2 font-mono font-bold">
                                        {t('تم الحل سابقاً - الدرجة:', 'Previously solved - Grade:')} {currentUser.quizGrades[quiz.id]}%
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleStartQuiz(quiz)}
                                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                                      isSolved
                                        ? 'bg-slate-900 border border-slate-800 text-emerald-400 hover:border-emerald-500/30'
                                        : 'bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light'
                                    }`}
                                  >
                                    <span>{isSolved ? t('مراجعة النتيجة', 'Review Result') : t('ابدأ الامتحان', 'Start Exam')}</span>
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">{t('لا يوجد اختبارات مدرسية حالية.', 'No quizzes currently published.')}</p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* SUBTAB 5: ASSIGNMENTS */}
                {activeTab === 'assignments' && (
                  <motion.div
                    key="assignments"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Header & Subtab Switcher */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                      <div>
                        <h3 className="font-bold text-white text-base">{t('قسم الواجبات والشييتات والتكليفات الدراسية', 'Homework & Assignments Section')}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{t('استعرض الواجبات المتاحة وحمّل الشيتات وسجل تسليماتك وتصحيح الأساتذة', 'Browse available homework tasks, download sheets, and view your grades')}</p>
                      </div>

                      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setAssignmentsSubTab('tasks')}
                          className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            assignmentsSubTab === 'tasks' ? 'bg-brand-cyan text-brand-dark shadow' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          <span>{t('الواجبات والتكليفات المتاحة', 'Available Homework')}</span>
                          {publishedAssignmentTasks.length > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${assignmentsSubTab === 'tasks' ? 'bg-brand-dark text-white' : 'bg-slate-800 text-brand-cyan'}`}>
                              {publishedAssignmentTasks.length}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setAssignmentsSubTab('submissions')}
                          className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            assignmentsSubTab === 'submissions' ? 'bg-brand-cyan text-brand-dark shadow' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{t('سجل تسليماتي', 'My Submissions')}</span>
                          {assignments.length > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${assignmentsSubTab === 'submissions' ? 'bg-brand-dark text-white' : 'bg-slate-800 text-brand-cyan'}`}>
                              {assignments.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* SUBTAB 1: AVAILABLE ASSIGNMENT TASKS */}
                    {assignmentsSubTab === 'tasks' && (
                      <div className="space-y-4">
                        {(() => {
                          const publishedTasks = publishedAssignmentTasks;

                          if (publishedTasks.length === 0) {
                            return (
                              <div className="text-center py-16 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-8 text-slate-500 space-y-3">
                                <FileText className="mx-auto h-12 w-12 text-slate-600" />
                                <h4 className="font-bold text-white text-sm">{t('لا يوجد تكليفات واجبات متاحة حالياً', 'No homework assignments currently available')}</h4>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">{t('سيقوم الأستاذ بإضافة الشيتات والواجبات المدرسية هنا فور تجهيزها.', 'Your teacher will add homework tasks and sheets here when published.')}</p>
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {publishedTasks.map(task => {
                                const course = courses.find(c => c.id === task.courseId) || myCourses.find(c => c.id === task.courseId);
                                const gradeName = task.grade && task.grade !== 'all' ? getGradeName(task.grade) : null;
                                const mySub = assignments.find(s => s.assignmentId === task.id || s.homeworkAr === task.titleAr);
                                const isSubmitted = !!mySub;

                                return (
                                  <div key={task.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 flex flex-col justify-between text-xs text-white space-y-4 shadow-lg">
                                    <div className="space-y-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="rounded-full bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-2.5 py-0.5 text-[10px] font-bold">
                                            {task.visibility === 'course' ? (task.courseName || (course ? course.titleAr : t('كورس مخصص', 'Course'))) : t('🌍 مجاني', 'Free')}
                                          </span>
                                          {gradeName && (
                                            <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold">
                                              {gradeName}
                                            </span>
                                          )}
                                        </div>

                                        {isSubmitted ? (
                                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                            mySub.status === 'graded' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          }`}>
                                            {mySub.status === 'graded' ? `${t('تم التصحيح والتقييم:', 'Graded:')} ${mySub.grade}` : t('تم التسليم (قيد التصحيح) ⏳', 'Submitted (Pending)')}
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                                            {t('لم يتم التسليم بعد', 'Not Submitted Yet')}
                                          </span>
                                        )}
                                      </div>

                                      <h4 className="text-sm font-black text-white">{t(task.titleAr, task.titleEn)}</h4>
                                      
                                      {task.descriptionAr && (
                                        <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 font-medium">
                                          {task.descriptionAr}
                                        </p>
                                      )}

                                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                          <Award className="h-3.5 w-3.5" />
                                          {task.totalGrade || 100} {t('درجة', 'pts')}
                                        </span>

                                        {task.deadline && (
                                          <span className="flex items-center gap-1 text-amber-400">
                                            <Clock className="h-3.5 w-3.5" />
                                            {t('أخر موعد:', 'Deadline:')} {task.deadline}
                                          </span>
                                        )}
                                      </div>

                                      {task.pdfUrl && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenProtectedLink(task.pdfUrl!, course || null, 'file', task)}
                                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3.5 py-2.5 text-brand-cyan font-bold transition-all cursor-pointer"
                                        >
                                          <Download className="h-4 w-4" />
                                          <span>{t('تحميل / فتح شيت الواجب PDF المرفق 📎', 'View / Download Homework Sheet PDF')}</span>
                                        </button>
                                      )}
                                    </div>

                                    <div className="pt-2 border-t border-slate-900">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTaskForSubmission(task);
                                          setIsSubmissionModalOpen(true);
                                        }}
                                        className={`w-full rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                          isSubmitted
                                            ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-brand-cyan/30'
                                            : 'bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light shadow-md'
                                        }`}
                                      >
                                        <Upload className="h-4 w-4" />
                                        <span>{isSubmitted ? t('تحديث أو إعادة تسليم الواجب', 'Update Submission') : t('تسليم حل الواجب الآن 📝', 'Submit Homework Now')}</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* SUBTAB 2: SUBMISSIONS LOG */}
                    {assignmentsSubTab === 'submissions' && (
                      <div className="space-y-4">
                        {assignments.length > 0 ? (
                          <div className="space-y-4">
                            {assignments.map((assign) => (
                              <div key={assign.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 text-xs flex flex-col sm:flex-row justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                                      assign.status === 'graded' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      {assign.status === 'graded' ? t('تم التصحيح والتقييم', 'Graded') : t('قيد مراجعة المصححين والأساتذة', 'Pending Correction')}
                                    </span>
                                  </div>

                                  <h4 className="text-sm font-black text-white">{assign.homeworkAr}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono">{t('تاريخ الإرسال:', 'Date:')} {assign.date}</p>
                                  
                                  {assign.studentText && (
                                    <div className="mt-2 bg-slate-900 p-3 rounded-lg border border-slate-800">
                                      <p className="text-slate-300 font-medium">{assign.studentText}</p>
                                    </div>
                                  )}
                                  
                                  {assign.fileUrl && (
                                    <div className="mt-2 space-y-2">
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const targetCourse = courses.find(c => c.id === assign.courseId) || myCourses.find(c => c.id === assign.courseId) || null;
                                          handleOpenProtectedLink(assign.fileUrl, targetCourse, 'file');
                                        }}
                                        className="inline-flex items-center gap-1.5 text-[10px] text-brand-cyan font-bold hover:underline cursor-pointer"
                                      >
                                        <Paperclip className="h-3.5 w-3.5" />
                                        {t('عرض الملف المرفق بالتسليم 📎', 'View attached solution file')}
                                      </button>
                                      {(assign.fileUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(assign.fileUrl)) && (
                                        <div className="max-w-xs rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-1">
                                          <img src={assign.fileUrl} alt="Attached Solution" className="w-full max-h-48 object-contain rounded-lg" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {assign.status === 'graded' && (
                                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 sm:max-w-xs space-y-2 shrink-0 self-start">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400 text-[10px] font-bold">{t('التقييم المستحق:', 'Score:')}</span>
                                      <span className="text-brand-cyan font-black text-sm font-mono">{assign.grade}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 italic">
                                      <strong>{t('ملاحظة المهندس المساعد:', 'Teacher Feedback:')}</strong> {assign.feedback || t('ممتاز استمر بالمجهود المتميز!', 'Well done, keep up!')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-500 rounded-2xl border border-slate-800 bg-slate-950/40 p-8">
                            {t('لا يوجد واجبات مسلمة حتى الآن. افتح التكليفات المتاحة لتسليم الواجب.', 'No homework submissions found.')}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* SUBTAB 6: CHAT */}
                {activeTab === 'chat' && (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-5 flex flex-col justify-between h-[650px]">
                      {/* Header info */}
                      <div className="border-b border-slate-900 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-cyan-500/10 border border-brand-cyan/20 flex items-center justify-center text-xl">
                            👨‍🏫
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-white">{t('الاستشارات المباشرة والمساعدين المخصصين', 'Live Counselor Support')}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{t('رد فوري خلال اليوم مع م. محمد عبد التواب ومساعديه للعلوم', 'Direct chat with Eng/Mohamed abdal tawab and his assistants')}</p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan-light text-[9px] px-2 py-0.5 font-bold font-mono">
                          • {t('متصل الآن', 'Online')}
                        </span>
                      </div>

                      {/* Messages scrollarea */}
                      <div className="flex-grow overflow-y-auto my-4 space-y-3 pr-2 scrollbar-thin">
                        {chatMessages.length > 0 ? (
                          chatMessages.map((msg) => {
                            const isMe = msg.senderId === currentUser?.id;
                            return (
                              <div 
                                key={msg.id} 
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`rounded-xl p-3 max-w-[85%] text-xs border leading-relaxed ${
                                  isMe 
                                    ? 'bg-brand-cyan border-brand-cyan text-brand-dark font-bold' 
                                    : 'bg-slate-900 border-slate-800 text-slate-200'
                                }`}>
                                  <p className="font-bold mb-0.5 text-[9px] opacity-70">{msg.senderName}</p>
                                  <p className="text-xs sm:text-sm">{msg.text}</p>
                                  <p className="text-[8px] text-left mt-1 opacity-50 font-mono">
                                    {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center space-y-2 text-center text-slate-500">
                            <span className="text-3xl">💬</span>
                            <p className="text-xs">{t('أهلاً بك! اطرح أي سؤال دراسي أو حجز وسيقوم المساعد بالرد الفوري.', 'Type your questions or help inquiry below to start!')}</p>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input panel */}
                      <form onSubmit={handleSendChatMessage} className="border-t border-slate-900 pt-4 flex gap-2 text-xs">
                        <input
                          type="text"
                          required
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          placeholder={t('اكتب سؤالك العلمي أو استفسار الحجز هنا...', 'Write your message here...')}
                          className="flex-grow rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-white focus:outline-none focus:border-brand-cyan text-xs sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-5 py-3 font-bold transition-all cursor-pointer shadow flex items-center justify-center shrink-0"
                        >
                          <SendHorizontal className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}

                {/* SUBTAB 7: PROFILE */}
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-6 md:p-8 space-y-6"
                  >
                    <div className="border-b border-slate-900 pb-3">
                      <h3 className="font-bold text-white text-base">{t('تعديل الملف الشخصي والبيانات', 'My Profile Settings')}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('تعديل اسمك بالكامل لطباعته بالشهادات، والهاتف الموثق.', 'Modify student full name for certificates printing.')}</p>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs text-slate-300">
                      <div>
                        <label className="block mb-1.5 font-semibold text-white">{t('اسمك بالكامل (يكتب ثلاثي للشهادة المعتمدة)', 'Your Full Name (Mandatory for Certification)')}</label>
                        <input
                          type="text"
                          required
                          value={profileForm.name}
                          onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan text-xs sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-white">{t('رقم الموبايل / واتساب لتأكيد الاشتراك', 'Mobile Phone Number')}</label>
                        <input
                          type="text"
                          required
                          value={profileForm.phone}
                          onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan text-xs sm:text-sm font-mono"
                        />
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-white">{t('الصف الدراسي', 'Grade Level')}</label>
                        <select
                          value={profileForm.grade || '1prep'}
                          onChange={e => setProfileForm({ ...profileForm, grade: e.target.value })}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan text-xs sm:text-sm"
                        >
                          {ACADEMIC_GRADES.map(g => (
                            <option key={g.id} value={g.id}>
                              {t(g.nameAr, g.nameEn)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1.5 font-semibold text-white">{t('نبذة تعريفية أو صفي الدراسي', 'My Academic Bio / Class')}</label>
                        <textarea
                          rows={3}
                          value={profileForm.bio}
                          onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                          placeholder={t('مثال: طالب بالصف الأول الإعدادي، مدرسة الشهيد أحمد...', 'e.g. Student in preparatory level 1...')}
                          className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan text-xs sm:text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-6 py-3 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/20"
                      >
                        {actionLoading ? t('جاري التحديث...', 'Saving profile details...') : t('حفظ التحديثات والبيانات الشخصية', 'Save Profile Details')}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* SUBTAB: ACADEMY NOTIFICATIONS SYSTEM */}
                {activeTab === 'notifications' && (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Header bar */}
                    <div className="rounded-2xl glass bg-slate-950/40 border border-slate-800/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-brand-cyan flex items-center justify-center shrink-0">
                          <BellRing className="h-6 w-6 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                            {t('نظام إشعارات الأكاديمية', 'Academy Notifications System')}
                            {unreadNotificationsCount > 0 && (
                              <span className="rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-0.5 text-xs font-mono font-bold">
                                {unreadNotificationsCount} {t('جديد', 'New')}
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {t('تنبيهات فورية عند رفع محاضرات وسكاشن جديدة، أو اعتماد طلبات تفعيل المقررات الأكاديمية.', 'Instant notifications for new lectures, lab sections, and course activation approvals.')}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {unreadNotificationsCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllNotificationsRead}
                            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-brand-cyan-light px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-md"
                          >
                            <CheckCheck className="h-4 w-4" />
                            <span>{t('تحديد الكل كمقروء', 'Mark All Read')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            playNotificationSound();
                          }}
                          title={t('اختبار نغمة التنبيه', 'Test chime sound')}
                          className="rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 p-2 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                        >
                          <Sparkles className="h-4 w-4 text-brand-cyan" />
                          <span className="hidden sm:inline">{t('صوت التنبيه', 'Chime')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                      {[
                        { id: 'all', label: t('جميع التنبيهات', 'All'), count: notifications.length },
                        { id: 'unread', label: t('غير مقروءة 🔔', 'Unread'), count: unreadNotificationsCount },
                        { id: 'activation', label: t('اعتماد وتفعيل المقررات 🎓', 'Course Activations'), count: notifications.filter(n => n.type === 'course_activated' || n.titleAr?.includes('تفعيل')).length },
                        { id: 'lecture', label: t('المحاضرات والسكاشن 📚', 'Lectures & Labs'), count: notifications.filter(n => n.type === 'lecture_added' || n.titleAr?.includes('محاضر') || n.titleAr?.includes('سكشن')).length },
                        { id: 'exams', label: t('الشيتات والامتحانات 📝', 'Sheets & Exams'), count: notifications.filter(n => n.type === 'assignment' || n.type === 'exam' || n.titleAr?.includes('امتحان') || n.titleAr?.includes('واجب') || n.titleAr?.includes('شيت')).length },
                      ].map(pill => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setNotificationFilter(pill.id as any)}
                          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold transition-all cursor-pointer whitespace-nowrap ${
                            notificationFilter === pill.id
                              ? 'bg-brand-cyan text-brand-dark shadow-md shadow-cyan-950/40'
                              : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-white'
                          }`}
                        >
                          <span>{pill.label}</span>
                          <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono font-bold">
                            {pill.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Notification Cards List */}
                    <div className="space-y-3">
                      {filteredNotifications.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-12 text-center space-y-3">
                          <Bell className="mx-auto h-12 w-12 text-slate-700" />
                          <h4 className="font-bold text-white text-sm">{t('لا توجد إشعارات مطابقة حالياً', 'No notifications matching filter')}</h4>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            {t('ستصلك تنبيهات فورية هنا عند رفع محاضرات جديدة، أو عند اعتماد طلب تفعيل مادة أكاديمية من قبل الإدارة.', 'You will receive real-time alerts here when new lectures are uploaded or when your course activations are approved.')}
                          </p>
                        </div>
                      ) : (
                        filteredNotifications.map((notif) => {
                          const isActivation = notif.type === 'course_activated' || notif.titleAr?.includes('تفعيل');
                          const isLecture = notif.type === 'lecture_added' || notif.titleAr?.includes('محاضر') || notif.titleAr?.includes('سكشن');
                          const isExam = notif.type === 'exam' || notif.type === 'assignment' || notif.titleAr?.includes('امتحان') || notif.titleAr?.includes('واجب') || notif.titleAr?.includes('شيت');

                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`rounded-2xl border p-5 transition-all cursor-pointer relative group overflow-hidden ${
                                notif.isRead
                                  ? 'bg-slate-950/40 border-slate-800/70 text-slate-300 hover:border-slate-700'
                                  : 'bg-gradient-to-r from-cyan-950/25 via-slate-900/70 to-slate-950/90 border-cyan-500/40 text-white shadow-lg shadow-cyan-950/20'
                              }`}
                            >
                              {!notif.isRead && (
                                <span className="absolute top-3 left-3 rtl:left-auto rtl:right-3 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/80" />
                              )}

                              <div className="flex items-start gap-4">
                                {/* Icon badge */}
                                <div className={`h-11 w-11 rounded-2xl shrink-0 flex items-center justify-center text-xl border ${
                                  isActivation
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : isLecture
                                    ? 'bg-cyan-500/10 border-cyan-500/30 text-brand-cyan'
                                    : isExam
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'bg-slate-900 border-slate-800 text-slate-300'
                                }`}>
                                  {isActivation ? '🎓' : isLecture ? '📚' : isExam ? '🏆' : '📢'}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
                                        isActivation
                                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                          : isLecture
                                          ? 'bg-cyan-500/10 text-brand-cyan-light border-cyan-500/30'
                                          : isExam
                                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                          : 'bg-slate-800 text-slate-300 border-slate-700'
                                      }`}>
                                        {isActivation ? t('اعتماد مقرر', 'Activation') : isLecture ? t('محاضرة / سكشن', 'Lecture/Lab') : isExam ? t('امتحان / تكليف', 'Exam/Sheet') : t('إشعار أكاديمي', 'Academic Alert')}
                                      </span>
                                      <h4 className="text-sm font-bold text-white truncate">{t(notif.titleAr, notif.titleEn)}</h4>
                                    </div>

                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {formatTimeAgo(notif.createdAt)}
                                    </span>
                                  </div>

                                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                                    {t(notif.bodyAr, notif.bodyEn)}
                                  </p>

                                  {/* Buttons on card */}
                                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/80">
                                    <div className="flex items-center gap-2">
                                      {notif.courseId && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNotificationClick(notif);
                                          }}
                                          className="flex items-center gap-1.5 rounded-lg bg-brand-cyan/15 hover:bg-brand-cyan text-brand-cyan hover:text-brand-dark border border-brand-cyan/30 px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer"
                                        >
                                          <BookOpen className="h-3.5 w-3.5" />
                                          <span>{t('فتح المقرر الدراسي الآن 🚀', 'Open Course Now')}</span>
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {!notif.isRead ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNotificationRead(notif.id);
                                          }}
                                          className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                          <span>{t('تحديد كمقروء', 'Mark Read')}</span>
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                          <CheckCheck className="h-3 w-3 text-cyan-400" />
                                          <span>{t('مقروء', 'Read')}</span>
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteNotification(notif.id, e)}
                                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                        title={t('حذف الإشعار', 'Delete Notification')}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            )}

          </div>

        </div>

      </div>

      {/* Real-time Floating Notification Alert Toast */}
      <AnimatePresence>
        {floatingToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-6 rtl:left-auto rtl:right-6 z-50 max-w-sm sm:max-w-md w-full rounded-2xl glass bg-slate-950/95 border-2 border-brand-cyan/60 p-4 shadow-2xl shadow-cyan-950/50"
            style={{ direction }}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan flex items-center justify-center text-xl shrink-0">
                {floatingToast.type === 'course_activated' ? '🎓' : floatingToast.type === 'lecture_added' ? '📚' : '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider font-mono">
                    {t('تنبيه أكاديمي فوري 🔔', 'Live Academy Alert 🔔')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFloatingToast(null)}
                    className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-white mt-0.5 truncate">
                  {t(floatingToast.titleAr, floatingToast.titleEn)}
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                  {t(floatingToast.bodyAr, floatingToast.bodyEn)}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleNotificationClick(floatingToast);
                      setFloatingToast(null);
                    }}
                    className="rounded-lg bg-brand-cyan text-brand-dark px-3 py-1 text-[11px] font-bold hover:bg-brand-cyan-light transition-all cursor-pointer"
                  >
                    {floatingToast.courseId ? t('فتح المقرر الآن 🚀', 'Open Course Now') : t('عرض التفاصيل', 'View Details')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFloatingToast(null)}
                    className="rounded-lg border border-slate-800 text-slate-400 hover:text-white px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer"
                  >
                    {t('إغلاق', 'Dismiss')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL VIEW FOR AUTOMATIC CERTIFICATE DISPLAY */}
      {selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/95 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-2xl border border-amber-500/20 bg-slate-950 p-6 shadow-2xl space-y-6">
            
            <button
              onClick={() => setSelectedCertificate(null)}
              className="absolute top-4 left-4 rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Certificate Styled Display Card */}
            <div className="border-4 border-double border-amber-500/30 bg-slate-950 p-8 rounded-xl text-center space-y-6 relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 h-24 w-24 bg-cyan-500/5 rounded-tr-full pointer-events-none" />

              <div className="flex justify-between items-center px-4 mb-2">
                <span className="text-[10px] text-slate-500 font-mono font-bold tracking-widest uppercase">ENG/MOHAMED ABDAL TAWAB - IT UNIVERSITY PLATFORM</span>
                <span className="text-xl">🏆</span>
              </div>

              <h1 className="text-2xl font-black text-amber-500/90 font-arabic tracking-wide">
                {t('شهادة إتمام واجتياز المقرر الأكاديمي', 'Certificate of Course Completion & Academic Merit')}
              </h1>
              
              <p className="text-xs text-slate-400 italic">
                {t('تشهد منصة Eng/Mohamed abdal tawab الأكاديمية بالجامعة التكنولوجية لقسم تكنولوجيا المعلومات IT بأن الطالب:', 'Eng/Mohamed abdal tawab IT University Platform certifies that student:')}
              </p>

              <h2 className="text-xl sm:text-2xl font-black text-white py-1 underline decoration-amber-500/40 font-arabic">
                {selectedCertificate.studentName}
              </h2>

              <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                {t(
                  `قد استوفى بنجاح متطلبات دراسة المقرر الأكاديمي واجتياز كافة شيتات السكاشن المعملية والامتحانات لـ: \n "${selectedCertificate.courseTitleAr}"\n وحصل على تقدير امتياز في التكليفات العملية والنظرية.`,
                  `has successfully fulfilled all course requirements, laboratory sheets, and examination papers for: \n "${selectedCertificate.courseTitleEn}"\n with demonstrated excellence in practical and theoretical assignments.`
                )}
              </p>

              <div className="pt-8 grid grid-cols-2 gap-4 border-t border-slate-900 text-[10px] sm:text-xs">
                <div className="text-right space-y-1">
                  <p className="text-slate-500">{t('إمضاء موجه ومعلم المادة:', 'Senior Science Educator:')}</p>
                  <p className="text-brand-cyan-light font-black text-sm italic font-arabic">{t('م. محمد عبد التواب', 'Eng/Mohamed abdal tawab')}</p>
                </div>

                <div className="text-left space-y-1">
                  <p className="text-slate-500">{t('كود التحقق والتوثيق:', 'Verification Hash Code:')}</p>
                  <p className="font-mono text-amber-500/80 font-bold">{selectedCertificate.verificationCode}</p>
                </div>
              </div>

              <p className="text-[9px] text-slate-600 font-mono pt-4">{t('مُثبتة وموثقة بقواعد البيانات السحابية للأكاديمية.', 'Digitally verified and logged in the cloud server configurations.')}</p>
            </div>

            <div className="flex justify-center gap-2">
              <button
                onClick={() => window.print()}
                className="rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light px-5 py-3 font-bold text-xs cursor-pointer shadow flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                {t('طباعة أو حفظ الشهادة كـ PDF', 'Print or Save Certificate')}
              </button>
              <button
                onClick={() => setSelectedCertificate(null)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 font-bold text-xs hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                {t('إغلاق الشهادة', 'Close Window')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PASSWORD PROMPT MODAL FOR SECURE/PASSWORD LOCKED COURSES */}
      {passwordPromptCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/95 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
            
            <button
              onClick={() => setPasswordPromptCourse(null)}
              className="absolute top-4 left-4 rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {t('الكورس مغلق بكلمة مرور', 'Course Password Required')}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t(
                  `هذا الكورس يتطلب إدخال كلمة المرور المخصصة للوصول إلى المحاضرات والدروس المرفوعة.`,
                  `This course requires a custom password to gain access to the integrated lessons and materials.`
                )}
              </p>
            </div>

            <form onSubmit={handleVerifyCoursePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('كلمة مرور الكورس', 'Course Password')}</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={enteredPassword}
                  onChange={e => setEnteredPassword(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-center text-white tracking-widest text-lg font-bold focus:outline-none focus:border-brand-cyan"
                />
              </div>

              {passwordError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center text-xs text-red-400">
                  {passwordError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPasswordPromptCourse(null)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light py-3 text-xs font-bold cursor-pointer"
                >
                  {t('تأكيد الدخول', 'Unlock & Enter')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Submission Modal for Selected Task */}
      {isSubmissionModalOpen && selectedTaskForSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 max-w-lg w-full text-xs text-white space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-brand-cyan" />
                <h3 className="font-bold text-sm text-white">{t('تسليم حل الواجب والتكليف الدراسي', 'Submit Assignment Solution')}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSubmissionModalOpen(false);
                  setSelectedTaskForSubmission(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-black text-brand-cyan text-xs">{selectedTaskForSubmission.titleAr}</h4>
              {selectedTaskForSubmission.descriptionAr && (
                <p className="text-slate-300 text-[11px] leading-relaxed">{selectedTaskForSubmission.descriptionAr}</p>
              )}
              {selectedTaskForSubmission.pdfUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const c = courses.find(cr => cr.id === selectedTaskForSubmission.courseId);
                    handleOpenProtectedLink(selectedTaskForSubmission.pdfUrl!, c || null, 'file', selectedTaskForSubmission);
                  }}
                  className="inline-flex items-center gap-1.5 text-brand-cyan hover:underline font-bold text-[11px] mt-1 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t('تنزيل شيت الواجب PDF 📎', 'Download Sheet PDF')}</span>
                </button>
              )}
            </div>

            <form onSubmit={(e) => handleAssignmentSubmit(e, selectedTaskForSubmission)} className="space-y-4">
              <div>
                <label className="block mb-1.5 font-semibold text-white">{t('اكتب حل الواجب أو ملاحظاتك هنا:', 'Write your answers or notes here:')}</label>
                <textarea
                  rows={4}
                  value={homeworkText}
                  onChange={e => setHomeworkText(e.target.value)}
                  placeholder={t('قم بكتابة الإجابة، أو توضيح أنه تم حل الواجب في المذكرة/الورقة...', 'Write your solution text or notes...')}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white focus:outline-none focus:border-brand-cyan text-xs"
                />
              </div>

              <div>
                <label className="block mb-1.5 font-semibold text-white">{t('إرفاق صورة الحل أو ملف الـ PDF (اختياري):', 'Attach Homework PDF/Image (Optional):')}</label>
                <input
                  type="file"
                  onChange={e => setHomeworkFile(e.target.files?.[0] || null)}
                  className="w-full text-slate-400 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-cyan/10 file:text-brand-cyan file:hover:bg-brand-cyan/20 cursor-pointer"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmissionModalOpen(false);
                    setSelectedTaskForSubmission(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 py-3 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-xl bg-brand-cyan text-brand-dark hover:bg-brand-cyan-light py-3 text-xs font-bold disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/20"
                >
                  {actionLoading ? t('جاري الإرسال والتسليم...', 'Submitting...') : t('إرسال الحل للمستشار والمساعدين', 'Submit Assignment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
