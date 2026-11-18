import React, { useState, useEffect } from 'react';
import { 
  Course, Category, Student, NewsItem, Article, UserReview, Message, Admin, WebsiteSettings,
  Teacher, Coupon, Order, Quiz, QuizQuestion, QuizSubmission, ChatMessage, ChatThread, Assignment, AssignmentSubmission,
  CourseUnit, UnitLesson, LessonType, LessonComment,
  LectureItem, SectionItem, ExamItem, SheetItem,
  QuestionBankItem, ScheduleItem, StudentInquiry, ExamSubmission, ActivityLogItem, OnlineExamQuestion
} from '../types';
import { dbService, authService, firebaseAuth, waitForFirebaseAuth, isAdminEmail } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { uploadLargeVideo } from '../utils/largeVideoUploader';
import { VideoHostingUploader } from './VideoHostingUploader';
import { FileUploadField } from './FileUploadField';
import { useLanguage } from './LanguageContext';
import { formatVideoEmbedUrl, parseVideoSource, normalizeCourseLessons } from '../utils/authAccess';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { triggerFileDownload } from '../utils/videoStorage';
import { ACADEMIC_GRADES, ACADEMIC_SUBJECTS, getGradeName, getCourseDisplayTitle } from '../utils/gradeMatching';
import { HERO_IT_UNIVERSITY_IMG, COURSE_PROGRAMMING_CYBER_IMG, ENG_MOHAMED_AVATAR_IMG, getCourseFallbackImage } from '../utils/platformAssets';
import { AdminLecturesManager } from './lms/AdminLecturesManager';
import { AdminSectionsManager } from './lms/AdminSectionsManager';
import { AdminSheetsManager } from './lms/AdminSheetsManager';
import { AdminExamsManager } from './lms/AdminExamsManager';
import { 
  BookOpen, Layers, Users, FileText, Megaphone, Star, Mail, Settings, ShieldAlert,
  Plus, Edit, Trash2, Check, X, Shield, Lock, Eye, EyeOff, Copy, RefreshCw, Send,
  Ticket, ShoppingBag, BarChart3, HelpCircle, GraduationCap, Award, Search, CheckCircle2,
  XCircle, UserCheck, UserX, AlertCircle, Filter, ShieldCheck, ThumbsUp, ThumbsDown, MessageSquare, Phone, ClipboardList, Clock, FileCheck, LogOut, Video, Pause, Play, WifiOff, Bell, Download,
  ListChecks, Calendar, History, Menu
} from 'lucide-react';

interface AdminPanelProps {
  onLogout: () => void;
}

type TabType = 
  | 'dashboard' 
  | 'courses' 
  | 'categories' 
  | 'students' 
  | 'registrations'
  | 'lectures'
  | 'sections'
  | 'exams'
  | 'sheets'
  | 'question-bank'
  | 'schedule'
  | 'inquiries'
  | 'activity-logs'
  | 'notifications'
  | 'teachers' 
  | 'articles' 
  | 'news' 
  | 'reviews' 
  | 'messages' 
  | 'coupons' 
  | 'orders' 
  | 'quizzes' 
  | 'assignments'
  | 'analytics' 
  | 'settings' 
  | 'admins'
  | 'lesson_comments';

const getGradeDisplay = (g?: string, lang: 'ar' | 'en' = 'ar') => {
  if (!g) return lang === 'ar' ? 'الفرقة الأولى - IT' : 'Year 1 - IT';
  const map: Record<string, { ar: string; en: string }> = {
    'year1': { ar: 'الفرقة الأولى - تكنولوجيا المعلومات', en: '1st Year - IT Dept' },
    'year2': { ar: 'الفرقة الثانية - تكنولوجيا المعلومات', en: '2nd Year - IT Dept' },
    'year3': { ar: 'الفرقة الثالثة - تكنولوجيا المعلومات', en: '3rd Year - IT Dept' },
    'year4': { ar: 'الفرقة الرابعة - تكنولوجيا المعلومات', en: '4th Year - IT Dept' },
    'general': { ar: 'عام - جميع فرق قسم IT', en: 'General - All IT Years' },
    '1prep': { ar: 'الفرقة الأولى - IT', en: '1st Year - IT' },
    '2prep': { ar: 'الفرقة الثانية - IT', en: '2nd Year - IT' },
    '3prep': { ar: 'الفرقة الثالثة - IT', en: '3rd Year - IT' },
    '1sec': { ar: 'الفرقة الرابعة - IT', en: '4th Year - IT' },
    'prep1': { ar: 'الفرقة الأولى - IT', en: '1st Year - IT' },
    'prep2': { ar: 'الفرقة الثانية - IT', en: '2nd Year - IT' },
    'prep3': { ar: 'الفرقة الثالثة - IT', en: '3rd Year - IT' },
    'sec1': { ar: 'الفرقة الرابعة - IT', en: '4th Year - IT' },
  };
  return map[g] ? (lang === 'ar' ? map[g].ar : map[g].en) : g;
};

const getDeptDisplay = (d?: string, lang: 'ar' | 'en' = 'ar') => {
  if (!d) return lang === 'ar' ? 'قسم تكنولوجيا المعلومات (IT)' : 'IT Department';
  const map: Record<string, { ar: string; en: string }> = {
    'IT': { ar: 'تكنولوجيا المعلومات (IT)', en: 'Information Technology (IT)' },
    'it': { ar: 'تكنولوجيا المعلومات (IT)', en: 'Information Technology (IT)' },
    'networks': { ar: 'الشبكات والأمن السيبراني', en: 'Networks & Cyber Security' },
    'software': { ar: 'هندسة البرمجيات', en: 'Software Engineering' },
    'cybersecurity': { ar: 'الأمن السيبراني', en: 'Cyber Security' },
    'general': { ar: 'قسم IT العام', en: 'General IT' },
  };
  return map[d] ? (lang === 'ar' ? map[d].ar : map[d].en) : d;
};

const IT_SUBJECT_OPTIONS = [
  { id: 'course_physics_it', label: 'Physics', titleAr: 'Physics – الفيزياء' },
  { id: 'course_python_it', label: 'Python', titleAr: 'Python Programming – برمجة بايثون' },
  { id: 'course_it_essentials', label: 'IT Essentials', titleAr: 'IT Essentials – أساسيات تكنولوجيا المعلومات' },
  { id: 'course_mathematics_it', label: 'Mathematics', titleAr: 'Mathematics – الرياضيات' },
  { id: 'course_cyber_security_it', label: 'Cyber Security', titleAr: 'Cyber Security – الأمن السيبراني' },
  { id: 'course_english_tech_it', label: 'English', titleAr: 'English – اللغة الإنجليزية' },
];

const resolveCourseBySubject = (subj: string) => {
  const lower = (subj || '').toLowerCase();
  const found = IT_SUBJECT_OPTIONS.find(
    s => s.label.toLowerCase() === lower || lower.includes(s.label.toLowerCase()) || s.titleAr.toLowerCase().includes(lower)
  );
  return found
    ? { courseId: found.id, courseTitle: found.titleAr }
    : { courseId: 'course_it_general', courseTitle: subj || 'IT Department' };
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const { language, t } = useLanguage();
  const currentAdmin = authService.getCurrentAdmin();
  const [fbAuthUser, setFbAuthUser] = useState<any>(() => firebaseAuth?.currentUser || null);
  const [googleSyncing, setGoogleSyncing] = useState(false);

  useEffect(() => {
    if (!dbService.isRealFirebase() || !firebaseAuth) return;
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setFbAuthUser(u);
    });
    return () => unsub();
  }, []);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [adminMobileDrawerOpen, setAdminMobileDrawerOpen] = useState(false);

  // Database States
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [assignmentTasks, setAssignmentTasks] = useState<Assignment[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [lessonComments, setLessonComments] = useState<LessonComment[]>([]);
  const [commentReplyText, setCommentReplyText] = useState<Record<string, string>>({});

  // 4 Educational Categories States (IT Department) & Advanced LMS Collections
  const [lectures, setLectures] = useState<LectureItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [sheets, setSheets] = useState<SheetItem[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [inquiries, setInquiries] = useState<StudentInquiry[]>([]);
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  // Filters & Reply Drafts for New Tabs
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [inquiryReplyDraft, setInquiryReplyDraft] = useState<Record<string, string>>({});
  const [qbSubjectFilter, setQbSubjectFilter] = useState<string>('all');
  const [qbSearch, setQbSearch] = useState<string>('');
  const [logFilter, setLogFilter] = useState<string>('all');

  // Content Modals & Active Edit Items
  const [activeContentModal, setActiveContentModal] = useState<'lecture' | 'section' | 'exam' | 'sheet' | 'question_bank' | 'schedule' | 'notification' | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);

  // Forms for Content
  const [lectureForm, setLectureForm] = useState({
    subject: 'Physics',
    lectureNumber: 1,
    title: '',
    description: '',
    youtubeUrl: '',
    pdfUrl: '',
  });

  const [sectionForm, setSectionForm] = useState({
    subject: 'Physics',
    sectionNumber: 1,
    title: '',
    description: '',
    youtubeUrl: '',
    fileUrl: '',
  });

  const [examForm, setExamForm] = useState({
    subject: 'Physics',
    number: 'Exam 1',
    title: '',
    description: '',
    questionsPdfUrl: '',
    modelAnswerUrl: '',
    examDate: '',
    isOnlineExam: false,
    durationMinutes: 30,
    showResultsImmediately: true,
    published: true,
    questions: [] as OnlineExamQuestion[],
  });

  const [tempOnlineQ, setTempOnlineQ] = useState<{
    questionText: string;
    type: 'multiple_choice' | 'true_false';
    options: string[];
    correctAnswerIndex: number;
    points: number;
    explanation: string;
  }>({
    questionText: '',
    type: 'multiple_choice',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    points: 10,
    explanation: '',
  });

  const [sheetForm, setSheetForm] = useState({
    type: 'lecture_sheet' as 'lecture_sheet' | 'section_sheet',
    subject: 'Physics',
    title: '',
    lectureNumber: 1,
    sectionNumber: 1,
    fileUrl: '',
  });

  const [questionBankForm, setQuestionBankForm] = useState({
    subject: 'Python',
    topic: '',
    questionText: '',
    type: 'multiple_choice' as 'multiple_choice' | 'true_false',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    points: 10,
    explanation: '',
  });

  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    subject: 'Physics',
    itemType: 'lecture' as 'lecture' | 'section' | 'exam',
    dayOfWeek: 'Sunday',
    dayOfWeekAr: 'الأحد',
    startTime: '09:00',
    endTime: '11:00',
    location: 'مدرج 1 - مبنى التكنولوجيا',
    instructor: 'Eng/Mohamed abdal tawab',
    notes: '',
    active: true,
  });

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'general' as 'general' | 'activation' | 'lecture' | 'exam',
    targetCourseId: 'all',
  });

  const logAdminAction = (
    action: ActivityLogItem['action'],
    targetType: ActivityLogItem['targetType'],
    targetTitle: string,
    details?: string
  ) => {
    dbService.logActivity(
      currentAdmin?.email || 'admin@mohamed-it.edu',
      currentAdmin?.name || 'Eng/Mohamed abdal tawab',
      action,
      targetType,
      targetTitle,
      details
    ).catch(() => {});
  };

  const handlePreviewAdminMedia = (url: string) => {
    if (!url) return;
    if (/\.(mp4|webm|mov|m3u8)(\?|$)|youtube\.com|youtu\.be|vimeo\.com/i.test(url)) {
      setAdminVideoPreviewUrl(url);
    } else {
      triggerFileDownload(url, 'academic-resource');
    }
  };

  // Subtabs & Modal States for Exams and Assignments
  const [assignmentsSubTab, setAssignmentsSubTab] = useState<'tasks' | 'submissions'>('tasks');
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState<string>('');
  const [selectedExamResultsQuiz, setSelectedExamResultsQuiz] = useState<Quiz | null>(null);
  const [selectedSubmissionForGrading, setSelectedSubmissionForGrading] = useState<AssignmentSubmission | null>(null);
  const [submissionGradeInput, setSubmissionGradeInput] = useState<string>('');
  const [submissionFeedbackInput, setSubmissionFeedbackInput] = useState<string>('');

  // Loading & Confirmation States
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [confirmProcessing, setConfirmProcessing] = useState<boolean>(false);

  const requestConfirmation = (
    title: string,
    message: string,
    onConfirm: () => Promise<void> | void,
    confirmLabel?: string,
    danger: boolean = true
  ) => {
    setConfirmModal({ title, message, confirmLabel, danger, onConfirm });
  };

  // Search and Filters for Course List
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState<string>('all');

  // Search and Filters for Students & Orders
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [studentRegFilter, setStudentRegFilter] = useState<string>('all');

  // Search and Filters for Messages & Live Chat
  const [messageSearchQuery, setMessageSearchQuery] = useState<string>('');
  const [messageReadFilter, setMessageReadFilter] = useState<string>('all'); // 'all', 'unread', 'read'
  const [messagesSubTab, setMessagesSubTab] = useState<'inbox' | 'liveChat'>('inbox');
  const [selectedChatStudentId, setSelectedChatStudentId] = useState<string | null>(null);
  const [liveChatMessages, setLiveChatMessages] = useState<ChatMessage[]>([]);
  const [adminReplyText, setAdminReplyText] = useState<string>('');
  const [chatThreads, setChatThreads] = useState<Record<string, ChatThread>>({});

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      await waitForFirebaseAuth();
      if (cancelled) return;
      if (dbService.isRealFirebase() && (!firebaseAuth?.currentUser || !isAdminEmail(firebaseAuth.currentUser.email || ''))) return;
      unsubscribe = dbService.listenToChatThreads((threads) => {
        if (!cancelled) setChatThreads(threads);
      });
    })();
    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fbAuthUser?.uid]);

  useEffect(() => {
    if (!selectedChatStudentId) {
      setLiveChatMessages([]);
      return;
    }
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      await waitForFirebaseAuth();
      if (cancelled) return;
      if (dbService.isRealFirebase() && (!firebaseAuth?.currentUser || !isAdminEmail(firebaseAuth.currentUser.email || ''))) return;
      unsubscribe = dbService.listenToChatMessages(selectedChatStudentId, (msgs) => {
        if (!cancelled) setLiveChatMessages(msgs);
      });
    })();
    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [selectedChatStudentId, fbAuthUser?.uid]);

  const handleGenericFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string,
    setFormState: any,
    folder = 'courses'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(fieldName);
    try {
      const url = await dbService.uploadFile(file, folder);
      if (typeof setFormState === 'function') {
        try {
          setFormState((prev: any) => {
            if (typeof prev === 'object' && prev !== null) {
              return { ...prev, [fieldName]: url };
            }
            return url;
          });
        } catch (e) {
          setFormState(url);
        }
      }
      triggerNotification(t('تم رفع الملف بنجاح!', 'File uploaded successfully!'));
    } catch (err: any) {
      console.error("Generic file upload error:", err);
      triggerNotification(err?.message || t('خطأ أثناء رفع الملف.', 'Error uploading file.'), true);
    } finally {
      setUploadingField(null);
      if (e?.target) e.target.value = '';
    }
  };

  const [adminVideoPreviewUrl, setAdminVideoPreviewUrl] = useState<string | null>(null);

  // Modals / Form States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'duplicate'>('add');
  const [selectedId, setSelectedId] = useState<string>('');

  // --- Form States ---
  // Course Form
  const [courseForm, setCourseForm] = useState<Omit<Course, 'id' | 'createdAt'>>({
    titleAr: '', titleEn: '', descriptionAr: '', descriptionEn: '',
    teacherName: 'Eng/Mohamed abdal tawab', categoryId: 'year1',
    price: 0, discountPrice: undefined, duration: '20 Hours', lessonsCount: 15,
    featured: false, popular: false, published: true,
    thumbnailUrl: '', bannerUrl: '', isFree: true, password: '', imageUrls: [], videoUrl: '', pdfUrl: '', attachments: [],
    subjectAr: '', subjectEn: '', units: []
  });
  const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
  const [unitForm, setUnitForm] = useState<{ title: string; description: string; order: number }>({ title: '', description: '', order: 1 });
  const [editingLessonUnitIndex, setEditingLessonUnitIndex] = useState<number | null>(null);
  const [editingLessonIndex, setEditingLessonIndex] = useState<number | null>(null);
  const [lessonForm, setLessonForm] = useState<{ title: string; videoUrl: string; duration: string; type: LessonType; pdfUrl: string; wordUrl?: string; isSection?: boolean; order: number }>({ title: '', videoUrl: '', duration: '15:00', type: 'video', pdfUrl: '', wordUrl: '', isSection: false, order: 1 });
  const [tempAttachment, setTempAttachment] = useState<string>('');
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

  // Category Form
  const [categoryForm, setCategoryForm] = useState<Omit<Category, 'id'>>({
    nameAr: '', nameEn: '', imageUrl: '', color: 'cyan'
  });

  // Student Form
  const [studentForm, setStudentForm] = useState<Omit<Student, 'id' | 'enrollmentDate'>>({
    name: '', email: '', phone: '', purchasedCourseIds: [], status: 'active'
  });

  // Article Form
  const [articleForm, setArticleForm] = useState<Omit<Article, 'id' | 'date'>>({
    titleAr: '', titleEn: '', contentAr: '', contentEn: '',
    authorAr: 'م. محمد عبد التواب', authorEn: 'Eng/Mohamed abdal tawab',
    imageUrl: '', tags: []
  });
  const [tempTag, setTempTag] = useState<string>('');

  // News Form
  const [newsForm, setNewsForm] = useState<Omit<NewsItem, 'id' | 'date'>>({
    titleAr: '', titleEn: '', contentAr: '', contentEn: '', imageUrl: ''
  });

  // Review Form (Quick manual insert or edit)
  const [reviewForm, setReviewForm] = useState<Omit<UserReview, 'id' | 'date'>>({
    studentName: '', studentTitleAr: '', studentTitleEn: '',
    rating: 5, commentAr: '', commentEn: '', approved: true
  });

  // Settings Form
  const [settingsForm, setSettingsForm] = useState<WebsiteSettings | null>(null);

  // Admin Form
  const [adminForm, setAdminForm] = useState<Omit<Admin, 'id'>>({
    name: '', email: '', role: 'editor'
  });

  // Teacher Form
  const [teacherForm, setTeacherForm] = useState<Omit<Teacher, 'id'>>({
    nameAr: '', nameEn: '', email: '', phone: '', bioAr: '', bioEn: '', imageUrl: '', rating: 5
  });

  // Coupon Form
  const [couponForm, setCouponForm] = useState<Omit<Coupon, 'id'>>({
    code: '', discountPercent: 10, expiresAt: '2026-12-31', active: true
  });

  // Order Form
  const [orderForm, setOrderForm] = useState<Omit<Order, 'id' | 'date'>>({
    studentId: '', studentName: '', studentEmail: '', courseId: '', courseTitle: '', pricePaid: 0, couponCode: '', status: 'completed'
  });

  // Quiz Form (Electronic Exams)
  const [quizForm, setQuizForm] = useState<Omit<Quiz, 'id'>>({
    courseId: '', grade: 'all', titleAr: '', titleEn: '', timeLimit: 30, published: true, autoCorrection: true, questions: []
  });
  const [tempQuestion, setTempQuestion] = useState<Omit<QuizQuestion, 'id'>>({
    questionAr: '', questionEn: '', optionsAr: ['', '', '', ''], optionsEn: ['', '', '', ''], correctAnswerIndex: 0
  });

  // Assignment Task Form
  const [assignmentTaskForm, setAssignmentTaskForm] = useState<Omit<Assignment, 'id'>>({
    courseId: '', courseName: '', visibility: 'free', grade: 'all', titleAr: '', titleEn: '', descriptionAr: '', descriptionEn: '',
    pdfUrl: '', imageUrls: [], deadline: '2026-12-31', totalGrade: 100, published: true, createdAt: new Date().toISOString()
  });

  // Load Database collections
  const loadData = async () => {
    try {
      setLoading(true);
      const [
        allCourses, allCategories, allStudents, allArticles, allNews, allReviews, allMessages, allAdmins, webSettings,
        allTeachers, allCoupons, allOrders, allQuizzes, allQuizSubs, allAssignmentTasks, allAssignmentSubmissions
      ] = await Promise.all([
        dbService.getCourses(),
        dbService.getCategories(),
        dbService.getStudents(),
        dbService.getArticles(),
        dbService.getNews(),
        dbService.getReviews(),
        dbService.getMessages(),
        dbService.getAdmins(),
        dbService.getSettings(),
        dbService.getTeachers(),
        dbService.getCoupons(),
        dbService.getSubscriptions(),
        dbService.getQuizzes(),
        dbService.getQuizSubmissions(),
        dbService.getAssignmentTasks(),
        dbService.getAssignmentSubmissions()
      ]);

      setCourses(allCourses);
      setCategories(allCategories);
      setStudents(allStudents);
      setArticles(allArticles);
      setNews(allNews);
      setReviews(allReviews);
      setMessages(allMessages);
      setAdmins(allAdmins);
      setTeachers(allTeachers);
      setCoupons(allCoupons);
      setOrders(allOrders);
      setQuizzes(allQuizzes);
      setQuizSubmissions(allQuizSubs || []);
      setAssignmentTasks(allAssignmentTasks || []);
      setAssignmentSubmissions(allAssignmentSubmissions || []);
      setSettings(webSettings);
      setSettingsForm(webSettings);
      
      // Auto-set category reference
      if (allCategories.length > 0) {
        setCourseForm(prev => ({ ...prev, categoryId: allCategories[0].id }));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(t('خطأ أثناء تحميل البيانات المزامنة.', 'Error loading synchronized data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentAdmin) {
      onLogout();
      return;
    }

    let cancelled = false;
    let cleanups: Array<(() => void) | undefined> = [];

    (async () => {
      await waitForFirebaseAuth();
      if (cancelled) return;
      loadData();

      const hasAdminFbAuth = !dbService.isRealFirebase() || Boolean(firebaseAuth?.currentUser && isAdminEmail(firebaseAuth.currentUser.email || ''));
      cleanups = [
        dbService.listenToCourses((realtimeCourses) => setCourses(realtimeCourses)),
      ];

      if (hasAdminFbAuth) {
        if (dbService.isRealFirebase()) {
          dbService.runOneTimeDemoAndCoursesPurge().then((res) => {
            if (res.ran && !cancelled) {
              setCourses([]);
              setLectures([]);
              setSections([]);
              setExams([]);
              setSheets([]);
              setQuestionBank([]);
              setScheduleItems([]);
              setInquiries([]);
              setExamSubmissions([]);
              setActivityLogs([]);
              triggerNotification(t('تم حذف جميع المقررات والبيانات التجريبية بنجاح.', 'All demo data and courses have been cleared.'));
            }
          }).catch(() => {});
        }
        cleanups.push(
          dbService.listenToSubscriptions((realtimeOrders) => setOrders(realtimeOrders)),
          dbService.listenToMessages((realtimeMessages) => setMessages(realtimeMessages)),
          dbService.listenToStudents((realtimeStudents) => setStudents(realtimeStudents)),
          dbService.listenToQuizzes((realtimeQuizzes) => setQuizzes(realtimeQuizzes)),
          dbService.listenToQuizSubmissions((realtimeQuizSubs) => setQuizSubmissions(realtimeQuizSubs)),
          dbService.listenToAssignmentTasks((realtimeTasks) => setAssignmentTasks(realtimeTasks)),
          dbService.listenToAssignmentSubmissions((realtimeSubs) => setAssignmentSubmissions(realtimeSubs)),
          dbService.listenToAllComments((realtimeComments) => setLessonComments(realtimeComments)),
          dbService.listenToLectures((realtimeLectures) => setLectures(realtimeLectures)),
          dbService.listenToSections((realtimeSections) => setSections(realtimeSections)),
          dbService.listenToExams((realtimeExams) => setExams(realtimeExams)),
          dbService.listenToSheets((realtimeSheets) => setSheets(realtimeSheets)),
          dbService.listenToQuestionBank((items) => setQuestionBank(items)),
          dbService.listenToSchedule((items) => setScheduleItems(items)),
          dbService.listenToInquiries((items) => setInquiries(items)),
          dbService.listenToExamSubmissions((subs) => setExamSubmissions(subs)),
          dbService.listenToActivityLogs((logs) => setActivityLogs(logs)),
        );
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach(fn => { if (typeof fn === 'function') fn(); });
    };
  }, [currentAdmin?.id, fbAuthUser?.uid]);

  const triggerNotification = (text: string, isError = false) => {
    if (isError) {
      setErrorMsg(text);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(text);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  // --- CRUD HANDLERS ---

  // 1. Course management
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      // 100% Free Academic Platform — all courses have 0 fees
      const cleanedPrice = 0;
      const cleanedDiscountPrice: number | undefined = undefined;

      // Ensure valid categoryId
      const validCategoryId = (categories && categories.length > 0 && categories.some(c => c.id === courseForm.categoryId))
        ? courseForm.categoryId
        : (categories && categories.length > 0 ? categories[0].id : (courseForm.categoryId || 'year1'));

      // Auto-commit any active lesson draft or uploaded video if the admin uploaded/edited a lesson and clicked save course directly
      let workingUnits = (courseForm.units || []).map(u => ({ ...u, lessons: [...(u.lessons || [])] }));
      if (
        lessonForm.title?.trim() || lessonForm.videoUrl?.trim() || lessonForm.pdfUrl?.trim()
      ) {
        if (workingUnits.length === 0) {
          workingUnits.push({
            id: 'unit_' + Date.now(),
            title: 'الوحدة الأولى: المحتوى والدروس',
            description: 'محاضرات وشروحات الكورس',
            order: 1,
            lessons: []
          });
        }
        const targetUnitIdx = (editingLessonUnitIndex !== null && editingLessonUnitIndex >= 0 && editingLessonUnitIndex < workingUnits.length)
          ? editingLessonUnitIndex
          : 0;
        let targetUnit = workingUnits[targetUnitIdx] || workingUnits[0];
        const lTitle = lessonForm.title.trim() || (lessonForm.videoUrl ? `الدرس ${(targetUnit.lessons?.length || 0) + 1} (فيديو)` : `الدرس ${(targetUnit.lessons?.length || 0) + 1}`);
        const draftLessonObj = {
          id: lessonForm.id || ('lsn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
          title: lTitle,
          titleAr: lTitle,
          titleEn: lTitle,
          videoUrl: lessonForm.videoUrl?.trim() || '',
          duration: lessonForm.duration?.trim() || '15:00',
          type: lessonForm.type || (lessonForm.pdfUrl && !lessonForm.videoUrl ? 'pdf' : 'video'),
          pdfUrl: lessonForm.pdfUrl?.trim() || '',
          order: Number(lessonForm.order) || ((targetUnit.lessons?.length || 0) + 1)
        };
        const curIdx = (editingLessonIndex !== null && editingLessonIndex >= 0 && targetUnit.lessons[editingLessonIndex]) ? editingLessonIndex : -1;
        if (curIdx === -1) {
          if (!targetUnit.lessons.some(l => l.videoUrl && l.videoUrl === draftLessonObj.videoUrl && draftLessonObj.videoUrl !== '')) {
            targetUnit.lessons.push(draftLessonObj);
          }
        } else {
          targetUnit.lessons[curIdx] = { ...targetUnit.lessons[curIdx], ...draftLessonObj };
        }
      }

      // If units are still empty but a course introduction video is provided, auto-create a default unit with that lesson
      if (workingUnits.length === 0 && courseForm.videoUrl?.trim()) {
        workingUnits.push({
          id: 'unit_default_' + Date.now(),
          title: 'الوحدة الأولى: المحاضرة التمهيدية',
          description: 'شرح المنهج ومحتوى الكورس',
          order: 1,
          lessons: [{
            id: 'lsn_default_' + Date.now(),
            title: 'المحاضرة التمهيدية وشرح المنهج',
            titleAr: 'المحاضرة التمهيدية وشرح المنهج',
            titleEn: 'Course Introduction & Syllabus Overview',
            videoUrl: courseForm.videoUrl.trim(),
            pdfUrl: courseForm.pdfUrl?.trim() || '',
            duration: courseForm.duration || '20:00',
            type: 'video',
            order: 1
          }]
        });
      }

      const sortedUnits = workingUnits.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map((unit, uIdx) => ({
        ...unit,
        order: unit.order || uIdx + 1,
        lessons: (unit.lessons || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map((lsn, lIdx) => ({
          ...lsn,
          order: lsn.order || lIdx + 1
        }))
      }));

      const syncedLessons: any[] = [];
      sortedUnits.forEach((unit) => {
        (unit.lessons || []).forEach((ul) => {
          syncedLessons.push({
            id: ul.id || 'lsn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: ul.title || (ul as any).titleAr || (ul as any).titleEn || 'حصة دراسية',
            titleAr: ul.title || (ul as any).titleAr || (ul as any).titleEn || 'حصة دراسية',
            titleEn: ul.title || (ul as any).titleEn || (ul as any).titleAr || 'Lesson',
            videoUrl: ul.videoUrl || courseForm.videoUrl || '',
            pdfUrl: ul.pdfUrl || courseForm.pdfUrl || '',
            duration: ul.duration || '15:00',
            type: ul.type || 'video',
            order: ul.order || (syncedLessons.length + 1)
          });
        });
      });

      const rawLessons = syncedLessons.length > 0 ? syncedLessons : (courseForm.lessons && courseForm.lessons.length > 0 ? courseForm.lessons : [{
        id: 'lsn_default_' + Date.now(),
        title: 'المحاضرة التمهيدية وشرح المنهج',
        titleAr: 'المحاضرة التمهيدية وشرح المنهج',
        titleEn: 'Course Introduction & Syllabus Overview',
        videoUrl: courseForm.videoUrl || '',
        pdfUrl: courseForm.pdfUrl || '',
        duration: courseForm.duration || '20:00',
        type: 'video' as LessonType,
        order: 1
      }]);

      const finalLessons = rawLessons.map((lsn, idx) => {
        const vUrl = (lsn.videoUrl && lsn.videoUrl.trim() !== '') ? lsn.videoUrl.trim() : (courseForm.videoUrl?.trim() || '');
        const pVideo = vUrl ? parseVideoSource(vUrl) : null;
        return {
          ...lsn,
          order: lsn.order || (idx + 1),
          videoUrl: vUrl,
          videoType: lsn.videoType || pVideo?.type,
          videoId: lsn.videoId || pVideo?.videoId,
          pdfUrl: (lsn.pdfUrl && lsn.pdfUrl.trim() !== '') ? lsn.pdfUrl : (courseForm.pdfUrl || '')
        };
      });

      const finalLessonsCount = finalLessons.length > 0 ? finalLessons.length : (courseForm.lessonsCount || 10);

      const selectedGrade = courseForm.grade || validCategoryId || 'year1';
      const selectedSubject = (courseForm.subjectAr && courseForm.subjectAr !== 'مادة جديدة') ? courseForm.subjectAr : (courseForm.subject || 'تكنولوجيا المعلومات IT');
      const effectiveCourseVideoUrl = courseForm.videoUrl?.trim() || (finalLessons[0]?.videoUrl || '');
      const parsedCourseVideo = effectiveCourseVideoUrl ? parseVideoSource(effectiveCourseVideoUrl) : null;

      const submissionForm = {
        ...courseForm,
        grade: selectedGrade,
        subject: selectedSubject,
        subjectAr: selectedSubject,
        subjectEn: courseForm.subjectEn || selectedSubject,
        titleAr: courseForm.titleAr?.trim() || `${selectedSubject} - ${getGradeName(selectedGrade, 'ar')}`,
        titleEn: courseForm.titleEn?.trim() || `${selectedSubject} - ${getGradeName(selectedGrade, 'en')}`,
        descriptionAr: courseForm.descriptionAr?.trim() || 'لا يوجد وصف متاح حالياً.',
        descriptionEn: courseForm.descriptionEn?.trim() || courseForm.descriptionAr?.trim() || 'No description available.',
        teacherName: courseForm.teacherName?.trim() || 'Eng/Mohamed abdal tawab',
        categoryId: validCategoryId,
        duration: courseForm.duration?.trim() || '20 Hours',
        lessonsCount: finalLessonsCount,
        thumbnailUrl: courseForm.thumbnailUrl?.trim() || COURSE_PROGRAMMING_CYBER_IMG,
        bannerUrl: courseForm.bannerUrl?.trim() || courseForm.thumbnailUrl?.trim() || HERO_IT_UNIVERSITY_IMG,
        videoUrl: effectiveCourseVideoUrl,
        videoType: parsedCourseVideo?.type,
        videoId: parsedCourseVideo?.videoId,
        pdfUrl: courseForm.pdfUrl?.trim() || '',
        price: cleanedPrice,
        discountPrice: cleanedDiscountPrice,
        isFree: true,
        password: '',
        published: courseForm.published !== false,
        status: (courseForm.published !== false) ? ('published' as const) : ('draft' as const),
        units: sortedUnits,
        lessons: finalLessons
      };

      if (modalType === 'add') {
        const added = await dbService.addCourse(submissionForm);
        setCourses(prev => [...prev.filter(c => c.id !== added.id), added]);

        // Send real-time notification to students about new course/curriculum
        try {
          await dbService.addNotification({
            userId: 'global',
            titleAr: `تم طرح مقرر دراسي جديد: ${submissionForm.titleAr} 📚`,
            titleEn: `New Course Published: ${submissionForm.titleEn || submissionForm.titleAr} 📚`,
            bodyAr: `أصبح مقرر "${submissionForm.titleAr}" متاحاً الآن لطلاب قسم تكنولوجيا المعلومات (IT) مع ملفات المحاضرات وسكاشن المعامل.`,
            bodyEn: `Course "${submissionForm.titleEn || submissionForm.titleAr}" is now live with lectures and lab worksheets ready for download.`,
            isRead: false,
            createdAt: new Date().toISOString(),
            type: 'lecture_added',
            courseId: added.id,
            courseTitle: submissionForm.titleAr
          });
        } catch (nErr) {
          console.warn("Could not dispatch course add notification:", nErr);
        }

        triggerNotification(t('تم إضافة المقرر بنجاح وإرسال إشعار فوري للطلاب!', 'Subject added and notification dispatched!'));
      } else if (modalType === 'edit') {
        const prevCourse = courses.find(c => c.id === selectedId);
        const prevLessonCount = (prevCourse?.units || []).reduce((acc: number, u: any) => acc + (u.lessons?.length || 0), 0) || (prevCourse?.lessons?.length || 0);
        const newLessonCount = (submissionForm.units || []).reduce((acc: number, u: any) => acc + (u.lessons?.length || 0), 0) || (submissionForm.lessons?.length || 0);

        await dbService.updateCourse(selectedId, submissionForm);
        setCourses(prev => prev.map(c => c.id === selectedId ? { ...c, ...submissionForm } : c));

        // If new lessons/lectures were added, dispatch real-time alert
        if (newLessonCount > prevLessonCount) {
          try {
            await dbService.addNotification({
              userId: 'global',
              titleAr: `تم رفع محاضرات وسكاشن جديدة لمقرر: ${submissionForm.titleAr} 📄`,
              titleEn: `New Lectures & Lab Sections Uploaded: ${submissionForm.titleEn || submissionForm.titleAr} 📄`,
              bodyAr: `أضاف المهندس محمد عبد التواب محتوى وملفات أكاديمية جديدة لمقرر "${submissionForm.titleAr}". الملفات جاهزة الآن للتحميل والمذاكرة.`,
              bodyEn: `New lecture materials and practical lab sheets have been uploaded to "${submissionForm.titleEn || submissionForm.titleAr}". Available now for study and download.`,
              isRead: false,
              createdAt: new Date().toISOString(),
              type: 'lecture_added',
              courseId: selectedId,
              courseTitle: submissionForm.titleAr
            });
          } catch (nErr) {
            console.warn("Could not dispatch lecture notification:", nErr);
          }
        }

        triggerNotification(t('تم تحديث المقرر بنجاح وإخطار الطلاب بالجديد!', 'Subject updated and students notified!'));
      } else if (modalType === 'duplicate') {
        const duplicatedForm = { ...submissionForm, titleAr: submissionForm.titleAr + ' (نسخة)', titleEn: submissionForm.titleEn + ' (Copy)' };
        const added = await dbService.addCourse(duplicatedForm);
        setCourses(prev => [...prev.filter(c => c.id !== added.id), added]);
        triggerNotification(t('تم تكرار المقرر بنجاح والمزامنة!', 'Subject duplicated and synchronized successfully!'));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Course submission error:", err);
      triggerNotification(
        typeof err?.message === 'string' && !err.message.startsWith('{')
          ? err.message
          : t('حدث خطأ أثناء حفظ المقرر، يرجى المحاولة مرة أخرى.', 'Error saving subject, please try again.'),
        true
      );
    } finally {
      setActionLoading(false);
    }
  };

  // --- Course Units & Lessons Handlers ---
  const getInitialUnits = (course: Course): CourseUnit[] => {
    if (course.units && course.units.length > 0) return course.units;
    if (course.lessons && course.lessons.length > 0) {
      return [{
        id: 'unit_' + Date.now(),
        title: 'الوحدة الأولى (دروس الكورس)',
        description: 'المحتوى التعليمي للدورة',
        order: 1,
        lessons: course.lessons.map((l, idx) => ({
          id: l.id || 'lsn_' + Date.now() + '_' + idx,
          title: l.titleAr || l.titleEn || (l as any).title || 'الدرس ' + (idx + 1),
          videoUrl: l.videoUrl || '',
          duration: l.duration || '15:00',
          type: (l.pdfUrl && !l.videoUrl ? 'pdf' : 'video') as LessonType,
          pdfUrl: l.pdfUrl || '',
          order: idx + 1
        }))
      }];
    }
    return [];
  };

  const handleAddOrUpdateUnit = () => {
    if (!unitForm.title.trim()) {
      triggerNotification(t('يرجى إدخال عنوان الوحدة.', 'Please enter unit title.'), true);
      return;
    }
    const currentUnits = [...(courseForm.units || [])];
    if (editingUnitIndex === null || editingUnitIndex === -1) {
      currentUnits.push({
        id: 'unit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: unitForm.title.trim(),
        description: unitForm.description.trim(),
        order: Number(unitForm.order) || (currentUnits.length + 1),
        lessons: []
      });
    } else {
      currentUnits[editingUnitIndex] = {
        ...currentUnits[editingUnitIndex],
        title: unitForm.title.trim(),
        description: unitForm.description.trim(),
        order: Number(unitForm.order) || (editingUnitIndex + 1),
      };
    }
    setCourseForm(prev => ({ ...prev, units: currentUnits }));
    setEditingUnitIndex(null);
    setUnitForm({ title: '', description: '', order: currentUnits.length + 1 });
  };

  const handleDeleteUnit = (index: number) => {
    requestConfirmation(
      t('حذف الوحدة', 'Delete Unit'),
      t('هل أنت متأكد من حذف هذه الوحدة وجميع دروسها؟', 'Are you sure you want to delete this unit and all its lessons?'),
      () => {
        const currentUnits = (courseForm.units || []).filter((_, idx) => idx !== index);
        setCourseForm(prev => ({ ...prev, units: currentUnits }));
        if (editingUnitIndex === index) setEditingUnitIndex(null);
      }
    );
  };

  const handleAddOrUpdateLesson = () => {
    if (editingLessonUnitIndex === null) return;
    const currentUnits = [...(courseForm.units || [])];
    const targetUnit = { ...currentUnits[editingLessonUnitIndex] };
    const currentLessons = [...(targetUnit.lessons || [])];

    let effectiveTitle = lessonForm.title.trim();
    if (!effectiveTitle) {
      if (lessonForm.wordUrl || lessonForm.isSection) {
        effectiveTitle = `سكشن عملي ${currentLessons.length + 1} (ملف وورد Word)`;
      } else if (lessonForm.pdfUrl) {
        effectiveTitle = `محاضرة ${currentLessons.length + 1} (ملف PDF)`;
      } else if (lessonForm.videoUrl) {
        effectiveTitle = `محاضرة ${currentLessons.length + 1} (فيديو)`;
      } else {
        effectiveTitle = `بند دراسي ${currentLessons.length + 1}`;
      }
    }

    const parsedLessonVideo = lessonForm.videoUrl ? parseVideoSource(lessonForm.videoUrl.trim()) : null;
    const determinedType: LessonType = lessonForm.type || (lessonForm.wordUrl ? 'word' : lessonForm.pdfUrl ? 'pdf' : 'video');

    if (editingLessonIndex === null || editingLessonIndex === -1) {
      currentLessons.push({
        id: 'lsn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: effectiveTitle,
        videoUrl: lessonForm.videoUrl.trim(),
        videoType: parsedLessonVideo?.type,
        videoId: parsedLessonVideo?.videoId,
        duration: lessonForm.duration.trim() || '20:00',
        type: determinedType,
        pdfUrl: lessonForm.pdfUrl.trim(),
        wordUrl: lessonForm.wordUrl?.trim() || '',
        isSection: !!lessonForm.isSection || determinedType === 'word',
        order: Number(lessonForm.order) || (currentLessons.length + 1)
      });
    } else {
      currentLessons[editingLessonIndex] = {
        ...currentLessons[editingLessonIndex],
        title: effectiveTitle,
        videoUrl: lessonForm.videoUrl.trim(),
        videoType: parsedLessonVideo?.type,
        videoId: parsedLessonVideo?.videoId,
        duration: lessonForm.duration.trim() || '20:00',
        type: determinedType,
        pdfUrl: lessonForm.pdfUrl.trim(),
        wordUrl: lessonForm.wordUrl?.trim() || '',
        isSection: !!lessonForm.isSection || determinedType === 'word',
        order: Number(lessonForm.order) || (editingLessonIndex + 1)
      };
    }
    targetUnit.lessons = currentLessons;
    currentUnits[editingLessonUnitIndex] = targetUnit;
    setCourseForm(prev => ({ ...prev, units: currentUnits }));
    setEditingLessonIndex(null);
    setEditingLessonUnitIndex(null);
    setLessonForm({ title: '', videoUrl: '', duration: '15:00', type: 'video', pdfUrl: '', wordUrl: '', isSection: false, order: 1 });
    triggerNotification(t('تم حفظ المحاضرة/السكشن وإضافته للمقرر بنجاح!', 'Lecture/Lab section saved successfully!'));
  };

  const handleDeleteLesson = (unitIndex: number, lessonIndex: number) => {
    requestConfirmation(
      t('حذف الدرس', 'Delete Lesson'),
      t('هل أنت متأكد من حذف هذا الدرس؟', 'Are you sure you want to delete this lesson?'),
      () => {
        const currentUnits = [...(courseForm.units || [])];
        const targetUnit = { ...currentUnits[unitIndex] };
        targetUnit.lessons = (targetUnit.lessons || []).filter((_, idx) => idx !== lessonIndex);
        currentUnits[unitIndex] = targetUnit;
        setCourseForm(prev => ({ ...prev, units: currentUnits }));
        if (editingLessonUnitIndex === unitIndex && editingLessonIndex === lessonIndex) {
          setEditingLessonIndex(null);
          setEditingLessonUnitIndex(null);
        }
      }
    );
  };

  const handleEditCourse = (course: Course) => {
    setCourseForm({
      titleAr: course.titleAr,
      titleEn: course.titleEn,
      descriptionAr: course.descriptionAr,
      descriptionEn: course.descriptionEn,
      teacherName: course.teacherName,
      categoryId: course.categoryId,
      price: course.price,
      discountPrice: course.discountPrice,
      duration: course.duration,
      lessonsCount: course.lessonsCount,
      featured: course.featured,
      popular: course.popular,
      published: course.published,
      thumbnailUrl: course.thumbnailUrl,
      bannerUrl: course.bannerUrl || '',
      isFree: course.isFree || false,
      password: course.password || '',
      imageUrls: course.imageUrls || [],
      videoUrl: course.videoUrl || '',
      pdfUrl: course.pdfUrl || '',
      attachments: course.attachments || [],
      subjectAr: course.subjectAr || '',
      subjectEn: course.subjectEn || '',
      units: getInitialUnits(course),
      lessons: course.lessons || []
    });
    setSelectedId(course.id);
    setModalType('edit');
    setEditingUnitIndex(null);
    setEditingLessonUnitIndex(null);
    setEditingLessonIndex(null);
    setIsModalOpen(true);
  };

  const handleDuplicateCourse = (course: Course) => {
    setCourseForm({
      titleAr: course.titleAr,
      titleEn: course.titleEn,
      descriptionAr: course.descriptionAr,
      descriptionEn: course.descriptionEn,
      teacherName: course.teacherName,
      categoryId: course.categoryId,
      price: course.price,
      discountPrice: course.discountPrice,
      duration: course.duration,
      lessonsCount: course.lessonsCount,
      featured: course.featured,
      popular: course.popular,
      published: course.published,
      thumbnailUrl: course.thumbnailUrl,
      bannerUrl: course.bannerUrl || '',
      isFree: course.isFree || false,
      password: course.password || '',
      imageUrls: course.imageUrls || [],
      videoUrl: course.videoUrl || '',
      pdfUrl: course.pdfUrl || '',
      attachments: course.attachments || [],
      subjectAr: course.subjectAr || '',
      subjectEn: course.subjectEn || '',
      units: getInitialUnits(course),
      lessons: course.lessons || []
    });
    setSelectedId(course.id);
    setModalType('duplicate');
    setEditingUnitIndex(null);
    setEditingLessonUnitIndex(null);
    setEditingLessonIndex(null);
    setIsModalOpen(true);
  };

  const handleDeleteCourse = (id: string) => {
    requestConfirmation(
      t('تأكيد حذف المقرر', 'Confirm Subject Deletion'),
      t(
        'هل أنت متأكد من حذف هذا المقرر وجميع الملفات المرتبطة به (الصور، الفيديوهات، وملفات PDF)؟ لا يمكن التراجع عن هذه العملية.',
        'Are you sure you want to delete this subject and all its associated files (images, videos, and PDFs)? This action cannot be undone.'
      ),
      async () => {
        setActionLoading(true);
        try {
          // 1. Remove the course from the UI immediately
          setCourses(prev => prev.filter(c => c.id !== id));

          // 2. Delete the selected course document and its media files from storage/database
          await dbService.deleteCourse(id);

          // 3. Refresh the course list automatically from the backend
          const freshCourses = await dbService.getCourses();
          setCourses(freshCourses.filter(c => c.id !== id));

          // 4. Show a success message
          triggerNotification(t('تم حذف المقرر بنجاح وجميع الملفات المرتبطة به.', 'Subject and all its associated files deleted successfully.'));
        } catch (err: any) {
          console.error("Course deletion failed:", err);
          let errorMessage = '';
          try {
            const parsed = JSON.parse(err.message);
            errorMessage = parsed.error || err.message;
          } catch {
            errorMessage = err.message || String(err);
          }

          triggerNotification(
            t(`فشل حذف المقرر: ${errorMessage}`, `Failed to delete subject: ${errorMessage}`),
            true
          );

          try {
            const freshCourses = await dbService.getCourses();
            setCourses(freshCourses);
          } catch (refreshErr) {
            console.error("Failed to restore course list after error:", refreshErr);
          }
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleTogglePublishCourse = async (course: Course) => {
    try {
      const nextPublished = !course.published;
      await dbService.updateCourse(course.id, { published: nextPublished });
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, published: nextPublished } : c));
      triggerNotification(t('تم تحديث حالة النشر.', 'Publication status updated.'));
    } catch (err) {
      triggerNotification('Failed to toggle publication', true);
    }
  };

  // 2. Category CRUD
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (modalType === 'add') {
        const added = await dbService.addCategory(categoryForm);
        setCategories(prev => [...prev, added]);
        triggerNotification(t('تم إضافة القسم بنجاح!', 'Category created successfully!'));
      } else {
        await dbService.updateCategory(selectedId, categoryForm);
        setCategories(prev => prev.map(c => c.id === selectedId ? { ...c, ...categoryForm } : c));
        triggerNotification(t('تم تحديث القسم بنجاح!', 'Category updated successfully!'));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      triggerNotification('Error', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setCategoryForm({
      nameAr: cat.nameAr, nameEn: cat.nameEn, imageUrl: cat.imageUrl, color: cat.color
    });
    setSelectedId(cat.id);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    requestConfirmation(
      t('حذف الفرقة / القسم', 'Delete Category'),
      t('سيتم حذف القسم. هل أنت متأكد؟', 'Category will be deleted. Are you sure?'),
      async () => {
        try {
          await dbService.deleteCategory(id);
          setCategories(prev => prev.filter(c => c.id !== id));
          triggerNotification(t('تم حذف القسم.', 'Category deleted.'));
        } catch {
          triggerNotification('Failed to delete category', true);
        }
      }
    );
  };

  // 3. Students Management
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (modalType === 'add') {
        const added = await dbService.addStudent(studentForm);
        setStudents(prev => [...prev, added]);
        triggerNotification(t('تم تسجيل الطالب بنجاح.', 'Student registered successfully.'));
      } else {
        await dbService.updateStudent(selectedId, studentForm);
        setStudents(prev => prev.map(s => s.id === selectedId ? { ...s, ...studentForm } : s));
        triggerNotification(t('تم تعديل بيانات الطالب.', 'Student updated successfully.'));
      }
      setIsModalOpen(false);
    } catch {
      triggerNotification('Error saving student', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditStudent = (stud: Student) => {
    setStudentForm({
      name: stud.name, email: stud.email, phone: stud.phone,
      purchasedCourseIds: stud.purchasedCourseIds || [], status: stud.status
    });
    setSelectedId(stud.id);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleToggleStudentStatus = (stud: Student) => {
    const newStatus: 'active' | 'suspended' = stud.status === 'active' ? 'suspended' : 'active';
    const nextApproved = newStatus === 'active';
    const actionText = newStatus === 'active'
      ? t('تفعيل وترخيص', 'activate')
      : t('حظر / إيقاف', 'suspend');

    requestConfirmation(
      t(`${actionText} حساب الطالب`, `${actionText} Student Account`),
      t(`هل أنت متأكد من ${actionText} حساب الطالب (${stud.name})؟`, `Are you sure you want to ${actionText} student (${stud.name})?`),
      async () => {
        setActionLoading(true);
        try {
          await dbService.updateStudent(stud.id, { status: newStatus, isApproved: nextApproved } as any);
          setStudents(prev => prev.map(s => s.id === stud.id ? { ...s, status: newStatus, isApproved: nextApproved } : s));

          const cleanEmail = stud.email.trim().toLowerCase();
          const allUsers = await authService.getAllUsers();
          const matchingUser = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
          if (matchingUser) {
            await authService.updateUser(matchingUser.id, { status: newStatus, isApproved: nextApproved } as any);
          }

          logAdminAction(
            newStatus === 'active' ? 'approve' : 'suspend',
            'student',
            stud.name,
            `${newStatus === 'active' ? 'Activated' : 'Suspended'} student (${stud.email})`
          );

          triggerNotification(newStatus === 'active'
            ? t('تم تفعيل حساب الطالب بنجاح!', 'Student account activated!')
            : t('تم حظر/إيقاف حساب الطالب من المنصة.', 'Student account suspended.')
          );
        } catch (err: any) {
          console.error(err);
          triggerNotification(t('خطأ أثناء تحديث حالة الطالب', 'Error updating student status'), true);
        } finally {
          setActionLoading(false);
        }
      },
      newStatus === 'active' ? t('تأكيد التفعيل', 'Confirm Activate') : t('تأكيد الإيقاف', 'Confirm Suspend'),
      newStatus !== 'active'
    );
  };

  const handleAcceptStudent = (stud: Student) => {
    requestConfirmation(
      t('قبول وتفعيل الطالب', 'Approve Student'),
      t(`هل أنت متأكد من قبول حساب الطالب (${stud.name}) وتفعيله للدخول للمنصة؟`, `Accept and activate student (${stud.name})?`),
      async () => {
        setActionLoading(true);
        try {
          await dbService.updateStudent(stud.id, { status: 'active', isApproved: true } as any);
          setStudents(prev => prev.map(s => s.id === stud.id ? { ...s, status: 'active', isApproved: true } : s));
          const cleanEmail = stud.email.trim().toLowerCase();
          const allUsers = await authService.getAllUsers();
          const matchingUser = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
          if (matchingUser) {
            await authService.updateUser(matchingUser.id, { status: 'active', isApproved: true } as any);
          }

          logAdminAction('approve', 'student', stud.name, `Approved registration for ${stud.email}`);

          try {
            await dbService.addNotification({
              userId: matchingUser ? matchingUser.id : stud.id,
              titleAr: `تم تفعيل وقبول حسابك الأكاديمي بنجاح`,
              titleEn: `Your Academic Account Has Been Approved`,
              bodyAr: `مرحباً بك في منصة Eng/Mohamed abdal tawab - الجامعة التكنولوجية قسم IT. تم اعتماد حسابك بنجاح وأصبح بإمكانك الاطلاع على المحاضرات والسكاشن والامتحانات مجاناً بالكامل.`,
              bodyEn: `Welcome to Eng/Mohamed abdal tawab IT University Platform! Your account is now active with free access to lectures, sections, and exams.`,
              isRead: false,
              createdAt: new Date().toISOString(),
              type: 'course_activated'
            });
          } catch (notifErr) {
            console.warn("Could not dispatch welcome notification:", notifErr);
          }

          triggerNotification(t('تم قبول حساب الطالب وتفعيله بنجاح وإرسال إشعار فوري له', 'Student account approved and notified successfully'));
        } catch (err: any) {
          console.error(err);
          triggerNotification(t('خطأ أثناء تفعيل حساب الطالب', 'Error approving student account'), true);
        } finally {
          setActionLoading(false);
        }
      },
      t('تأكيد القبول', 'Confirm Approval'),
      false
    );
  };

  const handleRejectStudent = (stud: Student) => {
    requestConfirmation(
      t('رفض طلب التسجيل', 'Reject Registration'),
      t(`هل أنت متأكد من رفض طلب تسجيل الطالب (${stud.name})؟`, `Reject student registration (${stud.name})?`),
      async () => {
        setActionLoading(true);
        try {
          await dbService.updateStudent(stud.id, { status: 'rejected', isApproved: false } as any);
          setStudents(prev => prev.map(s => s.id === stud.id ? { ...s, status: 'rejected', isApproved: false } : s));
          const cleanEmail = stud.email.trim().toLowerCase();
          const allUsers = await authService.getAllUsers();
          const matchingUser = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
          if (matchingUser) {
            await authService.updateUser(matchingUser.id, { status: 'rejected', isApproved: false } as any);
          }
          logAdminAction('reject', 'student', stud.name, `Rejected registration for ${stud.email}`);
          triggerNotification(t('تم رفض طلب تسجيل الطالب', 'Student registration rejected'));
        } catch (err: any) {
          console.error(err);
          triggerNotification(t('خطأ أثناء رفض الحساب', 'Error rejecting student account'), true);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleDeleteStudent = (id: string, email?: string) => {
    requestConfirmation(
      t('حذف الطالب نهائياً', 'Delete Student'),
      t('هل أنت متأكد تماماً من حذف هذا الطالب نهائياً من المنصة؟ سيفقد الحساب والدخول كلياً.', 'Are you sure you want to permanently delete this student from the platform?'),
      async () => {
        setActionLoading(true);
        try {
          await dbService.deleteStudent(id, email);
          if (email) {
            await authService.deleteUser(id, email);
          }
          setStudents(prev => prev.filter(s => s.id !== id && (email ? s.email?.toLowerCase() !== email.toLowerCase() : true)));
          setOrders(prev => prev.filter(o => o.studentId !== id && (email ? o.studentEmail?.toLowerCase() !== email.toLowerCase() : true)));
          triggerNotification(t('تم حذف الطالب نهائياً من المنصة بنجاح.', 'Student deleted from platform successfully.'));
        } catch (err: any) {
          console.error(err);
          triggerNotification(t('خطأ أثناء حذف الطالب', 'Error deleting student'), true);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleClearAllStudents = () => {
    requestConfirmation(
      t('تصفير جميع حسابات الطلاب', 'Reset All Student Accounts'),
      t(
        'هل أنت متأكد من رغبتك في مسح جميع حسابات الطلاب المسجلة، طلبات الاشتراك، وتصفير المنصة بالكامل للبدء بتسجيلات جديدة؟ لا يمكن التراجع عن هذه الخطوة!',
        'Are you sure you want to delete all registered student accounts, subscription orders, and reset the platform for new registrations? This cannot be undone!'
      ),
      async () => {
        setActionLoading(true);
        try {
          await (dbService as any).clearAllStudentsAndOrders();
          setStudents([]);
          setOrders([]);
          triggerNotification(t('تمت إزالة جميع الحسابات المسجلة وتنظيف المنصة لاستقبال تسجيلات جديدة بنجاح! 🚀', 'All student accounts removed and platform reset successfully!'));
        } catch (err: any) {
          console.error(err);
          triggerNotification(t('خطأ أثناء مسح حسابات الطلاب', 'Error resetting student accounts'), true);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleForceLogoutAll = () => {
    requestConfirmation(
      t('إخراج جميع الحسابات', 'Force Logout All Users'),
      t(
        'هل أنت متأكد من رغبتك في إخراج (تسجيل خروج) جميع الطلاب والحسابات المسجلة حالياً من المنصة على جميع أجهزتهم دون حذف الحسابات؟ سيضطرون لتسجيل الدخول مرة أخرى باستخدام بريدهم وكلمة المرور.',
        'Are you sure you want to log out all currently active student accounts across all devices without deleting their accounts? They will have to log in again.'
      ),
      async () => {
        setActionLoading(true);
        try {
          await (dbService as any).forceLogoutAllUsers();
          triggerNotification(t('تم إخراج جميع الحسابات المسجلة من المنصة على جميع الأجهزة بنجاح! ✅', 'All accounts have been logged out across all devices successfully!'));
        } catch (err: any) {
          console.error(err);
          triggerNotification(t('خطأ أثناء تنفيذ تسجيل الخروج الجماعي', 'Error performing global logout'), true);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // 4. Articles Management
  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (modalType === 'add') {
        const added = await dbService.addArticle(articleForm);
        setArticles(prev => [...prev, added]);
        triggerNotification(t('تم نشر المقال بنجاح.', 'Article published successfully.'));
      } else {
        await dbService.updateArticle(selectedId, articleForm);
        setArticles(prev => prev.map(a => a.id === selectedId ? { ...a, ...articleForm } : a));
        triggerNotification(t('تم تحديث المقال.', 'Article updated.'));
      }
      setIsModalOpen(false);
    } catch {
      triggerNotification('Error saving article', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditArticle = (art: Article) => {
    setArticleForm({
      titleAr: art.titleAr, titleEn: art.titleEn,
      contentAr: art.contentAr, contentEn: art.contentEn,
      authorAr: art.authorAr, authorEn: art.authorEn,
      imageUrl: art.imageUrl, tags: art.tags || []
    });
    setSelectedId(art.id);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleDeleteArticle = (id: string) => {
    requestConfirmation(
      t('حذف المقال', 'Delete Article'),
      t('حذف هذا المقال؟', 'Delete this article?'),
      async () => {
        setActionLoading(true);
        try {
          await dbService.deleteArticle(id);
          setArticles(prev => prev.filter(a => a.id !== id));
          triggerNotification(t('تم حذف المقال بنجاح.', 'Article deleted successfully.'));
        } catch {
          triggerNotification('Error deleting article', true);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // 5. News Management
  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (modalType === 'add') {
        const added = await dbService.addNews(newsForm);
        setNews(prev => [...prev, added]);
        triggerNotification(t('تم إضافة الخبر بنجاح.', 'News item added successfully.'));
      } else {
        await dbService.updateNews(selectedId, newsForm);
        setNews(prev => prev.map(n => n.id === selectedId ? { ...n, ...newsForm } : n));
        triggerNotification(t('تم تعديل الخبر.', 'News item updated.'));
      }
      setIsModalOpen(false);
    } catch {
      triggerNotification('Error', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditNews = (n: NewsItem) => {
    setNewsForm({
      titleAr: n.titleAr, titleEn: n.titleEn,
      contentAr: n.contentAr, contentEn: n.contentEn,
      imageUrl: n.imageUrl
    });
    setSelectedId(n.id);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleDeleteNews = (id: string) => {
    requestConfirmation(
      t('حذف الخبر', 'Delete News'),
      t('حذف هذا الخبر؟', 'Delete this news?'),
      async () => {
        setActionLoading(true);
        try {
          await dbService.deleteNews(id);
          setNews(prev => prev.filter(n => n.id !== id));
          triggerNotification(t('تم حذف الخبر بنجاح.', 'News item deleted successfully.'));
        } catch {
          triggerNotification('Error', true);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // 6. Reviews Management (Approve / Reject / CRUD)
  const handleToggleReviewApproval = async (rev: UserReview) => {
    try {
      const nextState = !rev.approved;
      await dbService.updateReview(rev.id, { approved: nextState });
      setReviews(prev => prev.map(r => r.id === rev.id ? { ...r, approved: nextState } : r));
      triggerNotification(t('تم تعديل حالة الموافقة على المراجعة.', 'Review approval status changed.'));
    } catch {
      triggerNotification('Error updating review status', true);
    }
  };

  const handleDeleteReview = (id: string) => {
    requestConfirmation(
      t('حذف التقييم', 'Delete Review'),
      t('حذف هذا التقييم؟', 'Delete this review?'),
      async () => {
        setActionLoading(true);
        try {
          await dbService.deleteReview(id);
          setReviews(prev => prev.filter(r => r.id !== id));
          triggerNotification(t('تم حذف التقييم بنجاح.', 'Review deleted successfully.'));
        } catch {
          triggerNotification('Error deleting review', true);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // 7. Messages & Live Chat Management
  const handleMarkMessageRead = async (msg: Message) => {
    try {
      await dbService.updateMessage(msg.id, { read: true });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
      triggerNotification(t('تم تحديد الرسالة كمقروءة.', 'Message marked as read.'));
    } catch {
      triggerNotification(t('خطأ أثناء تحديث حالة الرسالة', 'Error updating message'), true);
    }
  };

  const handleDeleteMessage = (id: string) => {
    requestConfirmation(
      t('حذف الرسالة', 'Delete Message'),
      t('هل أنت متأكد تماماً من حذف هذه الرسالة نهائياً من صندوق الوارد؟', 'Are you sure you want to permanently delete this message?'),
      async () => {
        try {
          await dbService.deleteMessage(id);
          setMessages(prev => prev.filter(m => m.id !== id));
          triggerNotification(t('تم حذف الرسالة بنجاح من صندوق الوارد.', 'Message deleted successfully.'));
        } catch {
          triggerNotification(t('خطأ أثناء حذف الرسالة', 'Error deleting message'), true);
        }
      }
    );
  };

  const handleDeleteChatMessage = (msgId: string) => {
    if (!selectedChatStudentId) return;
    requestConfirmation(
      t('حذف رسالة المحادثة', 'Delete Chat Message'),
      t('هل أنت متأكد من حذف هذه الرسالة من المحادثة؟', 'Are you sure you want to delete this chat message?'),
      async () => {
        try {
          await dbService.deleteChatMessage(selectedChatStudentId, msgId);
          setLiveChatMessages(prev => prev.filter(m => m.id !== msgId));
          triggerNotification(t('تم حذف الرسالة من المحادثة بنجاح.', 'Chat message deleted successfully.'));
        } catch (err) {
          console.error(err);
          triggerNotification(t('خطأ أثناء حذف الرسالة', 'Error deleting message'), true);
        }
      }
    );
  };

  const handleClearStudentChat = () => {
    if (!selectedChatStudentId) return;
    requestConfirmation(
      t('حذف المحادثة بالكامل', 'Delete Conversation'),
      t('هل أنت متأكد من حذف هذه المحادثة بالكامل وجميع الرسائل؟ لن يمكن استرجاعها.', 'Are you sure you want to delete this entire chat conversation and all messages? This cannot be undone.'),
      async () => {
        try {
          await dbService.deleteStudentChat(selectedChatStudentId);
          setLiveChatMessages([]);
          triggerNotification(t('تم حذف المحادثة بالكامل بنجاح.', 'Chat deleted successfully.'));
        } catch (err) {
          console.error(err);
          triggerNotification(t('خطأ أثناء حذف المحادثة', 'Error deleting chat'), true);
        }
      }
    );
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatStudentId || !adminReplyText.trim()) return;
    const textToSend = adminReplyText.trim();
    setAdminReplyText('');
    try {
      await dbService.markChatThreadAsRead(selectedChatStudentId).catch(() => {});
      await dbService.addChatMessage(selectedChatStudentId, {
        text: textToSend,
        senderId: 'admin',
        senderName: t('إدارة المنصة الجامعية', 'Platform Administrator'),
        timestamp: Date.now()
      });
      triggerNotification(t('تم إرسال الرد للطالب بنجاح! 🚀', 'Reply sent to student!'));
    } catch (err) {
      console.error(err);
      triggerNotification(t('خطأ أثناء إرسال الرد', 'Error sending reply'), true);
    }
  };

  // 8. Website Settings Save
  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setActionLoading(true);
    try {
      await dbService.updateSettings(settingsForm);
      setSettings(settingsForm);
      triggerNotification(t('تم حفظ إعدادات الموقع بنجاح المزامنة!', 'Website settings saved and synchronized successfully!'));
    } catch {
      triggerNotification('Error saving website settings', true);
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Admins Management
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const added = await dbService.addAdmin(adminForm);
      setAdmins(prev => [...prev, added]);
      triggerNotification(t('تم إضافة المسؤول بنجاح.', 'Admin account added successfully.'));
      setAdminForm({ name: '', email: '', role: 'editor' });
      setIsModalOpen(false);
    } catch {
      triggerNotification('Failed to add admin', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAdmin = (id: string) => {
    if (admins.length <= 1) {
      triggerNotification(t('لا يمكن حذف المسؤول الأخير!', 'Cannot delete the last administrator!'), true);
      return;
    }
    requestConfirmation(
      t('إزالة مسؤول', 'Remove Administrator'),
      t('هل تريد إزالة صلاحيات هذا المسؤول؟', 'Are you sure you want to remove this administrator?'),
      async () => {
        try {
          await dbService.deleteAdmin(id);
          setAdmins(prev => prev.filter(a => a.id !== id));
          triggerNotification(t('تم إزالة المسؤول.', 'Administrator removed.'));
        } catch {
          triggerNotification('Error removing admin', true);
        }
      }
    );
  };

  // --- Teacher CRUD Handlers ---
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (modalType === 'add') {
        const added = await dbService.addTeacher(teacherForm);
        setTeachers(prev => [...prev, added]);
        triggerNotification(t('تم إضافة عضو هيئة التدريس بنجاح!', 'Faculty supervisor added successfully!'));
      } else {
        await dbService.updateTeacher(selectedId, teacherForm);
        setTeachers(prev => prev.map(t => t.id === selectedId ? { ...t, ...teacherForm } : t));
        triggerNotification(t('تم تحديث بيانات عضو هيئة التدريس بنجاح!', 'Faculty supervisor updated successfully!'));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      triggerNotification(err.message || 'Error saving supervisor', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTeacher = (t: Teacher) => {
    setTeacherForm({
      nameAr: t.nameAr, nameEn: t.nameEn, email: t.email, phone: t.phone || '',
      bioAr: t.bioAr || '', bioEn: t.bioEn || '', imageUrl: t.imageUrl || '', rating: t.rating || 5
    });
    setSelectedId(t.id);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleDeleteTeacher = (id: string) => {
    requestConfirmation(
      t('حذف عضو هيئة التدريس', 'Delete Faculty Supervisor'),
      t('هل أنت متأكد من حذف عضو هيئة التدريس هذا؟', 'Are you sure you want to delete this faculty supervisor?'),
      async () => {
        try {
          await dbService.deleteTeacher(id);
          setTeachers(prev => prev.filter(t => t.id !== id));
          triggerNotification(t('تم حذف عضو هيئة التدريس بنجاح.', 'Faculty supervisor deleted successfully.'));
        } catch {
          triggerNotification('Error deleting supervisor', true);
        }
      }
    );
  };

  // --- Coupon CRUD Handlers ---
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (modalType === 'add') {
        const added = await dbService.addCoupon(couponForm);
        setCoupons(prev => [...prev, added]);
        triggerNotification(t('تم إضافة الكوبون بنجاح!', 'Coupon added successfully!'));
      } else {
        await dbService.updateCoupon(selectedId, couponForm);
        setCoupons(prev => prev.map(c => c.id === selectedId ? { ...c, ...couponForm } : c));
        triggerNotification(t('تم تحديث الكوبون بنجاح!', 'Coupon updated successfully!'));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      triggerNotification(err.message || 'Error saving coupon', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCoupon = (c: Coupon) => {
    setCouponForm({
      code: c.code, discountPercent: c.discountPercent, expiresAt: c.expiresAt, active: c.active
    });
    setSelectedId(c.id);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleDeleteCoupon = (id: string) => {
    requestConfirmation(
      t('حذف الكوبون', 'Delete Coupon'),
      t('هل أنت متأكد من حذف هذا الكوبون؟', 'Are you sure you want to delete this coupon?'),
      async () => {
        try {
          await dbService.deleteCoupon(id);
          setCoupons(prev => prev.filter(c => c.id !== id));
          triggerNotification(t('تم حذف الكوبون بنجاح.', 'Coupon deleted.'));
        } catch {
          triggerNotification('Error deleting coupon', true);
        }
      }
    );
  };

  // --- Order CRUD & Approval Handlers ---
  const handleApproveOrder = async (ord: Order) => {
    setActionLoading(true);
    try {
      // 1. Update order status to 'approved' across all matching orders for this student and course
      const cleanEmail = (ord.studentEmail || '').trim().toLowerCase();
      const cleanPhone = (ord.studentPhone || '').replace(/\D/g, '');
      const matchingOrders = orders.filter(o => {
        if (o.courseId !== ord.courseId) return false;
        const oEmail = (o.studentEmail || '').trim().toLowerCase();
        const oPhone = (o.studentPhone || '').replace(/\D/g, '');
        return (cleanEmail !== '' && oEmail === cleanEmail) ||
               (ord.studentId && (o.studentId === ord.studentId)) ||
               (cleanPhone !== '' && oPhone === cleanPhone) ||
               (o.id === ord.id);
      });

      for (const o of matchingOrders) {
        await dbService.updateOrder(o.id, { status: 'approved' });
      }
      setOrders(prev => prev.map(o => matchingOrders.some(m => m.id === o.id) ? { ...o, status: 'approved' } : o));

      // 2. Grant course access & activate student account
      const subExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const matchingStudents = students.filter(s => {
        const sEmail = (s.email || '').trim().toLowerCase();
        const sPhone = (s.phone || '').replace(/\D/g, '');
        return (cleanEmail !== '' && sEmail === cleanEmail) ||
               (ord.studentId && (s.id === ord.studentId || (s as any).uid === ord.studentId)) ||
               (cleanPhone !== '' && sPhone === cleanPhone);
      });

      if (matchingStudents.length > 0) {
        for (const stud of matchingStudents) {
          const updatedCourseIds = Array.from(new Set([...(stud.purchasedCourseIds || []), ord.courseId]));
          const updatedData: Partial<Student> = {
            purchasedCourseIds: updatedCourseIds,
            status: 'active',
            subscription: { active: true, expiresAt: subExpiresAt }
          };
          await dbService.updateStudent(stud.id, updatedData);
          setStudents(prev => prev.map(s => s.id === stud.id ? { ...s, ...updatedData } : s));
        }
      }

      // 3. Sync matching user account in users collection if existing
      const allUsers = await authService.getAllUsers();
      const matchingUsers = allUsers.filter(u => {
        const uEmail = (u.email || '').trim().toLowerCase();
        const uPhone = (u.phone || '').replace(/\D/g, '');
        return (cleanEmail !== '' && uEmail === cleanEmail) ||
               (ord.studentId && (u.id === ord.studentId || u.uid === ord.studentId)) ||
               (cleanPhone !== '' && uPhone === cleanPhone);
      });

      for (const u of matchingUsers) {
        const userCourseIds = Array.from(new Set([...(u.purchasedCourseIds || []), ord.courseId]));
        await authService.updateUser(u.id, {
          purchasedCourseIds: userCourseIds,
          status: 'active',
          subscription: { active: true, expiresAt: subExpiresAt }
        });
      }

      // Send real-time Academy Notification to the Student
      try {
        await dbService.addNotification({
          userId: ord.studentId || ord.studentEmail,
          titleAr: `تم تفعيل مقرر: ${ord.courseTitle} بنجاح! 🎓`,
          titleEn: `Course Activated: ${ord.courseTitle}! 🎓`,
          bodyAr: `تهانينا! قامت إدارة المنصة الجامعية باعتماد طلبك وتفعيل صلاحية الاطلاع وتحميل ملفات المحاضرات (PDF) والسكاشن (Word) لمقرر "${ord.courseTitle}". يمكنك البدء فوراً في المذاكرة وتحميل الملفات.`,
          bodyEn: `Congratulations! Your course activation request for "${ord.courseTitle}" has been approved! You now have full access to view and download all lecture notes and lab worksheets.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          type: 'course_activated',
          courseId: ord.courseId,
          courseTitle: ord.courseTitle
        });
      } catch (notifErr) {
        console.warn("Could not dispatch activation notification:", notifErr);
      }

      triggerNotification(t('تمت الموافقة على طلب تفعيل المقرر للطالب وإرسال إشعار فوري له! 🚀', 'Course activation approved and student notified!'));
    } catch (err: any) {
      console.error(err);
      triggerNotification(t('خطأ أثناء الموافقة على الطلب', 'Error approving request'), true);
    } finally {
      setActionLoading(false);
    }
  };

  const executeRejectOrder = async (ord: Order) => {
    setActionLoading(true);
    try {
      const cleanEmail = (ord.studentEmail || '').trim().toLowerCase();
      const cleanPhone = (ord.studentPhone || '').replace(/\D/g, '');
      const matchingOrders = orders.filter(o => {
        if (o.courseId !== ord.courseId) return false;
        const oEmail = (o.studentEmail || '').trim().toLowerCase();
        const oPhone = (o.studentPhone || '').replace(/\D/g, '');
        return (cleanEmail !== '' && oEmail === cleanEmail) ||
               (ord.studentId && (o.studentId === ord.studentId)) ||
               (cleanPhone !== '' && oPhone === cleanPhone) ||
               (o.id === ord.id);
      });

      for (const o of matchingOrders) {
        await dbService.updateOrder(o.id, { status: 'rejected' });
      }
      setOrders(prev => prev.map(o => matchingOrders.some(m => m.id === o.id) ? { ...o, status: 'rejected' } : o));

      const matchingStudents = students.filter(s => {
        const sEmail = (s.email || '').trim().toLowerCase();
        const sPhone = (s.phone || '').replace(/\D/g, '');
        return (cleanEmail !== '' && sEmail === cleanEmail) ||
               (ord.studentId && (s.id === ord.studentId || (s as any).uid === ord.studentId)) ||
               (cleanPhone !== '' && sPhone === cleanPhone);
      });

      for (const stud of matchingStudents) {
        const updatedCourseIds = (stud.purchasedCourseIds || []).filter(id => id !== ord.courseId);
        await dbService.updateStudent(stud.id, { purchasedCourseIds: updatedCourseIds });
        setStudents(prev => prev.map(s => s.id === stud.id ? { ...s, purchasedCourseIds: updatedCourseIds } : s));
      }

      const allUsers = await authService.getAllUsers();
      const matchingUsers = allUsers.filter(u => {
        const uEmail = (u.email || '').trim().toLowerCase();
        const uPhone = (u.phone || '').replace(/\D/g, '');
        return (cleanEmail !== '' && uEmail === cleanEmail) ||
               (ord.studentId && (u.id === ord.studentId || u.uid === ord.studentId)) ||
               (cleanPhone !== '' && uPhone === cleanPhone);
      });

      for (const u of matchingUsers) {
        const updatedCourseIds = (u.purchasedCourseIds || []).filter(id => id !== ord.courseId);
        await authService.updateUser(u.id, { purchasedCourseIds: updatedCourseIds });
      }

      if (ord.studentId && matchingStudents.length === 0 && matchingUsers.length === 0) {
        await authService.updateUser(ord.studentId, {
          purchasedCourseIds: []
        }).catch(() => {});
      }

      triggerNotification(t('تم رفض طلب التفعيل وحجب الوصول للمقرر.', 'Activation request rejected and subject access blocked.'));
    } catch (err: any) {
      console.error(err);
      triggerNotification(t('خطأ أثناء رفض الطلب', 'Error rejecting request'), true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOrder = async (ord: Order, skipConfirm?: boolean) => {
    if (skipConfirm) {
      await executeRejectOrder(ord);
      return;
    }
    requestConfirmation(
      t('رفض طلب التفعيل', 'Reject Request'),
      t('هل أنت متأكد من رفض طلب الاشتراك هذا؟', 'Are you sure you want to reject this subscription request?'),
      () => executeRejectOrder(ord)
    );
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (modalType === 'add') {
        const added = await dbService.addOrder(orderForm);
        setOrders(prev => [...prev, added]);

        // Auto-grant if completed or approved
        if (orderForm.status === 'completed' || orderForm.status === 'approved') {
          await handleApproveOrder(added);
        } else if (orderForm.status === 'rejected') {
          await handleRejectOrder(added, true);
        } else {
          triggerNotification(t('تم تسجيل طلب الاشتراك يدوياً بنجاح!', 'Subscription request created successfully!'));
        }
      } else {
        await dbService.updateOrder(selectedId, orderForm);
        setOrders(prev => prev.map(o => o.id === selectedId ? { ...o, ...orderForm } : o));

        if (orderForm.status === 'completed' || orderForm.status === 'approved') {
          const ordToApprove = orders.find(o => o.id === selectedId) || { id: selectedId, ...orderForm, date: '' };
          await handleApproveOrder({ ...ordToApprove, ...orderForm });
        } else if (orderForm.status === 'rejected') {
          const ordToReject = orders.find(o => o.id === selectedId) || { id: selectedId, ...orderForm, date: '' };
          await handleRejectOrder({ ...ordToReject, ...orderForm }, true);
        } else {
          triggerNotification(t('تم تحديث تفاصيل الاشتراك بنجاح!', 'Order updated successfully!'));
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      triggerNotification(err.message || 'Error saving order', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditOrder = (o: Order) => {
    setOrderForm({
      studentId: o.studentId, studentName: o.studentName, studentEmail: o.studentEmail,
      courseId: o.courseId, courseTitle: o.courseTitle, pricePaid: o.pricePaid,
      couponCode: o.couponCode || '', status: o.status
    });
    setSelectedId(o.id);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleDeleteOrder = (id: string) => {
    requestConfirmation(
      t('حذف الاشتراك', 'Delete Enrollment'),
      t('هل أنت متأكد من إلغاء/حذف اشتراك الطالب هذا؟', 'Are you sure you want to cancel/delete this enrollment?'),
      async () => {
        try {
          await dbService.deleteOrder(id);
          setOrders(prev => prev.filter(o => o.id !== id));
          triggerNotification(t('تم حذف الاشتراك بنجاح.', 'Enrollment deleted successfully.'));
        } catch {
          triggerNotification('Error deleting enrollment', true);
        }
      }
    );
  };

  // --- Quiz (Electronic Exam) Handlers ---
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const parsedTime = Number(quizForm.timeLimit);
      const validTimeLimit = (!isNaN(parsedTime) && parsedTime > 0) ? parsedTime : 30;
      const formattedQuizForm = {
        ...quizForm,
        timeLimit: validTimeLimit
      };

      if (modalType === 'add') {
        const added = await dbService.addQuiz(formattedQuizForm);
        setQuizzes(prev => [...prev, added]);
        triggerNotification(t('تم إضافة الامتحان الإلكتروني بنجاح!', 'Exam created successfully!'));
      } else {
        await dbService.updateQuiz(selectedId, formattedQuizForm);
        setQuizzes(prev => prev.map(q => q.id === selectedId ? { ...q, ...formattedQuizForm } : q));
        triggerNotification(t('تم تحديث بيانات الامتحان بنجاح!', 'Exam updated successfully!'));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      triggerNotification(err.message || 'Error saving quiz', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditQuiz = (q: Quiz) => {
    setQuizForm({
      courseId: q.courseId,
      grade: q.grade || 'all',
      titleAr: q.titleAr,
      titleEn: q.titleEn,
      timeLimit: q.timeLimit || 30,
      published: q.published !== undefined ? q.published : true,
      autoCorrection: q.autoCorrection !== undefined ? q.autoCorrection : true,
      questions: q.questions || []
    });
    setSelectedId(q.id);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleTogglePublishQuiz = async (q: Quiz) => {
    try {
      const isCurrentlyPublished = q.published !== false;
      const updatedStatus = !isCurrentlyPublished;
      await dbService.updateQuiz(q.id, { published: updatedStatus });
      setQuizzes(prev => prev.map(item => item.id === q.id ? { ...item, published: updatedStatus } : item));
      if (updatedStatus) {
        dbService.addNotification({
          userId: 'global',
          titleAr: 'امتحان إلكتروني جديد 📝',
          titleEn: 'New Online Exam',
          bodyAr: `تم نشر امتحان جديد: ${q.titleAr}`,
          bodyEn: `New exam published: ${q.titleEn}`,
          isRead: false,
          createdAt: new Date().toISOString()
        }).catch(err => console.error("Error creating notification:", err));
      }
      triggerNotification(updatedStatus ? t('تم نشر الامتحان بنجاح للطلاب ✅', 'Exam published to students!') : t('تم إخفاء الامتحان عن الطلاب 🔒', 'Exam hidden from students.'));
    } catch {
      triggerNotification('Error toggling exam status', true);
    }
  };

  const handleDeleteQuiz = (id: string) => {
    requestConfirmation(
      t('حذف الامتحان الإلكتروني', 'Delete Online Exam'),
      t('حذف هذا الامتحان الإلكتروني نهائياً؟', 'Are you sure you want to delete this exam?'),
      async () => {
        try {
          await dbService.deleteQuiz(id);
          setQuizzes(prev => prev.filter(q => q.id !== id));
          triggerNotification(t('تم حذف الامتحان بنجاح.', 'Exam deleted.'));
        } catch {
          triggerNotification('Error deleting quiz', true);
        }
      }
    );
  };

  // --- Assignment Task & Submission Handlers ---
  const handleAssignmentTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const isCourseVis = assignmentTaskForm.visibility === 'course';

      const finalPayload: Omit<Assignment, 'id'> = {
        ...assignmentTaskForm,
        visibility: isCourseVis ? 'course' : 'free',
        courseId: '',
        courseName: ''
      };

      if (modalType === 'add') {
        const added = await dbService.addAssignmentTask(finalPayload);
        setAssignmentTasks(prev => [...prev, added]);
        triggerNotification(t('تم إضافة تكليف الواجب بنجاح!', 'Assignment created successfully!'));
      } else {
        await dbService.updateAssignmentTask(selectedId, finalPayload);
        setAssignmentTasks(prev => prev.map(a => a.id === selectedId ? { ...a, ...finalPayload } : a));
        triggerNotification(t('تم تحديث تكليف الواجب بنجاح!', 'Assignment updated successfully!'));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      triggerNotification(err.message || 'Error saving assignment task', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAssignmentTask = (a: Assignment) => {
    const isCourseVis = a.visibility === 'course' || (a.visibility !== 'free' && a.courseId && a.courseId !== 'all' && a.courseId.trim() !== '');
    const vis: 'free' | 'course' = isCourseVis ? 'course' : 'free';

    setAssignmentTaskForm({
      courseId: '',
      courseName: '',
      visibility: vis,
      grade: a.grade || 'all',
      titleAr: a.titleAr,
      titleEn: a.titleEn,
      descriptionAr: a.descriptionAr || '',
      descriptionEn: a.descriptionEn || '',
      pdfUrl: a.pdfUrl || '',
      imageUrls: a.imageUrls || [],
      deadline: a.deadline || '',
      totalGrade: a.totalGrade || 100,
      published: a.published !== undefined ? a.published : true,
      createdAt: a.createdAt || new Date().toISOString()
    });
    setSelectedId(a.id);
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleTogglePublishAssignmentTask = async (a: Assignment) => {
    try {
      const isCurrentlyPublished = a.published !== false;
      const updatedStatus = !isCurrentlyPublished;
      await dbService.updateAssignmentTask(a.id, { published: updatedStatus });
      setAssignmentTasks(prev => prev.map(item => item.id === a.id ? { ...item, published: updatedStatus } : item));
      if (updatedStatus) {
        dbService.addNotification({
          userId: 'global',
          titleAr: 'واجب دراسي جديد 📚',
          titleEn: 'New Homework Assignment',
          bodyAr: `تم نشر واجب جديد: ${a.titleAr}`,
          bodyEn: `New assignment published: ${a.titleEn}`,
          isRead: false,
          createdAt: new Date().toISOString()
        }).catch(err => console.error("Error creating notification:", err));
      }
      triggerNotification(updatedStatus ? t('تم نشر الواجب للطلاب ✅', 'Assignment published!') : t('تم إخفاء الواجب 🔒', 'Assignment hidden.'));
    } catch {
      triggerNotification('Error toggling assignment status', true);
    }
  };

  const handleDeleteAssignmentTask = (id: string) => {
    requestConfirmation(
      t('حذف التكليف', 'Delete Assignment'),
      t('هل أنت متأكد من حذف تكليف الواجب هذا؟', 'Are you sure you want to delete this assignment task?'),
      async () => {
        try {
          await dbService.deleteAssignmentTask(id);
          setAssignmentTasks(prev => prev.filter(a => a.id !== id));
          triggerNotification(t('تم حذف تكليف الواجب.', 'Assignment deleted.'));
        } catch {
          triggerNotification('Error deleting assignment', true);
        }
      }
    );
  };

  const handleSaveGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionForGrading) return;
    setActionLoading(true);
    try {
      await dbService.updateAssignment(selectedSubmissionForGrading.id, {
        status: 'graded',
        grade: submissionGradeInput,
        feedback: submissionFeedbackInput
      });
      setAssignmentSubmissions(prev => prev.map(s => s.id === selectedSubmissionForGrading.id ? {
        ...s, status: 'graded', grade: submissionGradeInput, feedback: submissionFeedbackInput
      } : s));
      setSelectedSubmissionForGrading(null);
      triggerNotification(t('تم تسجيل ورصد درجة وتصحيح واجب الطالب بنجاح! 🎉', 'Grade and feedback saved successfully!'));
    } catch (err: any) {
      triggerNotification(err.message || 'Error grading submission', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubmission = (id: string) => {
    requestConfirmation(
      t('حذف التسليم', 'Delete Submission'),
      t('هل أنت متأكد من حذف تسليم هذا الواجب؟', 'Delete this student assignment submission?'),
      async () => {
        try {
          await dbService.deleteAssignmentSubmission(id);
          setAssignmentSubmissions(prev => prev.filter(s => s.id !== id));
          triggerNotification(t('تم حذف تسليم الواجب.', 'Submission deleted.'));
        } catch {
          triggerNotification('Error deleting submission', true);
        }
      }
    );
  };

  // Educational Content CRUD Handlers
  const handleSaveLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { courseId, courseTitle } = resolveCourseBySubject(lectureForm.subject);
      const payload = {
        ...lectureForm,
        courseId,
        courseTitle,
        number: Number(lectureForm.lectureNumber) || 1,
        createdBy: currentAdmin?.name || 'Eng/Mohamed abdal tawab',
      };
      if (editingContentId) {
        await dbService.updateLecture(editingContentId, payload);
        logAdminAction('update', 'lecture', lectureForm.title, `Updated lecture #${lectureForm.lectureNumber} (${lectureForm.subject})`);
        triggerNotification(t('تم تحديث المحاضرة بنجاح', 'Lecture updated'));
      } else {
        await dbService.addLecture(payload);
        logAdminAction('create', 'lecture', lectureForm.title, `Added lecture #${lectureForm.lectureNumber} (${lectureForm.subject})`);
        try {
          await dbService.addNotification({
            userId: 'global',
            titleAr: `محاضرة جديدة في ${courseTitle}: ${lectureForm.title}`,
            titleEn: `New Lecture in ${lectureForm.subject}: ${lectureForm.title}`,
            bodyAr: `تم رفع المحاضرة رقم ${lectureForm.lectureNumber} لمادة ${courseTitle} شاملة الشرح وملفات الـ PDF.`,
            bodyEn: `Lecture #${lectureForm.lectureNumber} for ${lectureForm.subject} is now available.`,
            isRead: false,
            createdAt: new Date().toISOString(),
            type: 'lecture_added',
            courseId,
            courseTitle
          });
        } catch {}
        triggerNotification(t('تمت إضافة المحاضرة وإرسال إشعار للطلاب', 'Lecture added and students notified'));
      }
      setActiveContentModal(null);
      setEditingContentId(null);
    } catch (err: any) {
      triggerNotification(err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLecture = (id: string) => {
    requestConfirmation(
      t('حذف المحاضرة', 'Delete Lecture'),
      t('هل أنت متأكد من حذف هذه المحاضرة؟', 'Delete this lecture?'),
      async () => {
        try {
          const target = lectures.find(l => l.id === id);
          await dbService.deleteLecture(id);
          logAdminAction('delete', 'lecture', target?.title || id, 'Deleted lecture');
          triggerNotification(t('تم حذف المحاضرة بنجاح', 'Lecture deleted'));
        } catch (err: any) {
          triggerNotification(err.message, true);
        }
      }
    );
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { courseId, courseTitle } = resolveCourseBySubject(sectionForm.subject);
      const payload = {
        ...sectionForm,
        courseId,
        courseTitle,
        number: Number(sectionForm.sectionNumber) || 1,
        createdBy: currentAdmin?.name || 'Eng/Mohamed abdal tawab',
      };
      if (editingContentId) {
        await dbService.updateSection(editingContentId, payload);
        logAdminAction('update', 'section', sectionForm.title, `Updated section #${sectionForm.sectionNumber} (${sectionForm.subject})`);
        triggerNotification(t('تم تحديث السكشن بنجاح', 'Section updated'));
      } else {
        await dbService.addSection(payload);
        logAdminAction('create', 'section', sectionForm.title, `Added section #${sectionForm.sectionNumber} (${sectionForm.subject})`);
        triggerNotification(t('تمت إضافة السكشن بنجاح', 'Section added'));
      }
      setActiveContentModal(null);
      setEditingContentId(null);
    } catch (err: any) {
      triggerNotification(err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSection = (id: string) => {
    requestConfirmation(
      t('حذف السكشن', 'Delete Section'),
      t('هل أنت متأكد من حذف هذا السكشن؟', 'Delete this section?'),
      async () => {
        try {
          const target = sections.find(s => s.id === id);
          await dbService.deleteSection(id);
          logAdminAction('delete', 'section', target?.title || id, 'Deleted section');
          triggerNotification(t('تم حذف السكشن بنجاح', 'Section deleted'));
        } catch (err: any) {
          triggerNotification(err.message, true);
        }
      }
    );
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { courseId, courseTitle } = resolveCourseBySubject(examForm.subject);
      const computedPoints = examForm.isOnlineExam && examForm.questions.length > 0
        ? examForm.questions.reduce((acc, q) => acc + (Number(q.points) || 10), 0)
        : 100;
      const payload: Omit<ExamItem, 'id' | 'createdAt'> = {
        courseId,
        courseTitle,
        subject: examForm.subject,
        number: examForm.number || 'Exam',
        title: examForm.title,
        description: examForm.description,
        questionsPdfUrl: examForm.questionsPdfUrl,
        questionsFileUrl: examForm.questionsPdfUrl,
        modelAnswerUrl: examForm.modelAnswerUrl,
        answersFileUrl: examForm.modelAnswerUrl,
        examDate: examForm.examDate,
        isOnlineExam: Boolean(examForm.isOnlineExam),
        durationMinutes: Number(examForm.durationMinutes) || 30,
        showResultsImmediately: examForm.showResultsImmediately !== false,
        published: examForm.published !== false,
        questions: examForm.questions || [],
        totalPoints: computedPoints,
        createdBy: currentAdmin?.name || 'Eng/Mohamed abdal tawab',
      };
      if (editingContentId) {
        await dbService.updateExam(editingContentId, payload);
        logAdminAction('update', 'exam', examForm.title, `Updated exam (${examForm.subject})`);
        triggerNotification(t('تم تحديث الامتحان بنجاح', 'Exam updated'));
      } else {
        await dbService.addExam(payload);
        logAdminAction('create', 'exam', examForm.title, `Created ${examForm.isOnlineExam ? 'online ' : ''}exam (${examForm.subject})`);
        triggerNotification(t('تمت إضافة الامتحان بنجاح', 'Exam added'));
      }
      setActiveContentModal(null);
      setEditingContentId(null);
    } catch (err: any) {
      triggerNotification(err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExam = (id: string) => {
    requestConfirmation(
      t('حذف الامتحان', 'Delete Exam'),
      t('هل أنت متأكد من حذف هذا الامتحان؟', 'Delete this exam?'),
      async () => {
        try {
          const target = exams.find(x => x.id === id);
          await dbService.deleteExam(id);
          logAdminAction('delete', 'exam', target?.title || id, 'Deleted exam');
          triggerNotification(t('تم حذف الامتحان بنجاح', 'Exam deleted'));
        } catch (err: any) {
          triggerNotification(err.message, true);
        }
      }
    );
  };

  const handleSaveSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { courseId, courseTitle } = resolveCourseBySubject(sheetForm.subject);
      const refNum = sheetForm.type === 'lecture_sheet' ? sheetForm.lectureNumber : sheetForm.sectionNumber;
      const payload = {
        ...sheetForm,
        courseId,
        courseTitle,
        sheetType: sheetForm.type,
        referenceNumber: Number(refNum) || 1,
        createdBy: currentAdmin?.name || 'Eng/Mohamed abdal tawab',
      };
      if (editingContentId) {
        await dbService.updateSheet(editingContentId, payload);
        logAdminAction('update', 'sheet', sheetForm.title, `Updated sheet (${sheetForm.subject})`);
        triggerNotification(t('تم تحديث الشيت بنجاح', 'Sheet updated'));
      } else {
        await dbService.addSheet(payload);
        logAdminAction('create', 'sheet', sheetForm.title, `Added sheet (${sheetForm.subject})`);
        triggerNotification(t('تمت إضافة الشيت بنجاح', 'Sheet added'));
      }
      setActiveContentModal(null);
      setEditingContentId(null);
    } catch (err: any) {
      triggerNotification(err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSheet = (id: string) => {
    requestConfirmation(
      t('حذف الشيت', 'Delete Sheet'),
      t('هل أنت متأكد من حذف هذا الشيت؟', 'Delete this sheet?'),
      async () => {
        try {
          const target = sheets.find(s => s.id === id);
          await dbService.deleteSheet(id);
          logAdminAction('delete', 'sheet', target?.title || id, 'Deleted sheet');
          triggerNotification(t('تم حذف الشيت بنجاح', 'Sheet deleted'));
        } catch (err: any) {
          triggerNotification(err.message, true);
        }
      }
    );
  };

  const handleSaveQuestionBankItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionBankForm.questionText.trim()) return;
    setActionLoading(true);
    try {
      const { courseId, courseTitle } = resolveCourseBySubject(questionBankForm.subject);
      const cleanOpts = questionBankForm.type === 'true_false'
        ? [t('صح', 'True'), t('خطأ', 'False')]
        : questionBankForm.options.map(o => o.trim()).filter(Boolean);
      const payload: Omit<QuestionBankItem, 'id' | 'createdAt'> = {
        courseId,
        courseTitle,
        topic: questionBankForm.topic.trim() || questionBankForm.subject,
        questionText: questionBankForm.questionText.trim(),
        type: questionBankForm.type,
        options: cleanOpts.length >= 2 ? cleanOpts : ['Option 1', 'Option 2'],
        correctAnswerIndex: Math.min(questionBankForm.correctAnswerIndex, Math.max(0, cleanOpts.length - 1)),
        points: Number(questionBankForm.points) || 10,
        explanation: questionBankForm.explanation.trim(),
      };
      if (editingContentId) {
        await dbService.updateQuestionBankItem(editingContentId, payload);
        logAdminAction('update', 'question_bank', questionBankForm.topic || questionBankForm.subject, 'Updated question bank item');
        triggerNotification(t('تم تحديث السؤال في بنك الأسئلة بنجاح', 'Question updated'));
      } else {
        await dbService.addQuestionBankItem(payload);
        logAdminAction('create', 'question_bank', questionBankForm.topic || questionBankForm.subject, 'Added new question bank item');
        triggerNotification(t('تمت إضافة السؤال إلى بنك الأسئلة بنجاح', 'Question added to bank'));
      }
      setActiveContentModal(null);
      setEditingContentId(null);
    } catch (err: any) {
      triggerNotification(err?.message || 'Error saving question', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuestionBankItem = (id: string) => {
    requestConfirmation(
      t('حذف السؤال', 'Delete Question'),
      t('هل أنت متأكد من حذف هذا السؤال من بنك الأسئلة؟', 'Delete this question?'),
      async () => {
        try {
          await dbService.deleteQuestionBankItem(id);
          logAdminAction('delete', 'question_bank', id, 'Deleted question bank item');
          triggerNotification(t('تم حذف السؤال بنجاح', 'Question deleted'));
        } catch (err: any) {
          triggerNotification(err?.message || 'Error deleting question', true);
        }
      }
    );
  };

  const handleSaveScheduleItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const { courseId, courseTitle } = resolveCourseBySubject(scheduleForm.subject);
      const dayArMap: Record<string, string> = {
        Saturday: 'السبت',
        Sunday: 'الأحد',
        Monday: 'الإثنين',
        Tuesday: 'الثلاثاء',
        Wednesday: 'الأربعاء',
        Thursday: 'الخميس',
      };
      const payload: Omit<ScheduleItem, 'id'> = {
        courseId,
        courseTitle,
        title: scheduleForm.title.trim(),
        itemType: scheduleForm.itemType,
        dayOfWeek: scheduleForm.dayOfWeek,
        dayOfWeekAr: dayArMap[scheduleForm.dayOfWeek] || scheduleForm.dayOfWeekAr || scheduleForm.dayOfWeek,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        location: scheduleForm.location.trim(),
        instructor: scheduleForm.instructor.trim() || 'Eng/Mohamed abdal tawab',
        notes: scheduleForm.notes.trim(),
        active: scheduleForm.active,
      };
      if (editingContentId) {
        await dbService.updateScheduleItem(editingContentId, payload);
        logAdminAction('update', 'schedule', payload.title, `${payload.dayOfWeekAr} ${payload.startTime}-${payload.endTime}`);
        triggerNotification(t('تم تحديث الموعد في الجدول الأسبوعي بنجاح', 'Schedule slot updated'));
      } else {
        await dbService.addScheduleItem(payload);
        logAdminAction('create', 'schedule', payload.title, `${payload.dayOfWeekAr} ${payload.startTime}-${payload.endTime}`);
        triggerNotification(t('تمت إضافة الموعد إلى الجدول الأسبوعي بنجاح', 'Schedule slot added'));
      }
      setActiveContentModal(null);
      setEditingContentId(null);
    } catch (err: any) {
      triggerNotification(err?.message || 'Error saving schedule slot', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteScheduleItem = (id: string) => {
    requestConfirmation(
      t('حذف الموعد', 'Delete Schedule Slot'),
      t('هل أنت متأكد من حذف هذا الموعد من الجدول؟', 'Delete this schedule slot?'),
      async () => {
        try {
          await dbService.deleteScheduleItem(id);
          logAdminAction('delete', 'schedule', id, 'Deleted schedule slot');
          triggerNotification(t('تم حذف الموعد من الجدول بنجاح', 'Schedule slot deleted'));
        } catch (err: any) {
          triggerNotification(err?.message || 'Error deleting schedule', true);
        }
      }
    );
  };

  const handleReplyInquiry = async (inq: StudentInquiry) => {
    const reply = (inquiryReplyDraft[inq.id] || '').trim();
    if (!reply) {
      triggerNotification(t('يرجى كتابة الرد أولاً', 'Please enter a reply first'), true);
      return;
    }
    setActionLoading(true);
    try {
      await dbService.replyToInquiry(inq.id, reply, currentAdmin?.name || 'Eng/Mohamed abdal tawab');
      setInquiryReplyDraft(prev => ({ ...prev, [inq.id]: '' }));
      logAdminAction('reply', 'inquiry', inq.title || inq.subjectTitle || inq.courseTitle || 'استفسار', `Replied to ${inq.studentName}`);
      try {
        await dbService.addNotification({
          userId: inq.studentId,
          titleAr: `تم الرد على استفسارك الأكاديمي في ${inq.courseTitle}`,
          titleEn: `Reply to your question in ${inq.courseTitle}`,
          bodyAr: reply,
          bodyEn: reply,
          isRead: false,
          createdAt: new Date().toISOString(),
          type: 'general',
          courseId: inq.courseId,
          courseTitle: inq.courseTitle,
        });
      } catch {}
      triggerNotification(t('تم إرسال الرد وإشعار الطالب بنجاح', 'Reply sent and student notified'));
    } catch (err: any) {
      triggerNotification(err?.message || 'Error sending reply', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInquiry = (id: string) => {
    requestConfirmation(
      t('حذف الاستفسار', 'Delete Inquiry'),
      t('هل أنت متأكد من حذف هذا الاستفسار؟', 'Delete this inquiry?'),
      async () => {
        try {
          await dbService.deleteInquiry(id);
          logAdminAction('delete', 'inquiry', id, 'Deleted student inquiry');
          triggerNotification(t('تم حذف الاستفسار', 'Inquiry deleted'));
        } catch (err: any) {
          triggerNotification(err?.message || 'Error deleting inquiry', true);
        }
      }
    );
  };

  const handleSendBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      triggerNotification(t('يرجى ملء عنوان ونص الإشعار', 'Please fill notification title and message'), true);
      return;
    }
    setActionLoading(true);
    try {
      await dbService.addNotification({
        userId: 'global',
        titleAr: notificationForm.title,
        titleEn: notificationForm.title,
        bodyAr: notificationForm.message,
        bodyEn: notificationForm.message,
        isRead: false,
        createdAt: new Date().toISOString(),
        type: (notificationForm.type as any) || 'general',
        courseId: notificationForm.targetCourseId !== 'all' ? notificationForm.targetCourseId : undefined
      });
      logAdminAction('create', 'notification', notificationForm.title, 'Broadcast instant notification');
      triggerNotification(t('تم إرسال الإشعار الفوري للطلاب بنجاح!', 'Notification sent to students!'));
      setNotificationForm({ title: '', message: '', type: 'general', targetCourseId: 'all' });
    } catch (err: any) {
      triggerNotification(err.message || 'Error sending notification', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper arrays / elements triggers
  const openAddModal = () => {
    setModalType('add');
    if (activeTab === 'courses' || activeTab === 'dashboard') {
      setCourseForm({
        titleAr: '', titleEn: '', descriptionAr: '', descriptionEn: '',
        teacherName: 'Eng/Mohamed abdal tawab', categoryId: categories[0]?.id || 'year1',
        price: 0, discountPrice: undefined, duration: '24 Hours', lessonsCount: 16,
        featured: false, popular: false, published: true,
        thumbnailUrl: COURSE_PROGRAMMING_CYBER_IMG,
        bannerUrl: HERO_IT_UNIVERSITY_IMG, isFree: true, password: '',
        imageUrls: [], videoUrl: '', pdfUrl: '', attachments: [],
        subjectAr: '', subjectEn: '', units: [], lessons: []
      });
      setLessonForm({ title: '', videoUrl: '', duration: '15:00', type: 'video', pdfUrl: '', order: 1 });
      setUnitForm({ title: '', description: '', order: 1 });
      setEditingUnitIndex(null);
      setEditingLessonUnitIndex(null);
      setEditingLessonIndex(null);
    } else if (activeTab === 'categories') {
      setCategoryForm({ nameAr: '', nameEn: '', imageUrl: HERO_IT_UNIVERSITY_IMG, color: 'cyan' });
    } else if (activeTab === 'students' || activeTab === 'registrations') {
      setStudentForm({ name: '', email: '', phone: '', purchasedCourseIds: [], status: 'active' });
    } else if (activeTab === 'teachers') {
      setTeacherForm({ nameAr: '', nameEn: '', email: '', phone: '', bioAr: '', bioEn: '', imageUrl: ENG_MOHAMED_AVATAR_IMG, rating: 5 });
    } else if (activeTab === 'coupons') {
      setCouponForm({ code: '', discountPercent: 100, expiresAt: '2026-12-31', active: true });
    } else if (activeTab === 'orders') {
      setOrderForm({ studentId: students[0]?.id || '', studentName: students[0]?.name || '', studentEmail: students[0]?.email || '', courseId: courses[0]?.id || '', courseTitle: courses[0]?.titleEn || '', pricePaid: 0, couponCode: '', status: 'completed' });
    } else if (activeTab === 'quizzes') {
      setQuizForm({
        courseId: '',
        grade: 'all',
        titleAr: '',
        titleEn: '',
        timeLimit: 30,
        published: true,
        autoCorrection: true,
        questions: []
      });
      setTempQuestion({ questionAr: '', questionEn: '', optionsAr: ['', '', '', ''], optionsEn: ['', '', '', ''], correctAnswerIndex: 0 });
    } else if (activeTab === 'assignments') {
      setAssignmentTaskForm({
        courseId: '',
        courseName: '',
        visibility: 'free',
        grade: 'all',
        titleAr: '',
        titleEn: '',
        descriptionAr: '',
        descriptionEn: '',
        pdfUrl: '',
        imageUrls: [],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalGrade: 100,
        published: true,
        createdAt: new Date().toISOString()
      });
    } else if (activeTab === 'articles') {
      setArticleForm({ titleAr: '', titleEn: '', contentAr: '', contentEn: '', authorAr: 'Eng/Mohamed abdal tawab', authorEn: 'Eng/Mohamed abdal tawab', imageUrl: COURSE_PROGRAMMING_CYBER_IMG, tags: [] });
    } else if (activeTab === 'news') {
      setNewsForm({ titleAr: '', titleEn: '', contentAr: '', contentEn: '', imageUrl: HERO_IT_UNIVERSITY_IMG });
    } else if (activeTab === 'admins') {
      setAdminForm({ name: '', email: '', role: 'editor' });
    }
    setIsModalOpen(true);
  };

  // Statistics calculation (Single Source of Truth from Firebase collections using standardized functions)
  const salesStats = dbService.calculateSalesStats(orders, students);
  const totalRevenue = salesStats.totalAmount;
  const activeSubscriptionsCount = salesStats.activeSubscriptionsCount;
  const pendingSubscriptionsCount = salesStats.pendingOrdersCount;
  const totalAccountsCount = students.length;

  const adminNavItems: Array<{
    id: TabType;
    labelAr: string;
    labelEn: string;
    shortAr: string;
    shortEn: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    pendingCount?: number;
    isBadgeYellow?: boolean;
    isBadgeRed?: boolean;
  }> = [
    { id: 'dashboard', labelAr: 'لوحة التحكم والإحصائيات', labelEn: 'Dashboard Overview', shortAr: 'الرئيسية', shortEn: 'Overview', icon: BarChart3 },
    { id: 'registrations', labelAr: 'طلبات تسجيل الطلاب (موافقات الدخول)', labelEn: 'Student Account Approvals', shortAr: 'طلبات التسجيل', shortEn: 'Approvals', icon: UserCheck, count: salesStats.pendingStudentsCount, isBadgeYellow: salesStats.pendingStudentsCount > 0, pendingCount: salesStats.pendingStudentsCount },
    { id: 'students', labelAr: 'قائمة الطلاب المسجلين', labelEn: 'Registered Students', shortAr: 'الطلاب', shortEn: 'Students', icon: Users, count: students.length },
    { id: 'courses', labelAr: 'المواد الدراسية (قسم IT)', labelEn: 'Academic Subjects', shortAr: 'المقررات', shortEn: 'Subjects', icon: BookOpen, count: courses.length },
    { id: 'lectures', labelAr: 'المحاضرات وملفات الـ PDF', labelEn: 'Lectures & PDFs', shortAr: 'المحاضرات', shortEn: 'Lectures', icon: BookOpen, count: lectures.length },
    { id: 'sections', labelAr: 'السكاشن والتطبيقات المعملية', labelEn: 'Sections & Lab Files', shortAr: 'السكاشن', shortEn: 'Sections', icon: Layers, count: sections.length },
    { id: 'exams', labelAr: 'الامتحانات الورقية والأونلاين', labelEn: 'Exams & Online Tests', shortAr: 'الامتحانات', shortEn: 'Exams', icon: GraduationCap, count: exams.length },
    { id: 'sheets', labelAr: 'شيتات المحاضرات والسكاشن', labelEn: 'Lecture & Section Sheets', shortAr: 'الشيتات', shortEn: 'Sheets', icon: FileCheck, count: sheets.length },
    { id: 'question-bank', labelAr: 'بنك الأسئلة', labelEn: 'Question Bank', shortAr: 'بنك الأسئلة', shortEn: 'Q-Bank', icon: ListChecks, count: questionBank.length },
    { id: 'schedule', labelAr: 'جدول المحاضرات والسكاشن', labelEn: 'Weekly Timetable', shortAr: 'الجدول', shortEn: 'Timetable', icon: Calendar, count: scheduleItems.length },
    { id: 'inquiries', labelAr: 'استفسارات وأسئلة الطلاب', labelEn: 'Student Inquiries Q&A', shortAr: 'الاستفسارات', shortEn: 'Inquiries', icon: HelpCircle, count: inquiries.length, pendingCount: inquiries.filter(i => i.status === 'pending').length },
    { id: 'notifications', labelAr: 'إشعارات المنصة الجامعية', labelEn: 'Announcements & Alerts', shortAr: 'الإعلانات', shortEn: 'Alerts', icon: Bell },
    { id: 'quizzes', labelAr: 'الاختبارات التدريبية التفاعلية', labelEn: 'Practice Assessments', shortAr: 'التدريبات', shortEn: 'Quizzes', icon: HelpCircle, count: quizzes.length },
    { id: 'assignments', labelAr: 'التكليفات والتسليمات البحثية', labelEn: 'Coursework & Submissions', shortAr: 'التكليفات', shortEn: 'Coursework', icon: ClipboardList, count: assignmentTasks.length, isBadgeYellow: assignmentSubmissions.some(s => s.status === 'submitted'), pendingCount: assignmentSubmissions.filter(s => s.status === 'submitted').length },
    { id: 'messages', labelAr: 'صندوق رسائل الوارد', labelEn: 'Contact Messages', shortAr: 'الرسائل', shortEn: 'Messages', icon: Mail, count: messages.filter(m => !m.read).length, isBadgeRed: true },
    { id: 'lesson_comments', labelAr: 'مناقشات واستفسارات المقررات', labelEn: 'Subject Discussions', shortAr: 'المناقشات', shortEn: 'Discussions', icon: MessageSquare, count: lessonComments.filter(c => !c.reply).length, isBadgeYellow: lessonComments.some(c => !c.reply), pendingCount: lessonComments.filter(c => !c.reply).length },
    { id: 'activity-logs', labelAr: 'سجل نشاط الإدارة', labelEn: 'Activity Audit Logs', shortAr: 'السجل', shortEn: 'Logs', icon: History, count: activityLogs.length },
    { id: 'settings', labelAr: 'إعدادات المنصة الجامعية', labelEn: 'Platform Settings', shortAr: 'الإعدادات', shortEn: 'Settings', icon: Settings },
    { id: 'admins', labelAr: 'إدارة المسؤولين والصلاحيات', labelEn: 'Platform Administrators', shortAr: 'المسؤولين', shortEn: 'Admins', icon: Shield }
  ];
  const currentAdminNavItem = adminNavItems.find(item => item.id === activeTab) || adminNavItems[0];
  const totalAdminPendingCount = adminNavItems.reduce((acc, item) => acc + (item.pendingCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 pb-12 pt-4 sm:pt-6 font-sans transition-colors overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        
        {/* Admin Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {(!dbService.isRealFirebase() || (fbAuthUser && isAdminEmail(fbAuthUser.email || ''))) ? (
                <>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                    {dbService.isRealFirebase() ? 'Real Firestore Live' : 'Simulated Sandbox Storage'}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 font-mono">
                    {t('وضع التخزين المحلي المؤقت', 'Local Fallback Mode')}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white md:text-3xl flex items-center gap-2 mt-1">
              <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-brand-cyan shrink-0" />
              <span className="truncate">{t('لوحة تحكم منصة MOHAMED ELJOKER الجامعية', 'MOHAMED ELJOKER University LMS Dashboard')}</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {t('مرحباً بك يا ', 'Welcome back, ')} <span className="font-bold text-brand-cyan">{currentAdmin?.name || 'Admin'}</span> ({currentAdmin?.role === 'super' ? t('مدير النظام', 'Administrator') : t('محرر أكاديمي', 'Academic Editor')})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {dbService.isRealFirebase() && (!fbAuthUser || !isAdminEmail(fbAuthUser.email || '')) && (
              <button
                type="button"
                disabled={googleSyncing}
                onClick={async () => {
                  setGoogleSyncing(true);
                  try {
                    const res = await authService.loginWithGoogle('admin');
                    if (res.success) {
                      const purgeRes = await dbService.runOneTimeDemoAndCoursesPurge().catch(() => ({ ran: false }));
                      await loadData();
                      if (purgeRes.ran) {
                        setCourses([]);
                        triggerNotification(t('تم ربط المزامنة السحابية وحذف جميع المقررات السابقة بنجاح!', 'Cloud sync linked and previous courses cleared!'));
                      } else {
                        triggerNotification(t('تم ربط المزامنة السحابية لحساب الإدارة بنجاح!', 'Firebase Admin cloud sync linked!'));
                      }
                    } else if (res.error) {
                      triggerNotification(res.error, true);
                    }
                  } finally {
                    setGoogleSyncing(false);
                  }
                }}
                className="rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 px-3.5 py-2 text-xs font-bold text-brand-cyan hover:bg-brand-cyan hover:text-white dark:hover:text-slate-950 transition-all cursor-pointer disabled:opacity-50"
              >
                {googleSyncing ? t('جاري الربط...', 'Connecting...') : t('تفعيل المزامنة السحابية (Google)', 'Link Cloud Sync (Google)')}
              </button>
            )}
            <button
              onClick={loadData}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2.5 text-slate-600 dark:text-slate-300 hover:text-brand-cyan hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
              title={t('تحديث البيانات', 'Refresh Data')}
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={onLogout}
              className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
            >
              {t('تسجيل الخروج', 'Log Out')}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-4 text-sm text-emerald-700 dark:text-emerald-400 animate-fadeIn">
            <Check className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/25 p-4 text-sm text-red-600 dark:text-red-400 animate-fadeIn">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sidebar + Main Grid */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-4">
          
          {/* Mobile & Tablet Navigation Bar + Expandable Drawer */}
          <div className="lg:hidden space-y-2.5">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
                  <currentAdminNavItem.icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <span className="block text-[10px] font-mono text-slate-500 dark:text-slate-400">{t('القسم الحالي', 'Active Section')}</span>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{t(currentAdminNavItem.labelAr, currentAdminNavItem.labelEn)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminMobileDrawerOpen(prev => !prev)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-brand-cyan cursor-pointer transition-all"
              >
                {adminMobileDrawerOpen ? <X className="h-4 w-4 text-brand-cyan" /> : <Menu className="h-4 w-4 text-brand-cyan" />}
                <span>{t('الأقسام', 'Menu')}</span>
                {totalAdminPendingCount > 0 && (
                  <span className="rounded-full bg-amber-500 text-slate-950 px-1.5 py-0.5 text-[10px] font-black leading-none">
                    {totalAdminPendingCount}
                  </span>
                )}
              </button>
            </div>

            {adminMobileDrawerOpen && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-3 shadow-lg animate-fadeIn">
                {adminNavItems.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={`drawer-${tab.id}`}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsModalOpen(false);
                        setAdminMobileDrawerOpen(false);
                      }}
                      className={`flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-2.5 text-[11px] font-bold transition-all cursor-pointer border text-start ${
                        isActive
                          ? 'bg-brand-cyan text-white dark:text-slate-950 border-brand-cyan shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-brand-cyan/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t(tab.shortAr, tab.shortEn)}</span>
                      </div>
                      {tab.pendingCount !== undefined && tab.pendingCount > 0 ? (
                        <span className="rounded-full bg-amber-500 text-slate-950 px-1.5 py-0.5 text-[9px] font-black shrink-0 tabular-nums">
                          {tab.pendingCount}
                        </span>
                      ) : tab.count !== undefined && tab.count > 0 ? (
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold shrink-0 tabular-nums ${
                          isActive ? 'bg-white/20 dark:bg-slate-950/20 text-white dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {tab.count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Compact Horizontal Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {adminNavItems.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={`strip-${tab.id}`}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsModalOpen(false);
                    }}
                    className={`flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-brand-cyan text-white dark:text-slate-950 border-brand-cyan shadow-sm'
                        : 'bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{t(tab.shortAr, tab.shortEn)}</span>
                    {tab.pendingCount !== undefined && tab.pendingCount > 0 && (
                      <span className="rounded-full bg-amber-500 text-slate-950 px-1.5 py-0.5 text-[10px] font-black tabular-nums">
                        {tab.pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Sidebar Navigation */}
          <div className="hidden lg:flex lg:flex-col gap-2">
            {adminNavItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType);
                    setIsModalOpen(false);
                  }}
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all cursor-pointer w-full ${
                    language === 'ar' ? 'text-right' : 'text-left'
                  } ${
                    isActive 
                      ? 'bg-brand-cyan text-white dark:text-slate-950 shadow-lg shadow-cyan-950/20' 
                      : 'bg-white dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="truncate">{t(tab.labelAr, tab.labelEn)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {tab.pendingCount !== undefined && tab.pendingCount > 0 && (
                      <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-black tabular-nums">
                        {tab.pendingCount} {t('معلق', 'pending')}
                      </span>
                    )}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive 
                          ? 'bg-white/20 dark:bg-slate-950 text-white dark:text-brand-cyan' 
                          : tab.isBadgeRed ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels */}
          <div className="lg:col-span-3 min-w-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/60 shadow-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-brand-cyan" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">{t('جاري جلب ومزامنة قواعد البيانات المباشرة...', 'Syncing live database collections...')}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/60 p-4 sm:p-6 md:p-8 shadow-sm dark:shadow-xl animate-fadeIn">
                
                {/* 1. DASHBOARD OVERVIEW */}
                {activeTab === 'dashboard' && (
                  <div>
                    {/* Pending Requests Alert Banner for Course Subscriptions */}
                    {orders.some(o => o.status === 'pending') && (
                      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 text-amber-700 dark:text-amber-300 shadow-xl shadow-amber-950/20">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                              {t(`يوجد ${orders.filter(o => o.status === 'pending').length} طلب تفعيل مقرر دراسي ينتظر مراجعتك وموافقتك!`, `There are ${orders.filter(o => o.status === 'pending').length} pending course access requests awaiting approval!`)}
                            </h3>
                            <p className="text-xs text-amber-200/80 mt-0.5">
                              {t('قدم الطلاب طلبات تفعيل للمقررات الدراسية، يمكنك تفعيل أو رفض الطلبات الآن.', 'Students submitted course activation requests. Review and approve or reject them.')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('orders')}
                          className="shrink-0 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 px-4 py-2.5 text-xs font-black transition-all cursor-pointer shadow-md"
                        >
                          {t('مراجعة طلبات التفعيل', 'Review Access Requests')}
                        </button>
                      </div>
                    )}

                    {/* Pending Requests Alert Banner for Student Login Registrations */}
                    {salesStats.pendingStudentsCount > 0 && (
                      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/30 p-5 text-cyan-700 dark:text-brand-cyan-light shadow-xl shadow-cyan-950/20">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-brand-cyan/20 p-2.5 text-brand-cyan">
                            <UserCheck className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                              {t(`يوجد ${salesStats.pendingStudentsCount} طلب تسجيل حساب طالب جديد ينتظر موافقتك لتفعيل الدخول!`, `There are ${salesStats.pendingStudentsCount} pending student registrations awaiting login approval!`)}
                            </h3>
                            <p className="text-xs text-cyan-200/80 mt-0.5">
                              {t('سجل طلاب جدد حسابات في المنصة، يرجى قبول أو رفض طلبات التسجيل والدخول.', 'New students registered accounts. Please accept or reject login requests.')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('registrations')}
                          className="shrink-0 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 text-xs font-black transition-all cursor-pointer shadow-md"
                        >
                          {t('مراجعة حسابات الطلاب', 'Review Registrations')}
                        </button>
                      </div>
                    )}

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-brand-cyan" />
                      {t('نظرة عامة على المنصة والإحصائيات الأكاديمية (MOHAMED ELJOKER)', 'Academic Performance (MOHAMED ELJOKER)')}
                    </h2>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      
                      {/* Interactive Card: Total Active Students */}
                      <div 
                        onClick={() => setActiveTab('students')}
                        className="group rounded-xl border-2 border-emerald-500/50 bg-white dark:bg-slate-950/85 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-emerald-400 p-5 transition-all cursor-pointer relative overflow-hidden shadow-xl shadow-emerald-950/20"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:text-slate-900 dark:hover:text-white transition-colors">
                            {t('الطلاب المفعلون والمعتمدون للوصول', 'Active & Approved Students')}
                          </span>
                          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                            <Users className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white font-mono flex items-center justify-between">
                          <span>{students.filter(s => s.status === 'active').length}</span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-sans">
                            {t('عرض الطلاب ➔', 'View Students ➔')}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:hover:text-slate-300 transition-colors flex items-center justify-between">
                          <span>{t(`إجمالي الحسابات المسجلة: ${students.length}`, `Total registered accounts: ${students.length}`)}</span>
                          <span className="rounded bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                            {t('100% مجاني', '100% Free')}
                          </span>
                        </p>
                      </div>

                      {/* Interactive Card: Student Login Approvals Card */}
                      <div 
                        onClick={() => setActiveTab('registrations')}
                        className="group rounded-xl border-2 border-brand-cyan/40 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none hover:bg-slate-100 dark:hover:bg-slate-900/80 hover:border-brand-cyan p-5 transition-all cursor-pointer relative overflow-hidden shadow-lg shadow-cyan-950/10"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-700 dark:text-brand-cyan-light group-hover:text-slate-900 dark:hover:text-white transition-colors">
                            {t('موافقات تسجيل دخول المنصة (حسابات جديدة)', 'Student Account Approvals')}
                          </span>
                          <div className="rounded-lg bg-brand-cyan/20 p-2 text-brand-cyan group-hover:scale-110 transition-transform">
                            <UserCheck className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white font-mono flex items-center justify-between">
                          <span>{salesStats.pendingStudentsCount}</span>
                          <span className="text-xs font-bold text-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity font-sans">
                            {t('قبول/رفض الحسابات ➔', 'Review Accounts ➔')}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:hover:text-slate-300 transition-colors flex items-center justify-between">
                          <span>{t(`طلبات تفعيل دخول الطلاب (إجمالي الحسابات: ${totalAccountsCount})`, `Pending login requests (Total accounts: ${totalAccountsCount})`)}</span>
                          {salesStats.pendingStudentsCount > 0 && (
                            <span className="rounded bg-brand-cyan px-1.5 py-0.5 text-[10px] font-black text-white dark:text-slate-950 tabular-nums">
                              {t('جديد', 'New')}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Metric 3: Active Subjects */}
                      <div 
                        onClick={() => setActiveTab('courses')}
                        className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:border-brand-cyan/50 p-5 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-brand-cyan transition-colors">{t('المواد والمقررات الدراسية', 'Active Academic Subjects')}</span>
                          <div className="rounded-lg bg-violet-500/10 p-2 text-violet-400">
                            <BookOpen className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white font-mono flex items-center justify-between tabular-nums">
                          <span>{courses.length}</span>
                          <span className="text-xs font-bold text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity font-sans">
                            {t('تصفح المقررات ➔', 'Browse ➔')}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('مقررات قسم تكنولوجيا المعلومات للفرق الأربع', 'IT Department subjects across all 4 academic years')}</p>
                      </div>

                      {/* Metric 4: Electronic Exams */}
                      <div 
                        onClick={() => setActiveTab('exams')}
                        className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:border-brand-cyan/50 p-5 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-brand-cyan transition-colors">{t('الامتحانات الإلكترونية والورقية', 'Online & Paper Exams')}</span>
                          <div className="rounded-lg bg-brand-cyan/10 p-2 text-brand-cyan">
                            <HelpCircle className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white font-mono flex items-center justify-between tabular-nums">
                          <span>{exams.length}</span>
                          <span className="text-xs font-bold text-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity font-sans">
                            {t('إدارة الامتحانات ➔', 'Manage ➔')}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('امتحانات أونلاين وتصحيح تلقائي ومراجعة يدوية', 'Online exams with auto & manual grading')}</p>
                      </div>

                      {/* Metric 5: Sheets & Submissions */}
                      <div 
                        onClick={() => setActiveTab('sheets')}
                        className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:border-brand-cyan/50 p-5 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-brand-cyan transition-colors">{t('الشيتات وتسليمات الطلاب', 'Academic Sheets & Submissions')}</span>
                          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                            <ClipboardList className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white font-mono flex items-center justify-between tabular-nums">
                          <span>{sheets.length}</span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity font-sans">
                            {t('إدارة الشيتات ➔', 'Manage Sheets ➔')}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>{t('شيتات المحاضرات والسكاشن وتقييم الحلول', 'Lecture & Section sheets & grading')}</span>
                        </p>
                      </div>

                    </div>

                    {/* Subject Management Section below Statistics */}
                    <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/20 p-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-brand-cyan" />
                            {t('إدارة المواد والمقررات الدراسية الجامعية', 'Academic Subjects Management')}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{t('إضافة وتعديل وحذف ومعاينة المقررات الدراسية لطلاب قسم تكنولوجيا المعلومات IT', 'Add, modify, delete, and preview university IT subjects')}</p>
                        </div>
                        <button
                          onClick={openAddModal}
                          className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20"
                        >
                          <Plus className="h-4 w-4" />
                          {t('إضافة مقرر دراسي جديد', 'Add Subject')}
                        </button>
                      </div>

                      {/* Subject list table */}
                      {courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/10">
                          <BookOpen className="h-10 w-10 text-slate-600 mb-2" />
                          <p className="text-xs text-slate-600 dark:text-slate-400">{t('لا توجد مقررات دراسية مضافة حالياً. ابدأ بإضافة المقرر الأول!', 'No subjects added yet. Start by adding your first subject!')}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs text-center sm:text-right">
                              <tr>
                                <th className="p-3">{t('المقرر والمادة', 'Subject & Title')}</th>
                                <th className="p-3">{t('الفرقة / القسم', 'Year / Category')}</th>
                                <th className="p-3">{t('إتاحة الوصول', 'Access')}</th>
                                <th className="p-3">{t('الحالة', 'Status')}</th>
                                <th className="p-3 text-center">{t('الخيارات', 'Options')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {courses.map(c => {
                                const cat = categories.find(cat => cat.id === c.categoryId);
                                return (
                                  <tr key={c.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/20 text-xs">
                                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                                      <div>{getCourseDisplayTitle(c, language)}</div>
                                      <div className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                        <span className="text-cyan-700 dark:text-brand-cyan-light font-medium">{c.teacherName}</span>
                                        {(c.subjectAr || c.subjectEn) && (
                                          <>
                                            <span className="text-slate-600">|</span>
                                            <span className="text-slate-600 dark:text-slate-400">{t(c.subjectAr || '', c.subjectEn || '')}</span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 text-slate-700 dark:text-slate-300">
                                      {cat ? t(cat.nameAr, cat.nameEn) : getGradeDisplay(c.grade || c.categoryId, language)}
                                    </td>
                                    <td className="p-3">
                                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                        {t('مجاني بالكامل 100%', '100% Free Access')}
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <button
                                        onClick={() => handleTogglePublishCourse(c)}
                                        className={`rounded px-2.5 py-1 text-[10px] font-bold ${
                                          c.published 
                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                                        }`}
                                      >
                                        {c.published ? t('منشور', 'Published') : t('مسودة / مخفي', 'Draft / Hidden')}
                                      </button>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => setPreviewCourse(c)}
                                          className="p-1.5 text-brand-cyan hover:text-brand-cyan-light transition-all cursor-pointer"
                                          title={t('معاينة', 'Preview')}
                                        >
                                          <Eye className="h-4.5 w-4.5" />
                                        </button>
                                        <button
                                          onClick={() => handleEditCourse(c)}
                                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                                          title={t('تعديل', 'Edit')}
                                        >
                                          <Edit className="h-4.5 w-4.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteCourse(c.id)}
                                          className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                          title={t('حذف', 'Delete')}
                                        >
                                          <Trash2 className="h-4.5 w-4.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Quick Access List */}
                    <div 
                      onClick={() => { setActiveTab('messages'); setMessagesSubTab('liveChat'); }}
                      className="mt-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/20 p-5 cursor-pointer hover:border-brand-cyan/50 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all group shadow-md"
                      title={t('اضغط للانتقال إلى مركز محادثات الإدارة (Admin Chat Center)', 'Click to open Admin Chat Center')}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-cyan-700 dark:text-brand-cyan-light flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-brand-cyan group-hover:scale-110 transition-transform" />
                          {t('موجز الرسائل الواردة (اضغط لفتح Admin Chat Center)', 'Incoming Messages Summary (Click for Admin Chat Center)')}
                        </h3>
                        <span className="text-[11px] bg-brand-cyan/10 text-brand-cyan px-2.5 py-1 rounded-full font-bold border border-brand-cyan/20 group-hover:bg-brand-cyan group-hover:text-brand-dark transition-colors">
                          {t('الانتقال لـ Admin Chat Center 💬', 'Open Admin Chat Center 💬')}
                        </span>
                      </div>
                      {messages.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('لا توجد رسائل واردة حالياً.', 'No incoming messages.')}</p>
                      ) : (
                        <div className="divide-y divide-slate-800/60">
                          {messages.slice(0, 8).map(msg => (
                            <div 
                              key={msg.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('messages');
                                setMessagesSubTab('inbox');
                              }}
                              className={`py-3 flex items-center justify-between text-xs cursor-pointer rounded-lg px-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/40 ${
                                !msg.read ? 'bg-red-500/5 border border-red-500/20' : 'opacity-80'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-cyan-700 dark:text-brand-cyan-light">{msg.name}</span>: <span className="text-slate-700 dark:text-slate-300">{msg.subject}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  !msg.read ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {!msg.read ? t('🔴 غير مقروءة', 'Unread') : t('✅ مقروءة', 'Read')}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab('messages');
                                  setMessagesSubTab('inbox');
                                }}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-brand-cyan px-2.5 py-1 rounded cursor-pointer font-bold shrink-0"
                              >
                                {t('تفاصيل ومتابعة', 'View Details')}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. COURSES MANAGEMENT PANEL */}
                {activeTab === 'courses' && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-brand-cyan" />
                        {t('محاضرات وسكاشن قسم تكنولوجيا المعلومات (IT) - منصة محمد عبد التواب', 'IT Department Lectures & Practical Sections - Eng/Mohamed abdal tawab Platform')}
                      </h2>
                      <div className="flex items-center gap-2">
                        {courses.length > 0 && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => {
                              requestConfirmation(
                                t('حذف جميع المقررات', 'Delete All Subjects'),
                                t('هل أنت متأكد من رغبتك في حذف جميع المقررات بالكامل من المنصة؟ لن تتمكن من التراجع.', 'Are you sure you want to delete ALL subjects from the platform? This cannot be undone.'),
                                async () => {
                                  setActionLoading(true);
                                  try {
                                    await dbService.deleteAllCourses();
                                    setCourses([]);
                                    triggerNotification(t('تم حذف جميع المقررات بنجاح.', 'All subjects have been deleted successfully.'));
                                  } catch (err: any) {
                                    triggerNotification(err?.message || t('حدث خطأ أثناء حذف المقررات.', 'Error deleting subjects.'), true);
                                    try {
                                      const fresh = await dbService.getCourses();
                                      setCourses(fresh);
                                    } catch {}
                                  } finally {
                                    setActionLoading(false);
                                  }
                                }
                              );
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>{t('حذف جميع المقررات', 'Delete All Subjects')}</span>
                          </button>
                        )}
                        <button
                          onClick={openAddModal}
                          className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{t('إضافة مقرر دراسي جديد', 'Add Subject')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Search and Category Filters */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{t('البحث عن مقرر دراسي', 'Search Subjects')}</label>
                        <input
                          type="text"
                          placeholder={t('ابحث بالعنوان أو الوصف...', 'Search by title or description...')}
                          value={courseSearchQuery}
                          onChange={e => setCourseSearchQuery(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{t('تصفية حسب القسم', 'Filter by Category')}</label>
                        <select
                          value={courseCategoryFilter}
                          onChange={e => setCourseCategoryFilter(e.target.value)}
                          className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                        >
                          <option value="all">{t('كل الأقسام / الصفوف', 'All Categories')}</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{t(cat.nameAr, cat.nameEn)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {courses.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30 p-10 text-center">
                        <BookOpen className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('لا توجد مقررات دراسية حالياً', 'No subjects or courses added yet')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('ابدأ بإضافة المقررات الدراسية الخاصة بك من زر الإضافة أعلاه.', 'Start by adding your academic courses using the button above.')}</p>
                        <button
                          type="button"
                          onClick={openAddModal}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{t('إضافة مقرر دراسي جديد', 'Add Subject')}</span>
                        </button>
                      </div>
                    ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs">
                          <tr>
                            <th className="p-3">{t('المقرر', 'Course')}</th>
                            <th className="p-3">{t('الفرقة / القسم', 'Year / Dept')}</th>
                            <th className="p-3">{t('نظام الوصول', 'Access Model')}</th>
                            <th className="p-3">{t('المحاضرات', 'Lectures')}</th>
                            <th className="p-3">{t('الحالة', 'Status')}</th>
                            <th className="p-3 text-center">{t('الخيارات', 'Options')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {courses.filter(c => {
                            const matchesSearch = 
                              c.titleAr.toLowerCase().includes(courseSearchQuery.toLowerCase()) || 
                              c.titleEn.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
                              c.descriptionAr.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
                              c.descriptionEn.toLowerCase().includes(courseSearchQuery.toLowerCase());
                            const matchesCategory = courseCategoryFilter === 'all' || c.categoryId === courseCategoryFilter;
                            return matchesSearch && matchesCategory;
                          }).map(c => {
                            const cat = categories.find(cat => cat.id === c.categoryId);
                            return (
                              <tr key={c.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/20 text-xs">
                                <td className="p-3 font-bold text-slate-900 dark:text-white">
                                  <div>{t(c.titleAr, c.titleEn)}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <span>{c.teacherName}</span>
                                    {(c.subjectAr || c.subjectEn) && (
                                      <>
                                        <span className="text-slate-600">|</span>
                                        <span className="text-slate-600 dark:text-slate-400">{t(c.subjectAr || '', c.subjectEn || '')}</span>
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-slate-700 dark:text-slate-300">
                                  {cat ? t(cat.nameAr, cat.nameEn) : getGradeDisplay(c.grade || c.categoryId, language)}
                                </td>
                                <td className="p-3">
                                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                    {t('مجاني بالكامل 100%', '100% Free')}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-700 dark:text-slate-300 font-mono tabular-nums">{c.lessonsCount}</td>
                                <td className="p-3">
                                  <button
                                    onClick={() => handleTogglePublishCourse(c)}
                                    className={`rounded px-2.5 py-1 text-[10px] font-bold ${
                                      c.published 
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                                    }`}
                                  >
                                    {c.published ? t('منشور', 'Published') : t('مسودة / مخفي', 'Draft / Hidden')}
                                  </button>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => setPreviewCourse(c)}
                                      className="p-1.5 text-brand-cyan hover:text-brand-cyan-light transition-all cursor-pointer"
                                      title={t('معاينة', 'Preview')}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleEditCourse(c)}
                                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                                      title={t('تعديل', 'Edit')}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDuplicateCourse(c)}
                                      className="p-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-300 transition-all cursor-pointer"
                                      title={t('تكرار المقرر', 'Duplicate')}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCourse(c.id)}
                                      className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                      title={t('حذف', 'Delete')}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )}
                  </div>
                )}

                {/* 3. CATEGORIES MANAGEMENT PANEL */}
                {activeTab === 'categories' && (
                  <div>
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="h-5 w-5 text-brand-cyan" />
                        {t('إدارة الصفوف والمراحل الدراسية', 'Manage Academic Categories')}
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={async () => {
                            setActionLoading(true);
                            try {
                              const cats = await dbService.getCategories();
                              setCategories(cats);
                              triggerNotification(t('تم تحديث قائمة الصفوف الدراسية.', 'Categories updated.'));
                            } catch (e) {
                              triggerNotification('Failed to reload categories', true);
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {t('مزامنة الصفوف', 'Refresh Categories')}
                        </button>
                        <button
                          onClick={openAddModal}
                          className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          {t('إضافة مرحلة جديدة', 'Add Category')}
                        </button>
                      </div>
                    </div>

                    {categories.length === 0 ? (
                      <div className="text-center p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none text-slate-600 dark:text-slate-400 space-y-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('لا توجد مراحل دراسية مضافة حالياً.', 'No categories currently added.')}</p>
                        <p className="text-xs">{t('يمكنك إضافة مرحلة جديدة أو استعادة المراحل الدراسية الأكاديمية الافتراضية.', 'You can add a new category or restore default academic grades.')}</p>
                        <button
                          disabled={actionLoading}
                          onClick={async () => {
                            setActionLoading(true);
                            try {
                              const defaults = [
                                { nameAr: 'الفرقة الأولى - قسم تكنولوجيا المعلومات IT', nameEn: '1st Year - Information Technology (IT)', imageUrl: HERO_IT_UNIVERSITY_IMG, color: 'cyan' },
                                { nameAr: 'الفرقة الثانية - قسم تكنولوجيا المعلومات IT', nameEn: '2nd Year - Information Technology (IT)', imageUrl: COURSE_PROGRAMMING_CYBER_IMG, color: 'blue' },
                                { nameAr: 'الفرقة الثالثة - قسم تكنولوجيا المعلومات IT', nameEn: '3rd Year - Information Technology (IT)', imageUrl: HERO_IT_UNIVERSITY_IMG, color: 'emerald' },
                                { nameAr: 'الفرقة الرابعة - قسم تكنولوجيا المعلومات IT', nameEn: '4th Year - Information Technology (IT)', imageUrl: COURSE_PROGRAMMING_CYBER_IMG, color: 'purple' }
                              ];
                              for (const d of defaults) {
                                await dbService.addCategory(d);
                              }
                              const updated = await dbService.getCategories();
                              setCategories(updated);
                              triggerNotification(t('تم استعادة الصفوف والمراحل الدراسية بنجاح!', 'Default categories restored successfully!'));
                            } catch (err) {
                              triggerNotification('Failed to restore default categories', true);
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 cursor-pointer transition-all disabled:opacity-50"
                        >
                          {t('استعادة الصفوف والمراحل الأساسية', 'Restore Default Academic Grades')}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {categories.map(cat => (
                          <div key={cat.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-lg">
                                🧪
                              </span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{t(cat.nameAr, cat.nameEn)}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{cat.id}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditCategory(cat)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                              >
                                <Edit className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-300 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. STUDENTS MANAGEMENT */}
                {activeTab === 'students' && (() => {
                  const filteredStudents = students.filter(s => {
                    const q = studentSearchQuery.trim().toLowerCase();
                    const matchesSearch = !q || 
                      s.name.toLowerCase().includes(q) ||
                      s.email.toLowerCase().includes(q) ||
                      (s.phone && s.phone.includes(q));
                    const matchesStatus = studentStatusFilter === 'all' || s.status === studentStatusFilter || 
                      (studentStatusFilter === 'pending' && ['pending', 'waiting', 'قيد المراجعة', 'review', 'معلق'].includes((s.status || '').trim().toLowerCase()));
                    return matchesSearch && matchesStatus;
                  });

                  return (
                    <div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-brand-cyan" />
                            {t('إدارة الطلاب الحالية المسجلة بالمنصة', 'Registered Students Management')}
                          </h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {t('يمكنك الاستعلام، تغيير حالة الطالب (نشط / محظور)، تعديل بياناته، أو حذفه نهائياً من المنصة.', 'Manage student accounts, toggle active status, or delete accounts permanently.')}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={handleForceLogoutAll}
                            title={t('إخراج جميع الطلاب المسجلين حالياً من المنصة على جميع أجهزتهم دون حذف حساباتهم', 'Force log out all users across all devices without deleting accounts')}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>{t('إخراج جميع الحسابات', 'Log Out All Users')}</span>
                          </button>
                          <button
                            onClick={handleClearAllStudents}
                            title={t('مسح وتصفير جميع حسابات الطلاب للبدء بتسجيلات جديدة', 'Clear all student accounts')}
                            className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>{t('تصفير حسابات الطلاب', 'Reset All Accounts')}</span>
                          </button>
                          <button
                            onClick={openAddModal}
                            className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            {t('تسجيل طالب جديد يدوي', 'Register New Student')}
                          </button>
                        </div>
                      </div>

                      {/* Filters and Search Bar */}
                      <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
                        {/* Search Input */}
                        <div className="relative flex-1">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={studentSearchQuery}
                            onChange={e => setStudentSearchQuery(e.target.value)}
                            placeholder={t('البحث باسم الطالب، البريد الإلكتروني، أو رقم الهاتف...', 'Search by student name, email, or phone...')}
                            className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-10 pl-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan transition-colors"
                          />
                        </div>

                        {/* Status Filter Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
                          {[
                            { id: 'all', label: t('الكل', 'All'), count: students.length },
                            { id: 'active', label: t('نشطين ✅', 'Active'), count: students.filter(s => s.status === 'active').length },
                            { id: 'pending', label: t('قيد المراجعة ⏳', 'Pending'), count: salesStats.pendingStudentsCount },
                            { id: 'suspended', label: t('محظورين / موقوفين 🛑', 'Suspended'), count: students.filter(s => s.status === 'suspended').length },
                          ].map(pill => (
                            <button
                              key={pill.id}
                              onClick={() => setStudentStatusFilter(pill.id)}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                studentStatusFilter === pill.id
                                  ? 'bg-brand-cyan text-white dark:text-slate-950'
                                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <span>{pill.label}</span>
                              <span className="rounded-full bg-slate-200 dark:bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono">
                                {pill.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-3.5">{t('اسم الطالب', 'Student Name')}</th>
                              <th className="p-3.5">{t('بيانات الاتصال', 'Contact Details')}</th>
                              <th className="p-3.5">{t('الصف / الشعبة', 'Grade / Dept')}</th>
                              <th className="p-3.5">{t('تاريخ التسجيل', 'Registration Date')}</th>
                              <th className="p-3.5">{t('المقررات المفعّلة', 'Activated Subjects')}</th>
                              <th className="p-3.5">{t('الحالة', 'Status')}</th>
                              <th className="p-3.5 text-center">{t('إجراءات التحكم', 'Actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {filteredStudents.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                                  {t('لا يوجد طلاب ينطبق عليهم هذا البحث أو الفلتر.', 'No students match search or filter.')}
                                </td>
                              </tr>
                            ) : (
                              filteredStudents.map(stud => (
                                <tr key={stud.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 text-xs transition-colors">
                                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-brand-cyan text-xs">
                                        {stud.name.charAt(0)}
                                      </div>
                                      <span>{stud.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-3.5 text-slate-700 dark:text-slate-300">
                                    <div className="font-mono text-slate-900 dark:text-white">{stud.email}</div>
                                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">{stud.phone || '-'}</div>
                                  </td>
                                  <td className="p-3.5 text-slate-700 dark:text-slate-300">
                                    <div className="flex flex-col gap-1 text-[11px]">
                                      <span className="font-semibold text-cyan-700 dark:text-brand-cyan-light">{getGradeDisplay(stud.grade, language)}</span>
                                      <span className="text-[10px] text-slate-600 dark:text-slate-400">{getDeptDisplay(stud.department, language)}</span>
                                    </div>
                                  </td>
                                  <td className="p-3.5 text-slate-600 dark:text-slate-400 font-mono">{stud.enrollmentDate || (stud.createdAt ? new Date(stud.createdAt).toLocaleDateString() : '-')}</td>
                                  <td className="p-3.5 text-slate-700 dark:text-slate-300">
                                    <div className="flex flex-wrap gap-1">
                                      {stud.purchasedCourseIds && stud.purchasedCourseIds.length > 0 ? (
                                        stud.purchasedCourseIds.map(cid => {
                                          const c = courses.find(item => item.id === cid);
                                          return (
                                            <span key={cid} className="rounded bg-brand-cyan/10 text-cyan-700 dark:text-brand-cyan-light border border-brand-cyan/20 px-2 py-0.5 text-[10px] font-semibold">
                                              {c ? t(c.titleAr, c.titleEn) : cid}
                                            </span>
                                          );
                                        })
                                      ) : (
                                        <span className="text-slate-500 dark:text-slate-400 italic text-[11px]">{t('لا توجد مقررات مفعّلة', 'No subjects')}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black border ${
                                      stud.status === 'active' 
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
                                        : stud.status === 'pending'
                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                    }`}>
                                      {stud.status === 'active' ? t('نشط ✅', 'Active') : stud.status === 'pending' ? t('قيد المراجعة ⏳', 'Pending') : t('موقوف/محظور 🛑', 'Suspended')}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <div className="flex items-center justify-center gap-2">
                                      {/* Toggle Status Button */}
                                      <button
                                        onClick={() => handleToggleStudentStatus(stud)}
                                        title={stud.status === 'active' ? t('إيقاف / حظر حساب الطالب', 'Suspend Student Account') : t('تفعيل وترخيص حساب الطالب', 'Activate Student Account')}
                                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition-all cursor-pointer ${
                                          stud.status === 'active'
                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                        }`}
                                      >
                                        {stud.status === 'active' ? (
                                          <>
                                            <UserX className="h-3.5 w-3.5" />
                                            <span>{t('حظر', 'Suspend')}</span>
                                          </>
                                        ) : (
                                          <>
                                            <UserCheck className="h-3.5 w-3.5" />
                                            <span>{t('تفعيل', 'Activate')}</span>
                                          </>
                                        )}
                                      </button>

                                      {/* Edit Student Button */}
                                      <button
                                        onClick={() => handleEditStudent(stud)}
                                        title={t('تعديل البيانات والمقررات', 'Edit Details & Subjects')}
                                        className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>

                                      {/* Delete Student Button */}
                                      <button
                                        onClick={() => handleDeleteStudent(stud.id, stud.email)}
                                        title={t('حذف الطالب نهائياً من المنصة', 'Delete Student Permanently')}
                                        className="rounded-lg bg-red-500/10 border border-red-500/20 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* --- TEACHERS MANAGEMENT PANEL --- */}
                {activeTab === 'teachers' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-brand-cyan" />
                        {t('إدارة الهيئة الأكاديمية والمشرفين', 'Academic Faculty & Supervisors')}
                      </h2>
                      <button
                        onClick={openAddModal}
                        className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        {t('إضافة مشرف أكاديمي', 'Add Supervisor')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {teachers.map(teach => (
                        <div key={teach.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-5 text-xs text-slate-900 dark:text-white">
                          <div className="flex items-start gap-4">
                            <img
                              referrerPolicy="no-referrer"
                              src={teach.imageUrl || ENG_MOHAMED_AVATAR_IMG}
                              alt={t(teach.nameAr, teach.nameEn)}
                              className="h-16 w-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                            />
                            <div className="flex-1">
                              <h3 className="font-bold text-sm text-cyan-700 dark:text-brand-cyan-light">{t(teach.nameAr, teach.nameEn)}</h3>
                              <p className="text-slate-600 dark:text-slate-400 font-mono mt-1">{teach.email} | {teach.phone || t('لا يوجد هاتف', 'No phone')}</p>
                              <div className="flex items-center gap-1 mt-1 text-amber-600 dark:text-amber-400">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                <span className="font-bold font-mono">{teach.rating || 5.0}</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed bg-slate-100/70 dark:bg-slate-950/20 p-2 rounded">{t(teach.bioAr || '', teach.bioEn || '')}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800/60 mt-4 pt-3">
                            <button
                              onClick={() => handleEditTeacher(teach)}
                              className="rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 font-bold transition-all cursor-pointer"
                            >
                              {t('تعديل البيانات', 'Edit Details')}
                            </button>
                            <button
                              onClick={() => handleDeleteTeacher(teach.id)}
                              className="rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-1.5 font-bold transition-all cursor-pointer"
                            >
                              {t('حذف', 'Delete')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- ONLINE EXAMS & QUIZZES BANK PANEL --- */}
                {activeTab === 'quizzes' && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <HelpCircle className="h-5 w-5 text-brand-cyan" />
                          {t('إدارة بنك الامتحانات والاختبارات الإلكترونية', 'Electronic Exams & Quizzes Bank')}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {t('إنشاء امتحانات أونلاين، تحديد زمن الإجابة والتصحيح التلقائي المباشر للدرجات', 'Create online exams, set time limits, and enable auto-grading.')}
                        </p>
                      </div>
                      <button
                        onClick={openAddModal}
                        className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20"
                      >
                        <Plus className="h-4 w-4" />
                        {t('إنشاء امتحان جديد', 'Create New Exam')}
                      </button>
                    </div>

                    {quizzes.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-12 text-center text-slate-600 dark:text-slate-400">
                        <HelpCircle className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{t('لا توجد امتحانات إلكترونية مضافة بعد', 'No electronic exams added yet.')}</p>
                        <p className="text-xs mt-1">{t('اضغط على "إنشاء امتحان جديد" لإضافة أسئلة متعددة الاختيارات وزمن امتحان.', 'Click "Create New Exam" to build an online test with MCQs and time limits.')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {quizzes.map(quiz => {
                          const course = courses.find(c => c.id === quiz.courseId);
                          const isPublished = quiz.published !== false;
                          const isAutoGraded = quiz.autoCorrection !== false;
                          const getGradeText = (g?: string) => {
                            if (g === 'year1' || g === '1prep' || g === 'prep1') return t('الفرقة الأولى - IT', '1st Year - IT');
                            if (g === 'year2' || g === '2prep' || g === 'prep2') return t('الفرقة الثانية - IT', '2nd Year - IT');
                            if (g === 'year3' || g === '3prep' || g === 'prep3') return t('الفرقة الثالثة - IT', '3rd Year - IT');
                            if (g === 'year4' || g === '1sec' || g === 'sec1') return t('الفرقة الرابعة - IT', '4th Year - IT');
                            return t('جميع فرق قسم IT', 'All IT Years');
                          };

                          return (
                            <div key={quiz.id} className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none p-5 text-xs text-slate-900 dark:text-white shadow-xl flex flex-col justify-between">
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="rounded-full bg-brand-cyan/10 text-cyan-700 dark:text-brand-cyan-light border border-brand-cyan/20 px-2.5 py-0.5 text-[10px] font-bold">
                                      {course ? t(course.titleAr, course.titleEn) : t('عام / غير محدد', 'General Course')}
                                    </span>
                                    <span className="rounded-full bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 text-[10px] font-mono font-bold">
                                      🎓 {getGradeText(quiz.grade)}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleTogglePublishQuiz(quiz)}
                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all border cursor-pointer ${
                                      isPublished ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                    }`}
                                  >
                                    {isPublished ? t('منشور 👁️', 'Published 👁️') : t('مخفي 🔒', 'Hidden 🔒')}
                                  </button>
                                </div>

                                <h3 className="font-bold text-base text-slate-900 dark:text-white">{t(quiz.titleAr, quiz.titleEn)}</h3>
                                
                                <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400 mt-2 font-mono text-[11px]">
                                  <span className="flex items-center gap-1 text-brand-cyan">
                                    <HelpCircle className="h-3.5 w-3.5" />
                                    {quiz.questions?.length || 0} {t('سؤال MCQ', 'MCQs')}
                                  </span>
                                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                    {quiz.timeLimit || 30} {t('دقيقة', 'mins')}
                                  </span>
                                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {isAutoGraded ? t('تصحيح تلقائي', 'Auto-Graded') : t('تصحيح يدوي', 'Manual')}
                                  </span>
                                </div>

                                <div className="mt-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-[11px]">{t('معاينة أول الأسئلة:', 'Questions preview:')}</p>
                                  <div className="space-y-1">
                                    {quiz.questions?.slice(0, 2).map((q, idx) => (
                                      <div key={idx} className="truncate text-slate-600 dark:text-slate-400 text-[11px]">
                                        <span className="font-bold text-brand-cyan font-mono mr-1">{idx + 1}.</span>
                                        {t(q.questionAr, q.questionEn)}
                                      </div>
                                    ))}
                                    {(quiz.questions?.length || 0) > 2 && (
                                      <div className="text-slate-500 dark:text-slate-400 italic mt-1 font-mono text-[10px]">
                                        + {(quiz.questions?.length || 0) - 2} {t('أسئلة أخرى...', 'more questions...')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800/80 mt-5 pt-3">
                                {(() => {
                                  const submissionCount = quizSubmissions.filter(sub => sub.quizId === quiz.id).length ||
                                    students.filter(st => st.quizGrades?.[quiz.id] !== undefined || (st.quizScores as any)?.[quiz.id] !== undefined).length;

                                  return (
                                    <button
                                      onClick={() => setSelectedExamResultsQuiz(quiz)}
                                      className="flex items-center gap-1.5 rounded-xl bg-violet-600/20 text-violet-700 dark:text-violet-300 border border-violet-500/30 hover:bg-violet-600 hover:text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                                    >
                                      <Award className="h-3.5 w-3.5" />
                                      <span>{t('نتائج ودرجات الطلاب', 'Student Grades')} {submissionCount > 0 ? `(${submissionCount})` : ''}</span>
                                    </button>
                                  );
                                })()}

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditQuiz(quiz)}
                                    className="rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 font-bold transition-all cursor-pointer"
                                  >
                                    {t('تعديل الأسئلة', 'Edit')}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuiz(quiz.id)}
                                    className="rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-1.5 font-bold transition-all cursor-pointer"
                                  >
                                    {t('حذف', 'Delete')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* STUDENT EXAM RESULTS MODAL */}
                    {selectedExamResultsQuiz && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-slate-950/85 backdrop-blur-md animate-fadeIn">
                        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 text-slate-900 dark:text-white shadow-2xl max-h-[85vh] flex flex-col">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                            <div>
                              <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider">{t('تقرير نتائج ودرجات الامتحان', 'Exam Results Report')}</span>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{t(selectedExamResultsQuiz.titleAr, selectedExamResultsQuiz.titleEn)}</h3>
                            </div>
                            <button
                              onClick={() => setSelectedExamResultsQuiz(null)}
                              className="rounded-xl bg-slate-50 dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
                            <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px] mb-3">
                              {t('إجمالي عدد الأسئلة:', 'Total questions:')} <span className="text-slate-900 dark:text-white font-bold">{selectedExamResultsQuiz.questions?.length || 0}</span>
                            </p>

                            {/* Render students who attempted this quiz */}
                            {(() => {
                              const quizId = selectedExamResultsQuiz.id;
                              const totalQ = selectedExamResultsQuiz.questions?.length || 1;

                              interface UnifiedResult {
                                studentId: string;
                                studentName: string;
                                studentEmail: string;
                                studentPhone: string;
                                percentage: number;
                                correctCount: number;
                                totalQuestions: number;
                                submittedAt?: string;
                              }

                              const resultsMap = new Map<string, UnifiedResult>();

                              // 1. Check quizSubmissions collection
                              quizSubmissions.filter(sub => sub.quizId === quizId).forEach(sub => {
                                const key = sub.studentId || sub.studentEmail || sub.id || Math.random().toString();
                                const pct = sub.score ?? 0;
                                const cCount = sub.correctCount !== undefined ? sub.correctCount : Math.round((pct / 100) * totalQ);
                                const tQs = sub.totalQuestions || totalQ;

                                resultsMap.set(key, {
                                  studentId: sub.studentId || key,
                                  studentName: sub.studentName || 'طالب',
                                  studentEmail: sub.studentEmail || '',
                                  studentPhone: '',
                                  percentage: pct,
                                  correctCount: cCount,
                                  totalQuestions: tQs,
                                  submittedAt: sub.submittedAt
                                });
                              });

                              // 2. Check student user profiles (quizGrades or quizScores)
                              students.forEach(st => {
                                const gradeVal = st.quizGrades?.[quizId];
                                const scoreObj = (st.quizScores as any)?.[quizId];
                                const hasResult = gradeVal !== undefined || scoreObj !== undefined;

                                if (hasResult) {
                                  const key = st.id || st.email || Math.random().toString();
                                  let pct = 0;
                                  let cCount = 0;
                                  let sAt = '';

                                  if (gradeVal !== undefined) {
                                    pct = Number(gradeVal) || 0;
                                    cCount = Math.round((pct / 100) * totalQ);
                                  } else if (scoreObj !== undefined) {
                                    if (typeof scoreObj === 'number') {
                                      pct = scoreObj;
                                      cCount = Math.round((pct / 100) * totalQ);
                                    } else if (typeof scoreObj === 'object' && scoreObj !== null) {
                                      if (typeof scoreObj.score === 'number') {
                                        if (scoreObj.score <= totalQ) {
                                          cCount = scoreObj.score;
                                          pct = Math.round((cCount / totalQ) * 100);
                                        } else {
                                          pct = scoreObj.score;
                                          cCount = Math.round((pct / 100) * totalQ);
                                        }
                                      }
                                      sAt = scoreObj.date || '';
                                    }
                                  }

                                  if (resultsMap.has(key)) {
                                    const existing = resultsMap.get(key)!;
                                    if (!existing.studentPhone && st.phone) existing.studentPhone = st.phone;
                                    if (!existing.studentEmail && st.email) existing.studentEmail = st.email;
                                    if (!existing.studentName && st.name) existing.studentName = st.name;
                                  } else {
                                    resultsMap.set(key, {
                                      studentId: st.id,
                                      studentName: st.name || 'طالب',
                                      studentEmail: st.email || '',
                                      studentPhone: st.phone || '',
                                      percentage: pct,
                                      correctCount: cCount,
                                      totalQuestions: totalQ,
                                      submittedAt: sAt
                                    });
                                  }
                                }
                              });

                              const examSubmissions = Array.from(resultsMap.values());

                              if (examSubmissions.length === 0) {
                                return (
                                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                    <p>{t('لم يقم أي طالب بإجراء هذا الامتحان بعد.', 'No students have taken this exam yet.')}</p>
                                  </div>
                                );
                              }
                              return (
                                <div className="space-y-2">
                                  {examSubmissions.map((res, idx) => {
                                    const isPassed = res.percentage >= 50;

                                    return (
                                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                          <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-cyan font-bold flex items-center justify-center text-sm">
                                            {res.studentName ? res.studentName.charAt(0) : 'S'}
                                          </div>
                                          <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{res.studentName}</p>
                                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                                              {res.studentEmail} {res.studentPhone ? `• ${res.studentPhone}` : ''}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="text-left font-mono">
                                          <div className="flex items-center gap-2">
                                            <span className="font-black text-base text-slate-900 dark:text-white">{res.correctCount} / {res.totalQuestions}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              isPassed ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                                            }`}>
                                              {res.percentage}% ({isPassed ? t('ناجح', 'Passed') : t('راسب', 'Failed')})
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                            {res.submittedAt ? new Date(res.submittedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') : ''}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>

                          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                            <button
                              onClick={() => setSelectedExamResultsQuiz(null)}
                              className="rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-5 py-2 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer text-xs"
                            >
                              {t('إغلاق', 'Close')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- ASSIGNMENTS & ASSESSMENTS PANEL --- */}
                {activeTab === 'assignments' && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <ClipboardList className="h-5 w-5 text-brand-cyan" />
                          {t('إدارة التكليفات الأكاديمية والتقييمات', 'Academic Assignments & Assessments')}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {t('إنشاء التكليفات والشيتات الأكاديمية، استقبال تسليمات الطلاب ورصد الدرجات والتصحيح', 'Create academic assignment tasks, receive student submissions, and grade submissions.')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={openAddModal}
                          className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20"
                        >
                          <Plus className="h-4 w-4" />
                          {t('إضافة تكليف أكاديمي جديد', 'Create New Assignment')}
                        </button>
                      </div>
                    </div>

                    {/* Subtabs Switcher */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
                      <button
                        onClick={() => setAssignmentsSubTab('tasks')}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                          assignmentsSubTab === 'tasks' ? 'bg-brand-cyan text-white dark:text-slate-950 shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {t('التكليفات الأكاديمية المتاحة', 'Assignment Tasks')} ({assignmentTasks.length})
                      </button>

                      <button
                        onClick={() => setAssignmentsSubTab('submissions')}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          assignmentsSubTab === 'submissions' ? 'bg-brand-cyan text-white dark:text-slate-950 shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>{t('تسليمات وتصحيح الطلاب', 'Student Submissions')}</span>
                        {assignmentSubmissions.filter(s => s.status === 'submitted').length > 0 && (
                          <span className="rounded-full bg-amber-500 text-slate-950 font-black px-2 py-0.5 text-[10px]">
                            {assignmentSubmissions.filter(s => s.status === 'submitted').length} {t('جديد', 'new')}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* SUBTAB 1: ASSIGNMENT TASKS */}
                    {assignmentsSubTab === 'tasks' && (
                      <div>
                        {assignmentTasks.length === 0 ? (
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-12 text-center text-slate-600 dark:text-slate-400">
                            <ClipboardList className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{t('لا توجد تكليفات أكاديمية مضافة بعد', 'No assignment tasks created yet.')}</p>
                            <p className="text-xs mt-1">{t('اضغط على "إضافة تكليف أكاديمي جديد" لإرفاق شيت التكليف وتحديد موعد التسليم.', 'Click "Create New Assignment" to post academic assignment tasks.')}</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {assignmentTasks.map(task => {
                              const course = courses.find(c => c.id === task.courseId);
                              const submissionsCount = assignmentSubmissions.filter(s => s.assignmentId === task.id).length;
                              const pendingSubmissions = assignmentSubmissions.filter(s => s.assignmentId === task.id && s.status === 'submitted').length;
                              const isPublished = task.published !== false;

                              return (
                                <div key={task.id} className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none p-5 text-xs text-slate-900 dark:text-white shadow-xl flex flex-col justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                      <span className="rounded-full bg-brand-cyan/10 text-cyan-700 dark:text-brand-cyan-light border border-brand-cyan/20 px-2.5 py-0.5 text-[10px] font-bold">
                                        {course ? t(course.titleAr, course.titleEn) : t('عام / غير محدد', 'General Course')}
                                      </span>

                                      <button
                                        onClick={() => handleTogglePublishAssignmentTask(task)}
                                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all border cursor-pointer ${
                                          isPublished ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                        }`}
                                      >
                                        {isPublished ? t('منشور 👁️', 'Published 👁️') : t('مخفي 🔒', 'Hidden 🔒')}
                                      </button>
                                    </div>

                                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{t(task.titleAr, task.titleEn)}</h3>
                                    
                                    {task.descriptionAr && (
                                      <p className="text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 text-xs leading-relaxed">{task.descriptionAr}</p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400 mt-3 font-mono text-[11px]">
                                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                        <Clock className="h-3.5 w-3.5" />
                                        {t('الديلاين:', 'Deadline:')} {task.deadline || t('غير محدد', 'None')}
                                      </span>
                                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                        <Award className="h-3.5 w-3.5" />
                                        {task.totalGrade || 100} {t('درجة', 'pts')}
                                      </span>
                                    </div>

                                    {task.pdfUrl && (
                                      <div className="mt-3">
                                        <button
                                          type="button"
                                          onClick={() => triggerFileDownload(task.pdfUrl, task.title || 'assignment_sheet.pdf')}
                                          className="inline-flex items-center gap-1.5 text-brand-cyan hover:underline font-bold text-[11px] cursor-pointer"
                                        >
                                          <FileText className="h-3.5 w-3.5" />
                                          <span>{t('عرض شيت التكليف PDF المرفق 📎', 'View attached PDF sheet')}</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 mt-5 pt-3">
                                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                      <span>{t('التسليمات:', 'Submissions:')} </span>
                                      <span className="text-slate-900 dark:text-white font-bold">{submissionsCount}</span>
                                      {pendingSubmissions > 0 && (
                                        <span className="text-amber-600 dark:text-amber-400 font-bold ml-1 font-sans">
                                          ({pendingSubmissions} {t('بانتظار التصحيح', 'pending grading')})
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleEditAssignmentTask(task)}
                                        className="rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 font-bold transition-all cursor-pointer"
                                      >
                                        {t('تعديل', 'Edit')}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAssignmentTask(task.id)}
                                        className="rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-1.5 font-bold transition-all cursor-pointer"
                                      >
                                        {t('حذف', 'Delete')}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUBTAB 2: STUDENT SUBMISSIONS & GRADING */}
                    {assignmentsSubTab === 'submissions' && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="relative flex-1">
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <input
                              type="text"
                              placeholder={t('البحث باسم الطالب أو عنوان التكليف...', 'Search by student name or assignment title...')}
                              value={assignmentSearchQuery}
                              onChange={e => setAssignmentSearchQuery(e.target.value)}
                              className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-9 pl-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {(() => {
                          const filteredSubs = assignmentSubmissions.filter(sub => {
                            const q = assignmentSearchQuery.trim().toLowerCase();
                            const sText = sub.studentText || (sub as any).studentAnswerText || '';
                            const taskTitle = sub.homeworkAr || (sub as any).assignmentTitle || '';
                            const cTitle = (sub as any).courseTitle || (courses.find(c => c.id === sub.courseId)?.titleAr) || '';
                            return !q ||
                              (sub.studentName && sub.studentName.toLowerCase().includes(q)) ||
                              taskTitle.toLowerCase().includes(q) ||
                              cTitle.toLowerCase().includes(q) ||
                              sText.toLowerCase().includes(q);
                          });

                          if (filteredSubs.length === 0) {
                            return (
                              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-12 text-center text-slate-600 dark:text-slate-400">
                                <FileCheck className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{t('لا توجد تسليمات تكليفات مطابقة', 'No assignment submissions match.')}</p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-4">
                              {filteredSubs.map(sub => {
                                const isGraded = sub.status === 'graded';
                                const studentText = sub.studentText || (sub as any).studentAnswerText || '';
                                const fileUrl = sub.fileUrl || (sub as any).attachmentUrl || '';
                                const taskTitle = sub.homeworkAr || (sub as any).assignmentTitle || (assignmentTasks.find(a => a.id === sub.assignmentId)?.titleAr) || t('تكليف دراسي', 'Assignment Task');
                                const courseTitle = (sub as any).courseTitle || (courses.find(c => c.id === sub.courseId)?.titleAr) || t('المقرر الدراسي', 'Subject');
                                const submissionDate = sub.date || (sub as any).submittedAt || '';

                                return (
                                  <div key={sub.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none p-5 text-xs text-slate-900 dark:text-white shadow-xl">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-sm text-slate-900 dark:text-white">{sub.studentName}</span>
                                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            isGraded ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                          }`}>
                                            {isGraded ? t('تم التصحيح والرصد ✅', 'Graded ✅') : t('بانتظار التصحيح ⏳', 'Pending Grading ⏳')}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                          {t('المقرر:', 'Subject:')} <span className="text-brand-cyan font-bold">{courseTitle}</span> • {t('التكليف:', 'Task:')} <span className="text-slate-900 dark:text-white font-bold">{taskTitle}</span>
                                        </p>
                                      </div>

                                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                                        {submissionDate ? (isNaN(Date.parse(submissionDate)) ? submissionDate : new Date(submissionDate).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')) : ''}
                                      </span>
                                    </div>

                                    {/* Student Answer Text & Attachment */}
                                    <div className="space-y-2 mb-4">
                                      {studentText && (
                                        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                          <p className="font-semibold text-slate-600 dark:text-slate-400 text-[10px] mb-1">{t('إجابة وملاحظات الطالب:', 'Student Answer Text:')}</p>
                                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs">{studentText}</p>
                                        </div>
                                      )}

                                      {fileUrl && (
                                        <div className="space-y-2">
                                          <button
                                            type="button"
                                            onClick={() => triggerFileDownload(fileUrl, 'student_homework_solution')}
                                            className="inline-flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-brand-cyan text-xs font-bold transition-all cursor-pointer"
                                          >
                                            <FileText className="h-4 w-4" />
                                            <span>{t('فتح وتنزيل ملف/صورة حل الطالب المرفقة 📄', 'View Student Assignment File/Image')}</span>
                                          </button>
                                          {(fileUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(fileUrl)) && (
                                            <div className="mt-2 max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1">
                                              <img src={fileUrl} alt="Student Assignment Solution" className="w-full max-h-64 object-contain rounded-lg" />
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Score and Feedback View if Graded */}
                                    {isGraded && (
                                      <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl mb-4">
                                        <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                                          <span>{t('الدرجة المرصودة:', 'Assigned Grade:')}</span>
                                          <span className="text-base font-mono">{sub.grade}</span>
                                        </div>
                                        {sub.feedback && (
                                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">{t('ملاحظات المشرف الأكاديمي:', 'Supervisor Feedback:')} {sub.feedback}</p>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                                      <button
                                        onClick={() => {
                                          setSelectedSubmissionForGrading(sub);
                                          setSubmissionGradeInput(sub.grade || '');
                                          setSubmissionFeedbackInput(sub.feedback || '');
                                        }}
                                        className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-md"
                                      >
                                        <Award className="h-4 w-4" />
                                        <span>{isGraded ? t('تعديل الدرجة والتصحيح', 'Edit Grade & Feedback') : t('رصد الدرجة والتصحيح', 'Grade Submission')}</span>
                                      </button>

                                      <button
                                        onClick={() => handleDeleteSubmission(sub.id)}
                                        className="rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* GRADING MODAL FOR TEACHER */}
                        {selectedSubmissionForGrading && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white dark:bg-slate-950/85 backdrop-blur-md animate-fadeIn">
                            <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 text-slate-900 dark:text-white shadow-2xl">
                              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                                <div>
                                  <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider">{t('تقييم تكليف الطالب ورصد الدرجات', 'Grade Student Assignment')}</span>
                                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{selectedSubmissionForGrading.studentName}</h3>
                                </div>
                                <button
                                  onClick={() => setSelectedSubmissionForGrading(null)}
                                  className="rounded-xl bg-slate-50 dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>

                              <form onSubmit={handleSaveGradeSubmission} className="space-y-4 text-xs">
                                <div>
                                  <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الدرجة / التقييم المرصود (مثال: 95/100 أو ممتاز)', 'Grade / Score')}</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. 95/100 or Excellent"
                                    value={submissionGradeInput}
                                    onChange={e => setSubmissionGradeInput(e.target.value)}
                                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                                  />
                                </div>

                                <div>
                                  <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('ملاحظات وتوجيهات المشرف الأكاديمي للطالب', 'Supervisor Feedback & Notes')}</label>
                                  <textarea
                                    rows={3}
                                    placeholder={t('اكتب ملاحظاتك الأكاديمية للطالب حول الحل...', 'Write academic feedback or notes...')}
                                    value={submissionFeedbackInput}
                                    onChange={e => setSubmissionFeedbackInput(e.target.value)}
                                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                                  />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-900">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSubmissionForGrading(null)}
                                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                  >
                                    {t('إلغاء', 'Cancel')}
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-5 py-2.5 font-bold cursor-pointer shadow-lg shadow-cyan-950/20"
                                  >
                                    {t('حفظ ورصد التصحيح', 'Save Grade')}
                                  </button>
                                </div>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* --- STUDENT REGISTRATIONS (LOGIN APPROVALS) PANEL --- */}
                {activeTab === 'registrations' && (() => {
                  const filteredRegStudents = students.filter(s => {
                    const q = orderSearchQuery.trim().toLowerCase();
                    const matchesSearch = !q ||
                      s.name.toLowerCase().includes(q) ||
                      s.email.toLowerCase().includes(q) ||
                      (s.phone && s.phone.includes(q));
                    
                    const matchesStatus = studentRegFilter === 'all' || s.status === studentRegFilter;
                    return matchesSearch && matchesStatus;
                  });

                  return (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Top Header & Manual Action */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                            <UserCheck className="h-6 w-6 text-brand-cyan" />
                            {t('موافقات تسجيل دخول المنصة (حسابات الطلاب الجدد)', 'Student Login & Account Approvals')}
                          </h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {t('قم بمراجعة طلبات تسجيل الحسابات الجديدة في المنصة الجامعية. عند الموافقة يتم تفعيل صلاحية الطالب لعرض وتحميل المحاضرات والسكاشن وحل الشيتات والامتحانات.', 'Review new student account registration requests. Approving an account grants access to lectures, sections, sheets, and online exams.')}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={handleForceLogoutAll}
                            title={t('إخراج جميع الطلاب المسجلين حالياً من المنصة على جميع أجهزتهم دون حذف حساباتهم', 'Force log out all users across all devices without deleting accounts')}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>{t('إخراج جميع الحسابات', 'Log Out All Users')}</span>
                          </button>
                          <button
                            onClick={handleClearAllStudents}
                            title={t('مسح وتصفير جميع الحسابات المسجلة للبدء من جديد', 'Clear all registered accounts')}
                            className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>{t('تصفير الحسابات والطلبات', 'Clear All Registrations')}</span>
                          </button>
                          <button
                            onClick={openAddModal}
                            className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20"
                          >
                            <Plus className="h-4 w-4" />
                            {t('تسجيل حساب طالب جديد يدوي', 'Register Student Manually')}
                          </button>
                        </div>
                      </div>

                      {/* Search Bar & Filter Pills */}
                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
                        <div className="relative flex-1">
                          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={orderSearchQuery}
                            onChange={e => setOrderSearchQuery(e.target.value)}
                            placeholder={t('بحث بالاسم، البريد الإلكتروني، أو رقم الهاتف...', 'Search by student name, email, or phone...')}
                            className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-11 pl-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan transition-colors"
                          />
                        </div>

                        {/* Status Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
                          {[
                            { id: 'all', label: t('الكل', 'All'), count: students.length },
                            { id: 'pending', label: t('قيد المراجعة ⏳', 'Pending'), count: salesStats.pendingStudentsCount },
                            { id: 'active', label: t('مقبولة ✅', 'Active'), count: students.filter(s => s.status === 'active').length },
                            { id: 'rejected', label: t('مرفوضة ❌', 'Rejected'), count: students.filter(s => s.status === 'rejected').length },
                            { id: 'suspended', label: t('موقوفة 🛑', 'Suspended'), count: students.filter(s => s.status === 'suspended').length },
                          ].map(pill => (
                            <button
                              key={pill.id}
                              onClick={() => setStudentRegFilter(pill.id)}
                              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                studentRegFilter === pill.id
                                  ? 'bg-brand-cyan text-white dark:text-slate-950 shadow-md shadow-cyan-950/40'
                                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <span>{pill.label}</span>
                              <span className="rounded-full bg-slate-200 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono font-bold">
                                {pill.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none shadow-xl">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-4">{t('الاسم وبيانات الطالب', 'Student Information')}</th>
                              <th className="p-4">{t('البريد الإلكتروني', 'Email Address')}</th>
                              <th className="p-4">{t('الصف الدراسي', 'Grade Level')}</th>
                              <th className="p-4">{t('تاريخ التسجيل', 'Registration Date')}</th>
                              <th className="p-4">{t('حالة حساب الدخول', 'Login Account Status')}</th>
                              <th className="p-4 text-center">{t('أزرار التحكم والموافقة', 'Actions & Controls')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {filteredRegStudents.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                                  {t('لا توجد طلبات تسجيل طلاب مطابقة للبحث أو الفلتر حالياً.', 'No student registration requests match your search or filter.')}
                                </td>
                              </tr>
                            ) : (
                              filteredRegStudents.map(stud => (
                                <tr key={stud.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/50 text-xs transition-colors">
                                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                                    <div className="text-sm">{stud.name}</div>
                                    {stud.phone && <div className="text-[11px] text-brand-cyan font-mono mt-0.5">{stud.phone}</div>}
                                  </td>
                                  <td className="p-4 font-mono text-slate-700 dark:text-slate-300">{stud.email}</td>
                                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">{getGradeDisplay(stud.grade, language)}</td>
                                  <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{stud.enrollmentDate || (stud.createdAt ? new Date(stud.createdAt).toLocaleDateString() : '-')}</td>
                                  <td className="p-4">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-black border inline-flex items-center gap-1 ${
                                      stud.status === 'active' 
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
                                        : stud.status === 'pending'
                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                    }`}>
                                      {stud.status === 'active' ? t('مقبول ونشط ✅', 'Active') : stud.status === 'pending' ? t('قيد المراجعة ⏳', 'Pending') : stud.status === 'rejected' ? t('مرفوض ❌', 'Rejected') : t('موقوف/محظور 🛑', 'Suspended')}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                      {/* Accept Account */}
                                      <button
                                        onClick={() => handleAcceptStudent(stud)}
                                        title={t('قبول الحساب وتفعيل صلاحية عرض وتحميل ملفات المحاضرات والسكاشن', 'Accept Account')}
                                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 px-3 py-1.5 text-xs font-black transition-all cursor-pointer shadow-md"
                                      >
                                        <UserCheck className="h-4 w-4" />
                                        <span>{t('قبول وتفعيل', 'Accept')}</span>
                                      </button>

                                      {/* Reject Account */}
                                      <button
                                        onClick={() => handleRejectStudent(stud)}
                                        title={t('رفض الحساب', 'Reject Account')}
                                        className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                                      >
                                        <UserX className="h-4 w-4" />
                                        <span>{t('رفض', 'Reject')}</span>
                                      </button>

                                      {/* View Data */}
                                      <button
                                        onClick={() => handleEditStudent(stud)}
                                        title={t('عرض البيانات والتعديل عليها', 'View Data')}
                                        className="flex items-center gap-1 rounded-xl bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>{t('تعديل', 'Edit')}</span>
                                      </button>

                                      {/* Delete */}
                                      <button
                                        onClick={() => handleDeleteStudent(stud.id, stud.email)}
                                        title={t('حذف الطالب نهائياً', 'Delete Student')}
                                        className="flex items-center gap-1 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>{t('حذف', 'Delete')}</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* --- LECTURES (المحاضرات الجامعية) INDEPENDENT MODULE --- */}
                {activeTab === 'lectures' && (
                  <AdminLecturesManager
                    lectures={lectures}
                    courses={courses}
                    onRefresh={loadData}
                    onLogAction={(action, title, details) => logAdminAction(action, 'lecture', title, details)}
                    onPreviewMedia={handlePreviewAdminMedia}
                  />
                )}

                {/* --- SECTIONS (السكاشن والتطبيقات المعملية) INDEPENDENT MODULE --- */}
                {activeTab === 'sections' && (
                  <AdminSectionsManager
                    sections={sections}
                    courses={courses}
                    onRefresh={loadData}
                    onLogAction={(action, title, details) => logAdminAction(action, 'section', title, details)}
                    onPreviewMedia={handlePreviewAdminMedia}
                  />
                )}

                {/* --- EXAMS (الامتحانات الإلكترونية والورقية) INDEPENDENT MODULE --- */}
                {activeTab === 'exams' && (
                  <AdminExamsManager
                    exams={exams}
                    courses={courses}
                    questionBank={questionBank}
                    adminName={currentAdmin?.name || 'Eng/Mohamed abdal tawab'}
                    onRefresh={loadData}
                    onLogAction={(action, title, details) => logAdminAction(action, 'exam', title, details)}
                    onPreviewMedia={handlePreviewAdminMedia}
                  />
                )}

                {/* --- SHEETS (الشيتات الأكاديمية) INDEPENDENT MODULE --- */}
                {activeTab === 'sheets' && (
                  <AdminSheetsManager
                    sheets={sheets}
                    courses={courses}
                    adminName={currentAdmin?.name || 'Eng/Mohamed abdal tawab'}
                    onRefresh={loadData}
                    onLogAction={(action, title, details) => logAdminAction(action, 'sheet', title, details)}
                    onPreviewMedia={handlePreviewAdminMedia}
                  />
                )}

                {/* --- UNIVERSITY ANNOUNCEMENTS PANEL --- */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Bell className="h-6 w-6 text-brand-cyan" />
                        {t('نظام الإعلانات والتنبيهات الجامعية الفورية', 'University Platform Announcements & Alerts')}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {t('أرسل تنبيهات فورية تظهر مباشرة في لوحة الطالب عند نشر محاضرات أو سكاشن أو شيتات أو امتحانات جديدة.', 'Broadcast instant alerts that appear live in the student portal when new academic content is published.')}
                      </p>
                    </div>

                    {/* Broadcast Form Card */}
                    <div className="rounded-2xl border border-cyan-500/30 bg-slate-50 dark:bg-slate-950/70 p-6 glass space-y-5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Send className="h-4 w-4 text-brand-cyan" />
                        {t('إنشاء وبث إشعار جديد للطلاب الآن', 'Create & Broadcast New Notification')}
                      </h3>

                      <form onSubmit={handleSendBroadcastNotification} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('عنوان الإشعار', 'Notification Title')}</label>
                            <input
                              type="text"
                              required
                              value={notificationForm.title}
                              onChange={e => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder={t('مثال: تم رفع المحاضرة الأولى في الفيزياء بنجاح 🚀', 'e.g. New Physics Lecture Uploaded')}
                              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('نوع التنبيه', 'Notification Category')}</label>
                            <select
                              value={notificationForm.type}
                              onChange={e => setNotificationForm(prev => ({ ...prev, type: e.target.value as any }))}
                              className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan cursor-pointer"
                            >
                              <option value="general">📢 {t('تنبيه عام لجميع الطلاب', 'General Announcement')}</option>
                              <option value="lecture">📚 {t('محاضرة أو سكشن جديد', 'New Lecture / Section')}</option>
                              <option value="activation">✅ {t('اعتماد وتفعيل مادة / حساب', 'Account / Course Activation')}</option>
                              <option value="exam">📝 {t('امتحان أو شيت جديد', 'New Exam / Sheet')}</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('نص ومحتوى الإشعار', 'Notification Message')}</label>
                          <textarea
                            rows={3}
                            required
                            value={notificationForm.message}
                            onChange={e => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                            placeholder={t('اكتب نص الإشعار الذي سيظهر لجميع الطلاب في لوحة التحكم...', 'Write the message text...')}
                            className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="flex items-center gap-2 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-2.5 text-xs font-black transition-all cursor-pointer shadow-lg shadow-cyan-950/20 disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                            <span>{actionLoading ? t('جاري الإرسال...', 'Sending...') : t('بث الإشعار الفوري للطلاب الآن', 'Broadcast Instant Notification')}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* --- QUESTION BANK PANEL --- */}
                {activeTab === 'question-bank' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                          <ListChecks className="h-6 w-6 text-brand-cyan" />
                          {t('بنك الأسئلة الموحد لقسم IT', 'IT Department Question Bank')}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {t('أضف أسئلة اختيار من متعدد أو صح/خطأ مع الشرح التعليمي واستوردها بسهولة داخل الامتحانات الإلكترونية.', 'Add MCQ or True/False questions with explanations and import them into online exams.')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingContentId(null);
                          setQuestionBankForm({
                            subject: 'Python',
                            topic: '',
                            questionText: '',
                            type: 'multiple_choice',
                            options: ['', '', '', ''],
                            correctAnswerIndex: 0,
                            points: 10,
                            explanation: '',
                          });
                          setActiveContentModal('question_bank');
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20 shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{t('إضافة سؤال للبنك', 'Add Question')}</span>
                      </button>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
                      <div className="relative flex-1">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={qbSearch}
                          onChange={e => setQbSearch(e.target.value)}
                          placeholder={t('بحث بنص السؤال أو الموضوع...', 'Search question text or topic...')}
                          className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-11 pl-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
                        {['all', 'Physics', 'Python', 'IT Essentials', 'Mathematics', 'Cyber Security', 'English'].map(subj => (
                          <button
                            key={subj}
                            type="button"
                            onClick={() => setQbSubjectFilter(subj)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                              qbSubjectFilter === subj
                                ? 'bg-brand-cyan text-white dark:text-slate-950 border-brand-cyan'
                                : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {subj === 'all' ? t('الكل', 'All') : subj}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {questionBank
                        .filter(q => {
                          const matchesSearch = !qbSearch || q.questionText.toLowerCase().includes(qbSearch.toLowerCase()) || (q.topic || '').toLowerCase().includes(qbSearch.toLowerCase());
                          const matchesSubj = qbSubjectFilter === 'all' || (q.courseTitle || '').toLowerCase().includes(qbSubjectFilter.toLowerCase());
                          return matchesSearch && matchesSubj;
                        })
                        .map(qb => (
                          <div key={qb.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none p-5 text-xs space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-2.5 py-0.5 font-bold">
                                  {qb.courseTitle}
                                </span>
                                <span className="rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 font-semibold">
                                  {qb.topic}
                                </span>
                                <span className="rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 font-mono tabular-nums font-bold">
                                  {qb.points || 10} {t('درجات', 'pts')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingContentId(qb.id);
                                    setQuestionBankForm({
                                      subject: resolveCourseBySubject(qb.courseTitle || '').courseTitle.split('–')[0].trim() || 'Python',
                                      topic: qb.topic || '',
                                      questionText: qb.questionText || '',
                                      type: qb.type || 'multiple_choice',
                                      options: qb.options && qb.options.length >= 2 ? [...qb.options, '', '', ''].slice(0, 4) : ['', '', '', ''],
                                      correctAnswerIndex: qb.correctAnswerIndex || 0,
                                      points: qb.points || 10,
                                      explanation: qb.explanation || '',
                                    });
                                    setActiveContentModal('question_bank');
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestionBankItem(qb.id)}
                                  className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm leading-relaxed">{qb.questionText}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {qb.options.map((opt, idx) => (
                                <div
                                  key={idx}
                                  className={`rounded-lg px-2.5 py-1.5 border ${
                                    idx === qb.correctAnswerIndex
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold'
                                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {idx + 1}. {opt}
                                </div>
                              ))}
                            </div>
                            {qb.explanation && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-200 dark:border-slate-800/70">
                                <span className="font-bold text-brand-cyan">{t('الشرح:', 'Note:')}</span> {qb.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* --- WEEKLY SCHEDULE / TIMETABLE PANEL --- */}
                {activeTab === 'schedule' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                          <Calendar className="h-6 w-6 text-brand-cyan" />
                          {t('الجدول الدراسي الأسبوعي (محاضرات - سكاشن - امتحانات)', 'Weekly Academic Timetable')}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {t('نظم مواعيد المحاضرات والسكاشن والقاعات الدراسية ليظهر مباشرة في لوحة الطالب.', 'Organize lecture, section, and exam slots visible to all approved students.')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingContentId(null);
                          setScheduleForm({
                            title: '',
                            subject: 'Physics',
                            itemType: 'lecture',
                            dayOfWeek: 'Sunday',
                            dayOfWeekAr: 'الأحد',
                            startTime: '09:00',
                            endTime: '11:00',
                            location: 'مدرج 1 - مبنى التكنولوجيا',
                            instructor: 'Eng/Mohamed abdal tawab',
                            notes: '',
                            active: true,
                          });
                          setActiveContentModal('schedule');
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/20 shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{t('إضافة موعد جديد', 'Add Timetable Slot')}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3.5">{t('اليوم', 'Day')}</th>
                            <th className="p-3.5">{t('التوقيت', 'Time')}</th>
                            <th className="p-3.5">{t('المادة والنشاط', 'Subject & Session')}</th>
                            <th className="p-3.5">{t('القاعة / المعمل', 'Location')}</th>
                            <th className="p-3.5">{t('المحاضر', 'Instructor')}</th>
                            <th className="p-3.5 text-center">{t('الإجراءات', 'Actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {scheduleItems.map(slot => (
                            <tr key={slot.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                              <td className="p-3.5 font-bold text-brand-cyan">{language === 'ar' ? slot.dayOfWeekAr : slot.dayOfWeek}</td>
                              <td className="p-3.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">{slot.startTime} - {slot.endTime}</td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900 dark:text-white">{slot.title}</div>
                                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                  <span>{slot.courseTitle}</span>
                                  <span className={`px-1.5 py-0.5 rounded font-bold ${
                                    slot.itemType === 'lecture' ? 'bg-cyan-500/10 text-brand-cyan' :
                                    slot.itemType === 'section' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                                    'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {slot.itemType === 'lecture' ? t('محاضرة', 'Lecture') : slot.itemType === 'section' ? t('سكشن', 'Section') : t('امتحان', 'Exam')}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-slate-700 dark:text-slate-300">{slot.location || '—'}</td>
                              <td className="p-3.5 text-slate-700 dark:text-slate-300">{slot.instructor || 'Eng/Mohamed abdal tawab'}</td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingContentId(slot.id);
                                      setScheduleForm({
                                        title: slot.title,
                                        subject: resolveCourseBySubject(slot.courseTitle || '').courseTitle.split('–')[0].trim() || 'Physics',
                                        itemType: slot.itemType,
                                        dayOfWeek: slot.dayOfWeek,
                                        dayOfWeekAr: slot.dayOfWeekAr,
                                        startTime: slot.startTime,
                                        endTime: slot.endTime,
                                        location: slot.location || '',
                                        instructor: slot.instructor || 'Eng/Mohamed abdal tawab',
                                        notes: slot.notes || '',
                                        active: slot.active !== false,
                                      });
                                      setActiveContentModal('schedule');
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteScheduleItem(slot.id)}
                                    className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* --- STUDENT INQUIRIES & Q&A PANEL --- */}
                {activeTab === 'inquiries' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                          <HelpCircle className="h-6 w-6 text-brand-cyan" />
                          {t('استفسارات وأسئلة الطلاب الأكاديمية', 'Student Academic Inquiries & Q&A')}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {t('أجب على استفسارات الطلاب حول المحاضرات والسكاشن ليصلهم إشعار فوري بالرد.', 'Answer student questions across IT subjects and notify students immediately.')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(['all', 'pending', 'answered'] as const).map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setInquiryFilter(f)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                              inquiryFilter === f
                                ? 'bg-brand-cyan text-white dark:text-slate-950 border-brand-cyan'
                                : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {f === 'all' ? t('الكل', 'All') : f === 'pending' ? t('بانتظار الرد', 'Pending') : t('تم الرد', 'Answered')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {inquiries
                        .filter(i => inquiryFilter === 'all' || i.status === inquiryFilter)
                        .map(inq => (
                          <div key={inq.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none p-5 text-xs space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white text-sm">{inq.studentName}</span>
                                <span className="rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-2 py-0.5 font-bold">
                                  {inq.courseTitle}
                                </span>
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  inq.status === 'answered' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                }`}>
                                  {inq.status === 'answered' ? t('تم الرد', 'Answered') : t('بانتظار الرد', 'Pending')}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteInquiry(inq.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white cursor-pointer"
                                title={t('حذف', 'Delete')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div>
                              <p className="font-bold text-cyan-700 dark:text-brand-cyan-light">{inq.title || inq.subjectTitle}</p>
                              <p className="text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">{inq.question || inq.message}</p>
                            </div>
                            {inq.reply && (
                              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-200">
                                <p className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px] mb-1">
                                  {t('رد الإدارة:', 'Admin Reply:')} ({inq.repliedBy || 'Eng/Mohamed abdal tawab'})
                                </p>
                                <p>{inq.reply}</p>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                              <input
                                type="text"
                                value={inquiryReplyDraft[inq.id] ?? ''}
                                onChange={e => setInquiryReplyDraft(prev => ({ ...prev, [inq.id]: e.target.value }))}
                                placeholder={inq.reply ? t('تحديث الرد...', 'Update reply...') : t('اكتب ردك للطالب هنا...', 'Write your reply...')}
                                className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                              />
                              <button
                                type="button"
                                onClick={() => handleReplyInquiry(inq)}
                                disabled={actionLoading}
                                className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-black cursor-pointer shrink-0 disabled:opacity-50"
                              >
                                {t('إرسال الرد', 'Send Reply')}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* --- ADMIN ACTIVITY LOGS PANEL --- */}
                {activeTab === 'activity-logs' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                          <History className="h-6 w-6 text-brand-cyan" />
                          {t('سجل نشاطات ومراجعة الإدارة', 'Admin Activity Audit Log')}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {t('تتبع زمني لعمليات قبول الطلاب وإضافة المحاضرات والسكاشن والامتحانات.', 'Chronological log of student approvals, uploads, and academic updates.')}
                        </p>
                      </div>
                      <select
                        value={logFilter}
                        onChange={e => setLogFilter(e.target.value)}
                        className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                      >
                        <option value="all">{t('كل الأنشطة', 'All Activities')}</option>
                        <option value="student">{t('حسابات الطلاب', 'Students')}</option>
                        <option value="lecture">{t('المحاضرات', 'Lectures')}</option>
                        <option value="section">{t('السكاشن', 'Sections')}</option>
                        <option value="exam">{t('الامتحانات', 'Exams')}</option>
                        <option value="sheet">{t('الشيتات', 'Sheets')}</option>
                      </select>
                    </div>

                    {activityLogs.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                        {t('لا توجد سجلات نشاطات مسجلة بعد.', 'No activity logs recorded yet.')}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activityLogs
                          .filter(l => logFilter === 'all' || l.targetType === logFilter)
                          .slice(0, 60)
                          .map(log => (
                            <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/50 p-3.5 text-xs">
                              <div className="flex items-center gap-3">
                                <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  log.action === 'approve' || log.action === 'create' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                                  log.action === 'delete' || log.action === 'reject' || log.action === 'suspend' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                                  'bg-blue-500/15 text-blue-400'
                                }`}>
                                  {log.action}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">{log.targetTitle}</span>
                                  {log.details && <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{log.details}</p>}
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                                {log.adminName} • {new Date(log.timestamp).toLocaleString()}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* --- COURSE SUBSCRIPTION APPROVALS & SALES PANEL --- */}
                {activeTab === 'orders' && (() => {
                  const filteredOrders = orders.filter(o => {
                    const q = orderSearchQuery.trim().toLowerCase();
                    const matchesSearch = !q ||
                      o.studentName.toLowerCase().includes(q) ||
                      o.studentEmail.toLowerCase().includes(q) ||
                      o.courseTitle.toLowerCase().includes(q) ||
                      (o.studentPhone && o.studentPhone.includes(q)) ||
                      o.id.toLowerCase().includes(q);
                    
                    const matchesStatus = orderStatusFilter === 'all' ||
                      (orderStatusFilter === 'completed' ? (o.status === 'completed' || o.status === 'approved') : o.status === orderStatusFilter);

                    return matchesSearch && matchesStatus;
                  });

                  return (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Top Header & Manual Action */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                            <ShieldCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                            {t('التحكم في صلاحيات وصول المقررات الدراسية (تفعيل / إيقاف)', 'Course Access Activation Control')}
                          </h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {t('منصة تعليمية مجانية بالكامل 100% — التحكم في تفعيل أو إيقاف وصول الطلاب لمقررات قسم تكنولوجيا المعلومات (IT).', '100% Free Educational Platform — Activate or revoke student access to IT Department subjects.')}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={handleForceLogoutAll}
                            title={t('إخراج جميع الطلاب المسجلين حالياً من المنصة على جميع أجهزتهم دون حذف حساباتهم', 'Force log out all users across all devices without deleting accounts')}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>{t('إخراج جميع الحسابات', 'Log Out All Users')}</span>
                          </button>
                          <button
                            onClick={handleClearAllStudents}
                            title={t('مسح وتصفير جميع الطلبات وحسابات الطلاب للبدء من جديد', 'Clear all enrollment requests & student accounts')}
                            className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>{t('تصفير الحسابات والطلبات', 'Reset Accounts & Requests')}</span>
                          </button>
                          <button
                            onClick={openAddModal}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 px-4 py-2.5 text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
                          >
                            <Plus className="h-4 w-4" />
                            {t('تفعيل مقرر لطالب يدوياً', 'Grant Course Access')}
                          </button>
                        </div>
                      </div>

                      {/* Access Control Overview Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{t('نظام المنصة التعليمية', 'Platform Model')}</span>
                            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                              {t('مجاني بالكامل 100%', '100% Free LMS')}
                            </p>
                          </div>
                          <div className="rounded-lg bg-emerald-500/20 p-3 text-emerald-700 dark:text-emerald-400">
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{t('إجمالي التفعيلات المعتمدة', 'Approved Activations')}</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                              {salesStats.activeSubscriptionsCount} <span className="text-xs text-slate-600 dark:text-slate-400 font-sans">{t('تفعيل', 'active')}</span>
                            </p>
                          </div>
                          <div className="rounded-lg bg-brand-cyan/10 p-3 text-brand-cyan">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        </div>

                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{t('طلبات تفعيل قيد المراجعة', 'Pending Requests')}</span>
                            <p className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono tabular-nums mt-1">
                              {salesStats.pendingOrdersCount} <span className="text-xs text-amber-600 dark:text-amber-400/80 font-sans">{t('طلب معلق', 'pending')}</span>
                            </p>
                          </div>
                          <div className="rounded-lg bg-amber-500/20 p-3 text-amber-600 dark:text-amber-400">
                            <HelpCircle className="h-6 w-6" />
                          </div>
                        </div>
                      </div>

                      {/* Search Bar & Filter Pills */}
                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
                        <div className="relative flex-1">
                          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={orderSearchQuery}
                            onChange={e => setOrderSearchQuery(e.target.value)}
                            placeholder={t('بحث باسم الطالب، اسم المقرر، البريد الإلكتروني، أو الهاتف...', 'Search by student, course name, email, or phone...')}
                            className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-11 pl-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan transition-colors"
                          />
                        </div>

                        {/* Status Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
                          {[
                            { id: 'all', label: t('الكل', 'All'), count: orders.length },
                            { id: 'pending', label: t('تنتظر الموافقة', 'Pending'), count: salesStats.pendingOrdersCount },
                            { id: 'completed', label: t('مفعلة ومقبولة', 'Approved'), count: salesStats.activeSubscriptionsCount },
                            { id: 'rejected', label: t('مرفوضة', 'Rejected'), count: orders.filter(o => ['rejected', 'مرفوض', 'مرفوضة'].includes((o.status || '').trim().toLowerCase())).length },
                          ].map(pill => (
                            <button
                              key={pill.id}
                              onClick={() => setOrderStatusFilter(pill.id)}
                              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                orderStatusFilter === pill.id
                                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40'
                                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <span>{pill.label}</span>
                              <span className="rounded-full bg-slate-200 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono tabular-nums font-bold">
                                {pill.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none shadow-xl">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-4">{t('اسم الطالب وبياناته', 'Student Info')}</th>
                              <th className="p-4">{t('المقرر المطلوب', 'Requested Subject')}</th>
                              <th className="p-4">{t('نظام الوصول', 'Access Type')}</th>
                              <th className="p-4">{t('تاريخ الطلب', 'Date')}</th>
                              <th className="p-4">{t('حالة التفعيل', 'Activation Status')}</th>
                              <th className="p-4 text-center">{t('أزرار التحكم والموافقة', 'Actions & Controls')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {filteredOrders.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                                  {t('لا توجد طلبات تفعيل مقررات مطابقة للبحث أو الفلتر حالياً.', 'No course activation requests match your search or filter.')}
                                </td>
                              </tr>
                            ) : (
                              filteredOrders.map(ord => (
                                <tr key={ord.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/50 text-xs transition-colors">
                                  <td className="p-4">
                                    <div className="font-bold text-slate-900 dark:text-white text-sm">{ord.studentName}</div>
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">{ord.studentEmail}</div>
                                    {ord.studentPhone && (
                                      <div className="text-[11px] text-brand-cyan font-mono mt-0.5">{ord.studentPhone}</div>
                                    )}
                                  </td>
                                  <td className="p-4 text-slate-100 font-bold text-sm">{ord.courseTitle}</td>
                                  <td className="p-4">
                                    <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold">
                                      {t('مجاني بالكامل', '100% Free')}
                                    </span>
                                  </td>
                                  <td className="p-4 text-slate-600 dark:text-slate-400 font-mono tabular-nums">{ord.date}</td>
                                  <td className="p-4">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-black border inline-flex items-center gap-1 ${
                                      ord.status === 'completed' || ord.status === 'approved'
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
                                        : ord.status === 'rejected'
                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    }`}>
                                      {ord.status === 'completed' || ord.status === 'approved'
                                        ? t('مفعل ومقبول', 'Approved')
                                        : ord.status === 'rejected'
                                        ? t('موقوف / مرفوض', 'Rejected')
                                        : t('ينتظر الموافقة', 'Pending')}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                      <button
                                        onClick={() => handleApproveOrder(ord)}
                                        title={t('تفعيل صلاحية عرض وتحميل ملفات المحاضرات والسكاشن والشيتات للطالب فوراً', 'Approve Access')}
                                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 px-3 py-1.5 text-xs font-black transition-all cursor-pointer shadow-md"
                                      >
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>{t('تفعيل الوصول', 'Approve')}</span>
                                      </button>

                                      <button
                                        onClick={() => handleRejectOrder(ord)}
                                        title={t('إيقاف / رفض الوصول', 'Reject')}
                                        className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                                      >
                                        <XCircle className="h-4 w-4" />
                                        <span>{t('إيقاف', 'Revoke')}</span>
                                      </button>

                                      <button
                                        onClick={() => handleEditOrder(ord)}
                                        title={t('عرض التفاصيل والتعديل', 'View Details')}
                                        className="flex items-center gap-1 rounded-xl bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>{t('تعديل', 'Edit')}</span>
                                      </button>

                                      <button
                                        onClick={() => handleDeleteOrder(ord.id)}
                                        title={t('حذف هذا الطلب', 'Delete Request')}
                                        className="flex items-center gap-1 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>{t('حذف', 'Delete')}</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* --- PROMO COUPONS PANEL --- */}
                {activeTab === 'coupons' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-brand-cyan" />
                        {t('إدارة أكواد التفعيل والمنح الجامعية', 'Manage Academic Promo Codes')}
                      </h2>
                      <button
                        onClick={openAddModal}
                        className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        {t('إضافة كوبون جديد', 'Create Promo Coupon')}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs">
                          <tr>
                            <th className="p-3">{t('رمز الكوبون الترويجي', 'Promo Code')}</th>
                            <th className="p-3">{t('نسبة الخصم', 'Discount Value')}</th>
                            <th className="p-3">{t('تاريخ الانتهاء', 'Expiry Date')}</th>
                            <th className="p-3">{t('حالة النشاط', 'Status')}</th>
                            <th className="p-3 text-center">{t('الخيارات', 'Options')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-xs text-slate-900 dark:text-white">
                          {coupons.map(coup => (
                            <tr key={coup.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/20">
                              <td className="p-3 font-bold text-cyan-700 dark:text-brand-cyan-light font-mono tracking-wider">{coup.code}</td>
                              <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400 font-mono">{coup.discountPercent}%</td>
                              <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">{coup.expiresAt}</td>
                              <td className="p-3">
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  coup.active 
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                }`}>
                                  {coup.active ? t('نشط وفعال', 'Active') : t('منتهي الصلاحية', 'Disabled')}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleEditCoupon(coup)}
                                    className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCoupon(coup.id)}
                                    className="p-1 text-red-600 dark:text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* --- ACADEMY ANALYTICS PANEL --- */}
                {activeTab === 'analytics' && (
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-brand-cyan" />
                      {t('تحليلات التفاعل الأكاديمي ونتائج الامتحانات - قسم IT', 'IT Academic Engagement & Assessment Analytics')}
                    </h2>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-5">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">{t('الطلاب المعتمدون النشطون', 'Active Approved IT Students')}</span>
                        <p className="mt-2 text-3xl font-black text-cyan-700 dark:text-brand-cyan-light font-mono tabular-nums">
                          {students.filter(s => s.status === 'active').length}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                          {students.filter(s => s.status === 'pending').length} {t('طلب تسجيل معلق', 'pending approval')}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-5">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">{t('إجمالي المواد والمحتوى الأكاديمي', 'Total Published Learning Materials')}</span>
                        <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                          {lectures.length + sections.length + exams.length + sheets.length}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                          {lectures.length} {t('محاضرة', 'Lec')} • {sections.length} {t('سكشن', 'Sec')} • {exams.length} {t('امتحان', 'Ex')} • {sheets.length} {t('شيت', 'Sh')}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-5">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">{t('متوسط درجات الامتحانات الأونلاين', 'Online Exams Average Score')}</span>
                        <p className="mt-2 text-3xl font-black text-violet-400 font-mono tabular-nums">
                          {examSubmissions.length > 0
                            ? `${Math.round(examSubmissions.reduce((s, sub) => s + (sub.percentage || 0), 0) / examSubmissions.length)}%`
                            : '—'}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                          {examSubmissions.length} {t('محاولة امتحان مسجلة', 'exam submissions')}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/20 p-6">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6">{t('توزيع المحتوى والتفاعل حسب المادة الدراسية (قسم IT)', 'Content Distribution by IT Subject')}</h3>
                      <div className="space-y-4">
                        {courses.map(c => {
                          const totalCourseMaterials =
                            lectures.filter(l => l.courseId === c.id || (l.subject && c.titleEn.toLowerCase().includes(l.subject.toLowerCase()))).length +
                            sections.filter(s => s.courseId === c.id || (s.subject && c.titleEn.toLowerCase().includes(s.subject.toLowerCase()))).length +
                            exams.filter(e => e.courseId === c.id || (e.subject && c.titleEn.toLowerCase().includes(e.subject.toLowerCase()))).length +
                            sheets.filter(sh => sh.courseId === c.id || (sh.subject && c.titleEn.toLowerCase().includes(sh.subject.toLowerCase()))).length;
                          const percentage = Math.min(Math.max(totalCourseMaterials * 10, 8), 100);

                          return (
                            <div key={c.id} className="space-y-1.5 text-xs">
                              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                <span className="font-semibold text-slate-900 dark:text-white">{t(c.titleAr, c.titleEn)}</span>
                                <span className="font-mono tabular-nums font-bold text-cyan-700 dark:text-brand-cyan-light">
                                  {totalCourseMaterials} {t('ملف ومحتوى دراسي', 'materials')}
                                </span>
                              </div>
                              <div className="h-3 w-full bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800/60">
                                <div 
                                  className="h-full bg-gradient-to-r from-cyan-600 to-brand-cyan rounded-full transition-all duration-1000" 
                                  style={{ width: `${percentage}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. ARTICLES MANAGEMENT */}
                {activeTab === 'articles' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-brand-cyan" />
                        {t('إدارة مقالات ونشرات تكنولوجيا المعلومات', 'Manage IT Articles & News')}
                      </h2>
                      <button
                        onClick={openAddModal}
                        className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        {t('إضافة مقال جديد', 'New Article')}
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800/40">
                      {articles.map(art => (
                        <div key={art.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{t(art.titleAr, art.titleEn)}</p>
                            <p className="text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{t(art.contentAr, art.contentEn)}</p>
                            <div className="flex gap-2 items-center mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                              <span>{art.date}</span>
                              <span>•</span>
                              <span>{t(art.authorAr, art.authorEn)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleEditArticle(art)}
                              className="rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1.5 hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
                            >
                              {t('تعديل', 'Edit')}
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(art.id)}
                              className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-1.5 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            >
                              {t('حذف', 'Delete')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. NEWS MANAGEMENT */}
                {activeTab === 'news' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-brand-cyan" />
                        {t('إدارة إشعارات وإعلانات المنصة الجامعية', 'Manage University Announcements & News')}
                      </h2>
                      <button
                        onClick={openAddModal}
                        className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        {t('إضافة خبر جديد', 'Add News')}
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800/40">
                      {news.map(n => (
                        <div key={n.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{t(n.titleAr, n.titleEn)}</p>
                            <p className="text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{t(n.contentAr, n.contentEn)}</p>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block">{n.date}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleEditNews(n)}
                              className="rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1.5 hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
                            >
                              {t('تعديل', 'Edit')}
                            </button>
                            <button
                              onClick={() => handleDeleteNews(n.id)}
                              className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-1.5 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            >
                              {t('حذف', 'Delete')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. REVIEWS MANAGEMENT */}
                {activeTab === 'reviews' && (
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <Star className="h-5 w-5 text-brand-cyan" />
                      {t('مراجعات وتقييمات الطلاب', 'Manage Student Reviews')}
                    </h2>

                    <div className="space-y-4">
                      {reviews.map(rev => (
                        <div key={rev.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">{rev.studentName}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{t(rev.studentTitleAr, rev.studentTitleEn)}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 mb-2">
                              {Array.from({ length: rev.rating }).map((_, idx) => (
                                <Star key={idx} className="h-3.5 w-3.5 fill-amber-400" />
                              ))}
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{t(rev.commentAr, rev.commentEn)}</p>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block">{rev.date}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleReviewApproval(rev)}
                              className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                                rev.approved
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {rev.approved ? t('تمت الموافقة', 'Approved') : t('في انتظار الموافقة', 'Pending')}
                            </button>
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-1.5 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            >
                              {t('حذف', 'Delete')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LESSON COMMENTS & Q&A */}
                {activeTab === 'lesson_comments' && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-brand-cyan" />
                          {t('التعليقات والأسئلة عن الدرس (مناهج الطلاب)', 'Lesson Q&A and Comments')}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {t('هنا تصلك كافة استفسارات وتعليقات الطلاب من داخل صفحات الدروس، يمكنك الرد عليها مباشرة أو حذفها.', 'All student questions and comments from inside lesson pages arrive here. You can reply directly or delete them.')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {lessonComments.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 dark:text-slate-400 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-slate-600 stroke-1" />
                          <p className="text-sm font-bold">{t('لا توجد تعليقات أو أسئلة على الدروس حالياً.', 'No lesson comments or questions yet.')}</p>
                        </div>
                      ) : (
                        lessonComments.map(comm => {
                          const courseObj = courses.find(c => c.id === comm.courseId);
                          const lessonObj = courseObj?.lessons?.find(l => l.id === comm.lessonId);
                          return (
                            <div key={comm.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none p-5 flex flex-col gap-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-9 w-9 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center font-black text-brand-cyan text-sm">
                                    {comm.studentName.charAt(0)}
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{comm.studentName}</h3>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">{new Date(comm.timestamp).toLocaleString('ar-EG')}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                  <span className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1 font-bold">
                                    <BookOpen className="h-3 w-3 text-brand-cyan" />
                                    {courseObj ? (t(courseObj.titleAr, courseObj.titleEn)) : comm.courseId}
                                  </span>
                                  <span className="bg-brand-cyan/10 text-brand-cyan px-2.5 py-1 rounded-lg border border-brand-cyan/20 flex items-center gap-1 font-bold">
                                    <Video className="h-3 w-3" />
                                    {lessonObj ? (t(lessonObj.titleAr || lessonObj.titleEn || '', lessonObj.titleEn || lessonObj.titleAr || '')) : (t('درس رقم: ', 'Lesson: ') + comm.lessonId)}
                                  </span>
                                </div>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-200 font-bold leading-relaxed">
                                {comm.comment}
                              </div>

                              {comm.reply && (
                                <div className="bg-brand-cyan/5 border-r-2 border-r-brand-cyan border border-slate-200 dark:border-slate-800/60 rounded-xl p-3.5">
                                  <div className="flex justify-between items-center mb-1 text-[11px]">
                                    <span className="font-black text-brand-cyan flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
                                      {t('رد المشرف الأكاديمي / م. محمد عبد التواب', 'Instructor Reply - Eng/Mohamed abdal tawab')}
                                    </span>
                                    {comm.replyTimestamp && (
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{new Date(comm.replyTimestamp).toLocaleString('ar-EG')}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-700 dark:text-slate-200 font-bold mt-1 leading-relaxed">{comm.reply}</p>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                                <div className="flex-1 flex gap-2">
                                  <input
                                    type="text"
                                    value={commentReplyText[comm.id] !== undefined ? commentReplyText[comm.id] : (comm.reply || '')}
                                    onChange={(e) => setCommentReplyText(prev => ({ ...prev, [comm.id]: e.target.value }))}
                                    placeholder={comm.reply ? t('تعديل الرد أو إضافة رد جديد...', 'Edit reply or add new reply...') : t('اكتب ردك هنا على سؤال الطالب...', 'Write your reply to the student here...')}
                                    className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:border-brand-cyan focus:outline-none"
                                  />
                                  <button
                                    onClick={async () => {
                                      const text = commentReplyText[comm.id] !== undefined ? commentReplyText[comm.id] : (comm.reply || '');
                                      if (!text || !text.trim()) return;
                                      setActionLoading(true);
                                      try {
                                        await dbService.updateComment(comm.id, {
                                          reply: text.trim(),
                                          replyTimestamp: Date.now()
                                        });
                                        triggerNotification(t('تم إرسال ردك بنجاح!', 'Reply sent successfully!'));
                                      } catch (err) {
                                        console.error(err);
                                        triggerNotification(t('حدث خطأ أثناء إرسال الرد.', 'Error sending reply.'), true);
                                      } finally {
                                        setActionLoading(false);
                                      }
                                    }}
                                    disabled={!(commentReplyText[comm.id] !== undefined ? commentReplyText[comm.id] : (comm.reply || ''))?.trim() || actionLoading}
                                    className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 px-4 py-2 text-xs font-black hover:bg-brand-cyan-light transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    {comm.reply ? t('تحديث الرد', 'Update Reply') : t('إرسال الرد', 'Send Reply')}
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    requestConfirmation(
                                      t('حذف التعليق', 'Delete Comment'),
                                      t('هل أنت متأكد من حذف هذا التعليق نهائياً؟', 'Are you sure you want to delete this comment?'),
                                      async () => {
                                        setActionLoading(true);
                                        try {
                                          await dbService.deleteComment(comm.id);
                                          triggerNotification(t('تم حذف التعليق بنجاح.', 'Comment deleted successfully.'));
                                        } catch (err) {
                                          console.error(err);
                                          triggerNotification(t('حدث خطأ أثناء حذف التعليق.', 'Error deleting comment.'), true);
                                        } finally {
                                          setActionLoading(false);
                                        }
                                      }
                                    );
                                  }}
                                  disabled={actionLoading}
                                  className="rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-2 text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t('حذف التعليق', 'Delete Comment')}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 8. INBOX MESSAGES & LIVE CHATS */}
                {activeTab === 'messages' && (() => {
                  const filteredMessages = messages.filter(msg => {
                    const q = messageSearchQuery.trim().toLowerCase();
                    const matchesSearch = !q ||
                      msg.name.toLowerCase().includes(q) ||
                      msg.email.toLowerCase().includes(q) ||
                      (msg.phone && msg.phone.includes(q)) ||
                      msg.subject.toLowerCase().includes(q) ||
                      msg.message.toLowerCase().includes(q);
                    
                    const matchesRead = messageReadFilter === 'all' ||
                      (messageReadFilter === 'unread' ? !msg.read : msg.read);

                    return matchesSearch && matchesRead;
                  });

                  return (
                    <div>
                      {/* Header with Subtabs Switcher */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Mail className="h-5 w-5 text-brand-cyan" />
                            {t('إدارة رسائل واستفسارات الطلاب وشات الدعم المباشر', 'Student Messages & Support Live Chats')}
                          </h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {t('يمكنك الاستعلام عن كافة الرسائل الواردة، الرد المباشر، حذف الرسائل غير المرغوبة، والمحادثة المباشرة مع الطلاب.', 'Manage contact inbox, reply directly, delete messages, or live chat with students.')}
                          </p>
                        </div>

                        {/* Subtab Buttons */}
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
                          <button
                            onClick={() => setMessagesSubTab('inbox')}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                              messagesSubTab === 'inbox'
                                ? 'bg-brand-cyan text-white dark:text-slate-950 shadow'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <Mail className="h-4 w-4" />
                            <span>{t('صندوق الوارد (الرسائل)', 'Inbox Messages')}</span>
                            {messages.filter(m => !m.read).length > 0 && (
                              <span className="rounded-full bg-red-500 text-white px-1.5 py-0.2 text-[10px] font-mono animate-pulse">
                                {messages.filter(m => !m.read).length}
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setMessagesSubTab('liveChat');
                              if (!selectedChatStudentId && students.length > 0) {
                                setSelectedChatStudentId(students[0].id);
                              }
                            }}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                              messagesSubTab === 'liveChat'
                                ? 'bg-brand-cyan text-white dark:text-slate-950 shadow'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>{t('مركز المحادثات (Admin Chat Center)', 'Admin Chat Center')}</span>
                          </button>
                        </div>
                      </div>

                      {/* SUBTAB 1: INBOX MESSAGES */}
                      {messagesSubTab === 'inbox' && (
                        <div>
                          {/* Search and Filters Bar */}
                          <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4">
                            <div className="relative flex-1">
                              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
                              <input
                                type="text"
                                value={messageSearchQuery}
                                onChange={e => setMessageSearchQuery(e.target.value)}
                                placeholder={t('البحث باسم الطالب، البريد، الموضوع، أو نص الرسالة...', 'Search by name, email, subject, or message text...')}
                                className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pr-10 pl-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan transition-colors"
                              />
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
                              {[
                                { id: 'all', label: t('الكل', 'All'), count: messages.length },
                                { id: 'unread', label: t('غير مقروءة 🔴', 'Unread'), count: messages.filter(m => !m.read).length },
                                { id: 'read', label: t('مقروءة ✅', 'Read'), count: messages.filter(m => m.read).length },
                              ].map(pill => (
                                <button
                                  key={pill.id}
                                  onClick={() => setMessageReadFilter(pill.id)}
                                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    messageReadFilter === pill.id
                                      ? 'bg-brand-cyan text-white dark:text-slate-950'
                                      : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  <span>{pill.label}</span>
                                  <span className="rounded-full bg-slate-200 dark:bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono">
                                    {pill.count}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Message Cards List */}
                          <div className="space-y-4">
                            {filteredMessages.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                                {t('لا توجد رسائل مطابقة للبحث أو الفلتر المحدد.', 'No messages found matching search or filter.')}
                              </div>
                            ) : (
                              filteredMessages.map(msg => (
                                <div 
                                  key={msg.id} 
                                  className={`rounded-2xl border p-5 text-xs transition-all relative overflow-hidden ${
                                    msg.read 
                                      ? 'bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300' 
                                      : 'bg-brand-cyan/5 border-brand-cyan/30 text-slate-900 dark:text-white shadow-xl shadow-cyan-950/10'
                                  }`}
                                >
                                  {!msg.read && (
                                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-brand-cyan via-amber-400 to-brand-cyan" />
                                  )}

                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-brand-cyan text-sm shadow-inner">
                                        {msg.name ? msg.name.charAt(0) : 'U'}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-sm text-slate-900 dark:text-white">{msg.name}</span>
                                          {!msg.read ? (
                                            <span className="rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold">
                                              {t('جديدة 🔴', 'New')}
                                            </span>
                                          ) : (
                                            <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">
                                              {t('تمت قراءتها ✅', 'Read')}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-3">
                                          <span>✉️ {msg.email}</span>
                                          {msg.phone && <span>📱 {msg.phone}</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                                      {new Date(msg.date).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                    </span>
                                  </div>

                                  <div className="mb-4">
                                    <p className="font-bold text-brand-cyan mb-1.5 text-xs flex items-center gap-1.5">
                                      <span>📌 {t('الموضوع:', 'Subject:')}</span>
                                      <span className="text-slate-900 dark:text-white">{msg.subject}</span>
                                    </p>
                                    <p className="leading-relaxed bg-white dark:bg-slate-950/85 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl text-slate-700 dark:text-slate-200 whitespace-pre-wrap text-xs shadow-inner">
                                      {msg.message}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                                    {!msg.read ? (
                                      <button
                                        onClick={() => handleMarkMessageRead(msg)}
                                        className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-3.5 py-2 text-xs font-black transition-all cursor-pointer shadow-md"
                                      >
                                        <Check className="h-4 w-4" />
                                        {t('تحديد كمقروءة', 'Mark Read')}
                                      </button>
                                    ) : (
                                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                                        {t('مُسجلة كمقروءة', 'Marked as Read')}
                                      </span>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2">
                                      {/* WhatsApp Direct Link if Phone available */}
                                      {msg.phone && (
                                        <a
                                          href={`https://wa.me/${msg.phone.replace(/[^0-9]/g, '')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-3.5 py-2 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                                        >
                                          <Phone className="h-3.5 w-3.5" />
                                          <span>{t('واتساب', 'WhatsApp')}</span>
                                        </a>
                                      )}

                                      {/* Mailto link */}
                                      <a
                                        href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                                        className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-cyan border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                      >
                                        <Send className="h-3.5 w-3.5" />
                                        <span>{t('رد بالبريد', 'Reply Email')}</span>
                                      </a>

                                      {/* Delete Message Button */}
                                      <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        title={t('حذف الرسالة نهائياً من صندوق الوارد', 'Delete Message Permanently')}
                                        className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white px-3.5 py-2 text-xs font-bold transition-all cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>{t('حذف الرسالة', 'Delete Message')}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUBTAB 2: LIVE STUDENT SUPPORT CHAT */}
                      {messagesSubTab === 'liveChat' && (() => {
                        const allChatStudentIds = Array.from(new Set([
                          ...students.map(s => s.id),
                          ...Object.keys(chatThreads)
                        ]));

                        const sortedChatList = allChatStudentIds.map(id => {
                          const st = students.find(s => s.id === id);
                          const thread = chatThreads[id];
                          return {
                            id,
                            name: st?.name || thread?.studentName || id,
                            email: st?.email || thread?.studentEmail || '',
                            unreadCount: thread?.unreadCount || 0,
                            lastMessageText: thread?.lastMessageText,
                            lastMessageTime: thread?.lastMessageTime || 0,
                            isOnline: thread?.isOnline && (Date.now() - (thread?.lastSeen || 0) < 90000),
                          };
                        }).sort((a, b) => {
                          if (b.unreadCount !== a.unreadCount) {
                            return b.unreadCount - a.unreadCount;
                          }
                          return b.lastMessageTime - a.lastMessageTime;
                        });

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[500px]">
                            {/* Left Column: Student Selector List */}
                            <div className="md:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-xs dark:shadow-none p-4 flex flex-col h-[550px]">
                              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4 text-brand-cyan" />
                                {t('جميع المحادثات والطلاب (Admin Chat Center)', 'All Conversations (Admin Chat Center)')}
                              </h3>

                              <div className="overflow-y-auto space-y-2 flex-1 pr-1 custom-scrollbar">
                                {sortedChatList.length === 0 ? (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 p-4 text-center">{t('لا يوجد طلاب أو محادثات حالياً.', 'No students or conversations.')}</p>
                                ) : (
                                  sortedChatList.map(item => (
                                    <button
                                      key={item.id}
                                      onClick={() => {
                                        setSelectedChatStudentId(item.id);
                                        dbService.markChatThreadAsRead(item.id).catch(() => {});
                                      }}
                                      className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                                        selectedChatStudentId === item.id
                                          ? 'bg-brand-cyan/15 border-brand-cyan text-slate-900 dark:text-white shadow-md'
                                          : item.unreadCount > 0
                                            ? 'bg-red-500/10 border-red-500/40 text-white'
                                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full gap-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                                            item.unreadCount > 0 ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-brand-cyan'
                                          }`}>
                                            {item.name.charAt(0)}
                                          </div>
                                          <div className="truncate text-xs">
                                            <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                              <span>{item.name}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate">{item.email}</div>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                          {item.unreadCount > 0 && (
                                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-md animate-pulse">
                                              {item.unreadCount}
                                            </span>
                                          )}
                                          <div className="flex items-center gap-1 text-[10px]">
                                            <span className={`h-2 w-2 rounded-full ${item.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                                            <span className={item.isOnline ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                                              {item.isOnline ? t('متصل', 'Online') : t('غير متصل', 'Offline')}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between w-full text-[11px] text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800/40 mt-0.5">
                                        <div className="truncate flex-1 pr-2">
                                          {item.lastMessageText ? (
                                            <span className="text-slate-700 dark:text-slate-200">💬 {item.lastMessageText}</span>
                                          ) : (
                                            <span className="text-slate-600 italic">{t('لا توجد رسائل بعد...', 'No messages yet...')}</span>
                                          )}
                                        </div>
                                        {item.lastMessageTime > 0 && (
                                          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
                                            {new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Right Column: Chat Dialog Box */}
                            <div className="md:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/85 p-5 flex flex-col h-[550px]">
                              {selectedChatStudentId ? (() => {
                                const currentStudent = students.find(s => s.id === selectedChatStudentId);
                                const thread = chatThreads[selectedChatStudentId];
                                const isOnline = thread?.isOnline && (Date.now() - (thread?.lastSeen || 0) < 90000);

                                return (
                                  <>
                                    {/* Chat Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-cyan/20 font-bold text-brand-cyan text-sm">
                                          {currentStudent ? currentStudent.name.charAt(0) : thread?.studentName ? thread.studentName.charAt(0) : 'S'}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                              {currentStudent ? currentStudent.name : thread?.studentName || t('شات الطالب', 'Student Chat')}
                                            </h3>
                                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-[10px]">
                                              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                              <span className={isOnline ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-600 dark:text-slate-400'}>
                                                {isOnline ? t('متصل الآن', 'Online now') : t('غير متصل', 'Offline')}
                                              </span>
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                                            {currentStudent?.email || thread?.studentEmail} {currentStudent?.phone ? `• ${currentStudent.phone}` : ''}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => dbService.markChatThreadAsRead(selectedChatStudentId).catch(() => {})}
                                          title={t('تحديد كمقروء (لا يحذف الرسائل)', 'Mark as read (Does not delete messages)')}
                                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          <span>{t('تحديد كمقروء', 'Mark Read')}</span>
                                        </button>

                                        <button
                                          onClick={handleClearStudentChat}
                                          title={t('حذف المحادثة بالكامل بعد التأكيد', 'Delete entire conversation')}
                                          className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          <span>{t('حذف المحادثة', 'Delete Chat')}</span>
                                        </button>
                                      </div>
                                    </div>

                                  {/* Chat Messages Stream */}
                                  <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2 custom-scrollbar">
                                    {liveChatMessages.length === 0 ? (
                                      <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs text-center p-6">
                                        <MessageSquare className="h-8 w-8 mb-2 opacity-40 text-brand-cyan" />
                                        <p>{t('لا توجد رسائل سابقة في هذه المحادثة.', 'No previous messages in this chat thread.')}</p>
                                        <p className="text-[10px] text-slate-600 mt-1">{t('اكتب رسالتك بالأسفل لبدء الشات مع الطالب.', 'Type below to start chatting with the student.')}</p>
                                      </div>
                                    ) : (
                                      liveChatMessages.map(cmsg => {
                                        const isAdmin = cmsg.senderId === 'admin' || cmsg.senderName.includes('Admin') || cmsg.senderName.includes('إدارة');

                                        return (
                                          <div
                                            key={cmsg.id}
                                            className={`flex flex-col group ${isAdmin ? 'items-end' : 'items-start'}`}
                                          >
                                            <div className="flex items-center gap-1 mb-1">
                                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                                {cmsg.senderName}
                                              </span>
                                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                                                {new Date(cmsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-2 max-w-[80%]">
                                              {/* Delete Individual Chat Message Button */}
                                              <button
                                                onClick={() => handleDeleteChatMessage(cmsg.id)}
                                                title={t('حذف هذه الرسالة', 'Delete Message')}
                                                className="opacity-0 group-hover:opacity-100 text-red-600 dark:text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>

                                              <div
                                                className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                                                  isAdmin
                                                    ? 'bg-brand-cyan text-white dark:text-slate-950 font-medium rounded-tl-none shadow-md'
                                                    : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-tr-none'
                                                }`}
                                              >
                                                {cmsg.text}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Chat Reply Input Form */}
                                  <form onSubmit={handleSendAdminReply} className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                                    <input
                                      type="text"
                                      value={adminReplyText}
                                      onChange={e => setAdminReplyText(e.target.value)}
                                      placeholder={t('اكتب رد الإدارة / المساعد للطالب هنا...', 'Type admin reply to student...')}
                                      className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan transition-colors"
                                    />
                                    <button
                                      type="submit"
                                      disabled={!adminReplyText.trim()}
                                      className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light disabled:opacity-50 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer"
                                    >
                                      <Send className="h-4 w-4" />
                                      <span>{t('إرسال', 'Send')}</span>
                                    </button>
                                  </form>
                                </>
                              );
                            })() : (
                              <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
                                {t('يرجى اختيار طالب من القائمة الجانبية لبدء الشات.', 'Please select a student from the sidebar to start chat.')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    </div>
                  );
                })()}

                {/* 9. WEBSITE SETTINGS */}
                {activeTab === 'settings' && settingsForm && (
                  <form onSubmit={handleSettingsSave} className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <Settings className="h-5 w-5 text-brand-cyan" />
                      {t('تخصيص بيانات وإعدادات المنصة الجامعية', 'University Platform Settings')}
                    </h2>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 text-xs text-slate-700 dark:text-slate-300">
                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اسم المنصة (العربية)', 'Platform Name (Arabic)')}</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.websiteNameAr}
                          onChange={e => setSettingsForm({ ...settingsForm, websiteNameAr: e.target.value })}
                          className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اسم المنصة (الإنجليزية)', 'Platform Name (English)')}</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.websiteNameEn}
                          onChange={e => setSettingsForm({ ...settingsForm, websiteNameEn: e.target.value })}
                          className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('رقم واتساب المباشر (كود الدولة أولاً)', 'Direct WhatsApp Phone Number (With Country Code)')}</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.whatsapp}
                          onChange={e => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                          className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('رابط التليجرام المباشر', 'Telegram Direct Channel/Link')}</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.telegram}
                          onChange={e => setSettingsForm({ ...settingsForm, telegram: e.target.value })}
                          className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('وصف محركات البحث SEO', 'SEO Meta Description')}</label>
                        <textarea
                          rows={3}
                          value={settingsForm.seoDescription}
                          onChange={e => setSettingsForm({ ...settingsForm, seoDescription: e.target.value })}
                          className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الكلمات المفتاحية لمستكشفي الويب (مفصولة بفواصل)', 'SEO Meta Keywords (comma separated)')}</label>
                        <input
                          type="text"
                          value={settingsForm.seoKeywords}
                          onChange={e => setSettingsForm({ ...settingsForm, seoKeywords: e.target.value })}
                          className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/20"
                    >
                      {actionLoading ? t('جاري الحفظ والمزامنة...', 'Saving changes...') : t('حفظ الإعدادات بالكامل', 'Save Website Settings')}
                    </button>

                    {/* Security & Global User Logout Section */}
                    <div className="mt-8 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                      <h3 className="text-base font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                        <LogOut className="h-5 w-5" />
                        {t('الأمان وتسجيل الخروج الجماعي للحسابات', 'Security & Global User Logout')}
                      </h3>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                        {t(
                          'إذا أردت إنهاء جلسات الدخول وإخراج جميع الطلاب والحسابات المسجلة من المنصة على جميع أجهزتهم ومتصفحاتهم فوراً (مع الاحتفاظ ببياناتهم ومقرراتهم المسجلة كما هي دون حذف)، يمكنك استخدام هذا الزر. سيطلب منهم النظام تسجيل الدخول ببريدهم وكلمة المرور من جديد.',
                          'If you want to immediately terminate all active sessions and log out all student accounts across all devices and browsers (without deleting their accounts or subject enrollments), use this button. They will be required to log in again.'
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={handleForceLogoutAll}
                        disabled={actionLoading}
                        className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-3 transition-all cursor-pointer shadow-lg shadow-amber-950/20"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t('إخراج جميع الحسابات من المنصة الآن', 'Log Out All Accounts Across Platform')}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* 10. PLATFORM ADMINS */}
                {activeTab === 'admins' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-5 w-5 text-brand-cyan" />
                        {t('إدارة حسابات المسؤولين والصلاحيات', 'Platform Administrators & Permissions')}
                      </h2>
                      {currentAdmin?.role === 'super' ? (
                        <button
                          onClick={openAddModal}
                          className="flex items-center gap-1.5 rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          {t('إضافة مسؤول جديد', 'Add Administrator')}
                        </button>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400">{t('الصلاحية المتاحة: عرض فقط', 'View-only authorization')}</span>
                      )}
                    </div>

                    <div className="space-y-4">
                      {admins.map(adm => (
                        <div key={adm.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-xs dark:shadow-none p-4 flex items-center justify-between text-xs text-slate-900 dark:text-white">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-lg">
                              <Shield className="h-5 w-5 text-brand-cyan" />
                            </span>
                            <div>
                              <p className="font-bold text-sm">{adm.name}</p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">{adm.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              adm.role === 'super' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {adm.role === 'super' ? t('مدير عام', 'Super Admin') : t('محرر', 'Editor')}
                            </span>
                            
                            {currentAdmin?.role === 'super' && adm.email !== currentAdmin.email && (
                              <button
                                onClick={() => handleDeleteAdmin(adm.id)}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-300 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DEDICATED EDUCATIONAL CONTENT MODALS (Lectures, Sections, Exams, Sheets) */}
      {activeContentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-white dark:bg-brand-dark/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-cyan-500/30 bg-white dark:bg-slate-950 p-4 sm:p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setActiveContentModal(null);
                setEditingContentId(null);
              }}
              className="absolute top-3 left-3 sm:top-4 sm:left-4 rounded-xl bg-slate-100 dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* 5. QUESTION BANK FORM MODAL */}
            {activeContentModal === 'question_bank' && (
              <form onSubmit={handleSaveQuestionBankItem} className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-brand-cyan" />
                    <span>{editingContentId ? t('تعديل سؤال في بنك الأسئلة', 'Edit Question Bank Item') : t('إضافة سؤال إلى بنك الأسئلة', 'Add Question Bank Item')}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('المادة الدراسية', 'Subject')}</label>
                    <select
                      value={questionBankForm.subject}
                      onChange={e => setQuestionBankForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                    >
                      {['Physics', 'Python', 'IT Essentials', 'Mathematics', 'Cyber Security', 'English'].map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('الموضوع / الوحدة', 'Topic')}</label>
                    <input
                      type="text"
                      value={questionBankForm.topic}
                      onChange={e => setQuestionBankForm(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder={t('مثال: Functions / Kinematics', 'Topic...')}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('النقاط / الدرجة', 'Points')}</label>
                    <input
                      type="number"
                      min={1}
                      value={questionBankForm.points}
                      onChange={e => setQuestionBankForm(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('نوع السؤال', 'Question Type')}</label>
                  <select
                    value={questionBankForm.type}
                    onChange={e => setQuestionBankForm(prev => ({ ...prev, type: e.target.value as any, correctAnswerIndex: 0 }))}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="multiple_choice">{t('اختيار من متعدد (MCQ)', 'Multiple Choice')}</option>
                    <option value="true_false">{t('صح أم خطأ (True / False)', 'True / False')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('نص السؤال', 'Question Text')}</label>
                  <textarea
                    rows={2}
                    required
                    value={questionBankForm.questionText}
                    onChange={e => setQuestionBankForm(prev => ({ ...prev, questionText: e.target.value }))}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {questionBankForm.type === 'multiple_choice' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {questionBankForm.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="qbCorrect"
                          checked={questionBankForm.correctAnswerIndex === idx}
                          onChange={() => setQuestionBankForm(prev => ({ ...prev, correctAnswerIndex: idx }))}
                          className="accent-emerald-500 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const next = [...questionBankForm.options];
                            next[idx] = e.target.value;
                            setQuestionBankForm(prev => ({ ...prev, options: next }));
                          }}
                          placeholder={`${t('اختيار', 'Option')} ${idx + 1}`}
                          className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-6 text-xs font-bold text-slate-900 dark:text-white">
                    {[t('صح (True)', 'True'), t('خطأ (False)', 'False')].map((lbl, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="qbTrueFalse"
                          checked={questionBankForm.correctAnswerIndex === idx}
                          onChange={() => setQuestionBankForm(prev => ({ ...prev, correctAnswerIndex: idx }))}
                          className="accent-emerald-500 cursor-pointer"
                        />
                        <span>{lbl}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('شرح الإجابة الصحيحة (اختياري)', 'Explanation (Optional)')}</label>
                  <input
                    type="text"
                    value={questionBankForm.explanation}
                    onChange={e => setQuestionBankForm(prev => ({ ...prev, explanation: e.target.value }))}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setActiveContentModal(null)} className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-2.5 text-xs font-black cursor-pointer">{t('حفظ السؤال', 'Save Question')}</button>
                </div>
              </form>
            )}

            {/* 6. WEEKLY SCHEDULE FORM MODAL */}
            {activeContentModal === 'schedule' && (
              <form onSubmit={handleSaveScheduleItem} className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-brand-cyan" />
                    <span>{editingContentId ? t('تعديل موعد في الجدول', 'Edit Schedule Slot') : t('إضافة موعد بالجدول الأسبوعي', 'Add Timetable Slot')}</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('المادة الدراسية', 'Subject')}</label>
                    <select
                      value={scheduleForm.subject}
                      onChange={e => setScheduleForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                    >
                      {['Physics', 'Python', 'IT Essentials', 'Mathematics', 'Cyber Security', 'English'].map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('نوع الحصة', 'Session Type')}</label>
                    <select
                      value={scheduleForm.itemType}
                      onChange={e => setScheduleForm(prev => ({ ...prev, itemType: e.target.value as any }))}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="lecture">{t('محاضرة نظرية', 'Lecture')}</option>
                      <option value="section">{t('سكشن عملي / معمل', 'Lab Section')}</option>
                      <option value="exam">{t('امتحان / تقييم', 'Exam')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('عنوان المحاضرة / السكشن بالجدول', 'Session Title')}</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.title}
                    onChange={e => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('مثال: محاضرة البرمجة بلغة بايثون', 'Session title...')}
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('اليوم', 'Day')}</label>
                    <select
                      value={scheduleForm.dayOfWeek}
                      onChange={e => setScheduleForm(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Saturday">{t('السبت', 'Saturday')}</option>
                      <option value="Sunday">{t('الأحد', 'Sunday')}</option>
                      <option value="Monday">{t('الإثنين', 'Monday')}</option>
                      <option value="Tuesday">{t('الثلاثاء', 'Tuesday')}</option>
                      <option value="Wednesday">{t('الأربعاء', 'Wednesday')}</option>
                      <option value="Thursday">{t('الخميس', 'Thursday')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('من الساعة', 'Start Time')}</label>
                    <input
                      type="text"
                      required
                      value={scheduleForm.startTime}
                      onChange={e => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                      placeholder="09:00"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('إلى الساعة', 'End Time')}</label>
                    <input
                      type="text"
                      required
                      value={scheduleForm.endTime}
                      onChange={e => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                      placeholder="11:00"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('القاعة / المعمل', 'Location / Lab')}</label>
                    <input
                      type="text"
                      value={scheduleForm.location}
                      onChange={e => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('المحاضر / المعيد', 'Instructor')}</label>
                    <input
                      type="text"
                      value={scheduleForm.instructor}
                      onChange={e => setScheduleForm(prev => ({ ...prev, instructor: e.target.value }))}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setActiveContentModal(null)} className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-2.5 text-xs font-black cursor-pointer">{t('حفظ الموعد', 'Save Schedule')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL SYSTEM (Add / Edit Forms for everything) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-white dark:bg-brand-dark/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 left-3 sm:top-4 sm:left-4 rounded-lg bg-slate-100 dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-5 sm:mb-6 border-b border-slate-200 dark:border-slate-800 pb-3">
              {modalType === 'add' ? t('إضافة عنصر جديد', 'Add New Record') : modalType === 'duplicate' ? t('تكرار المقرر الدراسي', 'Duplicate Subject Record') : t('تعديل البيانات', 'Modify Record')}
            </h3>

            {/* Form Routing */}
            {(activeTab === 'courses' || activeTab === 'dashboard') && (
              <form onSubmit={handleCourseSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('العنوان بالعربية', 'Arabic Title')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('مثال: برمجة بايثون – Python Programming - الفرقة الأولى IT', 'e.g. Python Programming - Year 1 IT')}
                      value={courseForm.titleAr}
                      onChange={e => setCourseForm({ ...courseForm, titleAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('العنوان بالإنجليزية (اختياري)', 'English Title (Optional)')}</label>
                    <input
                      type="text"
                      placeholder="e.g. Python Programming - Year 1 IT"
                      value={courseForm.titleEn}
                      onChange={e => setCourseForm({ ...courseForm, titleEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الوصف بالعربية', 'Arabic Description')}</label>
                    <textarea
                      rows={3}
                      placeholder="اكتب وصف المقرر الدراسي بالتفصيل..."
                      value={courseForm.descriptionAr}
                      onChange={e => setCourseForm({ ...courseForm, descriptionAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الوصف بالإنجليزية (اختياري)', 'English Description (Optional)')}</label>
                    <textarea
                      rows={3}
                      placeholder="Course description in English..."
                      value={courseForm.descriptionEn}
                      onChange={e => setCourseForm({ ...courseForm, descriptionEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('المشرف الأكاديمي المسؤول', 'Academic Instructor')}</label>
                    <input
                      type="text"
                      placeholder="Eng/Mohamed abdal tawab"
                      value={courseForm.teacherName}
                      onChange={e => setCourseForm({ ...courseForm, teacherName: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>

                  {/* Dropdown 1: Grade Selection */}
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الصف الدراسي', 'Academic Grade')}</label>
                    <select
                      value={courseForm.grade || courseForm.categoryId || 'year1'}
                      onChange={e => {
                        const selectedGradeCode = e.target.value;
                        const gradeAr = getGradeName(selectedGradeCode, 'ar');
                        const curSubject = courseForm.subject || courseForm.subjectAr || 'الفيزياء';
                        setCourseForm(prev => ({
                          ...prev,
                          grade: selectedGradeCode,
                          categoryId: selectedGradeCode,
                          titleAr: `${curSubject} - ${gradeAr}`,
                          titleEn: `${curSubject} - ${getGradeName(selectedGradeCode, 'en')}`
                        }));
                      }}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    >
                      {ACADEMIC_GRADES.map(g => (
                        <option key={g.id} value={g.id}>
                          {t(g.nameAr, g.nameEn)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown 2: Subject Selection */}
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('المادة الدراسية', 'Subject')}</label>
                    <select
                      value={
                        ACADEMIC_SUBJECTS.some(s => s.nameAr === (courseForm.subject || courseForm.subjectAr))
                          ? (courseForm.subject || courseForm.subjectAr || 'الفيزياء')
                          : ((courseForm.subject || courseForm.subjectAr) ? 'other' : 'الفيزياء')
                      }
                      onChange={e => {
                        const val = e.target.value;
                        if (val !== 'other') {
                          const found = ACADEMIC_SUBJECTS.find(s => s.nameAr === val);
                          const subjAr = found ? found.nameAr : val;
                          const subjEn = found ? found.nameEn : val;
                          const curGrade = courseForm.grade || courseForm.categoryId || 'year1';
                          const gradeAr = getGradeName(curGrade, 'ar');
                          setCourseForm(prev => ({
                            ...prev,
                            subject: subjAr,
                            subjectAr: subjAr,
                            subjectEn: subjEn,
                            titleAr: `${subjAr} - ${gradeAr}`,
                            titleEn: `${subjEn} - ${getGradeName(curGrade, 'en')}`
                          }));
                        } else {
                          setCourseForm(prev => ({
                            ...prev,
                            subject: 'other_custom',
                            subjectAr: prev.subjectAr || 'مادة جديدة'
                          }));
                        }
                      }}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    >
                      {ACADEMIC_SUBJECTS.map(s => (
                        <option key={s.id} value={s.nameAr}>
                          {t(s.nameAr, s.nameEn)}
                        </option>
                      ))}
                      <option value="other">{t('مادة أخرى (إدخال يدوي)', 'Other (Custom input)')}</option>
                    </select>
                  </div>

                  {/* Custom Subject Text input if other selected */}
                  {(courseForm.subject === 'other_custom' || !ACADEMIC_SUBJECTS.some(s => s.nameAr === (courseForm.subject || courseForm.subjectAr))) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="block mb-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">{t('اسم المادة يدوياً (عربي)', 'Custom Subject Name (AR)')}</label>
                        <input
                          type="text"
                          placeholder="مثال: الفلسفة والمنطق"
                          value={courseForm.subjectAr || ''}
                          onChange={e => {
                            const val = e.target.value;
                            const curGrade = courseForm.grade || courseForm.categoryId || 'year1';
                            const gradeAr = getGradeName(curGrade, 'ar');
                            setCourseForm(prev => ({
                              ...prev,
                              subject: val,
                              subjectAr: val,
                              titleAr: `${val} - ${gradeAr}`
                            }));
                          }}
                          className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan text-xs"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">{t('اسم المادة (إنجليزي)', 'Custom Subject Name (EN)')}</label>
                        <input
                          type="text"
                          placeholder="e.g. Logic & Philosophy"
                          value={courseForm.subjectEn || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setCourseForm(prev => ({
                              ...prev,
                              subjectEn: val
                            }));
                          }}
                          className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="sm:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-700 dark:text-emerald-300 font-bold">
                    {t('نظام المقرر: متاح مجاناً 100% لجميع طلاب قسم IT المعتمدين (بدون أي رسوم أو كلمات مرور).', 'Course Access Model: 100% Free for all approved IT Department students (no fees or passwords).')}
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('مدة الدورة الإجمالية', 'Total Duration')}</label>
                    <input
                      type="text"
                      placeholder="20 ساعة"
                      value={courseForm.duration}
                      onChange={e => setCourseForm({ ...courseForm, duration: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('عدد الدروس والمقاطع', 'Lessons Count')}</label>
                    <input
                      type="number"
                      placeholder="15"
                      value={courseForm.lessonsCount}
                      onChange={e => setCourseForm({ ...courseForm, lessonsCount: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <FileUploadField
                      label={t('صورة الغلاف (Thumbnail)', 'Course Thumbnail Image')}
                      value={courseForm.thumbnailUrl}
                      onChange={url => setCourseForm(prev => ({ ...prev, thumbnailUrl: url }))}
                      accept="image/*"
                      folder="images/thumbnails"
                      courseId={selectedId}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <FileUploadField
                      label={t('صورة البانر (Banner Image)', 'Course Banner Image')}
                      value={courseForm.bannerUrl || ''}
                      onChange={url => setCourseForm(prev => ({ ...prev, bannerUrl: url }))}
                      accept="image/*"
                      folder="images/banners"
                      courseId={selectedId}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <VideoHostingUploader
                      value={courseForm.videoUrl || ''}
                      onChange={(url) => setCourseForm(prev => ({ ...prev, videoUrl: url }))}
                      courseId={selectedId}
                      onPreviewUrl={(url) => setAdminVideoPreviewUrl(url)}
                      label={t('فيديو تعريفي للمقرر', 'Subject Intro Video')}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <FileUploadField
                      label={t('ملخص المنهج (PDF)', 'Syllabus PDF')}
                      value={courseForm.pdfUrl || ''}
                      onChange={url => setCourseForm(prev => ({ ...prev, pdfUrl: url }))}
                      accept="application/pdf"
                      folder="pdfs"
                      courseId={selectedId}
                    />
                  </div>
                </div>

                {/* قسم محتوى المقرر (الوحدات والموضوعات) */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-brand-cyan" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">{t('محتوى المقرر (الوحدات والموضوعات)', 'Subject Syllabus (Units & Topics)')}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUnitIndex(-1);
                        setUnitForm({ title: '', description: '', order: (courseForm.units?.length || 0) + 1 });
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan px-3 py-1.5 text-xs font-bold hover:bg-brand-cyan/30 transition-all cursor-pointer shadow"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{t('إضافة وحدة جديدة', 'Add New Unit')}</span>
                    </button>
                  </div>

                  {/* Unit Add/Edit Modal or Inline Form */}
                  {editingUnitIndex !== null && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-brand-cyan/40 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="font-bold text-brand-cyan text-sm">
                          {editingUnitIndex === -1 ? t('إضافة وحدة جديدة', 'Add New Unit') : t('تعديل الوحدة', 'Edit Unit')}
                        </span>
                        <button type="button" onClick={() => setEditingUnitIndex(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block mb-1 font-semibold text-slate-900 dark:text-white text-xs">{t('عنوان الوحدة*', 'Unit Title*')}</label>
                          <input
                            type="text"
                            required
                            placeholder={t('مثال: الوحدة الأولى: البناء الكيميائي والمادة', 'e.g. Unit 1: Chemistry and Atoms')}
                            value={unitForm.title}
                            onChange={e => setUnitForm({ ...unitForm, title: e.target.value })}
                            className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-brand-cyan"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-semibold text-slate-900 dark:text-white text-xs">{t('ترتيب الوحدة', 'Unit Order')}</label>
                          <input
                            type="number"
                            value={unitForm.order}
                            onChange={e => setUnitForm({ ...unitForm, order: parseInt(e.target.value) || 1 })}
                            className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-brand-cyan"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block mb-1 font-semibold text-slate-900 dark:text-white text-xs">{t('وصف مختصر (اختياري)', 'Short Description (Optional)')}</label>
                          <input
                            type="text"
                            placeholder={t('مثال: ٤ محاضرات نظرية وسكاشن تدريب عملي في المعمل', 'e.g. 4 lectures and practical lab sessions')}
                            value={unitForm.description}
                            onChange={e => setUnitForm({ ...unitForm, description: e.target.value })}
                            className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-brand-cyan"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingUnitIndex(null)}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          {t('إلغاء', 'Cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={handleAddOrUpdateUnit}
                          className="rounded-lg bg-brand-cyan hover:bg-brand-cyan-light px-4 py-1.5 text-xs font-bold text-white dark:text-slate-950 cursor-pointer shadow"
                        >
                          {t('حفظ الوحدة', 'Save Unit')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Units List */}
                  <div className="space-y-3">
                    {(!courseForm.units || courseForm.units.length === 0) ? (
                      <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
                        {t('لا توجد وحدات دراسية مضافة حتى الآن. اضغط على "إضافة وحدة جديدة" للبدء.', 'No units added yet. Click "Add New Unit" to get started.')}
                      </div>
                    ) : (
                      courseForm.units.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map((unit, uIdx) => {
                        const originalUnitIdx = courseForm.units!.findIndex(u => (u.id && u.id === unit.id) || u === unit);

                        return (
                          <div key={unit.id || uIdx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3">
                            {/* Unit Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-cyan/20 text-brand-cyan font-bold font-mono text-xs">
                                  {unit.order || uIdx + 1}
                                </span>
                                <div>
                                  <h5 className="font-bold text-slate-900 dark:text-white text-sm">{unit.title}</h5>
                                  {unit.description && <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{unit.description}</p>}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLessonUnitIndex(originalUnitIdx);
                                    setEditingLessonIndex(-1);
                                    setLessonForm({
                                      title: '',
                                      videoUrl: '',
                                      duration: '15:00',
                                      type: 'video',
                                      pdfUrl: '',
                                      order: (unit.lessons?.length || 0) + 1
                                    });
                                  }}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 px-2.5 py-1 text-xs font-bold transition-all cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>{t('إضافة درس', 'Add Lesson')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUnitIndex(originalUnitIdx);
                                    setUnitForm({ title: unit.title, description: unit.description || '', order: unit.order || uIdx + 1 });
                                  }}
                                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                  title={t('تعديل الوحدة', 'Edit Unit')}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUnit(originalUnitIdx)}
                                  className="p-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 cursor-pointer"
                                  title={t('حذف الوحدة', 'Delete Unit')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Lesson Add/Edit Form inside Unit */}
                            {editingLessonUnitIndex === originalUnitIdx && editingLessonIndex !== null && (
                              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-emerald-500/40 space-y-3 my-2">
                                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                                    {editingLessonIndex === -1 ? t('إضافة درس جديد للوحدة', 'Add New Lesson to Unit') : t('تعديل الدرس', 'Edit Lesson')}
                                  </span>
                                  <button type="button" onClick={() => { setEditingLessonIndex(null); setEditingLessonUnitIndex(null); }} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                  <div className="sm:col-span-2">
                                    <label className="block mb-1 font-semibold text-slate-900 dark:text-white">{t('عنوان الدرس*', 'Lesson Title*')}</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder={t('مثال: الدرس الأول: تركيب المادة', 'e.g. Lesson 1: Atomic Structure')}
                                      value={lessonForm.title}
                                      onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                                      className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block mb-1 font-semibold text-slate-900 dark:text-white">{t('نوع الدرس', 'Lesson Type')}</label>
                                    <select
                                      value={lessonForm.type}
                                      onChange={e => setLessonForm({ ...lessonForm, type: e.target.value as LessonType })}
                                      className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                    >
                                      <option value="video">{t('فيديو', 'Video')}</option>
                                      <option value="pdf">{t('ملف PDF', 'PDF File')}</option>
                                      <option value="quiz">{t('اختبار', 'Quiz')}</option>
                                      <option value="assignment">{t('تكليف دراسي', 'Assignment')}</option>
                                    </select>
                                  </div>
                                                                    <div className="sm:col-span-2">
                                    <VideoHostingUploader
                                      value={lessonForm.videoUrl || ''}
                                      onChange={(url) => setLessonForm(prev => ({ ...prev, videoUrl: url }))}
                                      onFileSelect={(file) => {
                                        const autoTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
                                        setLessonForm(prev => ({
                                          ...prev,
                                          title: prev.title.trim() ? prev.title : autoTitle
                                        }));
                                      }}
                                      courseId={selectedId}
                                      lessonId={lessonForm.id || 'lesson'}
                                      onPreviewUrl={(url) => setAdminVideoPreviewUrl(url)}
                                      label={t('فيديو الدرس', 'Lesson Video')}
                                    />
                                  </div>
                                  <div>
                                    <label className="block mb-1 font-semibold text-slate-900 dark:text-white">{t('طبيعة المحتوى', 'Content Type')}</label>
                                    <select
                                      value={lessonForm.isSection ? "section" : (lessonForm.wordUrl ? "word" : (lessonForm.pdfUrl ? "pdf" : "lecture"))}
                                      onChange={e => {
                                        const val = e.target.value;
                                        if (val === "section" || val === "word") {
                                          setLessonForm(prev => ({ ...prev, isSection: true, type: "word" }));
                                        } else if (val === "pdf") {
                                          setLessonForm(prev => ({ ...prev, isSection: false, type: "pdf" }));
                                        } else {
                                          setLessonForm(prev => ({ ...prev, isSection: false, type: "video" }));
                                        }
                                      }}
                                      className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                                    >
                                      <option value="lecture">📖 {t('محاضرة نظرية (Lecture / PDF)', 'Theoretical Lecture (PDF/Video)')}</option>
                                      <option value="section">🔬 {t('سكشن عملي / معمل (Lab Section / Word)', 'Practical Lab Section (Word/Code)')}</option>
                                      <option value="sheet">📑 {t('شيت تمارين / مرجع (Sheet / Reference)', 'Problem Sheet / Reference')}</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block mb-1 font-semibold text-slate-900 dark:text-white">{t('مدة المحاضرة / السكشن', 'Duration')}</label>
                                    <input
                                      type="text"
                                      placeholder="45:00"
                                      value={lessonForm.duration}
                                      onChange={e => setLessonForm({ ...lessonForm, duration: e.target.value })}
                                      className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <div className="sm:col-span-2 bg-blue-950/20 border border-blue-900/40 rounded-xl p-3 space-y-2">
                                    <label className="block font-bold text-blue-700 dark:text-blue-300 text-xs flex items-center gap-1.5">
                                      <span>📝</span>
                                      <span>{t('ملف وورد للسكشن أو التقرير (.docx / .doc) - اختياري', 'Word Lab Sheet / Document (.docx / .doc) - Optional')}</span>
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <input
                                        type="text"
                                        placeholder="https://example.com/sheet.docx"
                                        value={lessonForm.wordUrl || ""}
                                        onChange={e => setLessonForm({ ...lessonForm, wordUrl: e.target.value })}
                                        className="flex-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                                      />
                                      <FileUploadField
                                        label={t('رفع ملف Word (.docx / .doc)', 'Upload Word (.docx)')}
                                        value={lessonForm.wordUrl || ""}
                                        onChange={url => setLessonForm(prev => ({ ...prev, wordUrl: url, isSection: true }))}
                                        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        folder="word_sheets"
                                        courseId={selectedId}
                                      />
                                    </div>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block mb-1 font-semibold text-slate-900 dark:text-white">{t('رابط PDF (اختياري)', 'PDF URL (Optional)')}</label>
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        placeholder="https://example.com/file.pdf"
                                        value={lessonForm.pdfUrl}
                                        onChange={e => setLessonForm({ ...lessonForm, pdfUrl: e.target.value })}
                                        className="flex-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                                      />
                                     <FileUploadField
                                       label={t('ملف PDF للدرس (اختياري)', 'Lesson PDF File (Optional)')}
                                       value={lessonForm.pdfUrl || ''}
                                       onChange={url => setLessonForm(prev => ({ ...prev, pdfUrl: url }))}
                                       accept="application/pdf"
                                       folder="pdfs"
                                       courseId={selectedId}
                                     />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block mb-1 font-semibold text-slate-900 dark:text-white">{t('ترتيب الدرس', 'Order')}</label>
                                    <input
                                      type="number"
                                      value={lessonForm.order}
                                      onChange={e => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
                                      className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => { setEditingLessonIndex(null); setEditingLessonUnitIndex(null); }}
                                    className="rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                  >
                                    {t('إلغاء', 'Cancel')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAddOrUpdateLesson}
                                    className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-1.5 text-xs font-bold text-slate-950 cursor-pointer shadow"
                                  >
                                    {t('حفظ الدرس', 'Save Lesson')}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Lessons List inside Unit */}
                            <div className="space-y-1.5 pt-1">
                              {(!unit.lessons || unit.lessons.length === 0) ? (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic py-1 px-2">{t('لا توجد دروس مضافة في هذه الوحدة حتى الآن.', 'No lessons added in this unit yet.')}</p>
                              ) : (
                                unit.lessons.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map((lsn, lIdx) => {
                                  const originalLessonIdx = unit.lessons.findIndex(l => (l.id && l.id === lsn.id) || l === lsn);
                                  return (
                                    <div key={lsn.id || lIdx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/60 text-xs">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono shrink-0">#{lsn.order || lIdx + 1}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-brand-cyan font-semibold shrink-0">
                                          {lsn.wordUrl ? "📝 DOCX وورد" : lsn.pdfUrl ? "📕 PDF محاضرة" : lsn.isSection ? t("🔬 سكشن عملي", "Lab Section") : lsn.type === "video" ? t("▶️ فيديو", "Video") : lsn.type}
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{lsn.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {lsn.duration && <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">{lsn.duration}</span>}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingLessonUnitIndex(originalUnitIdx);
                                            setEditingLessonIndex(originalLessonIdx);
                                            setLessonForm({
                                              title: lsn.title,
                                              videoUrl: lsn.videoUrl || '',
                                              duration: lsn.duration || '45:00',
                                              type: lsn.type || 'video',
                                              pdfUrl: lsn.pdfUrl || '',
                                              wordUrl: lsn.wordUrl || '',
                                              isSection: !!lsn.isSection,
                                              order: lsn.order || lIdx + 1
                                            });
                                          }}
                                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                          title={t('تعديل الدرس', 'Edit Lesson')}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteLesson(originalUnitIdx, originalLessonIdx)}
                                          className="p-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 cursor-pointer"
                                          title={t('حذف الدرس', 'Delete Lesson')}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Additional Checkboxes */}
                <div className="flex flex-wrap gap-6 border-t border-slate-200 dark:border-slate-900 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 dark:text-white">
                    <input
                      type="checkbox"
                      checked={courseForm.featured}
                      onChange={e => setCourseForm({ ...courseForm, featured: e.target.checked })}
                      className="h-4 w-4 rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-brand-cyan"
                    />
                    <span>{t('مقرر مميز (Hero Section)', 'Featured Subject')}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 dark:text-white">
                    <input
                      type="checkbox"
                      checked={courseForm.popular}
                      onChange={e => setCourseForm({ ...courseForm, popular: e.target.checked })}
                      className="h-4 w-4 rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-brand-cyan"
                    />
                    <span>{t('مقرر أساسي (بقعة الضوء)', 'Popular Subject')}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 dark:text-white">
                    <input
                      type="checkbox"
                      checked={courseForm.published}
                      onChange={e => setCourseForm({ ...courseForm, published: e.target.checked })}
                      className="h-4 w-4 rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-brand-cyan"
                    />
                    <span>{t('نشر فوراً لطلاب القسم', 'Publish Subject Immediately')}</span>
                  </label>

                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/20"
                  >
                    {actionLoading ? t('جاري الحفظ المزامنة...', 'Saving...') : t('تأكيد الحفظ والمزامنة', 'Confirm Save')}
                  </button>
                </div>
              </form>
            )}

            {/* Category Form modal */}
            {activeTab === 'categories' && (
              <form onSubmit={handleCategorySubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اسم المرحلة بالعربية', 'Arabic Name')}</label>
                    <input
                      type="text"
                      required
                      value={categoryForm.nameAr}
                      onChange={e => setCategoryForm({ ...categoryForm, nameAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اسم المرحلة بالإنجليزية (اختياري)', 'English Name (Optional)')}</label>
                    <input
                      type="text"
                      value={categoryForm.nameEn}
                      onChange={e => setCategoryForm({ ...categoryForm, nameEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FileUploadField
                      label={t('صورة المرحلة الدراسية', 'Category Image')}
                      value={categoryForm.imageUrl}
                      onChange={url => setCategoryForm(prev => ({ ...prev, imageUrl: url }))}
                      accept="image/*"
                      folder="categories"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اللون المميز (Tailwind Class/Color)', 'Highlight Color')}</label>
                    <select
                      value={categoryForm.color}
                      onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    >
                      <option value="cyan">Cyan</option>
                      <option value="emerald">Emerald</option>
                      <option value="indigo">Indigo</option>
                      <option value="violet">Violet</option>
                      <option value="amber">Amber</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold">{t('تأكيد الحفظ', 'Confirm Save')}</button>
                </div>
              </form>
            )}

            {/* Student Form modal */}
            {activeTab === 'students' && (
              <form onSubmit={handleStudentSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اسم الطالب بالكامل', 'Student Full Name')}</label>
                    <input
                      type="text"
                      required
                      value={studentForm.name}
                      onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('البريد الإلكتروني للولوج', 'Email Address')}</label>
                    <input
                      type="email"
                      required
                      value={studentForm.email}
                      onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('رقم الموبايل للتواصل', 'Phone Number')}</label>
                    <input
                      type="text"
                      required
                      value={studentForm.phone}
                      onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الحالة الدراسية', 'Account Status')}</label>
                    <select
                      value={studentForm.status}
                      onChange={e => setStudentForm({ ...studentForm, status: e.target.value as 'active' | 'suspended' })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    >
                      <option value="active">{t('مفعل', 'Active')}</option>
                      <option value="suspended">{t('موقوف مؤقتاً', 'Suspended')}</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('تفعيل صلاحية تحميل ملفات المحاضرات والسكاشن للمقررات المحددة', 'Subscribed Courses')}</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-36 overflow-y-auto bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      {courses.map(c => {
                        const isEnrolled = studentForm.purchasedCourseIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900">
                            <input
                              type="checkbox"
                              checked={isEnrolled}
                              onChange={e => {
                                const nextList = e.target.checked 
                                  ? [...studentForm.purchasedCourseIds, c.id]
                                  : studentForm.purchasedCourseIds.filter(id => id !== c.id);
                                setStudentForm({ ...studentForm, purchasedCourseIds: nextList });
                              }}
                              className="h-3.5 w-3.5 bg-slate-50 dark:bg-slate-900 text-brand-cyan"
                            />
                            <span className="truncate">{t(c.titleAr, c.titleEn)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold">{t('تأكيد الحفظ', 'Confirm Register')}</button>
                </div>
              </form>
            )}

            {/* Articles Form modal */}
            {activeTab === 'articles' && (
              <form onSubmit={handleArticleSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('عنوان المقال بالعربية', 'Arabic Title')}</label>
                    <input
                      type="text"
                      required
                      value={articleForm.titleAr}
                      onChange={e => setArticleForm({ ...articleForm, titleAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('عنوان المقال بالإنجليزية (اختياري)', 'English Title (Optional)')}</label>
                    <input
                      type="text"
                      value={articleForm.titleEn}
                      onChange={e => setArticleForm({ ...articleForm, titleEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('المحتوى بالعربية', 'Arabic Content')}</label>
                    <textarea
                      required
                      rows={6}
                      value={articleForm.contentAr}
                      onChange={e => setArticleForm({ ...articleForm, contentAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('المحتوى بالإنجليزية (اختياري)', 'English Content (Optional)')}</label>
                    <textarea
                      rows={6}
                      value={articleForm.contentEn}
                      onChange={e => setArticleForm({ ...articleForm, contentEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FileUploadField
                      label={t('صورة المقال التوضيحية', 'Article Image')}
                      value={articleForm.imageUrl}
                      onChange={url => setArticleForm(prev => ({ ...prev, imageUrl: url }))}
                      accept="image/*"
                      folder="articles"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold">{t('تأكيد النشر', 'Publish Article')}</button>
                </div>
              </form>
            )}

            {/* News Form modal */}
            {activeTab === 'news' && (
              <form onSubmit={handleNewsSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('عنوان الخبر بالعربية', 'Arabic Title')}</label>
                    <input
                      type="text"
                      required
                      value={newsForm.titleAr}
                      onChange={e => setNewsForm({ ...newsForm, titleAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('عنوان الخبر بالإنجليزية (اختياري)', 'English Title (Optional)')}</label>
                    <input
                      type="text"
                      value={newsForm.titleEn}
                      onChange={e => setNewsForm({ ...newsForm, titleEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('تفاصيل الإعلان بالعربية', 'Arabic Details')}</label>
                    <textarea
                      required
                      rows={4}
                      value={newsForm.contentAr}
                      onChange={e => setNewsForm({ ...newsForm, contentAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('تفاصيل الإعلان بالإنجليزية (اختياري)', 'English Details (Optional)')}</label>
                    <textarea
                      rows={4}
                      value={newsForm.contentEn}
                      onChange={e => setNewsForm({ ...newsForm, contentEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FileUploadField
                      label={t('الصورة المرفقة للإعلان', 'Announcement Image')}
                      value={newsForm.imageUrl}
                      onChange={url => setNewsForm(prev => ({ ...prev, imageUrl: url }))}
                      accept="image/*"
                      folder="news"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold">{t('نشر الإعلان والمزامنة', 'Confirm Publish')}</button>
                </div>
              </form>
            )}

            {/* Supervisor / Faculty Form modal */}
            {activeTab === 'teachers' && (
              <form onSubmit={handleTeacherSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اسم المشرف الأكاديمي بالعربية', 'Academic Supervisor Name (Arabic)')}</label>
                    <input
                      type="text"
                      required
                      value={teacherForm.nameAr}
                      onChange={e => setTeacherForm({ ...teacherForm, nameAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اسم المشرف الأكاديمي بالإنجليزية', 'Academic Supervisor Name (English)')}</label>
                    <input
                      type="text"
                      required
                      value={teacherForm.nameEn}
                      onChange={e => setTeacherForm({ ...teacherForm, nameEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('البريد الإلكتروني للاتصال', 'Academic Email')}</label>
                    <input
                      type="email"
                      required
                      value={teacherForm.email}
                      onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('رقم الهاتف للتواصل', 'Contact Phone')}</label>
                    <input
                      type="text"
                      value={teacherForm.phone || ''}
                      onChange={e => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('السيرة الذاتية والخبرات بالعربية', 'Academic Bio (Arabic)')}</label>
                    <textarea
                      rows={3}
                      value={teacherForm.bioAr || ''}
                      onChange={e => setTeacherForm({ ...teacherForm, bioAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('السيرة الذاتية والخبرات بالإنجليزية', 'Academic Bio (English)')}</label>
                    <textarea
                      rows={3}
                      value={teacherForm.bioEn || ''}
                      onChange={e => setTeacherForm({ ...teacherForm, bioEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FileUploadField
                      label={t('الصورة الشخصية للمشرف الأكاديمي', 'Supervisor Profile Image')}
                      value={teacherForm.imageUrl}
                      onChange={url => setTeacherForm(prev => ({ ...prev, imageUrl: url }))}
                      accept="image/*"
                      folder="teachers"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('التقييم المستحق (نجوم 1-5)', 'Rating')}</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step="0.1"
                      required
                      value={teacherForm.rating}
                      onChange={e => setTeacherForm({ ...teacherForm, rating: parseFloat(e.target.value) || 5 })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold">{t('حفظ بيانات المشرف الأكاديمي', 'Save Supervisor')}</button>
                </div>
              </form>
            )}

            {/* Coupon Form modal */}
            {activeTab === 'coupons' && (
              <form onSubmit={handleCouponSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('رمز الكوبون الترويجي (أحرف إنجليزية كبيرة)', 'Promo Code')}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SCIENCE10"
                      value={couponForm.code}
                      onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono uppercase tracking-wider"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('نسبة الخصم المئوية (1-100)', 'Discount Percent')}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={couponForm.discountPercent}
                      onChange={e => setCouponForm({ ...couponForm, discountPercent: parseInt(e.target.value) || 15 })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('تاريخ انتهاء الصلاحية', 'Expiration Date')}</label>
                    <input
                      type="date"
                      required
                      value={couponForm.expiresAt}
                      onChange={e => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 dark:text-white">
                      <input
                        type="checkbox"
                        checked={couponForm.active}
                        onChange={e => setCouponForm({ ...couponForm, active: e.target.checked })}
                        className="h-4 w-4 rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-brand-cyan"
                      />
                      <span>{t('تفعيل الكوبون فوراً للاستخدام', 'Active and Usable')}</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold">{t('حفظ الكوبون الترويجي', 'Save Coupon')}</button>
                </div>
              </form>
            )}

            {/* Order Form modal */}
            {activeTab === 'orders' && (
              <form onSubmit={handleOrderSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اختيار طالب مسجل', 'Select Registered Student')}</label>
                    <select
                      value={orderForm.studentId || ''}
                      onChange={e => {
                        const sid = e.target.value;
                        const stud = students.find(s => s.id === sid);
                        if (stud) {
                          setOrderForm({
                            ...orderForm,
                            studentId: sid,
                            studentName: stud.name,
                            studentEmail: stud.email
                          });
                        } else {
                          setOrderForm({
                            ...orderForm,
                            studentId: sid
                          });
                        }
                      }}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="">{t('--- اختر طالب من القائمة ---', '--- Select Student ---')}</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اسم الطالب يدوي (في حال عدم وجود حساب)', 'Manual Student Name')}</label>
                    <input
                      type="text"
                      required
                      value={orderForm.studentName}
                      onChange={e => setOrderForm({ ...orderForm, studentName: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('البريد الإلكتروني للطالب يدوي', 'Manual Student Email')}</label>
                    <input
                      type="email"
                      required
                      value={orderForm.studentEmail}
                      onChange={e => setOrderForm({ ...orderForm, studentEmail: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan font-mono"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('المقرر الدراسي المطلوب تفعيله', 'Target Subject')}</label>
                    <select
                      value={orderForm.courseId}
                      onChange={e => {
                        const cid = e.target.value;
                        const c = courses.find(item => item.id === cid);
                        if (c) {
                          setOrderForm({
                            ...orderForm,
                            courseId: cid,
                            courseTitle: c.titleEn,
                            pricePaid: 0
                          });
                        }
                      }}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{t(c.titleAr, c.titleEn)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('حالة التفعيل', 'Activation Status')}</label>
                    <select
                      value={orderForm.status}
                      onChange={e => setOrderForm({ ...orderForm, status: e.target.value as 'completed' | 'pending' })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="completed">{t('مفعل ومقبول', 'Approved & Active')}</option>
                      <option value="pending">{t('معلق بانتظار المراجعة', 'Pending Review')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold">{t('حفظ وتفعيل الوصول', 'Save Access')}</button>
                </div>
              </form>
            )}

            {/* Quiz Form modal */}
            {activeTab === 'quizzes' && (
              <form onSubmit={handleQuizSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('اختيار المقرر الدراسي المرتبط بالاختبار', 'Associated Subject')}</label>
                    <select
                      value={quizForm.courseId}
                      onChange={e => setQuizForm({ ...quizForm, courseId: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="">{t('عام لجميع طلاب الفرقة (بدون مقرر محدد)', 'General for All Year Students')}</option>
                      <option value="all">{t('جميع المقررات الدراسية', 'All Subjects')}</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{t(c.titleAr, c.titleEn)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الصف الدراسي / المرحلة', 'Target Grade / Level')}</label>
                    <select
                      value={quizForm.grade || 'all'}
                      onChange={e => setQuizForm({ ...quizForm, grade: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="all">{t('جميع الفرق الدراسية - قسم IT', 'All IT Department Years')}</option>
                      <option value="year1">{t('الفرقة الأولى - IT', '1st Year - IT')}</option>
                      <option value="year2">{t('الفرقة الثانية - IT', '2nd Year - IT')}</option>
                      <option value="year3">{t('الفرقة الثالثة - IT', '3rd Year - IT')}</option>
                      <option value="year4">{t('الفرقة الرابعة - IT', '4th Year - IT')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('عنوان الامتحان بالعربية', 'Exam Title (Arabic)')}</label>
                    <input
                      type="text"
                      required
                      value={quizForm.titleAr}
                      onChange={e => setQuizForm({ ...quizForm, titleAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('عنوان الامتحان بالإنجليزية', 'Exam Title (English)')}</label>
                    <input
                      type="text"
                      required
                      value={quizForm.titleEn}
                      onChange={e => setQuizForm({ ...quizForm, titleEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand-cyan"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الزمن المحدد للامتحان (بالدقائق)', 'Time Limit (Minutes)')}</label>
                    
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[15, 30, 45, 60, 90].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setQuizForm({ ...quizForm, timeLimit: mins })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer transition-all ${
                            quizForm.timeLimit === mins 
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40' 
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {mins} {t('دقيقة', 'mins')}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      min="1"
                      max="300"
                      required
                      value={quizForm.timeLimit === 0 ? '' : (quizForm.timeLimit ?? 30)}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        setQuizForm({ ...quizForm, timeLimit: isNaN(val) ? 0 : val });
                      }}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white font-mono"
                      placeholder={t('أدخل مدة الامتحان بالدقائق', 'Enter minutes')}
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={quizForm.published !== false}
                        onChange={e => setQuizForm({ ...quizForm, published: e.target.checked })}
                        className="h-4 w-4 rounded accent-brand-cyan cursor-pointer"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">{t('نشر الامتحان فوراً للطلاب (إظهار/إخفاء)', 'Publish Exam Immediately')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quizForm.autoCorrection !== false}
                        onChange={e => setQuizForm({ ...quizForm, autoCorrection: e.target.checked })}
                        className="h-4 w-4 rounded accent-brand-cyan cursor-pointer"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">{t('التصحيح التلقائي المباشر للدرجات', 'Enable Auto-Correction')}</span>
                    </label>
                  </div>
                </div>

                {/* Question builder */}
                <div className="border-t border-slate-200 dark:border-slate-900 pt-4 mt-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                    <HelpCircle className="h-4.5 w-4.5 text-brand-cyan" />
                    {t('الأسئلة الحالية المضافة للاختبار:', 'Current quiz questions:')}
                  </h4>

                  {/* List of current questions */}
                  {quizForm.questions && quizForm.questions.length > 0 ? (
                    <div className="space-y-3 mb-6">
                      {quizForm.questions.map((q, qidx) => (
                        <div key={qidx} className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-900 relative">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedQuestions = quizForm.questions.filter((_, idx) => idx !== qidx);
                              setQuizForm({ ...quizForm, questions: updatedQuestions });
                            }}
                            className="absolute top-2.5 left-2.5 p-1 text-red-500 hover:text-red-400 cursor-pointer"
                            title={t('حذف السؤال', 'Delete Question')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <p className="font-bold text-slate-900 dark:text-white mb-2">
                            <span className="font-mono text-brand-cyan mr-1">Q{qidx + 1}:</span>
                            {t(q.questionAr, q.questionEn)}
                          </p>
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-[11px] text-slate-600 dark:text-slate-400">
                            {q.optionsAr.map((opt, oidx) => (
                              <div key={oidx} className={`p-1.5 rounded ${oidx === q.correctAnswerIndex ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
                                {oidx + 1}. {t(opt, q.optionsEn[oidx])}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 italic mb-6">{t('لا توجد أسئلة مضافة حتى الآن. يرجى ملء الحقول أدناه لتشكيل الاختبار.', 'No questions added yet. Use the question generator below to add.')}</p>
                  )}

                  {/* Add a new question form inside modal */}
                  <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-900 space-y-4">
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">{t('إنشاء وإضافة سؤال جديد:', 'Generate & Add New Question:')}</h5>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block mb-1 font-semibold text-slate-600 dark:text-slate-400">{t('السؤال بالعربية', 'Question (Arabic)')}</label>
                        <input
                          type="text"
                          value={tempQuestion.questionAr}
                          onChange={e => setTempQuestion({ ...tempQuestion, questionAr: e.target.value })}
                          className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-semibold text-slate-600 dark:text-slate-400">{t('السؤال بالإنجليزية', 'Question (English)')}</label>
                        <input
                          type="text"
                          value={tempQuestion.questionEn}
                          onChange={e => setTempQuestion({ ...tempQuestion, questionEn: e.target.value })}
                          className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white text-xs"
                        />
                      </div>

                      {/* Options Ar */}
                      <div className="space-y-2">
                        <label className="block font-semibold text-slate-600 dark:text-slate-400">{t('خيارات الإجابة الأربعة بالعربية', '4 Arabic Answer Options')}</label>
                        {tempQuestion.optionsAr.map((opt, idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`${t('خيار', 'Option')} ${idx + 1}`}
                            value={opt}
                            onChange={e => {
                              const opts = [...tempQuestion.optionsAr];
                              opts[idx] = e.target.value;
                              setTempQuestion({ ...tempQuestion, optionsAr: opts });
                            }}
                            className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white text-xs"
                          />
                        ))}
                      </div>

                      {/* Options En */}
                      <div className="space-y-2">
                        <label className="block font-semibold text-slate-600 dark:text-slate-400">{t('خيارات الإجابة الأربعة بالإنجليزية', '4 English Answer Options')}</label>
                        {tempQuestion.optionsEn.map((opt, idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={e => {
                              const opts = [...tempQuestion.optionsEn];
                              opts[idx] = e.target.value;
                              setTempQuestion({ ...tempQuestion, optionsEn: opts });
                            }}
                            className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-white text-xs"
                          />
                        ))}
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-slate-600 dark:text-slate-400">{t('موقع الإجابة الصحيحة', 'Correct Answer Index')}</label>
                        <select
                          value={tempQuestion.correctAnswerIndex}
                          onChange={e => setTempQuestion({ ...tempQuestion, correctAnswerIndex: parseInt(e.target.value) || 0 })}
                          className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-slate-900 dark:text-white text-xs"
                        >
                          <option value={0}>{t('الخيار الأول (1)', 'Option 1')}</option>
                          <option value={1}>{t('الخيار الثاني (2)', 'Option 2')}</option>
                          <option value={2}>{t('الخيار الثالث (3)', 'Option 3')}</option>
                          <option value={3}>{t('الخيار الرابع (4)', 'Option 4')}</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (!tempQuestion.questionAr || !tempQuestion.questionEn) {
                              triggerNotification(t('يرجى ملء حقول السؤال بالعربية والإنجليزية', 'Please fill out the question fields'), true);
                              return;
                            }
                            const questionWithId: QuizQuestion = {
                              id: tempQuestion.id || ('q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
                              questionAr: tempQuestion.questionAr,
                              questionEn: tempQuestion.questionEn,
                              optionsAr: tempQuestion.optionsAr,
                              optionsEn: tempQuestion.optionsEn,
                              correctAnswerIndex: tempQuestion.correctAnswerIndex
                            };
                            const updatedQuestions = [...(quizForm.questions || []), questionWithId];
                            setQuizForm({ ...quizForm, questions: updatedQuestions });
                            // Reset Temp Question
                            setTempQuestion({
                              questionAr: '',
                              questionEn: '',
                              optionsAr: ['', '', '', ''],
                              optionsEn: ['', '', '', ''],
                              correctAnswerIndex: 0
                            });
                          }}
                          className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white p-2.5 font-bold transition-all cursor-pointer text-center text-xs"
                        >
                          {t('+ إدراج السؤال للقائمة', '+ Add Question to Quiz')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button
                    type="submit"
                    disabled={actionLoading || !quizForm.questions || quizForm.questions.length === 0}
                    className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold disabled:opacity-40"
                  >
                    {t('حفظ الاختبار بالكامل ومزامنته', 'Save Entire Quiz')}
                  </button>
                </div>
              </form>
            )}

            {/* Assignment Form Modal */}
            {activeTab === 'assignments' && (
              <form onSubmit={handleAssignmentTaskSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('إتاحة التكليف', 'Assignment Availability')}</label>
                    <select
                      value={assignmentTaskForm.visibility || 'free'}
                      onChange={e => {
                        const val = e.target.value as 'free' | 'course';
                        setAssignmentTaskForm({
                          ...assignmentTaskForm,
                          visibility: val,
                          courseId: '',
                          courseName: ''
                        });
                      }}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none font-bold"
                    >
                      <option value="free">🌍 {t('مجاني للجميع', 'Open to All Students')}</option>
                      <option value="course">🔒 {t('لملتحقي المقرر الدراسي', 'Enrolled Subject Students Only')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('المرحلة / الصف الدراسي', 'Target Grade')}</label>
                    <select
                      value={assignmentTaskForm.grade || 'all'}
                      onChange={e => setAssignmentTaskForm({ ...assignmentTaskForm, grade: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="all">{t('جميع الفرق الدراسية - قسم IT', 'All IT Department Years')}</option>
                      <option value="year1">{t('الفرقة الأولى - IT', '1st Year - IT')}</option>
                      <option value="year2">{t('الفرقة الثانية - IT', '2nd Year - IT')}</option>
                      <option value="year3">{t('الفرقة الثالثة - IT', '3rd Year - IT')}</option>
                      <option value="year4">{t('الفرقة الرابعة - IT', '4th Year - IT')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('عنوان التكليف بالعربية', 'Assignment Title (Arabic)')}</label>
                    <input
                      type="text"
                      required
                      value={assignmentTaskForm.titleAr}
                      onChange={e => setAssignmentTaskForm({ ...assignmentTaskForm, titleAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('عنوان التكليف بالإنجليزية', 'Assignment Title (English)')}</label>
                    <input
                      type="text"
                      required
                      value={assignmentTaskForm.titleEn}
                      onChange={e => setAssignmentTaskForm({ ...assignmentTaskForm, titleEn: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('وصف وتفاصيل التكليف بالعربية', 'Description (Arabic)')}</label>
                    <textarea
                      rows={3}
                      value={assignmentTaskForm.descriptionAr || ''}
                      onChange={e => setAssignmentTaskForm({ ...assignmentTaskForm, descriptionAr: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white focus:outline-none"
                      placeholder={t('اكتب الأسئلة المطلوبة أو تعليمات الحل هنا...', 'Write instructions or assignment questions here...')}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('رابط ملحق PDF أو الشيت', 'PDF Attachment Link')}</label>
                    <input
                      type="url"
                      value={assignmentTaskForm.pdfUrl || ''}
                      onChange={e => setAssignmentTaskForm({ ...assignmentTaskForm, pdfUrl: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white font-mono"
                      placeholder="https://example.com/assignment.pdf"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('آخر موعد للتسليم (الديلاين)', 'Deadline Date')}</label>
                    <input
                      type="date"
                      required
                      value={assignmentTaskForm.deadline || ''}
                      onChange={e => setAssignmentTaskForm({ ...assignmentTaskForm, deadline: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الدرجة النهائية القصوى للتكليف', 'Total Grade / Score')}</label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="1000"
                      value={assignmentTaskForm.totalGrade || 100}
                      onChange={e => setAssignmentTaskForm({ ...assignmentTaskForm, totalGrade: parseInt(e.target.value) || 100 })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignmentTaskForm.published !== false}
                        onChange={e => setAssignmentTaskForm({ ...assignmentTaskForm, published: e.target.checked })}
                        className="h-4 w-4 rounded accent-brand-cyan cursor-pointer"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">{t('نشر التكليف فوراً للطلاب', 'Publish Assignment Immediately')}</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold">{t('حفظ ونشر التكليف', 'Save Assignment')}</button>
                </div>
              </form>
            )}

            {/* Admins Form modal */}
            {activeTab === 'admins' && (
              <form onSubmit={handleAdminSubmit} className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الاسم بالكامل', 'Admin Full Name')}</label>
                    <input
                      type="text"
                      required
                      value={adminForm.name}
                      onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('البريد الإلكتروني للولوج المباشر', 'Admin Email')}</label>
                    <input
                      type="email"
                      required
                      value={adminForm.email}
                      onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-semibold text-slate-900 dark:text-white">{t('الدور والصلاحيات', 'Role')}</label>
                    <select
                      value={adminForm.role}
                      onChange={e => setAdminForm({ ...adminForm, role: e.target.value as 'super' | 'editor' })}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-slate-900 dark:text-white"
                    >
                      <option value="editor">{t('محرر أكاديمي (محدود)', 'Academic Editor')}</option>
                      <option value="super">{t('مدير المنصة الجامعية (صلاحية كاملة)', 'Platform Administrator (Full)')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200 dark:border-slate-900">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-3 font-bold text-slate-700 dark:text-slate-300">{t('إلغاء', 'Cancel')}</button>
                  <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-cyan text-white dark:text-slate-950 hover:bg-brand-cyan-light px-6 py-3 font-bold">{t('تفعيل الحساب', 'Enable Admin')}</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {adminVideoPreviewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span>🎬</span>
                <span>{t('معاينة الفيديو المرفوع', 'Preview Uploaded Video')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAdminVideoPreviewUrl(null)}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-1.5 transition-all text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black max-h-[70vh]">
              <CustomVideoPlayer src={adminVideoPreviewUrl} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <span className="truncate flex-1 select-all">{adminVideoPreviewUrl}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(adminVideoPreviewUrl);
                  triggerNotification(t('تم نسخ رابط الفيديو!', 'Video URL copied!'));
                }}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-brand-cyan px-3 py-1 text-[11px] font-bold transition-all shrink-0 cursor-pointer"
              >
                {t('نسخ الرابط', 'Copy URL')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Full Preview Modal (معاينة الكورس والفيديوهات) */}
      {previewCourse && (() => {
        const normCourse = normalizeCourseLessons(previewCourse);
        const allLessons = normCourse.lessons || [];
        const activePreviewVideo = normCourse.videoUrl || (allLessons.length > 0 ? allLessons[0].videoUrl : '');

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-black/85 p-4 sm:p-6 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-5xl rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                      {getCourseDisplayTitle(normCourse, language)}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {t('معاينة حية كما تظهر للطالب في المنصة', 'Live course player preview as seen by students')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewCourse(null)}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  <span>{t('إغلاق المعاينة', 'Close Preview')}</span>
                </button>
              </div>

              {/* Player & Lessons Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Video Area */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 shadow-xl aspect-video">
                    {activePreviewVideo ? (
                      <CustomVideoPlayer
                        src={activePreviewVideo}
                        title={getCourseDisplayTitle(normCourse, language)}
                        user={authService.getCurrentAdmin() || { id: 'admin', name: 'Admin', email: 'admin@academy.com' }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-6 text-center">
                        <Video className="h-12 w-12 text-slate-600 mb-2" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          {t('لم يتم إرفاق رابط فيديو لهذا المقرر أو محاضراته بعد.', 'No video URL attached to this subject yet.')}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {t('يمكنك تعديل المقرر وإضافة رابط YouTube أو فيديو من لوحة التحكم.', 'Edit the subject to add a YouTube URL or upload a video file.')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Course Details Info Box */}
                  <div className="bg-white dark:bg-slate-950/85 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-bold text-brand-cyan bg-brand-cyan/10 px-2.5 py-1 rounded-lg">
                        {normCourse.teacherName}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono">
                        ⏱️ {normCourse.duration || '20:00'}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono">
                        📚 {allLessons.length} {t('محاضرات وسكاشن', 'Lectures & Sections')}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded text-[11px]">
                        {t('مجاني بالكامل 100% - قسم IT', '100% Free - IT Dept')}
                      </span>
                    </div>
                    {normCourse.descriptionAr && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                        {normCourse.descriptionAr}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lessons Sidebar */}
                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase font-mono tracking-wider flex items-center justify-between">
                      <span>{t('قائمة الدروس والمحاضرات', 'Lessons Playlist')}</span>
                      <span className="text-brand-cyan font-mono">{allLessons.length}</span>
                    </h4>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {allLessons.length > 0 ? (
                        allLessons.map((lsn, idx) => (
                          <div
                            key={lsn.id || idx}
                            onClick={() => {
                              if (lsn.videoUrl) {
                                setPreviewCourse(prev => prev ? { ...prev, videoUrl: lsn.videoUrl } : null);
                              }
                            }}
                            className={`w-full p-2.5 rounded-xl border text-xs text-right transition-all flex items-center gap-2 cursor-pointer ${
                              lsn.videoUrl === activePreviewVideo
                                ? 'bg-brand-cyan/10 border-brand-cyan/40 text-brand-cyan font-bold'
                                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0">#{idx + 1}</span>
                            <div className="truncate flex-1">
                              <p className="truncate font-semibold">{t(lsn.titleAr, lsn.titleEn)}</p>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{lsn.duration || '15:00'}</span>
                            </div>
                            {lsn.videoUrl ? (
                              <Play className="h-3.5 w-3.5 text-brand-cyan shrink-0" />
                            ) : (
                              <span className="text-[9px] text-slate-600 font-mono shrink-0">No video</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs">
                          {t('لا توجد دروس فرعية مضافة بعد.', 'No lessons created yet.')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const toEdit = previewCourse;
                        setPreviewCourse(null);
                        handleEditCourse(toEdit);
                      }}
                      className="flex-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-500/30 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                      <span>{t('تعديل المقرر الدراسي', 'Edit Subject')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewCourse(null)}
                      className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 text-xs font-bold transition-all cursor-pointer"
                    >
                      {t('إغلاق', 'Close')}
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* Reusable In-App Confirmation Modal (Safe inside iFrame & Mobile) */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => { if (!confirmProcessing) setConfirmModal(null); }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                confirmModal.danger !== false
                  ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan'
              }`}>
                {confirmModal.danger !== false ? <Trash2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {confirmModal.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={confirmProcessing}
                onClick={() => setConfirmModal(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={confirmProcessing}
                onClick={async () => {
                  setConfirmProcessing(true);
                  try {
                    await confirmModal.onConfirm();
                  } finally {
                    setConfirmProcessing(false);
                    setConfirmModal(null);
                  }
                }}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-white transition-all cursor-pointer disabled:opacity-50 ${
                  confirmModal.danger !== false
                    ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20'
                    : 'bg-brand-cyan hover:bg-brand-cyan-light dark:text-slate-950'
                }`}
              >
                {confirmProcessing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{t('جاري التنفيذ...', 'Processing...')}</span>
                  </>
                ) : (
                  <span>{confirmModal.confirmLabel || t('تأكيد الحذف', 'Confirm Delete')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
